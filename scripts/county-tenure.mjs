// County Commission, full tenure (Brit, Oct 25, 2026): appends the earlier actions in
// scripts/data/county/actions.json (every final BCC and CDMP & Zoning vote from Nov 19, 2020 that benefits a named
// private party, rolls from the Clerk's minutes) to the "county" body of public/data/decisions.json, adds the
// former members in scripts/data/county/body.json, adds Gilbert's county campaign and committee accounts, sets the
// body's tenure (gifts to Gilbert count from 2019, one cycle before he was sworn in Nov 17, 2020) and matches party
// gifts: a donor whose name is one of the action's parties, given to a member who voted on it.
// Idempotent: actions already on the page (by id) keep their hand-checked gifts and lobbyists.
// Run: node scripts/county-tenure.mjs && node scripts/county-firm-gifts.mjs && node scripts/action-topics.mjs
//      && node scripts/leads.mjs && node scripts/money-summary.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { pkey, dkey, csv } from './lib/city.mjs';

const root = new URL('../', import.meta.url);
const J = p => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const FILE = 'public/data/decisions.json';
const d = J(FILE);
const B = d.bodies.find(b => b.key === 'county');
const U = J('scripts/data/county/actions.json');
const BJ = J('scripts/data/county/body.json');
const UNNAMED = J('scripts/data/tenure/county/unnamed.json').length;

// ---- members, accounts, tenure ------------------------------------------------------------------------
for (const m of BJ.members) if (!B.members.some(x => x.key === m.key)) B.members.push({ key: m.key, name: m.name, district: m.district, person: m.person, former: true });
const VF = ca => `https://www.voterfocus.com/CampaignFinance/candidate_pr.php?op=cv&e=${ca === 2220 ? 26 : 29}&c=miamidade&ca=${ca}&rellevel=3&committee=N`;
Object.assign(B.accounts, {
  gilbert20: { owner: 'Gilbert', name: { en: 'Oliver G. Gilbert III campaign (county, 2020)', es: 'Campaña de Oliver G. Gilbert III (condado, 2020)', ht: 'Kanpay Oliver G. Gilbert III (konte, 2020)' }, url: VF(2220) },
  gilbert24: { owner: 'Gilbert', name: { en: 'Oliver G. Gilbert III campaign (county, 2024)', es: 'Campaña de Oliver G. Gilbert III (condado, 2024)', ht: 'Kanpay Oliver G. Gilbert III (konte, 2024)' }, url: VF(2742) },
  pc71293: { owner: 'Gilbert', name: { en: 'Common Voices (political committee Gilbert reported raising money for)', es: 'Common Voices (comité político para el que Gilbert declaró recaudar fondos)', ht: 'Common Voices (komite politik Gilbert te deklare li ranmase lajan pou li)' },
    url: 'https://dos.elections.myflorida.com/committees/ComDetail.asp?account=71293', role: 'solicits',
    record: 'https://www.voterfocus.com/CampaignFinance/pdf_miamidade/doc_2220_20191001111611_Form_MD-ED_28_-_01-31-2019.pdf' },
});
const G = B.onBallot.Gilbert;
for (const a of ['gilbert20', 'gilbert24', 'pc71293']) if (!G.accounts.includes(a)) G.accounts.push(a);
B.tenure = { Gilbert: { start: '2020-11-17', giftsFrom: '2019-01-01' } };
B.since = '2020-11-17';

// ---- subjects in three languages ----------------------------------------------------------------------
const L = {
  'Plat approved': ['Plat aprobado', 'Plat apwouve'], 'Plat waiver': ['Exención de plat', 'Egzanpsyon plat'],
  'Zoning application': ['Solicitud de zonificación', 'Demann zonaj'], 'Master plan amendment': ['Enmienda al plan maestro', 'Amannman plan mèt'],
  'Contract award': ['Contrato adjudicado', 'Kontra bay'], 'Professional services contract': ['Contrato de servicios profesionales', 'Kontra sèvis pwofesyonèl'],
  'Grant': ['Subvención', 'Sibvansyon'], 'Housing bond approval (federal tax law)': ['Aprobación de bonos de vivienda (ley tributaria federal)', 'Apwobasyon obligasyon lojman (lwa taks federal)'],
  'Bond issue approved': ['Emisión de bonos aprobada', 'Emisyon obligasyon apwouve'], 'Lease': ['Arrendamiento', 'Lokasyon'],
  'Ground lease': ['Arrendamiento de terreno', 'Lokasyon tè'], 'Easement': ['Servidumbre', 'Sèvitid'], 'County action': ['Acción del condado', 'Aksyon konte'],
  'Change order': ['Orden de cambio', 'Lòd chanjman'], 'County property conveyed': ['Propiedad del condado traspasada', 'Pwopriyete konte transfere'],
  'Water and sewer contract action ratified': ['Acción de contrato de agua y alcantarillado ratificada', 'Aksyon kontra dlo ak egou ratifye'],
  'Contract amendment': ['Enmienda de contrato', 'Amannman kontra'], 'Public road or alley closed': ['Cierre de calle o callejón público', 'Lari oswa ti ri piblik fèmen'],
  'Agreement': ['Acuerdo', 'Akò'], 'County funding': ['Fondos del condado', 'Lajan konte'], 'Non-competitive purchase': ['Compra no competitiva', 'Acha san konpetisyon'],
  'Settlement': ['Acuerdo legal', 'Akò regleman'], 'Contract without competitive bidding': ['Contrato sin licitación competitiva', 'Kontra san ofri konpetitif'],
  'Union contract': ['Contrato sindical', 'Kontra sendika'], 'Supplemental agreement': ['Acuerdo suplementario', 'Akò siplemantè'], 'Loan': ['Préstamo', 'Prè'],
  'Contract extended or increased': ['Contrato extendido o aumentado', 'Kontra pwolonje oswa ogmante'],
  'Transportation concurrency agreement': ['Acuerdo de concurrencia de transporte', 'Akò konkourans transpò'],
  'Transportation operating certificate': ['Certificado de operación de transporte', 'Sètifika operasyon transpò'],
  'Emergency contract ratified': ['Contrato de emergencia ratificado', 'Kontra ijans ratifye'], 'Brownfield designation': ['Designación de zona contaminada (brownfield)', 'Deziyasyon zòn kontamine (brownfield)'],
  'Development rights awarded': ['Derechos de desarrollo otorgados', 'Dwa devlopman bay'], 'Design-build contract': ['Contrato de diseño y construcción', 'Kontra konsepsyon ak konstriksyon'],
  'Film and TV incentive': ['Incentivo de cine y televisión', 'Ankourajman fim ak televizyon'], 'Historic designation': ['Designación histórica', 'Deziyasyon istorik'],
  'License agreement': ['Acuerdo de licencia', 'Akò lisans'], 'Prequalified vendor pool': ['Grupo de proveedores precalificados', 'Gwoup founisè prekalifye'],
  'Concession': ['Concesión', 'Konsesyon'], 'Property purchase or sale': ['Compra o venta de propiedad', 'Acha oswa vant pwopriyete'],
  'Community development district': ['Distrito de desarrollo comunitario', 'Distri devlopman kominotè'], 'Donation': ['Donación', 'Don'],
};
function subject(t) {
  const m = t.match(/^(.*?)(?:, (\$[\d.,]+)( million)?)?(?: \(District (\d+)\))?$/);
  const [, lab, amt, mil, dist] = m;
  const tr = L[lab]; if (!tr) throw new Error('no translation for ' + lab);
  const parts = (base, million, district) => base + (amt ? ', ' + amt + (mil ? million : '') : '') + (dist ? ` (${district} ${dist})` : '');
  return { en: t, es: parts(tr[0], ' millones', 'Distrito'), ht: parts(tr[1], ' milyon', 'Distri') };
}

// ---- actions ------------------------------------------------------------------------------------------
const have = new Set(B.actions.map(a => a.id));
const NOTE = { en: 'The minutes record the result but not the vote.', es: 'Las actas registran el resultado pero no la votación.', ht: 'Pwosè-vèbal la bay rezilta a men li pa bay vòt la.' };
let added = 0;
for (const u of U.actions) {
  if (have.has(u.id)) continue;
  const a = { id: u.id, ref: u.ref, date: u.date, meeting: u.meeting, kind: u.kind, parties: u.parties, subject: subject(u.title), result: u.result,
    tally: u.tally, roll: u.roll, mover: u.mover, second: u.second, lobbied: u.lobbied, gifts: [], rollComplete: u.rollComplete, links: u.links, topics: [] };
  if (u.note) a.note = NOTE;
  B.actions.push(a); added++;
}
// 261641 (Oct 6, 2026 plat waiver): the minutes read "Vote: 12 - 1 No: García"
const x = B.actions.find(a => a.id === '261641');
if (x) { x.roll.Garcia = 'no'; x.tally = [12, 1]; }
B.actions.sort((p, q) => q.date.localeCompare(p.date) || String(p.id).localeCompare(String(q.id)));

// ---- party gifts (Gilbert's county accounts) -----------------------------------------------------------
const donors = [];
const vf = (f, acct) => { const [h, ...rows] = csv(readFileSync(new URL('scripts/data/county/donors/' + f, root), 'latin1')); const ix = n => h.indexOf(n);
  for (const r of rows) { if (r[ix('Cont/Exp')] !== 'C' || r[ix('Amend. code')] === 'D') continue; const amt = Number(r[ix('amount')]); if (!(amt > 0)) continue;
    donors.push({ to: 'Gilbert', acct, donor: r[ix('name')].replace(/\s+/g, ' ').trim(), amount: amt, date: r[ix('item date')], addr: r[ix('address 1')], occ: (r[ix('occupation')] || '').replace(/<br>/g, ' ') }); } };
vf('gilbert-campaign-2020.csv', 'gilbert20'); vf('gilbert-campaign-2024.csv', 'gilbert24');
for (const line of readFileSync(new URL('scripts/data/county/donors/pc71293.tsv', root), 'utf8').split('\n').slice(1)) {
  const c = line.split('\t'); if (c.length < 8) continue; const [mm, dd, yy] = c[1].split('/'); const amt = Number(c[2]); if (!(amt > 0)) continue;
  donors.push({ to: 'Gilbert', acct: 'pc71293', donor: c[4].trim(), amount: amt, date: `${yy}-${mm}-${dd}`, addr: c[5], occ: c[7], typ: c[3] });
}
const live = donors.filter(g => g.date >= B.tenure.Gilbert.giftsFrom);
const gk = g => [g.to, g.acct, g.donor, g.amount, g.date].join('|');
let pg = 0, pt = 0;
for (const a of B.actions) {
  if (!['yes', 'no'].includes((a.roll || {}).Gilbert)) continue;
  const keys = (a.parties || []).map(pkey).filter(Boolean); if (!keys.length) continue;
  const seen = new Set(a.gifts.map(gk));
  for (const g of live) {
    const dk = dkey(g.donor);
    if (!keys.some(k => dk === k || (k.split(' ').length >= 2 && dk.startsWith(k + ' ')))) continue;
    const { typ, ...rest } = g; const x = { ...rest, kind: 'party' };
    if (seen.has(gk(x))) continue; seen.add(gk(x)); a.gifts.push(x); pg++; pt += g.amount;
  }
  a.gifts.sort((p, q) => p.date.localeCompare(q.date));
}

// ---- coverage ------------------------------------------------------------------------------------------
const n = B.actions.length, meetings = U.meetings.length + 22;
B.coverage = {
  en: `This list starts from the actions, not the donors: every item the commission finally decided from November 19, 2020 (the first meeting after Commissioner Gilbert was sworn in) through October 6, 2026 that gives a named private company, developer or group a contract, lease, county land, zoning or plat approval, money or a change to an existing deal, read from the Clerk of the Board's minutes of ${meetings} commission and zoning meetings. ${UNNAMED.toLocaleString('en-US')} final actions from November 2020 to November 2025 whose title names no private party are left out, as are routine items. Each vote comes from the minutes and was checked against the tally the clerk printed. Commissioner Lopez joined on November 18, 2025, so earlier items show her as not yet seated.`,
  es: `Esta lista parte de los actos, no de los donantes: cada asunto que la comisión decidió en forma final desde el 19 de noviembre de 2020 (la primera reunión después de que el comisionado Gilbert juramentó) hasta el 6 de octubre de 2026 que otorga a una empresa privada, desarrollador o grupo con nombre un contrato, arrendamiento, terreno del condado, aprobación de zonificación o de plat, dinero o un cambio a un acuerdo existente, según las actas de la Secretaría de la Junta de ${meetings} reuniones de la comisión y de zonificación. Se dejan fuera ${UNNAMED.toLocaleString('es-ES')} actos finales de noviembre de 2020 a noviembre de 2025 cuyo título no nombra a una parte privada, y los asuntos de rutina. Cada voto viene de las actas y se comparó con el conteo que publicó la secretaría. La comisionada Lopez entró el 18 de noviembre de 2025, así que los asuntos anteriores la muestran como aún no en el cargo.`,
  ht: `Lis sa a kòmanse ak aksyon yo, pa ak donatè yo: chak dosye komisyon an te deside nèt depi 19 novanm 2020 (premye reyinyon apre Komisyonè Gilbert te prete sèman) rive 6 oktòb 2026 ki bay yon konpayi prive, yon devlopè oswa yon gwoup ki gen non yon kontra, yon lokasyon, tè konte, yon apwobasyon zonaj oswa plat, lajan oswa yon chanjman nan yon akò ki la deja, selon pwosè-vèbal Grefye Konsèy la pou ${meetings} reyinyon komisyon ak zonaj. Nou pa mete ${UNNAMED} aksyon final ant novanm 2020 ak novanm 2025 ki pa nonmen okenn pati prive nan tit yo, ni dosye woutin yo. Chak vòt soti nan pwosè-vèbal yo epi nou konpare l ak kantite vòt grefye a pibliye. Komisyonè Lopez te antre 18 novanm 2025, kidonk dosye ki vin anvan yo montre li poko te chita.`,
};
writeFileSync(new URL(FILE, root), JSON.stringify(d, null, 1) + '\n');
console.log(`county: added ${added} actions (now ${n}), ${B.members.length} members; party gifts to Gilbert ${pg}, $${pt.toLocaleString()}`);
