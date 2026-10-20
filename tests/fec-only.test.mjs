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

test('other committees: JFC and leadership PAC from FEC records, money passed to the campaign counted once', async () => {
  const x = await loadWorker(['otherCommittees']);
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(url);
    const ok = body => ({ ok: true, json: async () => body });
    if (/\/committees\/\?q=moody&designation=J/.test(url)) return ok({ results: [
      { committee_id: 'C00000001', name: 'ASHLEY MOODY VICTORY FUND' },
      { committee_id: 'C00000009', name: 'MOODY BLUES VICTORY FUND' } ] });   // different first name: not hers
    if (/sponsor_candidate_id=S6FL00640/.test(url)) return ok({ results: [{ committee_id: 'C00000002', name: 'FLORIDA LEADS', designation: 'D' }] });
    if (/\/committee\/C00000001\/totals/.test(url)) return ok({ results: [{ receipts: 7000, disbursements: 5800, last_cash_on_hand_end_period: 1200 }] });
    if (/\/committee\/C00000002\/totals/.test(url)) return ok({ results: [{ receipts: 500, disbursements: 100, last_cash_on_hand_end_period: 400 }] });
    if (/schedule_b\/\?committee_id=C00000001&recipient_committee_id=C00895763/.test(url)) return ok({ results: [
      { disbursement_amount: 3000 }, { disbursement_amount: 400 }, { disbursement_amount: 50, memo_code: 'X' } ], pagination: {} });
    if (/schedule_b/.test(url)) return ok({ results: [], pagination: {} });
    return { ok: false, json: async () => ({}) };
  };
  try {
    const c = { name: 'Ashley Moody', fecName: 'MOODY, ASHLEY', candidateId: 'S6FL00640', committeeId: 'C00895763',
      receipts: 13000, breakdown: { jfc: 4400 } };
    await x.otherCommittees('https://api.example', c, 2026, 'K');
    assert.deepEqual(c.committees.map(m => [m.name, m.kind, m.basis, m.toCampaign]),
      [['ASHLEY MOODY VICTORY FUND', 'jfc', 'name', 3400], ['FLORIDA LEADS', 'leadership', 'sponsor', 0]]);
    assert.equal(c.allRaised, 13000 + (7000 - 3400) + 500);
    assert.equal(c.sharedJfc, 4400 - 3400);
  } finally { globalThis.fetch = realFetch; }
});
