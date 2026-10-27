// City lobbyist-registration links (scripts/data/city/<slug>/lobbyists.json, basis "registry"). A registration
// ties a lobbyist to an action only when
//   1. the registration names the same principal as one of the action's parties (entity names normalized:
//      punctuation, spacing, Inc/LLC/Corp suffixes, "the", "c/o ..." and d/b/a tails dropped; a party's
//      parenthetical, such as a d/b/a or parent named in the record, counts as another name for it), and
//      A registration whose project field names the party ("(project: X)" in its issue) counts too.
//   2. it was in force on the action's date: registered on or before it (to the precision the registry gives),
//      not withdrawn before it, inside the registration year when the registry gives one, and, when the registry
//      gives no date at all, on the list for the action's year. In the cities in ANNUAL below a registration
//      lasts one registration year (see there).
// Links named in the body's own record for the item (basis "record") are the record itself and are not checked here.
// Lobbyist lines carried on a card without a basis (hand-built cards) pass the same checks (handLinkProblem).
// Used by scripts/city-enrich.mjs and scripts/city-firm-gifts.mjs; tests/lobby-links.test.mjs.
import { normEntity } from './business-rules.mjs';

const ROLE = /^(applicant|property owner|abutting owner|owner|developer|petitioner|tenant|lessee|vendor|contractor|grantee|seller|buyer|purchaser|assignor|assignee)s?$/i;
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
// The project a registration names in its own project field (Coral Gables' Associated_Project, kept as "(project: X)")
export const registeredProjects = l => [...String((l && l.issue) || '').matchAll(/\(project:\s*([^)]+)\)/gi)].map(m => m[1].trim()).filter(Boolean);

const ISO = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const mdy = s => { const m = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (!m) return null; const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; };
// Years a registry list without dates covers: from the source file name (lobbyists-2017.csv) or the note
const listYears = l => { const t = [l.src, l.note, l.quote, l.issue].filter(Boolean).join(' '); const ys = new Set();
  for (const m of String(l.src || '').matchAll(/(?:^|[^0-9])(20\d\d)\.(?:csv|json)/g)) ys.add(m[1]);
  for (const m of t.matchAll(/\b(20\d\d)\s+registered/gi)) ys.add(m[1]);
  const listed = t.match(/listed in ((?:20\d\d)(?:,?\s*(?:and\s+)?20\d\d)*)/i); if (listed) for (const y of listed[1].match(/20\d\d/g)) ys.add(y);
  return ys; };
// Cities whose registrations last one registration year. kind:
//   yearList    each list is one registration year (Coral Gables' dashboard year): the list year is the year the
//               registration was filed for; a registration with no list year counts in the calendar year of its date
//   carryOver   each list carries registrations still in force with their first date (Aventura, Doral, North Miami
//               Beach): a registration counts in the calendar year of its date and in the year of a list it is on
//   fiscal      North Miami: the affidavit names the fiscal year it is filed for ("Fiscal Year 2025-2026"), the
//               city's fiscal year October 1 to September 30
// lists: the year each registry list (matched by a piece of its src) is for
export const ANNUAL = {
  coralgables: { kind: 'yearList', lists: {} },
  cutlerbay: { kind: 'yearList', lists: { 'cutlerbay-fl.gov/node/11002': '2025' } },
  aventura: { kind: 'carryOver', lists: { 'DocumentCenter/View/4161/': '2026', aventura: '2026' } },
  doral: { kind: 'carryOver', lists: { 'lobbyist-docs/authorized-lobbyist-list.pdf': '2025', 'cityapps.cityofdoral.com/Lobbyist/authorized-lobbyists-list': '2026' } },
  nmb: { kind: 'carryOver', lists: { 'DocumentCenter/View/10962': '2023', 'DocumentCenter/View/12769': '2024', 'DocumentCenter/View/14272': '2025', 'DocumentCenter/View/14893': '2026', nmb2023: '2023', nmb2024: '2024', nmb2025: '2025', nmb2026: '2026' } },
  northmiami: { kind: 'fiscal', lists: {} },
};
const listYearsFor = (l, rule) => { const ys = listYears(l); const s = String(l.src || ''); for (const [k, y] of Object.entries(rule.lists)) if (s === k || (k.length > 8 && s.includes(k))) ys.add(y); return ys; };
// null when in force on date under a city's annual rule; otherwise the reason it is not
function notInForceAnnual(l, date, rule) {
  const y = date.slice(0, 4);
  if (rule.kind === 'fiscal' && l.regYear) {
    const [a, b] = String(l.regYear).split('-');
    if (a && b && date >= `${a}-10-01` && date <= `${b}-09-30`) return null;
    return `fiscal year ${l.regYear} (October 1, ${a} to September 30, ${b}) does not cover the action`;
  }
  const ys = listYearsFor(l, rule);
  const dated = l.date && ISO.test(String(l.date));
  if (dated && (rule.kind !== 'yearList' || !ys.size)) ys.add(String(l.date).slice(0, 4));
  if (ys.has(y)) return null;
  if (!ys.size) return 'no registration date or list year to show it was in force';
  return `annual registration for ${[...ys].sort().join(', ')} does not cover the action`;
}
// null when in force on date; otherwise the reason it is not. city: the body's key, for its annual rule
export function notInForce(l, date, city) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return 'the action has no date';
  const text = [l.note, l.quote, l.issue, l.why].filter(Boolean).join(' ');
  const w = text.match(/withdrawn\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i); const wd = w && mdy(w[1]);
  if (wd && wd < date) return `withdrawn ${wd}, before the action`;
  const rule = city && ANNUAL[city];
  if (rule) {
    if (l.date && ISO.test(String(l.date)) && String(l.date) > date.slice(0, String(l.date).length)) return `registered ${l.date}, after the action`;
    return notInForceAnnual(l, date, rule);
  }
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
export function registryLinkProblem(l, a, ix = new Map(), city) {
  if (!l || l.basis !== 'registry') return null;
  if (!principalMatches(l.for, a.parties, ix) && !registeredProjects(l).some(p => principalMatches(p, a.parties, ix)))
    return `registered principal "${l.for}" is not a party named on the item`;
  return notInForce(l, a.date, city);
}

// Name words of a person: lowercased, accents, punctuation, suffixes and single-letter initials dropped
const personWords = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\(.*?\)/g, ' ')
  .replace(/[^a-z\s-]/g, ' ').replace(/-/g, ' ').split(/\s+/).filter(w => w.length > 1 && !/^(jr|sr|ii|iii|iv|esq)$/.test(w));
// The record names a lobbyist for the item (its namedLobbyist line names their first and last name)
export function namedInRecord(x, a) {
  const w = personWords(x && x.name); if (w.length < 2) return false;
  const rec = new Set(personWords(a && a.namedLobbyist));
  return rec.has(w[0]) && rec.has(w[w.length - 1]);
}
// A lobbyist line on a card that carries no basis (hand-built card): null when it may stay, otherwise why not.
// Named in the item's own record, it is the record; otherwise one of its registrations (reg, regs) must name the
// item's party and be in force on the vote date, as a registry link would.
export function handLinkProblem(x, a, ix = new Map(), city) {
  if (!x || x.basis) return null;
  if (namedInRecord(x, a)) return null;
  const regs = [...(x.regs || []), ...(x.reg ? [x.reg] : [])];
  const tries = (regs.length ? regs : [null]).map(date => registryLinkProblem({ basis: 'registry', name: x.name, for: x.for, date, src: x.src, issue: x.issue }, a, ix, city));
  return tries.includes(null) ? null : tries[0];
}

// Two lobbyist lines on one item are one person when their names differ only by middle names or initials and they
// share a registration date, a firm or a principal, or one is the item's record for the lobbyist and the other a
// registration line for the same item
const firmWords = f => personWords(f).filter(w => !/^(llc|pllc|llp|pa|inc|the|and|of|law|firm|group|partners)$/.test(w));
// Name tokens with initials kept ("W. Allen Morris" -> w allen morris)
const nameTokens = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\(.*?\)/g, ' ')
  .replace(/[^a-z\s-]/g, ' ').replace(/-/g, ' ').split(/\s+/).filter(w => w && !/^(jr|sr|ii|iii|iv|esq)$/.test(w));
// Same last name, and every name or initial of the shorter appears, in order, in the longer (an initial stands
// for any name with that first letter, and a leading initial may be dropped): Michael Marrero / Michael J. Marrero, W. Allen Morris / Walter Allen Spencer Morris
export function namesDifferOnlyByMiddle(p, q) {
  let a = nameTokens(p), b = nameTokens(q);
  if (a.length < 2 || b.length < 2 || a[a.length - 1] !== b[b.length - 1] || a[a.length - 1].length < 2) return false;
  if (a.length > b.length) [a, b] = [b, a];
  const fits = (t, w) => t === w || (t.length === 1 && w[0] === t) || (w.length === 1 && t[0] === w);
  // a leading initial before the name a person goes by (W. Tucker Gibbs / Tucker Gibbs)
  if (!fits(a[0], b[0]) && b[0].length === 1 && b.length > a.length) b = b.slice(1);
  if (!fits(a[0], b[0])) return false;
  let j = 1;
  for (const t of a.slice(1, -1)) { while (j < b.length - 1 && !fits(t, b[j])) j++; if (j >= b.length - 1) return false; j++; }
  return true;
}
export function sameLobbyist(x, y) {
  if (!namesDifferOnlyByMiddle(x.name, y.name)) return false;
  if (nameTokens(x.name).join(' ') === nameTokens(y.name).join(' ')) return true;
  const regs = o => new Set([...(o.regs || []), ...(o.reg ? [o.reg] : [])]);
  const ra = regs(x), rb = regs(y);
  if ([...ra].some(r => rb.has(r))) return true;
  const fa = firmWords(x.firm), fb = firmWords(y.firm);
  if (fa.length && fb.length && fa[0] === fb[0]) return true;
  // the same principal, or the item's record naming one and a registration for the item's party naming the other
  if (x.for && y.for && (principalMatches(x.for, [y.for]) || principalMatches(y.for, [x.for]))) return true;
  return [x.basis, y.basis].filter(b => b === 'record').length === 1;
}

// A donor row confirms it is a lobbyist only when the report's occupation says so; a name match alone does not,
// whether the gift would count as the lobbyist's own or as a gift from the lobbyist's firm
const LOBBY_OCC = /LOBBY|GOVERNMENT|GOVT|GOV\b|CONSULT|ATTORNEY|LAWYER|LAW\b|PUBLIC AFFAIRS|ADVOCA/i;
export const occupationConfirmsLobbyist = row => !!(row && row.occ && LOBBY_OCC.test(String(row.occ)));
