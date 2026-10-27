// City lobbyist-registration links (scripts/data/city/<slug>/lobbyists.json, basis "registry"). A registration
// ties a lobbyist to an action only when
//   1. the registration names the same principal as one of the action's parties (entity names normalized:
//      punctuation, spacing, Inc/LLC/Corp suffixes, "the", "c/o ..." and d/b/a tails dropped; a party's
//      parenthetical, such as a d/b/a or parent named in the record, counts as another name for it), and
//   2. it was in force on the action's date: registered on or before it (to the precision the registry gives),
//      not withdrawn before it, inside the registration year when the registry gives one, and, when the registry
//      gives no date at all, on the list for the action's year.
// Links named in the body's own record for the item (basis "record") are the record itself and are not checked here.
// Used by scripts/city-enrich.mjs; tests/lobby-links.test.mjs.
import { normEntity } from './business-rules.mjs';

const ROLE = /^(applicant|property owner|owner|developer|petitioner|tenant|lessee|vendor|contractor|grantee|seller|buyer|purchaser|assignor|assignee)s?$/i;
const DBA = /\bd\s*[./]?\s*b\s*[./]?\s*a\b\.?/i;
const squash = s => normEntity(String(s || '').replace(/\bc\s*\/\s*o\b.*$/i, ' ')).replace(/ /g, '');
// A name and, when it carries a d/b/a, the trade name too
const withDba = s => { const t = String(s || ''); const m = t.match(DBA); return m ? [t.slice(0, m.index), t.slice(m.index + m[0].length)] : [t]; };
// The names an item party goes by: its name, any d/b/a, and any parenthetical that is a name rather than a role
export function partyNames(p, ix = new Map()) {
  const out = withDba(String(p || '').replace(/\([^)]*\)/g, ' '));
  for (const m of String(p || '').matchAll(/\(([^)]*)\)/g)) { const x = m[1].trim(); if (x && !ROLE.test(x)) out.push(...withDba(x)); }
  return out.map(squash).filter(Boolean).map(n => ix.get(n) || n);
}
// The names a registration's principal goes by ("A / B" names two; a d/b/a names the trade name too)
export const principalNames = (s, ix = new Map()) => String(s || '').replace(/\bc\s*\/\s*o\b.*$/i, ' ').replace(/\bd\s*\/\s*b\s*\/\s*a\b/gi, ' dba ')
  .split(/\s*\/\s*(?![^()]*\))/).flatMap(withDba).map(squash).filter(Boolean).map(n => ix.get(n) || n);
// Curated aliases (scripts/data/city/principal-aliases.json): { groups: [[name, name], ...] }, each group one entity
export function principalAliases(json) {
  const ix = new Map();
  for (const g of (json && json.groups) || []) { const id = squash(g[0]); for (const n of g) ix.set(squash(n), id); }
  return ix;
}
export function principalMatches(principal, parties, ix = new Map()) {
  const want = new Set((parties || []).flatMap(p => partyNames(p, ix)));
  return principalNames(principal, ix).some(n => want.has(n));
}

const ISO = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const mdy = s => { const m = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (!m) return null; const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; };
// Years a registry list without dates covers: from the source file name (lobbyists-2017.csv) or the note
const listYears = l => { const t = [l.src, l.note, l.quote, l.issue].filter(Boolean).join(' '); const ys = new Set();
  for (const m of String(l.src || '').matchAll(/(?:^|[^0-9])(20\d\d)\.(?:csv|json)/g)) ys.add(m[1]);
  for (const m of t.matchAll(/\b(20\d\d)\s+registered/gi)) ys.add(m[1]);
  const listed = t.match(/listed in ((?:20\d\d)(?:,?\s*(?:and\s+)?20\d\d)*)/i); if (listed) for (const y of listed[1].match(/20\d\d/g)) ys.add(y);
  return ys; };
// null when in force on date; otherwise the reason it is not
export function notInForce(l, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return 'the action has no date';
  const text = [l.note, l.quote, l.issue, l.why].filter(Boolean).join(' ');
  const w = text.match(/withdrawn\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i); const wd = w && mdy(w[1]);
  if (wd && wd < date) return `withdrawn ${wd}, before the action`;
  if (l.date && ISO.test(String(l.date))) {
    const reg = String(l.date);
    if (reg > date.slice(0, reg.length)) return `registered ${reg}, after the action`;
    if (l.regYear) { const [a, b] = String(l.regYear).split('-'); if (a && b && (date < `${a}-01-01` || date > `${b}-12-31`)) return `registration year ${l.regYear} does not cover the action`; }
    return null;
  }
  if (l.regYear) { const [a, b] = String(l.regYear).split('-'); if (a && b && date >= `${a}-01-01` && date <= `${b}-12-31`) return null; return `registration year ${l.regYear} does not cover the action`; }
  const ys = listYears(l);
  if (ys.has(date.slice(0, 4))) return null;
  return ys.size ? `listed only for ${[...ys].sort().join(', ')}` : 'no registration date or list year to show it was in force';
}
// null when the link can tie the lobbyist to the action; otherwise why not
export function registryLinkProblem(l, a, ix = new Map()) {
  if (!l || l.basis !== 'registry') return null;
  if (!principalMatches(l.for, a.parties, ix)) return `registered principal "${l.for}" is not a party named on the item`;
  return notInForce(l, a.date);
}
