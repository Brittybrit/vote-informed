import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadWorker, fakeKV } from './load-worker.mjs';

const w = await loadWorker(['mdcZip', 'localScope', 'splitCityLine', 'ringOf', 'newLocal', 'addLocal', 'roundLocal', 'vfAddr', 'evAddr',
  'fecLocal', 'fecFindCandidate', 'matchFecCandidate', 'sameFirst', 'ownSiteRatings', 'flCandidateDonors', 'flCommittee', 'realValue', 'clientIP', 'rateLimit',
  'numbersKept', 'parseBallot', 'pdfFingerprint', 'knownLean', 'sharedDonors', 'donorKey', 'streetKey', 'mdcCandidateDonors', 'vfRowName', 'vfSeat', 'refreshMdcDonors']);
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

test('Florida DOE: what a party committee gave, cash vs in-kind, each gift', async () => {
  const H = 'Basabe, Fabian (REP)(STR)';
  const tsv = ['h',
    H + '\t03/01/2026\t2500\tCHE\tFLORIDA HOUSE REPUBLICAN CAMPAIGN COMMITTEE\t1 Main\tTALLAHASSEE, FL 32301\tPOLITICAL PARTY',
    H + '\t09/10/2026\t140000\tINK\tFLORIDA HOUSE REPUBLICAN CAMPAIGN COMMITTEE\t1 Main\tTALLAHASSEE, FL 32301\tPOLITICAL PARTY\tPOLLING AND MAIL',
    H + '\t10/01/2026\t5616\tINK\tFLORIDA HOUSE REPUBLICAN CAMPAIGN COMMITTEE\t1 Main\tTALLAHASSEE, FL 32301\tPOLITICAL PARTY\tSTAFF',
    H + '\t02/01/2026\t17522\tLOA\tBasabe, Fabian\t2 Main\tMIAMI BEACH, FL 33139\tCANDIDATE'].join('\n');
  globalThis.fetch = async () => ({ ok: true, text: async () => tsv });
  const d = await w.flCandidateDonors({}, 'Fabian Basabe', 'State Representative, District 106');
  const p = d.donors[0];
  assert.equal(p.type, 'party committee'); assert.equal(p.amount, '$148,116');
  assert.deepEqual({ n: p.gave.n, cash: p.gave.cash, inkind: p.gave.inkind, from: p.gave.from, to: p.gave.to },
    { n: 3, cash: 2500, inkind: 145616, from: '2026-03-01', to: '2026-10-01' });
  assert.equal(p.gave.gifts[0].a, 140000); assert.equal(p.gave.gifts[0].desc, 'POLLING AND MAIL');
  const self = d.donors[1];
  assert.equal(self.type, 'self-funded'); assert.equal(self.name, 'Fabian Basabe'); assert.equal(self.gave, undefined);
});

test('Florida committee panel: no "none reported" for a party committee, no "None" officers', async () => {
  const pages = {
    'ComLkupByName.asp': '<a href="ComDetail.asp?account=123">FLORIDA HOUSE REPUBLICAN CAMPAIGN COMMITTEE</a>',
    'ComDetail.asp': '<b>Type:</b></td><td>Florida Affiliated Party Committee</td><b>Status:</b></td><td>Active</td>' +
      '<b>Address:</b></td><td>PO Box 1<br>Tallahassee, FL 32302</td><b>Chairperson:</b></td><td>Sam Garrison</td>' +
      '<b>Registered Agent:</b></td><td>None</td>',
    'contrib.exe': 'Candidate/Committee\tDate\tAmount\tTyp\tContributor Name\tAddress\tCity State Zip\tOccupation\n'
  };
  globalThis.fetch = async u => { const k = Object.keys(pages).find(x => String(u).includes(x)); return { ok: true, status: 200, text: async () => pages[k] }; };
  const fl = await w.flCommittee({ CACHE: fakeKV() }, 'Florida House Republican Campaign Committee');
  assert.equal(fl.chair, 'Sam Garrison'); assert.equal(fl.agent, '');
  assert.equal(fl.since, undefined);   // the page must not say "none reported"
  assert.equal(w.realValue('N/A'), ''); assert.equal(w.realValue('Jane Doe'), 'Jane Doe');
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

test('shared donors: names, d/b/a and suffixes, street addresses', () => {
  assert.equal(w.donorKey('Alpine Towing d/b/a Galactic'), w.donorKey('ALPINE TOWING'));
  assert.equal(w.donorKey('The Corradino Group, Inc.'), 'corradino group');
  assert.equal(w.streetKey('7735 NW 146 STREET, STE 306', '33016'), w.streetKey('7735 NW 146th St Suite 306', '33016-1234'));
  assert.notEqual(w.streetKey('1450 Brickell Ave Ste 2300', '33131'), w.streetKey('1450 Brickell Ave Ste 1800', '33131'), 'different suites stay apart');
  assert.equal(w.streetKey('PROTECTED', '33016'), '');
  const g = w.sharedDonors([
    { name: 'A', office: 'Doral - Councilmember - Seat 2', donors: [
      { name: 'Alpine Towing', type: 'corporation', amount: 1000, first: '2026-06-30', last: '2026-06-30', street: '3500 NW 67 St', zip: '33147' },
      { name: 'Bridge Point Doral 2700', type: 'corporation', amount: 500, first: '2026-06-29', last: '2026-06-29', street: '9525 W Bryn Mawr Ave', zip: '60018' },
      { name: 'Jane Roe', type: 'individual', amount: 500, first: '2026-05-01', last: '2026-05-01', street: '1 Main St', zip: '33166' },
      { name: 'A', type: 'self-funded', amount: 900, street: '', zip: '' }] },
    { name: 'B', office: 'Doral - Councilmember - Seat 2', donors: [
      { name: 'Alpine Towing d/b/a Galactic', type: 'corporation', amount: 500, first: '2026-08-20', last: '2026-08-20', street: '3500 NW 67th Street', zip: '33147' },
      { name: 'BP Doral 826 FL', type: 'corporation', amount: 500, first: '2026-08-20', last: '2026-08-20', street: '9525 West Bryn Mawr Avenue', zip: '60018' },
      { name: 'John Roe', type: 'individual', amount: 300, street: '1 Main St', zip: '33166' }] },
    { name: 'C', office: 'Doral - Councilmember - Seat 4', donors: [
      { name: 'ALPINE TOWING', type: 'corporation', amount: 500, first: '2026-09-02', last: '2026-09-02', street: '', zip: '' }] }
  ]);
  assert.equal(g.length, 2, 'people at one address are not joined; self-funding never counts');
  assert.equal(g[0].label, 'Alpine Towing'); assert.equal(g[0].reach, 3); assert.equal(g[0].total, 2000);
  assert.deepEqual(g[1].by.map(b => b.name), ['A', 'B']); assert.equal(g[1].sameAddress, true);
});

test('shared donors endpoint: city races from the county system, cached, federal skipped', async () => {
  const list = '<div>Office: Councilmember Seat 02</div><a href="candidate_pr.php?op=cv&e=9&c=mundoral&ca=75&rellevel=3">Maureen Porras (NOP)</a>' +
    '<a href="candidate_pr.php?op=cv&e=9&c=mundoral&ca=74&rellevel=3">Fernanda Gomes (NOP)</a>';
  const head = 'rpt,line,date,ce,name,a1,a2,city,st,zip,type,occ,item,desc,amount,amend,last\n';
  const csv = { 75: head + '1,1,2026-06-30,C,"ALPINE TOWING","3500 NW 67 ST",,MIAMI,FL,33147,B,TOWING,CH,,1000.00,,X\n1,2,2026-05-01,C,"JANE ROE","1 MAIN ST",,DORAL,FL,33166,I,RETIRED,CH,,100.00,,ROE\n',
    74: head + '1,1,2026-08-20,C,"Alpine Towing d/b/a Galactic","3500 NW 67th St",,MIAMI,FL,33147,B,TOWING,CH,,500.00,,X\n' };
  let calls = 0;
  globalThis.fetch = async u => { calls++; u = String(u);
    if (u.includes('candidate_pr.php')) return new Response(list);
    const id = (u.match(/cand_id=(\d+)/) || [])[1];
    return new Response(csv[id] || head); };
  const env = { CACHE: fakeKV() };
  const req = body => new Request('https://x/api/shared-donors', { method: 'POST', headers: { 'CF-Connecting-IP': '1.2.3.4' }, body: JSON.stringify(body) });
  const body = { races: [{ office: 'Doral - Councilmember - Seat 2', names: ['Fernanda Gomes', 'Maureen Porras', 'Write-in'] },
    { office: 'Representative in Congress, District 28', names: ['X Y', 'Z W'] }] };
  const r = await (await w.__default.fetch(req(body), env)).json();
  assert.equal(r.available, true);
  assert.equal(r.candidates.length, 2, 'write-ins and federal races left out');
  assert.equal(r.groups.length, 1); assert.equal(r.groups[0].reach, 2); assert.equal(r.groups[0].total, 1500);
  const n = calls;
  const again = await (await w.__default.fetch(req(body), env)).json();
  assert.deepEqual(again, r); assert.equal(calls, n, 'second request served from cache');
  const one = await (await w.__default.fetch(req({ races: [{ office: 'Doral - Councilmember - Seat 2', names: ['Maureen Porras'] }] }), env)).json();
  assert.equal(one.available, false);
});

test('city candidate lists without a party tag, and nicknames in parentheses', async () => {
  const row = (ca, name) => '<div class="col-xs-12 detailrow candidate clickme" role="row">\r\n    <a class="rowlink" href="/CampaignFinance/candidate_pr.php?op=cv&e=6&c=muncutlerbay&ca=' + ca +
    '&rellevel=4&committee=N">\r\n <div class="col-xs-7 no-gutter bold cf_indent" role="gridcell">\r\n' + name + ' \r\n </div>\r\n' +
    '<div role="gridcell"><span class="for-screen-reader">status</span>\r\n(Active-<span class=\'statustext\'>Qualified</span>)\r\n</div>' +
    '<span class="for-screen-reader">monetary</span>\r\n$5,840.00\r\n</a></div>';
  const list = '<div>Office: Mayor</div>' + row(33, 'Ricardo Jorge Viriato De Melo Gomes') + row(28, 'Robert (BJ) Duncan') + row(30, 'Suzette (Suzy) Lord') +
    '<div>Office: Council Member Seat 3</div>' + row(29, 'Richard Ramirez');
  const head = 'rpt,line,date,ce,name,a1,a2,city,st,zip,type,occ,item,desc,amount,amend,last\n';
  globalThis.fetch = async u => String(u).includes('candidate_pr.php') ? new Response(list)
    : new Response(head + '1,1,2026-05-01,C,"JANE ROE","1 MAIN ST",,CUTLER BAY,FL,33189,I,RETIRED,CH,,250.00,,ROE\n');
  const env = { CACHE: fakeKV() };
  for (const [name, office] of [['Ricardo De Melo Gomes', 'Cutler Bay - Mayor'], ['Robert "B.J." Duncan', 'Cutler Bay - Mayor'],
    ['Suzy Lord', 'Cutler Bay - Mayor'], ['Richard Ramirez', 'Cutler Bay - Residential Area Council Member - Seat 3']]) {
    const d = await w.mdcCandidateDonors(env, name, office);
    assert.ok(d && d.count === 1, name);
    assert.match(d.url, /c=muncutlerbay/);
  }
  assert.deepEqual(w.vfRowName('Vicki L. Lopez (NOP) status (Active- Qualified ) Contributions'), { name: 'Vicki L. Lopez', nick: '' });
});

test('city seats and clerk first names', async () => {
  assert.equal(w.vfSeat('GROUP (IV) - COMMISSIONER'), w.vfSeat('Coral Gables - for Commissioner - Group IV'));
  assert.equal(w.vfSeat('GROUP (I ) - MAYOR'), 'mayor');
  assert.equal(w.vfSeat('Council Seat 4'), w.vfSeat('Doral - Councilmember - Seat 4'));
  assert.notEqual(w.vfSeat('Council Seat 2'), w.vfSeat('Doral - Councilmember - Seat 4'));
  const row = (ca, name) => '<a href="/CampaignFinance/candidate_pr.php?op=cv&e=9&c=mundoral&ca=' + ca + '&rellevel=4">' + name + ' status (Active- Qualified )</a>';
  const list = '<div>Office: Council Seat 2</div>' + row(74, 'Fernanda Gomes') + row(75, 'Maureen Porras') +
    '<div>Office: Council Seat 4</div>' + row(70, 'Pedro Espinosa') + row(73, 'Gustavo Garagorry');
  const head = 'rpt,line,date,ce,name,a1,a2,city,st,zip,type,occ,item,desc,amount,amend,last\n';
  let asked = '';
  globalThis.fetch = async u => { u = String(u); if (u.includes('candidate_pr.php')) return new Response(list);
    asked = (u.match(/cand_id=(\d+)/) || [])[1]; return new Response(head + '1,1,2026-05-01,C,"JANE ROE","1 MAIN ST",,DORAL,FL,33166,I,RETIRED,CH,,250.00,,ROE\n'); };
  const env = { CACHE: fakeKV() };
  assert.ok(await w.mdcCandidateDonors(env, 'Peter Espinosa', 'Doral - Councilmember - Seat 4')); assert.equal(asked, '70');
  assert.ok(await w.mdcCandidateDonors(env, 'Maureen Porras', 'Doral - Councilmember - Seat 2')); assert.equal(asked, '75');
  assert.equal(await w.mdcCandidateDonors(env, 'Peter Gomes', 'Doral - Councilmember - Seat 4'), null, 'last name must match in that seat');
});

test('official system with no reports yet says so', async () => {
  const list = '<div>Office: City Council Group II</div><a href="/CampaignFinance/candidate_pr.php?op=cv&e=4&c=munhialeah&ca=26&rellevel=3">Luis Gonzalez status (Active-Qualified)</a>';
  globalThis.fetch = async u => String(u).includes('candidate_pr.php') ? new Response(list) : new Response('rpt,line,date,ce,name\n');
  const result = { donors: [{ name: 'Old Campaign Donor', amount: '$500' }] };
  assert.equal(await w.refreshMdcDonors({ CACHE: fakeKV() }, result, 'Luis Gonzalez', 'Hialeah - Councilmember - Group II', ''), true);
  assert.deepEqual(result.donors, []);
  assert.match(result.donorDataNote, /^No contributions reported to the City of Hialeah/);
});
