// Hialeah City Council: Luis Gonzalez (Group II special, Nov 3, 2026) votes vs. his donors.
// Gonzalez's only itemized report (G2, Oct 3-16, 2026) lists 54 gifts, all dated Oct 13, 2026. Every 2026
// council agenda (Jan 13 to Oct 13) was text-searched for each donor; votes come from the posted minutes.
// Run: node scripts/city-hialeah.mjs (safe to re-run), then node scripts/money-summary.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../public/data/decisions.json', import.meta.url);
const d = JSON.parse(readFileSync(FILE));
const csv = readFileSync(new URL('./data/city/hialeah/gonzalez_g2.csv', import.meta.url), 'utf8');

// VoterFocus export rows -> gifts
const rows = csv.split(/\r?\n/).slice(1).filter(Boolean).map(l => {
  const c = []; let cur = '', q = false;
  for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(cur); cur = ''; } else cur += ch; }
  c.push(cur); return c;
}).filter(c => c[2] === 'C');
const gift = (re, extra) => rows.filter(c => re.test(c[3])).map(c => ({ to: 'Gonzalez', acct: 'gonzalez', kind: 'party', rel: 'party', donor: c[3].trim().replace(/\s+/g, ' '), amount: Number(c[13]), date: c[1], addr: c[4].trim(), occ: c[10].replace(/<br>/g, ' ').trim(), ...extra }));

const M = { Zogby: 'yes', 'De La Vega': 'yes', Gonzalez: 'yes', Marrero: 'yes', 'G. Perez': 'yes', 'M. Perez': 'yes', Rodriguez: 'yes' };
const roll = (o) => ({ ...M, ...o });
const AG = (id) => 'https://www.hialeahfl.gov/AgendaCenter/ViewFile/Agenda/' + id, MN = (id) => 'https://www.hialeahfl.gov/AgendaCenter/ViewFile/Minutes/' + id;
const L = (en, es, ht) => ({ en, es, ht });

const actions = [
  {
    id: 'hialeah-2026-05-12-L', date: '2026-05-12', ref: 'Res. 2026-133', kind: 'award',
    subject: L('Corradino Group: $241,290 purchase order for construction engineering inspection, W 38-40 St from 16th to 18th Ave', 'Corradino Group: orden de compra de $241,290 por inspección de ingeniería de construcción, W 38-40 St entre 16 y 18 Ave', 'Corradino Group: lòd acha $241,290 pou enspeksyon jeni konstriksyon, W 38-40 St ant 16 ak 18 Ave'),
    parties: ['The Corradino Group, Inc.'], result: 'adopted', tally: [6, 0], roll: roll({ Rodriguez: 'absent' }), rollComplete: true,
    gifts: gift(/CORRADINO/i), firstReading: null,
    note: L('Postponed from April 28 by the mayor so Streets Division staff could meet property owners. Corradino LLC (Indianapolis) and The Corradino Group (Louisville) each gave $1,000 on October 13, 2026; both list the same company.', 'Pospuesto del 28 de abril por el alcalde para que el personal de la División de Calles se reuniera con los propietarios. Corradino LLC (Indianápolis) y The Corradino Group (Louisville) dieron $1,000 cada uno el 13 de octubre de 2026; ambos corresponden a la misma empresa.', 'Majistra a te ranvwaye l depi 28 avril pou anplwaye Divizyon Lari yo te ka rankontre pwopriyetè yo. Corradino LLC (Indianapolis) ak The Corradino Group (Louisville) chak te bay $1,000 nan 13 oktòb 2026; toude se menm konpayi an.'),
    links: [{ t: 'minutes', url: MN('_05122026-1356') }, { t: 'record', url: AG('_05122026-1356') }],
  },
  {
    id: 'hialeah-2026-04-28-VZ', date: '2026-04-28', ref: 'Res. 2026-122', kind: 'award',
    subject: L('Corradino Group: $499,516 purchase order to design Vision Zero safety improvements on East 4th Avenue', 'Corradino Group: orden de compra de $499,516 para diseñar mejoras de seguridad Vision Zero en East 4th Avenue', 'Corradino Group: lòd acha $499,516 pou desine amelyorasyon sekirite Vision Zero sou East 4th Avenue'),
    parties: ['The Corradino Group, Inc.'], result: 'adopted', tally: [5, 0], roll: roll({ Gonzalez: 'absent', 'G. Perez': 'absent' }), rollComplete: true,
    gifts: gift(/CORRADINO/i),
    note: L('Gonzalez was absent from this meeting.', 'Gonzalez estuvo ausente en esta reunión.', 'Gonzalez te absan nan reyinyon sa a.'),
    links: [{ t: 'minutes', url: MN('_04282026-1349') }, { t: 'record', url: AG('_04282026-1349') }],
  },
  {
    id: 'hialeah-2026-08-11-AE', date: '2026-08-11', ref: 'RFQ 2024-25-046', kind: 'award',
    subject: L('Architectural and engineering continuing contracts: Corradino ranked first for traffic engineering and second for civil/roadway; SRS Engineering third for civil/roadway', 'Contratos continuos de arquitectura e ingeniería: Corradino primero en ingeniería de tránsito y segundo en obra civil/vial; SRS Engineering tercero en obra civil/vial', 'Kontra kontinyèl achitekti ak jeni: Corradino premye pou jeni trafik ak dezyèm pou sivil/wout; SRS Engineering twazyèm pou sivil/wout'),
    parties: ['The Corradino Group, Inc.', 'SRS Engineering, Inc.'], result: 'adopted', tally: [5, 0], roll: roll({ 'M. Perez': 'absent', Rodriguez: 'absent' }), rollComplete: true,
    gifts: [...gift(/CORRADINO/i), ...gift(/SRS ENGINEERING/i), ...gift(/SERRACTA/i, { rel: 'addr', note: 'SRS engineer' })],
    note: L('Two resolutions the same night awarded three-year continuing contracts in ranked order; work is assigned later as needs arise. Ignacio Serracta, who gave $500, lists his occupation as SRS engineer.', 'Dos resoluciones la misma noche adjudicaron contratos continuos de tres años en orden de clasificación; el trabajo se asigna después según las necesidades. Ignacio Serracta, que dio $500, declara como ocupación ingeniero de SRS.', 'De rezolisyon menm swa a te bay kontra kontinyèl twa zan nan lòd klasman; travay la bay pita selon bezwen. Ignacio Serracta, ki te bay $500, deklare li se enjenyè SRS.'),
    links: [{ t: 'minutes', url: MN('_08112026-1372') }, { t: 'record', url: AG('_08112026-1372') }],
  },
  {
    id: 'hialeah-2026-08-11-SRS', date: '2026-08-11', ref: 'Res. 2026-166', kind: 'award',
    subject: L('SRS Engineering: $143,309 purchase order for engineering services, W 9th-10th Ave from 33rd to 37th St', 'SRS Engineering: orden de compra de $143,309 por servicios de ingeniería, W 9-10 Ave entre 33 y 37 St', 'SRS Engineering: lòd acha $143,309 pou sèvis jeni, W 9-10 Ave ant 33 ak 37 St'),
    parties: ['SRS Engineering, Inc.'], result: 'adopted', tally: [5, 0], roll: roll({ 'M. Perez': 'absent', Rodriguez: 'absent' }), rollComplete: true,
    gifts: [...gift(/SRS ENGINEERING/i), ...gift(/SERRACTA/i, { rel: 'addr' })],
    links: [{ t: 'minutes', url: MN('_08112026-1372') }, { t: 'record', url: AG('_08112026-1372') }],
  },
  {
    id: 'hialeah-2026-09-08-WW', date: '2026-09-08', ref: 'Res. 2026-220', kind: 'award',
    subject: L('Water and wastewater engineering continuing contracts: SRS Engineering ranked second of six', 'Contratos continuos de ingeniería de agua y alcantarillado: SRS Engineering segundo de seis', 'Kontra kontinyèl jeni dlo ak egou: SRS Engineering dezyèm sou sis'),
    parties: ['SRS Engineering, Inc.'], result: 'adopted', tally: [7, 0], roll: roll({}), rollComplete: true,
    gifts: [...gift(/SRS ENGINEERING/i), ...gift(/SERRACTA/i, { rel: 'addr' })],
    links: [{ t: 'minutes', url: MN('_09082026-1396') }, { t: 'record', url: AG('_09082026-1396') }],
  },
  {
    id: 'hialeah-2026-09-22-SFM', date: '2026-09-22', ref: 'Res. 2026-233', kind: 'award',
    subject: L('SFM Services: $347,604 street sweeping contract, piggybacking Miami Lakes’ bid', 'SFM Services: contrato de barrido de calles de $347,604, usando la licitación de Miami Lakes', 'SFM Services: kontra bale lari $347,604, sou òf Miami Lakes la'),
    parties: ['SFM Services, Inc.'], result: 'adopted', tally: [7, 0], roll: roll({}), rollComplete: true,
    gifts: gift(/SFM JANITORIAL/i, { rel: 'addr' }),
    note: L('The donor is listed as SFM Janitorial Services LLC at 7500 NW 74 Ave, Medley, the address of SFM Services, Inc.; the gift came three weeks after the vote.', 'El donante aparece como SFM Janitorial Services LLC en 7500 NW 74 Ave, Medley, la dirección de SFM Services, Inc.; la donación llegó tres semanas después del voto.', 'Donatè a parèt kòm SFM Janitorial Services LLC nan 7500 NW 74 Ave, Medley, adrès SFM Services, Inc.; kado a te rive twa semèn apre vòt la.'),
    links: [{ t: 'minutes', url: MN('_09222026-1407') }, { t: 'record', url: AG('_09222026-1407') }],
  },
  {
    id: 'hialeah-2026-09-08-1033', date: '2026-09-08', ref: 'Ord. 2026-061', kind: 'zoning',
    subject: L('1033 East 25th Street (TOD): variance to allow offices on the ground floor, second reading', '1033 East 25th Street (TOD): variación para permitir oficinas en la planta baja, segunda lectura', '1033 East 25th Street (TOD): varyans pou pèmèt biwo nan etaj anba, dezyèm lekti'),
    parties: ['1025 Hialeah Development, LLC'], result: 'adopted', tally: [5, 2], roll: roll({ Zogby: 'no', Marrero: 'no' }), rollComplete: true, firstReading: '2026-08-25',
    lobbied: [{ name: 'Maritza Haro Salgado', for: '1025 Hialeah Development, LLC', firm: 'Bercow Radell Fernandez Larkin & Tapanes' }], namedLobbyist: 'Maritza Haro Salgado, Esq., 200 South Biscayne Boulevard, Suite 300, Miami',
    gifts: [...gift(/HIALEAH DEVELOPMENT/i), ...gift(/BERCOW/i, { kind: 'firm', rel: 'firm', lobbyist: 'Maritza Haro Salgado', forParty: '1025 Hialeah Development, LLC' })],
    note: L('A split vote: Council President Zogby and Council Member Marrero voted no. Gonzalez was absent for the August 25 first reading (6-0). The agenda lists the lobbyist at 200 South Biscayne Blvd, Suite 300, the office of Bercow Radell Fernandez Larkin & Tapanes, which gave $1,000; 1025 Hialeah Development LLC and 1067 Hialeah Development LLC (same address, 4259 SW 72 Ave) gave $1,000 each. All three gifts came five weeks after the vote.', 'Votación dividida: el presidente del Concejo Zogby y el concejal Marrero votaron en contra. Gonzalez estuvo ausente en la primera lectura del 25 de agosto (6-0). La agenda ubica a la cabildera en 200 South Biscayne Blvd, Suite 300, la oficina de Bercow Radell Fernandez Larkin & Tapanes, que donó $1,000; 1025 Hialeah Development LLC y 1067 Hialeah Development LLC (misma dirección, 4259 SW 72 Ave) dieron $1,000 cada una. Las tres donaciones llegaron cinco semanas después del voto.', 'Yon vòt divize: Prezidan Konsèy Zogby ak Konseye Marrero te vote non. Gonzalez te absan pou premye lekti 25 out la (6-0). Ajennda a mete lobiyis la nan 200 South Biscayne Blvd, Suite 300, biwo Bercow Radell Fernandez Larkin & Tapanes, ki te bay $1,000; 1025 Hialeah Development LLC ak 1067 Hialeah Development LLC (menm adrès, 4259 SW 72 Ave) chak te bay $1,000. Tout twa kado yo te rive senk semèn apre vòt la.'),
    links: [{ t: 'minutes', url: MN('_09082026-1396') }, { t: 'record', url: AG('_09082026-1396') }],
  },
  {
    id: 'hialeah-2026-08-25-OKEE1', date: '2026-08-25', ref: 'First reading', kind: 'landuse',
    subject: L('Okeechobee Hialeah Property: land-use change, rezoning to C-2 and parking variances for 455-499 East Okeechobee Road and 652 SE 5th Ave, first readings (three ordinances)', 'Okeechobee Hialeah Property: cambio de uso de suelo, rezonificación a C-2 y variaciones de estacionamiento para 455-499 East Okeechobee Road y 652 SE 5th Ave, primeras lecturas (tres ordenanzas)', 'Okeechobee Hialeah Property: chanjman itilizasyon tè, nouvo zonaj C-2 ak varyans pakin pou 455-499 East Okeechobee Road ak 652 SE 5th Ave, premye lekti (twa òdonans)'),
    parties: ['Okeechobee Hialeah Property LLC', 'CW702, LLC', 'Yoram Izhak'], result: 'adopted', tally: [5, 2], roll: roll({ 'De La Vega': 'no', 'M. Perez': 'no' }), rollComplete: true,
    lobbied: [{ name: 'Hugo P. Arza', for: 'Okeechobee Hialeah Property LLC', firm: 'Holland & Knight' }, { name: 'Jose Vazquez', for: 'Okeechobee Hialeah Property LLC', firm: 'Holland & Knight' }], namedLobbyist: 'Jose Vazquez, Esq., and Hugo P. Arza, Esq., Holland & Knight',
    gifts: gift(/^HUGO\s+ARZA/i, { kind: 'listed', rel: 'listed', lobbyist: 'Hugo P. Arza', forParty: 'Okeechobee Hialeah Property LLC' }), giftNotes: { Gonzalez: L('Hugo Arza has the same name as Hugo P. Arza, Esq., the Holland & Knight lobbyist named on the agenda for Okeechobee Hialeah Property LLC. The report lists him as an owner at a Miami home address, so this is a name match only.', 'Hugo Arza tiene el mismo nombre que Hugo P. Arza, Esq., el cabildero de Holland & Knight nombrado en la agenda por Okeechobee Hialeah Property LLC. El reporte lo lista como propietario con una dirección residencial en Miami, así que es una coincidencia solo por nombre.', 'Hugo Arza gen menm non ak Hugo P. Arza, Esq., lobiyis Holland & Knight yo nonmen nan ajennda a pou Okeechobee Hialeah Property LLC. Rapò a mete l kòm pwopriyetè ak yon adrès kay Miami, kidonk se yon koresponn sou non sèlman.') },
    note: L('Split votes: Vice President De La Vega and Council Member Monica Perez voted no on all three ordinances; a companion alley closure passed 5-0-2. Hugo Arza gave $1,000 on October 13, 2026; the report lists him as an owner at a Miami home address, so the match is by name only.', 'Votaciones divididas: la vicepresidenta De La Vega y la concejal Monica Perez votaron en contra de las tres ordenanzas; el cierre de callejón asociado pasó 5-0-2. Hugo Arza donó $1,000 el 13 de octubre de 2026; el reporte lo lista como propietario con una dirección residencial en Miami, así que la coincidencia es solo por nombre.', 'Vòt divize: Vis Prezidan De La Vega ak Konseye Monica Perez te vote non sou tout twa òdonans yo; fèmti ale ki mache ak li a te pase 5-0-2. Hugo Arza te bay $1,000 nan 13 oktòb 2026; rapò a mete l kòm pwopriyetè ak yon adrès kay Miami, kidonk koresponn lan se sou non sèlman.'),
    links: [{ t: 'minutes', url: MN('_08252026-1383') }, { t: 'record', url: AG('_08252026-1383') }],
  },
  {
    id: 'hialeah-2026-09-08-OKEE2', date: '2026-09-08', ref: 'Second reading', kind: 'landuse',
    subject: L('Okeechobee Hialeah Property: land-use change, rezoning and variances for 455-499 East Okeechobee Road and 652 SE 5th Ave, second readings', 'Okeechobee Hialeah Property: cambio de uso de suelo, rezonificación y variaciones para 455-499 East Okeechobee Road y 652 SE 5th Ave, segundas lecturas', 'Okeechobee Hialeah Property: chanjman itilizasyon tè, nouvo zonaj ak varyans pou 455-499 East Okeechobee Road ak 652 SE 5th Ave, dezyèm lekti'),
    parties: ['Okeechobee Hialeah Property LLC', 'CW702, LLC', 'Yoram Izhak'], result: 'adopted', tally: [5, 2], roll: roll({ 'De La Vega': 'no', 'M. Perez': 'no' }), rollComplete: true, firstReading: '2026-08-25',
    lobbied: [{ name: 'Hugo P. Arza', for: 'Okeechobee Hialeah Property LLC', firm: 'Holland & Knight' }, { name: 'Jose Vazquez', for: 'Okeechobee Hialeah Property LLC', firm: 'Holland & Knight' }], namedLobbyist: 'Jose Vazquez, Esq., and Hugo P. Arza, Esq., Holland & Knight',
    gifts: gift(/^HUGO\s+ARZA/i, { kind: 'listed', rel: 'listed', lobbyist: 'Hugo P. Arza', forParty: 'Okeechobee Hialeah Property LLC' }), giftNotes: { Gonzalez: L('Hugo Arza has the same name as Hugo P. Arza, Esq., the Holland & Knight lobbyist named on the agenda for Okeechobee Hialeah Property LLC. The report lists him as an owner at a Miami home address, so this is a name match only.', 'Hugo Arza tiene el mismo nombre que Hugo P. Arza, Esq., el cabildero de Holland & Knight nombrado en la agenda por Okeechobee Hialeah Property LLC. El reporte lo lista como propietario con una dirección residencial en Miami, así que es una coincidencia solo por nombre.', 'Hugo Arza gen menm non ak Hugo P. Arza, Esq., lobiyis Holland & Knight yo nonmen nan ajennda a pou Okeechobee Hialeah Property LLC. Rapò a mete l kòm pwopriyetè ak yon adrès kay Miami, kidonk se yon koresponn sou non sèlman.') },
    links: [{ t: 'minutes', url: MN('_09082026-1396') }, { t: 'record', url: AG('_09082026-1396') }],
  },
  {
    id: 'hialeah-2026-09-22-LENNAR', date: '2026-09-22', ref: 'Ord. 2026-069', kind: 'zoning',
    subject: L('Lennar Homes: zoning ordinance change, second reading', 'Lennar Homes: cambio a la ordenanza de zonificación, segunda lectura', 'Lennar Homes: chanjman òdonans zonaj, dezyèm lekti'),
    parties: ['Lennar Homes, LLC'], result: 'adopted', tally: [7, 0], roll: roll({}), rollComplete: true, firstReading: '2026-09-08', mover: 'Rodriguez', second: 'Marrero',
    lobbied: [{ name: 'Alejandro Arias', for: 'Lennar Homes, LLC', firm: 'Holland & Knight' }], namedLobbyist: 'Alejandro Arias, Esq., Holland & Knight',
    gifts: gift(/^ALEJANDRO\s+ARIAS/i, { kind: 'listed', rel: 'listed', lobbyist: 'Alejandro Arias', forParty: 'Lennar Homes, LLC' }), giftNotes: { Gonzalez: L('Alejandro Arias has the same name as Alejandro Arias, Esq., the Holland & Knight lobbyist named on the agenda for Lennar Homes. The report lists him as an owner at a Coral Gables home address, so this is a name match only.', 'Alejandro Arias tiene el mismo nombre que Alejandro Arias, Esq., el cabildero de Holland & Knight nombrado en la agenda por Lennar Homes. El reporte lo lista como propietario con una dirección residencial en Coral Gables, así que es una coincidencia solo por nombre.', 'Alejandro Arias gen menm non ak Alejandro Arias, Esq., lobiyis Holland & Knight yo nonmen nan ajennda a pou Lennar Homes. Rapò a mete l kòm pwopriyetè ak yon adrès kay Coral Gables, kidonk se yon koresponn sou non sèlman.') },
    note: L('Alejandro Arias gave $1,000 on October 13, 2026; the report lists him as an owner at a Coral Gables home address, so the match is by name only. First reading passed 7-0 on September 8.', 'Alejandro Arias donó $1,000 el 13 de octubre de 2026; el reporte lo lista como propietario con una dirección residencial en Coral Gables, así que la coincidencia es solo por nombre. La primera lectura pasó 7-0 el 8 de septiembre.', 'Alejandro Arias te bay $1,000 nan 13 oktòb 2026; rapò a mete l kòm pwopriyetè ak yon adrès kay Coral Gables, kidonk koresponn lan se sou non sèlman. Premye lekti te pase 7-0 nan 8 septanm.'),
    links: [{ t: 'minutes', url: MN('_09222026-1407') }, { t: 'record', url: AG('_09222026-1407') }],
  },
];

const body = {
  key: 'hialeah', name: L('Hialeah City Council', 'Concejo de la Ciudad de Hialeah', 'Konsèy Vil Hialeah'), since: '2026-01-13', rosterBody: 'city-hialeah',
  members: [
    { key: 'Zogby', name: 'Carl Zogby', person: 'carl-zogby' }, { key: 'De La Vega', name: 'Melinda De La Vega', person: 'melinda-de-la-vega' }, { key: 'Gonzalez', name: 'Luis Gonzalez', person: 'luis-gonzalez' },
    { key: 'Marrero', name: 'William Marrero', person: 'william-marrero' }, { key: 'G. Perez', name: 'Gelien Perez', person: 'gelien-perez' }, { key: 'M. Perez', name: 'Monica Perez', person: 'monica-perez' }, { key: 'Rodriguez', name: 'Luis Rodriguez', person: 'luis-rodriguez' },
  ],
  onBallot: { Gonzalez: { race: L('Council Group II (special election)', 'Concejo, Grupo II (elección especial)', 'Konsèy, Gwoup II (eleksyon espesyal)'), accounts: ['gonzalez'] } },
  accounts: { gonzalez: { owner: 'Gonzalez', name: L('Luis Gonzalez campaign', 'Campaña de Luis Gonzalez', 'Kanpay Luis Gonzalez'), url: 'https://www.voterfocus.com/CampaignFinance/candidate_pr.php?op=cv&e=4&c=munhialeah&ca=26&rellevel=3&committee=N' } },
  registries: [{ name: L('Hialeah lobbyists named on the agenda (no searchable registry posted)', 'Cabilderos nombrados en la agenda de Hialeah (no hay registro consultable)', 'Lobiyis yo nonmen nan ajennda Hialeah (pa gen rejis ou ka chèche)'), url: 'https://www.hialeahfl.gov/AgendaCenter' }],
  coverage: L(
    'Luis Gonzalez was appointed to the Group II seat in January 2026 and is on the November 3 ballot to keep it. His only itemized report (G2, October 3-16, 2026) lists 54 gifts totaling $45,840, all dated October 13, 2026; no G1 report is posted. Every City Council agenda from January 13 to October 13, 2026 (20 meetings) was text-searched for each donor’s name and address, and the votes come from the posted minutes, which name members on split votes and list absences. Listed: items for a company, property owner or registered lobbyist that gave to Gonzalez. Mariana Chavez, his opponent, reports $140 from herself and $208.65 in-kind from a relative.',
    'Luis Gonzalez fue nombrado al escaño del Grupo II en enero de 2026 y está en la boleta del 3 de noviembre para conservarlo. Su único reporte detallado (G2, del 3 al 16 de octubre de 2026) lista 54 donaciones por $45,840, todas con fecha 13 de octubre de 2026; no hay reporte G1 publicado. Se buscó el nombre y la dirección de cada donante en todas las agendas del Concejo del 13 de enero al 13 de octubre de 2026 (20 reuniones), y los votos vienen de las actas publicadas, que nombran a los miembros en las votaciones divididas y registran las ausencias. Se muestran los asuntos de una empresa, propietario o cabildero registrado que donó a Gonzalez. Mariana Chavez, su oponente, reporta $140 propios y $208.65 en especie de una familiar.',
    'Yo te nonmen Luis Gonzalez nan syèj Gwoup II a an janvye 2026 epi li sou bilten 3 novanm nan pou kenbe l. Sèl rapò detaye li (G2, 3 rive 16 oktòb 2026) bay 54 kado pou $45,840 antou, tout ak dat 13 oktòb 2026; pa gen rapò G1 ki pibliye. Nou te chèche non ak adrès chak donatè nan tout ajennda Konsèy Vil la depi 13 janvye rive 13 oktòb 2026 (20 reyinyon), epi vòt yo soti nan pwosè-vèbal yo pibliye, ki nonmen manm yo nan vòt divize epi make absans. Nou montre dosye pou yon konpayi, pwopriyetè oswa lobiyis anrejistre ki te bay Gonzalez. Mariana Chavez, advèsè li, rapòte $140 nan men li menm ak $208.65 an nati nan men yon fanmi.'),
  actions: actions.map(a => ({ lobbied: [], giftNotes: {}, ...a })).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)),
};

d.bodies = d.bodies.filter(b => b.key !== 'hialeah');
const at = d.bodies.findIndex(b => b.key === 'flhouse');
d.bodies.splice(at < 0 ? d.bodies.length : at, 0, body);
d.others = (d.others || []).filter(o => o.body.en !== 'Hialeah');
writeFileSync(FILE, JSON.stringify(d, null, 1) + '\n');
console.log('Hialeah: ' + body.actions.length + ' actions, ' + body.actions.reduce((n, a) => n + a.gifts.length, 0) + ' gift rows');
