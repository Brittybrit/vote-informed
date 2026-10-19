import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { build, CYCLE_START } from '../scripts/money-summary.mjs';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const decisions = JSON.parse(read('../public/data/decisions.json'));
const held = JSON.parse(read('../public/data/offices-held.json'));
const saved = JSON.parse(read('../public/data/money-summary.json'));
const ctx = { window: {} };
vm.runInNewContext(read('../public/money-summary.js'), ctx);
const render = ctx.window.moneySummary;

test('money-summary.json matches the builder (run node scripts/money-summary.mjs)', () => {
  assert.deepEqual(saved, JSON.parse(JSON.stringify(build(decisions, held))));
});

test('every incumbent on the ballot has a summary', () => {
  for (const B of decisions.bodies) for (const k of Object.keys(B.onBallot)) {
    const m = B.members.find(x => x.key === k);
    assert.ok(saved.people[m.person], B.key + ' ' + k);
  }
  for (const o of decisions.others) for (const p of o.people)
    assert.ok(Object.values(saved.people).some(x => x.name === p.name), o.body.en + ' ' + p.name);
});

test('every summary links back to a ballot entry', () => {
  const linked = new Set(Object.values(saved.byBallot));
  for (const pid of Object.keys(saved.people)) assert.ok(linked.has(pid), pid);
});

test('gifts before the cycle are not counted', () => {
  assert.equal(CYCLE_START, '2025-01-01');
  for (const B of decisions.bodies) for (const a of B.actions) for (const g of a.gifts)
    assert.ok(g.date >= CYCLE_START, B.key + ' ' + a.id + ' gift dated ' + g.date);
  assert.ok(!saved.people['natasha-l-ervin'].total);
});

test('totals add up', () => {
  for (const [pid, p] of Object.entries(saved.people)) {
    if (p.kind === 'votes') assert.equal(p.yes + p.no + p.away, p.items, pid);
    if (p.kind === 'state') assert.ok(Math.abs(p.requests.money + p.bills.money - p.total) < 0.01, pid);
    if (p.kind !== 'none') assert.ok(p.beforeAmt <= p.total && p.before <= p.gifts, pid);
  }
});

test('renders in all three languages with no leftovers', () => {
  for (const lang of ['en', 'es', 'ht']) for (const [pid, p] of Object.entries(saved.people)) {
    const s = render(p, lang);
    assert.equal(typeof s, 'string', pid + ' ' + lang);
    assert.ok(s.length > 20, pid + ' ' + lang);
    assert.doesNotMatch(s, /undefined|NaN|null|\{\w+\}/, pid + ' ' + lang + ': ' + s);
  }
  assert.match(render(saved.people['mike-redondo'], 'en'), /^Mike Redondo filed 41 budget requests worth \$110\.5 million/);
});

test('pages load the shared script', () => {
  for (const f of ['../public/index.html', '../public/decisions.html']) assert.match(read(f), /<script src="\/money-summary\.js"><\/script>/, f);
  assert.match(read('../public/methodology.html'), /id="summary"/);
});
