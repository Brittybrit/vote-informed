// Rules for publishing a business tie (scripts/business.mjs). Pure functions, so tests/business.test.mjs can
// check each rule on its own.
import { IN_FAVOR } from '../money-summary.mjs';
import { voteStatus } from './contested.mjs';

// An entity's name for matching: lower case, punctuation gone, "&" read as "and", anything in parentheses and any
// d/b/a tail dropped, corporate suffixes (Inc, LLC, Corp, Co, Ltd, PA, PLLC ...) and "the" dropped.
const SUFFIX = /\b(inc|incorporated|llc|l l c|pllc|llp|lllp|lp|l p|ltd|pa|p a|corp|corporation|co|company|the)\b/g;
export const normEntity = s => String(s || '').toLowerCase()
  .replace(/\([^)]*\)/g, ' ').replace(/\bd[\s./]*b[\s./]*a\b.*$/, ' ').replace(/&/g, ' and ')
  .replace(/[^a-z0-9 ]+/g, ' ').replace(SUFFIX, ' ').replace(/\s+/g, ' ').trim();

// A record's business field can name more than one entity ("A; B" or "A / B"); each is matched on its own.
export const entityNames = s => String(s || '').split(/;\s*|\s+\/\s+/).map(x => x.trim()).filter(Boolean);

// Curated aliases (scripts/data/business/aliases.json): { groups: [[name, name, ...], ...] }, each group one entity.
export function aliasIndex(aliases) {
  const ix = new Map();
  for (const g of (aliases && aliases.groups) || []) { const id = g.map(normEntity).sort().join('|'); for (const n of g) ix.set(normEntity(n), id); }
  return ix;
}
// Same entity: the normalized names are equal, or a curated alias group holds both. Never a prefix: "Miami-Dade
// County" is not "Miami-Dade County Public Schools".
export function sameEntity(a, b, ix = new Map()) {
  const x = normEntity(a), y = normEntity(b);
  if (!x || !y) return false;
  if (x === y) return true;
  return ix.has(x) && ix.get(x) === ix.get(y);
}
// Any name in a matches any name in b
export const anySame = (a, b, ix) => entityNames(a).some(p => entityNames(b).some(q => sameEntity(p, q, ix)));

// Customer-of: the filer's disclosure lists this business as a customer, client, tenant or source of income OF a
// company the filer owns (Form 6 / Form 1 secondary sources, federal Schedule J), not as the filer's own company.
// A tie to such a business is about someone else's company and is held back to the private list.
const OWN_ROLES = new Set(['owner', 'spouse owner', 'officer', 'director', 'manager', 'employer', 'employee']);
const CUSTOMER_OF = /\b(?:customer|client|tenant|source of (?:income|compensation))\b(?:\s*\([^)]*\))?[^.;()]{0,40}?\s(?:of|to)\s+\S/i;
export function isCustomerOf(interest) {
  if (!interest || OWN_ROLES.has(String(interest.role || '').toLowerCase())) return false;
  return CUSTOMER_OF.test(String(interest.nature || ''));
}

// A tie to an official action of the person's own body counts only when the action went the business's way: a yes
// vote (or a request they filed, or an action they took), the same rule as scripts/money-summary.mjs (IN_FAVOR,
// Brit, Oct 27, 2026). A no vote, absent, abstained, recused, excused, or a vote the record does not give (no vote,
// "n/a") does not count. Abstention records (kind 'abstention') are about the abstention itself and stay.
// Ties to other governments' payments, contracts and grants carry no vote of theirs and are not affected.
// A vote also has to be contested (Brit, Oct 27, 2026): the record shows at least one no (t.tally [yes, no], or a
// "73-36" tally at the end of the record label). Unanimous, or a tally the record read does not give: not counted.
const LABEL_TALLY = /(?:^|[\s;(,])(\d{1,3})\s*-\s*(\d{1,3})\)?\s*$/;
export const tieTally = t => t.tally || ((m => m ? [Number(m[1]), Number(m[2])] : null)(String((t.record || {}).label || '').match(LABEL_TALLY)));
export const tieContested = t => voteStatus(tieTally(t), null, false) === 'contested';
export function voteCounts(t) {
  if (!t) return false;
  if (t.kind === 'abstention') return true;
  const v = t.candidateVote == null ? 'n/a' : String(t.candidateVote).toLowerCase();
  if (t.kind === 'vote') return IN_FAVOR.has(v) && (v !== 'yes' || tieContested(t));
  if (v === 'n/a' || v === '') return true;
  return IN_FAVOR.has(v) && (v !== 'yes' || tieContested(t));
}

// Disclosure window: on the date, the person held an office whose disclosure law required a form.
// spans: { pid: [[from, to], ...] } with ISO dates.
export const inWindow = (spans, pid, d) => (spans[pid] || []).some(([a, b]) => d >= a && d <= b);

// Which form years show the business: formYears is [{ pid, business, years: Set }].
export function yearsFor(formYears, pid, biz, ix) {
  const out = new Set();
  for (const f of formYears) if (f.pid === pid && anySame(f.business, biz, ix)) for (const y of f.years) out.add(y);
  return out;
}
// Evidence that a form covers the year y of a tie: listed that year, bridged (the years before and after), or
// last disclosed (after the latest form showing it). null: no form for that year shows the business.
export function evidence(t, y, years) {
  if (['listed', 'bridged', 'lastDisclosed', 'sunbiz'].includes(t.basis)) return t.basis;
  if (t.kind === 'abstention') return 'record';
  if (t.basisNote) return 'record';
  if (!years.size) return null;
  if (years.has(y)) return 'listed';
  if (years.has(y - 1) && years.has(y + 1)) return 'bridged';
  if (y > Math.max(...years)) return 'lastDisclosed';
  return null;
}
// Sunbiz end date: the business was dissolved before the tie's date. sunbiz: [{ pid, business, dissolved }].
export const endedBefore = (sunbiz, t, d, ix) => sunbiz.find(s => s.pid === t.pid && s.dissolved && d > s.dissolved && anySame(s.business, t.business, ix));
