// The in-browser reading of an uploaded sample ballot: election date, precinct, and which
// precinct-unplaceable races (CDDs) the ballot's own text shows.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../public/precinct-filter.js', import.meta.url), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(new URL('../public/quick-ballot.js', import.meta.url), 'utf8'), ctx);
const q = ctx.window.quickBallot, pf = ctx.window.precinctFilter;

test('election date: this election, an old one, or no date', () => {
  assert.equal(q.electionCheck('Official General Election Ballot November 3, 2026 Miami-Dade'), 'this');
  assert.equal(q.electionCheck('Official General Election Ballot November 5, 2024 Miami-Dade'), 'other');
  assert.equal(q.electionCheck('Primary Election August 18, 2026'), 'other');
  assert.equal(q.electionCheck('Sample ballot, no date'), '');
});

test('precinct: one printed precinct, or none when several or none appear', () => {
  assert.equal(q.precinctFromText('PRECINCT 033.0 ... PRECINCT 033.0', pf.normPrecinct), '033.0');
  assert.equal(q.precinctFromText('PRECINCT 33', pf.normPrecinct), '033.0');
  assert.equal(q.precinctFromText('PRECINCT 033.0 PRECINCT 104.0', pf.normPrecinct), '');
  assert.equal(q.precinctFromText('no precinct here', pf.normPrecinct), '');
});

test('unplaceable races are kept only when the ballot text shows them', () => {
  const races = [
    { office: 'Rainbow Lakes CDD Seat 1', candidates: [{ name: 'Pat Example' }] },
    { office: 'Sunrise Ridge CDD Seat 2', candidates: [{ name: 'Lee Sample' }] },
    { office: 'United States Senator', candidates: [{ name: 'Ashley Moody' }] }
  ];
  const seen = q.seenOnBallot(races, 'Rainbow Lakes CDD Seat 1  PAT EXAMPLE', (r, i) => i < 2);
  assert.deepEqual(Array.from(seen), [0]);
});
