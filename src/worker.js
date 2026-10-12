import { POLLING_PLACES, PP_SOURCE } from './polling-places.js';
/**
 * Ballot305.org (vote-informed): Cloudflare Worker backend for a free, nonpartisan
 * Miami-Dade voter research tool in English, Spanish and Haitian Creole.
 *
 * Routes:
 *   POST /api/parse            { pdf: base64 }  -> parsed ballot JSON (cached by PDF fingerprint)
 *   POST /api/research         { name, office, jurisdiction, election, isJudicial, lang } -> dossier JSON (shared cache)
 *   POST /api/race-money       { office, names } -> FEC fundraising for a federal race and where each candidate's money came from
 *   POST /api/ballot-text      { pdf, offices, measureOptions, electionName } -> official Spanish/Kreyol titles
 *   POST /api/translate-ballot { lang, offices, measureOptions, electionName } -> machine-translated titles
 *   GET  /api/evsites          early voting sites with coordinates
 *   GET  /api/pollingplace?p=  Election Day polling place for a precinct
 *   POST /api/voterinfo        { address } -> Google Civic voter info (polling place, contests when published)
 *   GET  /api/civic-status     whether Google's Nov 3 data is live (fixed public test address)
 *   GET  /api/elections        elections Google currently lists
 *
 * The Worker is deployed under the name "ballot-intel" (wrangler.toml). Renaming it would create a
 * separate Worker without this one's custom domain, secrets and Durable Object, so the name stays.
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
const LIMIT_MONEY_PER_DAY = 40;    // fresh (uncached) race-money lookups per IP per day; FEC API only, no AI
const LIMIT_RESEARCH_PER_DAY = 60; // fresh (uncached) lookups per IP per day; cached hits are free
const MAX_PDF_BASE64_CHARS = 44 * 1024 * 1024; // ~32MB PDF
// Countywide master ballot, fetched and parsed server-side. Update each election.
const FEATURED_BALLOT_URL = 'https://www.miamidade.gov/elections/library/2026-11-03-general-election-sample-ballot.pdf';
// Points at the parse of the master ballot: the copy bundled with the site (public/ballots/)
// or one fetched straight from the county. Research reads measure summaries from it instead of
// trusting the summary a browser sends.
const FEATURED_KEY = 'featured:parse';
const BUNDLED_BALLOT_PATH = '/ballots/2026-11-03-general.pdf';   // keep in sync with index.html

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
      if (request.method === 'POST' && url.pathname === '/api/race-money') {
        return await handleRaceMoney(request, env);
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
      if (request.method === 'GET' && url.pathname === '/api/org') {
        return await handleOrg(url, request, env);
      }
      if (request.method === 'GET' && url.pathname === '/api/fec-group') {
        return await handleFecGroup(url, request, env);
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
  return parseBallot(env, body.pdf, clientIP(request), false);
}

async function handleFeatured(request, env) {
  const res = await fetch(FEATURED_BALLOT_URL);
  if (!res.ok) {
    return json({ error: 'Could not fetch the countywide master ballot from the elections site (HTTP ' + res.status + '). Download it yourself and upload it here.' }, 502);
  }
  const buf = await res.arrayBuffer();
  const b64 = bufToBase64(buf);
  if (b64.length < 100) return json({ error: 'The elections site returned an empty file.' }, 502);
  return parseBallot(env, b64, clientIP(request), true);
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

async function parseBallot(env, pdfB64, ip, isFeatured) {
  if (pdfB64.length > MAX_PDF_BASE64_CHARS) {
    return json({ error: 'PDF too large (32MB max). Try compressing it or splitting the pages.' }, 413);
  }

  // Fingerprint the whole file. The old head+tail+length fingerprint let a doctored PDF with
  // the same first/last bytes and size claim another ballot's shared cache slot.
  const fp = await pdfFingerprint(pdfB64);
  const cacheKey = 'parse4:' + fp;  // v4: full-content fingerprint (v3 added precinct)

  const cached = await env.CACHE.get(cacheKey, 'json');
  if (cached) {
    if (isFeatured) await env.CACHE.put(FEATURED_KEY, cacheKey, { expirationTtl: PARSE_TTL });
    return json({ ballot: cached, cached: true });
  }

  // One-time migration: entries written under the old fingerprint. Nothing writes those keys
  // anymore, so they only expire; reuse them instead of re-reading the PDF.
  const oldFp = await legacyFingerprint(pdfB64);
  const v3 = await env.CACHE.get('parse3:' + oldFp, 'json');
  if (v3) {
    await env.CACHE.put(cacheKey, JSON.stringify(v3), { expirationTtl: PARSE_TTL });
    if (isFeatured) await env.CACHE.put(FEATURED_KEY, cacheKey, { expirationTtl: PARSE_TTL });
    return json({ ballot: v3, cached: true });
  }

  // Ballots parsed before precinct extraction existed: reuse that parse instead of re-reading
  // the whole PDF (slow for the 131-contest master ballot). Only a precinct-specific ballot
  // needs a precinct, and that is one quick, tiny call.
  const older = await env.CACHE.get('parse2:' + oldFp, 'json');
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
    if (isFeatured) await env.CACHE.put(FEATURED_KEY, cacheKey, { expirationTtl: PARSE_TTL });
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
  if (isFeatured) await env.CACHE.put(FEATURED_KEY, cacheKey, { expirationTtl: PARSE_TTL });
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
  let measureSummary = isStr(body.summary) ? body.summary.slice(0, 800) : '';

  const officeCode = isMeasure ? null : federalOfficeCode(office);
  const lang = TR_LANGS[body.lang] ? body.lang : 'en';

  // Everything that shapes the research prompt has to be part of the shared cache key, or one
  // visitor can seed everyone's result with a prompt of their choosing.
  //  - isJudicial picks its own prefix, so sending false for a judge can't strip the FedSoc screen.
  //  - A measure found on the county master ballot uses the county's printed summary and the
  //    browser's is ignored. Any other measure keys on a hash of the summary it was researched
  //    with, so a slanted summary only ever lands in its own cache slot.
  let summaryTag = '';
  if (isMeasure) {
    // The page sends a measure's title as name (office is just "Ballot measure"); check both.
    const trusted = await trustedMeasureSummary(env, name, office);
    if (trusted !== null) measureSummary = trusted.slice(0, 800);
    else if (measureSummary) summaryTag = '|s:' + (await sha256(normPart(measureSummary))).slice(0, 16);
  }

  // Shared cache: the whole point. 500 users, one bill.
  const prefix = isMeasure ? 'resm2:' : officeCode ? 'res7:' : isJudicial ? 'resj1:' : 'resl4:';
  const key = prefix + await sha256((name + '|' + office + '|' + jurisdiction + '|' + election).toLowerCase().replace(/\s+/g, ' ') + summaryTag);
  // Alias on a normalized key so ballots that print the same race slightly differently
  // ("Tuesday, November 3, 2026" vs "November 3, 2026", "Moe" with or without quotes, accents)
  // share one cached result.
  const alias = 'alias:' + prefix + await sha256([normPart(name), normPart(office), normPart(jurisdiction), normElection(election)].join('|') + summaryTag);
  let cached = await env.CACHE.get(key, 'json');
  if (!cached && prefix === 'resj1:') {
    // Judges used to share resl4 with every local race. Reuse an old entry only if it was
    // researched as judicial (it carries the FedSoc screen); otherwise research fresh.
    const old = await env.CACHE.get('resl4:' + key.slice(prefix.length), 'json');
    if (old && old.federalistSociety) {
      cached = old;
      ctx.waitUntil(env.CACHE.put(key, JSON.stringify(old), { expirationTtl: CACHE_TTL }));
    }
  }
  if (cached) {
    if (!(await env.CACHE.get(alias))) ctx.waitUntil(env.CACHE.put(alias, key, { expirationTtl: CACHE_TTL }));
    return json({ result: await localize(env, await refreshCached(env, key, cached, name, officeCode, office), lang), cached: true });
  }
  const target = await env.CACHE.get(alias);
  if (target && target !== key) {
    const hit = await env.CACHE.get(target, 'json');
    if (hit) return json({ result: await localize(env, await refreshCached(env, target, hit, name, officeCode, office), lang), cached: true });
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
    ? '3. Federalist Society ties: search this candidate across their internet presence: speeches, panels, event participation, membership mentions, chapter roles, contributor listings, bios, news coverage. Apply this rubric strictly. "documented" = (a) the candidate states their own membership or a chapter role (their bio, campaign site, LinkedIn, questionnaire), or the Federalist Society lists them as a member or officer, or (b) the Federalist Society own site or reliable coverage shows them speaking, moderating or presenting at TWO OR MORE Federalist Society events on different dates. "possible" = a single Federalist Society event appearance (say so plainly, with the year, e.g. "spoke at one Federalist Society student chapter event in 2009"), OR a named journalist, academic, or voter guide that asserts ties to THIS candidate by name. Note that fedsoc.org contributor pages state that being listed does not imply membership; never describe a listing alone as membership. "none_found" = no credible source connects this candidate to the Federalist Society. EVERY evidence item must name this candidate: never include articles about a court, an appointment pipeline, an applicant pool, or other candidates that do not name this candidate, and never include endorsements by groups merely described as FedSoc-aligned. Preserve each source own hedges.'
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
    'If a funder is a 501(c)(4), 501(c)(6) or other group that does not publicly disclose its own donors, add "disclosure": "not_disclosed" to it.',
    '3. Major supporters: organizations and notable public figures backing it.',
    '4. Major opponents: organizations and notable public figures against it.',
    'THIS ELECTION ONLY: list a funder, supporter, or opponent only if they took a position on this measure for this election. Positions on an earlier version or an earlier election do not count, even as precedent; mention them in the relevant note instead.',
    'For every funder, supporter, and opponent, give "lean": "left", "right", or "nonpartisan" — the general political alignment of that person or organization, not the measure. EXCEPTION: every labor union (including police, firefighter and teacher unions and labor federations) gets "lean": "labor", never left or right, plus "laborType": the kind of workers it represents (e.g. "Teachers", "Firefighters", "Police").',
    'CRITICAL identity rule: name each organization or person ONLY by a name you verified on their own site or in reliable coverage. If all you have is an acronym or handle, report it exactly as written and note the identity is unverified — NEVER invent an expansion. Preserve source hedges; never state a claim more strongly than the source does.',
    '',
    'After searching, respond with ONLY a JSON object, no prose before or after, no markdown fences. Plain text in all string values — no XML or cite tags:',
    '{',
    '  "summary": "2-3 sentence plain-language explanation of what the measure does, based on the ballot text and official or news sources you cite in summarySources. No predictions or characterizations of its effects beyond what a cited source states, and attribute any such claim to its source.",',
    '  "summarySources": [ {"name": "publication or site name", "url": "direct link taken from your search results"} ],',
    '  "financing": {',
    '    "support": [ {"name": "funder", "amount": "like $250,000 or the single word undisclosed", "kind": "individual|corporation|lobbying or trade group|union|PAC/committee|nonprofit|political party|other", "lean": "left|right|nonpartisan|labor", "laborType": "only for unions, else omit", "note": "one line of context, else empty string", "url": "direct link, else empty string"} ],',
    '    "oppose": [ same shape ],',
    '    "note": "one sentence on the quality/source of finance data found, or why none was found"',
    '  },',
    '  "supporters": [ {"name": "org or person", "lean": "left|right|nonpartisan|labor", "laborType": "only for unions, else omit", "type": "kind of group or role", "note": "one line, else empty string", "url": "direct link, else empty string"} ],',
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
    '1. Top campaign donors/contributors (largest individual donors, PACs, organizations). ONLY money given directly to the campaign of this candidate for THIS race. Do NOT include outside spending, super PAC or independent expenditures, money given to a PAC that supports the candidate, or contributions to past campaigns of this candidate for other offices. For federal races prefer FEC data; for state/local use state disclosure portals and news coverage. If a source names a donor or PAC but not the amount, still list it with amount "unknown" rather than leaving it only in the note. If no donors are named anywhere, return an empty array — do not guess. Florida caps direct gifts to a campaign at $3,000 per election for statewide offices and Supreme Court justices and $1,000 for other offices, so a gift above that went to a committee, not the campaign.',
    '1a. THIS ELECTION CYCLE ONLY (2025-2026): every donor, committee donor and outside spender must be money given or spent in 2025 or 2026 for this race. Leave out anything from an earlier cycle or campaign, even for the same office. Give each item\u2019s "year".',
    '1b. Top donors to political committees (Florida political committees, super PACs) that the candidate controls or that exist to support them, e.g. "Friends of [candidate]". These are NOT campaign donors and go in committeeDonors with the committee name. Never put committee money in donors.',
    '2. Endorsements and candidate ratings — these are DIFFERENT things and go in DIFFERENT arrays. "endorsements" = only explicit endorsements where an organization or person declares support for the candidate. "opposition" = organizations or people that explicitly oppose the candidate or urge a vote against them (including urging a NO vote on a judicial retention); these NEVER go in endorsements. "ratings" = evaluations that are not endorsements: bar association polls, "Highly Qualified"/"Qualified"/"Not Qualified" designations, judicial performance reviews, scorecards, grades. Only include ratings issued by established advocacy groups, professional or bar associations, or official review bodies, and only when you found the rating on that body\u2019s own website: its url must be a page on the rating organization\u2019s own site, not a blog, news story or aggregator repeating it. If you cannot find it on their own site, leave it out. EXCLUDE grades from voter-guide websites, election trackers, data aggregators, AI-generated report cards, and any site that grades candidates on its own "transparency", "accountability" or "integrity" rubric (for example Decode the Vote, Ballotpedia, Vote Smart summaries, iSideWith). If an organization states it does not endorse, its evaluation ALWAYS goes in ratings, never endorsements. CRITICAL identity rule for both arrays: name each organization ONLY by a full name you verified on the organization own website or in reliable coverage. If all you have is an acronym or a social-media handle, report the handle exactly as written and state in the note that the organization identity is unverified — NEVER guess or invent an expansion of an acronym. Classify each organization:',
    '   THIS ELECTION ONLY: endorsements, opposition and ratings must be for this candidate in THIS election (the 2025-2026 cycle). Endorsements, ratings or opposition from the candidate\u2019s earlier campaigns, even for the same office (a 2022 or 2024 race, an earlier retention vote, a prior term), do not count: leave them out entirely. Give each item\u2019s "year": the year it was made.',
    '   - "lean": "left", "right", or "nonpartisan" — based on the organization general political alignment, not the candidate. EXCEPTION: every labor union (including police, firefighter and teacher unions and labor federations like the AFL-CIO) gets "lean": "labor", never left or right, plus "laborType": the kind of workers it represents (e.g. "Teachers", "Firefighters", "Police", "Nurses", "Public employees", "Building trades", "Multiple trades (labor federation)"), and "type": "labor union".',
    '   - "type": the kind of group, e.g. "labor union", "law enforcement", "business association", "environmental group", "newspaper editorial board", "civil rights organization", "party organization", "elected official", "religious organization", "professional association"',
    '   - "url": link the endorser own announcement (their site or publication) or reliable news coverage of it. Never cite a political party or campaign page that repeats another organization endorsement, unless the endorser is that party or campaign.',
    '4. OUTSIDE SPENDING: groups other than the campaign and the committees it controls that spent their own money on ads, mail, texts or canvassing FOR or AGAINST this candidate in THIS race (independent expenditures, electioneering communications, super PACs, party or nonprofit spending). Florida requires these to be reported to the Division of Elections or the county. List each spender with the amount where reported, its kind, and whether it supported or opposed the candidate. If a spender is a 501(c)(4), 501(c)(6) or other group that does not publicly disclose its donors, set "disclosure": "not_disclosed". Only list spending you found in filings or reliable coverage; never guess.',
    fedsocTask,
    '',
    'After searching, respond with ONLY a JSON object, no prose before or after, no markdown fences. Write plain text inside all JSON string values — no XML, no cite tags, no citation markup of any kind. When summarizing evidence, preserve the source hedges and caveats: never state a claim more strongly than the source does.',
    '{',
    '  "summary": "1-3 neutral sentences with ONLY these facts: the office sought, party, current or most recent job or office, prior offices, professional background, education. Every fact must come from a source you cite in summarySources. Nothing else: no adjectives or value judgments, no ideology labels besides party, no positions, priorities, record, accomplishments or controversies, no endorsements, fundraising, polling or vote shares, even when a source says them. If sources disagree or you are unsure, leave the fact out.",',
    '  "summarySources": [ {"name": "publication or site name", "url": "direct link taken from your search results"} ],',
    '  "donors": [ {"name": "donor name", "year": "year the gift was made, e.g. 2026, else empty string", "amount": "dollar amount like $1,000, or the single word unknown (named in a source, amount not reported) or undisclosed (source says it is hidden) — never a phrase", "type": "individual | PAC | industry group | party committee | self-funded | other", "url": "direct link to the page documenting this, else empty string"} ],',
    '  "committeeDonors": [ {"name": "donor name", "year": "year the gift was made, e.g. 2026, else empty string", "amount": "dollar amount, or unknown", "committee": "the committee that received it, as named in the source", "type": "individual | PAC | corporation | party committee | other", "url": "direct link to the page documenting this, else empty string"} ],',
    '  "donorDataNote": "one sentence on the quality/source of donor data found, or why none was found",',
    '  "donorListUrl": "link to the page listing this candidate\u2019s full campaign contributions on an official disclosure portal (Florida Division of Elections, Miami-Dade County or city clerk filings), taken directly from your search results, else empty string",',
    '  "endorsements": [ {"org": "organization or person", "year": "year it was made, e.g. 2026, else empty string", "lean": "left|right|nonpartisan|labor", "laborType": "only for unions, else omit", "type": "group type", "note": "optional one-line context, else empty string", "url": "direct link to the page documenting this, else empty string"} ],',
    '  "opposition": [ {"org": "organization or person", "year": "year it was made, e.g. 2026, else empty string", "lean": "left|right|nonpartisan|labor", "laborType": "only for unions, else omit", "type": "group type", "note": "optional one-line context, else empty string", "url": "direct link to the page documenting this, else empty string"} ],',
    '  "ratings": [ {"org": "organization", "year": "year it was made, e.g. 2026, else empty string", "rating": "the rating or evaluation given, exactly as stated", "lean": "left|right|nonpartisan|labor", "laborType": "only for unions, else omit", "type": "group type", "note": "what the rating means / methodology if stated, else empty string", "url": "direct link to the page documenting this, else empty string"} ],',
    '  "outsideSpending": { "support": [ {"name": "spender as named in the source", "amount": "dollar amount, or unknown", "kind": "super PAC | political committee | party committee | nonprofit | electioneering communications organization | union | corporation | other", "disclosure": "disclosed or not_disclosed", "note": "one line, else empty string", "url": "direct link to the page documenting this, else empty string"} ], "oppose": [ same shape ], "note": "one sentence on what was found and its source, or why nothing was found" },',
    fedsocSchema,
    '  "sources": ["site names or URLs actually consulted"]',
    '}',
    '',
    'Limit donors to the top 8, endorsements to the 10 most significant, and ratings to the 6 most significant. If you find nothing for a section, return an empty array and say so in the relevant note. URL rule: every "url" value must be a real URL taken directly from your search results — never construct, guess, or reformat a URL. If you do not have the exact URL, use an empty string.'
  ].join('\n');

  const deep = isJudicial || isMeasure;
  const seen = new Map();
  const text = await callAnthropic(env, {
    model: deep ? MODEL_JUDICIAL : MODEL,
    max_tokens: 6000,
    temperature: 0,
    messages: [{ role: 'user', content: isMeasure ? measurePrompt : prompt }],
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: deep ? 5 : 3 }]
  }, seen);

  const result = extractJSON(text);
  // Links must be pages the search actually returned. A link the model wrote from memory or
  // made up is dropped, and so is anything that isn't plain https.
  result._links = verifyUrls(result, seen);

  applyKnownLeans(result);
  if (isMeasure) {
    try { await dropPriorElection(env, result); result.measV = MEASURE_VERSION; }
    catch (e) { console.log('prior-election check error for ' + name + ': ' + e.message); }
  }
  if (result.federalistSociety) {
    try { await regradeFedsoc(env, result, name); result.fsV = FEDSOC_VERSION; }
    catch (e) { console.log('fedsoc regrade error for ' + name + ': ' + e.message); }
  }
  if (!isMeasure) {
    try { result.summary = await neutralSummary(env, result.summary); result.sumV = SUMMARY_VERSION; }
    catch (e) { console.log('summary rewrite error for ' + name + ': ' + e.message); }
    try { await splitOpposition(env, result); result.oppV = OPPOSITION_VERSION; }
    catch (e) { console.log('opposition split error for ' + name + ': ' + e.message); }
    try { await dropPriorCycle(env, result, name); } catch (e) { console.log('prior-cycle check error for ' + name + ': ' + e.message); }
    result.cycV = CYCLE_VERSION;
    ownSiteRatings(result);
    separateCommitteeMoney(result, office, officeCode);
    if (!officeCode) await refreshFlDonors(env, key, result, name, office, false);
    await refreshMdcDonors(env, result, name, office, officeCode);
    await refreshEvDonors(env, result, name, office, officeCode);
    await refreshTxDonors(env, result, name, office, officeCode);
    await refreshAllied(env, result, name);
    try { await resourcePartyLinks(env, result, name, office); }
    catch (e) { console.log('link re-source error for ' + name + ': ' + e.message); }
    result.linkV = LINK_VERSION;
  }

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
  if (officeCode) {
    try {
      const o = await fecOutsideSpending(env, name, officeCode);
      if (o) { result.outsideSpending = o; result.outV = OUTSIDE_VERSION; }
    } catch (e) { console.log('FEC outside spending error for ' + name + ': ' + e.message); }
  }
  markDisclosure(result);

  await env.CACHE.put(key, JSON.stringify(result), { expirationTtl: ttl });
  if (p.alias) await env.CACHE.put(p.alias, key, { expirationTtl: ttl });
  } catch (e) {
    await env.CACHE.put('fail:' + key, 'Research failed: ' + (e && e.message ? e.message : String(e)), { expirationTtl: 90 });
  } finally {
    await env.CACHE.delete('pend:' + key);
  }
}

// Candidate descriptions are rewritten to neutral biographical facts before anyone sees them.
// Research can still slip in a characterization a source used ("longtime", "progressive firebrand",
// "known for fighting..."), and results cached before the rules tightened carry them too. This is
// an edit-only pass: no web search, and it may only remove, never add. Bump to re-run it on every
// cached result.
const SUMMARY_VERSION = 1;
async function neutralSummary(env, summary) {
  const original = String(summary || '').trim();
  if (!original) return '';
  const text = await callAnthropic(env, {
    model: MODEL,
    max_tokens: 400,
    temperature: 0,
    messages: [{ role: 'user', content: [
      'You edit candidate descriptions for a nonpartisan voter guide. Rewrite the description below so it keeps ONLY these facts, when they are in it: the office the person is running for, party, current or most recent job or office, prior offices, professional background, education.',
      'Remove everything else: adjectives and value judgments (for example longtime, prominent, popular, controversial, staunch, rising star, firebrand), ideology labels other than party, what the person is known for, their positions, priorities, record, accomplishments or controversies, endorsements, fundraising, polling and vote shares. Remove these even when the description attributes them to a source.',
      'Never add a fact, name, number or date that is not in the original. Use plain verbs (is running for, served as, works as). Keep it to 1 to 3 sentences in the same language. If nothing neutral is left, respond with exactly: NONE',
      'Respond with only the rewritten description, no quotes or commentary.',
      '',
      'Description:',
      original
    ].join('\n') }]
  });
  const out = String(text || '').trim().replace(/^["\u201c]+|["\u201d]+$/g, '').trim();
  if (!out || /^NONE\.?$/i.test(out)) return '';
  // An edit that only removes can't come out much longer than it went in; if it did, it added something.
  if (out.length > original.length + 40) return '';
  return out;
}

// Endorsements that are really opposition ("recommended voting NO on retention", "urged
// voters to reject") move to their own list. Research is told to keep them apart, but older cached
// results mixed them, and the model still slips. Bump to re-check every cached result.
const OPPOSITION_VERSION = 1;
async function splitOpposition(env, result) {
  const list = Array.isArray(result.endorsements) ? result.endorsements : [];
  result.opposition = Array.isArray(result.opposition) ? result.opposition : [];
  if (!list.length) return result;
  const text = await callAnthropic(env, {
    model: MODEL,
    max_tokens: 200,
    temperature: 0,
    messages: [{ role: 'user', content: [
      'Each numbered item below was listed as an endorsement of a candidate. Some actually OPPOSE the candidate: they urge a vote against them, recommend NO on their retention, call for their defeat, or rescind support.',
      'Return ONLY a JSON array of the numbers of the items that oppose the candidate, e.g. [2] or []. An item that supports the candidate, or is unclear, is not opposition.',
      '',
      list.map((e, i) => i + '. ' + String(e && e.org || '') + ': ' + String(e && e.note || '')).join('\n')
    ].join('\n') }]
  });
  const m = String(text || '').match(/\[[\d,\s]*\]/);
  const idx = new Set((m ? JSON.parse(m[0]) : []).filter(i => Number.isInteger(i) && i >= 0 && i < list.length));
  if (idx.size) {
    result.opposition = result.opposition.concat(list.filter((e, i) => idx.has(i)));
    result.endorsements = list.filter((e, i) => !idx.has(i));
  }
  return result;
}

// A rating is only shown when its link is on the rating body's own website (floridabar.org for
// The Florida Bar, not a blog quoting the poll). The site has to match the organization's name:
// its acronym (dcba.org), its words run together (sierraclub.org), two of its words, or one
// distinctive word. Anything else, including a rating with no link, is dropped.
const GENERIC_WORDS = new Set(['the', 'of', 'and', 'for', 'inc', 'florida', 'county', 'miami', 'dade', 'national',
  'american', 'association', 'council', 'committee', 'league', 'united', 'state', 'south', 'greater', 'group']);
function siteMatchesOrg(url, org) {
  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch (e) { return false; }
  const labels = host.replace(/^www\./, '').split('.');
  labels.pop();                                         // TLD
  if (labels.length > 1 && /^(co|com|org|gov|net|ac)$/.test(labels[labels.length - 1])) labels.pop();
  const site = labels.join('').replace(/[^a-z0-9]/g, '');
  const words = normPart(org).split(' ').filter(w => w && !['the', 'of', 'and', 'for', 'inc'].includes(w));
  if (!site || !words.length) return false;
  const acronym = words.map(w => w[0]).join('');
  if (acronym.length >= 3 && site.includes(acronym)) return true;
  if (site.includes(words.join(''))) return true;
  const hits = words.filter(w => w.length >= 3 && site.includes(w));
  if (hits.length >= 2) return true;
  return hits.some(w => w.length >= 5 && !GENERIC_WORDS.has(w));
}
function ownSiteRatings(result) {
  if (Array.isArray(result.ratings))
    result.ratings = result.ratings.filter(r => r && /^https:\/\//i.test(r.url || '') && siteMatchesOrg(r.url, r.org));
  return result;
}

// Campaign gifts are capped by law. Anything listed as a campaign donation above twice the cap
// (primary plus general) must have gone to a committee, so it moves to committeeDonors.
// Florida: $3,000 per election for statewide offices and Supreme Court justices, $1,000 for
// everything else. Federal: $3,500 per election (2025-2026).
function contributionCap(office, officeCode) {
  if (officeCode) return 3500;
  const o = String(office || '').toLowerCase();
  return /governor|attorney general|chief financial officer|commissioner of agriculture|supreme court/.test(o) ? 3000 : 1000;
}
function parseAmount(a) {
  const m = String(a || '').replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d+)?)\s*(million|m\b|thousand|k\b)?/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = (m[2] || '').toLowerCase();
  return unit.startsWith('m') ? n * 1e6 : unit.startsWith('t') || unit === 'k' ? n * 1e3 : n;
}
function separateCommitteeMoney(result, office, officeCode) {
  if (!Array.isArray(result.donors)) return result;
  if (!Array.isArray(result.committeeDonors)) result.committeeDonors = [];
  const limit = 2 * contributionCap(office, officeCode);
  const keep = [];
  for (const d of result.donors) {
    if (!d) continue;
    const n = parseAmount(d.amount);
    // PACs and party committees may give federal candidates more than individuals can; FEC rows are exact
    const fecRow = officeCode && /fec\.gov/.test(d.url || '');
    // official state records are exact too (parties and candidates' own loans aren't capped)
    const official = fecRow || result.donorSource === 'FL' || result.donorSource === 'MDC' || result.donorSource === 'CITY';
    if (n !== null && n > limit && !official) result.committeeDonors.push({ ...d, committee: d.committee || '' });
    else keep.push(d);
  }
  result.donors = keep;
  return result;
}

// Bring a cached result up to date: FEC donors for federal races and the neutral description.
// Saves back to the cache only when something changed.
async function refreshCached(env, key, result, name, officeCode, office) {
  result = await refreshFec(env, key, result, name, officeCode);   // saves its own changes
  result = await refreshOutside(env, key, result, name, officeCode); // saves its own changes
  applyKnownLeans(result);                                        // cheap, so these run on every read
  markDisclosure(result);
  let changed = false;
  if (result.financing) {                                         // a ballot measure
    if (result.measV !== MEASURE_VERSION) {
      try {
        await dropPriorElection(env, result);
        result.measV = MEASURE_VERSION;
        changed = true;
      } catch (e) {
        console.log('prior-election check error for ' + name + ': ' + e.message);
        result.measV = MEASURE_VERSION;   // keep as is; don't retry on every read
        changed = true;
      }
    }
    if (changed) await env.CACHE.put(key, JSON.stringify(result), { expirationTtl: CACHE_TTL });
    return result;
  }
  ownSiteRatings(result);                                         // cheap, so these run on every read
  separateCommitteeMoney(result, office, officeCode);
  if (!officeCode && await refreshFlDonors(env, key, result, name, office, false)) { markDisclosure(result); changed = true; }
  if (await refreshMdcDonors(env, result, name, office, officeCode)) { markDisclosure(result); changed = true; }
  if (await refreshEvDonors(env, result, name, office, officeCode)) { markDisclosure(result); changed = true; }
  if (await refreshTxDonors(env, result, name, office, officeCode)) { markDisclosure(result); changed = true; }
  if (await refreshAllied(env, result, name)) { markDisclosure(result); changed = true; }
  if (result.sumV !== SUMMARY_VERSION) {
    try {
      result.summary = await neutralSummary(env, result.summary);
      result.sumV = SUMMARY_VERSION;
      changed = true;
    } catch (e) { console.log('summary rewrite error for ' + name + ': ' + e.message); }
  }
  if (result.oppV !== OPPOSITION_VERSION) {
    try {
      await splitOpposition(env, result);
      result.oppV = OPPOSITION_VERSION;
      changed = true;
    } catch (e) { console.log('opposition split error for ' + name + ': ' + e.message); }
  }
  if (result.cycV !== CYCLE_VERSION) {
    try { await dropPriorCycle(env, result, name); } catch (e) { console.log('prior-cycle check error for ' + name + ': ' + e.message); }
    result.cycV = CYCLE_VERSION;   // set even on failure: never retry on every read
    changed = true;
  }
  if (result.linkV !== LINK_VERSION) {
    try { await resourcePartyLinks(env, result, name, office); }
    catch (e) { console.log('link re-source error for ' + name + ': ' + e.message); }
    result.linkV = LINK_VERSION;   // set even on failure: never retry on every read
    changed = true;
  }
  if (result.federalistSociety && result.fsV !== FEDSOC_VERSION) {
    try {
      await regradeFedsoc(env, result, name);
      result.fsV = FEDSOC_VERSION;
      changed = true;
    } catch (e) {
      console.log('fedsoc regrade error for ' + name + ': ' + e.message);
      result.fsV = FEDSOC_VERSION;   // keep the original grade; don't retry (and pay) on every read
      changed = true;
    }
  }
  if (changed) await env.CACHE.put(key, JSON.stringify(result), { expirationTtl: CACHE_TTL });
  return result;
}

// One label per organization, everywhere. Research labels each group's lean inside each dossier,
// so the same group could come out "left" in one and "nonpartisan" in another. Groups that show up
// across many races get a fixed label here. The rule: party organizations get their party's side;
// news organizations, sheriff and police-chief associations, bar associations and the League of
// Women Voters are nonpartisan. Labor unions get no left/right label at all: see classifyUnion.
// First match wins. Edit this list, not the prompt, to change a label.
const KNOWN_LEANS = [
  [/\b(miami herald|el nuevo herald|sun sentinel|palm beach post|tampa bay times|orlando sentinel|tallahassee democrat|florida times union|miami today|biscayne times|miami new times|miami times|wlrn|axios)\b/, 'nonpartisan'],
  [/\beditorial board\b/, 'nonpartisan'],
  [/\b(sheriffs association|police chiefs association|fire chiefs)\b/, 'nonpartisan'],
  [/\b(bar association|the florida bar|league of women voters)\b/, 'nonpartisan'],
  [/\b(democratic (party|club|executive committee|caucus)|young democrats|democrats)\b/, 'left'],
  [/\b(republican (party|club|executive committee)|young republicans|republicans|gop)\b/, 'right'],
];
function knownLean(name) {
  const n = normPart(name);
  if (!n) return null;
  for (const [re, lean] of KNOWN_LEANS) if (re.test(n)) return lean;
  return null;
}
// Labor unions are labeled by the kind of workers they represent, never left or right:
// lean "labor", laborType "Teachers", type "labor union". First match wins.
const NOT_UNION = /\b(civil liberties union|credit union|european union|union county|union station)\b/;
const KNOWN_UNIONS = /\b(seafarers|machinists|steelworkers|letter carriers|sag aftra|operating engineers|afscme|seiu|teamsters|ibew|unite here|fraternal order of police|police benevolent association|pba|fop|fire ?fighters|iaff|united teachers|teachers union|federation of teachers|education association|nurses union|national nurses|communications workers|cwa|building (and construction )?trades|carpenters|laborers|plumbers|pipefitters|ironworkers|iron workers|electrical workers|labor council|transport workers|utu|smart union|ufcw|uaw)\b/;
const LABOR_TYPES = [
  [/\b(teacher|teachers|education association|educators|utd)\b/, 'Teachers'],
  [/\b(fire ?fighters?|iaff)\b/, 'Firefighters'],
  [/\b(police|fop|pba|law enforcement|corrections|deputies)\b/, 'Police'],
  [/\b(nurse|nurses)\b/, 'Nurses'],
  [/\b(afscme|public employees|government employees|state employees|county employees)\b/, 'Public employees'],
  [/\b(seiu|service employees)\b/, 'Service workers'],
  [/\b(unite here|hotel|hospitality|culinary)\b/, 'Hotel and food service workers'],
  [/\b(ufcw|food and commercial|grocery)\b/, 'Grocery and retail workers'],
  [/\b(teamsters|transport workers|utu|transit)\b/, 'Transportation workers'],
  [/\b(ibew|electrical workers)\b/, 'Electrical workers'],
  [/\b(carpenters|laborers|plumbers|pipefitters|iron ?workers|building (and construction )?trades|construction)\b/, 'Building trades'],
  [/\b(cwa|communications workers)\b/, 'Communications workers'],
  [/\b(uaw|auto workers)\b/, 'Auto workers'],
  [/\b(seafarers|maritime|longshore|ila|ilwu)\b/, 'Maritime workers'],
  [/\b(machinists|iam|aerospace workers)\b/, 'Machinists'],
  [/\b(steelworkers|usw)\b/, 'Steelworkers'],
  [/\b(letter carriers|postal)\b/, 'Postal workers'],
  [/\b(sag aftra|actors|musicians)\b/, 'Performers'],
  [/\b(operating engineers|sheet metal|bricklayers|painters|roofers|elevator)\b/, 'Building trades'],
  [/\b(afl cio|labor council|labor federation|cope|central labor)\b/, 'Multiple trades (labor federation)'],
];
function classifyUnion(it) {
  const name = normPart(it.org || it.name);
  const tag = normPart([it.type, it.kind].filter(Boolean).join(' '));
  const all = name + ' ' + tag;
  if (NOT_UNION.test(all)) return false;
  const isUnion = it.lean === 'labor' || /\b(labor|labour|trade) union\b|\bunion\b/.test(tag) || KNOWN_UNIONS.test(name);
  if (!isUnion) return false;
  let laborType = '';
  for (const [re, label] of LABOR_TYPES) if (re.test(all)) { laborType = label; break; }
  if (!laborType && typeof it.laborType === 'string') laborType = it.laborType.trim();
  it.lean = 'labor';
  it.laborType = laborType;
  if ('type' in it || !('kind' in it)) it.type = 'labor union';
  if ('kind' in it) it.kind = 'union';
  return true;
}

function applyKnownLeans(result) {
  const fix = list => {
    if (!Array.isArray(list)) return;
    for (const it of list) {
      if (!it || typeof it !== 'object') continue;
      if (classifyUnion(it)) continue;
      if (it.lean === 'labor') it.lean = 'nonpartisan';   // labeled labor but not a union
      const lean = knownLean(it.org || it.name);
      if (lean) it.lean = lean;
    }
  };
  fix(result.endorsements); fix(result.opposition); fix(result.ratings);
  fix(result.supporters); fix(result.opponents);
  if (result.financing) { fix(result.financing.support); fix(result.financing.oppose); }
  return result;
}

// An endorsement should link the endorser's own page (site or official social account) or news
// coverage of it, never a party's website repeating someone else's endorsement (that made a
// newspaper's pick look like a party product). Offending links get one small web search for the
// primary source; if none is found the link is dropped and the endorsement stays.
// Bump to re-check every cached result.
const LINK_VERSION = 2;
const PARTY_HOST = /(dems|democrat|gop|republican)/i;
const PARTY_ORG = /\b(democrat\w*|dems|republican\w*|gop)\b/i;
function needsPrimaryLink(e) {
  // a party page standing in for someone else's endorsement, or a newspaper pick with no link at all
  return partyCited(e) || (!!e && !e.url && /\b(herald|times|sun sentinel|post|news|editorial board)\b/i.test(String(e.org || e.name || '')));
}
function partyCited(e) {
  if (!e || !e.url) return false;
  let host = '';
  try { host = new URL(e.url).hostname; } catch (x) { return false; }
  return PARTY_HOST.test(host) && !PARTY_ORG.test(String(e.org || e.name || ''));
}
async function resourcePartyLinks(env, result, name, office) {
  const items = [...(result.endorsements || []), ...(result.opposition || []), ...(result.ratings || [])].filter(needsPrimaryLink);
  for (const e of items.slice(0, 4)) {
    const seen = new Map();
    let url = '';
    try {
      const text = await callAnthropic(env, {
        model: MODEL,
        max_tokens: 600,
        temperature: 0,
        messages: [{ role: 'user', content: [
          'Find the page where ' + (e.org || e.name) + ' itself announced its endorsement or recommendation regarding ' + name + ' (' + office + '): its own website, or its own official social media account. If you cannot find that, a news outlet’s report of it is acceptable.',
          'Newspapers often title these "[Paper] endorsement: [office]" or "[Paper] recommends" and post them on their official X or Facebook accounts; that post counts if it is the paper\'s own account and names this race.',
          'NOT acceptable: a political party, party club, or campaign website repeating it.',
          'Respond with ONLY JSON: {"url": "the exact URL from your search results"} or {"url": ""} if none.'
        ].join('\n') }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }]
      }, seen);
      const cand = String((extractJSON(text) || {}).url || '');
      const real = cand ? seen.get(normUrl(cand)) : '';
      if (real && /^https:\/\//i.test(real) && !partyCited({ url: real, org: e.org || e.name })) url = real;
    } catch (x) { console.log('link re-source error for ' + name + ': ' + x.message); }
    e.url = url;   // primary source, or no link rather than a party page
  }
  return result;
}

// Federalist Society screen, re-graded from the evidence already found (no web search).
// Only ever lowers a status or drops evidence; it can't add anything. Catches a single old event
// labeled "documented", and articles that never name the candidate. Bump to re-grade every cached judge.
const FEDSOC_VERSION = 1;
const FS_RANK = { none_found: 0, possible: 1, documented: 2 };
async function regradeFedsoc(env, result, name) {
  const fs = result.federalistSociety;
  if (!fs || !Array.isArray(fs.evidence) || !fs.evidence.length) return result;
  if (!(fs.status in FS_RANK) || fs.status === 'none_found') return result;
  const text = await callAnthropic(env, {
    model: MODEL_JUDICIAL,
    max_tokens: 1500,
    temperature: 0,
    messages: [{ role: 'user', content: [
      'You check a Federalist Society screen for a nonpartisan voter guide. Candidate: ' + name + '. Use ONLY the evidence below. Do not use outside knowledge.',
      '',
      'Step 1. Drop any item that does not itself say this candidate, by name, is a member, held a role, or took part in a Federalist Society event, or that a named source asserts ties to this candidate. Drop items about a court, an appointment pipeline, an applicant pool, or other people, and items where the source does not attribute anything to this candidate.',
      'Step 2. Grade what is left:',
      '- "documented": the candidate states their own membership or a chapter role, or the Federalist Society lists them as a member or officer, or the kept items show TWO OR MORE Federalist Society event appearances on different dates.',
      '- "possible": exactly one Federalist Society event appearance, or a named source asserting ties without primary evidence.',
      '- "none_found": nothing kept.',
      'A fedsoc.org speaker or contributor listing for one event is one appearance, not membership.',
      '',
      'Respond with ONLY JSON: {"keep": [indices of items to keep], "status": "documented|possible|none_found"}',
      '',
      fs.evidence.map((e, i) => i + '. [' + String(e && e.source || '') + '] ' + String(e && e.summary || '')).join('\n')
    ].join('\n') }]
  });
  const out = extractJSON(text);
  const keep = new Set((Array.isArray(out.keep) ? out.keep : []).filter(i => Number.isInteger(i) && i >= 0 && i < fs.evidence.length));
  let status = out.status in FS_RANK ? out.status : fs.status;
  if (FS_RANK[status] > FS_RANK[fs.status]) status = fs.status;   // never raise
  const kept = fs.evidence.filter((e, i) => keep.has(i));
  if (!kept.length || status === 'none_found') {
    fs.status = 'none_found';
    fs.evidence = [{ source: '', url: '', summary: 'No source that names this candidate connects them to the Federalist Society.' }];
  } else {
    fs.status = status;
    fs.evidence = kept;
  }
  return result;
}

// Candidates: endorsements, opposition and ratings from earlier campaigns (a 2022 race, an earlier
// retention vote) don't count for this election. They move to priorCycle (not shown).
// Anything dated before CYCLE_START by its own "year" or its link's date is dropped outright; the
// rest goes to a model check that reads the org, note and link. Bump to re-check every cached result.
const CYCLE_VERSION = 2;
const CYCLE_START_YEAR = 2025;   // the 2025-2026 cycle; update each cycle
function urlYear(u) {
  const m = String(u || '').match(/[\/_-]((?:19|20)\d\d)[\/_-]/);
  return m ? parseInt(m[1], 10) : null;
}
async function dropPriorCycle(env, result, name) {
  // [label, get, set]. Official records (FEC, state, county) are already limited to this cycle, so only
  // web-research rows are checked.
  const official = result.donorSource === 'FL' || result.donorSource === 'MDC' || result.donorSource === 'CITY';
  const L = [
    ['endorsements', () => result.endorsements, v => { result.endorsements = v; }],
    ['opposition', () => result.opposition, v => { result.opposition = v; }],
    ['ratings', () => result.ratings, v => { result.ratings = v; }],
    ['donors', () => official ? null : result.donors, v => { result.donors = v; }],
    ['committeeDonors', () => result.committeeSource === 'FL' ? null : result.committeeDonors, v => { result.committeeDonors = v; }],
    ['outside.support', () => result.outsideSpending && result.outsideSpending.support, v => { result.outsideSpending.support = v; }],
    ['outside.oppose', () => result.outsideSpending && result.outsideSpending.oppose, v => { result.outsideSpending.oppose = v; }],
  ];
  const isOfficialRow = it => /fec\.gov/.test(String(it && it.url || '')) || /^C\d{8}$/.test(String(it && it.fecId || '')) || it && it.source;
  const prior = [];
  const drop = new Set();
  const items = [];
  for (const [label, get] of L) {
    const list = get();
    if (!Array.isArray(list)) continue;
    list.forEach((it, i) => {
      if (!it || typeof it !== 'object' || isOfficialRow(it)) return;
      const id = label + ':' + i;
      const y = parseInt(it.year, 10);
      const uy = urlYear(it.url);
      // its own year, or a dated link, before this cycle: an earlier campaign. (A 2024 link can be an
      // early endorsement for 2026, so 2024 links go to the check instead.)
      if ((y && y < CYCLE_START_YEAR) || (uy && uy < CYCLE_START_YEAR - 1)) drop.add(id);
      else items.push({ id, it });
    });
  }
  if (items.length) {
    const text = await callAnthropic(env, {
      model: MODEL,
      max_tokens: 800,
      temperature: 0,
      messages: [{ role: 'user', content: [
        'Each item below is listed as an endorsement, opposition, rating, donation or outside spending for ' + name + ' in the November 2026 election (the 2025-2026 cycle). Some are actually from an earlier campaign or cycle: an earlier race (for example 2018, 2020, 2022 or 2024), a previous term, or an earlier retention vote, even for the same office.',
        'Return ONLY a JSON array of the ids of items that are from an earlier campaign or cycle and not this 2026 election. Include an item when its note, year or link points to a race or gift before 2025 (for example "endorsed in 2022", "gave in 2020", a 2024 primary, a link dated 2022). Leave out items that are for 2026 or that give no sign of an earlier race. Example: ["endorsements:2"] or [].',
        '',
        items.map(x => x.id + ' | ' + String(x.it.org || x.it.name || '') + ' | ' + (x.it.rating ? 'rating: ' + x.it.rating + ' | ' : '') + (x.it.amount ? 'amount: ' + x.it.amount + ' | ' : '') + 'year: ' + String(x.it.year || '') + ' | ' + String(x.it.note || '') + ' | ' + String(x.it.url || '')).join('\n')
      ].join('\n') }]
    });
    const m = String(text || '').match(/\[[^\]]*\]/);
    (m ? JSON.parse(m[0]) : []).filter(x => typeof x === 'string').forEach(x => drop.add(x));
  }
  if (!drop.size) return result;
  for (const [label, get, set] of L) {
    const list = get();
    if (!Array.isArray(list)) continue;
    set(list.filter((it, i) => drop.has(label + ':' + i) ? (prior.push({ ...it, list: label }), false) : true));
  }
  result.priorCycle = (Array.isArray(result.priorCycle) ? result.priorCycle : []).concat(prior);
  return result;
}

// Ballot measures: a group's position on an earlier version or earlier election is not support or
// opposition this time. Those move out of the lists into priorPositions (not shown).
// Bump to re-check every cached measure.
const MEASURE_VERSION = 1;
async function dropPriorElection(env, result) {
  const lists = [['supporters', result.supporters], ['opponents', result.opponents]];
  if (result.financing) lists.push(['financing.support', result.financing.support], ['financing.oppose', result.financing.oppose]);
  const items = [];
  for (const [label, list] of lists) if (Array.isArray(list)) list.forEach((it, i) => items.push({ id: label + ':' + i, it }));
  if (!items.length) return result;
  const text = await callAnthropic(env, {
    model: MODEL,
    max_tokens: 1000,
    temperature: 0,
    messages: [{ role: 'user', content: [
      'Each item below is listed as a supporter, opponent, or funder of a ballot measure in the CURRENT election. Some actually describe a position on an earlier version of the measure or an earlier election (for example "2022 precedent only", "opposed the 2022 version", "no position found for 2026").',
      'Return ONLY a JSON array of the ids of items whose position is about an earlier election or version and not this one. If unclear, leave it out. Example: ["opponents:0"] or [].',
      '',
      items.map(x => x.id + ' | ' + String(x.it && (x.it.name || x.it.org) || '') + ' | ' + String(x.it && x.it.note || '')).join('\n')
    ].join('\n') }]
  });
  const m = String(text || '').match(/\[[^\]]*\]/);
  const ids = new Set(m ? JSON.parse(m[0]).filter(x => typeof x === 'string') : []);
  if (!ids.size) return result;
  const prior = [];
  const prune = (label, list) => Array.isArray(list) ? list.filter((it, i) => ids.has(label + ':' + i) ? (prior.push(it), false) : true) : list;
  result.supporters = prune('supporters', result.supporters);
  result.opponents = prune('opponents', result.opponents);
  if (result.financing) {
    result.financing.support = prune('financing.support', result.financing.support);
    result.financing.oppose = prune('financing.oppose', result.financing.oppose);
  }
  result.priorPositions = (Array.isArray(result.priorPositions) ? result.priorPositions : []).concat(prior);
  return result;
}

// Bump when the FEC donor logic changes. Cached federal results from an older version get their
// donor list rebuilt from FEC on next read: free API, no AI call, no rate-limit cost.
const FEC_DATA_VERSION = 4;
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

// Find a candidate's FEC record. Returns { cand } or { cand: null, notRegistered: true } when both
// the full-name and last-name searches came back empty, or null on an API error or ambiguity.
async function fecFindCandidate(env, name, officeCode) {
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
    if (fallbackHits === 0) return { cand: null, notRegistered: true };
    return null;
  }
  return { cand };
}

// Outside spending: money groups spend on their own ads, mail and texts for or against a federal
// candidate (independent expenditures). It never goes to the campaign. Regular FEC reports lag,
// so spending reported in 24/48-hour notices after a group's latest regular report is added on;
// notices dated on or before that report are skipped because the report already includes them.
// Bump to rebuild every cached federal result's outside spending (free API, no AI cost).
const OUTSIDE_VERSION = 2;
const FEC_COMMITTEE_KIND = { O: 'super PAC', U: 'super PAC', V: 'hybrid PAC', W: 'hybrid PAC', I: 'outside group',
  N: 'PAC', Q: 'PAC', X: 'party committee', Y: 'party committee', Z: 'party committee' };
async function fecOutsideSpending(env, name, officeCode) {
  const apiKey = env.FEC_API_KEY || 'DEMO_KEY';
  const base = 'https://api.open.fec.gov/v1';
  const y = new Date().getFullYear();
  const cycle = y + (y % 2 === 0 ? 0 : 1);
  const found = await fecFindCandidate(env, name, officeCode);
  if (!found) return null;
  if (!found.cand) return { support: [], oppose: [], source: 'FEC',
    note: 'Not registered with the FEC for this race, so no outside spending is reported for this candidate.' };
  const cid = found.cand.candidate_id;

  async function pages(notice) {
    let rows = [], extra = {};
    for (let i = 0; i < 5; i++) {
      const q = new URLSearchParams({ candidate_id: cid, cycle: String(cycle), is_notice: String(notice), most_recent: 'true',
        per_page: '100', sort: '-expenditure_date', api_key: apiKey, ...extra });
      const r = await fetch(base + '/schedules/schedule_e/?' + q);
      if (!r.ok) throw new Error('FEC schedule_e ' + r.status);
      const j = await r.json();
      const got = j.results || [];
      rows = rows.concat(got);
      const li = j.pagination && j.pagination.last_indexes;
      if (!got.length || !li || rows.length >= ((j.pagination && j.pagination.count) || 0)) break;
      extra = li;
    }
    return rows;
  }
  const regular = await pages(false);
  const notices = await pages(true);

  const agg = {}, cutoff = {};
  const add = (r, amt) => {
    const ind = r.support_oppose_indicator === 'O' ? 'O' : 'S';
    const k = r.committee_id + '|' + ind;
    if (!agg[k]) agg[k] = { id: r.committee_id, ind, name: (r.committee && r.committee.name) || r.committee_name || r.committee_id, amount: 0, cats: {} };
    agg[k].amount += amt;
    const c = spendCategory(r.expenditure_description, r.category_code_full);
    agg[k].cats[c] = (agg[k].cats[c] || 0) + amt;
  };
  for (const r of regular) {
    if (r.memo_code === 'X' || !r.committee_id) continue;
    add(r, r.expenditure_amount || 0);
    const d = r.expenditure_date || r.dissemination_date || '';
    if (!cutoff[r.committee_id] || d > cutoff[r.committee_id]) cutoff[r.committee_id] = d;
  }
  for (const r of notices) {
    if (r.memo_code === 'X' || !r.committee_id) continue;
    const d = r.expenditure_date || r.dissemination_date || '';
    if (cutoff[r.committee_id] && d && d <= cutoff[r.committee_id]) continue;
    add(r, r.expenditure_amount || 0);
  }

  // Under $1,000 is usually a stray line item, not a campaign; leave it out to keep the list readable.
  const list = Object.values(agg).filter(a => a.amount >= 1000).sort((a, b) => b.amount - a.amount);
  const ids = [...new Set(list.slice(0, 20).map(a => a.id))].filter(id => /^C\d{8}$/.test(id));
  const reg = {};
  if (ids.length) {
    try {
      const cr = await fetch(base + '/committees/?' + ids.map(id => 'committee_id=' + id).join('&') + '&per_page=20&api_key=' + apiKey);
      if (cr.ok) for (const c of ((await cr.json()).results || [])) reg[c.committee_id] = c;
    } catch (e) { console.log('FEC committee lookup error: ' + e.message); }
  }
  const toItem = a => {
    const c = reg[a.id];
    const t = c && c.committee_type;
    // Form 5 filers (IDs starting C9, or committee type I) are outside groups, often nonprofits,
    // that do not have to list who funds them. Registered PACs and super PACs do.
    const hidden = /^C9/.test(a.id) || t === 'I';
    const item = {
      name: (c && c.name) || a.name,
      amount: '$' + Math.round(a.amount).toLocaleString('en-US'),
      kind: hidden ? 'outside group' : (FEC_COMMITTEE_KIND[t] || 'PAC'),
      url: 'https://www.fec.gov/data/committee/' + a.id + '/',
      fecId: a.id
    };
    if (hidden) item.disclosure = 'not_disclosed';
    else item.donorsUrl = 'https://www.fec.gov/data/receipts/?committee_id=' + a.id;
    // What the money bought in this race: top 3 kinds of spending by share
    item.bought = Object.entries(a.cats).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]).slice(0, 3)
      .map(([c, v]) => ({ c, p: Math.max(1, Math.round(100 * v / a.amount)) }));
    return item;
  };
  return {
    support: list.filter(a => a.ind === 'S').slice(0, 8).map(toItem),
    oppose: list.filter(a => a.ind === 'O').slice(0, 8).map(toItem),
    source: 'FEC',
    listUrl: 'https://www.fec.gov/data/independent-expenditures/?candidate_id=' + cid + '&cycle=' + cycle,
    note: list.length
      ? 'Independent spending reported to the FEC this election cycle, including recent 24- and 48-hour notices. Totals can lag the newest filings.'
      : 'No outside spending for or against this candidate has been reported to the FEC this election cycle.'
  };
}

// Sort a spending line into a kind voters recognize, from its FEC description.
function spendCategory(desc, cat) {
  const d = String((desc || '') + ' ' + (cat || '')).toLowerCase();
  if (/\b(tv|television|broadcast|cable|airtime|ott|ctv|streaming|video production)\b/.test(d)) return 'tv';
  if (/\b(digital|online|internet|social|facebook|meta|google|youtube|programmatic|web|email)\b/.test(d)) return 'digital';
  if (/\b(mail|mailer|mailers|postage|printing|print)\b/.test(d)) return 'mail';
  if (/\b(text|texts|texting|sms|p2p|peer to peer)\b/.test(d)) return 'text';
  if (/\b(phone|phones|call|calls|ivr|robocall|telephone)\b/.test(d)) return 'phone';
  if (/\b(canvass\w*|field|door|doors|walk\w*|gotv|voter contact|organizing)\b/.test(d)) return 'canvass';
  if (/\b(radio|audio|podcast)\b/.test(d)) return 'radio';
  if (/\b(media|advertis\w*|ad buy|ads|placement)\b/.test(d)) return 'ads';
  return 'other';
}

// Facts about one outside group, from its own FEC filings, shared across every race it shows up in.
// Fetched by the page when it shows outside spending, cached for a week. No AI.
//   lean     which party its spending helped, computed from its own itemized spending this cycle
//   formed   when it first filed with the FEC
//   totals   money raised and spent on outside spending nationally, as of its latest report
//   funders  its top donors, with "donors not disclosed" on nonprofit funders (IRS data via ProPublica)
const GROUP_VERSION = 5;
const LIMIT_GROUP_PER_DAY = 200;
async function handleFecGroup(url, request, env) {
  const id = String(url.searchParams.get('id') || '');
  if (!/^C\d{8}$/.test(id)) return json({ error: 'Bad committee id' }, 400);
  const key = 'fecg' + GROUP_VERSION + ':' + id;
  const hit = await env.CACHE.get(key, 'json');
  if (hit) return json({ group: hit, cached: true });
  if (!(await rateLimit(env, 'group', clientIP(request), LIMIT_GROUP_PER_DAY))) return json({ error: 'Daily limit reached' }, 429);
  try {
    const g = await fecGroupProfile(env, id);
    if (g) await env.CACHE.put(key, JSON.stringify(g), { expirationTtl: CACHE_TTL });
    return json({ group: g, cached: false });
  } catch (e) {
    console.log('fec group ' + id + ' error: ' + e.message);
    return json({ error: 'FEC lookup failed' }, 502);
  }
}

// "About this group" for any organization in a money list.
//   ?fec=C12345678  a federal committee: its FEC profile (funders, lean, totals...)
//   ?name=...       anything else: an exact-name FEC committee match, else an exact-name IRS
//                   nonprofit match (501(c)(4)/(5)/(6)), else a business with links to search
//                   public records. Exact matches only, so a group is never confused with another.
// Cached a week, shared by everyone. Search links are always included.
const ORG_VERSION = 5;
function orgSearchLinks(name) {
  const plain = String(name || '').replace(/\s*\(.*\)\s*$/, '').trim();
  const bare = plain.replace(/[,\s]*\b(l\.?\s?l\.?\s?c\.?|inc\.?|corp\.?|corporation|co\.?)\s*$/i, '').trim() || plain;
  return [
    { k: 'sunbiz', url: 'https://search.sunbiz.org/Inquiry/CorporationSearch/SearchResults?inquiryType=EntityName&searchTerm=' + encodeURIComponent(bare) },
    { k: 'irs', url: 'https://projects.propublica.org/nonprofits/search?q=' + encodeURIComponent(bare) },
    { k: 'fec', url: 'https://www.fec.gov/data/committees/?q=' + encodeURIComponent(bare) }
  ];
}
async function handleOrg(url, request, env) {
  const fec = String(url.searchParams.get('fec') || '');
  const name = String(url.searchParams.get('name') || '').slice(0, 200).trim();
  if (fec) {
    if (!/^C\d{8}$/.test(fec)) return json({ error: 'Bad committee id' }, 400);
    const gk = 'fecg' + GROUP_VERSION + ':' + fec;
    let g = await env.CACHE.get(gk, 'json');
    if (!g) {
      if (!(await rateLimit(env, 'group', clientIP(request), LIMIT_GROUP_PER_DAY))) return json({ error: 'Daily limit reached' }, 429);
      try { g = await fecGroupProfile(env, fec); } catch (e) { console.log('org fec ' + fec + ': ' + e.message); return json({ error: 'FEC lookup failed' }, 502); }
      if (g) await env.CACHE.put(gk, JSON.stringify(g), { expirationTtl: CACHE_TTL });
    }
    return json({ org: { type: 'fec', group: g, links: orgSearchLinks(g && g.name) } });
  }
  if (!name) return json({ error: 'Missing name' }, 400);
  const key = 'org' + ORG_VERSION + ':' + (await sha256(normOrg(name) || normPart(name)));
  const hit = await env.CACHE.get(key, 'json');
  if (hit) return json({ org: hit, cached: true });
  if (!(await rateLimit(env, 'group', clientIP(request), LIMIT_GROUP_PER_DAY))) return json({ error: 'Daily limit reached' }, 429);

  const out = { type: 'none', name, links: orgSearchLinks(name) };
  const want = normOrg(name);
  try {
    // A federal committee with exactly this name?
    const apiKey = env.FEC_API_KEY || 'DEMO_KEY';
    const r = await fetch('https://api.open.fec.gov/v1/committees/?q=' + encodeURIComponent(name.replace(/\s*\(.*\)\s*$/, '')) + '&per_page=20&api_key=' + apiKey);
    if (r.ok) {
      const c = ((await r.json()).results || []).find(x => normOrg(x.name) === want);
      if (c) {
        const gk = 'fecg' + GROUP_VERSION + ':' + c.committee_id;
        let g = await env.CACHE.get(gk, 'json');
        if (!g) { g = await fecGroupProfile(env, c.committee_id); if (g) await env.CACHE.put(gk, JSON.stringify(g), { expirationTtl: CACHE_TTL }); }
        if (g) { out.type = 'fec'; out.group = g; }
      }
    }
  } catch (e) { console.log('org fec search ' + name + ': ' + e.message); }
  if (out.type === 'none') {
    try {
      const fl = await flCommittee(env, name);
      if (fl && fl.error) out.flErr = fl.error;
      else if (fl && /closed/i.test(fl.status || '') && !fl.gifts && /\b(inc|incorporated|corp|corporation|company|co|llc|l\.l\.c|lp|llp|ltd)\b\.?\s*$/i.test(name)) { /* old committee, not this company */ }
      else if (fl) { out.type = 'flc'; out.flc = fl; }
    } catch (e) { out.flErr = 'error'; console.log('org fl committee ' + name + ': ' + e.message); }
  }
  if (out.type === 'none') {
    try {
      const o = await findNonprofit(name);
      if (o) { out.type = 'nonprofit'; out.nonprofit = { ...(await nonprofitDetails(env, o.ein)), subsection: o.subseccd }; }
    } catch (e) { console.log('org nonprofit ' + name + ': ' + e.message); }
  }
  if (out.type === 'none' && /\b(l\.?\s?l\.?\s?c|inc|corp|corporation|company|co|lp|llp|holdings|group|partners|enterprises|ventures)\b\.?/i.test(name)) out.type = 'business';
  await env.CACHE.put(key, JSON.stringify(out), { expirationTtl: out.flErr ? 3600 : CACHE_TTL });
  return json({ org: out, cached: false });
}

// Florida political committees (state PACs, ECOs, CCEs) aren't in FEC or IRS data. The Florida
// Division of Elections committee database has their officers and every contribution they report.
// Exact-name match only; if two committees share the exact name and neither is uniquely active,
// nothing is shown. Cached a week. If the state site doesn't answer, the panel keeps its search links.
const FLC_VERSION = 5;
const FL_SINCE = '2025-01-01';   // funders and totals cover the 2025-2026 cycle only
const FL_BASE = 'https://dos.elections.myflorida.com';
async function flCommittee(env, name) {
  const want = normOrg(name);
  if (!want) return null;
  const key = 'flc' + FLC_VERSION + ':' + (await sha256(want));
  const hit = await env.CACHE.get(key, 'json');
  if (hit) return hit.none ? (hit.err ? { error: hit.err } : null) : hit;
  // The state's site is an older server that expects ordinary browser headers.
  const H = { 'User-Agent': 'Mozilla/5.0 (compatible; ballot305.org nonpartisan voter guide; +https://github.com/Brittybrit/vote-informed)',
    'Accept': 'text/html,application/xhtml+xml,text/plain,*/*', 'Accept-Language': 'en-US,en;q=0.9' };
  const form = (o, ref) => ({ method: 'POST', headers: { ...H, 'Content-Type': 'application/x-www-form-urlencoded', 'Origin': FL_BASE, 'Referer': FL_BASE + ref }, body: new URLSearchParams(o) });
  const short = String(name).replace(/\s*\(.*\)\s*$/, '').trim().slice(0, 30);
  let out = null;
  const lr = await fetch(FL_BASE + '/committees/ComLkupByName.asp', form({ searchtype: '1', comName: short, LkupTypeName: 'L', NameSearchBtn: 'Search by Name' }, '/committees/'));
  if (!lr.ok) {
    // the lookup itself failed: say why, and don't remember "no match" for a week
    await env.CACHE.put(key, JSON.stringify({ none: true, err: 'lookup ' + lr.status }), { expirationTtl: 3600 });
    return { error: 'lookup ' + lr.status };
  }
  const lh = await lr.text();
  const matches = [...lh.matchAll(/href="?ComDetail\.asp\?account=(\d+)"?[^>]*>([^<]+)</gi)]
    .map(m => ({ account: m[1], name: decodeEntities(m[2]) })).filter(m => normOrg(m.name) === want);
  const details = [];
  for (const m of matches.slice(0, 4)) {
    const dr = await fetch(FL_BASE + '/committees/ComDetail.asp?account=' + m.account, { headers: { ...H, 'Referer': FL_BASE + '/committees/ComLkupByName.asp' } });
    if (!dr.ok) continue;
    const html = await dr.text();
    // Each field is a row: <b>Label:</b></td> <td>value<br>more lines</td>
    const cell = (label) => { const r = new RegExp('<b>\\s*' + label + ':\\s*</b>\\s*</td>\\s*<td[^>]*>([\\s\\S]*?)</td>', 'i').exec(html); return r ? r[1] : ''; };
    const lines = (label) => cell(label).split(/<br\s*\/?>/i).map(decodeEntities).filter(Boolean);
    const addrLines = lines('Address');
    const cityLine = addrLines.find(l => /,\s*[A-Z]{2}\s+\d{5}/.test(l)) || '';
    const cityM = cityLine.match(/^(.+?),\s*([A-Z]{2})\s+\d{5}/);
    details.push({
      account: m.account, name: m.name,
      type: lines('Type')[0] || '', status: lines('Status')[0] || '',
      city: cityM ? cityM[1].trim() : '', state: cityM ? cityM[2] : '',
      chair: lines('Chairperson')[0] || '',
      treasurer: lines('Treasurer')[0] || '',
      agent: lines('Registered Agent')[0] || '',
      url: FL_BASE + '/committees/ComDetail.asp?account=' + m.account,
      docsUrl: FL_BASE + '/campaign-docs/?account=' + m.account
    });
  }
  if (matches.length && !details.length) {
    await env.CACHE.put(key, JSON.stringify({ none: true, err: 'detail page' }), { expirationTtl: 3600 });
    return { error: 'detail page' };
  }
  let pick = details.length === 1 ? details[0] : null;
  if (!pick && details.length > 1) { const act = details.filter(d => /active/i.test(d.status)); if (act.length === 1) pick = act[0]; }
  if (pick) {
    out = pick;
    try {
      const cr = await fetch(FL_BASE + '/cgi-bin/contrib.exe', form({ election: 'All', search_on: '4', CanFName: '', CanLName: '', CanNameSrch: '2', office: 'All', cdistrict: '', cgroup: '', party: 'All',
        ComName: short, ComNameSrch: '2', committee: 'All', cfname: '', clname: '', namesearch: '2', ccity: '', cstate: '', czipcode: '', coccupation: '',
        cdollar_minimum: '', cdollar_maximum: '', rowlimit: '3000', csort1: 'AMT', csort2: 'DAT', cdatefrom: '01/01/2025', cdateto: '', queryformat: '2', Submit: 'Submit' }, '/campaign-finance/contributions/'));
      const tsv = cr.ok ? await cr.text() : '';
      const agg = {}; let total = 0, n = 0, from = '', to = '';
      for (const line of tsv.split(/\r?\n/).slice(1)) {
        const c = line.split('\t');
        if (c.length < 7) continue;
        if (normOrg(c[0].replace(/\s*\([^)]*\)\s*$/, '')) !== normOrg(pick.name)) continue;   // this committee only
        const amt = parseFloat(c[2]) || 0;
        if (amt <= 0) continue;
        const [mm, dd, yy] = String(c[1]).split('/');
        const iso = yy && mm && dd ? yy + '-' + mm + '-' + dd : '';
        if (!iso || iso < FL_SINCE) continue;   // 2025-2026 only, even if the date filter is ignored
        if (iso) { if (!from || iso < from) from = iso; if (!to || iso > to) to = iso; }
        total += amt; n++;
        const who = c[4].trim();
        if (!agg[who]) agg[who] = { amount: 0, occ: (c[7] || '').trim(), place: (c[6] || '').trim(), n: 0, first: iso, last: iso };
        agg[who].amount += amt; agg[who].n++;
        if (iso < agg[who].first) agg[who].first = iso;
        if (iso > agg[who].last) agg[who].last = iso;
      }
      out.raised = total || null; out.gifts = n; out.from = from; out.to = to; out.since = FL_SINCE;
      out.funders = Object.entries(agg).sort((a, b) => b[1].amount - a[1].amount).slice(0, 8).map(([who, v]) => {
        const looksOrg = /\b(inc|incorporated|llc|l\.l\.c|corp|corporation|co|company|pac|committee|fund|association|assn|group|partners|holdings|enterprises|union|party|trust|foundation|council|realtors|development|properties|management|ltd|lp|llp|pa|p\.a|markets?|supermarkets?|stores|insurance|construction|builders|realty|capital|ventures|services|solutions|systems|industries|international|associates|hospital|healthcare|energy|utilities|airlines|communications|bancorp)\b\.?/i.test(who);
        const isCommittee = /political committee|\bpac\b|committee|electioneering|party/i.test(v.occ);
        const org = looksOrg || isCommittee || /corporation|association|union|trust/i.test(v.occ);
        return { name: who, amount: '$' + Math.round(v.amount).toLocaleString('en-US'), type: isCommittee ? 'political committee' : org ? 'organization' : 'individual', occupation: org ? '' : v.occ, place: v.place,
          gifts: v.n, first: v.first, last: v.last };
      });
      markDisclosure({ donors: out.funders });
    } catch (e) { console.log('fl contributions ' + name + ': ' + e.message); }
  }
  await env.CACHE.put(key, JSON.stringify(out || { none: true }), { expirationTtl: CACHE_TTL });
  return out;
}

// Florida state-filed candidates (Governor, Cabinet, Legislature, State Attorney, Public Defender,
// judges): donors straight from the Florida Division of Elections, like FEC data for federal races.
// Web search can find a candidate's state filing page but can't read the contributions inside it.
// No AI, refreshed at most daily. County and city races file with the county, not the state.
const FL_DONOR_VERSION = 1;
function flOfficeQuery(office) {
  const o = String(office || '');
  const d = (o.match(/District\s+(\d+)/i) || [])[1] || '';
  if (/^Governor/i.test(o)) return { office: 'GOV' };
  if (/^Attorney General/i.test(o)) return { office: 'ATG' };
  if (/^Chief Financial Officer/i.test(o)) return { office: 'CFO' };
  if (/^Commissioner of Agriculture/i.test(o)) return { office: 'AGR' };
  if (/^State Senator/i.test(o) && d) return { office: 'STS', cdistrict: d };
  if (/^State Representative/i.test(o) && d) return { office: 'STR', cdistrict: d };
  if (/^State Attorney/i.test(o)) return { office: 'STA', cdistrict: (o.match(/(\d+)(st|nd|rd|th)\s+Judicial Circuit/i) || [])[1] || '' };
  if (/^Public Defender/i.test(o)) return { office: 'PUB', cdistrict: (o.match(/(\d+)(st|nd|rd|th)\s+Judicial Circuit/i) || [])[1] || '' };
  if (/^Circuit Judge/i.test(o)) return { office: 'CTJ', cdistrict: (o.match(/(\d+)(st|nd|rd|th)\s+Judicial Circuit/i) || [])[1] || '', cgroup: (o.match(/Group\s+(\d+)/i) || [])[1] || '' };
  if (/District Court of Appeal/i.test(o)) return { office: 'DCA' };
  if (/Justice of the Supreme Court/i.test(o)) return { office: 'SCJ' };
  return null;
}
function flNameParts(name) {
  const first = String(name || '').split(/\s+and\s+/i)[0]                 // "Byron Donalds and Bryan Avila" -> Byron Donalds
    .replace(/["“”][^"“”]*["“”]/g, ' ')                           // nicknames in quotes
    .replace(/,?\s+\b(jr|sr|ii|iii|iv)\.?$/i, '').trim();
  const parts = normPart(first).split(' ').filter(Boolean);
  return parts.length >= 2 ? { first: parts[0], last: parts[parts.length - 1] } : null;
}
async function flCandidateDonors(env, name, office) {
  const q = flOfficeQuery(office), np = flNameParts(name);
  if (!q || !np) return null;
  const H = { 'User-Agent': 'Mozilla/5.0 (compatible; ballot305.org nonpartisan voter guide; +https://github.com/Brittybrit/vote-informed)',
    'Accept': 'text/html,text/plain,*/*', 'Content-Type': 'application/x-www-form-urlencoded',
    'Origin': FL_BASE, 'Referer': FL_BASE + '/campaign-finance/contributions/' };
  const y = new Date().getFullYear();
  const body = new URLSearchParams({ election: '20261103-GEN', search_on: '2', CanFName: np.first, CanLName: np.last, CanNameSrch: '2',
    office: q.office, cdistrict: q.cdistrict || '', cgroup: q.cgroup || '', party: 'All', ComName: '', ComNameSrch: '2', committee: 'All',
    cfname: '', clname: '', namesearch: '2', ccity: '', cstate: '', czipcode: '', coccupation: '', cdollar_minimum: '', cdollar_maximum: '',
    rowlimit: '5000', csort1: 'AMT', csort2: 'DAT', cdatefrom: '', cdateto: '', queryformat: '2', Submit: 'Submit' });
  const r = await fetch(FL_BASE + '/cgi-bin/contrib.exe', { method: 'POST', headers: H, body });
  if (!r.ok) throw new Error('FL contributions ' + r.status);
  const tsv = await r.text();
  const agg = {}; let total = 0, n = 0, to = '';
  for (const line of tsv.split(/\r?\n/).slice(1)) {
    const c = line.split('\t');
    if (c.length < 7) continue;
    // "Lavin, George  (DEM)(STS)": same last name, first name starts the same
    const who = c[0].replace(/\s*\([^)]*\)/g, '').split(',');
    if (normPart(who[0]) !== np.last || !normPart(who[1] || '').startsWith(np.first)) continue;
    const amt = parseFloat(c[2]) || 0;
    if (amt <= 0) continue;
    const [mm, dd, yy] = String(c[1]).split('/');
    const iso = yy && mm && dd ? yy + '-' + mm + '-' + dd : '';
    if (iso && iso > to) to = iso;
    total += amt; n++;
    const giver = c[4].trim();
    if (!agg[giver]) agg[giver] = { amount: 0, occ: (c[7] || '').trim(), kinds: new Set() };
    agg[giver].amount += amt;
    agg[giver].kinds.add(c[3]);
  }
  if (!n) return { donors: [], count: 0 };
  const sorted = Object.entries(agg).sort((a, b) => b[1].amount - a[1].amount);
  const ties = tieNote(sorted.map(e => e[1].amount), 8);
  const donors = sorted.slice(0, 8).map(([giver, v]) => {
    const occ = v.occ;
    const self = /^candidate$/i.test(occ) || (normPart(giver).includes(np.last) && normPart(giver).includes(np.first));
    const party = /\b(party|executive committee)\b/i.test(giver + ' ' + occ);
    const committee = /political committee|\bpac\b|committee|electioneering/i.test(giver + ' ' + occ);
    const org = /\b(inc|incorporated|llc|l\.l\.c|corp|corporation|co|company|association|assn|union|trust|group|partners|holdings|ltd|lp|llp|pa|p\.a)\b\.?/i.test(giver);
    const type = self ? 'self-funded' : party ? 'party committee' : committee ? 'PAC' : org ? 'corporation' : 'individual';
    const loan = v.kinds.has('LOA'), inkind = v.kinds.has('INK') && v.kinds.size === 1;
    return { name: giver + (type === 'individual' && occ ? ' (' + occ + ')' : ''), amount: '$' + Math.round(v.amount).toLocaleString('en-US'), type,
      ...(loan ? { note: 'includes loans' } : inkind ? { note: 'in-kind (goods or services, not cash)' } : {}) };
  });
  return { donors, count: n, total, to, ties };
}
// Miami-Dade County and Community Council, School Board, county judge and other county-filed
// candidates: donors from the county's campaign finance system (VoterFocus). Each amended report
// deletes ("D") lines and adds ("A") corrected ones; applying those to the original lines matches the
// county's own published totals to the cent. No AI, refreshed at most daily.
const MDC_DONOR_VERSION = 2;
// Cities whose clerks use the same VoterFocus system, under their own code, with the id of the
// Nov 3, 2026 election in it. Other cities publish PDFs or nothing, so their races keep web research.
// Update the election ids each cycle.
const VF_CITIES = [
  [/^\s*coral gables\b/i, 'muncoralgables', 8, 'City of Coral Gables'],
  [/^\s*cutler bay\b/i, 'muncutlerbay', 6, 'Town of Cutler Bay'],
  [/^\s*doral\b/i, 'mundoral', 9, 'City of Doral'],
  [/^\s*hialeah\b(?!\s+gardens)/i, 'munhialeah', 4, 'City of Hialeah'],
];
function vfJurisdiction(office) {
  for (const [re, c, el, label] of VF_CITIES) if (re.test(String(office || ''))) return { c, el, label, city: true };
  return { c: 'miamidade', el: null, label: 'Miami-Dade Elections Department', city: false };
}
const VF = 'https://www.voterfocus.com/CampaignFinance/';
const VF_H = { 'User-Agent': 'Mozilla/5.0 (compatible; ballot305.org nonpartisan voter guide; +https://github.com/Brittybrit/vote-informed)', 'Accept': 'text/html,text/csv,*/*' };
function parseCSV(s) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
async function mdcCandidateList(env, j) {
  j = j || vfJurisdiction('');
  const key = 'mdcl' + MDC_DONOR_VERSION + ':' + j.c;
  const hit = await env.CACHE.get(key, 'json');
  if (hit) return hit;
  const r = await fetch(VF + 'candidate_pr.php?' + (j.el ? 'el=' + j.el + '&' : '') + 'c=' + j.c, { headers: VF_H });
  if (!r.ok) throw new Error('VoterFocus list ' + j.c + ' ' + r.status);
  const html = await r.text();
  const out = [];
  // "Office: County Commission District 05" headers, each followed by that office's candidates.
  // A page without those headers is read as one block with no office.
  const parts = /Office:/.test(html) ? html.split(/Office:\s*/) : ['', '<' + html];
  const linkRe = new RegExp('candidate_pr\\.php\\?op=cv&(?:amp;)?e=(\\d+)&(?:amp;)?c=' + j.c + '&(?:amp;)?ca=(\\d+)[^"]*"[^>]*>([\\s\\S]*?)<\\/a>', 'g');
  for (let i = 1; i < parts.length; i++) {
    const office = decodeEntities(parts[i].split('<')[0]);
    for (const m of parts[i].matchAll(linkRe)) {
      if (j.el && m[1] !== String(j.el)) continue;   // another election listed on the same page
      // the link wraps the whole row ("Vicki L. Lopez (NOP) status (...) Contributions ..."): keep the name
      const nm = decodeEntities(m[3]).split(/\s*\((?:NOP|NPA|REP|DEM|LPF|GRE|IND|[A-Z]{2,4})\)/)[0].trim();
      if (nm) out.push({ office, e: m[1], ca: m[2], name: nm });
    }
  }
  if (out.length) await env.CACHE.put(key, JSON.stringify(out), { expirationTtl: 6 * 3600 });
  return out;
}
async function mdcCandidateDonors(env, name, office) {
  const np = flNameParts(name);
  if (!np) return null;
  const j = vfJurisdiction(office);
  const list = await mdcCandidateList(env, j);
  let hits = list.filter(c => { const p = flNameParts(c.name); return p && p.last === np.last && p.first === np.first; });
  if (hits.length > 1) {   // same name in two races: use the district or group number
    const num = (String(office).match(/(?:District|Group|Seat)\s+(\d+)/i) || [])[1];
    if (num) hits = hits.filter(c => (String(c.office).match(/(\d+)\s*$/) || [])[1] && parseInt(c.office.match(/(\d+)\s*$/)[1], 10) === parseInt(num, 10));
  }
  if (hits.length !== 1) return null;
  const c = hits[0];
  const r = await fetch(VF + 'export.php?op=CFINANCE&cand_id=' + c.ca + '&dhc=0&county=' + j.c, { headers: VF_H });
  if (!r.ok) throw new Error('county export ' + r.status);
  const rows = parseCSV(await r.text()).slice(1).filter(x => x[3] === 'C');
  const k = x => x[2] + '|' + normPart(x[4]) + '|' + (parseFloat(x[14]) || 0).toFixed(2);
  const bag = new Map();
  const put = (x, n) => { const key = k(x); const cur = bag.get(key) || { x, n: 0 }; cur.n += n; bag.set(key, cur); };
  rows.filter(x => !x[15]).forEach(x => put(x, 1));
  rows.filter(x => x[15] === 'D').forEach(x => put(x, -1));
  rows.filter(x => x[15] === 'A').forEach(x => put(x, 1));
  const agg = {}; let monetary = 0, inkind = 0, count = 0, to = '';
  for (const { x, n } of bag.values()) {
    if (n <= 0) continue;
    const amt = (parseFloat(x[14]) || 0) * n;
    const ik = /^(IK|INK)$/i.test(x[12]);
    if (ik) inkind += amt; else monetary += amt;
    count += n;
    if (x[2] > to) to = x[2];
    const who = String(x[4]).replace(/\s+/g, ' ').trim();
    const id = normPart(who);
    if (!agg[id]) agg[id] = { name: who, amount: 0, t: x[10], occ: decodeEntities(String(x[11]).replace(/<br>/gi, ' ')), ik: 0 };
    agg[id].amount += amt;
    if (ik) agg[id].ik += amt;
  }
  const sorted = Object.values(agg).filter(v => v.amount > 0).sort((a, b) => b.amount - a.amount);
  const ties = tieNote(sorted.map(v => v.amount), 8);
  const donors = sorted.slice(0, 8).map(v => {
    const looksCommittee = /committee|\bpac\b|\bpc\b|political|for better|floridians for|friends of|party/i.test(v.name + ' ' + v.occ);
    const type = v.t === 'S' ? 'self-funded' : v.t === 'F' ? 'PAC' : v.t === 'B' ? (/union/i.test(v.occ) ? 'union' : 'corporation') : v.t === 'I' ? 'individual' : looksCommittee ? 'PAC' : 'other';
    return { name: v.name + (type === 'individual' && v.occ ? ' (' + v.occ + ')' : ''), amount: '$' + Math.round(v.amount).toLocaleString('en-US'), type,
      ...(v.ik && v.ik === v.amount ? { note: 'in-kind (goods or services, not cash)' } : {}) };
  });
  return { donors, monetary, inkind, count, to, ties, office: c.office || office, filer: j.label,
    url: VF + 'candidate_pr.php?op=cv&e=' + c.e + '&c=' + j.c + '&ca=' + c.ca + '&rellevel=3&committee=N' };
}
async function refreshMdcDonors(env, result, name, office, officeCode) {
  if (officeCode || flOfficeQuery(office) || evJurisdiction(office)) return false;   // federal, state and EasyVote-city races have their own sources
  const fresh = result.mdcV === MDC_DONOR_VERSION && result.mdcAt && Date.now() - result.mdcAt < 24 * 3600 * 1000;
  if (fresh) return false;
  try {
    const d = await mdcCandidateDonors(env, name, office);
    result.mdcV = MDC_DONOR_VERSION;
    result.mdcAt = Date.now();
    if (d && d.count) {
      result.donors = d.donors;
      result.donorDataNote = 'Contributions reported to the ' + d.filer + ' for ' + d.office + ': $' +
        Math.round(d.monetary).toLocaleString('en-US') + ' in money' + (d.inkind ? ' and $' + Math.round(d.inkind).toLocaleString('en-US') + ' in-kind' : '') +
        ' from ' + d.count + ' contributions, through ' + d.to + ', with amended reports applied. Top givers shown.' + (d.ties || '') + ' Money to allied political committees is listed separately.';
      result.donorListUrl = d.url;
      result.donorSource = 'MDC';
    }
    return true;
  } catch (e) { console.log('county donors ' + name + ': ' + e.message); return false; }
}

// Cities whose clerks use EasyVote Campaign Finance (Miami Gardens, Sunny Isles Beach, North Miami,
// Key Biscayne, Palmetto Bay, Opa-locka).
// Its public API (the one the clerk's own portal calls) lists each filer's reports and every itemized
// contribution, with the report it came from, so every donor links to the report PDF that lists the
// gift. Only electronically filed reports are
// itemized; a candidate who uploaded scans has no rows and keeps web research. The customer id is in
// the portal's own requests (ecf-api.easyvoteapp.com/.../<id>). Refreshed at most daily, no AI.
const EV_DONOR_VERSION = 3;
const EV_API = 'https://ecf-api.easyvoteapp.com';
const EV_CITIES = [
  [/^\s*miami gardens\b/i, 'A7993568-4476-4576-83AC-1581F689A3A4', 'https://cityofmiamigardensfl.easyvotecampaignfinance.com', 'City of Miami Gardens'],
  [/^\s*sunny isles beach\b/i, 'C77027F3-DE8A-4968-BE87-BE0DAD8A8EE7', 'https://cityofsunnyislesbeachfl.easyvotecampaignfinance.com', 'City of Sunny Isles Beach'],
  [/^\s*north miami\b(?!\s+beach)/i, '01C43AD2-766F-46FF-BA86-42000C4740FF', 'https://northmiamifl.easyvotecampaignfinance.com', 'City of North Miami'],
  [/^\s*key biscayne\b/i, 'A25B1BF8-F262-47F8-920B-D0BB0628A195', 'https://villageofkeybiscaynefl.easyvotecampaignfinance.com', 'Village of Key Biscayne'],
  [/^\s*palmetto bay\b/i, '8E016AC8-E7ED-4667-A8D9-5A9374FAEEEE', 'https://villageofpalmettobayfl.easyvotecampaignfinance.com', 'Village of Palmetto Bay'],
  [/^\s*opa-?\s*locka\b/i, '33D4780F-AF9C-4E37-927B-B24D7A9FDD03', 'https://cityofopalockafl.easyvotecampaignfinance.com', 'City of Opa-locka'],
];
function evJurisdiction(office) {
  for (const [re, id, portal, label] of EV_CITIES) if (re.test(String(office || ''))) return { id, portal, label };
  return null;
}
const evDocUrl = id => EV_API + '/documents/' + id + '/viewfinalredactedpdf';
// "Seat 4", "District 2", "Mayor": the part of the office both the ballot and the clerk agree on
function evSeat(office) {
  const o = String(office || '');
  const m = o.match(/\b(Seat|District)\s+(\d+)/i);
  return m ? m[1].toLowerCase() + ' ' + parseInt(m[2], 10) : /\bmayor\b/i.test(o) ? 'mayor' : '';
}
async function evCandidateDonors(env, name, office) {
  const j = evJurisdiction(office);
  if (!j) return null;
  const H = { 'User-Agent': VF_H['User-Agent'], 'Accept': 'application/json', 'Origin': j.portal, 'Referer': j.portal + '/' };
  const lk = 'evf' + EV_DONOR_VERSION + ':' + j.id;
  let filers = await env.CACHE.get(lk, 'json');
  if (!filers) {
    const r = await fetch(EV_API + '/filer/documentsearch/' + j.id, { headers: H });
    if (!r.ok) throw new Error('EasyVote filers ' + r.status);
    filers = (await r.json()).filter(f => /candidate|incumbent/i.test(f.filertype || ''));   // "Candidate", "2026 Candidate", "Candidate-2026", "Incumbent"
    if (filers.length) await env.CACHE.put(lk, JSON.stringify(filers), { expirationTtl: 6 * 3600 });
  }
  // Ballot "Rod Mack" is the clerk's "Mack, Roderick": same seat, every word of the clerk's last
  // name in the ballot name, and first names that start alike (Rod/Roderick, Steve/Steven).
  const seat = evSeat(office);
  const words = ' ' + normPart(String(name).replace(/["“”][^"“”]*["“”]/g, ' ')) + ' ';
  const first = words.trim().split(' ')[0] || '';
  const hits = filers.filter(f => {
    if (seat && evSeat(f.officename) !== seat) return false;
    const last = normPart(String(f.lastname || '').replace(/,?\s*\b(jr|sr|ii|iii|iv)\b\.?/gi, ''));
    if (!last || !last.split(' ').every(w => words.includes(' ' + w + ' '))) return false;
    const f1 = normPart(String(f.firstname || '').replace(/["“”].*$/, '')).split(' ')[0] || '';
    const k = Math.min(3, f1.length, first.length);
    return k > 0 && f1.slice(0, k) === first.slice(0, k);
  });
  if (hits.length !== 1) return null;
  const f = hits[0];
  // qualifying paperwork is not a finance report
  const docs = (f.documents || []).filter(d => d && d.documentid && !/qualif/i.test(d.documentname || ''));
  const latest = docs.slice().sort((a, b) => evDate(b.datesubmitted).localeCompare(evDate(a.datesubmitted)))[0];
  const out = { count: 0, filer: j.label, office: f.officename, portal: j.portal + '/home/publicfilings',
    latestUrl: latest ? evDocUrl(latest.documentid) : '', latestName: latest ? String(latest.documentname || '').trim() : '' };
  if (!docs.length) return out;
  const r = await fetch(EV_API + '/advancedsearch/contributions/' + j.id + '?recipientLastName=' + encodeURIComponent(f.lastname), { headers: H });
  if (!r.ok) throw new Error('EasyVote contributions ' + r.status);
  // The search also matches contributors with this last name, so keep only rows from this filer's reports.
  // It answers only for the clerk's own site (Origin), so an empty answer means unknown, not "none".
  const all = await r.json();
  out.searched = Array.isArray(all) && all.length > 0;
  const byDoc = new Map();
  for (const x of all) {
    const id = String(x.DocumentFilingId || '').replace(/_Redacted$/i, '').toUpperCase();
    if (!byDoc.has(id)) byDoc.set(id, []);
    byDoc.get(id).push(x);
  }
  // An amended report ("2026G3 (amended)", "2026Q2-Amend") replaces the original: per report, use the
  // newest filing that has itemized rows (an amendment uploaded as a scan has none).
  const groups = {};
  for (const d of docs) {
    const base = normPart(String(d.documentname || '').replace(/amend(ed|ment)?/gi, ' ')).replace(/\s+/g, '');
    (groups[base] = groups[base] || []).push(d);
  }
  const cand = normPart(f.firstname.replace(/["“”].*$/, '') + ' ' + f.lastname).split(' ').filter(Boolean);
  // the candidate, under any form of the name ("CAROLINA CRUZ" for Carolina Cruz Gonzalez, "George E.
  // Duell Morgan" and "George Morgan", "Pamela Schultz Gorman" for Pam Gorman), counted as one giver
  const isSelf = n => { const w = normPart(n).split(' '), f0 = w[0] || '';
    return cand.length >= 2 && f0.length >= 2 && (f0.startsWith(cand[0]) || cand[0].startsWith(f0)) &&
      cand.slice(1).some(p => p.length > 1 && w.slice(1).includes(p)); };
  const giver = x => !String(x.ContributorOrganizationName || '').trim() && isSelf(evWho(x)) ? '\u0000self' : null;
  const dayNo = s => Math.round(Date.parse(String(s || '').slice(0, 10).replace(/^0\d(\d\d-)/, '20$1') + 'T00:00:00Z') / 864e5);
  const reports = [];
  for (const g of Object.values(groups)) {
    g.sort((a, b) => evDate(b.datesubmitted).localeCompare(evDate(a.datesubmitted)));
    const use = g.find(d => (byDoc.get(d.documentid.toUpperCase()) || []).length);
    if (!use) continue;
    // A report comes back as two versions, "<id>_Redacted" and "<id>", and a row (often a loan) can be
    // in both, sometimes under a shorter form of the name ("CAROLINA CRUZ GONZALEZ" / "CAROLINA CRUZ").
    // Count a row from the second version once if the first already has it: same day, amount and name.
    const kept = [], items = [];
    const ver = x => /_Redacted$/i.test(String(x.DocumentFilingId || '')) ? 'r' : 'o';
    for (const x of byDoc.get(use.documentid.toUpperCase()).slice().sort((a, b) => ver(b).localeCompare(ver(a)))) {
      const v = ver(x), set = new Set(normPart(evWho(x)).split(' '));
      const dup = kept.find(k => k.v !== v && k.date === x.ContributionDate && k.amt === x.ContributionAmount &&
        (k.set.size <= set.size ? [...k.set].every(t => set.has(t)) : [...set].every(t => k.set.has(t))));
      if (dup) continue;
      kept.push({ v, date: x.ContributionDate, amt: x.ContributionAmount, set });
      items.push({ x, key: (giver(x) || [...set].sort().join(' ')) + '|' + x.ContributionAmount, day: dayNo(x.ContributionDate) });
    }
    reports.push({ doc: use, items, exact: new Set(items.map(i => i.key + '|' + i.day)) });
  }
  // Reports can cover overlapping periods: Palmetto Bay's 2026-Q3 and 2026-G1 list mostly the same
  // gifts, and some candidates' 2026-Q2 relists everything from Q1. A gift listed in two reports counts
  // once. Same giver, amount and day is the same gift. In two reports that overlap (they share at least
  // one such gift), the same giver and amount up to 3 days apart is too: one gift can be dated 09/28 in
  // one report and 09/30 in the next. Each listing pairs with at most one from another report; repeat
  // gifts within a report all count.
  const overlap = (a, b) => { for (const k of a.exact) if (b.exact.has(k)) return true; return false; };
  const rows = [], seen = new Map();
  for (const rep of reports) {
    const near = new Set(reports.filter(o => o !== rep && overlap(o, rep)).map(o => o.doc.documentid));
    for (const { x, key, day } of rep.items) {
      const list = seen.get(key) || [];
      const twin = list.filter(e => !e.docs.has(rep.doc.documentid) &&
          (e.day === day || (Math.abs(e.day - day) <= 3 && [...e.docs].some(d => near.has(d)))))
        .sort((a, b) => Math.abs(a.day - day) - Math.abs(b.day - day))[0];
      if (twin) { twin.docs.add(rep.doc.documentid); continue; }
      list.push({ day, docs: new Set([rep.doc.documentid]) });
      seen.set(key, list);
      rows.push({ x, doc: rep.doc });
    }
  }
  const agg = {}; let total = 0, to = '';
  for (const { x, doc } of rows) {
    const date = String(x.ContributionDate || '').slice(0, 10).replace(/^0\d(\d\d-)/, '20$1');   // mistyped years: Palmetto Bay's "0026-01-15", "0226-04-24"
    const amt = Number(x.ContributionAmount) || 0;
    if (!amt || date < CYCLE_START_YEAR + '-01-01') continue;   // a negative amount is a refund and nets out
    const org = String(x.ContributorOrganizationName || '').trim();
    const who = evWho(x);
    if (!who) continue;
    total += amt; if (amt > 0) out.count++;
    if (date > to && date <= new Date().toISOString().slice(0, 10)) to = date;   // ignore mistyped future dates
    const self = !org && isSelf(who);
    const id = self ? '\u0000self' : normPart(who);
    if (!agg[id]) agg[id] = { name: who, org: !!org, self, amount: 0, n: 0, doc, date };
    const a = agg[id];
    a.amount += amt; if (amt > 0) a.n++;
    if (date >= a.date) { a.date = date; a.doc = doc; }   // link the report with this giver's latest gift
  }
  const sorted = Object.values(agg).sort((a, b) => b.amount - a.amount);
  out.ties = tieNote(sorted.map(v => v.amount), 8);
  out.total = total; out.to = to;
  out.donors = sorted.slice(0, 8).map(v => {
    const self = v.self;
    const party = /\b(party|executive committee)\b/i.test(v.name);
    const committee = /political committee|\bpac\b|\bpc\b|committee|friends of|electioneering/i.test(v.name);
    // no contributor type in this system, so read it from the name
    const union = /\b(union|afscme|afl|cio|seiu|teamsters|iaff|united teachers|teachers union|education association|federation|brotherhood|fraternal order|firefighters|local \d+|cope)\b/i.test(v.name);
    const corp = /\b(inc|incorporated|llc|l\.l\.c|corp|corporation|co|company|association|assn|trust|group|partners|holdings|ltd|lp|llp|pa|p\.a|bank|solutions|consulting|enterprises?|services|towing|transport|realty|properties|investments?|construction|development|management|medical|healthcare|center|foundation|church|ministries)\b\.?/i.test(v.name);
    const type = self ? 'self-funded' : party ? 'party committee' : committee ? 'PAC' : union ? 'union' : corp || v.org ? 'corporation' : 'individual';
    const rep = String(v.doc.documentname || '').trim();
    return { name: v.name, year: v.date.slice(0, 4), amount: '$' + Math.round(v.amount).toLocaleString('en-US'), type,
      url: evDocUrl(v.doc.documentid), srcLabel: (rep ? rep + ' report' : 'report') + (v.n > 1 ? ', ' + v.n + ' gifts' : ''),
      ...(self ? { note: 'may include loans to the campaign' } : {}) };
  });
  return out;
}
function evWho(x) {
  const org = String(x.ContributorOrganizationName || '').trim();
  if (org) return org.replace(/\s+/g, ' ');
  return ([x.ContributorFirstName, x.ContributorMiddleName, x.ContributorLastName].filter(Boolean).join(' ') || x.ContributorFullName || '')
    .replace(/\s+/g, ' ').trim().replace(/^(mr|mrs|ms|miss)\.?\s+(?=\S)/i, '')   // Key Biscayne's "Mr. Mario J. Garcia-Sierra"
    .replace(/^([^,]+),\s*(?=\S)(?!(?:jr|sr|ii|iii|iv|llc|l\.l\.c|inc|corp|co|ltd|lp|llp|pllc|pa|p\.a)\.?$)([^,]+)$/i, '$2 $1').replace(/,$/, '').trim();   // Palmetto Bay's "Robinson, Karen"
}
function evDate(s) {   // "08/14/26" -> "2026-08-14"
  const m = String(s || '').match(/^(\d\d)\/(\d\d)\/(\d\d)$/);
  return m ? '20' + m[3] + '-' + m[1] + '-' + m[2] : '';
}
async function refreshEvDonors(env, result, name, office, officeCode) {
  if (officeCode || !evJurisdiction(office)) return false;
  const fresh = result.evV === EV_DONOR_VERSION && result.evAt && Date.now() - result.evAt < 24 * 3600 * 1000;
  if (fresh) return false;
  try {
    const d = await evCandidateDonors(env, name, office);
    result.evV = EV_DONOR_VERSION;
    result.evAt = Date.now();
    if (d && d.count) {
      result.donors = d.donors;
      result.donorDataNote = 'Contributions reported to the ' + d.filer + ' for ' + d.office + ': $' + Math.round(d.total).toLocaleString('en-US') +
        ' from ' + d.count + ' contributions in ' + CYCLE_START_YEAR + '-' + (CYCLE_START_YEAR + 1) + ', through ' + d.to +
        ', with amended reports applied. Top givers shown, each linked to the report that lists the gift.' + (d.ties || '') +
        ' Only electronically filed reports are itemized; scanned reports are on the clerk’s portal.';
      result.donorListUrl = d.portal;
      result.donorSource = 'CITY';
    } else if (d && d.latestUrl && result.donorSource !== 'CITY') {
      // no itemized rows: point to the clerk's latest report instead of a web search result
      result.donorListUrl = d.latestUrl;
      // only say why when the search answered for other filers (an empty answer could be a blocked request)
      if (d.searched && !/not itemized online/.test(result.donorDataNote || '')) result.donorDataNote = (result.donorDataNote ? result.donorDataNote + ' ' : '') + 'This candidate’s reports to the ' + d.filer +
        ' are not itemized online; the linked ' + (d.latestName || 'latest') + ' report lists every contribution.';
    }
    return true;
  } catch (e) { console.log('EasyVote donors ' + name + ': ' + e.message); return false; }
}

// Cities that post only scanned treasurer's reports (Pinecrest): /data/city-reports.json holds the
// itemized rows typed in from each report, checked against the report's own totals. It ships with
// the deploy, so a new report means editing that file and deploying. Each giver links to the report
// PDF that lists the gift.
let TX_DATA = null;
async function txData(env) {
  if (TX_DATA) return TX_DATA;
  if (!env.ASSETS) return null;
  const res = await env.ASSETS.fetch(new Request('https://assets.local/data/city-reports.json'));
  if (!res.ok) return null;
  TX_DATA = await res.json();
  return TX_DATA;
}
async function txCandidateDonors(env, name, office) {
  const data = await txData(env);
  if (!data || !Array.isArray(data.cities)) return null;
  const city = data.cities.find(c => new RegExp(c.match, 'i').test(String(office || '')));
  if (!city) return null;
  const seat = evSeat(office);
  const words = ' ' + normPart(String(name).replace(/["“”][^"“”]*["“”]/g, ' ')) + ' ';
  const hits = (city.candidates || []).filter(c => {
    if (seat && c.office && evSeat(c.office) !== seat) return false;
    const w = normPart(c.name).split(' ');
    return words.includes(' ' + w[w.length - 1] + ' ') && words.trim().split(' ')[0].slice(0, 1) === w[0].slice(0, 1);
  });
  if (hits.length !== 1) return null;
  const c = hits[0];
  if (c.summary) return { summary: c.summary, label: city.label, version: data.updated || '' };
  const agg = {}; let total = 0, count = 0, to = '', last = null;
  for (const rep of c.reports || []) {
    if (!last || String(rep.period || '') > String(last.period || '')) last = rep;
    for (const [date, who, type, amount, kind] of rep.rows || []) {
      const amt = Number(amount) || 0;
      if (!amt || String(date) < CYCLE_START_YEAR + '-01-01') continue;
      total += amt; if (amt > 0) count++;
      if (date > to) to = date;
      const id = type === 'S' ? '\u0000self' : normPart(who);
      if (!agg[id]) agg[id] = { name: type === 'S' ? c.name : who, type, amount: 0, n: 0, rep, date, kinds: new Set() };
      const a = agg[id];
      a.amount += amt; if (amt > 0) a.n++;
      if (kind) a.kinds.add(kind);
      if (date >= a.date) { a.date = date; a.rep = rep; }
    }
  }
  const sorted = Object.values(agg).sort((a, b) => b.amount - a.amount);
  const donors = sorted.slice(0, 8).map(v => {
    const type = v.type === 'S' ? 'self-funded' : v.type === 'F' ? 'PAC' :
      v.type === 'B' ? (/\b(union|local \d+|afscme|seiu|iaff)\b/i.test(v.name) ? 'union' : 'corporation') : 'individual';
    const kinds = [...v.kinds];
    const note = v.type === 'S' ? 'may include loans to the campaign' :
      kinds.length === 1 && kinds[0] === 'in-kind' ? 'in-kind (goods or services, not cash)' : '';
    return { name: v.name, year: v.date.slice(0, 4), amount: '$' + Math.round(v.amount).toLocaleString('en-US'), type,
      url: v.rep.url, srcLabel: v.rep.report + ' report' + (v.n > 1 ? ', ' + v.n + ' gifts' : ''), ...(note ? { note } : {}) };
  });
  return { donors, total, count, to, ties: tieNote(sorted.map(v => v.amount), 8), label: city.label, portal: city.portal,
    pending: city.pending || '', lastReport: last ? last.report : '', through: last ? String(last.period || '').split('/')[1] || to : to,
    version: data.updated || '' };
}
async function refreshTxDonors(env, result, name, office, officeCode) {
  if (officeCode) return false;
  try {
    const d = await txCandidateDonors(env, name, office);
    // re-apply if another source replaced these donors since
    if (d && d.summary) {
      // Only the total from the latest summary page (North Miami Beach): add it to the note and point
      // to that report. Donors stay from web research.
      const sm = d.summary;
      const line = (sm.total != null ? 'The candidate\u2019s latest report to the ' + d.label + ' (' + sm.report + ', through ' + sm.through +
        ') shows $' + Math.round(sm.total).toLocaleString('en-US') + ' raised to date, including loans.' : 'See the candidate\u2019s latest report to the ' + d.label +
        ' (' + sm.report + ').') + (sm.note ? ' ' + sm.note : '') + ' The city posts scanned reports, so the donors listed come from web research.';
      if (result.txV === d.version && String(result.donorDataNote || '').includes(line)) return false;
      result.txV = d.version;
      result.donorDataNote = (String(result.donorDataNote || '').replace(/ ?The candidate\u2019s latest report to the [^]*?come from web research\.|See the candidate\u2019s latest report to the [^]*?come from web research\./, '').trim() + ' ' + line).trim();
      result.donorListUrl = sm.url;
      return true;
    }
    if (!d || (result.txV === d.version && (!d.count || result.donorSource === 'CITY'))) return false;
    result.txV = d.version;
    if (d.count) {
      result.donors = d.donors;
      result.donorDataNote = 'Contributions reported to the ' + d.label + ': $' + Math.round(d.total).toLocaleString('en-US') +
        ' from ' + d.count + (d.count === 1 ? ' contribution' : ' contributions') + ' (loans and in-kind gifts count), in reports through ' + d.through +
        ' (' + d.lastReport + '). The clerk posts scanned reports, so these were typed in from each report and checked against its totals.' +
        (d.pending ? ' ' + d.pending : '') + ' Top givers shown, each linked to the report that lists the gift.' + (d.ties || '');
      result.donorListUrl = d.portal;
      result.donorSource = 'CITY';
    }
    return true;
  } catch (e) { console.log('city report donors ' + name + ': ' + e.message); return false; }
}

// When many givers tie at the cutoff (common at the legal limit), "top 8" is an arbitrary pick.
// Say how many gave at least the smallest amount shown.
function tieNote(sortedAmounts, shown) {
  if (sortedAmounts.length <= shown) return '';
  const floor = sortedAmounts[shown - 1];
  const atLeast = sortedAmounts.filter(a => a >= floor).length;
  return atLeast > shown ? ' ' + atLeast + ' givers gave $' + Math.round(floor).toLocaleString('en-US') + ' or more; ' + shown + ' are shown.' : '';
}
async function refreshFlDonors(env, key, result, name, office, save) {
  if (!flOfficeQuery(office)) return false;
  const fresh = result.flV === FL_DONOR_VERSION && result.flAt && Date.now() - result.flAt < 24 * 3600 * 1000;
  if (fresh) return false;
  try {
    const fl = await flCandidateDonors(env, name, office);
    if (!fl) return false;
    result.flV = FL_DONOR_VERSION;
    result.flAt = Date.now();
    if (fl.count) {
      result.donors = fl.donors;
      result.donorDataNote = 'Contributions reported to the Florida Division of Elections for the 2026 election: ' + fl.count +
        ' contributions totaling $' + Math.round(fl.total).toLocaleString('en-US') + (fl.to ? ', through ' + fl.to : '') +
        '. Top givers shown.' + (fl.ties || '') + ' Contributions to allied political committees are listed separately.';
      result.donorSource = 'FL';
    }
    if (save) await env.CACHE.put(key, JSON.stringify(result), { expirationTtl: CACHE_TTL });
    return true;
  } catch (e) { console.log('FL donors ' + name + ': ' + e.message); return false; }
}

// Money to allied committees, from the state's own records. A state or county candidate's own political
// committee ("Friends of Tom Leek") usually shows up as a donor to the campaign. For each one, list its
// largest 2025-2026 donors with dates (Florida Division of Elections), and what it gave the campaign.
// Replaces the web-research list, which has no committee names or dates. Refreshed daily.
const ALLIED_VERSION = 1;
async function refreshAllied(env, result, name) {
  if (result.donorSource !== 'FL' && result.donorSource !== 'MDC' && result.donorSource !== 'CITY') return false;
  const fresh = result.alV === ALLIED_VERSION && result.alAt && Date.now() - result.alAt < 24 * 3600 * 1000;
  if (fresh) return false;
  const np = flNameParts(name);
  if (!np) return false;
  const ownName = n => { const w = ' ' + normPart(n) + ' '; return w.includes(' ' + np.last + ' ') && (w.includes(' ' + np.first + ' ') || /\bfriends of\b/.test(w)); };
  const names = [];
  const add = n => { const c = String(n || '').replace(/\s*\(.*\)\s*$/, '').trim(); if (c && ownName(c) && !names.some(x => normOrg(x) === normOrg(c))) names.push(c); };
  (result.donors || []).filter(d => /pac|committee/i.test(d.type || '')).forEach(d => add(d.name));
  (result.committeeDonors || []).forEach(d => add(d.committee));
  const allied = [], rows = [];
  for (const c of names.slice(0, 3)) {
    let fl;
    try { fl = await flCommittee(env, c); } catch (e) { continue; }
    if (!fl || fl.error) continue;
    const gave = (result.donors || []).find(d => normOrg(String(d.name || '').replace(/\s*\(.*\)\s*$/, '')) === normOrg(c));
    allied.push({ name: fl.name, type: fl.type, status: fl.status, chair: fl.chair, url: fl.url, raised: fl.raised || 0, gifts: fl.gifts || 0,
      gaveCampaign: gave ? gave.amount : '' });
    for (const f of (fl.funders || [])) rows.push({ ...f, committee: fl.name, url: fl.url, source: 'FL' });
  }
  result.alV = ALLIED_VERSION;
  result.alAt = Date.now();
  if (allied.length) {
    result.alliedCommittees = allied;
    result.committeeDonors = rows;
    result.committeeSource = 'FL';
  }
  return true;
}

async function fecGroupProfile(env, id) {
  const apiKey = env.FEC_API_KEY || 'DEMO_KEY';
  const base = 'https://api.open.fec.gov/v1';
  const y = new Date().getFullYear();
  const cycle = y + (y % 2 === 0 ? 0 : 1);
  const get = async (path, params) => {
    const q = new URLSearchParams({ ...params, api_key: apiKey });
    const r = await fetch(base + path + '?' + q);
    if (!r.ok) throw new Error('FEC ' + path + ' ' + r.status);
    return r.json();
  };

  const [cj, tj] = await Promise.all([
    get('/committees/', { committee_id: id, per_page: '1' }),
    get('/committee/' + id + '/totals/', { cycle: String(cycle), per_page: '1' }).catch(() => ({}))
  ]);
  const c = (cj.results || [])[0] || {};
  const t = (tj.results || [])[0] || {};
  const hidden = /^C9/.test(id) || c.committee_type === 'I';
  const g = {
    id,
    name: c.name || '',
    formed: c.first_file_date || '',
    state: c.state || '',
    tiedTo: /^(none|n\/?a|null|unknown)?$/i.test(String(c.affiliated_committee_name || '').trim()) ? '' : c.affiliated_committee_name,
    hidden,
    raised: t.receipts || null,
    spentOutside: t.independent_expenditures || null,
    asOf: t.coverage_end_date ? String(t.coverage_end_date).slice(0, 10) : '',
    fecUrl: 'https://www.fec.gov/data/committee/' + id + '/',
    funders: [],
    fundersUrl: hidden ? '' : 'https://www.fec.gov/data/receipts/?committee_id=' + id + '&two_year_transaction_period=' + cycle,
    lean: null
  };

  // Lean from its own spending: dollars that helped Republicans (for R, against D) vs Democrats.
  // Largest lines first, up to 300, which covers nearly all the money for most groups.
  let rRows = [], extra = {};
  for (let i = 0; i < 3; i++) {
    const j = await get('/schedules/schedule_e/', { committee_id: id, cycle: String(cycle), most_recent: 'true', per_page: '100', sort: '-expenditure_amount', ...extra });
    const got = j.results || [];
    rRows = rRows.concat(got);
    const li = j.pagination && j.pagination.last_indexes;
    if (!got.length || !li || rRows.length >= ((j.pagination && j.pagination.count) || 0)) break;
    extra = li;
  }
  let helpR = 0, helpD = 0;
  for (const r of rRows) {
    if (r.memo_code === 'X') continue;
    const amt = r.expenditure_amount || 0, party = String(r.candidate_party || '').toUpperCase(), so = r.support_oppose_indicator;
    if ((party === 'REP' && so === 'S') || (party === 'DEM' && so === 'O')) helpR += amt;
    else if ((party === 'DEM' && so === 'S') || (party === 'REP' && so === 'O')) helpD += amt;
  }
  if (helpR + helpD >= 10000) {
    const share = Math.max(helpR, helpD) / (helpR + helpD);
    g.lean = { side: share >= 0.8 ? (helpR > helpD ? 'right' : 'left') : 'mixed', pctR: Math.round(100 * helpR / (helpR + helpD)) };
  }

  // Outside groups that aren't PACs are usually nonprofits: show who runs them from their 990.
  if (hidden && g.name) {
    try {
      const o = await findNonprofit(g.name);
      if (o) g.nonprofit = { ...(await nonprofitDetails(env, o.ein)), subsection: o.subseccd };
    } catch (e) { console.log('nonprofit lookup ' + id + ': ' + e.message); }
  }

  // Top funders. Groups that aren't PACs (hidden) don't report them, which is the point of the label.
  if (!hidden) {
    const aj = await get('/schedules/schedule_a/', { committee_id: id, two_year_transaction_period: String(cycle), sort: '-contribution_receipt_amount', per_page: '100' });
    const agg = {};
    for (const r of (aj.results || [])) {
      if (r.memo_code === 'X') continue;
      const n = String(r.contributor_name || '').trim();
      if (!n) continue;
      const emp = String(r.contributor_employer || '').trim();
      if (!agg[n]) agg[n] = { city: r.contributor_city || '', st: r.contributor_state || '', amount: 0, et: r.entity_type, emp: /^(information requested|info requested|requested|n\/?a|none|null|unknown|best efforts?)$/i.test(emp) ? '' : emp, cid: r.contributor_id || '' };
      agg[n].amount += r.contribution_receipt_amount || 0;
    }
    const kindOf = { IND: 'individual', ORG: 'organization', COM: 'PAC', PAC: 'PAC', PTY: 'party committee', CCM: 'candidate committee', CAN: 'candidate' };
    g.funders = Object.entries(agg).sort((a, b) => b[1].amount - a[1].amount).slice(0, 5).map(([n, v]) => {
      const f = { name: n + (v.et === 'IND' && v.emp ? ' (' + v.emp + ')' : ''), amount: '$' + Math.round(v.amount).toLocaleString('en-US'), type: kindOf[v.et] || 'contributor', city: v.city, st: v.st };
      // contributor_id is the giver's committee ID only when the giver is a committee. For people giving
      // through WinRed or ActBlue it's the conduit's ID, so it must not become their link.
      if (['COM', 'PAC', 'PTY', 'CCM'].includes(v.et) && /^C\d{8}$/.test(v.cid)) { f.url = 'https://www.fec.gov/data/committee/' + v.cid + '/'; f.fecId = v.cid; }
      else f.url = 'https://www.fec.gov/data/receipts/?committee_id=' + id + '&contributor_name=' + encodeURIComponent(n) + '&two_year_transaction_period=' + cycle;
      return f;
    });
    // Organizations giving to a super PAC: check the IRS list (via ProPublica) for 501(c)(4), (c)(5), (c)(6).
    // Exact name match only, so a business is never mislabeled as a nonprofit.
    await Promise.all(g.funders.filter(f => f.type === 'organization').map(async f => {
      try {
        const hitOrg = await findNonprofit(f.name);
        if (!hitOrg) return;
        f.disclosure = 'not_disclosed';
        f.type = 'nonprofit 501(c)(' + hitOrg.subseccd + ')';
        f.lookupUrl = 'https://projects.propublica.org/nonprofits/organizations/' + hitOrg.ein;
        f.np = await nonprofitDetails(env, hitOrg.ein);
      } catch (e) { /* leave unlabeled */ }
    }));
    markDisclosure({ donors: g.funders });   // LLC funders get "owners not listed"
  }
  return g;
}
// Who runs a nonprofit: officers, directors and key employees from its latest IRS Form 990, plus
// revenue and location. Revenue and location come from ProPublica's Nonprofit Explorer API; the
// officer list comes from its organization page, which shows Part VII of the 990. Cached 30 days.
// If ProPublica doesn't answer (or asks for a browser check), this returns what it has and the
// page still links to the filing.
const NONPROFIT_VERSION = 1;
function decodeEntities(t) {
  return String(t || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
async function nonprofitDetails(env, ein) {
  if (!/^\d{6,9}$/.test(String(ein))) return null;
  const key = 'np' + NONPROFIT_VERSION + ':' + ein;
  const hit = await env.CACHE.get(key, 'json');
  if (hit) return hit;
  const ua = { headers: { 'User-Agent': 'ballot305.org nonpartisan voter guide (github.com/Brittybrit/vote-informed)' } };
  const np = { ein: String(ein), url: 'https://projects.propublica.org/nonprofits/organizations/' + ein, officers: [] };
  try {
    const r = await fetch('https://projects.propublica.org/nonprofits/api/v2/organizations/' + ein + '.json', ua);
    if (r.ok) {
      const j = await r.json();
      const o = j.organization || {};
      np.name = o.name || '';
      np.city = o.city || '';
      np.state = o.state || '';
      np.subsection = o.subsection_code || null;
      np.since = o.ruling_date ? String(o.ruling_date).slice(0, 4) : '';
      const f = (j.filings_with_data || [])[0];
      if (f) { np.revenue = f.totrevenue || null; np.revenueYear = f.tax_prd_yr || ''; }
    }
  } catch (e) { console.log('propublica api ' + ein + ': ' + e.message); }
  try {
    const r = await fetch(np.url, ua);
    const html = r.ok ? await r.text() : '';
    const ti = html.indexOf('<table class="employees');
    if (ti >= 0) {
      const table = html.slice(ti, html.indexOf('</table>', ti));
      const before = html.slice(0, ti);
      const years = [...before.matchAll(/id=['"]filing(\d{4})['"]|year-label">\s*(\d{4})/g)].map(m => m[1] || m[2]);
      if (years.length) np.officersYear = years[years.length - 1];
      for (const m of table.matchAll(/<tr class="employee-row[^"]*">([\s\S]*?)<\/tr>/g)) {
        const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => c[1]);
        if (!cells.length) continue;
        const titleM = cells[0].match(/<span>([\s\S]*?)<\/span>/);
        const name = decodeEntities(cells[0].replace(/<span>[\s\S]*?<\/span>/, ''));
        const title = titleM ? decodeEntities(titleM[1]).replace(/^\(|\)$/g, '') : '';
        const titleFixed = title.replace(/\b(ceo|coo|cfo|cto|evp|svp|vp|gc)\b/gi, w => w.toUpperCase());
        const pay = cells[1] ? decodeEntities(cells[1]) : '';
        if (name) np.officers.push({ name, title: titleFixed, pay: /^\$[\d,]+$/.test(pay) && pay !== '$0' ? pay : '' });
        if (np.officers.length >= 15) break;
      }
    }
  } catch (e) { console.log('propublica page ' + ein + ': ' + e.message); }
  await env.CACHE.put(key, JSON.stringify(np), { expirationTtl: 60 * 60 * 24 * 30 });
  return np;
}
// Exact-name match against the IRS list, for 501(c)(4), (c)(5) and (c)(6) groups. Null if no exact match.
async function findNonprofit(name) {
  const want = normOrg(name);
  if (!want) return null;
  const r = await fetch('https://projects.propublica.org/nonprofits/api/v2/search.json?q=' + encodeURIComponent('"' + want + '"'));
  if (!r.ok) return null;
  const o = ((await r.json()).organizations || []).find(x => normOrg(x.name) === want);
  return o && [4, 5, 6].includes(o.subseccd) ? o : null;
}

function normOrg(n) {
  return normPart(n).replace(/\b(inc|incorporated|corp|corporation|co|llc|the)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

async function refreshOutside(env, key, result, name, officeCode) {
  if (!officeCode || result.outV === OUTSIDE_VERSION) return result;
  try {
    const o = await fecOutsideSpending(env, name, officeCode);
    if (o) {
      result.outsideSpending = o;
      result.outV = OUTSIDE_VERSION;
      await env.CACHE.put(key, JSON.stringify(result), { expirationTtl: CACHE_TTL });
    }
  } catch (e) { console.log('FEC outside spending error for ' + name + ': ' + e.message); }
  return result;
}

// Where a money trail goes dark, say so plainly and link the public record that comes closest.
// Nonprofits like 501(c)(4) and (c)(6) groups don't have to name donors: link their tax filings.
// LLCs give under a company name that hides the owners: link the Florida business record.
function markDisclosure(result) {
  const mark = list => {
    if (!Array.isArray(list)) return;
    for (const it of list) {
      if (!it || typeof it !== 'object') continue;
      const name = String(it.name || it.org || '');
      const tag = [it.kind, it.type].filter(Boolean).join(' ');
      const plain = name.replace(/\s*\(.*\)\s*$/, '').trim();   // drop "(EMPLOYER)" suffixes
      if (it.disclosure === 'not_disclosed' || /nonprofit|501\s*\(?\s*c\s*\)?|social welfare/i.test(tag)) {
        it.disclosure = 'not_disclosed';
        if (!it.lookupUrl) it.lookupUrl = it.fecId ? 'https://www.fec.gov/data/committee/' + it.fecId + '/'
          : 'https://projects.propublica.org/nonprofits/search?q=' + encodeURIComponent(plain);
      } else if (/\b(l\.?\s?l\.?\s?c\.?|limited liability company)\s*$/i.test(plain) || /\bl\.?l\.?c\b/i.test(plain)) {
        it.disclosure = 'owners_not_listed';
        if (!it.lookupUrl) it.lookupUrl = 'https://search.sunbiz.org/Inquiry/CorporationSearch/SearchResults?inquiryType=EntityName&searchTerm=' + encodeURIComponent(plain.replace(/[,\s]*\b(l\.?\s?l\.?\s?c\.?|limited liability company)\s*$/i, '').trim() || plain);
      }
    }
  };
  mark(result.donors); mark(result.committeeDonors);
  if (result.financing) { mark(result.financing.support); mark(result.financing.oppose); }
  if (result.outsideSpending) { mark(result.outsideSpending.support); mark(result.outsideSpending.oppose); }
  return result;
}

async function fecTopDonors(env, name, officeCode) {
  const apiKey = env.FEC_API_KEY || 'DEMO_KEY';
  const base = 'https://api.open.fec.gov/v1';
  const y = new Date().getFullYear();
  const cycle = y + (y % 2 === 0 ? 0 : 1);

  const found = await fecFindCandidate(env, name, officeCode);
  if (!found) return null;
  if (!found.cand) return { donors: [], definitive: true,
    note: 'Not registered with the FEC for this race. Federal candidates only have to register after raising or spending $5,000, so this campaign has likely raised little or nothing.' };
  const cand = found.cand;
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
      ...(COMMITTEE_ENTITIES[v.type] && /^C\d{8}$/.test(v.cid) ? { fecId: v.cid } : {}),
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

/* ---------------- race money (FEC) ---------------- */
// Where a federal race's money comes from, for the dossier chart. Totals and size bins come from
// FEC summary data (candidate totals and Schedule A by size), so unitemized small gifts are counted.
// Everything is for the current two-year filing period so it matches the fec.gov receipt links.
//
// Buckets for each candidate, in dollars:
//   small  individual gifts of $200 and under (grassroots)
//   mid    individual gifts $200.01 to $999.99
//   large  individual gifts of $1,000 and over
//   pac    PACs and other non-party committees (corporate, union, trade and issue PACs alike)
//   party  party committees
//   self   the candidate's own money and loans
// "Raised" is the sum of these buckets. Transfers between committees, outside loans, refunds and
// interest are left out: they aren't support from anyone and voters can't read them.
// Size bins are scaled to the individual-contribution total from the same summary data.
const MONEY_VERSION = 2;
async function handleRaceMoney(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !isStr(body.office) || !Array.isArray(body.names)) return json({ error: 'Missing office or names' }, 400);
  const office = body.office.slice(0, 200);
  const officeCode = federalOfficeCode(office);
  if (!officeCode || officeCode === 'P') return json({ available: false, reason: 'not-federal' });
  let district = '';
  if (officeCode === 'H') {
    const m = office.match(/district\s*(\d{1,2})/i);
    if (!m) return json({ available: false, reason: 'no-district' });
    district = String(parseInt(m[1], 10)).padStart(2, '0');
  }
  const names = [...new Set(body.names.filter(isStr).map(n => n.slice(0, 120).trim()))]
    .filter(n => !/^write[\s-]*in/i.test(n)).slice(0, 10);
  if (!names.length) return json({ available: false, reason: 'no-candidates' });

  const y = new Date().getFullYear();
  const cycle = y + (y % 2 === 0 ? 0 : 1);
  const key = 'money' + MONEY_VERSION + ':' + await sha256([officeCode, district, cycle, ...names.map(normPart).sort()].join('|'));
  const hit = await env.CACHE.get(key, 'json');
  if (hit) return json(hit);

  if (!(await rateLimit(env, 'money', clientIP(request), LIMIT_MONEY_PER_DAY)))
    return json({ error: 'Daily limit reached for fundraising lookups from your connection.' }, 429);

  const out = await raceMoney(env, officeCode, district, cycle, names);
  // Filings land on a schedule; half a day keeps the FEC calls down without going stale.
  // A failed lookup is cached for 10 minutes so a broken FEC response isn't retried on every tap.
  await env.CACHE.put(key, JSON.stringify(out), { expirationTtl: out.available ? 60 * 60 * 12 : 600 });
  return json(out);
}

async function raceMoney(env, officeCode, district, cycle, names) {
  const apiKey = env.FEC_API_KEY || 'DEMO_KEY';
  const base = 'https://api.open.fec.gov/v1';
  const q = '&cycle=' + cycle + '&election_full=false&api_key=' + apiKey;
  const eRes = await fetch(base + '/elections/?office=' + (officeCode === 'S' ? 'senate' : 'house') + '&state=FL' +
    (district ? '&district=' + district : '') + '&per_page=100' + q);
  if (!eRes.ok) { console.log('FEC elections ' + eRes.status); return { available: false, reason: 'fec-error' }; }
  const field = ((await eRes.json()).results || []).filter(c => c && c.candidate_id);

  const candidates = [];
  const unmatched = [];
  for (const name of names) {
    const c = matchFecCandidate(name, field);
    if (!c) { unmatched.push(name); continue; }
    candidates.push({ name, fecName: c.candidate_name || '', candidateId: c.candidate_id,
      committeeId: c.candidate_pcc_id || '', party: c.party_full || '', receipts: Math.max(0, c.total_receipts || 0),
      coverageEnd: c.coverage_end_date || '' });
  }
  if (!candidates.length) return { available: false, reason: 'no-match', unmatched };

  await Promise.all(candidates.map(async c => {
    try { c.breakdown = await moneyBreakdown(base, c, q); } catch (e) { console.log('FEC breakdown error for ' + c.name + ': ' + e.message); }
    c.links = moneyLinks(c.committeeId, cycle);
  }));

  const raceTotal = candidates.reduce((sum, c) => sum + c.receipts, 0);
  const ends = candidates.map(c => c.coverageEnd).filter(Boolean).sort();
  return { available: true, cycle, period: (cycle - 1) + '\u2013' + cycle, raceTotal,
    coverageEnd: ends.length ? ends[ends.length - 1].slice(0, 10) : '', candidates, unmatched };
}

// Ballot names ("Debbie Wasserman Schultz", "Carlos \"Charlie\" Smith Jr.") against FEC names
// ("WASSERMAN SCHULTZ, DEBBIE"). The FEC surname has to end the ballot name; the first name has
// to share its first three letters, unless only one candidate in the race has that surname.
function matchFecCandidate(name, field) {
  const clean = normPart(name.replace(/["\u201c\u201d][^"\u201c\u201d]*["\u201c\u201d]/g, ' '))
    .replace(/\b(jr|sr|ii|iii|iv)$/, '').trim();
  const first = clean.split(' ')[0] || '';
  const hits = field.filter(c => {
    const [last, given] = String(c.candidate_name || '').split(',');
    const l = normPart(last);
    return l && (clean === l || clean.endsWith(' ' + l));
  });
  if (!hits.length) return null;
  const byFirst = hits.filter(c => normPart(String(c.candidate_name).split(',')[1] || '').startsWith(first.slice(0, 3)));
  if (byFirst.length === 1) return byFirst[0];
  if (byFirst.length > 1) return byFirst.sort((a, b) => (b.total_receipts || 0) - (a.total_receipts || 0))[0];
  return hits.length === 1 ? hits[0] : null;
}

async function moneyBreakdown(base, c, q) {
  const [tRes, sRes] = await Promise.all([
    fetch(base + '/candidate/' + c.candidateId + '/totals/?per_page=1' + q),
    fetch(base + '/schedules/schedule_a/by_size/by_candidate/?candidate_id=' + c.candidateId + '&per_page=20' + q)
  ]);
  if (!tRes.ok) throw new Error('totals ' + tRes.status);
  const t = ((await tRes.json()).results || [])[0];
  if (!t) return null;
  const n = v => Math.max(0, Number(v) || 0);
  const receipts = n(t.receipts);
  const individual = n(t.individual_contributions);
  const bins = {};
  if (sRes.ok) for (const r of ((await sRes.json()).results || [])) bins[r.size] = (bins[r.size] || 0) + n(r.total);
  const binSum = Object.values(bins).reduce((a, b) => a + b, 0);
  let small, mid, large;
  if (binSum > 0) {
    const scale = individual / binSum;
    small = (bins[0] || 0) * scale;
    mid = ((bins[200] || 0) + (bins[500] || 0)) * scale;
    large = ((bins[1000] || 0) + (bins[2000] || 0)) * scale;
  } else {
    // No size data yet: unitemized gifts are all $200 and under; itemized ones can't be sized.
    small = n(t.individual_unitemized_contributions);
    mid = Math.max(0, individual - small);
    large = 0;
  }
  const pac = n(t.other_political_committee_contributions);
  const party = n(t.political_party_committee_contributions);
  const self = n(t.candidate_contribution) + n(t.loans_made_by_candidate);
  const r = v => Math.round(v);
  const out = { small: r(small), mid: r(mid), large: r(large), pac: r(pac), party: r(party), self: r(self), sized: binSum > 0 };
  // candidate totals cover every authorized committee; "raised" leaves out transfers, refunds and outside loans
  if (receipts > 0) c.receipts = out.small + out.mid + out.large + out.pac + out.party + out.self;
  if (t.coverage_end_date) c.coverageEnd = t.coverage_end_date;
  return out;
}

// fec.gov pages filtered to each bucket. Amount ranges follow the FEC's own size bins.
function moneyLinks(committeeId, cycle) {
  if (!/^C\d{8}$/.test(committeeId)) return {};
  const base = 'https://www.fec.gov/data/receipts/';
  const p = '?committee_id=' + committeeId + '&two_year_transaction_period=' + cycle;
  const ind = base + 'individual-contributions/' + p;
  return {
    all: base + p,
    small: ind + '&max_amount=200',
    mid: ind + '&min_amount=200.01&max_amount=999.99',
    large: ind + '&min_amount=1000',
    pac: base + p + '&line_number=F3-11C',
    party: base + p + '&line_number=F3-11B',
    self: base + p + '&line_number=F3-11D'
  };
}

/* ---------------- utilities ---------------- */

async function callAnthropic(env, payload, seenUrls) {
  // Web search turns can come back with stop_reason "pause_turn" (no final answer yet).
  // Hand the partial turn back so the model finishes, up to 3 times.
  payload = { ...payload, messages: [...payload.messages] };
  let text = '';
  for (let turn = 0; turn < 4; turn++) {
    const data = await callAnthropicOnce(env, payload);
    if (seenUrls) collectUrls(data.content, seenUrls);
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

// Every URL the web search tool returned in this response, plus any URL the API attached as a
// citation. These are the only links a dossier is allowed to show.
function collectUrls(content, seen) {
  for (const b of (content || [])) {
    if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      for (const r of b.content) if (r && r.url) remember(seen, r.url);
    }
    if (b.type === 'text' && Array.isArray(b.citations)) {
      for (const c of b.citations) if (c && c.url) remember(seen, c.url);
    }
  }
}

function remember(seen, url) {
  const n = normUrl(url);
  if (n && !seen.has(n)) seen.set(n, String(url).trim());
}

// Compare URLs loosely enough that http/https, "www.", a trailing slash or a #fragment
// don't matter, and strictly enough that a different page doesn't match.
function normUrl(u) {
  try {
    const x = new URL(String(u).trim());
    const path = x.pathname.replace(/\/+$/, '');
    return x.hostname.toLowerCase().replace(/^www\./, '') + path + x.search;
  } catch (e) { return ''; }
}

// Replace every url/donorListUrl in the result with the exact URL the search returned for that
// page, or blank it if the search never returned that page or the page isn't https.
// Returns counts so a dossier records how many links it lost.
function verifyUrls(result, seen) {
  let kept = 0, removed = 0;
  (function walk(o) {
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if ((k === 'url' || k === 'donorListUrl') && typeof v === 'string') {
        if (!v) continue;
        const real = seen.get(normUrl(v));
        if (real && /^https:\/\//i.test(real)) { o[k] = real; kept++; }
        else { o[k] = ''; removed++; }
      } else if (v && typeof v === 'object') walk(v);
    }
  })(result);
  return { kept, removed };
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

// Whole-file fingerprint for PDFs (cache keys for parses and printed ballot text).
async function pdfFingerprint(pdfB64) {
  return sha256('pdf|' + pdfB64);
}
// The old head+tail+length fingerprint. Only read for migrating existing cache entries;
// nothing is written under it anymore.
async function legacyFingerprint(pdfB64) {
  return sha256(pdfB64.length + '|' + pdfB64.slice(0, 10000) + '|' + pdfB64.slice(-10000));
}

// The county's own printed summary for a measure, from the master ballot fetched from the
// county site. null when the master ballot hasn't been parsed or the measure isn't on it.
async function trustedMeasureSummary(env, ...titles) {
  let pk = await env.CACHE.get(FEATURED_KEY);
  if (!pk) pk = await bundledParseKey(env);
  if (!pk) return null;
  const master = await env.CACHE.get(pk, 'json');
  if (!master || !Array.isArray(master.races)) return null;
  const want = new Set(titles.map(normPart).filter(Boolean));
  const hit = master.races.find(r => r && r.isMeasure && want.has(normPart(r.office)));
  return hit ? String(hit.summary || '') : null;
}

// Cache key of the parse of the master ballot bundled with the site. The page parses that file
// through /api/parse (the county site blocks Cloudflare), so fingerprint the deployed copy and
// point at its parse. The file ships with the deploy, so nobody else can choose what it says.
async function bundledParseKey(env) {
  if (!env.ASSETS) return null;
  try {
    const res = await env.ASSETS.fetch(new Request('https://assets.local' + BUNDLED_BALLOT_PATH));
    if (!res.ok) return null;
    const pk = 'parse4:' + await pdfFingerprint(bufToBase64(await res.arrayBuffer()));
    if (!(await env.CACHE.get(pk))) return null;   // not parsed yet under the new key
    await env.CACHE.put(FEATURED_KEY, pk, { expirationTtl: 60 * 60 * 6 });
    return pk;
  } catch (e) { console.log('bundled ballot lookup failed: ' + (e && e.message ? e.message : e)); return null; }
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
const TR_TAG_KEYS = { type: 'type_tr', kind: 'kind_tr', laborType: 'laborType_tr' }; // keep English for tag definitions, add a translated label

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
  const fp = await pdfFingerprint(pdf);
  const offices = body.offices.map(s => String(s || '').slice(0, 300));
  const options = (Array.isArray(body.measureOptions) ? body.measureOptions : []).slice(0, 250)
    .map(o => Array.isArray(o) ? o.slice(0, 4).map(s => String(s || '').slice(0, 80)) : null);
  const electionName = String(body.electionName || '').slice(0, 120);
  const contentKey = await sha256(JSON.stringify([offices, options, electionName]));
  const ck = 'btx2:' + fp + ':' + contentKey;
  let hit = await env.CACHE.get(ck, 'json');
  if (!hit) {
    // One-time migration from the old fingerprint (see parseBallot)
    hit = await env.CACHE.get('btx1:' + await legacyFingerprint(pdf) + ':' + contentKey, 'json');
    if (hit) await env.CACHE.put(ck, JSON.stringify(hit), { expirationTtl: 60 * 60 * 24 * 60 });
  }
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
