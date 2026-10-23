// The Division of Elections search stops at 5,000 rows. A big campaign must be split by date until every
// piece fits, and a total that still hits the cap must be labeled a floor, never shown as the full amount.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker, fakeKV } from './load-worker.mjs';

const w = await loadWorker(['flContribAll', 'flCandidateDonors', 'refreshFlDonors', 'applyFl', 'flDonorsJob', 'FL_ROWLIMIT']);
const realFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = realFetch; });

const HEAD = 'Candidate/Committee\tDate\tAmount\tTyp\tContributor Name\tAddress\tCity State Zip\tOccupation\n';
// A fake state search over `gifts` (one $10 gift per entry, dated as given), capped at the row limit.
function fakeState(gifts, calls) {
  return async (url, init) => {
    const p = new URLSearchParams(String(init.body));
    calls.push([p.get('cdatefrom'), p.get('cdateto')]);
    const iso = s => s ? s.slice(6) + '-' + s.slice(0, 2) + '-' + s.slice(3, 5) : '';
    const from = iso(p.get('cdatefrom')) || '0000', to = iso(p.get('cdateto')) || '9999';
    const rows = gifts.filter(d => d >= from && d <= to).slice(0, Number(p.get('rowlimit')))
      .map((d, i) => 'Donalds, Byron  (REP)(GOV)\t' + d.slice(5, 7) + '/' + d.slice(8) + '/' + d.slice(0, 4) + '\t10.00\tCHE\tGIVER ' + d + ' ' + i + '\t1 MAIN ST\tNAPLES, FL 34102\tRETIRED');
    return { ok: true, status: 200, text: async () => HEAD + rows.join('\n') };
  };
}

test('a capped search is split by date until every row is counted', async () => {
  const gifts = [];
  for (let i = 0; i < 12000; i++) gifts.push(new Date(Date.parse('2025-01-01') + (i % 500) * 864e5).toISOString().slice(0, 10));
  const calls = [];
  globalThis.fetch = fakeState(gifts, calls);
  const d = await w.flCandidateDonors({}, 'Byron Donalds and Bryan Avila', 'Governor and Lieutenant Governor');
  assert.equal(d.count, 12000);
  assert.equal(Math.round(d.total), 120000);
  assert.equal(d.complete, true);
  assert.ok(calls.length > 3, 'split into several searches');
});

test('a single day that still fills the cap is reported as a floor', async () => {
  const gifts = Array(6000).fill('2026-10-01');
  globalThis.fetch = fakeState(gifts, []);
  const d = await w.flCandidateDonors({}, 'Byron Donalds and Bryan Avila', 'Governor and Lieutenant Governor');
  assert.equal(d.complete, false);
  const r = {};
  w.applyFl(r, d, Date.parse('2026-10-23'));
  assert.match(r.donorDataNote, /at least \$50,000/);
  assert.match(r.donorDataNote, /floor/);
  assert.equal(r.flFloor, true);
});

test('a small campaign is one search with no date filter', async () => {
  const calls = [];
  globalThis.fetch = fakeState(['2026-09-01', '2026-09-02'], calls);
  const d = await w.flCandidateDonors({}, 'Byron Donalds and Bryan Avila', 'Governor and Lieutenant Governor');
  assert.equal(d.count, 2);
  assert.deepEqual(calls, [['', '']]);
  const r = {}; w.applyFl(r, d, Date.parse('2026-10-23'));
  assert.doesNotMatch(r.donorDataNote, /at least/);
});

test('with the background runner: schedule a pull, then apply its result on the next read', async () => {
  const CACHE = fakeKV();
  const sent = [];
  const RESEARCH = { idFromName: n => n, get: id => ({ fetch: async (u, init) => { sent.push([id, JSON.parse(init.body)]); return new Response('scheduled'); } }) };
  const env = { CACHE, RESEARCH };
  const result = { donors: [], donorDataNote: 'The Florida Division of Elections search did not answer today. Donors will show here once it does.' };
  assert.equal(await w.refreshFlDonors(env, 'resl4:abc', result, 'Ashley Perez-Biliskov', 'State Representative, District 116', false), false);
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], 'fl:resl4:abc');
  assert.equal(sent[0][1].flDonors, true);
  // a second read inside 20 minutes does not schedule again
  await w.refreshFlDonors(env, 'resl4:abc', result, 'Ashley Perez-Biliskov', 'State Representative, District 116', false);
  assert.equal(sent.length, 1);
  // the runner finishes (slow answer allowed there)
  globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => HEAD +
    'Perez-Biliskov, Ashley  (REP)(STR)\t10/14/2026\t1000.00\tCHE\tJANE DOE\t1 MAIN ST\tMIAMI, FL 33186\tLAWYER' });
  assert.equal(await w.flDonorsJob(env, 'resl4:abc', 'Ashley Perez-Biliskov', 'State Representative, District 116'), true);
  assert.equal(await w.refreshFlDonors(env, 'resl4:abc', result, 'Ashley Perez-Biliskov', 'State Representative, District 116', false), true);
  assert.equal(result.donorSource, 'FL');
  assert.match(result.donorDataNote, /1 contributions totaling \$1,000/);
});
