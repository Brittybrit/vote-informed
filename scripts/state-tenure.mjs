// Florida House, full tenure (Brit, Oct 25, 2026): adds the 2023 and 2024 sessions to the "flhouse" body of
// public/data/decisions.json for the members on the ballot.
// - Appropriations Project Requests filed for FY 2023-24 and FY 2024-25 (scripts/data/tenure/flhouse/requests-2023.json,
//   requests-2024.json): one card per form, same shape as the 2025-26 cards (state-nixon.mjs), with where it landed in
//   that year's final budget (SB 2500, Ch. 2023-239; HB 5001, Ch. 2024-231) and the governor's veto list.
// - Each member's tenure: start = first day seated in the period covered; giftsFrom = one election cycle before
//   (the day after the previous general election), which is where the 2020-2024 donor files begin.
// - The members' earlier campaign accounts (scripts/data/tenure/flhouse/donors/<name>-pre2025.tsv). Their political
//   committees keep the account they already have; state-bills.mjs reads those committees' 2020-2024 rows too.
// Laws (2023 and 2024 sessions) and their gifts are added by state-bills.mjs; firm and lobbyist gifts on the request
// cards by state-firm-gifts.mjs. Idempotent: the H23-/H24- cards are rebuilt on every run.
// Run: node scripts/state-tenure.mjs && node scripts/state-bills.mjs && node scripts/state-firm-gifts.mjs
//      && node scripts/leads.mjs && node scripts/money-summary.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { topicsOf } from './action-topics.mjs';

const root = new URL('../', import.meta.url);
const J = p => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const FILE = 'public/data/decisions.json';
const T = 'scripts/data/tenure/flhouse/';
const d = J(FILE);
const B = d.bodies.find(b => b.key === 'flhouse');

// ---- tenure -------------------------------------------------------------------------------------------
// Seated Nov 9, 2022 (Basabe, Gantt, Porras); Nixon (then District 14) and Chambliss Nov 4, 2020, so their 2021 and
// 2022 sessions are in the list too (flhouse.gov representatives.aspx?legislativetermid=89); Redondo Dec 5, 2023
// (special election). Gifts count from the day after the previous general election. Blanco (seated Nov 2024) has no
// gifts from before 2025 in the files, so he keeps Jan 1, 2025.
// The 2021-22 years switch on only when their data is complete: both years' requests, every qualifying law screened
// and its House roll call read (bills-2122.json "missing" empty), and the 2018-2020 donor rows pulled. Until then the
// list stays as merged (2023 on). FORCE_2122=1 previews it anyway (do not publish).
const opt = f => existsSync(new URL(T + f, root)) ? J(T + f) : null;
const B2122 = opt('bills-2122.json');
const done2122 = !!(opt('requests-2021.json') && opt('requests-2022.json') && B2122 && !Object.values(B2122.missing).some(x => x.length)
  && existsSync(new URL(T + 'donors/nixon-2018.tsv', root)) && existsSync(new URL(T + 'donors/chambliss-2018.tsv', root)));
const ON2122 = done2122 || process.env.FORCE_2122 === '1';
B.tenure = {
  Basabe: { start: '2022-11-09', giftsFrom: '2020-11-04' },
  Gantt: { start: '2022-11-09', giftsFrom: '2020-11-04' },
  Chambliss: ON2122 ? { start: '2020-11-04', giftsFrom: '2018-11-07' } : { start: '2022-11-09', giftsFrom: '2020-11-04' },
  Porras: { start: '2022-11-09', giftsFrom: '2020-11-04' },
  Nixon: ON2122 ? { start: '2020-11-04', giftsFrom: '2018-11-07' } : { start: '2022-11-09', giftsFrom: '2020-11-04' },
  Redondo: { start: '2023-12-05', giftsFrom: '2022-11-09' },
};
B.since = ON2122 ? '2020-11-04' : '2022-11-09';

// ---- earlier campaign accounts ------------------------------------------------------------------------
const DOE = 'https://dos.elections.myflorida.com/campaign-finance/contributions/';
const PRE = {
  Basabe: ['Fabián Basabe', 'basabe-pre2025'], Gantt: ['Ashley Viola Gantt', 'gantt-pre2025'], Chambliss: ['Kevin Chambliss', 'chambliss-pre2025'],
  Porras: ['Juan Carlos Porras', 'porras-pre2025'], Redondo: ['Mike Redondo', 'redondo-pre2025'], Nixon: ['Angie Nixon', 'nixon-pre2025'],
};
for (const [k, [name, acct]] of Object.entries(PRE)) {
  B.accounts[acct] = { owner: k, name: { en: `${name} State House campaigns (2020-2024)`, es: `Campañas de ${name} a la Cámara estatal (2020-2024)`, ht: `Kanpay ${name} pou Chanm Leta a (2020-2024)` }, url: DOE };
  if (!B.onBallot[k].accounts.includes(acct)) B.onBallot[k].accounts.push(acct);
}

// ---- 2021-22 through 2024-25 budget requests ----------------------------------------------------------
// 2023 and 2024: Appropriations Project Request forms (ref "APR n", budget ref "HF n"). 2021 and 2022: the House filed
// each request as an Appropriations Project bill with the form attached; the budget names the bill ("(HB n)"), so the
// card's ref and budget ref are the bill number (requests-2021.json, requests-2022.json, Nixon and Chambliss only).
B.actions = B.actions.filter(a => !(a.kind === 'request' && /^H2[1-4]-/.test(a.id)));
let added = 0;
const per = {};
for (const y of ON2122 ? [2021, 2022, 2023, 2024] : [2023, 2024]) {
  if (!existsSync(new URL(T + `requests-${y}.json`, root))) continue;
  const R = J(T + `requests-${y}.json`);
  for (const r of R.requests) {
    if (!B.onBallot[r.member]) throw new Error('not on the ballot: ' + r.member);
    const card = {
      id: 'H' + String(r.fy).slice(2) + '-' + r.form, date: r.date, ref: (r.bill ? r.bill : 'APR ' + r.form) + ' · ' + r.fy, kind: 'request',
      subject: { en: r.title, es: r.title, ht: r.title }, parties: [r.recipient], result: 'requested', ask: r.ask,
      roll: { [r.member]: 'requested' }, rollComplete: false, lobbied: r.lobbied.map(l => ({ ...l })), gifts: [],
      links: [{ t: 'record', url: r.record }], cmte: r.cmte, budget: { ...R.budget, ref: r.bill || 'HF ' + r.form, ...r.budget },
    };
    // Forms filed for a seat before its new member was sworn in, which the House lists under that member (Redondo,
    // District 118, sworn in Dec 5, 2023): the card keeps the filed date and says when the sponsor took the seat
    const st = B.tenure[r.member] && B.tenure[r.member].start;
    if (st && r.date < st) {
      card.filedForSeat = st;
      const day = { en: 'December 5, 2023', es: '5 de diciembre de 2023', ht: '5 desanm 2023' };
      if (st !== '2023-12-05') throw new Error('write the sworn-in date for ' + r.member);
      card.note = { en: `Filed for this House seat before ${B.members.find(m => m.key === r.member).name} was sworn in on ${day.en}; the House lists him as the sponsor.`,
        es: `Presentada para este escaño de la Cámara antes de que ${B.members.find(m => m.key === r.member).name} juramentara el ${day.es}; la Cámara lo indica como patrocinador.`,
        ht: `Yo te depoze l pou syèj Chanm sa a anvan ${B.members.find(m => m.key === r.member).name} te prete sèman ${day.ht}; Chanm nan mete l kòm patwon.` };
    }
    card.topics = topicsOf(card);
    B.actions.push(card); added++;
    per[r.member] = (per[r.member] || 0) + 1;
  }
}
B.actions.sort((p, q) => q.date.localeCompare(p.date) || String(p.id).localeCompare(String(q.id)));

// ---- coverage -----------------------------------------------------------------------------------------
const nReq = B.actions.filter(a => a.kind === 'request').length;
B.coverage = {
  en: `Every Appropriations Project Request filed for the 2023, 2024, 2025 and 2026 sessions by the six House members from Miami-Dade who are on the ballot, and by Angie Nixon (District 13, Jacksonville), who is on the ballot for U.S. Senate (${nReq} forms), as posted by the Florida House. Each form names the member who filed it, the group that would receive the money, and the lobbyist working on it, if any. Gifts are from each member’s campaign accounts and any political committee they chair, as filed with the Florida Division of Elections, from the day after the general election before the member’s first session in this list (November 4, 2020; November 9, 2022 for Mike Redondo, who was seated in December 2023; January 2025 for Omar Blanco, first seated in November 2024) to October 2026; for Nixon, also her U.S. Senate campaign’s FEC reports. Each form number was looked up in the final budget the Legislature passed (SB 2500 for 2023-24, HB 5001 for 2024-25, SB 2500 for 2025-26, HB 5001E for 2026-27) and in the governor’s veto list for that year. The list also has these members’ House floor votes on every bill that became law in the 2023 through 2026 sessions where the Legislature’s own staff analysis says the bill helps a kind of business, with gifts from donors in that kind of business.`,
  es: `Todas las solicitudes de proyectos presupuestarios (Appropriations Project Requests) presentadas para las sesiones de 2023, 2024, 2025 y 2026 por los seis representantes de Miami-Dade que están en la boleta, y por Angie Nixon (Distrito 13, Jacksonville), que está en la boleta para el Senado de EE. UU. (${nReq} formularios), según los publica la Cámara de Florida. Cada formulario nombra al miembro que la presentó, al grupo que recibiría el dinero y al cabildero que trabaja en ella, si lo hay. Las donaciones son de las cuentas de campaña de cada miembro y de cualquier comité político que preside, según los reportes a la División de Elecciones de Florida, desde el día después de la elección general anterior a la primera sesión del miembro en esta lista (4 de noviembre de 2020; 9 de noviembre de 2022 para Mike Redondo, que entró en diciembre de 2023; enero de 2025 para Omar Blanco, que entró en noviembre de 2024) hasta octubre de 2026; en el caso de Nixon, también los reportes de su campaña al Senado ante la FEC. Cada número de formulario se buscó en el presupuesto final aprobado por la Legislatura (SB 2500 para 2023-24, HB 5001 para 2024-25, SB 2500 para 2025-26, HB 5001E para 2026-27) y en la lista de vetos del gobernador de ese año. La lista también tiene los votos de estos miembros en el pleno de la Cámara sobre cada proyecto que se convirtió en ley en las sesiones de 2023 a 2026 cuando el propio análisis del personal legislativo dice que el proyecto ayuda a un tipo de negocio, con las donaciones de donantes de ese tipo de negocio.`,
  ht: `Tout demann pwojè bidjè (Appropriations Project Requests) sis reprezantan Miami-Dade ki sou bilten an te depoze pou sesyon 2023, 2024, 2025 ak 2026 yo, ak Angie Nixon (Distri 13, Jacksonville), ki sou bilten an pou Sena Etazini (${nReq} fòm), jan Chanm Florid pibliye yo. Chak fòm nonmen manm ki te depoze l la, gwoup ki ta resevwa lajan an, ak lobiyis k ap travay sou li, si genyen. Kado yo soti nan kont kanpay chak manm ak nenpòt komite politik li prezide, jan yo depoze yo nan Divizyon Eleksyon Florid, depi jou apre eleksyon jeneral ki te vin anvan premye sesyon manm nan nan lis sa a (4 novanm 2020; 9 novanm 2022 pou Mike Redondo, ki te antre an desanm 2023; janvye 2025 pou Omar Blanco, ki te antre an novanm 2024) rive oktòb 2026; pou Nixon, tou rapò FEC kanpay li pou Sena a. Nou chèche chak nimewo fòm nan bidjè final Lejislati a te vote a (SB 2500 pou 2023-24, HB 5001 pou 2024-25, SB 2500 pou 2025-26, HB 5001E pou 2026-27) ak nan lis veto gouvènè a pou ane sa a. Lis la gen tou vòt manm sa yo nan sesyon plenyè Chanm nan sou chak pwojè ki te tounen lwa nan sesyon 2023 rive 2026 lè analiz anplwaye Lejislati a menm di pwojè a ede yon kalite biznis, ak kado donatè nan kalite biznis sa a.`,
};
// ==== Florida Senate, full tenure ==========================================================================
// Same approach for the "flsenate" body (scripts/data/tenure/flsenate/): every Local Funding Initiative Request filed for
// FY 2021-22 through 2024-25 by the senators in the list (requests-<fy>.json; 814 forms, Ray Rodrigues's forms excluded
// there), with where it landed in that year's final budget and the governor's veto list; each senator's tenure (Garcia and
// Rodriguez seated Nov 3, 2020; Calatayud and Ingoglia Nov 8, 2022; gifts from the day after the previous general
// election); and coverage text. Accounts are unchanged: the 2018-2024 rows of the same accounts are in
// scripts/data/tenure/flsenate/donors/<acct>.tsv, read by state-bills.mjs and state-firm-gifts.mjs. Ingoglia (CFO since
// July 2025) keeps his Senate cards on this body; the cabinet body is not touched. Cards S21- to S24- are rebuilt every run.
const TS = 'scripts/data/tenure/flsenate/';
const S = d.bodies.find(b => b.key === 'flsenate');
let sAdded = 0; const sPer = {};
if (S && existsSync(new URL(TS + 'requests-2024-25.json', root))) {
  S.tenure = {
    Garcia: { start: '2020-11-03', giftsFrom: '2018-11-07' },
    Rodriguez: { start: '2020-11-03', giftsFrom: '2018-11-07' },
    Calatayud: { start: '2022-11-08', giftsFrom: '2020-11-04' },
    Ingoglia: { start: '2022-11-08', giftsFrom: '2020-11-04' },
  };
  S.since = '2020-11-03';
  S.actions = S.actions.filter(a => !(a.kind === 'request' && /^S2[1-4]-/.test(a.id)));
  const WD = { en: 'The Senate list marks this request withdrawn', es: 'La lista del Senado marca esta solicitud como retirada', ht: 'Lis Sena a make demann sa a kòm retire' };
  for (const fy of ['2021-22', '2022-23', '2023-24', '2024-25']) {
    const R = J(TS + `requests-${fy}.json`);
    for (const r of R.requests) {
      if (!S.onBallot[r.member]) throw new Error('flsenate: not on the ballot: ' + r.member);
      const { withdrawn, proviso, ...bud } = r.budget;
      const card = {
        id: 'S' + fy.slice(2, 4) + '-' + r.form, date: r.date, ref: 'LFIR ' + r.form + ' · FY ' + fy, kind: 'request',
        subject: { en: r.title, es: r.title, ht: r.title }, parties: [r.recipient], result: withdrawn ? 'requestedW' : 'requested', ask: r.ask,
        roll: { [r.member]: 'requested' }, rollComplete: false, lobbied: r.lobbied.map(l => ({ ...l })), gifts: [],
        links: [{ t: 'record', url: r.record }], cmte: r.cmte,
        ...(withdrawn ? { note: { en: WD.en + (typeof withdrawn === 'string' ? ` (${withdrawn}).` : '.'), es: WD.es + (typeof withdrawn === 'string' ? ` (${withdrawn}).` : '.'), ht: WD.ht + (typeof withdrawn === 'string' ? ` (${withdrawn}).` : '.') } } : {}),
        budget: { ...R.budget, ref: 'SF ' + r.form, ...bud },
      };
      if (card.budget.amount == null) delete card.budget.amount;
      card.topics = topicsOf(card);
      S.actions.push(card); sAdded++; sPer[r.member] = (sPer[r.member] || 0) + 1;
    }
  }
  S.actions.sort((p, q) => q.date.localeCompare(p.date) || String(p.id).localeCompare(String(q.id)));
  const nS = S.actions.filter(a => a.kind === 'request').length;
  S.coverage = {
    en: `Every Local Funding Initiative Request filed for fiscal years 2021-22 through 2026-27 by the senators in this list (${nS} forms), as posted by the Florida Senate: Ileana Garcia and Ana Maria Rodriguez from their first session (seated November 2020), Alexis Calatayud and Blaise Ingoglia from November 2022 (Ingoglia until he became Chief Financial Officer in July 2025). Each form names the senator who filed it, the group that would receive the money, and the lobbyist working on it, if any. Gifts are from each senator’s campaign account and any political committee they chair, as filed with the Florida Division of Elections, from the day after the general election before the senator was first seated (November 7, 2018 for Garcia and Rodriguez; November 4, 2020 for Calatayud and Ingoglia) to October 2026. Each form number was looked up in the final budget the Legislature passed for that year (SB 2500 for 2021-22, HB 5001 for 2022-23, SB 2500 for 2023-24, HB 5001 for 2024-25, SB 2500 for 2025-26, HB 5001E for 2026-27) and in the governor’s veto list; some forms are funded only through budget wording that gives no separate amount. Lobbying firms are matched against the Legislature’s lobbying-firm directories for 2020 through 2026. Ashley Gantt, a House member running for the Senate, is listed with the House. The list also has these senators’ floor votes on every bill that became law in the 2021 through 2026 sessions where the Legislature’s own staff analysis says the bill helps a kind of business, with gifts from donors in that kind of business. Not included: chapter law 2022-150, which the Senate’s list of bills that became law does not show; and the budget bills themselves (the General Appropriations Acts and their implementing and conforming bills), whose only analyses are conference reports with no private-sector section.`,
    es: `Todas las solicitudes de fondos locales (Local Funding Initiative Requests) presentadas para los años fiscales 2021-22 a 2026-27 por los senadores de esta lista (${nS} formularios), según los publica el Senado de Florida: Ileana Garcia y Ana Maria Rodriguez desde su primera sesión (entraron en noviembre de 2020), Alexis Calatayud y Blaise Ingoglia desde noviembre de 2022 (Ingoglia hasta que se convirtió en Director de Finanzas en julio de 2025). Cada formulario nombra al senador que la presentó, al grupo que recibiría el dinero y al cabildero que trabaja en ella, si lo hay. Las donaciones son de la cuenta de campaña de cada senador y de cualquier comité político que preside, según los reportes a la División de Elecciones de Florida, desde el día después de la elección general anterior a la entrada del senador (7 de noviembre de 2018 para Garcia y Rodriguez; 4 de noviembre de 2020 para Calatayud e Ingoglia) hasta octubre de 2026. Cada número de formulario se buscó en el presupuesto final aprobado por la Legislatura para ese año (SB 2500 para 2021-22, HB 5001 para 2022-23, SB 2500 para 2023-24, HB 5001 para 2024-25, SB 2500 para 2025-26, HB 5001E para 2026-27) y en la lista de vetos del gobernador; algunos formularios se financian solo mediante texto del presupuesto que no indica una cantidad aparte. Las firmas de cabildeo se comparan con los directorios de firmas de cabildeo de la Legislatura de 2020 a 2026. Ashley Gantt, representante que se postula al Senado, aparece con la Cámara. La lista también tiene los votos en el pleno de estos senadores sobre cada proyecto que se convirtió en ley en las sesiones de 2021 a 2026 cuando el propio análisis del personal legislativo dice que el proyecto ayuda a un tipo de negocio, con las donaciones de donantes de ese tipo de negocio. No se incluyen: la ley 2022-150, que la lista del Senado de proyectos convertidos en ley no muestra; ni los proyectos de presupuesto (las Leyes Generales de Asignaciones y sus proyectos de implementación y conformidad), cuyos únicos análisis son informes de conferencia sin sección sobre el sector privado.`,
    ht: `Tout demann finansman lokal (Local Funding Initiative Requests) senatè nan lis sa a te depoze pou ane fiskal 2021-22 rive 2026-27 (${nS} fòm), jan Sena Florid pibliye yo: Ileana Garcia ak Ana Maria Rodriguez depi premye sesyon yo (yo te antre an novanm 2020), Alexis Calatayud ak Blaise Ingoglia depi novanm 2022 (Ingoglia jiskaske li te vin Ofisye Finans an jiyè 2025). Chak fòm nonmen senatè ki te depoze l la, gwoup ki ta resevwa lajan an, ak lobiyis k ap travay sou li, si genyen. Kado yo soti nan kont kanpay chak senatè ak nenpòt komite politik li prezide, jan yo depoze yo nan Divizyon Eleksyon Florid, depi jou apre eleksyon jeneral ki te vin anvan senatè a te antre (7 novanm 2018 pou Garcia ak Rodriguez; 4 novanm 2020 pou Calatayud ak Ingoglia) rive oktòb 2026. Nou chèche chak nimewo fòm nan bidjè final Lejislati a te vote pou ane sa a (SB 2500 pou 2021-22, HB 5001 pou 2022-23, SB 2500 pou 2023-24, HB 5001 pou 2024-25, SB 2500 pou 2025-26, HB 5001E pou 2026-27) ak nan lis veto gouvènè a; gen kèk fòm ki jwenn lajan sèlman atravè tèks bidjè a ki pa bay yon kantite apa. Nou konpare fèm lobiyis yo ak anyè fèm lobiyis Lejislati a pou 2020 rive 2026. Ashley Gantt, yon reprezantan k ap kouri pou Sena a, parèt ak Chanm nan. Lis la gen tou vòt senatè sa yo nan sesyon plenyè sou chak pwojè ki te tounen lwa nan sesyon 2021 rive 2026 lè analiz anplwaye Lejislati a menm di pwojè a ede yon kalite biznis, ak kado donatè nan kalite biznis sa a. Sa ki pa ladan l: lwa 2022-150, ke lis Sena a pou pwojè ki te tounen lwa pa montre; ak pwojè bidjè yo menm (Lwa Jeneral Afektasyon yo ak pwojè aplikasyon ak konfòmite yo), paske sèl analiz yo se rapò konferans ki pa gen seksyon sou sektè prive a.`,
  };
}

writeFileSync(new URL(FILE, root), JSON.stringify(d, null, 1) + '\n');
if (S && S.tenure) console.log(`flsenate tenure: ${sAdded} requests added for FY 2021-22 to 2024-25 (${Object.entries(sPer).map(([k, n]) => k + ' ' + n).join(', ')}); ${S.actions.filter(a => a.kind === 'request').length} requests in all`);
console.log(`flhouse tenure: ${added} requests added for FY 2023-24 and 2024-25 (${Object.entries(per).map(([k, n]) => k + ' ' + n).join(', ')}); ${nReq} requests in all`);
