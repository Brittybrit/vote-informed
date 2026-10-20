// Federal dossiers show money only from the FEC: web-search donors, committee donors and outside
// spending never appear, and the race-money totals carry the same fields for every candidate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker } from './load-worker.mjs';

const w = await loadWorker(['fecOnly', 'FEC_DATA_VERSION', 'moneyBreakdown']);

test('FEC failed: web-search donors, committee donors and outside spending are dropped', () => {
  const r = w.fecOnly({
    donors: [{ name: 'Some PAC', amount: '$5,000', url: 'https://news.example.com/story' }],
    committeeDonors: [{ name: 'Big Giver', amount: '$1,000,000', committee: 'Victory Fund' }],
    outsideSpending: { support: [{ name: 'Super PAC', amount: '$2M' }], oppose: [], note: 'from news' },
    donorListUrl: 'https://news.example.com/list'
  });
  assert.deepEqual(r.donors, []);
  assert.deepEqual(r.committeeDonors, []);
  assert.equal(r.outsideSpending.source, 'FEC');
  assert.deepEqual(r.outsideSpending.support, []);
  assert.equal(r.donorListUrl, '');
  assert.match(r.donorDataNote, /FEC/);
});

test('FEC loaded: FEC donors and FEC outside spending are kept, committee donors still dropped', () => {
  const donors = [{ name: 'X PAC', amount: '$5,000', url: 'https://www.fec.gov/data/receipts/?committee_id=C00000001' }];
  const outside = { support: [], oppose: [{ name: 'Y', amount: '$1' }], source: 'FEC' };
  const r = w.fecOnly({ fecV: w.FEC_DATA_VERSION, donors, donorDataNote: 'fec note', outsideSpending: outside,
    committeeDonors: [{ name: 'Z' }], alliedCommittees: [{ name: 'A' }] });
  assert.equal(r.donors, donors);
  assert.equal(r.donorDataNote, 'fec note');
  assert.equal(r.outsideSpending, outside);
  assert.deepEqual(r.committeeDonors, []);
  assert.equal(r.alliedCommittees, undefined);
});

test('race money: raised, spent, cash on hand and debts come from the same FEC totals record', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    if (/\/totals\//.test(url)) return { ok: true, json: async () => ({ results: [{
      receipts: 1000, individual_contributions: 800, individual_unitemized_contributions: 300,
      other_political_committee_contributions: 200, disbursements: 450.4, last_cash_on_hand_end_period: 610,
      last_debts_owed_by_committee: null, coverage_end_date: '2026-09-30T00:00:00' }] }) };
    return { ok: false, json: async () => ({}) };
  };
  try {
    const c = { candidateId: 'S6FL00000' };
    await w.moneyBreakdown('https://api.example', c, '');
    assert.equal(c.spent, 450);
    assert.equal(c.cash, 610);
    assert.equal(c.debts, null);
    assert.equal(c.receipts, 1000);
  } finally { globalThis.fetch = realFetch; }
});
