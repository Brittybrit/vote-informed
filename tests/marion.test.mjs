// Ballot317 (Marion County, Indiana): the same worker with COUNTY = "marion".
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker, fakeKV } from './load-worker.mjs';

const w = await loadWorker(['setCounty', 'inOffice', 'inScope', 'ringOf', 'localScope', 'contributionCap', 'inCandidateDonors',
  'refreshInDonors', 'runResearch', 'knownLean', 'districtMatch', 'separateCommitteeMoney']);
const realFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = realFetch; w.setCounty({}); });

const MARION = { COUNTY: 'marion' };
const DATA = {
  updated: '2026-10-17', through: '2026-10-09', portal: 'https://campaignfinance.in.gov/PublicSite/Search.aspx',
  candidates: [
    { candidate: 'Kristina Moorhead', office: 'State Senator, District 29', committee: 'Friends of Kristina Moorhead', url: 'https://campaignfinance.in.gov/x/1', total: 13500, count: 4,
      givers: [['Jane Smith', 'I', 5000, 2, '2025-03-01', '2026-06-01', 'Indianapolis', 'IN', '46220', 'Teacher', ''],
        ['Acme LLC', 'C', 6000, 1, '2026-05-01', '2026-05-01', 'Carmel', 'IN', '46032', '', ''],
        ['Teachers PAC', 'P', 2000, 1, '2026-07-01', '2026-07-01', 'Washington', 'DC', '20001', '', ''],
        ['Kristina Moorhead', 'S', 500, 1, '2026-01-02', '2026-01-02', 'Indianapolis', 'IN', '46201', '', 'L']] },
    { candidate: 'Pat Doe', office: 'State Representative, District 90', committee: 'Doe for Indiana', total: 100, count: 1, givers: [['A', 'I', 100, 1, '2026-01-01', '2026-01-01', '', 'IN', '46201', '', '']] },
    { candidate: 'Pat Doe', office: 'State Representative, District 22', committee: 'Pat Doe Committee', total: 100, count: 1, givers: [] }
  ]
};
const assetsWith = data => ({ fetch: async req => new URL(req.url).pathname === '/data/in-donors.json'
  ? new Response(JSON.stringify(data), { status: 200 }) : new Response('', { status: 404 }) });

test('default is Miami-Dade; COUNTY=marion switches', () => {
  assert.equal(w.setCounty({}).id, 'miami');
  assert.equal(w.setCounty({ COUNTY: 'anything' }).id, 'miami');
  assert.equal(w.setCounty(MARION).id, 'marion');
});

test('Indiana office names', () => {
  assert.deepEqual(w.inOffice('State Senator, District 29'), { kind: 'senate', district: 29 });
  assert.deepEqual(w.inOffice('State Representative District 90'), { kind: 'house', district: 90 });
  assert.deepEqual(w.inOffice('State Representative, 94th District'), { kind: 'house', district: 94 });
  assert.equal(w.inOffice('Secretary of State').kind, 'statewide');
  assert.equal(w.inOffice('State Comptroller').office, 'State Comptroller');
  assert.equal(w.inOffice('United States Representative, 7th District'), null);
  assert.equal(w.inOffice('Sheriff'), null);
  assert.equal(w.inOffice('Marion County Prosecuting Attorney'), null);
});

test('federal district wording', () => {
  w.setCounty({});
  assert.equal(w.districtMatch('United States Representative, 7th District'), null, 'Miami-Dade reads only "District 27"');
  assert.equal(w.districtMatch('Representative in Congress, District 27')[1], '27');
  w.setCounty(MARION);
  assert.equal(w.districtMatch('United States Representative, 7th District')[1], '7');
  assert.equal(w.districtMatch('U.S. Representative District 6')[1], '6');
});

test('how local the money is, in Indiana', () => {
  w.setCounty(MARION);
  const county = { kind: 'county', place: 'Marion County' }, state = { kind: 'state', place: 'Indiana' };
  assert.equal(w.ringOf({ st: 'IN', zip: '46220' }, county), 'here');
  assert.equal(w.ringOf({ st: 'IN', zip: '46107' }, county), 'here', 'Beech Grove');
  assert.equal(w.ringOf({ st: 'IN', zip: '46280' }, county), 'fl', 'Hamilton County: elsewhere in the state');
  assert.equal(w.ringOf({ st: 'IN', zip: '46032' }, county), 'fl');
  assert.equal(w.ringOf({ st: 'FL', zip: '33139' }, county), 'out');
  assert.equal(w.ringOf({ zip: '47401' }, state), 'here', 'no state, Indiana ZIP');
  assert.deepEqual(w.localScope('Secretary of State', 'IN'), { kind: 'state', place: 'Indiana', exact: true });
  assert.equal(w.localScope('State Senator, District 29', 'IN').exact, false);
});

test('no Florida caps in Indiana; federal cap and Miami-Dade unchanged', () => {
  w.setCounty(MARION);
  assert.equal(w.contributionCap('State Senator, District 29', null), Infinity);
  assert.equal(w.contributionCap('United States Representative', 'H'), 3500);
  const r = w.separateCommitteeMoney({ donors: [{ name: 'Big Giver', amount: '$50,000' }] }, 'Sheriff', null);
  assert.equal(r.donors.length, 1, 'a large gift stays a campaign gift');
  w.setCounty({});
  assert.equal(w.contributionCap('Governor', null), 3000);
  assert.equal(w.contributionCap('Sheriff', null), 1000);
});

test('Indiana news and bar labels apply only on Ballot317', () => {
  w.setCounty({});
  assert.equal(w.knownLean('Indianapolis Star'), null);
  w.setCounty(MARION);
  assert.equal(w.knownLean('Indianapolis Star'), 'press');
  assert.equal(w.knownLean('Indianapolis Bar Association'), 'nonpartisan');
  assert.equal(w.knownLean('Miami Herald'), 'press', 'the shared list still applies');
});

test('Indiana Election Division donors from the data file', async () => {
  w.setCounty(MARION);
  const env = { ASSETS: assetsWith(DATA), CACHE: fakeKV() };
  const d = await w.inCandidateDonors(env, 'Kristina Moorhead', 'State Senator, District 29');
  assert.equal(d.count, 4);
  assert.deepEqual(d.donors.map(x => x.name), ['Acme LLC', 'Jane Smith (Teacher)', 'Teachers PAC', 'Kristina Moorhead']);
  assert.equal(d.donors[3].type, 'self-funded');
  assert.equal(d.donors[3].note, 'may include loans to the campaign');
  assert.equal(d.all.length, 3, 'own money left out of shared donors');
  assert.equal(d.local.people.here, 5000);
  assert.equal(d.local.groups.fl, 6000);
  assert.equal(d.local.groups.out, 2000);
  assert.equal(d.local.self, 500);
  // wrong office or district: no match
  assert.equal(await w.inCandidateDonors(env, 'Kristina Moorhead', 'State Senator, District 30'), null);
  assert.equal(await w.inCandidateDonors(env, 'Kristina Moorhead', 'Sheriff'), null);
  // same name, different districts: the district decides
  assert.equal((await w.inCandidateDonors(env, 'Pat Doe', 'State Representative, District 90')).count, 1);
  // a nickname or middle initial on the ballot still matches
  assert.equal((await w.inCandidateDonors(env, 'Kristina M. Moorhead', 'State Senator, District 29')).count, 4);

  const result = { donors: [{ name: 'from web research' }] };
  assert.equal(await w.refreshInDonors(env, result, 'Kristina Moorhead', 'State Senator, District 29'), true);
  assert.equal(result.donorSource, 'IN');
  assert.match(result.donorDataNote, /^Contributions reported to the Indiana Election Division by Friends of Kristina Moorhead in 2025 and 2026: 4 contributions totaling \$13,500, through 2026-10-09\./);
  assert.equal(result.donorListUrl, 'https://campaignfinance.in.gov/x/1');
  assert.equal(await w.refreshInDonors(env, result, 'Kristina Moorhead', 'State Senator, District 29'), false, 'no rewrite when nothing changed');
});

test('two committees with the same name and no district: show none', async () => {
  const w2 = await loadWorker(['setCounty', 'inCandidateDonors']);   // fresh copy: the data file is read once per isolate
  w2.setCounty(MARION);
  const data = { ...DATA, candidates: [{ candidate: 'Sam Lee', committee: 'A', givers: [] }, { candidate: 'Sam Lee', committee: 'B', givers: [] }] };
  const d = await w2.inCandidateDonors({ ASSETS: assetsWith(data) }, 'Sam Lee', 'State Senator, District 31');
  assert.deepEqual(d, { ambiguous: 2 });
});

test('research on Ballot317 never touches Florida or Miami-Dade sources', async () => {
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push({ url, body: String(init.body || '') });
    if (url.startsWith('https://api.anthropic.com/')) return new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"summary":"","donors":[{"name":"Acme LLC","amount":"$5,000","type":"corporation"}],"endorsements":[]}' }] }), { status: 200 });
    return new Response('nope', { status: 404 });
  };
  const env = { COUNTY: 'marion', CACHE: fakeKV(), ANTHROPIC_API_KEY: 'k', ASSETS: assetsWith(DATA) };
  w.setCounty(env);
  for (const [name, office] of [['Kristina Moorhead', 'State Senator, District 29'], ['Ryan Mears', 'Prosecuting Attorney'], ['Jane Roe', 'School Board Member, Indianapolis Public Schools, District 3']]) {
    await w.runResearch(env, 'k:' + name, { name, office, jurisdiction: 'Marion County, Indiana', election: 'General Election, November 3, 2026',
      isJudicial: false, isMeasure: false, measureSummary: '', officeCode: null, alias: 'alias:' + name });
  }
  const hosts = new Set(calls.map(c => new URL(c.url).hostname));
  for (const h of hosts) assert.ok(!/myflorida|voterfocus|easyvote|miamidade|sunbiz/.test(h), 'reached ' + h);
  const prompt = calls.find(c => c.url.startsWith('https://api.anthropic.com/')).body;
  assert.match(prompt, /many people in Marion County, Indiana share names/);
  assert.match(prompt, /Indiana sets no limit on gifts from individuals/);
  assert.match(prompt, /Indiana Election Division campaign finance site or Marion County Election Board filings/);
  assert.doesNotMatch(prompt, /Florida|Miami/);
  const senator = JSON.parse(env.CACHE.store.get('k:Kristina Moorhead'));
  assert.equal(senator.donorSource, 'IN', 'state data replaces web research');
  const prosecutor = JSON.parse(env.CACHE.store.get('k:Ryan Mears'));
  assert.equal(prosecutor.donors[0].name, 'Acme LLC', 'county races keep web research, and a $5,000 gift is not moved to committees');
  assert.equal(prosecutor.officialMiss, undefined, 'never says the Miami-Dade Elections Department had no match');
});

test('Ballot317 routes: no Miami-Dade sites, precincts, trilingual ballot or Haitian Creole', async () => {
  const env = { COUNTY: 'marion', CACHE: fakeKV(), ANTHROPIC_API_KEY: 'k' };
  const ctx = { waitUntil() {} };
  const go = async (method, path, body) => {
    const res = await w.__default.fetch(new Request('https://ballot317.example' + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }), env, ctx);
    return { status: res.status, body: await res.json() };
  };
  assert.equal((await go('GET', '/api/evsites')).status, 404);
  assert.equal((await go('GET', '/api/pollingplace?p=033.0')).status, 404);
  assert.equal((await go('POST', '/api/ballot-text', { offices: [] })).status, 404);
  assert.equal((await go('POST', '/api/featured', {})).status, 404);
  assert.deepEqual((await go('POST', '/api/shared-donors', { races: [] })).body, { available: false, reason: 'no-data' });
  assert.equal((await go('POST', '/api/translate-ballot', { lang: 'ht', offices: ['Sheriff'], measureOptions: [] })).status, 400);
});
