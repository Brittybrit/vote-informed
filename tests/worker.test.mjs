import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadWorker, fakeKV } from './load-worker.mjs';

const w = await loadWorker(['mdcZip', 'localScope', 'splitCityLine', 'ringOf', 'newLocal', 'addLocal', 'roundLocal', 'vfAddr', 'evAddr',
  'fecLocal', 'fecFindCandidate', 'matchFecCandidate', 'sameFirst', 'ownSiteRatings', 'flCandidateDonors', 'clientIP', 'rateLimit',
  'numbersKept', 'parseBallot', 'pdfFingerprint', 'knownLean']);
const realFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = realFetch; });

test('Miami-Dade ZIPs', () => {
  for (const z of ['33139', '33010', '33160', '33002', '33125']) assert.equal(w.mdcZip(z), true, z);
  for (const z of ['33019', '33037', '32301']) assert.equal(w.mdcZip(z), false, z);
});

test('which area votes for an office', () => {
  assert.deepEqual(w.localScope('Governor and Lieutenant Governor', 'FL'), { kind: 'state', place: 'Florida', exact: true });
  assert.equal(w.localScope('State Representative, District 113', 'FL').exact, false);
  assert.deepEqual(w.localScope('Circuit Judge, 11th Judicial Circuit, Group 4', 'FL'), { kind: 'county', place: 'Miami-Dade', exact: true });
  assert.deepEqual(w.localScope('Coral Gables Commissioner Group 2', 'CITY'), { kind: 'city', place: 'Coral Gables', exact: true });
  assert.equal(w.localScope('North Miami Council District 2', 'CITY').exact, false);
  assert.equal(w.localScope('County Commissioner District 7', 'MDC').exact, false);
  assert.equal(w.localScope('Sheriff', 'MDC').exact, true);
});

test('addresses and rings', () => {
  assert.deepEqual(w.splitCityLine('MIAMI BEACH, FL 33139-1234'), { city: 'MIAMI BEACH', st: 'FL', zip: '33139' });
  const city = { kind: 'city', place: 'Coral Gables' };
  assert.deepEqual([{ city: 'Coral Gables', st: 'FL', zip: '33134' }, { city: 'Miami', st: 'FL', zip: '33134' },
    { city: 'Tampa', st: 'FL', zip: '33602' }, { city: 'Boston', st: 'MA', zip: '02110' }, {}, { city: 'Orlando', st: 'FL' }]
    .map(a => w.ringOf(a, city)), ['here', 'mdc', 'fl', 'out', 'unk', 'unk']);
  assert.equal(w.ringOf({ st: 'FL' }, { kind: 'county' }), 'unk');
});

test('county and city export addresses', () => {
  assert.deepEqual(w.vfAddr(['', '', '2026-01-01', 'C', 'JOHN DOE', '123 MAIN ST', '', 'MIAMI', 'FL', '33133', 'I']), { zip: '33133', st: 'FL', city: 'MIAMI' });
  assert.deepEqual(w.evAddr({ ContributorCity: 'Doral', ContributorState: 'FL', ContributorZipCode: '33178-1' }), { city: 'Doral', st: 'FL', zip: '33178' });
  assert.deepEqual(w.evAddr({ FilerCity: 'Doral', FilerZip: '33178' }), { city: '', st: '', zip: '' }, 'never the filer\'s own address');
});

test('local tally', () => {
  const L = w.newLocal({ kind: 'county', place: 'Miami-Dade', exact: true });
  w.addLocal(L, 'individual', { st: 'FL', zip: '33139' }, 100);
  w.addLocal(L, 'PAC', { st: 'FL', zip: '32301' }, 50);
  w.addLocal(L, 'self-funded', {}, 25);
  w.addLocal(L, 'individual', { st: 'NY', zip: '10001' }, -5);
  const r = w.roundLocal(L);
  assert.equal(r.total, 175); assert.equal(r.people.here, 100); assert.equal(r.groups.fl, 50); assert.equal(r.self, 25);
});

test('FEC: House money by place', async () => {
  globalThis.fetch = async u => { u = String(u);
    if (u.includes('by_state')) return { ok: true, json: async () => ({ results: [{ state: 'FL', total: 600 }, { state: 'NY', total: 300 }] }) };
    if (u.includes('by_zip')) return { ok: true, json: async () => ({ results: [{ zip: '33139', state: 'FL', total: 300 }, { zip: '32301', state: 'FL', total: 300 }], pagination: { pages: 1 } }) };
    throw new Error(u); };
  const c = { candidateId: 'H6FL00001', committeeId: 'C00000001', breakdown: { small: 200, mid: 500, large: 400, pac: 100, party: 0, self: 50 } };
  const L = await w.fecLocal('b', c, '&cycle=2026&election_full=false&api_key=x', 'H');
  assert.deepEqual(L.people, { here: 300, mdc: 0, fl: 300, out: 300, unk: 200 });
  assert.equal(L.groups.unk, 100); assert.equal(L.total, 1250);
});

test('FEC: candidate lookup is Florida and district only, with a name check', async () => {
  const DB = [{ candidate_id: 'H1', name: 'SALAZAR, MARIA ELVIRA', state: 'FL', district: '27' }, { candidate_id: 'H9', name: 'SMITH, JOHN', state: 'TX', district: '01' },
    { candidate_id: 'H3', name: 'EHR, PHILIP', state: 'FL', district: '28' }];
  globalThis.fetch = async u => { const url = new URL(u); const q = url.searchParams.get('q').toLowerCase(), st = url.searchParams.get('state'), d = url.searchParams.get('district');
    return { ok: true, json: async () => ({ results: DB.filter(c => (!st || c.state === st) && (!d || c.district === d) && q.split(' ').some(x => c.name.toLowerCase().includes(x))) }) }; };
  const find = async (n, o) => { const r = await w.fecFindCandidate({ FEC_API_KEY: 'k' }, n, 'H', o); return r && (r.cand ? r.cand.candidate_id : r); };
  assert.equal(await find('Maria Elvira Salazar', 'Representative in Congress, District 27'), 'H1');
  assert.equal(await find('Phil "Felipe" Ehr', 'Representative in Congress, District 28'), 'H3');
  assert.deepEqual(await find('John Smith', 'Representative in Congress, District 27'), { cand: null, notRegistered: true });
  assert.equal(await find('Pedro Salazar', 'Representative in Congress, District 27'), null);
  assert.equal(w.matchFecCandidate('Jose Garcia', [{ candidate_name: 'GARCIA, JOSE' }, { candidate_name: 'GARCIA, JOSEPH' }]), null);
});

test('first names and nicknames', () => {
  assert.ok(w.sameFirst('steve', 'esteban')); assert.ok(w.sameFirst('rod', 'roderick')); assert.ok(!w.sameFirst('ana', 'juan'));
});

test('ratings only from the rating body\'s own site', () => {
  const r = w.ownSiteRatings({ ratings: [{ org: 'Dade County Bar Association', url: 'https://www.dcba.org/poll' },
    { org: 'Dade County Bar Association', url: 'https://www.miamiherald.com/x' }] });
  assert.equal(r.ratings.length, 1);
});

test('Florida DOE: own money only for the candidate\'s own name', async () => {
  const tsv = ['h', 'Rodriguez, Ana Maria (DEM)(STR)\t01/02/2026\t500\tCHE\tRodriguez, Ana Maria\t1 Main\tMIAMI, FL 33139\tLAWYER',
    'Rodriguez, Ana Maria (DEM)(STR)\t01/03/2026\t300\tCHE\tRodriguez Lopez, Ana\t2 Main\tMIAMI, FL 33139\tTEACHER'].join('\n');
  globalThis.fetch = async () => ({ ok: true, text: async () => tsv });
  const d = await w.flCandidateDonors({}, 'Ana Maria Rodriguez', 'State Representative, District 113');
  assert.deepEqual(d.donors.map(x => x.type), ['self-funded', 'individual']);
  assert.equal(d.local.self, 500); assert.equal(d.local.people.here, 300);
});

test('rate limits: per /64, site-wide ceiling, kill switch', async () => {
  const req = ip => ({ headers: { get: () => ip } });
  assert.equal(w.clientIP(req('2600:1700:abcd:12::1')), w.clientIP(req('2600:1700:abcd:12:ffff:1:2:3')));
  const env = { CACHE: fakeKV() };
  let ok = 0; for (let i = 0; i < 70; i++) if (await w.rateLimit(env, 'research', 'a', 60)) ok++;
  assert.equal(ok, 60);
  let g = 0; for (let i = 0; i < 900; i++) if (await w.rateLimit(env, 'research', 'ip' + i, 60)) g++;
  assert.equal(60 + g, 800);
  assert.equal(await w.rateLimit({ ...env, FRESH_OFF: '1' }, 'parse', 'z', 10), false);
  assert.equal(await w.rateLimit({ ...env, FRESH_OFF: '1' }, 'money', 'z', 10), true);
});

test('translations must keep every number', () => {
  assert.ok(w.numbersKept('Raised $1,250,000 in 2026 (45%)', 'Recaudó $1.250.000 en 2026 (45 %)'));
  assert.ok(!w.numbersKept('Raised $1,250 in 2026', 'Recaudó $1,520 en 2026'));
});

test('party lean patterns are symmetric', () => {
  assert.equal(w.knownLean('Republican Liberty Caucus'), 'right');
  assert.equal(w.knownLean('Democratic Caucus of Florida'), 'left');
  assert.equal(w.knownLean('Miami Herald Editorial Board'), 'press');
});

test('the countywide ballot parse is pinned', async () => {
  const pdf = fs.readFileSync(new URL('../public/ballots/2026-11-03-general.pdf', import.meta.url));
  const b64 = pdf.toString('base64');
  const key = 'parse4:' + await w.pdfFingerprint(b64);
  const kv = fakeKV();
  await kv.put(key, JSON.stringify({ races: [{ office: 'X' }] }), { expirationTtl: 2592000 });
  const env = { ASSETS: { fetch: async () => new Response(pdf) }, CACHE: kv };
  const r = await w.parseBallot(env, b64, '1.1.1.1', false);
  assert.equal((await r.json()).ballot.pinned, true);
  assert.equal(kv.ttls.get(key), 'none');
});

test('reports and owner tools', async () => {
  const kv = fakeKV(), env = { CACHE: kv, ADMIN_TOKEN: 'secret123' };
  const R = (path, o = {}) => w.__default.fetch(new Request('https://x.test' + path, { method: o.body ? 'POST' : 'GET',
    headers: { 'CF-Connecting-IP': '1.2.3.4', 'Content-Type': 'application/json', ...(o.auth ? { Authorization: 'Bearer ' + o.auth } : {}) },
    body: o.body ? JSON.stringify(o.body) : undefined }), env, { waitUntil() {} });
  const key = 'resl4:' + 'a'.repeat(64);
  await kv.put(key, JSON.stringify({ summary: 'x' }));
  assert.equal((await R('/api/report', { body: { key, name: 'Jane Doe', office: 'Mayor', text: 'Wrong person' } })).status, 200);
  assert.equal((await R('/api/admin/reports')).status, 401);
  const list = await (await R('/api/admin/reports', { auth: 'secret123' })).json();
  assert.equal(list.reports[0].name, 'Jane Doe');
  assert.equal((await R('/api/admin/hold', { auth: 'secret123', body: { key } })).status, 200);
  assert.ok(!kv.store.has(key) && kv.store.has('hold:' + key));
  assert.equal((await w.__default.fetch(new Request('https://x.test/api/admin/reports'), { CACHE: kv }, {})).status, 404, 'admin off without a token');
});

test('source health check reports each source', async () => {
  const w2 = await loadWorker(['sourceHealth']);
  globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => ({}), text: async () => '' });
  const h = await w2.sourceHealth({ CACHE: fakeKV(), ANTHROPIC_API_KEY: 'x', FEC_API_KEY: 'y' });
  assert.equal(h.checks.length, 5);
  assert.equal(h.ok, false, 'sources down means not ok');
});
