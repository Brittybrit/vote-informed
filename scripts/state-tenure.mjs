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
import { readFileSync, writeFileSync } from 'node:fs';
import { topicsOf } from './action-topics.mjs';

const root = new URL('../', import.meta.url);
const J = p => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const FILE = 'public/data/decisions.json';
const T = 'scripts/data/tenure/flhouse/';
const d = J(FILE);
const B = d.bodies.find(b => b.key === 'flhouse');

// ---- tenure -------------------------------------------------------------------------------------------
// Seated Nov 9, 2022 (Basabe, Gantt, Chambliss, Porras; Nixon was first seated in Nov 2020, but this list starts with
// the 2023 session, so her start here is the same day); Redondo Dec 5, 2023 (special election). Gifts count from the
// day after the previous general election. Blanco (seated Nov 2024) has no gifts from before 2025 in the files, so he
// keeps Jan 1, 2025.
B.tenure = {
  Basabe: { start: '2022-11-09', giftsFrom: '2020-11-04' },
  Gantt: { start: '2022-11-09', giftsFrom: '2020-11-04' },
  Chambliss: { start: '2022-11-09', giftsFrom: '2020-11-04' },
  Porras: { start: '2022-11-09', giftsFrom: '2020-11-04' },
  Nixon: { start: '2022-11-09', giftsFrom: '2020-11-04' },
  Redondo: { start: '2023-12-05', giftsFrom: '2022-11-09' },
};
B.since = '2022-11-09';

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

// ---- 2023-24 and 2024-25 budget requests --------------------------------------------------------------
B.actions = B.actions.filter(a => !(a.kind === 'request' && /^H2[34]-/.test(a.id)));
let added = 0;
const per = {};
for (const y of [2023, 2024]) {
  const R = J(T + `requests-${y}.json`);
  for (const r of R.requests) {
    if (!B.onBallot[r.member]) throw new Error('not on the ballot: ' + r.member);
    const card = {
      id: 'H' + String(r.fy).slice(2) + '-' + r.form, date: r.date, ref: 'APR ' + r.form + ' · ' + r.fy, kind: 'request',
      subject: { en: r.title, es: r.title, ht: r.title }, parties: [r.recipient], result: 'requested', ask: r.ask,
      roll: { [r.member]: 'requested' }, rollComplete: false, lobbied: r.lobbied.map(l => ({ ...l })), gifts: [],
      links: [{ t: 'record', url: r.record }], cmte: r.cmte, budget: { ...R.budget, ref: 'HF ' + r.form, ...r.budget },
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
writeFileSync(new URL(FILE, root), JSON.stringify(d, null, 1) + '\n');
console.log(`flhouse tenure: ${added} requests added for FY 2023-24 and 2024-25 (${Object.entries(per).map(([k, n]) => k + ' ' + n).join(', ')}); ${nReq} requests in all`);
