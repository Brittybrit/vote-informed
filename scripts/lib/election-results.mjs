// Election results -> roster terms. Pure functions; scripts/election-results.mjs does the fetching and writing.
//
// What it decides, and what it refuses to decide:
// - A contest is matched to a ballot race by its candidates' names, not by title, so county title wording cannot
//   mis-assign a result. Retention races are matched by the judge's name in the contest title.
// - A winner is applied to the roster only when the call is plain: votes are in, the margin between the top two is
//   above Florida's 0.5% machine-recount threshold (s. 102.141, F.S.), a local race was won with a majority (some
//   charters force a runoff otherwise), the seat is single-member, and the date the winner takes office is sourced.
//   Everything else is written to the results file as "needs-review" with the reason, and the roster is left alone.
// - The new term starts the day the winner takes office, so the site keeps showing the current official until then.
//   The outgoing official's open term ends the day before. Re-elected incumbents keep their term unchanged.
// - Every change it makes carries a marker (fromResults / endSetByResults = election date), and every run first
//   removes its own previous changes, so re-running is safe and hand-researched terms are never touched.

import { seatedOn } from '../../src/api.js';   // the one rule for who holds a seat on a day

export const RECOUNT_MARGIN_PCT = 0.5;
export const RECOUNT_SOURCE = 'http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0102/Sections/0102.141.html';

// Minimal RFC 4180 CSV parser: quoted fields, doubled quotes, newlines inside quotes.
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  const s = String(text).replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// County "CandidateSummaryResultsbyParty" CSV -> contests [{ contest, candidates: [{ name, party, votes, pct }] }]
export function contestsFromCsv(text) {
  const [head, ...rows] = parseCsv(text);
  if (!head) return [];
  const col = n => head.findIndex(h => h.trim().toLowerCase() === n);
  const C = { contest: col('contest'), name: col('candidate issue'), party: col('party'), total: col('total votes'), pct: col('% of total votes') };
  if (Object.values(C).some(i => i < 0)) throw new Error('results CSV columns changed: ' + head.join(' | '));
  const by = new Map();
  for (const r of rows) {
    const contest = (r[C.contest] || '').replace(/\s+/g, ' ').trim();
    if (!contest) continue;
    if (!by.has(contest)) by.set(contest, { contest, candidates: [] });
    by.get(contest).candidates.push({ name: (r[C.name] || '').trim(), party: (r[C.party] || '').trim() || null, votes: Number(String(r[C.total]).replace(/,/g, '')) || 0, pct: Number(r[C.pct]) || 0 });
  }
  return [...by.values()];
}

// "Arthur LeMar ""Marty"" McNeil" / "Arthur L. McNeil" -> tokens without accents, nicknames or initials
export function nameTokens(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/"[^"]*"|''[^']*''|\([^)]*\)/g, ' ').replace(/[^a-z\s-]/g, ' ').replace(/-/g, ' ')
    .split(/\s+/).filter(t => t.length > 1 && !/^(jr|sr|ii|iii|iv)$/.test(t));
}

// Same person if the last names match and the first names share their first 3 letters ("Angie" / "Angela",
// "Rob" / "Robert"). Only ever compared within one race's short candidate list.
export function sameName(a, b) {
  const x = nameTokens(a), y = nameTokens(b);
  if (!x.length || !y.length) return false;
  if (x[x.length - 1] !== y[y.length - 1]) return false;
  const f = x[0], g = y[0];
  return f === g || (f.length >= 3 && g.length >= 3 && f.slice(0, 3) === g.slice(0, 3));
}

// Running mates (governor tickets) are listed on the ballot as their own entries; results list the ticket once.
const tickets = race => (race.candidates || []).filter(c => c.runningMate !== true);
const isRetention = race => race.judicial && tickets(race).length === 1;
// Retention titles abbreviate middle names ("Bronwyn C. Miller"), so match on first and last name.
const retentionMatch = (race, title) => { const n = nameTokens(race.candidates[0].asPrinted), t = nameTokens(title); return t.includes(n[0]) && t.includes(n[n.length - 1]); };
const isYesNo = c => c.candidates.length === 2 && c.candidates.every(x => /^(yes|no)$/i.test(x.name));

// Pair each results contest with a ballot race. Returns { matched: [{ contest, race }], unmatched: [contest] }.
export function matchContests(contests, ballot) {
  const matched = [], unmatched = [], used = new Set();
  for (const c of contests) {
    let race = null;
    if (isYesNo(c)) {
      race = ballot.find((r, i) => !used.has(i) && isRetention(r) && retentionMatch(r, c.contest) && (used.add(i), true));
    } else {
      const named = c.candidates.filter(x => !/^(write-?in|over ?votes|under ?votes)/i.test(x.name));
      race = ballot.find((r, i) => {
        if (used.has(i) || isRetention(r) || tickets(r).length !== named.length) return false;
        const ok = named.every(x => tickets(r).some(b => sameName(b.asPrinted, x.name)));
        if (ok) used.add(i);
        return ok;
      });
    }
    if (race) matched.push({ contest: c, race }); else unmatched.push(c);
  }
  return { matched, unmatched };
}

const plusDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
// First Tuesday after the first Monday in January of the year after the election.
export function januaryTermStart(electionDate) {
  const y = Number(electionDate.slice(0, 4)) + 1;
  for (let d = 2; d <= 8; d++) { const day = new Date(Date.UTC(y, 0, d)); if (day.getUTCDay() === 2) return day.toISOString().slice(0, 10); }
  return null;
}

export const LAW = {
  usCongress: 'https://constitution.congress.gov/constitution/amendment-20/',
  flLegislature: 'https://www.flsenate.gov/Laws/Constitution#A3S15',
  flExecutive: 'https://www.flsenate.gov/Laws/Constitution#A4S05',
  flJudicialRetention: 'https://www.flsenate.gov/Laws/Constitution#A5S10'
};

// When the winner of this office takes office, with the source that says so. null date = not sourced: review.
export function takeOffice(office, race, cycleBodies, electionDate) {
  const id = office.id;
  if (office.level === 'federal') return { date: Number(electionDate.slice(0, 4)) + 1 + '-01-03', source: LAW.usCongress, rule: 'U.S. Constitution, 20th Amendment: January 3' };
  if (/^fl-(house|senate)-/.test(id)) return { date: electionDate, source: LAW.flLegislature, rule: 'Fla. Const. art. III, s. 15(d): legislators take office upon election' };
  if (office.level === 'state') return { date: januaryTermStart(electionDate), source: LAW.flExecutive, rule: 'Fla. Const. art. IV, s. 5: first Tuesday after the first Monday in January' };
  if (race && isRetention(race)) return { date: januaryTermStart(electionDate), source: LAW.flJudicialRetention, rule: 'Fla. Const. art. V, s. 10(a): retained term begins the first Tuesday after the first Monday in January' };
  if (office.level === 'judicial') return { date: null, source: null, rule: 'Start date for a newly elected judge is not sourced yet' };
  const body = (cycleBodies || []).find(b => b.rosterBody === office.body);
  const p = body && (body.phases || []).find(p => p.key === 'swearing-in' && p.start && p.start >= electionDate && p.start <= plusDays(electionDate, 120));
  if (p) return { date: p.start, source: p.source, rule: p.name || 'Swearing-in from the body\'s own calendar' };
  return { date: null, source: null, rule: 'Swearing-in date for this body is not sourced yet' };
}

const seatedOnDay = seatedOn;

// One matched contest -> a decision.
export function decide({ contest, race }, { offices, terms, cycleBodies, electionDate }) {
  const office = offices.find(o => o.id === race.officeId);
  const base = { contest: contest.contest, office: race.office, officeId: race.officeId, candidates: contest.candidates.map(c => ({ ...c, person: tickets(race).find(b => sameName(b.asPrinted, c.name))?.person || null })) };
  if (!office) return { ...base, status: 'needs-review', reason: 'Office ' + race.officeId + ' is not in the roster' };
  const total = contest.candidates.reduce((s, c) => s + c.votes, 0);
  if (!total) return { ...base, status: 'no-results-yet', reason: 'No votes reported yet' };
  const sorted = [...contest.candidates].sort((a, b) => b.votes - a.votes);
  const pct = c => (c.votes / total) * 100;
  const office_ = takeOffice(office, race, cycleBodies, electionDate);

  if (isRetention(race)) {
    const yes = contest.candidates.find(c => /^yes$/i.test(c.name));
    const retained = pct(yes) > 50;
    if (Math.abs(pct(yes) - 50) * 2 <= RECOUNT_MARGIN_PCT) return { ...base, status: 'needs-review', reason: 'Within the 0.5% recount margin', recountSource: RECOUNT_SOURCE };
    return { ...base, status: retained ? 'retained' : 'not-retained', person: race.candidates[0].person, yesPct: Math.round(pct(yes) * 100) / 100, takesOffice: office_ };
  }

  const [first, second] = sorted;
  const winner = base.candidates.find(c => c.name === first.name);
  if (second && pct(first) - pct(second) <= RECOUNT_MARGIN_PCT) return { ...base, status: 'needs-review', leader: winner.person, reason: 'Top two within the 0.5% recount margin', recountSource: RECOUNT_SOURCE };
  if (['municipal', 'county', 'school', 'special-district'].includes(office.level) && pct(first) <= 50) return { ...base, status: 'needs-review', leader: winner.person, reason: 'No majority; the charter may require a runoff' };
  const concurrent = terms.filter(t => t.office === office.id && seatedOnDay(t, electionDate));
  if (concurrent.length > 1) return { ...base, status: 'needs-review', leader: winner.person, reason: 'Multi-seat race: who fills which seat needs a person' };
  if (!winner.person) return { ...base, status: 'needs-review', reason: 'Winner ' + first.name + ' is not matched to a roster person' };
  const incumbent = concurrent[0] && concurrent[0].person;
  return { ...base, status: 'elected', person: winner.person, incumbent: incumbent || null, reelected: incumbent === winner.person, winnerPct: Math.round(pct(first) * 100) / 100, takesOffice: office_ };
}

// Remove this election's previous changes, then apply the current decisions. Returns { roster, applied, skipped }.
export function applyToRoster(roster, decisions, { electionDate, resultStatus, resultsUrl }) {
  // Work on a copy. A term this job ended carries endSetByResults plus endBeforeResults (its original end and
  // endKnown), so removing the job's changes restores it exactly.
  const terms = structuredClone(roster.terms)
    .filter(t => t.fromResults !== electionDate)
    .map(t => {
      if (t.endSetByResults !== electionDate) return t;
      const { endSetByResults, endBeforeResults, ...rest } = t;
      const out = { ...rest, end: endBeforeResults.end };
      if (endBeforeResults.endKnown === undefined) delete out.endKnown; else out.endKnown = endBeforeResults.endKnown;
      return out;
    });
  const endIt = (t, day) => { t.endBeforeResults = { end: t.end, endKnown: t.endKnown }; t.end = day; t.endKnown = true; t.endSetByResults = electionDate; };
  const applied = [], skipped = [];
  for (const d of decisions) {
    const start = d.takesOffice && d.takesOffice.date;
    if (d.status === 'elected' && d.reelected) { skipped.push({ officeId: d.officeId, why: 're-elected incumbent; term continues' }); continue; }
    if (!['elected', 'not-retained'].includes(d.status)) continue;
    if (!start) { skipped.push({ officeId: d.officeId, why: d.takesOffice ? d.takesOffice.rule : 'no take-office date' }); continue; }
    const dayBefore = plusDays(start, -1);
    for (const t of terms) {
      if (t.office !== d.officeId || t.end != null || t.fromResults) continue;
      if (d.status === 'not-retained' && t.person !== d.person) continue;
      if (seatedOnDay(t, dayBefore) && t.person !== d.person) endIt(t, dayBefore);
      else if (d.status === 'not-retained' && t.person === d.person) endIt(t, dayBefore);
    }
    if (d.status === 'elected') {
      terms.push({ person: d.person, office: d.officeId, start, end: null, via: 'elected', electedOn: electionDate, sources: [resultsUrl, d.takesOffice.source].filter(Boolean), sourceKind: 'official', startSourceKind: 'official', fromResults: electionDate, resultStatus });
    }
    applied.push({ officeId: d.officeId, person: d.person || null, status: d.status, start });
  }
  return { roster: { ...roster, terms }, applied, skipped };
}
