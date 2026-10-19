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
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIR = new URL('./data/federal/', import.meta.url);
const read = f => JSON.parse(readFileSync(new URL(f, DIR)));

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
  FY2026: { date: '2025-04-01', label: { en: 'FY2026 request (spring 2025)', es: 'Solicitud para el año fiscal 2026 (primavera de 2025)', ht: 'Demann pou ane fiskal 2026 (prentan 2025)' } },
  FY2027: { date: '2026-04-01', label: { en: 'FY2027 request (spring 2026)', es: 'Solicitud para el año fiscal 2027 (primavera de 2026)', ht: 'Demann pou ane fiskal 2027 (prentan 2026)' } },
};

export function buildFederal() {
  const reqs = read('requests.json'), lda = read('lda-clients.json').clients, gm = read('gm.json'), fec = read('fec-check.json').rows;
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
    if (r.fy === 'FY2026') a.links.push({ t: 'cmte', url: r.source });
    if (r.amountText && /million|thousand/i.test(r.amountText)) a.note = {
      en: 'Amount as the member’s page lists it (' + r.amountText + '); the exact figure may differ slightly.',
      es: 'Monto tal como aparece en la página del miembro (' + r.amountText + '); la cifra exacta puede variar un poco.',
      ht: 'Kantite a jan paj manm nan bay li (' + r.amountText + '); chif egzak la ka diferan yon ti kras.',
    };
    if (!c) a.noLda = true;
    actions.push(a);
  }
  actions.sort((p, q) => q.date.localeCompare(p.date) || p.id.localeCompare(q.id));
  return {
    key: 'ushouse', level: 'federal', type: 'requests', since: '2025-01-01', rosterBody: 'us-house',
    name: { en: 'U.S. House', es: 'Cámara de Representantes de EE. UU.', ht: 'Chanm Reprezantan Etazini' },
    members, onBallot, accounts,
    registries: [{ name: { en: 'Lobbying Disclosure Act reports (lda.gov)', es: 'Reportes de la Ley de Divulgación de Cabildeo (lda.gov)', ht: 'Rapò Lwa sou Divilgasyon Lobi (lda.gov)' }, url: 'https://lda.gov/' }],
    coverage: {
      en: 'Every Community Project Funding request for FY2026 and FY2027 by the five U.S. House members on Miami-Dade’s November 3 ballot (156 requests). FY2026 from the House Appropriations Committee’s consolidated table; FY2027 from each member’s own request page. Whether a request was funded in the final bill was not checked. Gifts come from lobbyists’ and firms’ own contribution reports to Congress (LD-203), each looked up in the campaign’s FEC reports.',
      es: 'Todas las solicitudes de Community Project Funding para los años fiscales 2026 y 2027 de los cinco miembros de la Cámara de EE. UU. en la boleta del 3 de noviembre en Miami-Dade (156 solicitudes). El año fiscal 2026 viene de la tabla consolidada del Comité de Asignaciones de la Cámara; el 2027, de la página de solicitudes de cada miembro. No se revisó si cada solicitud quedó financiada en la ley final. Las donaciones vienen de los reportes de contribuciones que los propios cabilderos y firmas presentan al Congreso (LD-203), cotejados con los reportes de la campaña ante la FEC.',
      ht: 'Tout demann Community Project Funding pou ane fiskal 2026 ak 2027 senk manm Chanm Etazini ki sou bilten 3 novanm Miami-Dade la (156 demann). Ane fiskal 2026 soti nan tablo konsolide Komite Afektasyon Chanm nan; 2027 soti nan paj demann chak manm. Nou pa verifye si chak demann te finanse nan lwa final la. Kado yo soti nan rapò kontribisyon lobiyis ak fèm yo menm bay Kongrè a (LD-203), epi nou chèche chak nan rapò FEC kanpay la.',
    },
    actions,
  };
}

export function apply(decisions, body) {
  const i = decisions.bodies.findIndex(b => b.key === 'ushouse');
  if (i >= 0) decisions.bodies[i] = body; else decisions.bodies.push(body);
  decisions.others = (decisions.others || []).filter(o => !(o.body && o.body.en === 'U.S. Senate'));
  decisions.others.push({ body: { en: 'U.S. Senate', es: 'Senado de EE. UU.', ht: 'Sena Etazini' }, people: [{ name: 'Ashley Moody', status: 'norequests' }] });
  return decisions;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const p = new URL('../public/data/decisions.json', import.meta.url);
  const d = JSON.parse(readFileSync(p));
  const body = buildFederal();
  writeFileSync(p, JSON.stringify(apply(d, body), null, 1) + '\n');
  const tied = body.actions.filter(a => a.gifts.length);
  console.log(body.actions.length + ' requests, ' + tied.length + ' with a gift');
}
