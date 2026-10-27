// Fill the firm-side gaps on the Miami legislators' budget-request cards (flhouse / flsenate):
// for every lobbying firm named on a form, add gifts the card is missing from (a) the firm itself or its
// PAC and (b) any lobbyist the firm lists in the Legislature's firm directory (2025 + 2026), matched by
// last+first name with a lobbying/government/legal occupation on the report. Same rule as the Ingoglia
// build in cabinet.mjs. Idempotent: gifts already on a card (same account, donor, amount, date) are skipped.
// Inputs: public/data/decisions.json, scripts/data/state/donors/*.tsv (DOE contrib.exe exports, 2025+),
//         scripts/data/state/lobbyfirms/firms.json (floridalobbyist.gov lobfirml_2025/2026 directories).
// Florida House full tenure (Brit, Oct 25, 2026): when the flhouse body has a tenure block (scripts/state-tenure.mjs),
// its members' 2020-2024 rows (scripts/data/tenure/flhouse/donors/) are read too and count from each member's
// giftsFrom; the FY 2021-22 through 2024-25 forms (H21- to H24-) are matched against the firm directories of the years the
// form was filed and heard (lobfirml_2020..2024, scripts/data/tenure/flsenate/lobbyfirms/firms-by-year.json).
// Florida Senate full tenure: the same for the flsenate body (S21- to S24- forms, the senators' 2018-2024 rows in
// scripts/data/tenure/flsenate/donors/). The 2025-26 forms keep the 2025 + 2026 directories.
// Run: node scripts/state-firm-gifts.mjs  then  node scripts/money-summary.mjs && node scripts/lobby-ledger.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const P = p => new URL(p, root);
const d = JSON.parse(readFileSync(P('public/data/decisions.json')));
const FIRMS = JSON.parse(readFileSync(P('scripts/data/state/lobbyfirms/firms.json'))).firms;
const norm = s => String(s).toUpperCase().replace(/&/g, ' AND ').replace(/[.,'"()\-]/g, ' ').replace(/\s+/g, ' ').trim();
const SUFFIX = /\b(LLC|INC|PA|P A|PLLC|LLP|THE|CORP|CO)\b/g;
const LOBOCC = /LOBBY|GOVERNMENT|GOVT|GOV\b|CONSULT|ATTORNEY|LAWYER|LAW FIRM|PUBLIC AFFAIRS|ADVOCA/i;
const ORG = /\b(INC|LLC|PAC|COMMITTEE|CORP|GROUP|TRUST|ASSOCIATES|P A|PA)\b/;
// Government bodies named as a form's recipient (they never give to campaigns; their names would only match by accident)
const GOVT = /^(CITY|TOWN|VILLAGE|COUNTY)\b|\b(COUNTY|CITY|TOWN|VILLAGE) OF\b|BOARD OF COUNTY|SCHOOL BOARD|SCHOOL DISTRICT|PUBLIC SCHOOLS|DEPARTMENT OF|SHERIFF|DISTRICT$|AUTHORITY$|MIAMI DADE COUNTY|STATE OF FLORIDA/;
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
const readRows = (file, acct, keep) => {
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const c = line.split('\t'); if (c.length < 8) continue;
    const [mm, dd, yy] = c[1].split('/');
    const r = { acct, date: `${yy}-${mm}-${dd}`, amount: Math.round(parseFloat(c[2]) * 100) / 100, typ: c[3].trim(), donor: c[4].trim(), addr: c[5].trim(), occ: c[7].trim() };
    r.n = norm(r.donor); r.w = new Set(r.n.split(' '));
    if (keep(r)) rows.push(r);
  }
};
for (const f of readdirSync(P('scripts/data/state/donors/'))) {
  if (!f.endsWith('.tsv')) continue;
  readRows(P('scripts/data/state/donors/' + f), f.slice(0, -4), r => r.date >= '2025-01-01');
}
// House full tenure: the 2020-2024 files, for accounts the flhouse body lists (a member's earlier campaign accounts
// are <name>-pre2025; a committee's earlier rows extend its own account)
const HT = d.bodies.find(b => b.key === 'flhouse');
const TD = 'scripts/data/tenure/flhouse/donors/';
if (HT && HT.tenure) for (const [acct, a] of Object.entries(HT.accounts)) {
  const from = (HT.tenure[a.owner] || {}).giftsFrom; if (!from) continue;
  if (!acct.endsWith('-pre2025') && !/^pc\d+$/.test(acct)) continue;
  const f = acct.endsWith('-pre2025') ? acct : acct + '-pre2025';
  if (!existsSync(P(TD + f + '.tsv'))) continue;
  readRows(P(TD + f + '.tsv'), acct, r => r.date >= from && r.date < '2025-01-01');
}
// Senate full tenure: the 2018-2024 rows of the senators' own accounts (scripts/data/tenure/flsenate/donors/<acct>.tsv),
// from each senator's giftsFrom (the 2025+ rows are already read from scripts/data/state/donors/)
const ST = d.bodies.find(b => b.key === 'flsenate');
if (ST && ST.tenure) for (const [acct, a] of Object.entries(ST.accounts)) {
  const from = (ST.tenure[a.owner] || {}).giftsFrom; if (!from) continue;
  const f = 'scripts/data/tenure/flsenate/donors/' + acct + '.tsv';
  if (existsSync(P(f))) readRows(P(f), acct, r => r.date >= from && r.date < '2025-01-01');
}
const BYYEAR = existsSync(P('scripts/data/tenure/flsenate/lobbyfirms/firms-by-year.json')) ? JSON.parse(readFileSync(P('scripts/data/tenure/flsenate/lobbyfirms/firms-by-year.json'))) : {};
// The directories for a form: FY 2023-24 forms were filed in late 2022 for the 2023 session, and so on
const DIRS = { H21: ['2020', '2021'], H22: ['2021', '2022'], H23: ['2022', '2023'], H24: ['2023', '2024'], S21: ['2020', '2021'], S22: ['2021', '2022'], S23: ['2022', '2023'], S24: ['2023', '2024'] };
const dirOf = id => {
  const ys = DIRS[String(id).slice(0, 3)]; const TB = String(id)[0] === 'S' ? ST : HT; if (!ys || !TB || !TB.tenure) return FIRMS;
  const out = {}; for (const y of ys) for (const [f, ps] of Object.entries(BYYEAR[y] || {})) out[f] = [...new Set([...(out[f] || []), ...ps])];
  return out;
};
// A refund (REF, negative) cancels the latest earlier gift of the same amount from the same donor to the same account.
for (const ref of rows.filter(r => r.amount < 0)) {
  const g = rows.filter(r => r.acct === ref.acct && r.n === ref.n && r.amount === -ref.amount && r.date <= ref.date && !r.refunded).sort((p, q) => q.date.localeCompare(p.date))[0];
  if (g) g.refunded = true;
}
for (let i = rows.length - 1; i >= 0; i--) if (rows[i].amount <= 0 || rows[i].refunded) rows.splice(i, 1);
const keysOf = new Map();
const findFirm = (name, DIR = FIRMS) => {
  if (!keysOf.has(DIR)) { const fk = {}; for (const k of Object.keys(DIR)) fk[norm(k).replace(SUFFIX, '').replace(/\s+/g, ' ').trim()] = k; keysOf.set(DIR, fk); }
  const firmKey = keysOf.get(DIR);
  const n = norm(name).replace(SUFFIX, '').replace(/\s+/g, ' ').trim(); if (firmKey[n]) return firmKey[n]; for (const k in firmKey) if (n.length > 8 && (k.includes(n) || n.includes(k))) return firmKey[k]; return null; };
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
    // Earlier rows count only on House cards, where the member's tenure starts the gift window
    const mine = rows.filter(r => accts[filer].includes(r.acct) && (r.date >= '2025-01-01' || B === HT || B === ST));
    const DIR = B === HT || B === ST ? dirOf(a.id) : FIRMS;
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
      // A firm the form names but that year's directory does not list (David T. Caserta Government Relations is listed
      // from 2025; in 2022-24 he is listed at David R. Custin & Associates): use the 2025-26 listing of the firm
      let D = DIR, key = findFirm(firmName, DIR);
      if (!key && DIR !== FIRMS && (key = findFirm(firmName, FIRMS))) { D = FIRMS; log.push(`.. ${a.id}: ${firmName} not in that year's directory; 2025-26 listing used`); }
      if (!key) { log.push(`!! no directory match for ${firmName}${DIR === FIRMS ? '' : ' (' + a.id + ')'}`); continue; }
      for (const p of D[key]) {
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
    // (c) the group the form says would receive the money, when it gave to the member who filed the form
    // (Brit, Oct 27, 2026: a recipient giving to its own sponsor belongs on the card like its lobbyists' gifts).
    // Organizations only, the same whole name (legal suffixes aside), never a government body (they don't give) or a name under 9 letters.
    for (const party of a.parties || []) {
      const pp = phrase(party);
      if (pp.trim().length < 9 || GOVT.test(norm(party))) continue;
      for (const r of mine) {
        if (!ORG.test(r.n) && !/\b(CENTER|FOUNDATION|ASSOCIATION|SOCIETY|UNIVERSITY|COLLEGE|HOSPITAL|TRUST|COUNCIL|CHAMBER|ALLIANCE|CLUB|MUSEUM|INSTITUTE)\b/.test(r.n)) continue;
        if (phrase(r.donor) !== pp) continue;   // the whole name, not a name that contains it (United Faculty of Miami Dade College is not the college)
        if (have.has(gKey({ acct: r.acct, donor: r.donor, amount: r.amount, date: r.date }))) continue;
        have.add(gKey({ acct: r.acct, donor: r.donor, amount: r.amount, date: r.date }));
        a.gifts.push({ to: filer, acct: r.acct, kind: 'party', rel: 'party', donor: r.donor, amount: r.amount, date: r.date, addr: r.addr, occ: r.occ });
        added++; total += r.amount; log.push(`${filer} ${a.ref}: ${r.donor} $${r.amount} ${r.date} -> recipient ${party}`);
      }
    }
    a.gifts.sort((p, q) => p.date.localeCompare(q.date));
  }
}
writeFileSync(P('public/data/decisions.json'), JSON.stringify(d, null, 1) + '\n');
console.log(log.join('\n')); console.log(`added ${added} gifts, $${total.toLocaleString()}`);
