// U.S. House earmark requests (Community Project Funding) by members on the Nov 3 ballot, with gifts from
// the federal lobbying firms registered for the group that would get the money.
// Run: node scripts/federal-earmarks.mjs   (adds or replaces the "ushouse" body and the U.S. Senate entry
// in public/data/decisions.json; then run node scripts/money-summary.mjs)
//
// Inputs (scripts/data/federal/, all pulled Oct 19, 2026):
// - requests.json: FY2026 rows from the House Appropriations Committee's consolidated CPF table
//   (fy26-house-cpf.json), FY2027 rows from each member's own request page. client = the LDA client the
//   recipient maps to (map-recipients.mjs), or null when no federal lobbying registration was found
//   (sheriff's offices, federal agencies, most small cities).
// - lda-clients.json: Lobbying Disclosure Act reports for 2025-2026 naming each client.
// - gm.json: lobbyists' and firms' own contribution reports (LD-203) to the member's campaign, from
//   firms registered for a client the member asked money for. Joint fundraising committees, honorary
//   expenses and state campaigns are left out.
// - fec-check.json: each LD-203 gift looked up in the campaign's FEC itemized receipts.
//
// Gift rule (same as the state cards): a gift counts if from the firm, its PAC, or any of its lobbyists.
//
// Floor votes (floor-votes.json): enacted 2025 laws where a Congressional Budget Office estimate, a
// Congressional Research Service report or the rule being overturned names the kind of business it
// affects. Donors are that kind of business giving through its PAC (pac-agg.json, from the campaign's
// FEC receipts); employees' own gifts are not counted. Moody gets a U.S. Senate body with her votes.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIR = new URL('./data/federal/', import.meta.url);
const TDIR = new URL('./data/tenure/congress/', import.meta.url);
const read = f => JSON.parse(readFileSync(new URL(f, DIR)));
// Full-tenure extension (scripts/data/tenure/congress/, Oct 25, 2026): earlier requests, laws and gifts, read
// alongside the 2025-2026 files when present.
const readT = f => { try { return JSON.parse(readFileSync(new URL(f, TDIR))); } catch (e) { return null; } };
// First day in the seat held now, and the first gift date counted (one cycle before).
export const TENURE = {
  'Diaz-Balart': { start: '2003-01-07', giftsFrom: '2001-01-01' },
  Salazar: { start: '2021-01-03', giftsFrom: '2019-01-01' },
  Gimenez: { start: '2021-01-03', giftsFrom: '2019-01-01' },
  Donalds: { start: '2021-01-03', giftsFrom: '2019-01-01' },
  Moskowitz: { start: '2023-01-03', giftsFrom: '2021-01-01' },
  Moody: { start: '2025-01-21', giftsFrom: '2023-01-01' },
};
const monthYear = d => ['January','February','March','April','May','June','July','August','September','October','November','December'][+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4);

const SENATOR = { key: 'Moody', name: 'Ashley Moody', person: 'ashley-moody', cmte: 'C00895763', cname: 'Moody for Florida', race: ['U.S. Senate', 'Senado de EE. UU.', 'Sena Etazini'] };
const MEMBERS = [
  { key: 'Diaz-Balart', name: 'Mario Diaz-Balart', person: 'mario-diaz-balart', cmte: 'C00376087', cname: 'Mario Diaz-Balart for Congress', race: ['U.S. House, District 26', 'Cámara de EE. UU., Distrito 26', 'Chanm Etazini, Distri 26'] },
  { key: 'Salazar', name: 'Maria Elvira Salazar', person: 'maria-elvira-salazar', cmte: 'C00714261', cname: 'Salazar for Congress', race: ['U.S. House, District 27', 'Cámara de EE. UU., Distrito 27', 'Chanm Etazini, Distri 27'] },
  { key: 'Gimenez', name: 'Carlos A. Gimenez', person: 'carlos-a-gimenez', cmte: 'C00735985', cname: 'Carlos Gimenez for Congress', race: ['U.S. House, District 28', 'Cámara de EE. UU., Distrito 28', 'Chanm Etazini, Distri 28'] },
  { key: 'Moskowitz', name: 'Jared Moskowitz', person: 'jared-moskowitz', cmte: 'C00807628', cname: 'Jared Moskowitz for Congress', race: ['U.S. House, District 25', 'Cámara de EE. UU., Distrito 25', 'Chanm Etazini, Distri 25'] },
  { key: 'Donalds', name: 'Byron Donalds', person: 'byron-donalds', cmte: 'C00733329', cname: 'Byron Donalds for Congress', race: ['Governor', 'Gobernador', 'Gouvènè'] },
];

// Group names as people know them (the LDA client keys are upper case)
const CLIENT_NAME = {
  'MIAMI-DADE COUNTY': 'Miami-Dade County', 'CITY OF MIAMI': 'City of Miami', 'UNIVERSITY OF MIAMI': 'University of Miami',
  'FLORIDA INTERNATIONAL UNIVERSITY': 'Florida International University', 'FLORIDA ATLANTIC UNIVERSITY': 'Florida Atlantic University',
  'NOVA SOUTHEASTERN UNIVERSITY': 'Nova Southeastern University', 'MICCOSUKEE TRIBE': 'Miccosukee Tribe of Indians of Florida',
  'BROWARD COUNTY': 'Broward County', "BROWARD SHERIFF'S OFFICE": 'Broward Sheriff’s Office', 'PALM BEACH COUNTY': 'Palm Beach County',
  'COLLIER COUNTY': 'Collier County', 'LEE COUNTY': 'Lee County', 'MONROE COUNTY': 'Monroe County', 'MONROE COUNTY SCHOOL DISTRICT': 'Monroe County School District',
  'KEY WEST INTERNATIONAL AIRPORT': 'Key West International Airport (Monroe County)',
};
const titleCase = s => String(s).toLowerCase().replace(/(^|[\s(/'-])([a-z])/g, (m, a, b) => a + b.toUpperCase())
  .replace(/\b(Llc|Lllp|Llp|Pa|Pc|Pac|Us|Ii|Iii)\b/g, w => w.toUpperCase()).replace(/\bF\/K\/A\b/i, 'f/k/a').replace(/\bOf\b/g, 'of').replace(/\bAnd\b/g, 'and').replace(/\bMc([a-z])/g, (m, a) => 'Mc' + a.toUpperCase());
const clientName = k => CLIENT_NAME[k] || titleCase(k);
const firmName = f => titleCase(f.replace(/\s*\(F\/K\/A[^)]*\)/, '')).replace(/, (LLP|LLC|P\.a\.|INC\.)$/i, m => m.toUpperCase().replace('P.A.', 'P.A.'));

const FY = {
  FY2022: { date: '2021-04-01', label: { en: 'FY2022 request (spring 2021)', es: 'Solicitud para el año fiscal 2022 (primavera de 2021)', ht: 'Demann pou ane fiskal 2022 (prentan 2021)' } },
  FY2023: { date: '2022-04-01', label: { en: 'FY2023 request (spring 2022)', es: 'Solicitud para el año fiscal 2023 (primavera de 2022)', ht: 'Demann pou ane fiskal 2023 (prentan 2022)' } },
  FY2024: { date: '2023-04-01', label: { en: 'FY2024 request (spring 2023)', es: 'Solicitud para el año fiscal 2024 (primavera de 2023)', ht: 'Demann pou ane fiskal 2024 (prentan 2023)' } },
  FY2025: { date: '2024-04-01', label: { en: 'FY2025 request (spring 2024)', es: 'Solicitud para el año fiscal 2025 (primavera de 2024)', ht: 'Demann pou ane fiskal 2025 (prentan 2024)' } },
  FY2026: { date: '2025-04-01', label: { en: 'FY2026 request (spring 2025)', es: 'Solicitud para el año fiscal 2026 (primavera de 2025)', ht: 'Demann pou ane fiskal 2026 (prentan 2025)' } },
  FY2027: { date: '2026-04-01', label: { en: 'FY2027 request (spring 2026)', es: 'Solicitud para el año fiscal 2027 (primavera de 2026)', ht: 'Demann pou ane fiskal 2027 (prentan 2026)' } },
};

const MOTION = {
  passage: { house: { en: 'final passage in the House', es: 'aprobación final en la Cámara', ht: 'adopsyon final nan Chanm nan' },
    senate: { en: 'final passage in the Senate', es: 'aprobación final en el Senado', ht: 'adopsyon final nan Sena a' } },
  passageHouseAmdt: { house: { en: 'House passage of the final version worked out with the Senate', es: 'aprobación en la Cámara de la versión final acordada con el Senado', ht: 'Chanm nan adopte vèsyon final yo te negosye ak Sena a' } },
  concurHouse: { house: { en: 'House vote to accept the Senate’s changes, sending it to the President', es: 'voto de la Cámara para aceptar los cambios del Senado y enviarla al Presidente', ht: 'Chanm nan vote pou aksepte chanjman Sena a epi voye l bay Prezidan an' } },
  concur: { senate: { en: 'Senate vote to accept the House version, sending it to the President', es: 'voto del Senado para aceptar la versión de la Cámara y enviarla al Presidente', ht: 'Sena a vote pou aksepte vèsyon Chanm nan epi voye l bay Prezidan an' } },
};
const voteUrl = v => v.chamber === 'house'
  ? 'https://clerk.house.gov/Votes/' + (v.rollYear || v.date.slice(0, 4)) + String(v.roll).padStart(3, '0')
  : (y => 'https://www.senate.gov/legislative/LIS/roll_call_votes/vote119' + y + '/vote_119_' + y + '_' + String(v.roll).padStart(5, '0') + '.htm')(v.date < '2026' ? 1 : 2);
const receiptsUrl = (cmte, name, d) => 'https://www.fec.gov/data/receipts/?committee_id=' + cmte + '&contributor_name=' + encodeURIComponent(name) + '&two_year_transaction_period=' + (d ? (+d.slice(0, 4) + (+d.slice(0, 4) % 2)) : 2026);

// One gift row per company per member: the PAC's total, number of receipts and date range.
export function classGifts(cls, member, cmte, agg) {
  const by = new Map();
  const from = (TENURE[member.key] || {}).giftsFrom || '2025-01-01';
  for (const [m, name, , total, n, first, last] of agg) {
    if (m !== member.key || last < from) continue;
    const d = cls.donors.find(([re]) => new RegExp(re).test(name));
    if (!d) continue;
    const [, company, occ] = d;
    const g = by.get(company) || { to: member.key, acct: member.key.toLowerCase(), kind: 'class', rel: 'clsF', donor: company + ' PAC', amount: 0, n: 0, date: first, last, occ, src: receiptsUrl(cmte, company, last) };
    g.amount += total; g.n += n;
    if (first < g.date) g.date = first;
    if (last > g.last) g.last = last;
    by.set(company, g);
  }
  return [...by.values()].filter(g => g.amount > 0).map(g => {
    const out = { ...g };
    if (out.n === 1) { delete out.n; delete out.last; }
    return out;
  }).sort((a, b) => b.amount - a.amount || a.donor.localeCompare(b.donor));
}

function voteNote(bill, v, cls) {
  const q = bill.quote, m = (MOTION[v.motion] || {})[v.chamber];
  const say = { en: ' says: ', es: ' dice (en inglés; traducción): ', ht: ' di (an angle; tradiksyon): ' };
  const tail = {
    en: 'Donors listed are ' + cls.label.en + ', giving through their PACs, as named in the campaign’s FEC reports; this does not claim they asked for the bill or for this vote. Gifts from their employees are not counted. Gifts are shown with the dates recorded, including any after the vote. It became law (' + bill.law + ').',
    es: 'Los donantes que aparecen son ' + cls.label.es + ', que donaron a través de sus comités de acción política (PAC), según los reportes de la campaña ante la FEC; esto no afirma que pidieran el proyecto ni este voto. No se cuentan las donaciones de sus empleados. Las donaciones se muestran con las fechas registradas, incluso las posteriores al voto. Se convirtió en ley (' + bill.law + ').',
    ht: 'Donatè ki parèt yo se ' + cls.label.ht + ', ki te bay atravè PAC yo (komite aksyon politik), jan rapò FEC kanpay la nonmen yo; sa pa di yo te mande pwojè lwa a ni vòt sa a. Nou pa konte kado anplwaye yo. Kado yo parèt ak dat yo anrejistre, menm sa ki vini apre vòt la. Li te tounen lwa (' + bill.law + ').',
  };
  const out = {};
  for (const l of ['en', 'es', 'ht']) {
    const intro = { en: 'Floor vote: ', es: 'Votación en el pleno: ', ht: 'Vòt nan sesyon plenyè: ' }[l] + m[l] + '. ';
    const quote = l === 'en' ? '“' + q.en + '”' : '“' + q[l] + '”';
    let body;
    // a quote kept in English (short analysis wording) says so instead of claiming a translation
    const tr = q.es === q.en ? { es: '; en inglés', ht: '; an angle' } : { es: '; en inglés, traducción', ht: '; an angle, tradiksyon' };
    if (q.pre && q.inline) body = q.pre[l] + ' ' + quote + ' (' + q.src[l] + (l === 'en' ? '' : tr[l]) + ').';
    else body = (q.pre ? q.pre[l] + ' ' : '') + q.src[l] + (l === 'en' ? say.en : say[l]) + quote;
    if (q.post) body += ' ' + q.post[l];
    out[l] = intro + body + ' ' + tail[l];
  }
  return out;
}

// pac-agg rows: 2025-2026 file plus the tenure file (rows before 2025 only, so 2025-26 gifts are not doubled)
export function pacAgg() {
  const a = read('pac-agg.json').rows, t = readT('pac-agg-tenure.json');
  if (!t) return a;
  const pre = [];
  const R = readT('fec-receipts-tenure.json');
  if (R) {
    const c = R.cols, by = new Map();
    for (const r of R.rows) {
      const x = Object.fromEntries(c.map((k, i) => [k, r[i]]));
      if (!['P', 'A'].includes(x.cmteKind) || x.date >= '2025-01-01') continue;
      const k = x.member + '|' + x.contributor;
      const g = by.get(k) || [x.member, x.contributor, x.entity, 0, 0, x.date, x.date];
      g[3] += x.amount; g[4] += 1; if (x.date < g[5]) g[5] = x.date; if (x.date > g[6]) g[6] = x.date;
      by.set(k, g);
    }
    pre.push(...by.values());
  }
  return [...a, ...pre];
}
// floor-votes bills and classes: 119th Congress file plus the tenure file (classes merged, donor patterns joined)
export function floorData() {
  const fv = read('floor-votes.json'), t = readT('floor-votes-tenure.json');
  if (!t) return fv;
  const classes = { ...fv.classes };
  for (const [k, c] of Object.entries(t.classes)) {
    if (!classes[k]) { classes[k] = c; continue; }
    const seen = new Set(classes[k].donors.map(d => d[0]));
    classes[k] = { ...classes[k], donors: [...classes[k].donors, ...c.donors.filter(d => !seen.has(d[0]))] };
  }
  return { ...fv, bills: [...fv.bills, ...t.bills], classes };
}

export function floorVotes(chamber, members) {
  const fv = floorData(), agg = pacAgg();
  const actions = [];
  for (const bill of fv.bills) for (const v of bill.votes) {
    if (v.chamber !== chamber) continue;
    const cls = fv.classes[bill.class];
    // a conditional benefit (bill.conditional: the analysis's words limiting it to a subset, such as "certain small rural
    // hospitals") ties no PAC: no record here shows a PAC's company is in that subset (scripts/data/industry/INSTRUCTIONS.md, rule 7)
    const gifts = bill.conditional ? [] : members.filter(m => v.members[m.key] != null).flatMap(m => classGifts(cls, m, m.cmte, agg));
    const links = [{ t: 'vote', url: voteUrl(v) }, { t: bill.quote.t, url: bill.quote.url }];
    if (bill.quote.url2) links.push({ t: 'crs', url: bill.quote.url2 });
    links.push({ t: 'bill', url: bill.bill });
    actions.push({
      id: 'USV-' + bill.key + '-' + (chamber === 'house' ? 'H' : 'S') + v.roll, date: v.date, ref: bill.ref, kind: 'bill',
      subject: bill.subject, parties: [], result: 'passed', tally: v.tally, notVoting: v.notVoting,
      roll: { ...v.members }, rollComplete: false, lobbied: [], gifts, note: voteNote(bill, v, cls), motion: v.motion, links, ...(bill.universe ? { universe: true } : {}),
    });
  }
  return actions;
}

export function buildSenate() {
  const m = SENATOR, acct = m.key.toLowerCase();
  return {
    key: 'ussenate', level: 'federal', type: 'requests', since: '2025-01-01', rosterBody: 'us-senate', noRequests: true,
    tenure: { [m.key]: TENURE[m.key] },
    name: { en: 'U.S. Senate', es: 'Senado de EE. UU.', ht: 'Sena Etazini' },
    members: [{ key: m.key, name: m.name, person: m.person }],
    onBallot: { [m.key]: { race: { en: m.race[0], es: m.race[1], ht: m.race[2] }, accounts: [acct] } },
    accounts: { [acct]: { owner: m.key, name: { en: m.cname, es: m.cname, ht: m.cname }, url: 'https://www.fec.gov/data/committee/' + m.cmte + '/' } },
    registries: null,
    // Senate candidates on the ballot who hold no office. Candidates who hold another office (Nixon) are
    // cross-listed by the page from their own tab's onBallot race.
    alsoOnBallot: [
      { name: 'Neil J. Gillespie', note: {
        en: 'holds no elected office, so there are no official actions to show',
        es: 'no ocupa ningún cargo electo, así que no hay acciones oficiales que mostrar',
        ht: 'li pa gen okenn pòs eli, kidonk pa gen aksyon ofisyèl pou montre' } },
    ],
    coverage: {
      en: 'Senator Moody made no Congressionally Directed Spending requests for FY2026 or FY2027 (Senate Appropriations Committee charts). Floor votes are on 2025 laws where a Congressional Budget Office estimate, a Congressional Research Service report or the rule being overturned names the kind of business affected; donors are those businesses’ PACs giving to Moody for Florida in 2025 or 2026.',
      es: 'La senadora Moody no hizo solicitudes de Congressionally Directed Spending para los años fiscales 2026 ni 2027 (tablas del Comité de Asignaciones del Senado). Los votos en el pleno son sobre leyes de 2025 en las que una estimación de la Oficina de Presupuesto del Congreso, un informe del Servicio de Investigación del Congreso o la regla que se anula nombra el tipo de negocio afectado; los donantes son los PAC de esos negocios que donaron a Moody for Florida en 2025 o 2026.',
      ht: 'Senatè Moody pa t fè okenn demann Congressionally Directed Spending pou ane fiskal 2026 oswa 2027 (tablo Komite Afektasyon Sena a). Vòt nan sesyon plenyè yo se sou lwa 2025 kote yon estimasyon Biwo Bidjè Kongrè a, yon rapò Sèvis Rechèch Kongrè a oswa règ y ap anile a nonmen kalite biznis ki konsène; donatè yo se PAC biznis sa yo ki te bay Moody for Florida an 2025 oswa 2026.',
    },
    actions: floorVotes('senate', [m]).sort((p, q) => q.date.localeCompare(p.date) || p.id.localeCompare(q.id)),
  };
}

export function buildFederal() {
  const T = { req: readT('requests-tenure.json') || [], lda: (readT('lda-clients-tenure.json') || {}).clients || {}, gm: readT('gm-tenure.json') || {}, fec: (readT('fec-check-tenure.json') || {}).rows || [] };
  const reqs = [...read('requests.json'), ...T.req];
  const lda = { ...read('lda-clients.json').clients };
  for (const [k, v] of Object.entries(T.lda)) {
    const have = new Set((lda[k] || []).map(x => x[0]));
    lda[k] = [...(lda[k] || []), ...v.filter(x => !have.has(x[0]))];
  }
  const gm = { ...read('gm.json') };
  for (const [k, v] of Object.entries(T.gm)) {
    const have = new Set((gm[k] || []).map(x => x[7] + '|' + x[6] + '|' + x[5]));
    gm[k] = [...(gm[k] || []), ...v.filter(x => !have.has(x[7] + '|' + x[6] + '|' + x[5]))];
  }
  const fec = [...read('fec-check.json').rows, ...T.fec];
  const fecKey = (m, who, amt, d) => [m, who, Number(amt), d].join('|');
  const fecMap = new Map(fec.map(r => [fecKey(r[0], r[1], r[2], r[3]), r[4]]));
  const members = MEMBERS.map(m => ({ key: m.key, name: m.name, person: m.person }));
  const onBallot = {}, accounts = {};
  for (const m of MEMBERS) {
    const acct = m.key.toLowerCase();
    onBallot[m.key] = { race: { en: m.race[0], es: m.race[1], ht: m.race[2] }, accounts: [acct] };
    accounts[acct] = { owner: m.key, name: { en: m.cname, es: m.cname, ht: m.cname }, url: 'https://www.fec.gov/data/committee/' + m.cmte + '/' };
  }
  const actions = [], count = {};
  for (const r of reqs) {
    const m = MEMBERS.find(x => x.key === r.member);
    if (!m) continue;
    if (!(r.amount > 0)) continue;   // a request row with no amount (Donalds FY2023 Housing Choice Vouchers, listed at $0) is not a request for money
    const fy = FY[r.fy];
    const n = count[m.key + r.fy] = (count[m.key + r.fy] || 0) + 1;
    const id = 'US' + r.fy.slice(4) + '-' + m.key.replace(/[^A-Za-z]/g, '') + '-' + String(n).padStart(2, '0');
    const c = r.client;
    const party = c ? clientName(c) : r.recipient;
    const lobbied = [];
    if (c && lda[c]) for (const [firm, lobs, first, uuid] of lda[c]) {
      const fn = firm === c ? party : firmName(firm);
      if (!lobs.length) lobbied.push({ name: fn, firm: null, for: party, src: 'lda', url: 'https://lda.gov/filings/public/filing/' + uuid + '/print/' });
      for (const l of lobs) lobbied.push({ name: titleCase(l), firm: firm === c ? null : fn, for: party, src: 'lda', url: 'https://lda.gov/filings/public/filing/' + uuid + '/print/' });
    }
    const gifts = [];
    const seen = new Set();
    for (const g of (c && gm[m.key + '|' + c]) || []) {
      const [reg, kind, lob, contrib, , amt, date, doc] = g;
      if (date < ((TENURE[m.key] || {}).giftsFrom || '2025-01-01')) continue;
      // Lighthouse Strategies reported one $500 gift twice (as the firm on Mar 6 and as its lobbyist on Mar 23);
      // the campaign's FEC report shows a single $500 from Sam Kuebler on Mar 6, 2026.
      if (reg === 'LIGHTHOUSE STRATEGIES LLC' && kind === 'org') continue;
      const own = reg === c;   // the group's own staff lobbyist
      const rel = kind === 'org' ? (contrib === 'SELF' ? 'ldaFirm' : 'ldaPac') : own ? 'ldaOwn' : 'ldaLob';
      const who = kind === 'org' ? contrib : lob;
      const f = fecMap.get(fecKey(m.key, who, amt, date));
      const donor = kind === 'org' ? (contrib === 'SELF' ? firmName(reg) : titleCase(contrib)) : (contrib === 'SELF' ? titleCase(lob) : titleCase(contrib) + ' (' + titleCase(lob) + ')');
      const k = [donor, amt, date].join('|');
      if (seen.has(k)) continue;
      seen.add(k);
      gifts.push({
        to: m.key, acct: m.key.toLowerCase(), kind: 'firm', rel, donor, amount: Number(amt), date,
        firmName: own ? party : firmName(reg), lobbyist: kind === 'lob' ? titleCase(lob) : null, forParty: party,
        ld203: true, fec: f !== undefined ? !!f : null,
        src: 'https://lda.gov/filings/public/contribution/' + doc + '/print/',
      });
    }
    gifts.sort((a, b) => a.date.localeCompare(b.date));
    const subject = r.project.replace(/\s+/g, ' ').trim();
    const a = {
      id, date: fy.date, dateLabel: fy.label, ref: r.fy + ' CPF', kind: 'request',
      title: { en: 'Earmark request: ' + subject, es: 'Solicitud de fondos federales: ' + subject, ht: 'Demann lajan federal: ' + subject },
      parties: [r.recipient], result: 'requestedF', ask: r.amount, roll: { [m.key]: 'requested' }, rollComplete: false,
      lobbied, gifts, links: [{ t: 'record', url: r.memberUrl || r.source }],
    };
    if (r.memberUrl && r.source && r.source !== r.memberUrl) a.links.push({ t: 'cmte', url: r.source });
    if (r.amountText && /million|thousand/i.test(r.amountText)) a.note = {
      en: 'Amount as the member’s page lists it (' + r.amountText + '); the exact figure may differ slightly.',
      es: 'Monto tal como aparece en la página del miembro (' + r.amountText + '); la cifra exacta puede variar un poco.',
      ht: 'Kantite a jan paj manm nan bay li (' + r.amountText + '); chif egzak la ka diferan yon ti kras.',
    };
    if (r.funded != null && r.fy !== 'FY2026' && r.fy !== 'FY2027') {
      a.funded = r.funded;
      const usd = n => '$' + Math.round(n).toLocaleString('en-US');
      const fn = r.fy === 'FY2025'
        ? { en: 'Not funded: FY2025 ran on a full-year continuing resolution with no earmarks.', es: 'No se financió: el año fiscal 2025 se cubrió con una resolución continua de todo el año, sin fondos para proyectos.', ht: 'Pa finanse: ane fiskal 2025 te mache sou yon rezolisyon kontinyèl pou tout ane a, san lajan pou pwojè.' }
        : r.funded ? { en: 'Funded in the final law: ' + usd(r.funded) + ' (GAO, Tracking the Funds).', es: 'Financiado en la ley final: ' + usd(r.funded) + ' (GAO, Tracking the Funds).', ht: 'Finanse nan lwa final la: ' + usd(r.funded) + ' (GAO, Tracking the Funds).' }
        : { en: 'Not found among the projects funded in the final law (GAO, Tracking the Funds).', es: 'No aparece entre los proyectos financiados en la ley final (GAO, Tracking the Funds).', ht: 'Li pa parèt pami pwojè yo finanse nan lwa final la (GAO, Tracking the Funds).' };
      a.note = a.note ? { en: a.note.en + ' ' + fn.en, es: a.note.es + ' ' + fn.es, ht: a.note.ht + ' ' + fn.ht } : fn;
      if (r.fundedSource) a.links.push({ t: 'gao', url: r.fundedSource });
    }
    if (!c) a.noLda = true;
    actions.push(a);
  }
  const nReq = actions.length;
  actions.push(...floorVotes('house', MEMBERS));
  actions.sort((p, q) => q.date.localeCompare(p.date) || p.id.localeCompare(q.id));
  return {
    key: 'ushouse', level: 'federal', type: 'requests', since: '2003-01-07', rosterBody: 'us-house',
    tenure: Object.fromEntries(MEMBERS.map(m => [m.key, TENURE[m.key]])),
    name: { en: 'U.S. House', es: 'Cámara de Representantes de EE. UU.', ht: 'Chanm Reprezantan Etazini' },
    members, onBallot, accounts,
    registries: [{ name: { en: 'Lobbying Disclosure Act reports (lda.gov)', es: 'Reportes de la Ley de Divulgación de Cabildeo (lda.gov)', ht: 'Rapò Lwa sou Divilgasyon Lobi (lda.gov)' }, url: 'https://lda.gov/' }],
    coverage: {
      en: 'Every Community Project Funding request the five U.S. House members on Miami-Dade’s November 3 ballot filed since earmarks returned in FY2022 (' + nReq + ' requests; none were possible before FY2022): FY2022-FY2024 from the House Appropriations Committee’s request tables, FY2025 and FY2027 from each member’s own request page, FY2026 from the committee’s consolidated table. Moskowitz’s FY2025 requests are not included: his page no longer lists them. Funded amounts for FY2022-FY2024 are from GAO’s Tracking the Funds data; FY2025 had no earmarks. Gifts come from lobbyists’ and firms’ own contribution reports to Congress (LD-203, 2019 on), each looked up in the campaign’s FEC reports. Floor votes are on every law enacted while each member served (from January 2003 for Díaz-Balart, January 2021 for Salazar, Giménez and Donalds, January 2023 for Moskowitz) whose Congressional Research Service summary, Congressional Budget Office estimate or overturned rule names the kind of business it helps; donors are those businesses’ PACs, from FEC records starting one election cycle before each member took office.',
      es: 'Todas las solicitudes de Community Project Funding que presentaron los cinco miembros de la Cámara de EE. UU. en la boleta del 3 de noviembre en Miami-Dade desde que volvieron estos fondos en el año fiscal 2022 (' + nReq + ' solicitudes; antes de 2022 no se podían pedir): los años fiscales 2022 a 2024 vienen de las tablas de solicitudes del Comité de Asignaciones de la Cámara; 2025 y 2027, de la página de cada miembro; 2026, de la tabla consolidada del comité. No se incluyen las solicitudes de Moskowitz para el año fiscal 2025: su página ya no las muestra. Los montos financiados de 2022 a 2024 vienen de los datos Tracking the Funds de la GAO; en 2025 no hubo fondos para proyectos. Las donaciones vienen de los reportes de contribuciones que los propios cabilderos y firmas presentan al Congreso (LD-203, desde 2019), cotejados con los reportes de la campaña ante la FEC. Los votos en el pleno son sobre todas las leyes aprobadas mientras cada miembro ocupó el cargo (desde enero de 2003 para Díaz-Balart, enero de 2021 para Salazar, Giménez y Donalds, enero de 2023 para Moskowitz) cuyo resumen del Servicio de Investigación del Congreso, estimación de la Oficina de Presupuesto del Congreso o regla anulada nombra el tipo de negocio que beneficia; los donantes son los PAC de esos negocios, según los registros de la FEC desde un ciclo electoral antes de que cada miembro asumiera.',
      ht: 'Tout demann Community Project Funding senk manm Chanm Etazini ki sou bilten 3 novanm Miami-Dade la te depoze depi lajan sa yo te retounen nan ane fiskal 2022 (' + nReq + ' demann; anvan 2022 yo pa t ka mande): ane fiskal 2022 rive 2024 soti nan tablo demann Komite Afektasyon Chanm nan; 2025 ak 2027 soti nan paj chak manm; 2026 soti nan tablo konsolide komite a. Demann Moskowitz pou ane fiskal 2025 pa ladan: paj li pa montre yo ankò. Kantite yo finanse pou 2022 rive 2024 soti nan done Tracking the Funds GAO; an 2025 pa t gen lajan pou pwojè. Kado yo soti nan rapò kontribisyon lobiyis ak fèm yo bay Kongrè a (LD-203, depi 2019), epi nou chèche chak nan rapò FEC kanpay la. Vòt nan sesyon plenyè yo se sou tout lwa yo adopte pandan chak manm te nan pòs la (depi janvye 2003 pou Díaz-Balart, janvye 2021 pou Salazar, Giménez ak Donalds, janvye 2023 pou Moskowitz) kote rezime Sèvis Rechèch Kongrè a, estimasyon Biwo Bidjè Kongrè a oswa règ yo anile a nonmen kalite biznis li ede; donatè yo se PAC biznis sa yo, dapre dosye FEC depi yon sik eleksyon anvan chak manm te pran pòs.',
    },
    actions,
  };
}

export function apply(decisions, body, senate) {
  for (const b of [body, senate]) {
    if (!b) continue;
    const i = decisions.bodies.findIndex(x => x.key === b.key);
    if (i >= 0) decisions.bodies[i] = b; else decisions.bodies.push(b);
  }
  decisions.others = (decisions.others || []).filter(o => !(o.body && o.body.en === 'U.S. Senate'));
  if (!senate) decisions.others.push({ body: { en: 'U.S. Senate', es: 'Senado de EE. UU.', ht: 'Sena Etazini' }, people: [{ name: 'Ashley Moody', status: 'norequests' }] });
  if (!decisions.others.length) delete decisions.others;
  return decisions;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const p = new URL('../public/data/decisions.json', import.meta.url);
  const d = JSON.parse(readFileSync(p));
  const body = buildFederal(), senate = buildSenate();
  writeFileSync(p, JSON.stringify(apply(d, body, senate), null, 1) + '\n');
  const req = body.actions.filter(a => a.kind === 'request'), votes = body.actions.filter(a => a.kind === 'bill');
  console.log(req.length + ' requests, ' + req.filter(a => a.gifts.length).length + ' with a gift; ' + votes.length + ' House floor votes; ' + senate.actions.length + ' Senate floor votes');
}
