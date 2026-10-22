// Florida Cabinet: Attorney General Uthmeier, CFO Ingoglia and Agriculture Commissioner Simpson (all on the
// Nov 3, 2026 ballot) vs. their donors. Cards in scripts/data/cabinet/cards.json; gifts are pulled from the
// FL Division of Elections exports in scripts/data/cabinet/*.tsv (candidate accounts and the political
// committees each chairs, 2025-2026) by donor-name or address match. Also adds Ingoglia's four 2025 Senate
// floor votes (he was a state senator until July 21, 2025) to the existing Florida Senate cards.
// Run: node scripts/cabinet.mjs (safe to re-run), then node scripts/money-summary.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = new URL('./data/cabinet/', import.meta.url);
const C = JSON.parse(readFileSync(new URL('cards.json', DIR)));
const FILE = new URL('../public/data/decisions.json', import.meta.url);
const d = JSON.parse(readFileSync(FILE));

// --- donor rows -------------------------------------------------------------------------------
const norm = s => String(s || '').toUpperCase().replace(/&/g, ' AND ').replace(/[.,'"()\-]/g, ' ').replace(/\s+/g, ' ').trim();
const rows = [];
for (const [acct, a] of Object.entries(C.accounts)) {
  for (const line of readFileSync(new URL(acct + '.tsv', DIR), 'utf8').split(/\r?\n/)) {
    const c = line.split('\t');
    if (c.length < 8) continue;
    const [mm, dd, yy] = c[1].split('/');
    rows.push({ to: a.owner, acct, date: `${yy}-${mm}-${dd}`, amount: Number(c[2]), typ: c[3], donor: c[4].trim(), addr: c[5].trim(), city: c[6].trim(), occ: c[7].trim(), n: norm(c[4]), na: norm(c[5] + ' ' + c[6]) });
  }
}
function gifts(spec, onlyTo) {
  const out = [];
  for (const g of spec) {
    const terms = g.match.map(norm), addrs = (g.addr || []).map(norm);
    for (const r of rows) {
      if (onlyTo && r.to !== onlyTo) continue;
      if (r.amount <= 0 || r.date < '2025-01-01') continue;
      const nameHit = terms.some(t => r.n.includes(t));
      const addrHit = addrs.length && addrs.some(t => r.na.includes(t));
      if (!(nameHit && (!addrs.length || addrHit))) continue;
      out.push({ to: r.to, acct: r.acct, kind: g.kind, ...(g.kind === 'class' ? { rel: 'cls' } : {}), donor: r.donor, amount: Math.round(r.amount * 100) / 100, date: r.date, addr: r.addr, occ: r.occ });
    }
  }
  const seen = new Set();
  return out.filter(g => { const k = g.acct + '|' + g.donor + '|' + g.amount + '|' + g.date; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.to.localeCompare(b.to) || a.date.localeCompare(b.date));
}

// --- the Cabinet body -------------------------------------------------------------------------
const SEATED = { DeSantis: ['2019-01-08', null], Uthmeier: ['2025-02-17', null], Ingoglia: ['2025-07-21', null], Patronis: ['2017-06-30', '2025-03-31'], Simpson: ['2023-01-03', null] };
const seated = (k, date) => SEATED[k][0] <= date && (!SEATED[k][1] || date <= SEATED[k][1]);
const members = C.members.map(m => ({ key: m.key, name: m.name, person: m.person || { DeSantis: 'ron-desantis', Patronis: 'jimmy-patronis' }[m.key] }));
const ONBALLOT = Object.keys(C.onBallot);

const actions = C.cards.map(card => {
  const a = { id: card.id, date: card.date, ref: card.ref, kind: card.kind, subject: card.subject, parties: card.parties, result: card.result, lobbied: [], giftNotes: {}, note: card.note };
  if (card.meeting) {
    const M = C.meetings[card.meeting];
    a.meeting = 'cabinet';
    a.roll = {};
    for (const m of members) a.roll[m.key] = seated(m.key, card.date) ? (M.roll[m.key] || 'yes') : null;
    a.rollComplete = true; a.tally = [Object.values(a.roll).filter(v => v === 'yes').length, 0];
    a.mover = card.mover; a.second = card.second;
    a.links = [{ t: 'minutes', url: M.transcript }, { t: 'record', url: M.agenda }, ...(card.pdf ? [{ t: 'record', url: card.pdf }] : [])];
  } else {
    a.roll = { [card.actor]: 'acted' }; a.rollComplete = true; a.agency = true;
    a.links = [{ t: 'record', url: card.url }];
  }
  a.gifts = gifts(card.gifts, card.actor || null).filter(g => ONBALLOT.includes(g.to) && (g.to in a.roll) && a.roll[g.to] != null);
  return a;
}).sort((p, q) => q.date.localeCompare(p.date) || p.id.localeCompare(q.id));

const L = (en, es, ht) => ({ en, es, ht });
const body = {
  key: 'cabinet', name: L('Governor and Cabinet', 'Gobernador y Gabinete', 'Gouvènè ak Kabinè'), since: '2025-01-01', rosterBody: 'fl-executive', cabinet: true,
  members, onBallot: C.onBallot, accounts: C.accounts,
  registries: [{ name: L('Florida Division of Elections campaign finance database', 'Base de datos de finanzas de campaña de la División de Elecciones de Florida', 'Baz done finans kanpay Divizyon Eleksyon Florid'), url: 'https://dos.elections.myflorida.com/campaign-finance/contributions/' }],
  coverage: L(
    'Two kinds of official action are checked. Cabinet votes: every item the Governor and Cabinet decided as the Board of Trustees of the Internal Improvement Trust Fund at the seven meetings from March 2025 to September 2026 (88 items: land purchases, conservation easements, Rural and Family Lands easements presented by the Department of Agriculture, leases, exchanges), from the Department of Environmental Protection’s agendas and the Cabinet’s own transcripts; each private party was matched by name and address against the three officers’ donors. Cabinet votes are by motion without objection, so a member who did not object is shown as yes. Agency actions: lawsuits, settlements, subpoenas and enforcement the Attorney General announced (60 actions, February 2025 to October 2026, from the AG’s press releases), matched the same way; for the CFO and Agriculture Commissioner no agency action naming a donor was found (DOGE audits target governments; insurer fines are the Insurance Commissioner’s). Donors are each officer’s campaign account and the political committees they chair, January 2025 to October 2026, as filed with the Florida Division of Elections. Not checked: Ingoglia’s 2025 Senate budget requests, and Cabinet items other than the Board of Trustees (bond sales, State Board of Administration, insurance rules, clemency).',
    'Se revisan dos tipos de actos oficiales. Votos del Gabinete: cada asunto que el Gobernador y el Gabinete decidieron como Junta de Fideicomisarios del Internal Improvement Trust Fund en las siete reuniones de marzo de 2025 a septiembre de 2026 (88 asuntos: compras de terrenos, servidumbres de conservación, servidumbres Rural and Family Lands presentadas por el Departamento de Agricultura, arrendamientos, intercambios), según las agendas del Departamento de Protección Ambiental y las transcripciones del propio Gabinete; cada parte privada se cotejó por nombre y dirección con los donantes de los tres funcionarios. Los votos del Gabinete son por moción sin objeción, así que un miembro que no objetó aparece como sí. Actos de agencia: demandas, acuerdos, citaciones y acciones de cumplimiento anunciadas por el Fiscal General (60 actos, de febrero de 2025 a octubre de 2026, según sus comunicados), cotejados igual; para el CFO y el Comisionado de Agricultura no se encontró ningún acto de agencia que nombre a un donante (las auditorías DOGE apuntan a gobiernos; las multas a aseguradoras son del Comisionado de Seguros). Los donantes son la cuenta de campaña de cada funcionario y los comités políticos que preside, de enero de 2025 a octubre de 2026, según la División de Elecciones de Florida. No revisado: las solicitudes de presupuesto de Ingoglia en el Senado en 2025, y los asuntos del Gabinete fuera de la Junta de Fideicomisarios (ventas de bonos, State Board of Administration, reglas de seguros, clemencia).',
    'Nou tcheke de kalite aksyon ofisyèl. Vòt Kabinè: chak dosye Gouvènè a ak Kabinè a te deside kòm Konsèy Administratè Internal Improvement Trust Fund lan nan sèt reyinyon depi mas 2025 rive septanm 2026 (88 dosye: acha tè, sèvitid konsèvasyon, sèvitid Rural and Family Lands Depatman Agrikilti a prezante, lokasyon, echanj), dapre ajennda Depatman Pwoteksyon Anviwònman an ak transkripsyon Kabinè a menm; nou konpare chak pati prive pa non ak adrès ak donatè twa ofisye yo. Vòt Kabinè yo fèt pa mosyon san objeksyon, kidonk yon manm ki pa t objekte parèt kòm wi. Aksyon ajans: pwosè, akò, sitasyon ak aksyon aplikasyon Pwokirè Jeneral la te anonse (60 aksyon, fevriye 2025 rive oktòb 2026, dapre kominike li yo), konpare menm jan; pou CFO a ak Komisyonè Agrikilti a nou pa jwenn okenn aksyon ajans ki nonmen yon donatè (odit DOGE yo vize gouvènman; amann asirè yo se Komisyonè Asirans lan). Donatè yo se kont kanpay chak ofisye ak komite politik li prezide, janvye 2025 rive oktòb 2026, jan yo depoze nan Divizyon Eleksyon Florid. Pa tcheke: demann bidjè Ingoglia nan Sena a an 2025, ak dosye Kabinè andeyò Konsèy Administratè a (vant obligasyon, State Board of Administration, règ asirans, klemans).'),
  actions,
};

d.bodies = d.bodies.filter(b => b.key !== 'cabinet');
d.bodies.push(body);   // last, so the one-line summary for each officer comes from this body

// --- Ingoglia's 2025 Senate floor votes -------------------------------------------------------
const S = d.bodies.find(b => b.key === 'flsenate');
if (!S.members.some(m => m.key === 'Ingoglia')) S.members.push({ key: 'Ingoglia', name: 'Blaise Ingoglia', person: 'blaise-ingoglia' });
S.onBallot.Ingoglia = { race: C.onBallot.Ingoglia.race, accounts: C.onBallot.Ingoglia.accounts, former: true };
for (const k of C.onBallot.Ingoglia.accounts) S.accounts[k] = { owner: 'Ingoglia', ...C.accounts[k] };
const SV = { 'SV25-1730-2018': 'yes', 'SV25-1730-1057': 'yes', 'SV25-429-2045': 'yes', 'SV25-1525-2019': 'yes' };
for (const a of S.actions) {
  if (a.kind === 'bill' && a.date < '2025-07-21') { a.roll.Ingoglia = SV[a.id] ?? 'nv'; }
  else if (a.kind === 'bill') a.roll.Ingoglia = null;
  a.gifts = (a.gifts || []).filter(g => g.to !== 'Ingoglia');
  if (a.id === 'SV25-1525-2019') a.gifts.push(...gifts([{ match: ['UBER TECHNOLOGIES', 'LYFT'], kind: 'class', rel: 'cls' }], 'Ingoglia'));
}

writeFileSync(FILE, JSON.stringify(d, null, 1) + '\n');
console.log('Cabinet: ' + actions.length + ' actions, ' + actions.reduce((n, a) => n + a.gifts.length, 0) + ' gift rows; Ingoglia Senate votes added');
