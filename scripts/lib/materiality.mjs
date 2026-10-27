// Materiality threshold for donors (Brit, Oct 27, 2026, "Option A"): small-dollar individual donors are not what the
// analysis is about. In every headline count (money, donors, gifts, before/after, campaign/committee split, items or
// laws tied, the share line's tied count, the "voted no" line, earlier-office lines) a donor counts only when it is:
//   1. an organization: company, PAC, political committee, party committee, union, association or lobbying firm; or
//   2. a registered lobbyist (a person) tied through a lobbying registration, whatever the amount; or
//   3. a person whose TOTAL giving to that official (every gift from that donor, grouped by the donor key the caller
//      already uses, to all of the official's accounts in the window already used) is INDIVIDUAL_MIN_TOTAL or more.
// Persons below the threshold stay listed on the cards, marked belowThreshold, and are counted nowhere.
// Used by scripts/money-summary.mjs (current offices, cards, ties files) and scripts/prior-offices.mjs /
// scripts/prior-legislature.mjs (earlier offices). Tests: tests/materiality.test.mjs.
import { isOrg } from './donor-class.mjs';

// $1,000: Florida's per-election contribution limit for legislative, county and municipal candidates
// (s. 106.08(1)(a), Florida Statutes). An individual who gave this official less than one maxed-out gift in total
// is not counted.
export const INDIVIDUAL_MIN_TOTAL = 1000;

// Organization names the general name test misses (law and lobbying firms named by partners, a few trade names).
const ORG_EXTRA = /\bP ?A$|\bP A\b|\bBILZIN\b|\bBERCOW RADELL\b|\bGREENBERG TRAURIG\b|\bGOVERNMENT AFFAIRS\b|\bSTRATEGIZE\b|\bHYUNDAI\b|\bWASTE\b|\bFIREFIGHTERS\b|\bPHYSICIANS\b|\bSURGERY\b|\bMOBILITY\b|\bFIFTY BAR\b|\bFOR CONGRESS\b|\bFOR SENATE\b/;
// A committee reports its type as its occupation (PAC, PC, ECO, CCE); a person's occupation never counts here.
const COMMITTEE_OCC = /^\s*(?:PAC|P\.?C\.?|ECO|CCE|NPO|POLITICAL (?:ACTION )?COMMITTEE(?: \(PC\))?|POLITICAL ORGANIZATION|PARTY(?: EXECUTIVE COMMITTEE)?|EXECUTIVE COMMITTEE)\s*$/;
export const isOrgDonor = (name, occ) => {
  const n = String(name || '').toUpperCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
  return isOrg(name, '') || ORG_EXTRA.test(n) || (typeof occ === 'string' && COMMITTEE_OCC.test(occ.toUpperCase()));
};

// Gift relationships (decisions.json `rel`, earlier offices `k`) that mean the giver is a lobbyist registered for the
// party, or works at the registered firm: the influence channel, counted at any amount.
const LOBBYIST_REL = new Set(['firmlob', 'office', 'named', 'ldaLob', 'ldaOwn', 'lob']);
// Relationships that mean the giver is the lobbying firm itself or a PAC
const ORG_REL = new Set(['firm', 'firmpac', 'ldaPac', 'ldaFirm', 'clsF', 'pac']);

// 'org' | 'lobbyist' | 'person'. g: a decisions.json gift ({donor, occ, kind, rel}) or an earlier-office gift
// ({n, occ, k}).
export function donorType(g) {
  const name = g.donor != null ? g.donor : g.n, occ = g.occ;
  const kind = g.kind || g.k, rel = g.rel;
  if (isOrgDonor(name, occ)) return 'org';
  if (rel && ORG_REL.has(rel)) return 'org';
  if (rel && LOBBYIST_REL.has(rel)) return 'lobbyist';
  if (kind === 'lobbyist' || kind === 'lob' || kind === 'firmlob') return 'lobbyist';
  if (kind === 'firm' || kind === 'pac') return 'org';
  return 'person';
}

// gifts: every gift to the official in the window (duplicates allowed: they are removed by giftId).
// donorOf(g): the donor-identity key; amountOf(g); giftId(g): one gift counted once.
// Returns { counts(g), totals: Map(donorKey -> total) } where counts(g) says whether g's donor counts.
export function materiality(gifts, { donorOf, amountOf, giftId }) {
  const seen = new Set(), totals = new Map(), lobbyist = new Set(), org = new Set();
  for (const g of gifts) {
    const id = giftId(g); if (seen.has(id)) continue; seen.add(id);
    const k = donorOf(g);
    totals.set(k, Math.round(((totals.get(k) || 0) + Number(amountOf(g) || 0)) * 100) / 100);
    const t = donorType(g);
    if (t === 'lobbyist') lobbyist.add(k); else if (t === 'org') org.add(k);
  }
  const counts = g => {
    const t = donorType(g);
    if (t !== 'person') return true;
    const k = donorOf(g);
    return lobbyist.has(k) || org.has(k) || (totals.get(k) || 0) >= INDIVIDUAL_MIN_TOTAL;
  };
  return { counts, totals };
}
