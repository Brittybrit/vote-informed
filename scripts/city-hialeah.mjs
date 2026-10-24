// Hialeah City Council: Luis Gonzalez (Group II special, Nov 3, 2026) votes vs. his donors.
// Itemized reports: G2 (Oct 3-16, 2026; 54 gifts dated Oct 13) and G3 (Oct 17-29, 2026; 27 gifts dated Oct 23
// as of Oct 23). Every 2026 council agenda was text-searched for each donor; votes come from the posted minutes.
// Run: node scripts/city-hialeah.mjs (safe to re-run), then node scripts/money-summary.mjs
if (process.argv[2] !== "--legacy") { console.log("Superseded: Hialeah is now built action-first by scripts/city-actions.mjs hialeah (scripts/data/city/hialeah). Re-running this would replace that list; pass --legacy to run it anyway."); process.exit(0); }
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../public/data/decisions.json', import.meta.url);
const d = JSON.parse(readFileSync(FILE));
const csv = ['gonzalez_g2.csv', 'gonzalez_g3.csv'].map(f => readFileSync(new URL('./data/city/hialeah/' + f, import.meta.url), 'utf8').split(/\r?\n/).slice(1)).flat().join('\n');

// VoterFocus export rows -> gifts
const rows = csv.split(/\r?\n/).filter(Boolean).map(l => {
  const c = []; let cur = '', q = false;
  for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(cur); cur = ''; } else cur += ch; }
  c.push(cur); return c;
}).filter(c => c[2] === 'C');
const gift = (re, extra) => rows.filter(c => re.test(c[3])).map(c => ({ to: 'Gonzalez', acct: 'gonzalez', kind: 'party', donor: c[3].trim().replace(/\s+/g, ' '), amount: Number(c[13]), date: c[1], addr: c[4].trim(), occ: c[10].replace(/<br>/g, ' ').trim(), ...extra }));

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
    gifts: [...gift(/CORRADINO/i), ...gift(/SRS ENGINEERING/i), ...gift(/SERRACTA/i, { kind: 'class', rel: 'cls' })],
    note: L('Two resolutions the same night awarded three-year continuing contracts in ranked order; work is assigned later as needs arise. Ignacio Serracta, who gave $500, lists his occupation as SRS engineer.', 'Dos resoluciones la misma noche adjudicaron contratos continuos de tres años en orden de clasificación; el trabajo se asigna después según las necesidades. Ignacio Serracta, que dio $500, declara como ocupación ingeniero de SRS.', 'De rezolisyon menm swa a te bay kontra kontinyèl twa zan nan lòd klasman; travay la bay pita selon bezwen. Ignacio Serracta, ki te bay $500, deklare li se enjenyè SRS.'),
    links: [{ t: 'minutes', url: MN('_08112026-1372') }, { t: 'record', url: AG('_08112026-1372') }],
  },
  {
    id: 'hialeah-2026-08-11-SRS', date: '2026-08-11', ref: 'Res. 2026-166', kind: 'award',
    subject: L('SRS Engineering: $143,309 purchase order for engineering services, W 9th-10th Ave from 33rd to 37th St', 'SRS Engineering: orden de compra de $143,309 por servicios de ingeniería, W 9-10 Ave entre 33 y 37 St', 'SRS Engineering: lòd acha $143,309 pou sèvis jeni, W 9-10 Ave ant 33 ak 37 St'),
    parties: ['SRS Engineering, Inc.'], result: 'adopted', tally: [5, 0], roll: roll({ 'M. Perez': 'absent', Rodriguez: 'absent' }), rollComplete: true,
    gifts: [...gift(/SRS ENGINEERING/i), ...gift(/SERRACTA/i, { kind: 'class', rel: 'cls' })],
    links: [{ t: 'minutes', url: MN('_08112026-1372') }, { t: 'record', url: AG('_08112026-1372') }],
  },
  {
    id: 'hialeah-2026-09-08-WW', date: '2026-09-08', ref: 'Res. 2026-220', kind: 'award',
    subject: L('Water and wastewater engineering continuing contracts: SRS Engineering ranked second of six', 'Contratos continuos de ingeniería de agua y alcantarillado: SRS Engineering segundo de seis', 'Kontra kontinyèl jeni dlo ak egou: SRS Engineering dezyèm sou sis'),
    parties: ['SRS Engineering, Inc.'], result: 'adopted', tally: [7, 0], roll: roll({}), rollComplete: true,
    gifts: [...gift(/SRS ENGINEERING/i), ...gift(/SERRACTA/i, { kind: 'class', rel: 'cls' })],
    links: [{ t: 'minutes', url: MN('_09082026-1396') }, { t: 'record', url: AG('_09082026-1396') }],
  },
  {
    id: 'hialeah-2026-09-22-SFM', date: '2026-09-22', ref: 'Res. 2026-233', kind: 'award',
    subject: L('SFM Services: $347,604 street sweeping contract, piggybacking Miami Lakes’ bid', 'SFM Services: contrato de barrido de calles de $347,604, usando la licitación de Miami Lakes', 'SFM Services: kontra bale lari $347,604, sou òf Miami Lakes la'),
    parties: ['SFM Services, Inc.'], result: 'adopted', tally: [7, 0], roll: roll({}), rollComplete: true,
    gifts: gift(/SFM JANITORIAL/i, {}),
    note: L('The donor is listed as SFM Janitorial Services LLC at 7500 NW 74 Ave, Medley, the address of SFM Services, Inc.; the gift came three weeks after the vote.', 'El donante aparece como SFM Janitorial Services LLC en 7500 NW 74 Ave, Medley, la dirección de SFM Services, Inc.; la donación llegó tres semanas después del voto.', 'Donatè a parèt kòm SFM Janitorial Services LLC nan 7500 NW 74 Ave, Medley, adrès SFM Services, Inc.; kado a te rive twa semèn apre vòt la.'),
    links: [{ t: 'minutes', url: MN('_09222026-1407') }, { t: 'record', url: AG('_09222026-1407') }],
  },
  {
    id: 'hialeah-2026-09-08-1033', date: '2026-09-08', ref: 'Ord. 2026-061', kind: 'zoning',
    subject: L('1033 East 25th Street (TOD): variance to allow offices on the ground floor, second reading', '1033 East 25th Street (TOD): variación para permitir oficinas en la planta baja, segunda lectura', '1033 East 25th Street (TOD): varyans pou pèmèt biwo nan etaj anba, dezyèm lekti'),
    parties: ['1025 Hialeah Development, LLC'], result: 'adopted', tally: [5, 2], roll: roll({ Zogby: 'no', Marrero: 'no' }), rollComplete: true, firstReading: '2026-08-25',
    lobbied: [{ name: 'Maritza Haro Salgado', for: '1025 Hialeah Development, LLC', firm: 'Bercow Radell Fernandez Larkin & Tapanes' }], namedLobbyist: 'Maritza Haro Salgado, Esq., 200 South Biscayne Boulevard, Suite 300, Miami',
    gifts: [...gift(/^1025 HIALEAH DEVELOPMENT/i), ...gift(/BERCOW/i, { kind: 'firm', lobbyist: 'Maritza Haro Salgado', forParty: '1025 Hialeah Development, LLC' })],
    note: L('A split vote: Council President Zogby and Council Member Marrero voted no. Gonzalez was absent for the August 25 first reading (6-0). The agenda lists the lobbyist at 200 South Biscayne Blvd, Suite 300, the office of Bercow Radell Fernandez Larkin & Tapanes, which gave $1,000, and 1025 Hialeah Development LLC gave $1,000; both gifts came five weeks after the vote. 1067 Hialeah Development LLC, at the same address (4259 SW 72 Ave), also gave $1,000 that day; it is not the company named in the item, so it is not counted.', 'Votación dividida: el presidente del Concejo Zogby y el concejal Marrero votaron en contra. Gonzalez estuvo ausente en la primera lectura del 25 de agosto (6-0). La agenda ubica a la cabildera en 200 South Biscayne Blvd, Suite 300, la oficina de Bercow Radell Fernandez Larkin & Tapanes, que donó $1,000, y 1025 Hialeah Development LLC donó $1,000; ambas donaciones llegaron cinco semanas después del voto. 1067 Hialeah Development LLC, en la misma dirección (4259 SW 72 Ave), también donó $1,000 ese día; no es la empresa nombrada en el asunto, así que no se cuenta.', 'Yon vòt divize: Prezidan Konsèy Zogby ak Konseye Marrero te vote non. Gonzalez te absan pou premye lekti 25 out la (6-0). Ajennda a mete lobiyis la nan 200 South Biscayne Blvd, Suite 300, biwo Bercow Radell Fernandez Larkin & Tapanes, ki te bay $1,000, epi 1025 Hialeah Development LLC te bay $1,000; toude kado yo te rive senk semèn apre vòt la. 1067 Hialeah Development LLC, nan menm adrès la (4259 SW 72 Ave), te bay $1,000 menm jou a tou; se pa konpayi yo nonmen nan dosye a, kidonk nou pa konte l.'),
    links: [{ t: 'minutes', url: MN('_09082026-1396') }, { t: 'record', url: AG('_09082026-1396') }],
  },
  {
    id: 'hialeah-2026-08-25-OKEE1', date: '2026-08-25', ref: 'First reading', kind: 'landuse',
    subject: L('Okeechobee Hialeah Property: land-use change, rezoning to C-2 and parking variances for 455-499 East Okeechobee Road and 652 SE 5th Ave, first readings (three ordinances)', 'Okeechobee Hialeah Property: cambio de uso de suelo, rezonificación a C-2 y variaciones de estacionamiento para 455-499 East Okeechobee Road y 652 SE 5th Ave, primeras lecturas (tres ordenanzas)', 'Okeechobee Hialeah Property: chanjman itilizasyon tè, nouvo zonaj C-2 ak varyans pakin pou 455-499 East Okeechobee Road ak 652 SE 5th Ave, premye lekti (twa òdonans)'),
    parties: ['Okeechobee Hialeah Property LLC', 'CW702, LLC', 'Yoram Izhak'], result: 'adopted', tally: [5, 2], roll: roll({ 'De La Vega': 'no', 'M. Perez': 'no' }), rollComplete: true,
    lobbied: [{ name: 'Hugo P. Arza', for: 'Okeechobee Hialeah Property LLC', firm: 'Holland & Knight' }, { name: 'Jose Vazquez', for: 'Okeechobee Hialeah Property LLC', firm: 'Holland & Knight' }], namedLobbyist: 'Jose Vazquez, Esq., and Hugo P. Arza, Esq., Holland & Knight',
    gifts: gift(/^HUGO\s+ARZA/i, { kind: 'listed', lobbyist: 'Hugo P. Arza', forParty: 'Okeechobee Hialeah Property LLC' }), giftNotes: { Gonzalez: L('Hugo Arza has the same name as Hugo P. Arza, Esq., the Holland & Knight lobbyist named on the agenda for Okeechobee Hialeah Property LLC. The report lists him as an owner at a Miami home address, so this is a name match only.', 'Hugo Arza tiene el mismo nombre que Hugo P. Arza, Esq., el cabildero de Holland & Knight nombrado en la agenda por Okeechobee Hialeah Property LLC. El reporte lo lista como propietario con una dirección residencial en Miami, así que es una coincidencia solo por nombre.', 'Hugo Arza gen menm non ak Hugo P. Arza, Esq., lobiyis Holland & Knight yo nonmen nan ajennda a pou Okeechobee Hialeah Property LLC. Rapò a mete l kòm pwopriyetè ak yon adrès kay Miami, kidonk se yon koresponn sou non sèlman.') },
    note: L('Split votes: Vice President De La Vega and Council Member Monica Perez voted no on all three ordinances; a companion alley closure passed 5-0-2. Hugo Arza gave $1,000 on October 13, 2026; the report lists him as an owner at a Miami home address, so the match is by name only.', 'Votaciones divididas: la vicepresidenta De La Vega y la concejal Monica Perez votaron en contra de las tres ordenanzas; el cierre de callejón asociado pasó 5-0-2. Hugo Arza donó $1,000 el 13 de octubre de 2026; el reporte lo lista como propietario con una dirección residencial en Miami, así que la coincidencia es solo por nombre.', 'Vòt divize: Vis Prezidan De La Vega ak Konseye Monica Perez te vote non sou tout twa òdonans yo; fèmti ale ki mache ak li a te pase 5-0-2. Hugo Arza te bay $1,000 nan 13 oktòb 2026; rapò a mete l kòm pwopriyetè ak yon adrès kay Miami, kidonk koresponn lan se sou non sèlman.'),
    links: [{ t: 'minutes', url: MN('_08252026-1383') }, { t: 'record', url: AG('_08252026-1383') }],
  },
  {
    id: 'hialeah-2026-09-08-OKEE2', date: '2026-09-08', ref: 'Second reading', kind: 'landuse',
    subject: L('Okeechobee Hialeah Property: land-use change, rezoning and variances for 455-499 East Okeechobee Road and 652 SE 5th Ave, second readings', 'Okeechobee Hialeah Property: cambio de uso de suelo, rezonificación y variaciones para 455-499 East Okeechobee Road y 652 SE 5th Ave, segundas lecturas', 'Okeechobee Hialeah Property: chanjman itilizasyon tè, nouvo zonaj ak varyans pou 455-499 East Okeechobee Road ak 652 SE 5th Ave, dezyèm lekti'),
    parties: ['Okeechobee Hialeah Property LLC', 'CW702, LLC', 'Yoram Izhak'], result: 'adopted', tally: [5, 2], roll: roll({ 'De La Vega': 'no', 'M. Perez': 'no' }), rollComplete: true, firstReading: '2026-08-25',
    lobbied: [{ name: 'Hugo P. Arza', for: 'Okeechobee Hialeah Property LLC', firm: 'Holland & Knight' }, { name: 'Jose Vazquez', for: 'Okeechobee Hialeah Property LLC', firm: 'Holland & Knight' }], namedLobbyist: 'Jose Vazquez, Esq., and Hugo P. Arza, Esq., Holland & Knight',
    gifts: gift(/^HUGO\s+ARZA/i, { kind: 'listed', lobbyist: 'Hugo P. Arza', forParty: 'Okeechobee Hialeah Property LLC' }), giftNotes: { Gonzalez: L('Hugo Arza has the same name as Hugo P. Arza, Esq., the Holland & Knight lobbyist named on the agenda for Okeechobee Hialeah Property LLC. The report lists him as an owner at a Miami home address, so this is a name match only.', 'Hugo Arza tiene el mismo nombre que Hugo P. Arza, Esq., el cabildero de Holland & Knight nombrado en la agenda por Okeechobee Hialeah Property LLC. El reporte lo lista como propietario con una dirección residencial en Miami, así que es una coincidencia solo por nombre.', 'Hugo Arza gen menm non ak Hugo P. Arza, Esq., lobiyis Holland & Knight yo nonmen nan ajennda a pou Okeechobee Hialeah Property LLC. Rapò a mete l kòm pwopriyetè ak yon adrès kay Miami, kidonk se yon koresponn sou non sèlman.') },
    links: [{ t: 'minutes', url: MN('_09082026-1396') }, { t: 'record', url: AG('_09082026-1396') }],
  },
  {
    id: 'hialeah-2026-09-22-LENNAR', date: '2026-09-22', ref: 'Ord. 2026-069', kind: 'zoning',
    subject: L('Lennar Homes: zoning ordinance change, second reading', 'Lennar Homes: cambio a la ordenanza de zonificación, segunda lectura', 'Lennar Homes: chanjman òdonans zonaj, dezyèm lekti'),
    parties: ['Lennar Homes, LLC'], result: 'adopted', tally: [7, 0], roll: roll({}), rollComplete: true, firstReading: '2026-09-08', mover: 'Rodriguez', second: 'Marrero',
    lobbied: [{ name: 'Alejandro Arias', for: 'Lennar Homes, LLC', firm: 'Holland & Knight' }], namedLobbyist: 'Alejandro Arias, Esq., Holland & Knight',
    gifts: gift(/^ALEJANDRO\s+ARIAS/i, { kind: 'listed', lobbyist: 'Alejandro Arias', forParty: 'Lennar Homes, LLC' }), giftNotes: { Gonzalez: L('Alejandro Arias has the same name as Alejandro Arias, Esq., the Holland & Knight lobbyist named on the agenda for Lennar Homes. The report lists him as an owner at a Coral Gables home address, so this is a name match only.', 'Alejandro Arias tiene el mismo nombre que Alejandro Arias, Esq., el cabildero de Holland & Knight nombrado en la agenda por Lennar Homes. El reporte lo lista como propietario con una dirección residencial en Coral Gables, así que es una coincidencia solo por nombre.', 'Alejandro Arias gen menm non ak Alejandro Arias, Esq., lobiyis Holland & Knight yo nonmen nan ajennda a pou Lennar Homes. Rapò a mete l kòm pwopriyetè ak yon adrès kay Coral Gables, kidonk se yon koresponn sou non sèlman.') },
    note: L('Alejandro Arias gave $1,000 on October 13, 2026; the report lists him as an owner at a Coral Gables home address, so the match is by name only. First reading passed 7-0 on September 8.', 'Alejandro Arias donó $1,000 el 13 de octubre de 2026; el reporte lo lista como propietario con una dirección residencial en Coral Gables, así que la coincidencia es solo por nombre. La primera lectura pasó 7-0 el 8 de septiembre.', 'Alejandro Arias te bay $1,000 nan 13 oktòb 2026; rapò a mete l kòm pwopriyetè ak yon adrès kay Coral Gables, kidonk koresponn lan se sou non sèlman. Premye lekti te pase 7-0 nan 8 septanm.'),
    links: [{ t: 'minutes', url: MN('_09222026-1407') }, { t: 'record', url: AG('_09222026-1407') }],
  },
];

// Ceasar Mestre, Esq. (8105 NW 155 St, Miami Lakes) is the registered lobbyist named on these items. "CEASAR MESTRE JR"
// at that same address gave $1,000 on Oct 23, 2026 (G3), so the match is by name and address.
const MESTRE = (forParty) => gift(/^CEASAR\s+MESTRE/i, { kind: 'lobbyist', basis: 'addr', lobbyist: 'Ceasar Mestre', forParty });
const mLob = (forParty) => ({ lobbied: [{ name: 'Ceasar Mestre', for: forParty }], namedLobbyist: 'Ceasar Mestre, Esq., 8105 NW 155 Street, Miami Lakes' });
actions.push(
  {
    id: 'hialeah-2026-01-27-E19', date: '2026-01-27', ref: 'Ord. 2026-010, 2026-011', kind: 'landuse',
    subject: L('1002 and 1012 East 19th Street: land-use change and rezoning to TOD for a 33-unit apartment building, with variances, second readings', '1002 y 1012 East 19th Street: cambio de uso de suelo y rezonificación a TOD para un edificio de 33 apartamentos, con variaciones, segundas lecturas', '1002 ak 1012 East 19th Street: chanjman itilizasyon tè ak nouvo zonaj TOD pou yon bilding 33 apatman, ak varyans, dezyèm lekti'),
    parties: ['1002 E 19 St LLC', 'CEMC Holdings LLC'], result: 'adopted', tally: [6, 0], roll: roll({ 'M. Perez': 'absent' }), rollComplete: true, firstReading: '2026-01-13',
    ...mLob('1002 E 19 St LLC'), gifts: MESTRE('1002 E 19 St LLC'),
    note: L('Two ordinances, each 6-0 with Council Member Monica Perez absent; Gonzalez moved the second. The city has not posted minutes for the January 13 first reading (its link opens the January 27 minutes). The gift came nine months after the vote.', 'Dos ordenanzas, cada una 6-0 con la concejal Monica Perez ausente; Gonzalez presentó la moción de la segunda. La ciudad no ha publicado el acta de la primera lectura del 13 de enero (su enlace abre el acta del 27 de enero). La donación llegó nueve meses después del voto.', 'De òdonans, chak 6-0 ak Konseye Monica Perez absan; Gonzalez te fè mosyon pou dezyèm nan. Vil la pa pibliye pwosè-vèbal premye lekti 13 janvye a (lyen li louvri pwosè-vèbal 27 janvye a). Kado a te rive nèf mwa apre vòt la.'),
    links: [{ t: 'minutes', url: MN('_01272026-1314') }, { t: 'record', url: AG('_01272026-1314') }],
  },
  {
    id: 'hialeah-2026-02-24-W56', date: '2026-02-24', ref: 'Ord. 2026-019', kind: 'zoning',
    subject: L('2400 West 56th Street: permit for a K-5 private school with a 143-child daycare, and a parking variance, second reading', '2400 West 56th Street: permiso para una escuela privada K-5 con una guardería de 143 niños, y variación de estacionamiento, segunda lectura', '2400 West 56th Street: pèmi pou yon lekòl prive K-5 ak yon gadri 143 timoun, ak varyans pakin, dezyèm lekti'),
    parties: ['Snow White and Seven Dwarfs, Inc.', 'Rigoberto Leal'], result: 'adopted', tally: [7, 0], roll: roll({}), rollComplete: true,
    ...mLob('Snow White and Seven Dwarfs, Inc.'), gifts: MESTRE('Snow White and Seven Dwarfs, Inc.'),
    note: L('First reading was in December 2025, before Gonzalez was seated. The gift came eight months after the vote.', 'La primera lectura fue en diciembre de 2025, antes de que Gonzalez tomara posesión. La donación llegó ocho meses después del voto.', 'Premye lekti a te fèt an desanm 2025, anvan Gonzalez te pran plas li. Kado a te rive uit mwa apre vòt la.'),
    links: [{ t: 'minutes', url: MN('_02242026-1323') }, { t: 'record', url: AG('_02242026-1323') }],
  },
  {
    id: 'hialeah-2026-03-10-W12', date: '2026-03-10', ref: 'Ord. 2026-020', kind: 'zoning',
    subject: L('7000 West 12th Avenue: repeal of a 2018 special use permit for a 38-bed residential care and treatment facility, second reading', '7000 West 12th Avenue: derogación de un permiso de uso especial de 2018 para un centro residencial de cuidado y tratamiento de 38 camas, segunda lectura', '7000 West 12th Avenue: anile yon pèmi itilizasyon espesyal 2018 pou yon sant swen ak tretman rezidansyèl 38 kabann, dezyèm lekti'),
    parties: ['Owner of 7000 West 12th Avenue (not named on the agenda)'], result: 'adopted', tally: [7, 0], roll: roll({}), rollComplete: true, firstReading: '2026-02-24',
    ...mLob('Owner of 7000 West 12th Avenue (not named on the agenda)'), gifts: MESTRE('the owner of 7000 West 12th Avenue'),
    note: L('Both readings passed 7-0. The agenda names Mestre as the registered lobbyist but does not name the property owner. The gift came seven months after the vote.', 'Ambas lecturas pasaron 7-0. La agenda nombra a Mestre como cabildero registrado pero no nombra al propietario. La donación llegó siete meses después del voto.', 'Toude lekti yo te pase 7-0. Ajennda a nonmen Mestre kòm lobiyis anrejistre men li pa nonmen pwopriyetè a. Kado a te rive sèt mwa apre vòt la.'),
    links: [{ t: 'minutes', url: MN('_03102026-1329') }, { t: 'record', url: AG('_03102026-1329') }],
  },
  {
    id: 'hialeah-2026-03-10-W60', date: '2026-03-10', ref: 'Ord. 2026-023, 2026-024', kind: 'landuse',
    subject: L('1550 West 60th Street (Westland Baptist Church): land-use change to Commercial and rezoning to C-2 on 1.08 acres, second readings', '1550 West 60th Street (Westland Baptist Church): cambio de uso de suelo a Comercial y rezonificación a C-2 en 1.08 acres, segundas lecturas', '1550 West 60th Street (Westland Baptist Church): chanjman itilizasyon tè an Komèsyal ak nouvo zonaj C-2 sou 1.08 acre, dezyèm lekti'),
    parties: ['Westland Baptist Church, LLC'], result: 'adopted', tally: [4, 3], roll: roll({ 'De La Vega': 'no', Marrero: 'no', 'M. Perez': 'no' }), rollComplete: true, firstReading: '2026-02-24',
    lobbied: [{ name: 'Ceasar Mestre', for: 'Westland Baptist Church, LLC' }, { name: 'Manny Reus', for: 'Westland Baptist Church, LLC', firm: 'architect' }], namedLobbyist: 'Manny Reus (architect), 18501 Pines Boulevard, Pembroke Pines; Ceasar Mestre, Esq., 8105 NW 155 Street, Miami Lakes',
    gifts: MESTRE('Westland Baptist Church, LLC'),
    note: L('Split votes: Vice President De La Vega and Council Members Marrero and Monica Perez voted no on both ordinances, at first reading on February 24 and at second reading on March 10. Gonzalez made or seconded the motion each time. Both lobbyists are listed under the property owner; at first reading Mestre presented a document titled “Automotive Dealership Protection.” The gift came seven months after the vote.', 'Votaciones divididas: la vicepresidenta De La Vega y los concejales Marrero y Monica Perez votaron en contra de ambas ordenanzas, en la primera lectura del 24 de febrero y en la segunda del 10 de marzo. Gonzalez presentó o secundó la moción cada vez. Ambos cabilderos aparecen bajo el propietario; en la primera lectura Mestre presentó un documento titulado “Automotive Dealership Protection”. La donación llegó siete meses después del voto.', 'Vòt divize: Vis Prezidan De La Vega ak Konseye Marrero ak Monica Perez te vote non sou toude òdonans yo, nan premye lekti 24 fevriye ak nan dezyèm lekti 10 mas. Gonzalez te fè oswa apiye mosyon an chak fwa. Toude lobiyis yo parèt anba pwopriyetè a; nan premye lekti Mestre te prezante yon dokiman ki rele “Automotive Dealership Protection.” Kado a te rive sèt mwa apre vòt la.'),
    links: [{ t: 'minutes', url: MN('_03102026-1329') }, { t: 'record', url: AG('_03102026-1329') }],
  },
  {
    id: 'hialeah-2026-04-14-E17', date: '2026-04-14', ref: 'First reading', kind: 'landuse',
    subject: L('1081 East 17th Street: land-use change and rezoning to TOD for a 12-unit apartment building, with variances, first readings', '1081 East 17th Street: cambio de uso de suelo y rezonificación a TOD para un edificio de 12 apartamentos, con variaciones, primeras lecturas', '1081 East 17th Street: chanjman itilizasyon tè ak nouvo zonaj TOD pou yon bilding 12 apatman, ak varyans, premye lekti'),
    parties: ['Casa Amigos VI LLC', 'Nancy Ortiz'], result: 'adopted', tally: [7, 0], roll: roll({}), rollComplete: true,
    ...mLob('Casa Amigos VI LLC'), gifts: MESTRE('Casa Amigos VI LLC'),
    note: L('Two ordinances, each 7-0; Gonzalez moved one and seconded the other. He was absent for the April 28 second readings. The gift came six months after the vote.', 'Dos ordenanzas, cada una 7-0; Gonzalez presentó la moción de una y secundó la otra. Estuvo ausente en las segundas lecturas del 28 de abril. La donación llegó seis meses después del voto.', 'De òdonans, chak 7-0; Gonzalez te fè mosyon pou youn epi li te apiye lòt la. Li te absan pou dezyèm lekti 28 avril yo. Kado a te rive sis mwa apre vòt la.'),
    links: [{ t: 'minutes', url: MN('_04142026-1341') }, { t: 'record', url: AG('_04142026-1341') }],
  },
  {
    id: 'hialeah-2026-04-28-E17', date: '2026-04-28', ref: 'Ord. 2026-036, 2026-038', kind: 'landuse',
    subject: L('1081 East 17th Street: land-use change and rezoning to TOD for a 12-unit apartment building, with variances, second readings', '1081 East 17th Street: cambio de uso de suelo y rezonificación a TOD para un edificio de 12 apartamentos, con variaciones, segundas lecturas', '1081 East 17th Street: chanjman itilizasyon tè ak nouvo zonaj TOD pou yon bilding 12 apatman, ak varyans, dezyèm lekti'),
    parties: ['Casa Amigos VI LLC', 'Nancy Ortiz'], result: 'adopted', tally: [5, 0], roll: roll({ Gonzalez: 'absent', 'G. Perez': 'absent' }), rollComplete: true, firstReading: '2026-04-14',
    ...mLob('Casa Amigos VI LLC'), gifts: MESTRE('Casa Amigos VI LLC'),
    note: L('Gonzalez and Council Member Gelien Perez were absent from this meeting.', 'Gonzalez y la concejal Gelien Perez estuvieron ausentes en esta reunión.', 'Gonzalez ak Konseye Gelien Perez te absan nan reyinyon sa a.'),
    links: [{ t: 'minutes', url: MN('_04282026-1349') }, { t: 'record', url: AG('_04282026-1349') }],
  },
  {
    id: 'hialeah-2026-10-13-E8', date: '2026-10-13', ref: 'Ord. 2026-076', kind: 'zoning',
    subject: L('3011 East 8th Avenue (TOD): variances for a residential-only apartment building where mixed use is required, second reading', '3011 East 8th Avenue (TOD): variaciones para un edificio solo residencial donde se exige uso mixto, segunda lectura', '3011 East 8th Avenue (TOD): varyans pou yon bilding rezidansyèl sèlman kote yo egzije itilizasyon miks, dezyèm lekti'),
    parties: ['Casa Amigos 5 LLC'], result: 'adopted', tally: [7, 0], roll: roll({}), rollComplete: true, firstReading: '2026-09-22', mover: 'Gonzalez', second: 'Marrero',
    ...mLob('Casa Amigos 5 LLC'), gifts: MESTRE('Casa Amigos 5 LLC'),
    note: L('Both readings passed 7-0; Gonzalez moved the second reading. The gift came ten days after the vote.', 'Ambas lecturas pasaron 7-0; Gonzalez presentó la moción en la segunda lectura. La donación llegó diez días después del voto.', 'Toude lekti yo te pase 7-0; Gonzalez te fè mosyon nan dezyèm lekti a. Kado a te rive dis jou apre vòt la.'),
    links: [{ t: 'minutes', url: MN('_10132026-1412') }, { t: 'record', url: AG('_10132026-1412') }],
  },
  {
    id: 'hialeah-2026-10-13-E13', date: '2026-10-13', ref: 'Ord. 2026-077', kind: 'plat',
    subject: L('981 East 13th Street: variances to replat one property into two undersized duplex lots, second reading', '981 East 13th Street: variaciones para dividir una propiedad en dos lotes dúplex por debajo del tamaño mínimo, segunda lectura', '981 East 13th Street: varyans pou divize yon pwopriyete an de ti teren dipleks ki pi piti pase minimòm nan, dezyèm lekti'),
    parties: ['Gregory Carlin', 'Shannon Bustamante'], result: 'adopted', tally: [7, 0], roll: roll({}), rollComplete: true, firstReading: '2026-09-22', mover: 'Rodriguez', second: 'Gonzalez',
    ...mLob('Shannon Bustamante'), gifts: MESTRE('Shannon Bustamante'),
    note: L('Both readings passed 7-0; Gonzalez seconded the second reading. The gift came ten days after the vote.', 'Ambas lecturas pasaron 7-0; Gonzalez secundó la segunda lectura. La donación llegó diez días después del voto.', 'Toude lekti yo te pase 7-0; Gonzalez te apiye dezyèm lekti a. Kado a te rive dis jou apre vòt la.'),
    links: [{ t: 'minutes', url: MN('_10132026-1412') }, { t: 'record', url: AG('_10132026-1412') }],
  },
);

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
    "Luis Gonzalez was appointed to the Group II seat in January 2026 and is on the November 3 ballot to keep it. His itemized reports: G2 (October 3-16, 2026) lists 54 gifts totaling $45,840, all dated October 13; G3 (October 17-29, as filed by October 23) lists 27 gifts totaling $26,000, all dated October 23. No G1 report is posted. Every City Council agenda from January 13 to October 27, 2026 was text-searched for each donor’s name and address, and the votes come from the posted minutes, which name members on split votes and list absences. The city has not posted minutes for January 13 (its link opens the January 27 minutes), so items heard only that night are not listed. Listed: items for a company, property owner or registered lobbyist that gave to Gonzalez. Mariana Chavez, his opponent, reports $140 from herself and $208.65 in-kind from a relative.",
    "Luis Gonzalez fue nombrado al escaño del Grupo II en enero de 2026 y está en la boleta del 3 de noviembre para conservarlo. Sus reportes detallados: el G2 (del 3 al 16 de octubre de 2026) lista 54 donaciones por $45,840, todas con fecha 13 de octubre; el G3 (del 17 al 29 de octubre, tal como estaba presentado el 23 de octubre) lista 27 donaciones por $26,000, todas con fecha 23 de octubre. No hay reporte G1 publicado. Se buscó el nombre y la dirección de cada donante en todas las agendas del Concejo del 13 de enero al 27 de octubre de 2026, y los votos vienen de las actas publicadas, que nombran a los miembros en las votaciones divididas y registran las ausencias. La ciudad no ha publicado el acta del 13 de enero (su enlace abre el acta del 27 de enero), así que los asuntos vistos solo esa noche no aparecen. Se muestran los asuntos de una empresa, propietario o cabildero registrado que donó a Gonzalez. Mariana Chavez, su oponente, reporta $140 propios y $208.65 en especie de un familiar.",
    "Yo te nonmen Luis Gonzalez nan syèj Gwoup II a an janvye 2026 epi li sou bilten 3 novanm nan pou kenbe l. Rapò detaye li yo: G2 (3 rive 16 oktòb 2026) bay 54 kado pou $45,840, tout ak dat 13 oktòb; G3 (17 rive 29 oktòb, jan li te depoze 23 oktòb) bay 27 kado pou $26,000, tout ak dat 23 oktòb. Pa gen rapò G1 ki pibliye. Nou te chèche non ak adrès chak donatè nan tout ajennda Konsèy Vil la depi 13 janvye rive 27 oktòb 2026, epi vòt yo soti nan pwosè-vèbal yo pibliye, ki nonmen manm yo nan vòt divize epi make absans. Vil la pa pibliye pwosè-vèbal 13 janvye a (lyen li louvri pwosè-vèbal 27 janvye a), kidonk dosye ki te pase sèlman swa sa a pa parèt. Nou montre dosye pou yon konpayi, pwopriyetè oswa lobiyis anrejistre ki te bay Gonzalez. Mariana Chavez, advèsè li, rapòte $140 nan pwòp lajan li ak $208.65 an nati nan men yon fanmi."
  ),
  actions: actions.map(a => ({ lobbied: [], giftNotes: {}, ...a })).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)),
};

d.bodies = d.bodies.filter(b => b.key !== 'hialeah');
const at = d.bodies.findIndex(b => b.key === 'flhouse');
d.bodies.splice(at < 0 ? d.bodies.length : at, 0, body);
d.others = (d.others || []).filter(o => o.body.en !== 'Hialeah');
writeFileSync(FILE, JSON.stringify(d, null, 1) + '\n');
console.log('Hialeah: ' + body.actions.length + ' actions, ' + body.actions.reduce((n, a) => n + a.gifts.length, 0) + ' gift rows');
