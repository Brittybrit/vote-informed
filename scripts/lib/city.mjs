// Shared helpers for the city action lists: name keys and each on-ballot member's donors.
// Used by scripts/city-actions.mjs, scripts/city-enrich.mjs and scripts/city-firm-gifts.mjs.
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
export const P = p => new URL(p, root);
export const J = p => JSON.parse(readFileSync(P(p)));

export const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/&/g, ' AND ').replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
export const SUFFIX = new Set(['INC', 'LLC', 'LLLP', 'LP', 'LTD', 'CORP', 'CORPORATION', 'CO', 'COMPANY', 'PA', 'PLLC', 'LLP', 'THE', 'OF', 'AND', 'A', 'P', 'L', 'C', 'INCORPORATED']);
export const GENERIC = new Set(['MIAMI', 'FLORIDA', 'DORAL', 'GROUP', 'SERVICES', 'HOLDINGS', 'DEVELOPMENT', 'PROPERTIES', 'ASSOCIATES', 'PARTNERS', 'MANAGEMENT', 'CONSTRUCTION', 'FOUNDATION', 'CITY', 'COUNTY', 'INTERNATIONAL', 'USA', 'AMERICA', 'SOUTH', 'NORTH', 'NATIONAL', 'CENTER', 'INVESTMENTS', 'ENTERPRISES']);
// The words of a party's name that identify it. Too short or too generic to match on its own: no key.
export function pkey(name) {
  const w = norm(String(name).replace(/\(.*?\)/g, ' ').replace(/\bd\/?b\/?a\b.*$/i, ' ')).split(' ').filter(x => x && !SUFFIX.has(x));
  if (!w.length) return '';
  if (w.length === 1 && (w[0].length < 5 || GENERIC.has(w[0]))) return '';
  if (w.every(x => GENERIC.has(x))) return '';
  return w.join(' ');
}
export const dkey = n => norm(n).split(' ').filter(x => x && !SUFFIX.has(x)).join(' ');
export const csv = s => { const out = []; let f = '', q = false, row = []; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === '"' && s[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; } else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); out.push(row); row = []; f = ''; } else if (c !== '\r') f += c; } if (f || row.length) { row.push(f); out.push(row); } return out; };

export const CITY = { aventura: 'Aventura', nmb: 'North Miami Beach', northmiami: 'North Miami', sunnyisles: 'Sunny Isles Beach', southmiami: 'South Miami', pinecrest: 'Pinecrest', medley: 'Medley' };

// Donors for each on-ballot member: VoterFocus exports in scripts/data/city/<slug>/<acct>.csv, else the
// hand-typed reports in public/data/city-reports.json (no occupation there; marked hand: true).
export function donorsFor(slug, B, ballotNames = {}) {
  const out = [];
  const dir = `scripts/data/city/${slug}/`;
  const files = existsSync(P(dir)) ? readdirSync(P(dir)) : [];
  for (const [key, ob] of Object.entries(B.onBallot)) for (const acct of ob.accounts) {
    // one export per account (<acct>.csv), or one per report (<acct>_g2.csv, <acct>_g3.csv ...)
    for (const f of files.filter(n => n === acct + '.csv' || (n.startsWith(acct + '_') && n.endsWith('.csv'))).map(n => dir + n)) {
      const [h, ...rows] = csv(readFileSync(P(f), 'utf8'));
      const ix = n => h.indexOf(n);
      if (ix('Cont/Exp') < 0) continue;
      for (const r of rows) {
        if (r[ix('Cont/Exp')] !== 'C' || r[ix('Amend. code')] === 'D') continue;
        const amt = Number(r[ix('amount')]); if (!(amt > 0)) continue;
        out.push({ to: key, acct, donor: r[ix('name')].replace(/\s+/g, ' ').trim(), amount: amt, date: r[ix('item date')], addr: r[ix('address 1')], occ: r[ix('occupation')] || '' });
      }
    }
  }
  // No export: the hand-typed treasurer's reports (rows [date, name, type, amount, note]; 'S' is the
  // candidate's own money and a note marks a loan or refund)
  const reports = J('public/data/city-reports.json').cities.find(c => c.city === CITY[slug]);
  for (const [key, ob] of Object.entries(B.onBallot)) {
    if (out.some(g => g.to === key) || !reports) continue;
    const m = B.members.find(x => x.key === key) || {};
    const c = reports.candidates.find(x => x.name === (ballotNames[key] || m.name));
    for (const r of (c && c.reports) || []) for (const x of r.rows) if (x[2] !== 'S' && !x[4] && x[3] > 0)
      out.push({ to: key, acct: ob.accounts[0], donor: String(x[1]).replace(/\s+/g, ' ').trim(), amount: x[3], date: x[0], addr: '', occ: '', hand: true });
  }
  return out;
}

// Party gifts: a donor whose name is one of the action's parties, given to a member with a vote on it.
export function partyGifts(a, donors) {
  const keys = (a.parties || []).map(pkey).filter(Boolean);
  const out = [];
  for (const g of donors) {
    if (!(g.to in (a.roll || {})) || a.roll[g.to] == null) continue;
    const dk = dkey(g.donor);
    if (keys.some(k => dk === k || (k.split(' ').length >= 2 && dk.startsWith(k + ' ')))) { const { hand, ...rest } = g; out.push({ ...rest, kind: 'party' }); }
  }
  return out;
}
