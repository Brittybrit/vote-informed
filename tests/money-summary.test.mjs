import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import { build, buildTies, CYCLE_START, giftStart, TENURE_CITIES, TENURE_STATE, IN_FAVOR } from '../scripts/money-summary.mjs';
import { contested, voteStatus } from '../scripts/lib/contested.mjs';

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
  // Full-tenure county members with a tenure entry (Gilbert) and the full-tenure city lists count from one cycle before their start; others from CYCLE_START
  for (const B of decisions.bodies) if (B.level !== 'federal') for (const k of Object.keys(B.onBallot)) assert.equal(giftStart(B, k), (B.key === 'county' || TENURE_CITIES.has(B.key) || TENURE_STATE.has(B.key)) && B.tenure && B.tenure[k] ? B.tenure[k].giftsFrom : CYCLE_START, B.key + ' ' + k);
  const C = decisions.bodies.find(b => b.key === 'county');
  assert.equal(giftStart(C, 'Gilbert'), '2019-01-01'); assert.equal(giftStart(C, 'Lopez'), CYCLE_START);
  // Florida House from the 2023 session: one cycle before (Nov 4, 2020; Redondo Nov 9, 2022); Blanco, first seated Nov 2024, from CYCLE_START
  const H = decisions.bodies.find(b => b.key === 'flhouse');
  assert.equal(giftStart(H, 'Basabe'), '2020-11-04'); assert.equal(giftStart(H, 'Redondo'), '2022-11-09'); assert.equal(giftStart(H, 'Blanco'), CYCLE_START);
  // Florida Senate from the 2021 session (scripts/state-tenure.mjs): Garcia and Rodriguez from Nov 7, 2018, Calatayud and Ingoglia from Nov 4, 2020; was CYCLE_START
  const FS = decisions.bodies.find(b => b.key === 'flsenate');
  assert.equal(giftStart(FS, 'Garcia'), '2018-11-07'); assert.equal(giftStart(FS, 'Ingoglia'), '2020-11-04');
  // Ervin (full-tenure Opa-locka) counts from one cycle before her Dec 2022 start: only gifts on or after giftsFrom
  const OL = decisions.bodies.find(b => b.key === 'opalocka');
  assert.equal(saved.people['natasha-l-ervin'].giftsFrom, OL.tenure.Ervin.giftsFrom);
  for (const a of OL.actions) for (const g of a.gifts) if (g.to === 'Ervin') assert.ok(g.date >= OL.tenure.Ervin.giftsFrom, a.id);
});

test('totals add up', () => {
  for (const [pid, p] of Object.entries(saved.people)) {
    if (p.kind === 'votes') assert.equal(p.yes, p.items, pid);
    if (p.kind === 'state') assert.ok(Math.abs(p.requests.money + p.bills.money - p.total) < 0.01, pid);
    if (p.kind !== 'none' && p.kind !== 'fullcheck') assert.ok(p.beforeAmt <= p.total && p.before <= p.gifts, pid);
  }
});

test('renders in all three languages with no leftovers', () => {
  for (const lang of ['en', 'es', 'ht']) for (const [pid, p] of Object.entries(saved.people)) {
    const s = render(p, lang);
    assert.equal(typeof s, 'string', pid + ' ' + lang);
    // a person with nothing tied and no share line gets no summary: a line saying no donor was found is never shown
    // (Brit, Oct 27, 2026)
    assert.ok(s.length > 20 || (!p.total && !(p.share && p.share.n)), pid + ' ' + lang);
    assert.doesNotMatch(s, /No donors found|No se encontraron donantes|Nou pa jwenn okenn donatè/, pid + ' ' + lang);
    assert.doesNotMatch(s, /undefined|NaN|null|\{\w+\}/, pid + ' ' + lang + ': ' + s);
  }
  // what ties first (Brit, Oct 26, 2026), then the percentages, then where the money came from and the actions
  const r = render(saved.people['mike-redondo'], 'en');
  assert.match(r, /^Mike Redondo took \$[\d,.]+ from \d+ donors tied to official actions he took in their favor: a budget request he filed, or a yes vote on a contested law that helps their industry\./);
  assert.match(r.split('<br>')[1], /^Since \w+ 20\d\d, he filed 48 budget requests \(53%\)/);   // 2023-2026 (scripts/state-tenure.mjs); was 41 (46%) for 2025-26
  assert.ok(r.indexOf('48 budget requests (53%)') < r.indexOf('came from the lobbying firm for the group that would get the money'));
  assert.ok(r.indexOf('took') < r.indexOf('asked for $175.1 million'));
  // the parts add up to the total when both are shown
  for (const p of Object.values(saved.people)) {
    if ((p.kind === 'state' || p.kind === 'federal') && p.total)
      assert.equal(Math.round(p.requests.money + p.bills.money), Math.round(p.total), p.pid + ' parts');
    if (p.total && p.kind !== 'fullcheck') {
      assert.equal(Math.round(p.beforeAmt + p.afterAmt), Math.round(p.total), p.pid + ' before + after');
      assert.equal(Math.round(p.campaignAmt + p.committeeAmt), Math.round(p.total), p.pid + ' accounts');
    }
  }
  // the share of actions tied to donors names its denominator and its two halves add up
  // (a full check replaces the share line with its own count, checked in the next test)
  for (const p of Object.values(saved.people)) if (p.share && p.share.n && !p.fullCheck) {
    assert.ok(p.share.tied <= p.share.n, p.pid);
    const line = render(p, 'en').split('<br>').find(x => /^Since |^This city/.test(x)) || '';
    if (p.share.def === 'donorFirst') continue;
    // votes: "of the N votes she cast that were not unanimous, X (p%) ..." (Brit, Oct 27, 2026)
    if (['county', 'actions', 'lobbied'].includes(p.share.def)) assert.match(line, new RegExp('of the ' + p.share.n + ' votes? \\S+ cast that (?:was|were) not unanimous'), p.pid);
    const m = line.match(/^Since [A-Z][a-z]+ 20\d\d, (?:of the \d+ [^,]+, )?(?:\S+ \w+ (?:yes on )?)?(\d+) .*?\(([<>]?\d+)%\).*?\. On (?:the other )?(\d+) \(([<>]?\d+)%\), (?:they did not|\S+ voted no or no donor was involved|no donor was involved)\.(?: Cabinet votes are not counted[^.]*\.)?$/);
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

// In the donor's favor only (Brit, Oct 27, 2026): "how much money they took from donors who benefited from their
// official actions, not just are related to." A no vote, an absence, an abstention, a recusal or an unknown vote
// never adds money, donors, gifts, items or a tied count; donors tied only to no votes are kept apart in `against`.
const gift = (donor, amount, date = '2025-03-01') => ({ to: 'Nixon', acct: 'c1', donor, amount, date });
function fixture(type) {
  const state = type === 'state';
  // every vote here was contested (one no on the record) unless a test says otherwise
  const act = (id, roll, gifts, extra = {}) => ({ id, date: '2025-04-01', kind: state ? 'bill' : 'award', ref: id, roll: { Nixon: roll }, ...(roll === 'requested' ? {} : { tally: [3, 1] }), gifts, ...extra });
  const actions = state ? [
    { ...act('req1', 'requested', [gift('Lobby Firm', 1500)]), kind: 'request', ask: 750000 },
    act('HB1', 'yes', [gift('Helped Inc', 100)]),
    act('HB2', 'no', [gift('Opposed LLC', 50), gift('Helped Inc', 100)]),   // Helped Inc is counted via HB1 already
    act('HB3', 'nv', [gift('Skipped Co', 25)]),
    act('HB4', 'absent', [gift('Away Co', 10)]),
  ] : [
    act('a-yes', 'yes', [gift('Helped Inc', 100)], { lobbied: [{}] }),
    act('a-no', 'no', [gift('Opposed LLC', 50)], { lobbied: [{}] }),
    act('a-absent', 'absent', [gift('Away Co', 10)], { lobbied: [{}] }),
    act('a-abstain', 'abstain', [gift('Abstain Co', 20)], { lobbied: [{}] }),
    act('a-recused', 'recused', [gift('Recused Co', 30)], { lobbied: [{}] }),
    act('a-unknown', 'unknown', [gift('Unknown Co', 40)], { lobbied: [{}] }),
    act('a-plain', 'yes', [], { lobbied: [{}] }),
  ];
  const B = { key: state ? 'fxstate' : 'fxcity', name: { en: 'Test Body' }, ...(state ? { type: 'requests' } : {}), members: [{ key: 'Nixon', person: 'angela-nixon', name: 'Angie Nixon' }],
    onBallot: { Nixon: { accounts: ['c1'] } }, accounts: { c1: { en: 'Campaign' } }, actions };
  return { updated: '2026-10-27', bodies: [B], others: [] };
}
const fxHeld = { byBallot: { 'State Representative|Angie Nixon': 'angela-nixon' } };

test('state legislator (Nixon-style): money from bills voted no or not voted on is not in the total', () => {
  const p = build(fixture('state'), fxHeld).people['angela-nixon'];
  assert.equal(p.total, 1600);                 // request $1,500 + yes-vote bill $100
  assert.equal(p.donors, 2);
  assert.equal(p.gifts, 2);
  assert.equal(p.requests.money, 1500);
  assert.equal(p.bills.money, 100);
  assert.equal(p.bills.votes, 1);
  assert.equal(p.bills.yes, 1);
  assert.equal(p.bills.otherMoney, undefined);
  assert.equal(p.beforeAmt + p.afterAmt, p.total);
  assert.equal(p.campaignAmt + p.committeeAmt, p.total);
  // only the no vote's uncounted donor is context; not-voting and absent drop out entirely
  assert.deepEqual(p.against, { votes: 1, money: 50, donors: 1, bills: 1 });
  const ties = buildTies(fixture('state'))['angela-nixon'].actions.map(a => a.id).sort();
  assert.deepEqual(ties, ['HB1', 'req1']);
  const en = render(JSON.parse(JSON.stringify(p)), 'en');
  assert.match(en, /took \$1,600 from 2 donors tied to official actions she took in their favor: a budget request she filed, or a yes vote on a contested law that helps their industry\./);
  assert.match(en, /\$100 came from donors in an industry that a contested law she voted yes on may help, by its official analysis\./);
  assert.match(en, /She voted no on a bill that helps industries whose donors gave \$50\. That money is not counted above\./);
  for (const lang of ['es', 'ht']) assert.match(render(JSON.parse(JSON.stringify(p)), lang), /\$50\b/);
});

test('voting body: only yes votes count toward money, donors, items and the share', () => {
  const p = build(fixture('city'), fxHeld).people['angela-nixon'];
  assert.equal(p.total, 100);
  assert.equal(p.donors, 1);
  assert.equal(p.items, 1);
  assert.equal(p.yes, 1);
  for (const k of ['no', 'away', 'abst', 'unk']) assert.equal(p[k], undefined, k);
  // the pool is every yes or no vote on a lobbied item (3); tied is only the yes vote with a donor
  assert.deepEqual([p.share.n, p.share.tied], [3, 1]);
  assert.deepEqual(p.against, { votes: 1, money: 50, donors: 1 });
  const en = render(JSON.parse(JSON.stringify(p)), 'en');
  assert.match(en, /took \$100 from 1 donor whose business before the Test Body got her yes vote/);
  assert.match(en, /of the 3 votes she cast that were not unanimous, 1 \(33%\) helped one of her donors\. On the other 2 \(67%\), she voted no or no donor was involved\./);
  assert.match(en, /She voted no on 1 item that helped donors who gave \$50\. That money is not counted above\./);
});

test('no headline number includes money tied only to no, absent, abstained, recused or unknown votes', () => {
  for (const B of decisions.bodies) for (const key of Object.keys(B.onBallot)) {
    const m = B.members.find(x => x.key === key);
    const p = saved.people[m.person];
    if (!p || p.body !== B.key || p.last !== key) continue;
    const accts = new Set(B.onBallot[key].accounts), G0 = giftStart(B, key);
    const mine = a => (a.gifts || []).filter(g => g.to === key && accts.has(g.acct) && g.date >= G0);
    const k = g => [g.acct, g.donor, Number(g.amount), g.date].join('|');
    const favor = new Set(), other = new Map();
    for (const a of B.actions) for (const g of mine(a)) (IN_FAVOR.has((a.roll || {})[key]) ? favor.add(k(g)) : other.set(k(g), Number(g.amount)));
    // the gifts behind the summary are all from in-favor actions
    const t = buildTies(decisions)[m.person];
    for (const a of t.actions) assert.ok(IN_FAVOR.has(a.roll[key]), m.person + ' ' + a.id + ' ' + a.roll[key]);
    // a yes vote behind the summary was contested: the record shows at least one no (Brit, Oct 27, 2026)
    for (const a of t.actions) if (a.roll[key] === 'yes') assert.ok(contested(a), m.person + ' ' + a.id + ' unanimous or unknown tally');
    // a gift tied only to actions not in the donor's favor never reaches the total
    const onlyOther = [...other].filter(([g]) => !favor.has(g)).reduce((n, [, x]) => n + x, 0);
    const favorSum = [...favor].reduce((n, g) => n + Number(g.split('|')[2]), 0);
    assert.ok(p.total <= favorSum + 0.01, m.person + ' total ' + p.total + ' > in-favor gifts ' + favorSum + ' (only-other ' + onlyOther + ')');
    if (p.share && p.share.def !== 'donorFirst' && p.share.def !== 'cabinet' && p.kind === 'votes') assert.ok(p.share.tied <= p.items, m.person);
    if (p.kind === 'votes') assert.equal(p.items, p.yes, m.person);
    if (p.bills) { assert.equal(p.bills.yes, p.bills.votes, m.person); assert.equal(p.bills.otherMoney, undefined, m.person); }
  }
});

test('unanimous votes and votes of unknown tally are not ties and leave the share pool (Brit, Oct 27, 2026)', () => {
  assert.equal(voteStatus([5, 0], { A: 'yes' }, true), 'unanimous');
  assert.equal(voteStatus([5, 1], { A: 'yes' }, false), 'contested');
  assert.equal(voteStatus(null, { A: 'yes', B: 'no' }, false), 'contested');
  assert.equal(voteStatus(null, { A: 'yes', B: 'yes' }, true), 'unanimous');
  assert.equal(voteStatus(null, { A: 'yes' }, false), 'unknown');
  assert.equal(voteStatus('7-0', null, false), 'unanimous');
  const city = fixture('city');
  const acts = city.bodies[0].actions;
  acts.push({ id: 'a-unan', date: '2025-05-01', kind: 'award', ref: 'a-unan', roll: { Nixon: 'yes' }, tally: [5, 0], rollComplete: true, lobbied: [{}], gifts: [gift('Unanimous Co', 70)] });
  acts.push({ id: 'a-notally', date: '2025-05-02', kind: 'award', ref: 'a-notally', roll: { Nixon: 'yes' }, lobbied: [{}], gifts: [gift('No Tally Co', 80)] });
  const p = build(city, fxHeld).people['angela-nixon'];
  assert.equal(p.total, 100);
  assert.deepEqual([p.share.n, p.share.tied], [3, 1]);
  assert.deepEqual(buildTies(city)['angela-nixon'].actions.map(a => a.id), ['a-yes']);
  // requests are not votes: a request with no tally still ties
  const st = fixture('state');
  st.bodies[0].actions.find(a => a.id === 'HB1').tally = [100, 0];
  const q = build(st, fxHeld).people['angela-nixon'];
  assert.equal(q.requests.money, 1500);
  assert.equal(q.bills.money, 0);
  assert.equal(q.total, 1500);
});

// The headline says what the record shows (Brit, Oct 27, 2026): an action taken in the donor's favor, not that the donor
// benefited. A request may not have been funded, a lobbying firm is paid to lobby for its client, and a law "may" help.
test('no summary says a donor benefited; lobbying firms are named for their client, not as the one getting the money', () => {
  for (const [pid, p] of Object.entries(saved.people)) {
    assert.doesNotMatch(render(p, 'en'), /benefit/i, pid);
    assert.doesNotMatch(render(p, 'es'), /beneficiaron|beneficiaran|se benefician/i, pid);
    assert.doesNotMatch(render(p, 'ht'), /benefisye/i, pid);
    const en = render(p, 'en');
    if (p.fullCheck) { assert.match(en, /^\d+ of \d+ decisions in office helped donors to (his|her) campaign or committees\. \$[\d,]+ came from \d+ donors? tied to those decisions\./, pid); continue; }
    if (p.requests && p.requests.money && p.kind === 'state') assert.match(en, /came from the lobbying firm for the group that would get the money, or from that group, on \d+ budget requests?/, pid);
    // the request line still says whether the request was funded
    if (p.requests && p.requests.money && p.kind === 'state') assert.match(en, /final budget|vetoed/, pid);
  }
  const m = read('../public/methodology.html');
  assert.doesNotMatch(m, /donors who benefited from/);
});

// Full check (Brit, Oct 27, 2026): "the comparison blocks have to have the exact same numerator and denominator and
// descriptor across two candidates". Every candidate in a race with a full check gets one, with the same words.
test('full check: both candidates in a race get the same line, from headlines.json', () => {
  const FC = JSON.parse(read('../scripts/data/full-check/headlines.json')).people;
  const races = {};
  for (const [k, pid] of Object.entries(saved.byBallot)) if (FC[pid]) (races[k.split('|')[0]] = races[k.split('|')[0]] || []).push(pid);
  for (const [race, pids] of Object.entries(races)) {
    const all = Object.entries(held.byBallot).filter(([k]) => k.split('|')[0] === race).map(([, pid]) => pid);
    assert.deepEqual(pids.sort(), all.sort(), race + ': every candidate has a full check');
    const shapes = pids.map(pid => {
      const p = saved.people[pid], f = FC[pid];
      assert.deepEqual([p.fullCheck.decisions, p.fullCheck.helped, p.fullCheck.amount, p.fullCheck.donors], [f.decisions, f.helped, f.amount, f.donors], pid);
      for (const lang of ['en', 'es', 'ht']) assert.doesNotMatch(render(p, lang), /undefined|NaN|null/, pid + ' ' + lang);
      return render(p, 'en').replace(/\$[\d,]+|\d[\d,]*/g, '#').replace(/\b(him|her|he|she|his)\b/g, 'P').split('Record checked')[0];
    });
    assert.ok(shapes.every(s => s === shapes[0]), race + ': same descriptor');
  }
});
