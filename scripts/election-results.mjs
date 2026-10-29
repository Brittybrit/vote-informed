// Pulls the county's election-night results, decides which races are plainly called, and updates the roster so
// winners take their seats on the day they take office. Run by .github/workflows/election-results.yml; safe to re-run.
//   node scripts/election-results.mjs                 fetch, decide, write
//   node scripts/election-results.mjs --csv file.csv  use a local results file (testing, or a hand-downloaded file)
// Writes public/data/results-<date>.json (every contest, decided or flagged, with reasons) and public/data/roster.json.
// The rules for what gets applied and what gets flagged are in scripts/lib/election-results.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { contestsFromCsv, matchContests, decide, applyToRoster } from './lib/election-results.mjs';

const ELECTION_DATE = '2026-11-03';
const ENR = 'https://enr.electionsfl.org/DAD/';
const ENR_ID_SEARCH = { from: 4010, to: 4200 };   // Aug 18, 2026 primary was 4010; ids only go up
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const P = f => path.join(root, 'public', 'data', f);
const OUT = P('results-' + ELECTION_DATE + '.json');
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));

async function get(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Ballot305 results check (ballot305.org)' }, signal: AbortSignal.timeout(20000) });
  return { status: r.status, text: r.status === 200 ? await r.text() : '' };
}

// The county gives each election a numeric id; the Nov 3 page says "Election Date: 11/3/2026".
async function findElectionId(previous) {
  const want = /Election Date:\s*11\/3\/2026/;
  if (previous) { const r = await get(ENR + previous + '/Summary/'); if (want.test(r.text)) return previous; }
  for (let id = ENR_ID_SEARCH.from + 1; id <= ENR_ID_SEARCH.to; id++) {
    const r = await get(ENR + id + '/Summary/');
    if (want.test(r.text)) return id;
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const prev = fs.existsSync(OUT) ? readJson(OUT) : null;
  let csvText, resultsUrl, electionId = prev && prev.electionId, status = 'unofficial', countyUpdated = null;

  if (args[0] === '--csv') {
    csvText = fs.readFileSync(args[1], 'utf8'); resultsUrl = 'file:' + path.basename(args[1]);
  } else {
    electionId = await findElectionId(electionId);
    if (!electionId) { console.log('No Nov 3 results page on ' + ENR + ' yet. Nothing changed.'); return; }
    const reports = await get(ENR + electionId + '/Reports/');
    const summary = await get(ENR + electionId + '/Summary/');
    if (/Results are official/i.test(reports.text + summary.text)) status = 'official';
    const stamp = (summary.text.match(/last updated at:\s*([0-9\/: apm]+)/i) || [])[1];
    countyUpdated = stamp ? stamp.trim() : null;
    // Newest summary CSV on the Reports page (file names carry a timestamp)
    const links = [...reports.text.matchAll(/https:\/\/s3\.amazonaws\.com\/results\.voterfocus\.com\/[^"']*CandidateSummaryResultsbyParty_[^"']*\.csv/g)].map(m => m[0]).sort();
    resultsUrl = links[links.length - 1];
    if (!resultsUrl) { console.log('Results page found (id ' + electionId + ') but no summary CSV yet. Nothing changed.'); return; }
    csvText = (await get(resultsUrl)).text;
    if (!csvText) throw new Error('Could not download ' + resultsUrl);
  }

  const roster = readJson(P('roster.json'));
  const cycles = readJson(P('cycles.json'));
  const contests = contestsFromCsv(csvText);
  const { matched, unmatched } = matchContests(contests, roster.ballot);
  const ctx = { offices: roster.offices, terms: roster.terms, cycleBodies: cycles.bodies, electionDate: ELECTION_DATE };
  const decisions = matched.map(m => decide(m, ctx));
  const { roster: next, applied, skipped } = applyToRoster(roster, decisions, { electionDate: ELECTION_DATE, resultStatus: status, resultsUrl });

  const matchedIds = new Set(matched.map(m => m.race.office));
  const out = {
    election: ELECTION_DATE, electionId, status, countyUpdated, resultsUrl,
    resultsPage: electionId ? ENR + electionId + '/Summary/' : null,
    about: 'County election-night results matched to the ballot. A race is applied to the roster only when the call is plain (votes in, margin above the 0.5% recount threshold, a majority for local races, single seat, sourced take-office date); everything else is listed as needs-review with the reason. Winners take their seats in the roster on the date they take office.',
    counts: { contests: contests.length, matched: matched.length, unmatched: unmatched.length, applied: applied.length, needsReview: decisions.filter(d => d.status === 'needs-review').length },
    decisions, applied, skipped,
    unmatchedContests: unmatched.map(c => c.contest),
    ballotRacesWithoutResults: roster.ballot.filter(r => !matchedIds.has(r.office)).map(r => r.office)
  };
  // Write only when something other than the fetch time changed, so the workflow commits only real changes.
  const same = prev && JSON.stringify({ ...prev, fetchedAt: null }) === JSON.stringify({ ...out, fetchedAt: null });
  if (same) { console.log('No change since the last run.'); return; }
  out.fetchedAt = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  fs.writeFileSync(P('roster.json'), JSON.stringify(next, null, 1));
  console.log(`Status ${status}. ${contests.length} contests, ${matched.length} matched, ${applied.length} applied to the roster, ${out.counts.needsReview} need review, ${unmatched.length} unmatched (ballot questions and races outside the roster).`);
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
