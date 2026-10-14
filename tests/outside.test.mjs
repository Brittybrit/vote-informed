import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker, fakeKV } from './load-worker.mjs';

const w = await loadWorker(['fecOutsideSpending', 'refreshOutside', 'OUTSIDE_VERSION', 'OUTSIDE_TTL_MS']);
const realFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = realFetch; });

const y = new Date().getFullYear(), cycle = y + (y % 2 === 0 ? 0 : 1);
const G = 'G' + cycle, P = 'P' + cycle;
const row = (committee_id, ind, type, amt, date, extra = {}) => ({ committee_id, committee_name: committee_id, support_oppose_indicator: ind,
  election_type: type, expenditure_amount: amt, expenditure_date: date, expenditure_description: 'TV ad', ...extra });

function fakeFec(regular, notices, calls = { n: 0 }) {
  return async u => {
    const url = new URL(String(u));
    if (url.pathname.includes('/candidates/search')) return { ok: true, json: async () => ({ results: [{ candidate_id: 'H6FL24095', name: 'GILBERT, OLIVER G. III', state: 'FL', district: '24' }] }) };
    if (url.pathname.includes('/schedules/schedule_e')) {
      calls.n++;
      const rows = url.searchParams.get('is_notice') === 'true' ? notices : regular;
      return { ok: true, json: async () => ({ results: rows, pagination: { count: rows.length } }) };
    }
    if (url.pathname.includes('/committees')) return { ok: true, json: async () => ({ results: [] }) };
    throw new Error('unexpected ' + url);
  };
}

test('outside spending: general election only, unflagged lines dropped', async () => {
  globalThis.fetch = fakeFec([
    row('C00000001', 'O', P, 2000000, cycle + '-08-01'),   // primary: left out
    row('C00000001', 'O', G, 50000, cycle + '-09-20'),
    row('C00000002', 'S', G, 30000, cycle + '-09-25'),
    row('C00000003', null, G, 90000, cycle + '-09-25'),     // no side: left out
    row('C00000004', 'O', G, 40000, cycle + '-09-25', { memo_code: 'X' })
  ], [
    row('C00000001', 'O', G, 7000, cycle + '-09-10'),       // already in the regular report
    row('C00000001', 'O', G, 8000, cycle + '-10-05'),       // newer: added
    row('C00000005', 'O', P, 9000, cycle + '-10-06')        // primary notice: left out
  ]);
  const o = await w.fecOutsideSpending({ FEC_API_KEY: 'k' }, 'Oliver G. Gilbert III', 'H', 'Representative in Congress, District 24');
  assert.deepEqual(o.oppose.map(i => [i.fecId, i.amount]), [['C00000001', '$58,000']]);
  assert.deepEqual(o.support.map(i => [i.fecId, i.amount]), [['C00000002', '$30,000']]);
  assert.equal(o.localAgainst.total, 58000);
  assert.match(o.note, /general election/);
});

test('outside spending: refreshed daily, retried hourly after a failure', async () => {
  const kv = fakeKV(), calls = { n: 0 };
  globalThis.fetch = fakeFec([row('C00000001', 'O', G, 5000, cycle + '-09-01')], [], calls);
  const args = (r, now) => w.refreshOutside({ FEC_API_KEY: 'k', CACHE: kv }, 'k1', r, 'Oliver G. Gilbert III', 'H', 'Representative in Congress, District 24', now);
  const t0 = 1_000_000_000_000;
  let r = await args({ outV: w.OUTSIDE_VERSION - 1 }, t0);
  assert.equal(r.outAt, t0); assert.equal(calls.n, 2);
  r = await args(r, t0 + 60_000);                         // fresh: no FEC call
  assert.equal(calls.n, 2);
  globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
  const stale = t0 + w.OUTSIDE_TTL_MS + 1;
  r = await args(r, stale);                               // FEC down: keep data, retry in an hour
  assert.equal(r.outsideSpending.oppose[0].amount, '$5,000');
  assert.ok(stale - r.outAt < w.OUTSIDE_TTL_MS);
  assert.ok(JSON.parse(kv.store.get('k1')).outAt === r.outAt);
});

test('Biscayne Park: no county lookup, and the dossier says no reports are posted', async () => {
  const x = await loadWorker(['isCityRace', 'refreshMdcDonors', 'refreshTxDonors']);
  assert.ok(x.isCityRace('Biscayne Park - Commissioner'));
  assert.ok(!x.isCityRace('County Commissioner, District 5'));
  globalThis.fetch = async u => { throw new Error('no network expected: ' + u); };
  const r = { officialMiss: 'Miami-Dade Elections Department', donors: [], donorDataNote: 'No campaign finance disclosures found.' };
  assert.equal(await x.refreshMdcDonors({}, r, 'Daniel Samaria', 'Biscayne Park - Commissioner', null), true);
  assert.equal(r.officialMiss, undefined);
  const fs = await import('node:fs');
  const json = fs.readFileSync(new URL('../public/data/city-reports.json', import.meta.url), 'utf8');
  const env = { ASSETS: { fetch: async () => new Response(json) } };
  assert.equal(await x.refreshTxDonors(env, r, 'Daniel Samaria', 'Biscayne Park - Commissioner', null), true);
  assert.match(r.donorDataNote, /Biscayne Park has not posted campaign reports online/);
});
