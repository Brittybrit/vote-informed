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
// The headline (tax dollars to a business the candidate or their spouse owns or runs, or an official act
// of theirs that sent money to one) is written by hand in headlines.json, each with its sources.
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const dir = path.join(here, 'data', 'business');
const readLines = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(l => l.trim()).flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } }) : [];
const slices = fs.readdirSync(dir).filter(d => /^s\d/.test(d) && fs.statSync(path.join(dir, d)).isDirectory());
const interests = slices.flatMap(s => readLines(path.join(dir, s, 'interests.jsonl')));
const ties = slices.flatMap(s => readLines(path.join(dir, s, 'ties.jsonl')));
const headlines = JSON.parse(fs.readFileSync(path.join(dir, 'headlines.json'), 'utf8'));
// shown elsewhere (public/data/connections.json) or held for a check that is not done
const SKIP = new Set(headlines._skip || []);

const RELIEF = /\b(PPP|paycheck protection|EIDL|economic injury|disaster loan|shuttered venue|SVOG|SBA|HEERF)\b|COVID-19 (grant|loan)|Higher Education Emergency Relief/i;
const norm = s => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ')
  .replace(/\b(inc|incorporated|llc|pllc|pa|p a|corp|corporation|co|company|ltd|the|d b a|dba)\b/g, ' ').replace(/\s+/g, ' ').trim();
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
  const k = norm(i.business);
  if (p.interests.some(x => norm(x.business) === k)) continue;
  p.interests.push({ business: tidy(i.business), role: ROLE[i.role] || 'other', label: i.record.label || '', url: i.record.url });
}
const known = (pid, biz) => {
  const p = people[pid]; if (!p) return false;
  const k = norm(biz); if (!k) return false;
  return p.interests.some(x => { const n = norm(x.business); return n === k || (n.length >= 8 && k.length >= 8 && (n.startsWith(k) || k.startsWith(n))); });
};
for (const t of ties) {
  if (t.verified !== true || !t.pid || SKIP.has(t.pid)) continue;
  if (RELIEF.test([t.title, t.body, t.kind, t.amount].join(' '))) continue;
  if (!t.record || !/^https?:\/\//.test(t.record.url || '')) continue;
  // abstentions are about the candidate, not a named business; everything else needs a published interest
  if (t.kind !== 'abstention' && !(t.business || '').split(/;\s*/).some(b => known(t.pid, b))) continue;
  const p = people[t.pid] || (people[t.pid] = { interests: [], ties: [] });
  p.ties.push({ kind: t.kind, date: /^\d{4}/.test(t.date || '') ? String(t.date).slice(0, 10) : null, body: t.body || '', title: tidy(t.title),
    amount: t.amount == null || t.amount === 'None' ? null : String(t.amount), vote: t.candidateVote && t.candidateVote !== 'n/a' ? t.candidateVote : null,
    business: t.business || null, label: t.record.label || '', url: t.record.url,
    ...(t.class ? { helps: t.class } : {}), ...(t.analysis && t.analysis.url ? { analysis: t.analysis.url } : {}),
    ...(t.basis === 'lastDisclosed' || t.basis === 'bridged' ? { basis: t.basis, formYear: t.formYear || null } : {}) });
}
for (const [pid, h] of Object.entries(headlines)) {
  if (pid.startsWith('_')) continue;
  const p = people[pid] || (people[pid] = { interests: [], ties: [] });
  p.headline = h.headline; if (h.note) p.headlineNote = h.note;
}
for (const p of Object.values(people)) p.ties.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
for (const [pid, p] of Object.entries(people)) if (!p.interests.length && !p.ties.length && !p.headline) delete people[pid];

fs.writeFileSync(path.join(here, '..', 'public', 'data', 'business.json'), JSON.stringify({
  updated: new Date().toISOString().slice(0, 10),
  note: 'Business interests from each candidate\'s own filing (or a Sunbiz listing matching name and address) and the government contracts, grants, payments and votes tied to them, each from an official record. Relief programs open to any eligible business are not counted. Rebuild: node scripts/business.mjs.',
  people
}, null, 1) + '\n');
const n = Object.values(people);
console.log('business.json:', n.length, 'candidates |', n.reduce((a, p) => a + p.interests.length, 0), 'interests |', n.reduce((a, p) => a + p.ties.length, 0), 'ties |', n.filter(p => p.headline).length, 'headlines');
