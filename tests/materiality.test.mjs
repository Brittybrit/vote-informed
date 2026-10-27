// $1,000 materiality threshold (Brit, Oct 27, 2026, "Option A"): scripts/lib/materiality.mjs and its use in
// scripts/money-summary.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INDIVIDUAL_MIN_TOTAL, donorType, materiality } from '../scripts/lib/materiality.mjs';
import { build, buildTies, markBelowThreshold } from '../scripts/money-summary.mjs';

const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('the threshold is $1,000', () => assert.equal(INDIVIDUAL_MIN_TOTAL, 1000));

test('who is an organization, a lobbyist or a person', () => {
  assert.equal(donorType({ donor: 'COWART JENNIFER', occ: 'PHYSICIAN', kind: 'class', rel: 'cls' }), 'person');
  assert.equal(donorType({ donor: 'FLORIDA BLUE', occ: 'INSURANCE CO.', kind: 'class', rel: 'cls' }), 'org');
  assert.equal(donorType({ donor: 'ACME HOLDINGS, INC.', occ: '', kind: 'class' }), 'org');
  assert.equal(donorType({ donor: 'UPSPAC', occ: 'POLITICAL COMMITTEE', kind: 'class' }), 'org');
  assert.equal(donorType({ donor: 'BECKER POLIAKOFF P A', kind: 'firm', rel: 'firm' }), 'org');
  assert.equal(donorType({ donor: 'BILZIN SUMBERG', kind: 'listed' }), 'org');
  assert.equal(donorType({ donor: 'MAX LOSNER', occ: 'GOVERNMENT AFFAIRS', kind: 'lobbyist', basis: 'occ' }), 'lobbyist');
  assert.equal(donorType({ donor: 'IRIS ESCARRA', occ: 'ATTORNEY', kind: 'firm', rel: 'firmlob' }), 'lobbyist');
  assert.equal(donorType({ n: 'BOOK RONALD L', k: 'lob' }), 'lobbyist');
  assert.equal(donorType({ n: 'SMITH JOHN', k: 'party' }), 'person');
});

// A Florida House body with one member (Nixon) and one contested law she voted yes on
function body(gifts) {
  return {
    updated: '2026-10-27',
    bodies: [{
      key: 'flhouse', type: 'requests', level: 'state', name: { en: 'Florida House' },
      members: [{ key: 'Nixon', name: 'Angie Nixon', person: 'angela-nixon' }],
      onBallot: { Nixon: { accounts: ['nixon'] } }, accounts: { nixon: { name: { en: 'campaign' } } },
      actions: [
        { id: 'law1', kind: 'bill', universe: true, ref: 'HB 1', date: '2025-05-01', roll: { Nixon: 'yes' }, tally: [80, 30], gifts },
        { id: 'law2', kind: 'bill', universe: true, ref: 'HB 2', date: '2025-05-02', roll: { Nixon: 'no' }, tally: [80, 30], gifts: [] },
      ],
    }],
    others: [],
  };
}
const held = { byBallot: { 'flhouse|Angie Nixon': 'angela-nixon' } };
const gift = (donor, amount, date, extra = {}) => ({ to: 'Nixon', acct: 'nixon', kind: 'class', rel: 'cls', donor, amount, date, occ: 'PHYSICIAN', ...extra });
const summary = gifts => build(body(gifts), held).people['angela-nixon'];

test('Nixon: $25 physicians do not count', () => {
  const p = summary([gift('DOE JANE', 25, '2025-02-01'), gift('ROE RICHARD', 25, '2025-03-01')]);
  assert.equal(p.total, 0); assert.equal(p.donors, 0); assert.equal(p.gifts, 0);
  assert.equal(p.bills.money, 0); assert.equal(p.bills.universe.tied, 0);
  assert.deepEqual(p.belowThreshold, { min: 1000, donors: 2, gifts: 2, money: 50 });
});

test('an individual giving 40 x $25 = $1,000 counts', () => {
  const gs = Array.from({ length: 40 }, (_, i) => gift('DOE JANE', 25, '2025-0' + (1 + (i % 9)) + '-' + String(10 + i).padStart(2, '0')));
  const p = summary(gs);
  assert.equal(p.total, 1000); assert.equal(p.donors, 1); assert.equal(p.gifts, 40);
  assert.equal(p.belowThreshold, undefined);
  // 39 gifts are $975: not counted
  assert.equal(summary(gs.slice(1)).total, 0);
});

test('a registered lobbyist giving $100 counts', () => {
  const p = summary([{ to: 'Nixon', acct: 'nixon', kind: 'firm', rel: 'firmlob', donor: 'ESCARRA IRIS', amount: 100, date: '2025-02-01', occ: 'ATTORNEY', lobbyist: 'Iris Escarra', firmName: 'GT' }]);
  assert.equal(p.total, 100); assert.equal(p.donors, 1);
});

test('a company giving $100 counts', () => {
  const p = summary([gift('SOUTH FLORIDA MEDICAL GROUP LLC', 100, '2025-02-01', { occ: 'MEDICAL PRACTICE' })]);
  assert.equal(p.total, 100); assert.equal(p.donors, 1);
});

test('persons below stay on the cards, marked, and a card with only them is not behind the summary', () => {
  const d = body([gift('DOE JANE', 25, '2025-02-01'), gift('ACME HEALTH INC', 500, '2025-02-01', { occ: 'HEALTHCARE' })]);
  assert.equal(markBelowThreshold(d), 1);
  const gs = d.bodies[0].actions[0].gifts;
  assert.equal(gs.find(g => g.donor === 'DOE JANE').belowThreshold, true);
  assert.ok(!('belowThreshold' in gs.find(g => g.donor === 'ACME HEALTH INC')));
  const t = buildTies(d)['angela-nixon'];
  assert.equal(t.actions.length, 1);
  assert.equal(t.actions[0].gifts.length, 2);
  const only = body([gift('DOE JANE', 25, '2025-02-01')]);
  assert.equal(buildTies(only)['angela-nixon'].actions.length, 0);
});

test('saved data: no headline counts a person below the threshold', () => {
  const d = read('../public/data/decisions.json');
  const copy = JSON.parse(JSON.stringify(d));
  assert.equal(markBelowThreshold(copy), 0, 'decisions.json marks are current (run node scripts/money-summary.mjs)');
  for (const f of ['angela-nixon']) {
    const t = read('../public/data/ties/' + f + '.json');
    for (const a of t.actions) assert.ok(a.gifts.some(g => !g.belowThreshold), a.id);
  }
});

test('a materiality total groups one donor and counts each gift once', () => {
  const M = materiality([{ n: 'A B', amt: 600, dt: '1' }, { n: 'A B', amt: 600, dt: '1' }, { n: 'A B', amt: 500, dt: '2' }],
    { donorOf: g => g.n, amountOf: g => g.amt, giftId: g => g.n + g.amt + g.dt });
  assert.equal(M.totals.get('A B'), 1100);
  assert.equal(M.counts({ n: 'A B', amt: 1, dt: '3' }), true);
});
