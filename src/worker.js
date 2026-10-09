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
const LIMIT_RESEARCH_PER_DAY = 500; // TEMPORARY for the federal re-warm (Oct 8 night); revert to 60 right after
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
  const cacheKey = 'parse2:' + fp;  // v2: measures included

  const cached = await env.CACHE.get(cacheKey, 'json');
  if (cached) return json({ ballot: cached, cached: true });

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

  // Shared cache: the whole point. 500 users, one bill.
  // res4 for federal races (adds itemized FEC donor data); res3 for the rest.
  const key = (isMeasure ? 'resm1:' : (officeCode ? 'res7:' : 'resl4:')) + await sha256((name + '|' + office + '|' + jurisdiction + '|' + election).toLowerCase().replace(/\s+/g, ' '));
  const cached = await env.CACHE.get(key, 'json');
  if (cached) return json({ result: cached, cached: true });

  // Fire-and-poll: mobile browsers kill requests after ~60s, and fresh research
  // can take 90s. Start the research in the background, respond immediately,
  // and let the client poll this same endpoint until the cache fills.
  const failed = await env.CACHE.get('fail:' + key);
  if (failed) return json({ error: failed }, 502);
  const pending = await env.CACHE.get('pend:' + key);
  const params = { name, office, jurisdiction, election, isJudicial, isMeasure, measureSummary, officeCode };

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
    if (done) return json({ result: done, cached: false });
    const err = await env.CACHE.get('fail:' + key);
    return json({ error: err || 'Research failed' }, 502);
  }

  if (body.poll) return json({ pending: true });
  // Legacy client polling an in-flight research: wait briefly, then report back.
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const done = await env.CACHE.get(key, 'json');
    if (done) return json({ result: done, cached: true });
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
    '  "summary": "2-3 sentence plain-language explanation of what the measure does",',
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
    '  "summary": "2-3 sentence neutral overview of who this candidate is",',
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
        fecOk = true;
      }
    } catch (e) { console.log('FEC error for ' + name + ': ' + (e && e.message ? e.message : e)); }
    // federal race without FEC data: cache briefly so the next visitor retries FEC
    if (!fecOk) ttl = 60 * 60 * 6;
  }

  await env.CACHE.put(key, JSON.stringify(result), { expirationTtl: ttl });
  } catch (e) {
    await env.CACHE.put('fail:' + key, 'Research failed: ' + (e && e.message ? e.message : String(e)), { expirationTtl: 90 });
  } finally {
    await env.CACHE.delete('pend:' + key);
  }
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
      url: COMMITTEE_ENTITIES[v.type] && reg[v.cid] ? 'https://www.fec.gov/data/committee/' + v.cid + '/'
         : 'https://www.fec.gov/data/committee/' + committee.committee_id + '/?tab=receipts'
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
