// County Commission cards: fill gifts from (a) the registered lobbyist named on the card and (b) everyone
// registered with the county at the same office address (suite-level), i.e. the lobbyist's firm, matched
// against fresh exports of the on-ballot members' accounts. Same rule as the state cards (any lobbyist at
// the firm counts as the firm). Idempotent: gifts already on a card are skipped.
// Inputs: public/data/decisions.json, public/data/county-lobbyists.json (county registry, with addresses),
//   scripts/data/county/donors/lopez-campaign.csv (VoterFocus export), pc80020.tsv (DOE), gilbert-fec.json (FEC API),
//   gilbert-campaign-2020.csv and gilbert-campaign-2024.csv (VoterFocus), pc71293.tsv (DOE, Common Voices).
// Gifts count from giftStart(B, member): Gilbert from 2019 (one cycle before his Nov 17, 2020 start), Lopez from 2025.
// Run: node scripts/county-firm-gifts.mjs && node scripts/money-summary.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { giftStart } from './money-summary.mjs';

const root = new URL('../', import.meta.url);
const P = p => new URL(p, root);
const d = JSON.parse(readFileSync(P('public/data/decisions.json')));
const B = d.bodies.find(b => b.key === 'county');
const REG = JSON.parse(readFileSync(P('public/data/county-lobbyists.json'))).lobbyists;
const norm = s => String(s || '').toUpperCase().replace(/&/g, ' AND ').replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const ORG = /\b(INC|LLC|PAC|COMMITTEE|CORP|GROUP|TRUST|ASSOCIATES|P A|PA|PLLC|LLP)\b/;
const LOB = /LOBBY|GOVERNMENT|GOVT|GOV\b|CONSULT|ATTORNEY|LAWYER|LAW\b|PUBLIC AFFAIRS|ADVOCA/i;

// Office key: number + street + suite/floor. A cluster is a firm only when the address has a suite or floor.
function akey(a) {
  a = String(a || '').toUpperCase().replace(/BOULEVARD/g, 'BLVD').replace(/AVENUE/g, 'AVE').replace(/STREET/g, 'ST').replace(/\bSOUTH\b/g, 'S').replace(/\bS\.\s/g, 'S ').replace(/\bN\.\s/g, 'N ').replace(/BICKELL/g, 'BRICKELL').replace(/^[A-Z ,&]+,\s*(?=\d)/, '');
  const m = a.match(/^\s*(\d+)\s+([A-Z0-9 .]+?)(?:,|\s+(?:SUITE|STE|#|UNIT|FLOOR|FL)\b|$)/);
  if (!m) return { key: a.replace(/[^A-Z0-9]/g, ''), suite: '' };
  const street = m[2].replace(/[^A-Z0-9]/g, '').replace(/(ST|AVE|BLVD|DR|DRIVE|RD|ROAD|WAY|PLAZA|CIR|CIRCLE)$/, '');
  const rest = a.slice(m[0].length - (a[m[0].length - 1] === ',' ? 1 : 0));
  let s = rest.match(/(?:SUITE|STE|#|UNIT)\s*#?\s*([A-Z0-9-]+)/) || rest.match(/,\s*(?:PH\s*)?([0-9]{2,5}[A-Z]?)\s*,/);
  let suite = s ? s[1] : '';
  const f = rest.match(/(\d+)(?:ST|ND|RD|TH)\s+FLOOR/); if (!suite && f) suite = f[1] + '00';
  return { key: `${m[1]} ${street} ${suite}`.trim(), suite };
}
const SUF = /\b(JR|SR|II|III|ESQ)\b\.?/gi;
const nameParts = s => { const parts = String(s).split(',').map(x => norm(x.replace(SUF, ''))).filter(Boolean); return [(parts[0] || '').split(' '), (parts[1] || '').split(' ')[0]]; };
const tc = s => s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s\-'])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bDe La\b/g, 'de la').replace(/\bDe\b/g, 'de') : s;
const nice = s => { const parts = String(s).split(',').map(x => x.replace(SUF, '').replace(/"/g, '').trim()).filter(Boolean); return tc((parts[1] || '') + ' ' + (parts[0] || '')).replace(/\s+/g, ' ').trim(); };
const cluster = {}; for (const l of REG) { const k = akey(l.addr); (cluster[k.key] = cluster[k.key] || { suite: k.suite, addr: l.addr, members: [] }).members.push(l); }
// Office labels where the firm at that suite is public and unambiguous; otherwise the card shows the address.
const LABEL = { '200 SBISCAYNE 300': 'Bercow Radell Fernandez Larkin & Tapanes', '333 SE2ND 4400': 'Greenberg Traurig', '701 BRICKELL 3300': 'Holland & Knight', '1450 BRICKELL 2300': 'Bilzin Sumberg', '3800 NE1ST 200': 'LSN Partners', '9155 SDADELAND 1716': 'The Southern Group', '2525 PONCEDELEON 825': 'Becker & Poliakoff', '2 ALHAMBRA 102': 'Ballard Partners', '600 BRICKELL 3500': 'Gunster' };
const tidyAddr = a => tc(String(a).replace(/^[A-Za-z ,&]+,\s*(?=\d)/, '').replace(/\s+/g, ' ').replace(/,\s*(MIAMI|CORAL GABLES|FL)\b.*$/i, '').trim());
// Judgment calls: name look-alikes that are not the registrant.
const SKIP = [/DIAZ PADRON/, /DE LAS CUEVAS/, /^JOSE DIAZ$/];

// Donor rows
const rows = [];
const csv = s => { const out = []; let f = '', q = false, row = []; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === '"' && s[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; } else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); out.push(row); row = []; f = ''; } else if (c !== '\r') f += c; } if (f || row.length) { row.push(f); out.push(row); } return out; };
const [hdr, ...vf] = csv(readFileSync(P('scripts/data/county/donors/lopez-campaign.csv'), 'utf8'));
const H = Object.fromEntries(hdr.map((h, i) => [h, i]));
for (const r of vf) if (r[H['Cont/Exp']] === 'C') rows.push({ to: 'Lopez', acct: 'campaign', date: r[H['item date']], amount: +r[H.amount], donor: r[H.name].replace(/\s+/g, ' ').trim(), addr: r[H['address 1']], occ: r[H.occupation].replace(/<br>/g, ' ') });
for (const line of readFileSync(P('scripts/data/county/donors/pc80020.tsv'), 'utf8').split('\n').slice(1)) { const c = line.split('\t'); if (c.length < 8) continue; const [mm, dd, yy] = c[1].split('/'); rows.push({ to: 'Lopez', acct: 'pac', date: `${yy}-${mm}-${dd}`, amount: +c[2], donor: c[4].trim(), addr: c[5], occ: c[7], typ: c[3] }); }
const vfRows = (f, to, acct) => { const [h, ...rs] = csv(readFileSync(P('scripts/data/county/donors/' + f), 'latin1')); const X = Object.fromEntries(h.map((x, i) => [x, i]));
  for (const r of rs) if (r[X['Cont/Exp']] === 'C' && r[X['Amend. code']] !== 'D' && r.length > 5) rows.push({ to, acct, date: r[X['item date']], amount: +r[X.amount], donor: r[X.name].replace(/\s+/g, ' ').trim(), addr: r[X['address 1']], occ: (r[X.occupation] || '').replace(/<br>/g, ' ') }); };
const ACC = new Set(Object.values(B.onBallot).flatMap(o => o.accounts));
if (ACC.has('gilbert20')) vfRows('gilbert-campaign-2020.csv', 'Gilbert', 'gilbert20');
if (ACC.has('gilbert24')) vfRows('gilbert-campaign-2024.csv', 'Gilbert', 'gilbert24');
if (ACC.has('pc71293')) for (const line of readFileSync(P('scripts/data/county/donors/pc71293.tsv'), 'utf8').split('\n').slice(1)) { const c = line.split('\t'); if (c.length < 8) continue; const [mm, dd, yy] = c[1].split('/'); rows.push({ to: 'Gilbert', acct: 'pc71293', date: `${yy}-${mm}-${dd}`, amount: +c[2], donor: c[4].trim(), addr: c[5], occ: c[7], typ: c[3] }); }
for (const r of JSON.parse(readFileSync(P('scripts/data/county/donors/gilbert-fec.json')))) if (r.entity === 'IND' && !r.memo) rows.push({ to: 'Gilbert', acct: 'fec', date: r.date, amount: r.amount, donor: r.name, addr: r.street || '', occ: [r.occ, r.employer].filter(Boolean).join(' / ') });
for (const ref of rows.filter(r => r.amount < 0)) { const g = rows.find(r => r.acct === ref.acct && norm(r.donor) === norm(ref.donor) && r.amount === -ref.amount && r.date <= ref.date && !r.refunded); if (g) g.refunded = true; }
for (const r of rows) { r.n = norm(r.donor); r.w = new Set(r.n.split(' ')); r.ak = r.addr ? akey(r.addr).key : null; }
const live = rows.filter(r => r.amount > 0 && !r.refunded && r.date >= giftStart(B, r.to) && !SKIP.some(x => x.test(r.n)));

const gKey = g => [g.to, g.acct, norm(g.donor), Number(g.amount), g.date].join('|');
const matches = (p, r) => { const [lasts, first] = nameParts(p); return first && lasts.every(x => r.w.has(x)) && r.w.has(first) && !ORG.test(r.n); };
const findReg = name => { const w = norm(name.replace(SUF, '')).split(' '); return REG.find(l => { const [ls, f] = nameParts(l.name); return f === w[0] && ls.join(' ') === w.slice(-ls.length).join(' '); }); };

let added = 0, total = 0; const log = [];
for (const a of B.actions) {
  const have = new Set(a.gifts.map(gKey));
  // only members seated for the vote (a null roll entry means not yet on the commission)
  const push = g => { if (have.has(gKey(g)) || a.roll[g.to] == null) return; have.add(gKey(g)); a.gifts.push(g); added++; total += g.amount; log.push(`${a.id}: ${g.donor} $${g.amount} ${g.date} ${g.to}/${g.acct} <- ${g.kind}${g.rel ? '/' + g.rel : ''} ${g.lobbyist}${g.why ? ' (' + g.why.en + ')' : ''}`); };
  for (const l of a.lobbied || []) {
    const reg = findReg(l.name); if (!reg) continue;
    const k = akey(reg.addr), C = cluster[k.key];
    // (a) the named lobbyist
    for (const r of live) if (matches(reg.name, r) && (r.ak === k.key || LOB.test(r.occ))) push({ to: r.to, acct: r.acct, kind: 'lobbyist', donor: r.donor, amount: r.amount, date: r.date, addr: r.addr, occ: r.occ, lobbyist: l.name, forParty: l.for, basis: r.ak === k.key ? 'addr' : 'occ' });
    // (b) office-mates, only at a suite-level address
    if (!k.suite || !C || C.members.length < 2) continue;
    const office = LABEL[k.key] || tidyAddr(C.addr);
    for (const m of C.members) {
      if (m === reg || nameParts(m.name).join() === nameParts(reg.name).join()) continue;
      for (const r of live) if (matches(m.name, r) && (r.ak === k.key || LOB.test(r.occ))) push({ to: r.to, acct: r.acct, kind: 'firm', rel: 'office', donor: r.donor, amount: r.amount, date: r.date, addr: r.addr, occ: r.occ, lobbyist: l.name, forParty: l.for, firmName: office, basis: r.ak === k.key ? 'addr' : 'occ',
        why: { en: `${nice(m.name)}, registered with the county at the same office as ${l.name}` + (LABEL[k.key] ? ` (${tidyAddr(C.addr)})` : '') + (r.ak === k.key ? '; the report lists that address' : `; the report lists the occupation as “${r.occ}”`),
               es: `${nice(m.name)}, registrado ante el condado en la misma oficina que ${l.name}` + (LABEL[k.key] ? ` (${tidyAddr(C.addr)})` : '') + (r.ak === k.key ? '; el reporte muestra esa dirección' : `; el reporte indica la ocupación “${r.occ}”`),
               ht: `${nice(m.name)}, anrejistre nan konte a nan menm biwo ak ${l.name}` + (LABEL[k.key] ? ` (${tidyAddr(C.addr)})` : '') + (r.ak === k.key ? '; rapò a montre adrès sa a' : `; rapò a di okipasyon an se “${r.occ}”`) } });
    }
  }
  a.gifts.sort((p, q) => p.date.localeCompare(q.date));
}
writeFileSync(P('public/data/decisions.json'), JSON.stringify(d, null, 1) + '\n');
console.log(log.join('\n')); console.log(`added ${added} gifts, $${total.toLocaleString()}`);
