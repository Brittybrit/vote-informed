// City cards: fill gifts from the lobbying firm behind each named lobbyist (the firm itself and any of its
// lobbyists), using every registry we hold that ties a lobbyist to a firm: Doral's authorized list (firm named),
// the county registry (suite-level office, labeled firms), Coral Gables' dashboard (addresses) and the
// Legislature's firm directory. Donors: VoterFocus exports for Coral Gables and Doral (with occupations);
// hand-transcribed treasurer's reports (public/data/city-reports.json) for Aventura and North Miami Beach,
// which carry no occupation, so those are name matches and say so. Idempotent.
// Run: node scripts/city-firm-gifts.mjs && node scripts/money-summary.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { donorsFor } from './lib/city.mjs';

const root = new URL('../', import.meta.url);
const P = p => new URL(p, root);
const J = p => JSON.parse(readFileSync(P(p)));
const d = J('public/data/decisions.json');
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/&/g, ' AND ').replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\bPOLLAKOFF\b/g, 'POLIAKOFF'); // a report's misspelling of the firm
const SUF = /\b(JR|SR|II|III|ESQ)\b\.?/gi;
const ORG = /\b(INC|LLC|PAC|COMMITTEE|CORP|GROUP|TRUST|ASSOCIATES|P A|PA|PLLC|LLP)\b/;
const LOB = /LOBBY|GOVERNMENT|GOVT|GOV\b|CONSULT|ATTORNEY|LAWYER|LAW\b|PUBLIC AFFAIRS|ADVOCA/i;
const FSTOP = new Set(['LLC', 'INC', 'PA', 'P', 'A', 'PLLC', 'LLP', 'THE', 'AND', 'OF', 'LAW', 'PARTNERS']);
const fkey = f => { const t = norm(f).split(' ').filter(x => x && !FSTOP.has(x)); if (!t.length) return ''; if (t[0] === 'LSN') return 'LSN'; return t[0].length >= 7 ? t[0] : t.slice(0, 2).join(''); };
// Judgment calls: donors whose name matches lobbyists at two different firms (Alfredo J. Gonzalez at Greenberg Traurig, an Alfredo Gonzalez at Gunster) are left out.
const SKIP = [/^ALFREDO L GONZALEZ$/];
const csv = s => { const out = []; let f = '', q = false, row = []; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === '"' && s[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; } else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); out.push(row); row = []; f = ''; } else if (c !== '\r') f += c; } if (f || row.length) { row.push(f); out.push(row); } return out; };
const table = s => { const [h, ...rows] = csv(s); return rows.filter(r => r.length === h.length).map(r => Object.fromEntries(h.map((k, i) => [k, r[i]]))); };
function akey(a) {
  a = String(a || '').toUpperCase().replace(/BOULEVARD/g, 'BLVD').replace(/AVENUE/g, 'AVE').replace(/STREET/g, 'ST').replace(/\bSOUTH\b/g, 'S').replace(/\bS\.\s/g, 'S ').replace(/\bN\.\s/g, 'N ').replace(/BICKELL/g, 'BRICKELL').replace(/^[A-Z ,&]+,\s*(?=\d)/, '');
  const m = a.match(/^\s*(\d+)\s+([A-Z0-9 .]+?)(?:,|\s+(?:SUITE|STE|#|UNIT|FLOOR|FL)\b|$)/); if (!m) return '';
  const street = m[2].replace(/[^A-Z0-9]/g, '').replace(/(ST|AVE|BLVD|DR|DRIVE|RD|ROAD|WAY|PLAZA|CIR|CIRCLE)$/, '');
  const rest = a.slice(m[0].length - (a[m[0].length - 1] === ',' ? 1 : 0));
  const s = rest.match(/(?:SUITE|STE|#|UNIT)\s*#?\s*([A-Z0-9-]+)/) || rest.match(/,\s*(?:PH\s*)?([0-9]{2,5}[A-Z]?)\s*,/);
  let suite = s ? s[1] : ''; const f = rest.match(/(\d+)(?:ST|ND|RD|TH)\s+FLOOR/); if (!suite && f) suite = f[1] + '00';
  return suite ? `${m[1]} ${street} ${suite}` : '';
}
const OFFICE = { '200 SBISCAYNE 300': 'Bercow Radell Fernandez Larkin & Tapanes', '333 SE2ND 4400': 'Greenberg Traurig', '701 BRICKELL 3300': 'Holland & Knight', '1450 BRICKELL 2300': 'Bilzin Sumberg', '3800 NE1ST 200': 'LSN Partners', '9155 SDADELAND 1716': 'The Southern Group', '2525 PONCEDELEON 825': 'Becker & Poliakoff', '2 ALHAMBRA 102': 'Ballard Partners', '600 BRICKELL 3500': 'Gunster', '98 SE7 1100': 'Akerman' };

// Rosters: fkey -> Map(personKey -> {name, src})
const roster = {}; const add = (firm, name, src) => { const k = fkey(firm); if (!k) return; const [lasts, first] = parts(name); if (!first) return; (roster[k] = roster[k] || new Map()).set(lasts.join(' ') + '|' + first, { name: tidy(name), firm, src, lasts, first }); };
const parts = s => { // "Last, First" or "First Last"
  s = String(s).replace(SUF, '').replace(/"/g, '').replace(/\(.*?\)/g, '');
  if (s.includes(',')) { const [l, f] = s.split(',').map(norm); return [l.split(' '), (f || '').split(' ')[0]]; }
  const w = norm(s).split(' ').filter(x => x.length > 1 || /^[A-Z]$/.test(x)); const words = w.filter(x => x.length > 1); return [words.slice(1), words[0]];
};
const tidy = s => { s = String(s).replace(SUF, '').replace(/"/g, '').replace(/\s+/g, ' ').trim(); if (s.includes(',')) { const [l, f] = s.split(',').map(x => x.trim()); s = `${f} ${l}`; } return s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s\-'])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bDe La\b/g, 'de la').replace(/\bDe\b/g, 'de') : s; };
for (const l of J('scripts/data/city/doral/lobbyists-2026.json').lobbyists) add(l.firm, l.name, 'Doral');
for (const l of J('public/data/county-lobbyists.json').lobbyists) { const o = OFFICE[akey(l.addr)]; if (o) add(o, l.name, 'county'); }
// Coral Gables registries back to 2017 (the full-tenure list reaches 2013; no CSV before 2017 is posted)
for (const y of ['2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026']) { let cur = null; for (const r of table(readFileSync(P(`scripts/data/city/coralgables/lobbyists-${y}.csv`), 'utf8'))) { if (r.Lobbyist1) cur = { name: r.Lobbyist1, addr: (r.Textbox31 || '').split('\n').pop() }; if (!cur) continue; const o = OFFICE[akey(cur.addr)]; if (o) add(o, cur.name, 'Coral Gables'); } }
const FIRMS = J('scripts/data/state/lobbyfirms/firms.json').firms; for (const f in FIRMS) for (const p of FIRMS[f]) add(f, p, 'Legislature');

// Donors per body
const vf = (file, to, acct) => table(readFileSync(P(file), 'utf8')).filter(r => r['Cont/Exp'] === 'C').map(r => ({ to, acct, date: r['item date'], amount: +r.amount, donor: r.name.replace(/\s+/g, ' ').trim(), addr: r['address 1'], occ: (r.occupation || '').replace(/<br>/g, ' '), typ: r['cont. type'] }));
const reports = J('public/data/city-reports.json').cities;
const hand = (city, cand, to, acct) => { const c = reports.find(x => x.city === city).candidates.find(x => x.name === cand); return (c.reports || []).flatMap(r => r.rows.filter(x => x[2] !== 'S' && !x[4]).map(x => ({ to, acct, date: x[0], amount: x[3], donor: x[1], addr: '', occ: '', typ: x[2], hand: true }))); };
const DON = {
  // every report export for each account (<acct>.csv for this cycle, <acct>_<year>.csv for earlier races)
  coralgables: [...['lago', 'lago_2021', 'lago_2023', 'lago_2025'].flatMap(f => vf(`scripts/data/city/coralgables/${f}.csv`, 'Lago', 'lago')), ...['castro', 'castro_2023'].flatMap(f => vf(`scripts/data/city/coralgables/${f}.csv`, 'Castro', 'castro'))],
  doral: ['porras', 'porras_2022'].flatMap(f => vf(`scripts/data/city/doral/${f}.csv`, 'Porras', 'porras')),
  aventura: hand('Aventura', 'Howard S. Weinberg', 'Weinberg', 'weinberg'),
  nmb: [...hand('North Miami Beach', 'Jay R. Chernoff', 'Chernoff', 'chernoff'), ...hand('North Miami Beach', 'Phyllis Smith', 'Smith', 'smith')],
};
// Every other city list: its VoterFocus exports or hand-typed reports (scripts/lib/city.mjs)
for (const B of d.bodies) if (!DON[B.key] && B.universe && B.universe.built === 'actions' && existsSync(P(`scripts/data/city/${B.key}/actions.json`))) {
  const BJ = existsSync(P(`scripts/data/city/${B.key}/body.json`)) ? J(`scripts/data/city/${B.key}/body.json`) : {};
  DON[B.key] = donorsFor(B.key, B, BJ.ballotNames || {}).map(r => ({ ...r, typ: '' }));
}
// Lobbyists each city's own registry or record names with their firm (scripts/data/city/<slug>/lobbyists.json)
for (const B of d.bodies) if (existsSync(P(`scripts/data/city/${B.key}/lobbyists.json`)))
  for (const list of Object.values(J(`scripts/data/city/${B.key}/lobbyists.json`).byAction || {})) for (const l of list || [])
    if (l && l.firm && l.name && l.basis === 'registry') add(l.firm, l.name, B.name && B.name.en || B.key);
for (const k in DON) { DON[k] = DON[k].filter(r => r.amount > 0 && !SKIP.some(x => x.test(norm(r.donor)))); for (const r of DON[k]) { r.n = norm(r.donor); r.w = new Set(r.n.split(' ')); } }
// Which firm a card lobbyist belongs to when the card does not say
const firmOf = l => { if (l.firm) return l.firm; const [lasts, first] = parts(l.name); for (const k in roster) { const p = roster[k].get(lasts.join(' ') + '|' + first); if (p) return p.firm; } return null; };
const gKey = g => [g.to, g.acct, norm(g.donor), Number(g.amount), g.date].join('|');
const NOTE = (who, src, firm, hand, occ) => ({
  en: `${who}, listed at ${firm} in the ${src} lobbyist ${src === 'Legislature' ? 'directory' : 'registry'}` + (hand ? '; name match only, the report gives no occupation or address' : `; the report lists the occupation as “${occ}”`),
  es: `${who}, listado en ${firm} en el registro de cabilderos de ${src === 'Legislature' ? 'la Legislatura' : src === 'county' ? 'el condado' : src}` + (hand ? '; coincidencia solo por nombre, el reporte no indica ocupación ni dirección' : `; el reporte indica la ocupación “${occ}”`),
  ht: `${who}, nan lis ${firm} nan rejis lobiyis ${src === 'Legislature' ? 'Lejislati a' : src === 'county' ? 'konte a' : src}` + (hand ? '; koresponn sou non sèlman, rapò a pa bay okipasyon ni adrès' : `; rapò a di okipasyon an se “${occ}”`) });

let added = 0, total = 0, removed = 0; const log = []; const nameOnly = [];
// A lobbyist's own gift counts only when the report's occupation (or address) confirms it is the lobbyist; a
// name-only match from a hand-typed report is listed in scripts/data/city/lobbyist-name-only.txt for review.
for (const B of d.bodies) {
  const rows = DON[B.key]; if (!rows) continue;
  for (const a of B.actions) {
    // a lobbyist or firm gift whose lobbyist is no longer on the card (a link taken off on review) goes too
    const onCard = new Set((a.lobbied || []).map(l => norm(l.name)));
    const before = a.gifts.length; a.gifts = a.gifts.filter(g => !['lobbyist', 'firm'].includes(g.kind) || !g.lobbyist || onCard.has(norm(g.lobbyist))); removed += before - a.gifts.length;
    const have = new Set(a.gifts.map(gKey)); const n0 = a.gifts.length;
    const push = g => { if (!(g.to in (a.roll || {})) || have.has(gKey(g))) return; have.add(gKey(g)); a.gifts.push(g); added++; total += g.amount; log.push(`${B.key} ${a.id}: ${g.donor} $${g.amount} ${g.date} ${g.to} <- ${g.kind}${g.rel ? '/' + g.rel : ''} ${g.lobbyist} ${g.why ? '(' + g.why.en + ')' : ''}`); };
    for (const l of a.lobbied || []) {
      const firm = firmOf(l); const fk = firm ? fkey(firm) : '';
      // the named lobbyist
      const [lasts, first] = parts(l.name);
      for (const r of rows) if (lasts.every(x => r.w.has(x)) && r.w.has(first) && !ORG.test(r.n) && r.hand) nameOnly.push(`${B.key} ${a.id}: ${r.donor} $${r.amount} ${r.date} to ${r.to} matches lobbyist ${l.name} by name only`);
      for (const r of rows) if (lasts.every(x => r.w.has(x)) && r.w.has(first) && !ORG.test(r.n) && LOB.test(r.occ)) push({ to: r.to, acct: r.acct, kind: 'lobbyist', donor: r.donor, amount: r.amount, date: r.date, occ: r.occ || undefined, lobbyist: l.name, forParty: l.for, basis: r.hand ? 'name' : 'occ', ...(r.hand ? { why: { en: 'name match only; the report gives no occupation or address', es: 'coincidencia solo por nombre; el reporte no indica ocupación ni dirección', ht: 'koresponn sou non sèlman; rapò a pa bay okipasyon ni adrès' } } : {}) });
      if (!fk || !roster[fk]) continue;
      // the firm itself
      const ph = ' ' + norm(firm).split(' ').filter(x => !FSTOP.has(x)).slice(0, 2).join(' ') + ' ';
      for (const r of rows) if (ph.trim().length > 4 && (' ' + r.n + ' ').includes(ph)) push({ to: r.to, acct: r.acct, kind: 'firm', rel: 'firm', donor: r.donor, amount: r.amount, date: r.date, occ: r.occ || undefined, lobbyist: l.name, forParty: l.for, firmName: firm });
      // its other lobbyists
      for (const p of roster[fk].values()) {
        if (p.lasts.join(' ') === lasts.join(' ') && p.first === first) continue;
        for (const r of rows) if (p.lasts.every(x => r.w.has(x)) && r.w.has(p.first) && !ORG.test(r.n) && (r.hand || LOB.test(r.occ)))
          push({ to: r.to, acct: r.acct, kind: 'firm', rel: 'firmlob', donor: r.donor, amount: r.amount, date: r.date, occ: r.occ || undefined, lobbyist: l.name, forParty: l.for, firmName: firm, why: NOTE(p.name, p.src, p.firm, r.hand, r.occ) });
      }
    }
    if (a.gifts.length !== n0) a.gifts.sort((p, q) => String(p.date).localeCompare(String(q.date)));
  }
}
writeFileSync(P('public/data/decisions.json'), JSON.stringify(d, null, 1) + '\n');
writeFileSync(P('scripts/data/city/lobbyist-name-only.txt'), [...new Set(nameOnly)].join('\n') + '\n');
console.log(log.join('\n')); console.log(`removed ${removed} gifts no longer backed by a lobbyist on the card`); console.log(`added ${added} gifts, $${total.toLocaleString()}`);
