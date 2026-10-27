// Candidates' business interests and the government money and votes tied to them.
//
//   node scripts/business.mjs      # reads scripts/data/business/s*/ (interests.jsonl, ties.jsonl) and
//                                  # scripts/data/business/headlines.json; writes public/data/business.json
//
// Published only:
// - interests from the candidate's own filing (Form 6, Form 1, federal disclosure) or a Sunbiz listing that
//   matches both name and address; name-only Sunbiz matches stay out
// - ties a reviewer opened in an official record (verified: true), for a business that passes the rule above
// - no relief programs any eligible business could apply for (PPP, EIDL, SBA COVID-era loans and grants,
//   Shuttered Venue grants, college emergency relief formula grants): not official acts (Brit, Oct 25, 2026)
// - a tie matches a disclosed interest only by exact entity name (normalized: punctuation, Inc/LLC/Corp suffixes
//   and "the" dropped) or a curated alias in scripts/data/business/aliases.json, never by prefix
// - a tie to an official action of their own body counts only when they cast a vote on it (yes or no; the
//   money-summary rule); absent, abstained or a vote the record does not give goes to the private list
// - a business the disclosure lists as a customer, client, tenant or source of income OF the person's company
//   (not the company itself) is held back to the private list
// Rules live in scripts/lib/business-rules.mjs (tests/business.test.mjs).
// The headline (tax dollars to a business the candidate or their spouse owns or runs, or an official act
// of theirs that sent money to one) is written by hand in headlines.json, each with its sources.
import fs from 'node:fs';
import path from 'node:path';
import { normEntity as norm, entityNames, aliasIndex, anySame, isCustomerOf, voteCounts, inWindow as inSpans, yearsFor as yearsIn, evidence as evidenceFor, endedBefore as endedIn } from './lib/business-rules.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const dir = path.join(here, 'data', 'business');
const readLines = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(l => l.trim()).flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } }) : [];
const slices = fs.readdirSync(dir).filter(d => /^s\d/.test(d) && fs.statSync(path.join(dir, d)).isDirectory());
const interests = slices.flatMap(s => readLines(path.join(dir, s, 'interests.jsonl')));
const ties = slices.flatMap(s => readLines(path.join(dir, s, 'ties.jsonl')));
const headlines = JSON.parse(fs.readFileSync(path.join(dir, 'headlines.json'), 'utf8'));
// shown elsewhere (public/data/connections.json) or held for a check that is not done
const SKIP = new Set(headlines._skip || []);
// listing key for an interest (dedupe within a person's list): the name with its parenthetical kept
const listKey = s => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ')
  .replace(/\b(inc|incorporated|llc|pllc|pa|p a|corp|corporation|co|company|ltd|the|d b a|dba)\b/g, ' ').replace(/\s+/g, ' ').trim();
const ALIAS = aliasIndex(fs.existsSync(path.join(dir, 'aliases.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'aliases.json'), 'utf8')) : {});

const RELIEF = /\b(PPP|paycheck protection|EIDL|economic injury|disaster loan|shuttered venue|SVOG|SBA|HEERF)\b|COVID-19 (grant|loan)|Higher Education Emergency Relief/i;
// Street addresses are scrubbed from the review files ("[address]"); tidy what is left for the page
const tidy = v => String(v || '').replace(/\s*\((?:\[address\][;,\s]*)+\)/g, '').replace(/\s*\bat \[address\],?/g, '').replace(/,?\s*\[address\],?/g, ',').replace(/,\s*,/g, ',').replace(/,\s*$/, '').replace(/\s+,/g, ',').trim();
const ROLE = { owner: 'owner', 'spouse owner': 'spouse', officer: 'officer', director: 'director', manager: 'officer',
  employee: 'employer', employer: 'employer', 'income source': 'income', client: 'client' };

const people = {};
for (const i of interests) {
  if (!i.pid || !i.business || SKIP.has(i.pid)) continue;
  if (!/^form$|name\+address/.test(i.basis || '')) continue;
  if (!i.record || !/^https?:\/\//.test(i.record.url || '')) continue;
  const p = people[i.pid] || (people[i.pid] = { interests: [], ties: [] });
  const k = listKey(i.business);
  if (p.interests.some(x => listKey(x.business) === k)) continue;
  p.interests.push({ business: tidy(i.business), role: ROLE[i.role] || 'other', label: i.record.label || '', url: i.record.url });
}
const known = (pid, biz) => { const p = people[pid]; return !!p && p.interests.some(x => anySame(x.business, biz, ALIAS)); };
// Disclosure window (Brit, Oct 26, 2026): a tie is published only when, on the date of the action or payment, the person
// held an office whose disclosure law required a form covering that year, and a form (or record) for that year shows the
// business (or the latest form shows it, labeled "last disclosed"). Everything else goes to the private review list.
const spans = {}; // pid -> [[from, to]]
const addSpan = (pid, a, b) => { if (!pid || !a) return; (spans[pid] = spans[pid] || []).push([String(a).slice(0, 10), b ? String(b).slice(0, 10) : '9999-12-31']); };
const pub = path.join(here, '..', 'public', 'data');
const rj = f => JSON.parse(fs.readFileSync(f, 'utf8'));
for (const f of fs.readdirSync(path.join(pub, 'prior')).filter(f => f.endsWith('.json') && f !== 'index.json')) {
  const d = rj(path.join(pub, 'prior', f)); for (const o of d.offices || []) addSpan(d.pid, o.start, o.end);
}
for (const [pid, p] of Object.entries(rj(path.join(pub, 'offices-held.json')).people || {})) for (const t of p.terms || []) addSpan(pid, t.start, t.end);
for (const f of fs.readdirSync(path.join(pub, 'decisions')).filter(f => f.endsWith('.json') && f !== 'index.json')) {
  const d = rj(path.join(pub, 'decisions', f)), seen = {};
  for (const body of d.bodies || [d]) {
    const mem = {}; for (const m of body.members || []) if (m.person) mem[m.key] = m.person;
    for (const a of body.actions || []) for (const k of Object.keys(a.roll || {})) { const pid = mem[k]; if (!pid || !a.date) continue;
      const s = seen[pid] = seen[pid] || [a.date, a.date]; if (a.date < s[0]) s[0] = a.date; if (a.date > s[1]) s[1] = a.date; }
  }
  for (const [pid, [a, b]] of Object.entries(seen)) addSpan(pid, a.slice(0, 4) + '-01-01', b.slice(0, 4) + '-12-31');
}
const inWindow = (pid, d) => inSpans(spans, pid, d);
// years each business is shown on that person's forms
const formYearsBy = {}; // pid|normbiz -> { pid, business, years }
const addYear = (pid, biz, y) => { if (!pid || !biz || !y) return; const k = pid + '|' + norm(biz); (formYearsBy[k] = formYearsBy[k] || { pid, business: biz, years: new Set() }).years.add(Number(y)); };
for (const d of fs.readdirSync(dir).filter(d => /^history-\d+$/.test(d))) for (const r of readLines(path.join(dir, d, 'history.jsonl'))) if (!r.missing && r.business && r.year) addYear(r.pid, r.business, r.year);
for (const i of interests) { const y = Number(String((i.record || {}).date || '').slice(0, 4)); if (y) { addYear(i.pid, i.business, y - 1); addYear(i.pid, i.business, y); } }
const formYears = () => Object.values(formYearsBy);
const yearsFor = (pid, biz) => yearsIn(formYears(), pid, biz, ALIAS);
const evidence = (t, y) => evidenceFor(t, y, yearsFor(t.pid, t.business || ''));
const privateTies = [];
// Sunbiz end dates for businesses shown only as "last disclosed" (s9-history/sunbiz.jsonl): a tie dated after the
// business was dissolved is not published (Brit's rule 3, Oct 26, 2026)
const SB = readLines(path.join(dir, 's9-history', 'sunbiz.jsonl'));
const endedBefore = (t, d) => endedIn(SB, t, d, ALIAS);
// The disclosed interest a tie's business is, by exact name or curated alias
const interestOf = t => interests.find(i => i.pid === t.pid && i.business && anySame(i.business, t.business, ALIAS));
for (const t of ties) {
  if (t.verified !== true || !t.pid || SKIP.has(t.pid)) continue;
  if (RELIEF.test([t.title, t.body, t.kind, t.amount].join(' '))) continue;
  {
    const d = /^\d{4}-\d\d-\d\d/.test(t.date || '') ? String(t.date).slice(0, 10) : null;
    const why = !d ? 'no date on the record' : !inWindow(t.pid, d) ? 'not in an office that required disclosure on that date'
      : t.kind !== 'abstention' && !entityNames(t.business).some(b => known(t.pid, b)) ? 'no published interest has this exact name'
      : !evidence(t, Number(d.slice(0, 4))) ? 'no disclosure form for that year shows the business'
      : endedBefore(t, d) ? 'Sunbiz shows the business dissolved on ' + endedBefore(t, d).dissolved + ', before this date'
      : !voteCounts(t) ? 'no vote cast: the record shows ' + (t.candidateVote && t.candidateVote !== 'n/a' ? t.candidateVote : 'no vote by them') + ' on this action'
      : t.kind !== 'abstention' && isCustomerOf(interestOf(t)) ? 'the disclosure lists the business as a customer or source of income of a company they own, not as their own business' : null;
    if (why) { privateTies.push({ pid: t.pid, date: d, business: t.business, title: tidy(t.title), body: t.body, why, record: t.record }); continue; }
    if (!t.basis) { const e = evidence(t, Number(d.slice(0, 4))); if (e === 'lastDisclosed' || e === 'bridged') { t.basis = e; t.formYear = t.formYear || Math.max(...[...yearsFor(t.pid, t.business || '')].filter(y => y < Number(d.slice(0, 4)))); } }
  }
  if (RELIEF.test([t.title, t.body, t.kind, t.amount].join(' '))) continue;
  if (!t.record || !/^https?:\/\//.test(t.record.url || '')) continue;
  // abstentions are about the candidate, not a named business; everything else needs a published interest
  if (t.kind !== 'abstention' && !entityNames(t.business).some(b => known(t.pid, b))) continue;
  const p = people[t.pid] || (people[t.pid] = { interests: [], ties: [] });
  // how the business relates to the person, from their own form: owner, employer, officer, or a customer of their company
  const iv = interestOf(t);
  let rel = null;
  if (iv) {
    const nat = String(iv.nature || ''), via = nat.match(/(?:customer|source of income)(?:\s*\([^)]*\))? of ([^,;(]+?)(?:,|;|\(|$)/i);
    rel = /former employer/i.test(nat) ? { r: 'formerEmployer' } : via ? { r: 'customerOf', of: tidy(via[1]).replace(/\s*,?\s*which he owns$/i, '') }
      : { r: ROLE[iv.role] || 'other' };
  }
  p.ties.push({ ...(rel ? { rel } : {}), kind: t.kind, date: /^\d{4}/.test(t.date || '') ? String(t.date).slice(0, 10) : null, body: t.body || '', title: tidy(t.title),
    amount: t.amount == null || t.amount === 'None' ? null : String(t.amount), vote: t.candidateVote && t.candidateVote !== 'n/a' ? t.candidateVote : null,
    business: t.business || null, label: t.record.label || '', url: t.record.url,
    ...(t.class ? { helps: t.class } : {}), ...(t.analysis && t.analysis.url ? { analysis: t.analysis.url } : {}),
    ...(t.basis === 'lastDisclosed' || t.basis === 'bridged' ? { basis: t.basis, formYear: t.formYear || null } : {}) });
}
for (const [pid, h] of Object.entries(headlines)) {
  if (pid.startsWith('_')) continue;
  const p = people[pid] || (people[pid] = { interests: [], ties: [] });
  if (!p.ties.length) { privateTies.push({ pid, headline: h.headline.en, why: 'headline: every tie behind it is outside the disclosure window' }); continue; }
  p.headline = h.headline; if (h.note) p.headlineNote = h.note;
}
for (const p of Object.values(people)) p.ties.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
for (const [pid, p] of Object.entries(people)) if (!p.interests.length && !p.ties.length && !p.headline) delete people[pid];

fs.writeFileSync(path.join(dir, 'private-ties.json'), JSON.stringify({ note: 'Not published: ties outside the disclosure window or without a form for that year (Brit, Oct 26, 2026), ties to an action they cast no vote on, ties whose business matches no published interest by exact name, and ties to a customer or source of income of their company.', ties: privateTies }, null, 1) + '\n');
fs.writeFileSync(path.join(here, '..', 'public', 'data', 'business.json'), JSON.stringify({
  updated: new Date().toISOString().slice(0, 10),
  note: 'Business interests from each candidate\'s own filing (or a Sunbiz listing matching name and address) and the government contracts, grants, payments and votes tied to them, each from an official record. Relief programs open to any eligible business are not counted. Rebuild: node scripts/business.mjs.',
  people
}, null, 1) + '\n');
const n = Object.values(people);
console.log('business.json:', n.length, 'candidates |', n.reduce((a, p) => a + p.interests.length, 0), 'interests |', n.reduce((a, p) => a + p.ties.length, 0), 'ties |', n.filter(p => p.headline).length, 'headlines');
