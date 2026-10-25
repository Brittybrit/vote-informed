import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import { build, buildTies, CYCLE_START, giftStart } from '../scripts/money-summary.mjs';

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
  // Congress members' gifts count from one cycle before their tenure began (giftStart); everyone else from CYCLE_START
  for (const B of decisions.bodies) for (const a of B.actions) for (const g of a.gifts)
    assert.ok(g.date >= giftStart(B, g.to), B.key + ' ' + a.id + ' gift dated ' + g.date);
  // Full-tenure county members with a tenure entry (Gilbert) count from one cycle before their start; others from CYCLE_START
  for (const B of decisions.bodies) if (B.level !== 'federal') for (const k of Object.keys(B.onBallot)) assert.equal(giftStart(B, k), B.key === 'county' && B.tenure && B.tenure[k] ? B.tenure[k].giftsFrom : CYCLE_START, B.key + ' ' + k);
  const C = decisions.bodies.find(b => b.key === 'county');
  assert.equal(giftStart(C, 'Gilbert'), '2019-01-01'); assert.equal(giftStart(C, 'Lopez'), CYCLE_START);
  assert.ok(!saved.people['natasha-l-ervin'].total);
});

test('totals add up', () => {
  for (const [pid, p] of Object.entries(saved.people)) {
    if (p.kind === 'votes') assert.equal(p.yes + p.no + p.away + (p.abst || 0) + (p.unk || 0), p.items, pid);
    if (p.kind === 'state') assert.ok(Math.abs(p.requests.money + p.bills.money + (p.bills.otherMoney || 0) - p.total) < 0.01, pid);
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
  // the percentages first (Brit, Oct 24, 2026), then the money, then the actions
  const r = render(saved.people['mike-redondo'], 'en');
  assert.match(r, /^Since \w+ 20\d\d, he filed 41 budget requests \(46%\)/);
  assert.ok(r.indexOf('89 budget requests') < r.search(/Mike Redondo took \$[\d,.]+ from \d+ donors/));
  assert.ok(r.indexOf('took') < r.indexOf('asked for $110.5 million'));
  // the parts add up to the total when both are shown
  for (const p of Object.values(saved.people)) {
    if ((p.kind === 'state' || p.kind === 'federal') && p.total)
      assert.equal(Math.round(p.requests.money + p.bills.money + p.bills.otherMoney), Math.round(p.total), p.pid + ' parts');
    if (p.total) {
      assert.equal(Math.round(p.beforeAmt + p.afterAmt), Math.round(p.total), p.pid + ' before + after');
      assert.equal(Math.round(p.campaignAmt + p.committeeAmt), Math.round(p.total), p.pid + ' accounts');
    }
  }
  // the share of actions tied to donors names its denominator and its two halves add up
  for (const p of Object.values(saved.people)) if (p.share && p.share.n) {
    assert.ok(p.share.tied <= p.share.n, p.pid);
    const line = render(p, 'en').split('<br>')[0];
    if (p.share.def === 'donorFirst') continue;
    const m = line.match(/^Since [A-Z][a-z]+ 20\d\d, \S+ \w+ (?:on )?(\d+) .*?\(([<>]?\d+)%\).*?\. On (\d+) \(([<>]?\d+)%\), they did not\.$/);
    assert.ok(m, p.pid + ' share sentence: ' + line);
    assert.equal(+m[1], p.share.tied, p.pid); assert.equal(+m[1] + +m[3], p.share.n, p.pid); if (!/[<>]/.test(m[2])) assert.equal(+m[2] + +m[4], 100, p.pid);
  }
  // a name is never repeated inside one sentence; pronouns are used instead
  for (const lang of ['en', 'es', 'ht']) for (const p of Object.values(saved.people)) if (p.last)
    for (const sentence of render(p, lang).replace(/<br>/g, ' ').split(/(?<=\.)\s+/))
      assert.ok(sentence.split(p.last).length <= 2, p.pid + ' ' + lang + ': ' + sentence);
  // no "the rest" or other words that make the reader work out a number
  for (const p of Object.values(saved.people)) assert.doesNotMatch(render(p, 'en'), /the rest|of that|\bmore\b/i, p.pid);
});

test('pages load the shared script', () => {
  for (const f of ['../public/index.html', '../public/decisions.html']) assert.match(read(f), /<script src="\/money-summary\.js"><\/script>/, f);
  assert.match(read('../public/methodology.html'), /id="summary"/);
});

test('per-person tie files match the builder and add up to the summary', () => {
  const ties = JSON.parse(JSON.stringify(buildTies(decisions)));
  const dir = new URL('../public/data/ties/', import.meta.url);
  const files = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();
  assert.deepEqual(files, Object.keys(ties).sort(), 'tie files on disk (run node scripts/money-summary.mjs)');
  for (const pid of files) {
    assert.deepEqual(JSON.parse(read('../public/data/ties/' + pid + '.json')), ties[pid], pid);
    const p = saved.people[pid];
    assert.ok(p, pid);
    assert.equal(p.pid, pid);
    const seen = new Map();
    for (const a of ties[pid].actions) for (const g of a.gifts) {
      assert.equal(g.to, p.last, pid + ' gift to someone else');
      seen.set([g.acct, g.donor, Number(g.amount), g.date].join('|'), Number(g.amount));
    }
    const sum = [...seen.values()].reduce((n, x) => n + x, 0);
    // the summary merges donor-name spellings, so its total can only be <= the raw unique sum
    assert.ok(Math.abs(sum - p.total) < 0.01 || sum > p.total, pid + ' ' + sum + ' vs ' + p.total);
    if (p.kind === 'votes') assert.equal(ties[pid].actions.length, p.items, pid);
  }
});
