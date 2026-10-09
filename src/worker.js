import { POLLING_PLACES, PP_SOURCE } from './polling-places.js';
/**
 * Ballot Intel — Cloudflare Worker backend
 *
 * Routes:
 *   POST /api/parse     { pdf: base64 }  -> parsed ballot JSON (cached by PDF fingerprint)
 *   POST /api/research  { name, office, jurisdiction, election, isJudicial } -> dossier JSON (shared cache)
 *
 * Static frontend is served from /public via the assets binding.
 *
 * Cost controls:
 *   - claude-haiku-4-5 for everything (~1/3 the token cost of Sonnet)
 *   - shared KV cache, 7-day TTL: each candidate is researched ONCE across all users
 *   - web search capped at 3 uses per research call
 *   - per-IP daily rate limits so one visitor can't run up the bill
 */

const MODEL = 'claude-haiku-4-5';
const MODEL_JUDICIAL = 'claude-sonnet-4-6'; // deeper judgment for judicial races (FedSoc screen)
const API_URL = 'https://api.anthropic.com/v1/messages';
const CACHE_TTL = 60 * 60 * 24 * 7;        // research: 7 days (endorsements and money move weekly)
const PARSE_TTL = 60 * 60 * 24 * 30;       // parses: 30 days (a published ballot PDF doesn't change)
const LIMIT_PARSE_PER_DAY = 10;
const LIMIT_RESEARCH_PER_DAY = 60; // fresh (uncached) lookups per IP per day; cached hits are free
const MAX_PDF_BASE64_CHARS = 44 * 1024 * 1024; // ~32MB PDF
// Countywide master ballot, fetched and parsed server-side. Update each election.
const FEATURED_BALLOT_URL = 'https://www.miamidade.gov/elections/library/2026-11-03-general-election-sample-ballot.pdf';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (request.method === 'POST' && url.pathname === '/api/parse') {
        return await handleParse(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/api/featured') {
        return await handleFeatured(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/api/research') {
        return await handleResearch(request, env, ctx);
      }
      if (request.method === 'GET' && url.pathname === '/api/evsites') {
        return handleEarlyVotingSites();
      }
      if (request.method === 'GET' && url.pathname === '/api/civic-status') {
        return await handleCivicStatus(env);
      }
      if (request.method === 'GET' && url.pathname === '/api/elections') {
        return await handleElections(env);
      }
      if (request.method === 'POST' && url.pathname === '/api/voterinfo') {
        return await handleVoterInfo(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/api/ballot-text') {
        return await handleBallotText(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/api/translate-ballot') {
        return await handleTranslateBallot(request, env);
      }
      if (request.method === 'GET' && url.pathname === '/api/pollingplace') {
        return handlePollingPlace(url.searchParams.get('p'));
      }
      return json({ error: 'Not found' }, 404);
    } catch (e) {
      return json({ error: 'Server error: ' + (e && e.message ? e.message : String(e)) }, 500);
    }
  }
};

/* ---------------- handlers ---------------- */

async function handleParse(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.pdf !== 'string' || body.pdf.length < 100) {
    return json({ error: 'Missing PDF data' }, 400);
  }
  return parseBallot(env, body.pdf, clientIP(request));
}

async function handleFeatured(request, env) {
  const res = await fetch(FEATURED_BALLOT_URL);
  if (!res.ok) {
    return json({ error: 'Could not fetch the countywide master ballot from the elections site (HTTP ' + res.status + '). Download it yourself and upload it here.' }, 502);
  }
  const buf = await res.arrayBuffer();
  const b64 = bufToBase64(buf);
  if (b64.length < 100) return json({ error: 'The elections site returned an empty file.' }, 502);
  return parseBallot(env, b64, clientIP(request));
}

function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function parseBallot(env, pdfB64, ip) {
  if (pdfB64.length > MAX_PDF_BASE64_CHARS) {
    return json({ error: 'PDF too large (32MB max). Try compressing it or splitting the pages.' }, 413);
  }

  // Fingerprint the PDF cheaply: length + head + tail. Distinct PDFs won't collide in practice.
  const fp = await sha256(pdfB64.length + '|' + pdfB64.slice(0, 10000) + '|' + pdfB64.slice(-10000));
  const cacheKey = 'parse3:' + fp;  // v3: precinct extracted

  const cached = await env.CACHE.get(cacheKey, 'json');
  if (cached) return json({ ballot: cached, cached: true });

  // Ballots parsed before precinct extraction existed: reuse that parse instead of re-reading
  // the whole PDF (slow for the 131-contest master ballot). Only a precinct-specific ballot
  // needs a precinct, and that is one quick, tiny call.
  const older = await env.CACHE.get('parse2:' + fp, 'json');
  if (older) {
    older.precinct = '';
    if ((older.races || []).length < 100) {
      try {
        const t = await callAnthropic(env, {
          model: MODEL, max_tokens: 40,
          messages: [{ role: 'user', content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfB64 } },
            { type: 'text', text: 'What precinct number is printed on this sample ballot? Reply with only the number exactly as printed (e.g. 033.0), or the word NONE if there is no single precinct.' }
          ] }]
        });
        const m = String(t).match(/\d{1,4}(?:\.\d)?/);
        if (m && !/NONE/i.test(t)) older.precinct = m[0];
      } catch (e) { /* keep the parse; polling place falls back to the county lookup link */ }
    }
    await env.CACHE.put(cacheKey, JSON.stringify(older), { expirationTtl: PARSE_TTL });
    return json({ ballot: older, cached: true });
  }

  const allowed = await rateLimit(env, 'parse', ip, LIMIT_PARSE_PER_DAY);
  if (!allowed) return json({ error: 'Daily ballot-upload limit reached for your connection. Try again tomorrow.' }, 429);

  const prompt = [
    'You are parsing a sample ballot PDF into structured data.',
    '',
    'Extract every contested race with candidates, AND every ballot measure: numbered constitutional amendments, county referendums, school board referendums, charter questions, propositions, and bond issues. Skip instructions and blank sections.',
    'The ballot may print everything in multiple languages (e.g. English, Spanish, Haitian Creole). Use ONLY the English text for every office title, candidate name, measure title, and summary — never mix languages.',
    'A judicial retention question ("Shall Judge X be retained in office?") is a RACE (isJudicial true, the judge as its single candidate), NOT a measure.',
    '',
    'Respond with ONLY a JSON object, no preamble, no markdown fences:',
    '{',
    '  "jurisdiction": "county/city, state as printed on the ballot",',
    '  "electionDate": "as printed, or empty string",',
    '  "electionName": "e.g. General Election, or empty string",',
    '  "precinct": "the voter precinct number exactly as printed on a precinct-specific ballot (e.g. 0123 or 123.0), or empty string if this is a countywide/master ballot with no single precinct",',
    '  "races": [',
    '    {',
    '      "office": "exact office title as printed (for a measure: its number and title, e.g. Amendment 2: Property Tax Exemption)",',
    '      "isJudicial": true or false,',
    '      "isMeasure": true or false,',
    '      "summary": "for a measure only: the ballot question/summary text as printed, condensed to 100 words max; empty string for candidate races",',
    '      "candidates": [ {"name": "candidate full name", "party": "party as printed, or Nonpartisan if none listed"} ]',
    '    }',
    '  ]',
    '}',
    '',
    'isJudicial is true for any judge, justice, or judicial retention seat. For retention questions ("Shall Judge X be retained"), treat the judge as a single candidate in that race. For every ballot measure, set isMeasure true, isJudicial false, and candidates to exactly [ {"name": "YES", "party": ""}, {"name": "NO", "party": ""} ] (use the ballot wording if it differs, e.g. "For the Amendment" / "Against the Amendment"). Preserve the ballot ordering of races, measures, and candidates.'
  ].join('\n');

  const text = await callAnthropic(env, {
    model: MODEL,
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfB64 } },
        { type: 'text', text: prompt }
      ]
    }]
  });

  const ballot = extractJSON(text);
  if (!ballot.races || !ballot.races.length) {
    return json({ error: 'No races found in this PDF. Is it a sample ballot?' }, 422);
  }

  await env.CACHE.put(cacheKey, JSON.stringify(ballot), { expirationTtl: PARSE_TTL });
  return json({ ballot, cached: false });
}

async function handleResearch(request, env, ctx) {
  const body = await request.json().catch(() => null);
  if (!body || !isStr(body.name) || !isStr(body.office)) {
    return json({ error: 'Missing candidate name or office' }, 400);
  }
  const name = body.name.slice(0, 120);
  const office = body.office.slice(0, 200);
  const jurisdiction = isStr(body.jurisdiction) ? body.jurisdiction.slice(0, 200) : 'unknown';
  const election = isStr(body.election) ? body.election.slice(0, 120) : 'upcoming';
  const isJudicial = !!body.isJudicial;
  const isMeasure = !!body.isMeasure;
  const measureSummary = isStr(body.summary) ? body.summary.slice(0, 800) : '';

  const officeCode = isMeasure ? null : federalOfficeCode(office);
  const lang = TR_LANGS[body.lang] ? body.lang : 'en';

  // Shared cache: the whole point. 500 users, one bill.
  // res4 for federal races (adds itemized FEC donor data); res3 for the rest.
  const prefix = isMeasure ? 'resm1:' : (officeCode ? 'res7:' : 'resl4:');
  const key = prefix + await sha256((name + '|' + office + '|' + jurisdiction + '|' + election).toLowerCase().replace(/\s+/g, ' '));
  // Alias on a normalized key so ballots that print the same race slightly differently
  // ("Tuesday, November 3, 2026" vs "November 3, 2026", "Moe" with or without quotes, accents)
  // share one cached result.
  const alias = 'alias:' + prefix + await sha256([normPart(name), normPart(office), normPart(jurisdiction), normElection(election)].join('|'));
  const cached = await env.CACHE.get(key, 'json');
  if (cached) {
    if (!(await env.CACHE.get(alias))) ctx.waitUntil(env.CACHE.put(alias, key, { expirationTtl: CACHE_TTL }));
    return json({ result: await localize(env, await refreshFec(env, key, cached, name, officeCode), lang), cached: true });
  }
  const target = await env.CACHE.get(alias);
  if (target && target !== key) {
    const hit = await env.CACHE.get(target, 'json');
    if (hit) return json({ result: await localize(env, await refreshFec(env, target, hit, name, officeCode), lang), cached: true });
  }

  // Fire-and-poll: mobile browsers kill requests after ~60s, and fresh research
  // can take 90s. Start the research in the background, respond immediately,
  // and let the client poll this same endpoint until the cache fills.
  const failed = await env.CACHE.get('fail:' + key);
  if (failed) return json({ error: failed }, 502);
  const pending = await env.CACHE.get('pend:' + key);
  const params = { name, office, jurisdiction, election, isJudicial, isMeasure, measureSummary, officeCode, alias };

  if (!pending) {
    const ip = clientIP(request);
    const allowed = await rateLimit(env, 'research', ip, LIMIT_RESEARCH_PER_DAY);
    if (!allowed) return json({ error: 'Daily research limit reached for your connection. Cached candidates still work — try again tomorrow for new ones.' }, 429);
    await env.CACHE.put('pend:' + key, '1', { expirationTtl: 300 }); // covers a long research run; ResearchRunner also dedupes
    if (body.poll) {
      if (env.RESEARCH) {
        // Durable Object alarm: runs up to 15 minutes. ctx.waitUntil gets cancelled after ~30s,
        // which killed most fresh research (a thorough web search takes 30-90s).
        const stub = env.RESEARCH.get(env.RESEARCH.idFromName(key));
        await stub.fetch('https://research/run', { method: 'POST', body: JSON.stringify({ key, params }) });
      } else {
        ctx.waitUntil(runResearch(env, key, params));
      }
      return json({ pending: true });
    }
    // Legacy client (stale cached page): run synchronously like the old API did.
    await runResearch(env, key, params);
    const done = await env.CACHE.get(key, 'json');
    if (done) return json({ result: await localize(env, done, lang), cached: false });
    const err = await env.CACHE.get('fail:' + key);
    return json({ error: err || 'Research failed' }, 502);
  }

  if (body.poll) return json({ pending: true });
  // Legacy client polling an in-flight research: wait briefly, then report back.
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const done = await env.CACHE.get(key, 'json');
    if (done) return json({ result: await localize(env, done, lang), cached: true });
    const err = await env.CACHE.get('fail:' + key);
    if (err) return json({ error: err }, 502);
  }
  return json({ error: 'Research is taking longer than usual. Try again in a minute.' }, 504);
}

async function runResearch(env, key, p) {
  const { name, office, jurisdiction, election, isJudicial, isMeasure, measureSummary, officeCode } = p;
  try {
  const fedsocSchema = isJudicial ? [
    '  "federalistSociety": {',
    '    "status": "documented" or "possible" or "none_found",',
    '    "evidence": [ {"summary": "one sentence describing the specific tie", "source": "publication or site name", "url": "link if available, else empty string"} ]',
    '  },'
  ].join('\n') : '';

  const fedsocTask = isJudicial
    ? '3. Federalist Society ties: search this candidate across their internet presence — speeches, panels, event participation, membership mentions, chapter roles, FedSoc-affiliated endorsements, contributor listings, bios, news coverage. Apply this rubric strictly: "documented" = primary-source evidence of membership, leadership, or repeated participation (their own bio, FedSoc event listings, contributor pages). "possible" = ANY credible secondhand attribution (a named journalist, academic, or voter guide asserting ties) OR adjacent signals (spoke once at an event, endorsed by FedSoc-aligned groups) — always report these as evidence with the source own hedge preserved. "none_found" = ONLY when no credible source connects them to the Federalist Society at all. Never discard a credible secondhand claim; report it under "possible" with its caveat.'
    : '';

  const measurePrompt = [
    'Research this BALLOT MEASURE (referendum/question/amendment) using web search. Be factual and report only what you actually find. You have at most 5 searches — make them count (campaign finance committees and their contributors, organized support, organized opposition, news coverage).',
    '',
    'Measure: ' + name,
    'Ballot summary as printed: ' + (measureSummary || '(not provided)'),
    'Jurisdiction: ' + jurisdiction,
    'Election: ' + election,
    '',
    'Find:',
    '1. What the measure does, in plain language a voter can use.',
    '2. WHO IS FINANCING EACH SIDE. Look for registered committees/PACs supporting and opposing it, and their major contributors. Classify every funder by kind: "individual" | "corporation" | "lobbying or trade group" | "union" | "PAC/committee" | "nonprofit" | "political party" | "other". Report amounts only where actually reported; never guess. If one side has no organized funding, say so.',
    '3. Major supporters: organizations and notable public figures backing it.',
    '4. Major opponents: organizations and notable public figures against it.',
    'For every funder, supporter, and opponent, give "lean": "left", "right", or "nonpartisan" — the general political alignment of that person or organization, not the measure.',
    'CRITICAL identity rule: name each organization or person ONLY by a name you verified on their own site or in reliable coverage. If all you have is an acronym or handle, report it exactly as written and note the identity is unverified — NEVER invent an expansion. Preserve source hedges; never state a claim more strongly than the source does.',
    '',
    'After searching, respond with ONLY a JSON object, no prose before or after, no markdown fences. Plain text in all string values — no XML or cite tags:',
    '{',
    '  "summary": "2-3 sentence plain-language explanation of what the measure does, based on the ballot text and official or news sources you cite in summarySources. No predictions or characterizations of its effects beyond what a cited source states, and attribute any such claim to its source.",',
    '  "summarySources": [ {"name": "publication or site name", "url": "direct link taken from your search results"} ],',
    '  "financing": {',
    '    "support": [ {"name": "funder", "amount": "like $250,000 or the single word undisclosed", "kind": "individual|corporation|lobbying or trade group|union|PAC/committee|nonprofit|political party|other", "lean": "left|right|nonpartisan", "note": "one line of context, else empty string", "url": "direct link, else empty string"} ],',
    '    "oppose": [ same shape ],',
    '    "note": "one sentence on the quality/source of finance data found, or why none was found"',
    '  },',
    '  "supporters": [ {"name": "org or person", "lean": "left|right|nonpartisan", "type": "kind of group or role", "note": "one line, else empty string", "url": "direct link, else empty string"} ],',
    '  "opponents": [ same shape ],',
    '  "sources": ["site names or URLs actually consulted"]',
    '}',
    '',
    'Limit to the 8 largest funders per side and the 8 most significant supporters and opponents. Empty arrays where nothing was found, with the reason in the relevant note. URL rule: every url must come directly from your search results — never construct or guess one; empty string otherwise.'
  ].join('\n');

  const prompt = [
    'Research this election candidate using web search. Be factual and report only what you actually find. You have at most ' + (isJudicial ? '5' : '3') + ' searches — make them count (e.g. one on donors/campaign finance, one on endorsements, one on background' + (isJudicial ? ', and the rest on Federalist Society ties' : '') + ').',
    '',
    'Candidate: ' + name,
    'Office sought: ' + office,
    'Jurisdiction: ' + jurisdiction,
    'Election: ' + election,
    '',
    'Find:',
    '1. Top campaign donors/contributors (largest individual donors, PACs, organizations). ONLY money given directly to the campaign of this candidate for THIS race. Do NOT include outside spending, super PAC or independent expenditures, money given to a PAC that supports the candidate, or contributions to past campaigns of this candidate for other offices. For federal races prefer FEC data; for state/local use state disclosure portals and news coverage. If a source names a donor or PAC but not the amount, still list it with amount "unknown" rather than leaving it only in the note. If no donors are named anywhere, return an empty array — do not guess.',
    '2. Endorsements and candidate ratings — these are DIFFERENT things and go in DIFFERENT arrays. "endorsements" = only explicit endorsements where an organization or person declares support for the candidate. "ratings" = evaluations that are not endorsements: bar association polls, "Highly Qualified"/"Qualified"/"Not Qualified" designations, judicial performance reviews, scorecards, grades. Only include ratings issued by established advocacy groups, professional or bar associations, or official review bodies. EXCLUDE grades from voter-guide websites, election trackers, data aggregators, AI-generated report cards, and any site that grades candidates on its own "transparency", "accountability" or "integrity" rubric (for example Decode the Vote, Ballotpedia, Vote Smart summaries, iSideWith). If an organization states it does not endorse, its evaluation ALWAYS goes in ratings, never endorsements. CRITICAL identity rule for both arrays: name each organization ONLY by a full name you verified on the organization own website or in reliable coverage. If all you have is an acronym or a social-media handle, report the handle exactly as written and state in the note that the organization identity is unverified — NEVER guess or invent an expansion of an acronym. Classify each organization:',
    '   - "lean": "left", "right", or "nonpartisan" — based on the organization general political alignment, not the candidate',
    '   - "type": the kind of group, e.g. "labor union", "law enforcement", "business association", "environmental group", "newspaper editorial board", "civil rights organization", "party organization", "elected official", "religious organization", "professional association"',
    fedsocTask,
    '',
    'After searching, respond with ONLY a JSON object, no prose before or after, no markdown fences. Write plain text inside all JSON string values — no XML, no cite tags, no citation markup of any kind. When summarizing evidence, preserve the source hedges and caveats: never state a claim more strongly than the source does.',
    '{',
    '  "summary": "2-3 neutral sentences: the office sought, party, current or most recent position, and relevant professional background. Every fact must come from a source you cite in summarySources. No vote shares, polling, fundraising totals, spending comparisons, or characterizations (e.g. underdog, progressive firebrand) unless a cited source states them directly, and then attribute them (e.g. according to the Miami Herald). If sources disagree or you are unsure, leave the fact out.",',
    '  "summarySources": [ {"name": "publication or site name", "url": "direct link taken from your search results"} ],',
    '  "donors": [ {"name": "donor name", "amount": "dollar amount like $1,000, or the single word unknown (named in a source, amount not reported) or undisclosed (source says it is hidden) — never a phrase", "type": "individual | PAC | industry group | party committee | self-funded | other", "url": "direct link to the page documenting this, else empty string"} ],',
    '  "donorDataNote": "one sentence on the quality/source of donor data found, or why none was found",',
    '  "donorListUrl": "link to the page listing this candidate\u2019s full campaign contributions on an official disclosure portal (Florida Division of Elections, Miami-Dade County or city clerk filings), taken directly from your search results, else empty string",',
    '  "endorsements": [ {"org": "organization or person", "lean": "left|right|nonpartisan", "type": "group type", "note": "optional one-line context, else empty string", "url": "direct link to the page documenting this, else empty string"} ],',
    '  "ratings": [ {"org": "organization", "rating": "the rating or evaluation given, exactly as stated", "lean": "left|right|nonpartisan", "type": "group type", "note": "what the rating means / methodology if stated, else empty string", "url": "direct link to the page documenting this, else empty string"} ],',
    fedsocSchema,
    '  "sources": ["site names or URLs actually consulted"]',
    '}',
    '',
    'Limit donors to the top 8, endorsements to the 10 most significant, and ratings to the 6 most significant. If you find nothing for a section, return an empty array and say so in the relevant note. URL rule: every "url" value must be a real URL taken directly from your search results — never construct, guess, or reformat a URL. If you do not have the exact URL, use an empty string.'
  ].join('\n');

  const deep = isJudicial || isMeasure;
  const text = await callAnthropic(env, {
    model: deep ? MODEL_JUDICIAL : MODEL,
    max_tokens: 6000,
    temperature: 0,
    messages: [{ role: 'user', content: isMeasure ? measurePrompt : prompt }],
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: deep ? 5 : 3 }]
  });

  const result = extractJSON(text);

  // Federal races: replace search-derived donors with itemized FEC data (authoritative, free API)
  let ttl = CACHE_TTL;
  if (officeCode) {
    let fecOk = false;
    try {
      const fec = await fecTopDonors(env, name, officeCode);
      if (fec && (fec.donors.length || fec.definitive)) {
        // FEC is authoritative for federal races: an empty official record replaces web-search guesses too
        result.donors = fec.donors;
        result.donorDataNote = fec.note;
        result.donorListUrl = fec.listUrl || '';
        result.fecV = FEC_DATA_VERSION;
        fecOk = true;
      }
    } catch (e) { console.log('FEC error for ' + name + ': ' + (e && e.message ? e.message : e)); }
    // federal race without FEC data: cache briefly so the next visitor retries FEC
    if (!fecOk) ttl = 60 * 60 * 6;
  }

  await env.CACHE.put(key, JSON.stringify(result), { expirationTtl: ttl });
  if (p.alias) await env.CACHE.put(p.alias, key, { expirationTtl: ttl });
  } catch (e) {
    await env.CACHE.put('fail:' + key, 'Research failed: ' + (e && e.message ? e.message : String(e)), { expirationTtl: 90 });
  } finally {
    await env.CACHE.delete('pend:' + key);
  }
}

// Bump when the FEC donor logic changes. Cached federal results from an older version get their
// donor list rebuilt from FEC on next read: free API, no AI call, no rate-limit cost.
const FEC_DATA_VERSION = 3;
async function refreshFec(env, key, result, name, officeCode) {
  if (!officeCode || result.fecV === FEC_DATA_VERSION) return result;
  try {
    const fec = await fecTopDonors(env, name, officeCode);
    if (fec && (fec.donors.length || fec.definitive)) {
      result.donors = fec.donors;
      result.donorDataNote = fec.note;
      result.donorListUrl = fec.listUrl || '';
      result.fecV = FEC_DATA_VERSION;
      await env.CACHE.put(key, JSON.stringify(result), { expirationTtl: CACHE_TTL });
    }
  } catch (e) { console.log('FEC refresh error for ' + name + ': ' + e.message); }
  return result;
}

function federalOfficeCode(office) {
  const o = String(office || '').toLowerCase();
  if (/\b(united states|u\.?s\.?)\s+senat/.test(o)) return 'S';
  if (/representative in congress|congressional district|\b(united states|u\.?s\.?)\s+representative/.test(o)) return 'H';
  if (/president of the united states|^president\b/.test(o)) return 'P';
  return null;
}

// Classify a committee donor from its FEC registration.
//   committee_type: O = super PAC, V/W = hybrid (super PAC with a separate contribution account),
//   X/Y/Z = party, H/S/P = candidate; N/Q = traditional PAC.
//   A traditional PAC with an organization_type (corporation, labor, membership, trade, cooperative)
//   is a connected PAC; without one it is nonconnected.
function committeeKind(n, reg, entity) {
  if (/\bact\s*blue\b|\bwin\s*red\b/i.test(n)) return 'online donation platform';
  if (reg) {
    const t = reg.committee_type;
    if (t === 'O' || t === 'V' || t === 'W' || t === 'U') return 'super PAC';
    if (t === 'X' || t === 'Y' || t === 'Z') return 'party committee';
    if (t === 'H' || t === 'S' || t === 'P') return 'candidate committee';
    if (t === 'N' || t === 'Q') return reg.organization_type ? 'connected PAC' : 'nonconnected PAC';
  }
  if (entity === 'PTY') return 'party committee';
  if (entity === 'CCM') return 'candidate committee';
  const s = String(n).toUpperCase();
  if (/\b(REPUBLICAN|DEMOCRATIC|LIBERTARIAN)\b.*\b(COMMITTEE|PARTY)\b|\bPARTY\b/.test(s)) return 'party committee';
  if (/\bFOR (SENATE|CONGRESS|PRESIDENT|AMERICA|FLORIDA)\b|\bFRIENDS OF\b|\bVICTORY FUND\b/.test(s)) return 'candidate committee';
  return 'PAC';
}

async function fecTopDonors(env, name, officeCode) {
  const apiKey = env.FEC_API_KEY || 'DEMO_KEY';
  const base = 'https://api.open.fec.gov/v1';
  const y = new Date().getFullYear();
  const cycle = y + (y % 2 === 0 ? 0 : 1);

  const cRes = await fetch(base + '/candidates/search/?q=' + encodeURIComponent(name) +
    '&office=' + officeCode + '&cycle=' + cycle + '&per_page=5&api_key=' + apiKey);
  if (!cRes.ok) { console.log('FEC candidate search ' + cRes.status + ' for ' + name + (apiKey === 'DEMO_KEY' ? ' (using DEMO_KEY; set FEC_API_KEY)' : '')); return null; }
  const cJson = await cRes.json();
  let cand = (cJson.results || [])[0];
  let fallbackHits = -1;
  if (!cand) {
    // ballot names often use nicknames (Angie vs Angela); FEC uses legal names. Retry on last name, Florida only.
    const parts = name.replace(/\b(jr|sr|ii|iii|iv)\.?$/i, '').trim().split(/\s+/);
    const last = parts[parts.length - 1];
    const r2 = await fetch(base + '/candidates/search/?q=' + encodeURIComponent(last) +
      '&office=' + officeCode + '&state=FL&cycle=' + cycle + '&per_page=20&api_key=' + apiKey);
    if (r2.ok) {
      const first = (parts[0] || '').toUpperCase().slice(0, 3);
      const hits = ((await r2.json()).results || []).filter(c => {
        const n = String(c.name || '').toUpperCase();      // FEC format: "LAST, FIRST MIDDLE"
        return n.startsWith(last.toUpperCase() + ',') && n.split(',')[1].trim().startsWith(first);
      });
      fallbackHits = hits.length;
      if (hits.length === 1) cand = hits[0];
      else console.log('FEC: last-name fallback found ' + hits.length + ' matches for ' + name);
    }
  }
  if (!cand) {
    console.log('FEC: no candidate match for ' + name);
    // both the full-name and last-name searches came back empty: not registered with the FEC
    if (fallbackHits === 0) return { donors: [], definitive: true,
      note: 'Not registered with the FEC for this race. Federal candidates only have to register after raising or spending $5,000, so this campaign has likely raised little or nothing.' };
    return null;
  }
  const committee = (cand.principal_committees || [])[0];
  if (!committee) { console.log('FEC: no principal committee for ' + name + ' (' + cand.candidate_id + ')'); return null; }

  const sRes = await fetch(base + '/schedules/schedule_a/?committee_id=' + committee.committee_id +
    '&two_year_transaction_period=' + cycle + '&sort=-contribution_receipt_amount&per_page=100&api_key=' + apiKey);
  if (!sRes.ok) { console.log('FEC receipts ' + sRes.status + ' for ' + committee.committee_id); return null; }
  const sJson = await sRes.json();
  const rows = sJson.results || [];
  if (!rows.length) {
    console.log('FEC: no itemized receipts for ' + committee.committee_id);
    return { donors: [], definitive: true,
      note: 'No itemized contributions reported to the FEC (committee ' + committee.committee_id + '). Gifts under $200 do not have to be listed by name, so this campaign has likely raised only small amounts, if any.' };
  }

  const agg = {};
  for (const r of rows) {
    // Memo lines (memo_code X) document money already reported on another line,
    // e.g. gifts earmarked through WinRed/ActBlue or joint fundraising. Counting them double-counts.
    if (r.memo_code === 'X') continue;
    const n = String(r.contributor_name || '').trim();
    if (!n) continue;
    if (!agg[n]) agg[n] = { amount: 0, type: r.entity_type, employer: r.contributor_employer || '', cid: r.contributor_id || (r.contributor && r.contributor.committee_id) || '' };
    agg[n].amount += (r.contribution_receipt_amount || 0);
  }
  const typeMap = { IND: 'individual', PAC: 'PAC', COM: 'committee', ORG: 'organization', PTY: 'party committee', CAN: 'self-funded', CCM: 'candidate committee' };
  const top = Object.entries(agg).sort((a, b) => b[1].amount - a[1].amount).slice(0, 8);

  // Look up each committee donor's FEC registration to tell connected, nonconnected and super PACs apart
  const COMMITTEE_ENTITIES = { COM: 1, PAC: 1, PTY: 1, CCM: 1 };
  const ids = [...new Set(top.filter(([, v]) => COMMITTEE_ENTITIES[v.type] && /^C\d{8}$/.test(v.cid)).map(([, v]) => v.cid))];
  const reg = {};
  if (ids.length) {
    try {
      const q = ids.map(id => 'committee_id=' + id).join('&');
      const cr = await fetch(base + '/committees/?' + q + '&per_page=20&api_key=' + apiKey);
      if (cr.ok) for (const c of ((await cr.json()).results || [])) reg[c.committee_id] = c;
      else console.log('FEC committee lookup ' + cr.status);
    } catch (e) { console.log('FEC committee lookup error: ' + e.message); }
  }

  const donors = top.map(([n, v]) => ({
      name: n + (v.employer && v.type === 'IND' ? ' (' + v.employer + ')' : ''),
      amount: '$' + Math.round(v.amount).toLocaleString('en-US'),
      type: COMMITTEE_ENTITIES[v.type] ? committeeKind(n, reg[v.cid], v.type) : (typeMap[v.type] || 'contributor'),
      // this donor's own contributions to this campaign, not the whole receipts list
      url: 'https://www.fec.gov/data/receipts/?committee_id=' + committee.committee_id +
           '&contributor_name=' + encodeURIComponent(n) + '&two_year_transaction_period=' + cycle
    }));

  return {
    donors,
    listUrl: 'https://www.fec.gov/data/receipts/?committee_id=' + committee.committee_id + '&two_year_transaction_period=' + cycle,
    note: 'Itemized contributions from official FEC filings (openFEC API, committee ' + committee.committee_id +
      '). Amounts sum the largest itemized receipts reported this cycle and may lag the most recent filings.'
  };
}

/* ---------------- utilities ---------------- */

async function callAnthropic(env, payload) {
  // Web search turns can come back with stop_reason "pause_turn" (no final answer yet).
  // Hand the partial turn back so the model finishes, up to 3 times.
  payload = { ...payload, messages: [...payload.messages] };
  let text = '';
  for (let turn = 0; turn < 4; turn++) {
    const data = await callAnthropicOnce(env, payload);
    text += (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    if (data.stop_reason !== 'pause_turn') return text;
    payload.messages.push({ role: 'assistant', content: data.content });
  }
  return text;
}

async function callAnthropicOnce(env, payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('Anthropic API ' + res.status + ': ' + t.slice(0, 300));
  }
  const data = await res.json();
  if (data.stop_reason === 'max_tokens') {
    throw new Error('The AI response was cut off before finishing. Try again; if it persists, the document is too large.');
  }
  return data;
}

function extractJSON(text) {
  const cleaned = String(text)
    .replace(/<\/?(?:antml:)?cite[^>]*>/gi, '')   // strip API citation markup before parsing
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Model response contained no JSON');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function clientIP(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

async function rateLimit(env, kind, ip, limit) {
  const day = new Date().toISOString().slice(0, 10);
  const key = 'rl:' + kind + ':' + ip + ':' + day;
  const current = parseInt(await env.CACHE.get(key) || '0', 10);
  if (current >= limit) return false;
  await env.CACHE.put(key, String(current + 1), { expirationTtl: 86400 });
  return true;
}

// Lowercase, strip accents, quotes and punctuation, collapse spaces.
function normPart(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
// Reduce an election label to its date ("november 3 2026"), else its year.
function normElection(e) {
  const s = normPart(e);
  const m = s.match(/(january|february|march|april|may|june|july|august|september|october|november|december) (\d{1,2}) (\d{4})/);
  if (m) return m[1] + ' ' + m[2] + ' ' + m[3];
  const y = s.match(/\b(20\d\d)\b/);
  return y ? y[1] : s;
}

function isStr(v) { return typeof v === 'string' && v.trim().length > 0; }

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}


/* ---------------- background research runner ---------------- */
// One Durable Object per research key. fetch() records the job and sets an alarm for now;
// the alarm handler has a 15-minute wall-clock limit, unlike ctx.waitUntil (~30s).
export class ResearchRunner {
  constructor(state, env) { this.state = state; this.env = env; }

  async fetch(request) {
    const job = await request.json();
    const running = await this.state.storage.get('running');
    if (running && Date.now() - running < 10 * 60 * 1000) return new Response('already running');
    await this.state.storage.put('job', job);
    await this.state.storage.setAlarm(Date.now());
    return new Response('scheduled');
  }

  async alarm() {
    const job = await this.state.storage.get('job');
    if (!job) return;
    await this.state.storage.put('running', Date.now());
    try {
      await runResearch(this.env, job.key, job.params);   // writes result or fail: key to KV itself
    } finally {
      await this.state.storage.deleteAll();
    }
  }
}


/* ---------------- early voting sites ---------------- */
// Source: Miami-Dade Elections, Early Voting Schedule for the General Election 11/3/2026
// https://www.miamidade.gov/elections/library/early-voting/2026-11-03-general-election-early-voting-schedule.pdf
// Oct 19 - Nov 1, 2026, 7:00 AM - 7:00 PM daily at every site. Verified against the county PDF and
// Caribbean National Weekly's published list (Oct 2026). Columns: name, address, city, zip, lat, lon.
const EV_SOURCE = 'https://www.miamidade.gov/elections/library/early-voting/2026-11-03-general-election-early-voting-schedule.pdf';
const EV_SITES = [
  ['Arcola Lakes Branch Library', '8240 NW 7th Avenue', 'Miami', '33150', 25.850232334738, -80.209938893192],
  ['Miami Dade College Kendall Campus (Fascell Conference Center)', '11011 SW 104th Street, Building K', 'Miami', '33176', 25.672201186188, -80.375880531328],
  ['Coral Gables Branch Library', '3443 Segovia Street', 'Coral Gables', '33134', 25.739708701732, -80.266275994737],
  ['Miami Lakes Community Center', '15151 NW 82nd Avenue', 'Miami Lakes', '33016', 25.91147290818, -80.33211678282],
  ['Coral Reef Branch Library', '9211 SW 152nd Street', 'Miami', '33157', 25.629329707301, -80.342929354097],
  ['Naranja Branch Library', '14850 SW 280th Street', 'Homestead', '33032', 25.50675078025, -80.431305317998],
  ['FIU Student Academic Success Center', '11200 SW 8th Street', 'Miami', '33199', 25.761088025072, -80.376252884803],
  ['North Dade Regional Library', '2455 NW 183rd Street', 'Miami Gardens', '33056', 25.941105475368, -80.242428006811],
  ['Hispanic Branch Library', '1398 SW 1st Street #100', 'Miami', '33135', 25.772349421732, -80.217934626894],
  ['North Miami Public Library', '835 NE 132nd Street', 'North Miami', '33161', 25.896922886582, -80.181839893763],
  ['Historic Garage', '3250 S Miami Avenue', 'Miami', '33129', 25.747344096074, -80.210830057138],
  ['North Shore Branch Library', '7501 Collins Avenue', 'Miami Beach', '33141', 25.860767093719, -80.120968221416],
  ['Homestead Community Center', '1601 N Krome Avenue', 'Homestead', '33030', 25.48588064289, -80.47652767062],
  ['Northeast Dade-Aventura Branch Library', '2930 Aventura Boulevard', 'Aventura', '33180', 25.961167128371, -80.142319042724],
  ['International Mall Branch Library', '10315 NW 12th Street', 'Doral', '33172', 25.782747783399, -80.361714988685],
  ['Office of the Supervisor of Elections', '2700 NW 87th Avenue', 'Doral', '33172', 25.799754274, -80.337180727363],
  ['John F. Kennedy Library', '190 W 49th Street', 'Hialeah', '33012', 25.866735877974, -80.286529720844],
  ['Rebeca Sosa Multipurpose Facility', '1700 SW 62nd Avenue', 'West Miami', '33155', 25.754679067725, -80.295677902037],
  ['Joseph Caleb Center Community Meeting Room', '5400 NW 22nd Avenue, Building A', 'Miami', '33142', 25.824231656498, -80.232733471178],
  ['Shenandoah Branch Library', '2111 SW 19th Street', 'Miami', '33145', 25.75446176083, -80.228515215374],
  ['Kendale Lakes Branch Library', '15205 SW 88th Street', 'Miami', '33196', 25.684660945982, -80.441227058847],
  ['South Dade Government Center (lobby)', '10710 SW 211th Street', 'Miami', '33189', 25.572025059129, -80.36582653967],
  ['Kendall Branch Library', '9101 SW 97th Avenue', 'Miami', '33176', 25.684870936693, -80.351333867577],
  ['Stephen P. Clark Government Center (Elections Branch Office, lobby)', '111 NW 1st Street', 'Miami', '33128', 25.775078850443, -80.196332709513],
  ['Lemon City Branch Library', '430 NE 61st Street', 'Miami', '33137', 25.832522968083, -80.187054212651],
  ['West Kendall Regional Library', '10201 Hammocks Boulevard', 'Miami', '33196', 25.672927759468, -80.4440908898],
  ['Miami Beach City Hall', '1700 Convention Center Drive', 'Miami Beach', '33139', 25.79225090196, -80.134933306983],
  ['Westchester Regional Library', '9445 SW 24th Street', 'Miami', '33165', 25.747378225294, -80.34784837746]
];

// Coordinates are for sorting by distance only; directions always use the street address.
// Geocoded Oct 9, 2026 (US Census geocoder; Esri World Geocoder for 5 the Census could not match),
// each match checked against the exact street address.
function handleEarlyVotingSites() {
  const sites = EV_SITES.map(([name, address, city, zip, lat, lon]) => ({ name, address, city, zip, lat, lon }));
  return json({ sites, start: '2026-10-19', end: '2026-11-01', openHour: 7, closeHour: 19, source: EV_SOURCE });
}

/* ---------------- Election Day polling place ---------------- */
// Precinct as printed on a sample ballot ("PRECINCT 033.0", "33", "0033.0") -> "033.0"
function normPrecinct(p) {
  const m = String(p || '').match(/(\d{1,4})(?:\.(\d))?/);
  if (!m) return '';
  return String(parseInt(m[1], 10)).padStart(3, '0') + '.' + (m[2] || '0');
}
function handlePollingPlace(p) {
  const key = normPrecinct(p);
  const row = POLLING_PLACES[key];
  if (!row) return json({ error: 'Precinct not found', precinct: key }, 404);
  const [name, address, city, zip] = row;
  return json({ precinct: key, name, address, city, zip, openHour: 7, closeHour: 19, date: '2026-11-03', source: PP_SOURCE });
}


/* ---------------- translation (Spanish, Haitian Creole) ---------------- */
// Research is done once in English. Each result is translated once per language and cached,
// keyed by a hash of the English content, so a refreshed result gets a fresh translation.
// Names, organizations, amounts, URLs and lean/status codes are never sent for translation.
const TR_LANGS = {
  es: 'Spanish, as used in Miami-Dade County official election materials',
  ht: 'Haitian Creole (Kreyòl ayisyen), as used in Miami-Dade County official election materials'
};
const TR_MODEL = { es: MODEL, ht: MODEL_JUDICIAL };   // Kreyòl gets the stronger model
const TR_KEYS = new Set(['summary', 'note', 'rating']);   // plus any key ending in "Note"
const TR_TAG_KEYS = { type: 'type_tr', kind: 'kind_tr' }; // keep English for tag definitions, add a translated label

async function translateStrings(env, lang, items) {
  const out = {};
  const chunks = [];
  for (let i = 0; i < items.length; i += 40) chunks.push(items.slice(i, i + 40));
  // chunks run in parallel so a 131-race ballot takes one call's time, not three
  await Promise.all(chunks.map(async chunk => {
    const prompt = [
      'Translate the "text" of each item into ' + TR_LANGS[lang] + '.',
      'Rules:',
      '- Keep names of people, organizations, PACs, companies, unions, newspapers and places exactly as written. Do not translate them.',
      '- Keep numbers, dollar amounts, percentages, letter grades, dates in digits, URLs and acronyms (FEC, PAC, DSA, NRA) unchanged.',
      '- Use plain, clear language a voter would understand. Use the standard election terms that Miami-Dade County uses in its official ' + (lang === 'es' ? 'Spanish' : 'Haitian Creole') + ' materials.',
      '- Do not add, remove or soften any information. Keep hedges like "reportedly" or "according to".',
      'Respond with ONLY a JSON object {"items": [{"id": "...", "text": "..."}]} containing every id exactly once.',
      '',
      JSON.stringify({ items: chunk })
    ].join('\n');
    const text = await callAnthropic(env, { model: TR_MODEL[lang], max_tokens: 8000, temperature: 0, messages: [{ role: 'user', content: prompt }] });
    const parsed = extractJSON(text);
    for (const it of (parsed.items || [])) if (it && typeof it.text === 'string') out[it.id] = it.text;
  }));
  return out;
}

// Return the result translated into lang (cached). English or any failure returns the English result.
async function localize(env, result, lang) {
  if (!result || !TR_LANGS[lang]) return result;
  const ck = 'tr1:' + lang + ':' + await sha256(JSON.stringify(result));
  const hit = await env.CACHE.get(ck, 'json');
  if (hit) return hit;

  const copy = JSON.parse(JSON.stringify(result));
  const items = [], setters = {};
  let n = 0;
  (function walk(o) {
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string' && v.trim() && v.length < 4000) {
        if (k === 'rating' && /^[\d\s%.\/A-F+\-()]+$/.test(v)) continue;   // grades and percentages stay as is
        if (TR_KEYS.has(k) || /Note$/.test(k)) {
          const id = 's' + (n++); items.push({ id, text: v }); setters[id] = t => { o[k] = t; };
        } else if (TR_TAG_KEYS[k]) {
          const id = 's' + (n++); items.push({ id, text: v }); setters[id] = t => { o[TR_TAG_KEYS[k]] = t; };
        }
      } else if (v && typeof v === 'object') walk(v);
    }
  })(copy);
  if (!items.length) return result;
  try {
    const tr = await translateStrings(env, lang, items);
    for (const id of Object.keys(setters)) if (tr[id]) setters[id](tr[id]);
    if (result.donorDataNote) copy.donorDataNote_en = result.donorDataNote;   // page checks the English wording
    copy._translated = true;
    await env.CACHE.put(ck, JSON.stringify(copy), { expirationTtl: CACHE_TTL });
    return copy;
  } catch (e) {
    console.log('translate ' + lang + ' failed: ' + (e && e.message ? e.message : e));
    return result;
  }
}

// Ballot titles: office names, measure YES/NO wording, election name. Candidate names are not sent.
async function handleTranslateBallot(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !TR_LANGS[body.lang] || !Array.isArray(body.offices) || body.offices.length > 250) {
    return json({ error: 'Bad request' }, 400);
  }
  const lang = body.lang;
  const offices = body.offices.map(s => String(s || '').slice(0, 300));
  const options = (Array.isArray(body.measureOptions) ? body.measureOptions : []).slice(0, 250)
    .map(o => Array.isArray(o) ? o.slice(0, 4).map(s => String(s || '').slice(0, 80)) : null);
  const electionName = String(body.electionName || '').slice(0, 120);

  const ck = 'trb1:' + lang + ':' + await sha256(JSON.stringify([offices, options, electionName]));
  const hit = await env.CACHE.get(ck, 'json');
  if (hit) return json(hit);
  const allowed = await rateLimit(env, 'trballot', clientIP(request), 20);
  if (!allowed) return json({ error: 'Daily translation limit reached for your connection.' }, 429);

  const items = [];
  offices.forEach((s, i) => { if (s) items.push({ id: 'o' + i, text: s }); });
  options.forEach((o, i) => { if (o) o.forEach((s, j) => { if (s) items.push({ id: 'm' + i + '_' + j, text: s }); }); });
  if (electionName) items.push({ id: 'e', text: electionName });
  const tr = await translateStrings(env, lang, items);
  const out = {
    offices: offices.map((s, i) => tr['o' + i] || s),
    measureOptions: options.map((o, i) => o ? o.map((s, j) => tr['m' + i + '_' + j] || s) : null),
    electionName: tr.e || electionName
  };
  await env.CACHE.put(ck, JSON.stringify(out), { expirationTtl: 60 * 60 * 24 * 60 });
  return json(out);
}


// Spanish and Haitian Creole race titles copied from the ballot PDF itself (Miami-Dade prints
// ballots in all three languages), so voters see the county's official wording. Anything the
// PDF does not print in a language is machine-translated. Cached per PDF, shared by everyone.
async function handleBallotText(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.pdf !== 'string' || body.pdf.length < 100 || body.pdf.length > MAX_PDF_BASE64_CHARS ||
      !Array.isArray(body.offices) || body.offices.length > 250) {
    return json({ error: 'Bad request' }, 400);
  }
  const pdf = body.pdf;
  const fp = await sha256(pdf.length + '|' + pdf.slice(0, 10000) + '|' + pdf.slice(-10000));
  const offices = body.offices.map(s => String(s || '').slice(0, 300));
  const options = (Array.isArray(body.measureOptions) ? body.measureOptions : []).slice(0, 250)
    .map(o => Array.isArray(o) ? o.slice(0, 4).map(s => String(s || '').slice(0, 80)) : null);
  const electionName = String(body.electionName || '').slice(0, 120);
  const ck = 'btx1:' + fp + ':' + await sha256(JSON.stringify([offices, options, electionName]));
  const hit = await env.CACHE.get(ck, 'json');
  if (hit) return json(hit);
  const allowed = await rateLimit(env, 'btext', clientIP(request), 10);
  if (!allowed) return json({ error: 'Daily limit reached for your connection.' }, 429);

  const items = [];
  offices.forEach((s, i) => { if (s) items.push({ id: 'o' + i, en: s }); });
  options.forEach((o, i) => { if (o) o.forEach((s, j) => { if (s) items.push({ id: 'm' + i + '_' + j, en: s }); }); });
  if (electionName) items.push({ id: 'e', en: electionName });

  // Copy, don't translate. Chunked and run in parallel to keep it quick on a 131-race ballot.
  const printed = {};
  const chunks = [];
  for (let i = 0; i < items.length; i += 45) chunks.push(items.slice(i, i + 45));
  await Promise.all(chunks.map(async chunk => {
    const prompt = [
      'This sample ballot is printed in English, Spanish and Haitian Creole.',
      'For each item below, find that same item on the ballot and copy its Spanish ("es") and Haitian Creole ("ht") text EXACTLY as printed.',
      'Items are office titles, ballot measure titles, measure answer choices (YES/NO or similar), or the election name.',
      'Do not translate anything yourself. If the ballot does not print that item in a language, return an empty string for that language.',
      'Respond with ONLY a JSON object {"items": [{"id": "...", "es": "...", "ht": "..."}]} with every id exactly once.',
      '',
      JSON.stringify({ items: chunk })
    ].join('\n');
    try {
      const text = await callAnthropic(env, {
        model: MODEL_JUDICIAL, max_tokens: 8000, temperature: 0,
        messages: [{ role: 'user', content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf } },
          { type: 'text', text: prompt }
        ] }]
      });
      for (const it of (extractJSON(text).items || [])) if (it && it.id) printed[it.id] = it;
    } catch (e) { console.log('ballot-text chunk failed: ' + (e && e.message ? e.message : e)); }
  }));

  const out = {};
  let fromBallot = 0;
  for (const lang of ['es', 'ht']) {
    const got = {}, missing = [];
    for (const it of items) {
      const v = printed[it.id] && typeof printed[it.id][lang] === 'string' ? printed[it.id][lang].trim() : '';
      if (v) { got[it.id] = v; fromBallot++; } else missing.push({ id: it.id, text: it.en });
    }
    if (missing.length) {
      try { Object.assign(got, await translateStrings(env, lang, missing)); } catch (e) { /* English fallback below */ }
    }
    out[lang] = {
      offices: offices.map((s, i) => got['o' + i] || s),
      measureOptions: options.map((o, i) => o ? o.map((s, j) => got['m' + i + '_' + j] || s) : null),
      electionName: got.e || electionName,
      source: 'ballot'
    };
  }
  console.log('ballot-text: ' + fromBallot + ' of ' + (items.length * 2) + ' strings copied from the printed ballot');
  await env.CACHE.put(ck, JSON.stringify(out), { expirationTtl: 60 * 60 * 24 * 60 });
  return json(out);
}


/* ---------------- address lookup (Google Civic Information API) ---------------- */
// Address -> the voter's election info from Google's Voting Information Project data:
// polling place, early vote sites, drop-off sites and, when published, the contests on
// that voter's ballot. The address is passed through and never stored or logged.
async function handleVoterInfo(request, env) {
  if (!env.GOOGLE_CIVIC_KEY) return json({ error: 'Address lookup is not configured.' }, 503);
  const body = await request.json().catch(() => null);
  const address = body && isStr(body.address) ? body.address.trim().slice(0, 200) : '';
  if (address.length < 8) return json({ error: 'Enter a full street address.' }, 400);
  const allowed = await rateLimit(env, 'voterinfo', clientIP(request), 30);
  if (!allowed) return json({ error: 'Daily address-lookup limit reached for your connection.' }, 429);

  const base = 'https://www.googleapis.com/civicinfo/v2/voterinfo?key=' + env.GOOGLE_CIVIC_KEY +
            '&address=' + encodeURIComponent(address);
  let r = await fetch(base);
  let data = await r.json().catch(() => ({}));
  // "Election unknown": ask for the Nov 3, 2026 election explicitly by its Google election ID
  if (!r.ok && /election unknown/i.test((data.error && data.error.message) || '')) {
    const id = await novemberElectionId(env);
    if (id) {
      r = await fetch(base + '&electionId=' + id);
      data = await r.json().catch(() => ({}));
    }
  }
  if (!r.ok) {
    const msg = (data.error && data.error.message) || ('HTTP ' + r.status);
    return json({ error: 'Lookup failed: ' + msg, status: r.status }, r.status === 400 ? 404 : 502);
  }
  const place = l => ({
    name: (l.address && l.address.locationName) || '',
    address: l.address ? [l.address.line1, l.address.line2, l.address.city, l.address.state, l.address.zip].filter(Boolean).join(', ') : '',
    hours: l.pollingHours || '', notes: l.notes || '', start: l.startDate || '', end: l.endDate || ''
  });
  const contests = (data.contests || []).map(c => ({
    office: c.office || c.referendumTitle || c.referendumSubtitle || '',
    district: c.district ? c.district.name : '',
    type: c.type || '',
    candidates: (c.candidates || []).map(x => ({ name: x.name, party: x.party || '' })),
    isMeasure: c.type === 'Referendum' || !!c.referendumTitle
  }));
  return json({
    election: data.election ? { name: data.election.name, date: data.election.electionDay, id: data.election.id } : null,
    normalizedAddress: data.normalizedInput ? [data.normalizedInput.line1, data.normalizedInput.city, data.normalizedInput.state, data.normalizedInput.zip].filter(Boolean).join(', ') : '',
    pollingLocations: (data.pollingLocations || []).map(place),
    earlyVoteSites: (data.earlyVoteSites || []).map(place),
    dropOffLocations: (data.dropOffLocations || []).map(place),
    contests,
    summary: {
      contests: contests.length, pollingLocations: (data.pollingLocations || []).length,
      earlyVoteSites: (data.earlyVoteSites || []).length, dropOffLocations: (data.dropOffLocations || []).length
    }
  });
}

async function listElections(env) {
  const r = await fetch('https://www.googleapis.com/civicinfo/v2/elections?key=' + env.GOOGLE_CIVIC_KEY);
  const d = await r.json().catch(() => ({}));
  return (d.elections || []).map(e => ({ id: e.id, name: e.name, date: e.electionDay, division: e.ocdDivisionId }));
}
// Google's ID for the Nov 3, 2026 election covering Florida (state-level first, then national).
async function novemberElectionId(env) {
  const els = (await listElections(env)).filter(e => e.date === '2026-11-03');
  const fl = els.find(e => /state:fl$/.test(e.division || '')) || els.find(e => /country:us$/.test(e.division || ''));
  return fl ? fl.id : null;
}
async function handleElections(env) {
  if (!env.GOOGLE_CIVIC_KEY) return json({ error: 'Address lookup is not configured.' }, 503);
  return json({ elections: await listElections(env) });
}

// Read-only check of whether Google has loaded Miami-Dade's Nov 3 data yet, using a fixed public
// address (the Elections branch office downtown). Counts only. Cached for an hour.
async function handleCivicStatus(env) {
  if (!env.GOOGLE_CIVIC_KEY) return json({ error: 'Address lookup is not configured.' }, 503);
  const hit = await env.CACHE.get('civicstatus', 'json');
  if (hit) return json(hit);
  const base = 'https://www.googleapis.com/civicinfo/v2/voterinfo?key=' + env.GOOGLE_CIVIC_KEY +
               '&address=' + encodeURIComponent('111 NW 1st St, Miami, FL 33128');
  let r = await fetch(base), d = await r.json().catch(() => ({}));
  if (!r.ok && /election unknown/i.test((d.error && d.error.message) || '')) {
    const id = await novemberElectionId(env);
    if (id) { r = await fetch(base + '&electionId=' + id); d = await r.json().catch(() => ({})); }
  }
  const out = {
    checkedAt: new Date().toISOString(),
    testAddress: '111 NW 1st St, Miami, FL 33128',
    ok: r.ok, error: r.ok ? '' : ((d.error && d.error.message) || ('HTTP ' + r.status)),
    election: d.election ? d.election.name + ' (' + d.election.electionDay + ')' : '',
    pollingLocations: (d.pollingLocations || []).length,
    earlyVoteSites: (d.earlyVoteSites || []).length,
    dropOffLocations: (d.dropOffLocations || []).length,
    contests: (d.contests || []).length,
    sampleContests: (d.contests || []).slice(0, 5).map(c => c.office || c.referendumTitle || '')
  };
  await env.CACHE.put('civicstatus', JSON.stringify(out), { expirationTtl: 3600 });
  return json(out);
}
