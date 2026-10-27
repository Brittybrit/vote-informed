// Identity checks: every vote on the page belongs to the right person. Roll calls are keyed by surname, so a
// surname shared by two people seated at once can put a vote on the wrong person. Fails (exit 1) when
//   1. a member holds a vote dated outside their own terms on that body (public/data/roster.json),
//   2. a member's roll key also fits another roster person seated on the body that day (same surname, overlapping
//      or adjacent terms on the seat or body) and no disambiguating key separates them, and the member has a
//      recorded vote that day,
//   3. one person appears as two roster records (same name or same outside id),
//   4. public/data/offices-held.json and roster.json disagree on who held an office when.
// Run: node scripts/check-identities.mjs   (tests/identity.test.mjs runs the same checks)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const day = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : null;
// a term covers a date when it started on or before it and had not ended before it (same rule as tests/roster.test.mjs)
export function covers(t, date) {
  const s = day(t.start), e = day(t.end);
  if (s && date < s) return false;
  if (e && date > e) return false;
  if (!s && t.startKnown === false && t.servingFrom && date < t.servingFrom) return false;
  if (!e && t.endKnown === false && t.lastSeen && date > t.lastSeen) return false;
  if (!e && day(t.endBy) && date > t.endBy) return false;
  return true;
}
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const SUFFIX = /\b(jr|sr|ii|iii|iv|dr|esq)\b\.?/g;
// A person's name as words: nicknames in quotes or parentheses and suffixes dropped
const words = name => fold(name).replace(/".*?"|'.*?'|\(.*?\)/g, ' ').replace(SUFFIX, ' ').replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean);
export const nameKey = name => words(name).filter(w => w.length > 1).join(' ');
// Does a roll key ("Rodriguez", "G. Perez", "Cohen Higgins", "ValdesFauli", "Estimé-Irvin") fit this person's name?
export function keyFits(key, name) {
  const w = words(name); if (!w.length) return false;
  const k = fold(key).replace(/[^a-z. ]/g, ' ').trim();
  const init = k.match(/^([a-z])\.\s*(.+)$/);
  const sur = (init ? init[2] : k).replace(/[^a-z]/g, '');
  if (init && w[0][0] !== init[1]) return false;
  const joined = w.join('');
  return sur.length > 0 && joined.endsWith(sur) && (w.slice(1).some((_, i) => w.slice(i + 1).join('') === sur) || w.length === 1);
}

export function checkIdentities(R, H, D) {
  const out = [];
  const people = new Map(R.people.map(p => [p.id, p]));
  const offices = new Map(R.offices.map(o => [o.id, o]));
  const termsOn = (pid, body) => R.terms.filter(t => t.person === pid && (offices.get(t.office) || {}).body === body);

  for (const B of D.bodies || []) {
    const pidOf = k => (B.members.find(m => m.key === k) || {}).person;
    const seatedPeople = R.terms.filter(t => (offices.get(t.office) || {}).body === B.rosterBody);
    for (const a of B.actions || []) for (const [k, v] of Object.entries(a.roll || {})) {
      if (v == null) continue;
      const pid = pidOf(k);
      if (!pid) { out.push(`${B.key} ${a.id}: roll key ${k} is not a member`); continue; }
      // 1. the vote falls inside the member's own terms on this body
      const on = a.kind === 'request' && v === 'requested' && a.filedForSeat && a.filedForSeat > a.date ? a.filedForSeat : a.date;
      if (!termsOn(pid, B.rosterBody).some(t => covers(t, on))) out.push(`${B.key} ${a.id}: ${k} (${pid}) holds a vote on ${on}, outside their terms on ${B.rosterBody}`);
      // 2. no one else seated that day fits the same key, unless their own member key sets them apart
      if (v === 'unknown') continue;
      const m = people.get(pid) || {};
      for (const t of seatedPeople) {
        if (t.person === pid || !covers(t, a.date)) continue;
        const q = people.get(t.person); if (!q || !keyFits(k, q.name)) continue;
        const own = B.members.find(x => x.person === q.id && x.key !== k && keyFits(x.key, q.name) && !keyFits(x.key, m.name));
        if (!own) out.push(`${B.key} ${a.id}: roll key ${k} fits both ${pid} and ${q.id}, both seated on ${a.date}; no key tells them apart`);
      }
    }
  }

  // 3. one person, one record
  const byName = new Map(), byId = new Map();
  for (const p of R.people) {
    for (const n of new Set([p.name, ...(p.aliases || [])].map(nameKey))) if (n) (byName.get(n) || byName.set(n, new Set()).get(n)).add(p.id);
    for (const [src, ids] of Object.entries(p.ids || {})) for (const x of [].concat(ids)) { const k = src + ':' + x; (byId.get(k) || byId.set(k, new Set()).get(k)).add(p.id); }
  }
  const distinct = new Set((R.distinctPeople || []).map(g => [...g].sort().join('|')));
  for (const [what, m] of [['name', byName], ['id', byId]]) for (const [k, ids] of m) if (ids.size > 1 && !distinct.has([...ids].sort().join('|')))
    out.push(`roster: ${[...ids].join(' and ')} share the ${what} "${k}"; one person with two records, or list them in distinctPeople with a source`);

  // 4. offices-held.json agrees with roster.json on who held each office when
  const offByName = new Map(); for (const o of R.offices) (offByName.get(o.name) || offByName.set(o.name, []).get(o.name)).push(o.id);
  const same = (x, y) => (x || null) === (y || null);
  for (const [pid, p] of Object.entries(H.people || {})) {
    if (!people.has(pid)) { out.push(`offices-held: ${pid} is not in the roster`); continue; }
    const mine = R.terms.filter(t => t.person === pid);
    const used = new Set();
    for (const t of p.terms || []) {
      const ids = offByName.get(t.office) || [];
      if (!ids.length) { out.push(`offices-held: ${pid} office "${t.office}" is not a roster office`); continue; }
      const r = mine.find(x => ids.includes(x.office) && !used.has(x) && same(x.start, t.start) && same(x.end, t.end));
      if (r) { used.add(r); continue; }
      const near = mine.filter(x => ids.includes(x.office)).map(x => `${x.start}..${x.end}`).join(', ') || 'no term';
      out.push(`offices-held: ${pid} ${t.office} ${t.start}..${t.end}; roster has ${near}`);
    }
    for (const x of mine) if (!used.has(x)) out.push(`offices-held: ${pid} is missing roster term ${(offices.get(x.office) || {}).name} ${x.start}..${x.end}`);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const J = f => JSON.parse(readFileSync(new URL('../public/data/' + f, import.meta.url)));
  const problems = checkIdentities(J('roster.json'), J('offices-held.json'), J('decisions.json'));
  console.log(problems.join('\n') || 'identity checks: no problems');
  if (problems.length) process.exit(1);
}
