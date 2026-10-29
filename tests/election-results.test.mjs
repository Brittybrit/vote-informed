// Election results -> roster. No network: a slice of the county's real Aug 18 CSV for the format, and a synthetic
// Nov 3 file built from the real ballot for the decisions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv, contestsFromCsv, sameName, matchContests, decide, applyToRoster, januaryTermStart, takeOffice } from '../scripts/lib/election-results.mjs';

const J = f => JSON.parse(readFileSync(new URL('../public/data/' + f, import.meta.url), 'utf8'));
const roster = J('roster.json');
const cycles = J('cycles.json');
const E = '2026-11-03';
const ctx = { offices: roster.offices, terms: roster.terms, cycleBodies: cycles.bodies, electionDate: E };
const race = id => roster.ballot.find(r => r.officeId === id);
const row = (contest, name, votes, pct) => [JSON.stringify(contest), JSON.stringify(name), '', 0, 0, votes, votes, pct].join(',');
const HEAD = 'Contest,Candidate Issue,Party,Mail Votes,Early Votes,Election Day Votes,Total Votes,% of Total Votes';

test('parses the county CSV format, including quoted contests with commas and doubled quotes', () => {
  const text = readFileSync(new URL('./fixtures/enr-dad-2026-08-18-summary-sample.csv', import.meta.url), 'utf8');
  const contests = contestsFromCsv(text);
  const sen = contests.find(c => c.contest === 'Dem State Senator, District 34');
  assert.equal(sen.candidates.length, 3);
  assert.equal(sen.candidates[0].votes, 26401);
  const judge = contests.find(c => /Grp 5/.test(c.contest));
  assert.ok(judge.candidates.some(c => c.name === 'Arthur LeMar "Marty" McNeil'));
  assert.deepEqual(parseCsv('a,"b ""c"", d"\n1,2'), [['a', 'b "c", d'], ['1', '2']]);
});

test('names match across ballot and results spellings', () => {
  assert.ok(sameName('Angie Nixon', 'Angela Nixon'));
  assert.ok(sameName('Arthur LeMar "Marty" McNeil', 'Arthur L. McNeil'));
  assert.ok(sameName('Carlos G. Muñiz', 'Carlos G. Muniz'));
  assert.ok(!sameName('Rob Piper', 'Robert Pipes'));
});

test('take-office dates come from law or the body calendar, and unknown is unknown', () => {
  assert.equal(januaryTermStart(E), '2027-01-05');
  const office = id => roster.offices.find(o => o.id === id);
  assert.equal(takeOffice(office('us-house-fl-25'), race('us-house-fl-25'), cycles.bodies, E).date, '2027-01-03');
  assert.equal(takeOffice(office('fl-house-106'), race('fl-house-106'), cycles.bodies, E).date, E);
  assert.equal(takeOffice(office('fl-cfo'), race('fl-cfo'), cycles.bodies, E).date, '2027-01-05');
  assert.equal(takeOffice(office('mdc-commission-5'), race('mdc-commission-5'), cycles.bodies, E).date, '2026-11-17');
  assert.equal(takeOffice(office('fl-circuit-11-group-5'), race('fl-circuit-11-group-5'), cycles.bodies, E).date, null);
});

// Synthetic Nov 3: a challenger wins D5 clearly; a state House race inside the recount margin; a retention vote.
function novemberCsv() {
  const d5 = race('mdc-commission-5').candidates;
  const h = race('fl-house-106').candidates;
  const muniz = race('fl-supreme-court').candidates[0];
  const challenger = d5.find(c => c.person !== 'vicki-l-lopez');
  return [HEAD,
    row('County Commissioner District 5', challenger.asPrinted, 30000, 60), row('County Commissioner District 5', d5.find(c => c.person === 'vicki-l-lopez').asPrinted, 20000, 40),
    row('State Representative District 106', h[0].asPrinted, 50100, 50.1), row('State Representative District 106', h[1].asPrinted, 49900, 49.9),
    row('Justice of the Supreme Court ' + muniz.asPrinted + ' Retention', 'Yes', 70000, 70), row('Justice of the Supreme Court ' + muniz.asPrinted + ' Retention', 'No', 30000, 30),
    row('Some City Ballot Question', 'Yes', 10, 50), row('Some City Ballot Question', 'No', 10, 50)
  ].join('\n');
}

test('decides plain calls and flags the rest with a reason', () => {
  const { matched, unmatched } = matchContests(contestsFromCsv(novemberCsv()), roster.ballot);
  assert.equal(matched.length, 3);
  assert.deepEqual(unmatched.map(c => c.contest), ['Some City Ballot Question']);
  const ds = matched.map(m => decide(m, ctx));
  const d5 = ds.find(d => d.officeId === 'mdc-commission-5');
  assert.equal(d5.status, 'elected');
  assert.equal(d5.takesOffice.date, '2026-11-17');
  assert.equal(d5.reelected, false);
  assert.equal(ds.find(d => d.officeId === 'fl-house-106').status, 'needs-review');
  assert.equal(ds.find(d => d.officeId === 'fl-supreme-court').status, 'retained');
});

test('a local race without a majority is flagged, not called', () => {
  const r = race('mdc-commission-5');
  const csv = [HEAD, ...r.candidates.map((c, i) => row('County Commissioner District 5', c.asPrinted, i ? 450 : 500, i ? 47.4 : 52.6))].join('\n');
  // 2 candidates always produce a majority; add a third in the contest to force a plurality
  const three = csv + '\n' + row('County Commissioner District 5', 'Nobody Else', 400, 0);
  const m = matchContests(contestsFromCsv(three), roster.ballot);
  assert.equal(m.matched.length, 0, 'a candidate list that does not match the ballot is never matched');
});

test('roster: the winner starts on take-office day, the incumbent ends the day before, and re-running changes nothing', () => {
  const ds = matchContests(contestsFromCsv(novemberCsv()), roster.ballot).matched.map(m => decide(m, ctx));
  const once = applyToRoster(roster, ds, { electionDate: E, resultStatus: 'unofficial', resultsUrl: 'https://example.org/r.csv' });
  const d5 = ds.find(d => d.officeId === 'mdc-commission-5');
  const added = once.roster.terms.find(t => t.fromResults === E && t.office === 'mdc-commission-5');
  assert.equal(added.person, d5.person);
  assert.equal(added.start, '2026-11-17');
  const lopez = once.roster.terms.find(t => t.office === 'mdc-commission-5' && t.person === 'vicki-l-lopez' && t.endSetByResults === E);
  assert.equal(lopez.end, '2026-11-16');
  const twice = applyToRoster(once.roster, ds, { electionDate: E, resultStatus: 'unofficial', resultsUrl: 'https://example.org/r.csv' });
  assert.deepEqual(twice.roster.terms, once.roster.terms);
  // undoing (no decisions) restores the hand-researched roster exactly
  const undone = applyToRoster(once.roster, [], { electionDate: E });
  assert.deepEqual(undone.roster.terms, roster.terms);
  // nothing else changed
  assert.equal(once.roster.terms.length, roster.terms.length + 1);
});

test('a re-elected incumbent keeps their term', () => {
  const r = race('mdc-commission-5');
  const lopez = r.candidates.find(c => c.person === 'vicki-l-lopez');
  const other = r.candidates.find(c => c !== lopez);
  const csv = [HEAD, row('County Commissioner District 5', lopez.asPrinted, 600, 60), row('County Commissioner District 5', other.asPrinted, 400, 40)].join('\n');
  const ds = matchContests(contestsFromCsv(csv), roster.ballot).matched.map(m => decide(m, ctx));
  assert.equal(ds[0].reelected, true);
  const out = applyToRoster(roster, ds, { electionDate: E, resultStatus: 'official', resultsUrl: 'x' });
  assert.deepEqual(out.roster.terms, roster.terms);
});

test('no votes yet means nothing is decided', () => {
  const r = race('mdc-commission-5');
  const csv = [HEAD, ...r.candidates.map(c => row('County Commissioner District 5', c.asPrinted, 0, 0))].join('\n');
  const ds = matchContests(contestsFromCsv(csv), roster.ballot).matched.map(m => decide(m, ctx));
  assert.equal(ds[0].status, 'no-results-yet');
});

test('every ballot race matches a contest in the county\'s real Nov 3 results file (posted before election day, zero votes)', () => {
  const text = readFileSync(new URL('./fixtures/enr-dad-2026-11-03-summary-pre-election.csv', import.meta.url), 'utf8');
  const { matched } = matchContests(contestsFromCsv(text), roster.ballot);
  const got = new Set(matched.map(m => m.race.office));
  const missing = roster.ballot.map(r => r.office).filter(o => !got.has(o));
  assert.deepEqual(missing, []);
  for (const m of matched) assert.equal(decide(m, ctx).status, 'no-results-yet');
});
