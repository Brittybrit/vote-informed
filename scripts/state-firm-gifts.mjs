// Fill the firm-side gaps on the Miami legislators' budget-request cards (flhouse / flsenate):
// for every lobbying firm named on a form, add gifts the card is missing from (a) the firm itself or its
// PAC and (b) any lobbyist the firm lists in the Legislature's firm directory (2025 + 2026), matched by
// last+first name with a lobbying/government/legal occupation on the report. Same rule as the Ingoglia
// build in cabinet.mjs. Idempotent: gifts already on a card (same account, donor, amount, date) are skipped.
// Inputs: public/data/decisions.json, scripts/data/state/donors/*.tsv (DOE contrib.exe exports, 2025+),
//         scripts/data/state/lobbyfirms/firms.json (floridalobbyist.gov lobfirml_2025/2026 directories).
// Run: node scripts/state-firm-gifts.mjs  then  node scripts/money-summary.mjs && node scripts/lobby-ledger.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const P = p => new URL(p, root);
const d = JSON.parse(readFileSync(P('public/data/decisions.json')));
const FIRMS = JSON.parse(readFileSync(P('scripts/data/state/lobbyfirms/firms.json'))).firms;
const norm = s => String(s).toUpperCase().replace(/&/g, ' AND ').replace(/[.,'"()\-]/g, ' ').replace(/\s+/g, ' ').trim();
const SUFFIX = /\b(LLC|INC|PA|P A|PLLC|LLP|THE|CORP|CO)\b/g;
const LOBOCC = /LOBBY|GOVERNMENT|GOVT|GOV\b|CONSULT|ATTORNEY|LAWYER|LAW FIRM|PUBLIC AFFAIRS|ADVOCA/i;
const ORG = /\b(INC|LLC|PAC|COMMITTEE|CORP|GROUP|TRUST|ASSOCIATES|P A|PA)\b/;
// Firm-entity match: the firm's name (minus corporate suffixes and glue words) as a contiguous phrase in the donor's name.
const phrase = s => ' ' + norm(s).replace(SUFFIX, '').replace(/\b(AND|OF)\b/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
// Judgment calls, kept explicit:
// - Donors whose name shares a word with a firm but are not that firm (Southern Glazer's vs The Southern Group, etc.).
const NOT_FIRM = /SOUTHERN GLAZER|SOUTHERN GARDENS|SOUTHERN EAGLE|SOUTHERN OAK|WHITE OAK|OAK STRONG|UNIVERSAL CITY|CAPITOL SOLUTIONS/;
// - A lobbyist's own professional association counts as that lobbyist giving (shown as a firm-lobbyist gift, named in the note).
const OWN_PA = { 'JOSE FELIX DIAZ': 'Diaz, Jose F.' };
// - Lobbyists listed at two firms in the directory: attribute to the firm whose other lobbyists gave the same day,
//   otherwise to both (and say so). Nicholas Matthews: Becker & Poliakoff (2025) and The Southern Group (2025-26).
const PREFER = { 'Matthews, Nicholas G.': 'The Southern Group' };
// - Same-name lobbyists at two firms are two people unless the directory says otherwise: Jose Diaz at Robert M. Levy
//   is not Jose Felix Diaz of Ballard Partners (Miami).
const SKIP = new Set(['Robert M. Levy & Associates Inc|Diaz, Jose']);

const rows = [];
for (const f of readdirSync(P('scripts/data/state/donors/'))) {
  if (!f.endsWith('.tsv')) continue;
  const acct = f.slice(0, -4);
  for (const line of readFileSync(P('scripts/data/state/donors/' + f), 'utf8').split('\n')) {
    const c = line.split('\t'); if (c.length < 8) continue;
    const [mm, dd, yy] = c[1].split('/');
    const r = { acct, date: `${yy}-${mm}-${dd}`, amount: Math.round(parseFloat(c[2]) * 100) / 100, typ: c[3].trim(), donor: c[4].trim(), addr: c[5].trim(), occ: c[7].trim() };
    r.n = norm(r.donor); r.w = new Set(r.n.split(' '));
    if (r.date >= '2025-01-01' && r.amount > 0) rows.push(r);
  }
}
const firmKey = {}; for (const k of Object.keys(FIRMS)) firmKey[norm(k).replace(SUFFIX, '').replace(/\s+/g, ' ').trim()] = k;
const findFirm = name => { const n = norm(name).replace(SUFFIX, '').replace(/\s+/g, ' ').trim(); if (firmKey[n]) return firmKey[n]; for (const k in firmKey) if (n.length > 8 && (k.includes(n) || n.includes(k))) return firmKey[k]; return null; };
const personKey = p => { const [last, first] = p.split(',').map(s => s.trim()); return [norm(last.replace(/\s+(Jr|Sr|III|II)\.?$/, '')), norm(first.replace(/\(.*?\)/g, '')).split(' ')[0]]; };
const nice = p => { const [last, first] = p.split(',').map(s => s.trim()); return first.replace(/\(.*?\)/g, '').trim() + ' ' + last; };
const gKey = g => [g.acct, norm(g.donor), Number(g.amount), g.date].join('|');

let added = 0, total = 0; const log = [];
for (const B of d.bodies) {
  if (B.key !== 'flhouse' && B.key !== 'flsenate') continue;
  const accts = {}; for (const k in B.accounts) (accts[B.accounts[k].owner] = accts[B.accounts[k].owner] || []).push(k);
  for (const a of B.actions) {
    if (a.kind !== 'request') continue;
    const filer = Object.keys(a.roll).find(k => a.roll[k] === 'requested');
    if (!accts[filer]) continue;
    const mine = rows.filter(r => accts[filer].includes(r.acct));
    const have = new Set(a.gifts.map(gKey));
    const push = g => { if (have.has(gKey(g))) return; have.add(gKey(g)); a.gifts.push(g); added++; total += g.amount; log.push(`${filer} ${a.ref}: ${g.donor} $${g.amount} ${g.date} -> ${g.firmName} (${g.rel}${g.why ? '; ' + g.why.en : ''})`); };
    for (const l of a.lobbied) {
      const firmName = l.firm && !/^Page \d/.test(l.firm) ? l.firm.trim() : null; if (!firmName) continue;
      const forParty = l.for || a.parties[0] || '';
      // (a) the firm itself or its PAC
      const ph = phrase(firmName);
      if (ph.trim().length > 4) for (const r of mine) {
        if (NOT_FIRM.test(r.n) || !phrase(r.donor).includes(ph)) continue;
        const pac = /POLITICAL COMMITTEE|\bPAC\b|COMMITTEE/.test(r.n + ' ' + r.occ.toUpperCase());
        push({ to: filer, acct: r.acct, kind: 'firm', rel: pac ? 'firmpac' : 'firm', donor: r.donor, amount: r.amount, date: r.date, occ: r.occ, firmName, lobbyist: l.name, forParty });
      }
      // (b) every lobbyist the directory lists at the firm
      const key = findFirm(firmName); if (!key) { log.push(`!! no directory match for ${firmName}`); continue; }
      for (const p of FIRMS[key]) {
        if (SKIP.has(key + '|' + p)) continue;
        if (PREFER[p] && PREFER[p] !== key) continue;
        const [last, first] = personKey(p);
        for (const r of mine) {
          const ownPa = Object.keys(OWN_PA).find(k => r.n.startsWith(k) && OWN_PA[k] === p);
          if (!ownPa && (ORG.test(r.n) || !r.w.has(last) || !r.w.has(first) || !LOBOCC.test(r.occ))) continue;
          const hid = /^\*+$/.test(r.addr), who = nice(p), self = norm(l.name || '') === norm(who) || (l.name && personKey(p).every(k => norm(l.name).split(' ').includes(k)));
          const why = ownPa ? { en: `the professional association of ${who}, listed at the firm in the Legislature's lobbyist directory`, es: `la asociación profesional de ${who}, listado en la firma en el directorio de cabilderos de la Legislatura`, ht: `asosyasyon pwofesyonèl ${who}, ki nan lis fèm nan nan anyè lobiyis Lejislati a` }
            : { en: `${who}, listed at the firm in the Legislature's lobbyist directory` + (hid ? '; name and occupation match, the report withholds the address' : ''),
                es: `${who}, listado en la firma en el directorio de cabilderos de la Legislatura` + (hid ? '; coinciden nombre y ocupación, el reporte oculta la dirección' : ''),
                ht: `${who}, ki nan lis fèm nan nan anyè lobiyis Lejislati a` + (hid ? '; non ak okipasyon koresponn, rapò a kache adrès la' : '') };
          if (self) push({ to: filer, acct: r.acct, kind: 'firm', rel: 'named', donor: r.donor, amount: r.amount, date: r.date, occ: r.occ, firmName, lobbyist: l.name, forParty, ...(hid ? { why: { en: 'name and occupation match; the report withholds the address', es: 'coinciden nombre y ocupación; el reporte oculta la dirección', ht: 'non ak okipasyon koresponn; rapò a kache adrès la' } } : {}) });
          else push({ to: filer, acct: r.acct, kind: 'firm', rel: 'firmlob', donor: r.donor, amount: r.amount, date: r.date, occ: r.occ, firmName, lobbyist: l.name, forParty, why });
        }
      }
    }
    a.gifts.sort((p, q) => p.date.localeCompare(q.date));
  }
}
writeFileSync(P('public/data/decisions.json'), JSON.stringify(d, null, 1) + '\n');
console.log(log.join('\n')); console.log(`added ${added} gifts, $${total.toLocaleString()}`);
