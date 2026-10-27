// County Commission: discretionary allocations and three hand-checked fixes (Brit, Oct 27, 2026).
// 1. District 1 allocations by Oliver G. Gilbert III to FYFL United, A3 Foundation and FANM, read by hand from each item's
//    agenda packet (allocation memos) or the Clerk's minutes: scripts/data/county/allocations/gilbert-selected.json.
//    Each becomes a card on the county list (kind funding, Gilbert as prime sponsor, the consent vote as the roll), with the record facts about the
//    group in the card note. Other recipients in the same item are not listed yet (README in that folder).
// 2. The Nov. 18, 2025 appointment of Vicki L. Lopez to the District 5 seat (R-1131-25), with the roll from the minutes.
// 3. Fixes to three existing cards whose generic labels hid what the item did: R-796-25 (FYFL United), R-872-25 (A3
//    Foundation removed as the charity) and R-421-25 (county building conveyed to FANM).
// Idempotent. Run: node scripts/county-allocations.mjs && node scripts/money-summary.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const J = p => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const FILE = 'public/data/decisions.json';
const d = J(FILE);
const B = d.bodies.find(b => b.key === 'county');
const A = J('scripts/data/county/allocations/gilbert-selected.json');
const F = A.facts;
const usd = n => '$' + Math.round(n).toLocaleString('en-US');

const isFyfl = o => /^FYFL/i.test(o), isA3 = o => /^A3 /i.test(o), isFanm = o => /FANM|Family Action Network/i.test(o);
const groupName = o => isFyfl(o) ? 'FYFL United, Inc.' : isA3(o) ? 'A3 Foundation' : 'Family Action Network Movement, Inc. (FANM)';
const CONTEXT = {
  fyfl: {
    en: `About FYFL United: its state corporate filings for 2022 and 2023 list Sandra Pierre-Paul as secretary and treasurer (Sunbiz ${F.fyflSunbiz.doc}); the county's District 1 page lists her as Gilbert's deputy chief of staff. Gilbert's 2024 county campaign reported a $56,971 donation to FYFL United on Sept. 6, 2024.`,
    es: `Sobre FYFL United: sus registros corporativos estatales de 2022 y 2023 nombran a Sandra Pierre-Paul como secretaria y tesorera (Sunbiz ${F.fyflSunbiz.doc}); la página del Distrito 1 del condado la identifica como subjefa de gabinete de Gilbert. La campaña de Gilbert al condado en 2024 reportó una donación de $56,971 a FYFL United el 6 de septiembre de 2024.`,
    ht: `Sou FYFL United: dosye korporasyon Leta 2022 ak 2023 li yo bay Sandra Pierre-Paul kòm sekretè ak trezorye (Sunbiz ${F.fyflSunbiz.doc}); paj Distri 1 konte a bay li kòm adjwen chèf kabinè Gilbert. Kanpay Gilbert pou konte a an 2024 te rapòte yon don $56,971 bay FYFL United 6 septanm 2024.`,
  },
  fanm: {
    en: 'About FANM: the county\'s District 2 page says Commissioner Marleine Bastien founded it and was its executive director until December 2024.',
    es: 'Sobre FANM: la página del Distrito 2 del condado dice que la comisionada Marleine Bastien la fundó y fue su directora ejecutiva hasta diciembre de 2024.',
    ht: 'Sou FANM: paj Distri 2 konte a di Komisyonè Marleine Bastien te fonde l e li te direktè egzekitif li jiska desanm 2024.',
  },
};
const line = (l, lang) => {
  const [org, amt, use, src] = l;
  if (amt < 0) return { en: `Rescinds ${usd(-amt)} to ${org} ${use || ''}`.trim(), es: `Rescinde ${usd(-amt)} a ${org} ${use || ''}`.trim(), ht: `Anile ${usd(-amt)} bay ${org} ${use || ''}`.trim() }[lang];
  const u = use ? ` (${use})` : '';
  return { en: `${usd(amt)} to ${org}${u}, from the ${src}.`, es: `${usd(amt)} a ${org}${u}, del ${src} (en inglés).`, ht: `${usd(amt)} bay ${org}${u}, nan ${src} (an angle).` }[lang];
};
const otherNote = { en: 'Other allocations in the same item are not listed here.', es: 'Otras asignaciones del mismo asunto no aparecen aquí.', ht: 'Lòt alokasyon nan menm dosye a pa parèt isit la.' };

// The roll: everyone seated that day (from another card of the same meeting, or the nearest earlier one) voted yes
// unless the minutes list them absent or excused; the consent vote total must match.
const ALLOC = new Set(A.items.map(i => i.matter));
const prior = B.actions.filter(a => a.rollComplete && !ALLOC.has(a.id) && a.id !== '252334').sort((p, q) => q.date.localeCompare(p.date));
const rollFor = it => {
  const t = prior.find(a => a.date <= it.date) || prior.at(-1);
  const roll = {};
  for (const [k, v] of Object.entries(t.roll)) roll[k] = v == null ? null : 'yes';
  for (const k of it.absent || []) { if (!(k in roll)) throw new Error(it.matter + ' absent not a member: ' + k); roll[k] = 'absent'; }
  for (const k of it.excused || []) { if (!(k in roll)) throw new Error(it.matter + ' excused not a member: ' + k); roll[k] = 'excused'; }
  const yes = Object.values(roll).filter(v => v === 'yes').length;
  if (yes !== it.vote[0]) throw new Error(`${it.matter} roll gives ${yes} yes, minutes ${it.vote[0]} (template ${t.id} ${t.date})`);
  return roll;
};

let added = 0;
for (const it of A.items) {
  const id = it.matter;
  const orgs = [...new Set(it.lines.map(l => groupName(l[0])))];
  const pos = it.lines.filter(l => l[1] > 0).reduce((s, l) => s + l[1], 0);
  const note = {};
  for (const L of ['en', 'es', 'ht']) {
    const parts = it.lines.map(l => line(l, L));
    if (it.lines.some(l => isFyfl(l[0]))) parts.push(CONTEXT.fyfl[L]);
    if (it.lines.some(l => isFanm(l[0]))) parts.push(CONTEXT.fanm[L]);
    parts.push(otherNote[L]);
    note[L] = parts.join(' ');
  }
  const card = {
    id, ref: it.ref || 'Clerk\'s report', date: it.date, meeting: 'bcc', kind: 'funding',
    parties: orgs, amount: pos,
    subject: { en: 'District 1 allocations', es: 'Asignaciones del Distrito 1', ht: 'Alokasyon Distri 1' },
    result: 'adopted', tally: it.vote, roll: rollFor(it), rollComplete: true, roles: { Gilbert: ['sponsoredItem'].concat(it.mover === 'Gilbert' ? ['moved'] : []) }, mover: it.mover, second: it.second,
    lobbied: [], gifts: [], links: it.links.concat([{ t: 'record', url: F.fyflSunbiz.url }].filter(() => it.lines.some(l => isFyfl(l[0])))), note, topics: [],
  };
  const i = B.actions.findIndex(a => a.id === id);
  if (i >= 0) B.actions[i] = Object.assign(B.actions[i], card); else { B.actions.push(card); added++; }
}

// The Lopez appointment
const appt = {
  id: '252334', ref: 'R-1131-25', date: '2025-11-18', meeting: 'bcc', kind: 'other', parties: ['Vicki L. Lopez'],
  subject: { en: 'Appointment of Vicki L. Lopez to the District 5 seat', es: 'Nombramiento de Vicki L. Lopez al escaño del Distrito 5', ht: 'Nominasyon Vicki L. Lopez nan syèj Distri 5 la' },
  result: 'adopted', tally: [7, 5],
  roll: { Rodriguez: 'yes', Bastien: 'yes', Gilbert: 'yes', Gonzalez: 'yes', Hardemon: 'yes', 'Cohen Higgins': 'yes', 'Milian Orbis': 'yes', McGhee: 'no', Bermudez: 'no', Garcia: 'no', Regalado: 'no', Steinberg: 'no', Lopez: null },
  rollComplete: true, roles: { Gilbert: ['sponsoredItem', 'moved'] }, mover: 'Gilbert', second: 'Cohen Higgins', lobbied: [], gifts: [], topics: [],
  links: [{ t: 'matter', url: 'https://www.miamidade.gov/govaction/matter.asp?matter=252334&file=true&yearFolder=Y2025' }, { t: 'minutes', url: 'https://www.miamidade.gov/govaction/commminute.asp?cmbmeetdate=5435&file=false' }],
  note: {
    en: 'The Commission filled the District 5 vacancy by appointment instead of calling a special election. The minutes record the vote as 7 to 5, with Steinberg, Regalado, McGhee, Bermudez and García voting no; Gilbert made the motion. Lopez, then a state representative, holds the seat until the Nov. 3, 2026 runoff, where she is on the ballot.',
    es: 'La Comisión llenó la vacante del Distrito 5 por nombramiento en lugar de convocar una elección especial. El acta registra el voto 7 a 5, con Steinberg, Regalado, McGhee, Bermudez y García en contra; Gilbert presentó la moción. Lopez, entonces representante estatal, ocupa el escaño hasta la segunda vuelta del 3 de noviembre de 2026, donde está en la boleta.',
    ht: 'Komisyon an ranpli pòs vid Distri 5 la pa nominasyon olye li rele yon eleksyon espesyal. Pwosè-vèbal la anrejistre vòt la 7 kont 5, ak Steinberg, Regalado, McGhee, Bermudez ak García ki vote non; Gilbert te pwopoze mosyon an. Lopez, ki te reprezantan Leta lè sa a, kenbe syèj la jiska dezyèm tou 3 novanm 2026 la, kote li sou bilten an.',
  },
};
{ const i = B.actions.findIndex(a => a.id === appt.id); if (i >= 0) B.actions[i] = Object.assign(B.actions[i], appt); else { B.actions.push(appt); added++; } }

// Fixes to existing cards
const fix = (id, f) => { const a = B.actions.find(x => x.id === id); if (!a) throw new Error('missing card ' + id); Object.assign(a, f); };
fix('251563', {
  amount: 50000,
  subject: { en: '$50,000 moved to FYFL United', es: '$50,000 reasignados a FYFL United', ht: '$50,000 transfere bay FYFL United' },
  note: {
    en: 'Moves $50,000 of Miami-Dade Rescue Plan money from Universal Medical Institute, Inc. to The FYFL United Inc. "to provide youth services." ' + CONTEXT.fyfl.en,
    es: 'Reasigna $50,000 del Miami-Dade Rescue Plan de Universal Medical Institute, Inc. a The FYFL United Inc. "para servicios a jóvenes". ' + CONTEXT.fyfl.es,
    ht: 'Transfere $50,000 nan Miami-Dade Rescue Plan soti nan Universal Medical Institute, Inc. bay The FYFL United Inc. "pou bay sèvis jèn yo". ' + CONTEXT.fyfl.ht,
  },
});
fix('251737', {
  subject: { en: 'Park vendor\'s yearly charity payment moved from A3 Foundation to the Parks Foundation', es: 'El pago anual a una organización benéfica del concesionario del parque pasa de A3 Foundation a la Parks Foundation', ht: 'Peman chak ane konsesyonè pak la bay yon òganizasyon charitab pase soti nan A3 Foundation bay Parks Foundation' },
  kind: 'change',
  note: {
    en: 'Amends R-792-25 so the annual contribution the Tropical Park Equestrian Center vendor must make (contract EVN0001892) goes to The Parks Foundation of Miami-Dade, Inc. instead of A3 Foundation, Inc. This item took A3 Foundation off the contract.',
    es: 'Modifica la R-792-25 para que la contribución anual que debe hacer el concesionario del Tropical Park Equestrian Center (contrato EVN0001892) vaya a The Parks Foundation of Miami-Dade, Inc. en lugar de A3 Foundation, Inc. Este asunto sacó a A3 Foundation del contrato.',
    ht: 'Modifye R-792-25 pou kontribisyon chak ane konsesyonè Tropical Park Equestrian Center la dwe fè (kontra EVN0001892) ale bay The Parks Foundation of Miami-Dade, Inc. olye A3 Foundation, Inc. Dosye sa a retire A3 Foundation nan kontra a.',
  },
});
fix('251675', {
  subject: { en: 'County building given to FANM', es: 'Edificio del condado cedido a FANM', ht: 'Bilding konte a bay FANM' },
  kind: 'land',
  note: {
    en: 'Conveys the 10,800-square-foot county-owned building at 100 NE 84th Street to Family Action Network Movement, Inc. (FANM) for nominal consideration, waives FANM\'s past-due rent on it, and moves $752,848 of surplus bond money from the "New Haitian Community Center" project to "Future Multi-Use Facilities." ' + CONTEXT.fanm.en + ' Bastien was absent for this vote.',
    es: 'Cede el edificio del condado de 10,800 pies cuadrados en 100 NE 84th Street a Family Action Network Movement, Inc. (FANM) por un pago nominal, le perdona a FANM la renta atrasada y traslada $752,848 de fondos sobrantes de bonos del proyecto "New Haitian Community Center" a "Future Multi-Use Facilities". ' + CONTEXT.fanm.es + ' Bastien estuvo ausente en esta votación.',
    ht: 'Bay bilding konte 10,800 pye kare nan 100 NE 84th Street la bay Family Action Network Movement, Inc. (FANM) pou yon pri senbolik, padone lwaye FANM te dwe sou li, epi transfere $752,848 lajan bon ki rete soti nan pwojè "New Haitian Community Center" bay "Future Multi-Use Facilities". ' + CONTEXT.fanm.ht + ' Bastien te absan pou vòt sa a.',
  },
});

B.actions.sort((p, q) => q.date.localeCompare(p.date));
writeFileSync(new URL(FILE, root), JSON.stringify(d, null, 1) + '\n');
console.log('county allocation cards added:', added, '| total', A.items.length + 1);
