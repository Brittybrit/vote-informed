// Adds Rep. Angie Nixon (Florida House District 13, Jacksonville), on the Nov 3 ballot for U.S. Senate,
// to the Florida House tab: her six Appropriations Project Requests and her votes on the House floor-vote
// bills already listed. None of her forms names a registered lobbyist, and no gift from a recipient group,
// its contacts, or a business of the kinds those bills help was found in her state or federal campaign
// reports, so her cards carry no gifts.
// Run: node scripts/state-nixon.mjs (safe to re-run), then node scripts/money-summary.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const N = JSON.parse(readFileSync(new URL('./data/state/nixon.json', import.meta.url)));
const FILE = new URL('../public/data/decisions.json', import.meta.url);
const d = JSON.parse(readFileSync(FILE));
const B = d.bodies.find(b => b.key === 'flhouse');
const K = N.member.key;
const BUDGET = {
  2025: { law: 'SB 2500', ch: 'Ch. 2025-198', fy: '2025-26', url: 'https://www.flsenate.gov/Session/Bill/2025/2500/BillText/er/PDF', vetoUrl: 'https://www.flgov.com/eog/sites/default/files/shared/2025/06/2025%20Final%20Veto%20List.pdf' },
  2026: { law: 'HB 5001E', ch: 'Ch. 2026-232', fy: '2026-27', url: 'https://www.flsenate.gov/Session/Bill/2026E/5001E/BillText/er/PDF', vetoUrl: 'https://www.flgov.com/eog/sites/default/files/shared/2026/06/2026%20Veto%20List.pdf' },
};
const SESSION = { 2025: 105, 2026: 113 };

if (!B.members.some(m => m.key === K)) B.members.push(N.member);
B.onBallot[K] = { race: N.race, accounts: Object.keys(N.accounts) };
for (const [k, a] of Object.entries(N.accounts)) B.accounts[k] = { owner: K, ...a };

B.actions = B.actions.filter(a => !(a.kind === 'request' && a.roll[K]));
for (const r of N.requests) {
  const yy = String(r.fy).slice(2);
  const card = {
    id: 'H' + yy + '-' + r.form, date: r.date, ref: 'APR ' + r.form + ' · ' + r.fy, kind: 'request',
    subject: { en: r.title, es: r.title, ht: r.title }, parties: [r.recipient], result: 'requested', ask: r.ask,
    roll: { [K]: 'requested' }, rollComplete: false, lobbied: [], gifts: [],
    links: [{ t: 'record', url: 'https://www.flhouse.gov/api/document/apr?sessionid=' + SESSION[r.fy] + '&id=' + r.docId }],
    cmte: r.cmte, budget: { ...BUDGET[r.fy], ref: 'HF ' + r.form, ...r.budget },
  };
  // The list runs newest first; put the card after everything on the same date or later.
  const at = B.actions.findIndex(x => x.date < card.date);
  B.actions.splice(at < 0 ? B.actions.length : at, 0, card);
}
for (const [id, v] of Object.entries(N.votes)) {
  const a = B.actions.find(x => x.id === id);
  if (!a) throw new Error('no vote card ' + id);
  a.roll[K] = v;
}

B.coverage = {
  en: 'Every Appropriations Project Request filed for the 2025 and 2026 sessions by the six House members from Miami-Dade who are on the ballot, and by Angie Nixon (District 13, Jacksonville), who is on the ballot for U.S. Senate (313 forms), as posted by the Florida House. Each form names the member who filed it, the group that would receive the money, and the registered lobbyist working on it, if any. Gifts are from each member’s campaign account and any political committee they chair, January 2025 to October 2026, as filed with the Florida Division of Elections; for Nixon, also her U.S. Senate campaign’s FEC reports. Each form number was looked up in the final budget the Legislature passed (SB 2500 for 2025-26, HB 5001E for 2026-27) and in the governor’s veto list for that year. The list also has these members’ floor votes on bills that became law in 2025 and 2026 where the Legislature’s own staff analysis says the bill helps a kind of business that gave to them (car dealers, alcohol distributors, affordable-housing developers, ride-hailing companies).',
  es: 'Todas las solicitudes de proyectos presupuestarios (Appropriations Project Requests) presentadas para las sesiones de 2025 y 2026 por los seis representantes de Miami-Dade que están en la boleta, y por Angie Nixon (Distrito 13, Jacksonville), que está en la boleta para el Senado de EE. UU. (313 formularios), según los publica la Cámara de Florida. Cada formulario nombra al miembro que la presentó, al grupo que recibiría el dinero y al cabildero registrado que trabaja en ella, si lo hay. Las donaciones son de la cuenta de campaña de cada miembro y de cualquier comité político que preside, de enero de 2025 a octubre de 2026, según los reportes a la División de Elecciones de Florida; en el caso de Nixon, también los reportes de su campaña al Senado ante la FEC. Cada número de formulario se buscó en el presupuesto final aprobado por la Legislatura (SB 2500 para 2025-26, HB 5001E para 2026-27) y en la lista de vetos del gobernador de ese año. La lista también tiene los votos en el pleno de estos miembros sobre proyectos que se convirtieron en ley en 2025 y 2026 cuando el propio análisis del personal legislativo dice que el proyecto ayuda a un tipo de negocio que les donó (concesionarios de autos, distribuidores de alcohol, desarrolladores de vivienda asequible, empresas de transporte por aplicación).',
  ht: 'Tout demann pwojè bidjè (Appropriations Project Requests) sis reprezantan Miami-Dade ki sou bilten an te depoze pou sesyon 2025 ak 2026 yo, ak Angie Nixon (Distri 13, Jacksonville), ki sou bilten an pou Sena Etazini (313 fòm), jan Chanm Florid pibliye yo. Chak fòm nonmen manm ki te depoze l la, gwoup ki ta resevwa lajan an, ak lobiyis anrejistre k ap travay sou li, si genyen. Kado yo soti nan kont kanpay chak manm ak nenpòt komite politik li prezide, depi janvye 2025 rive oktòb 2026, jan yo depoze yo nan Divizyon Eleksyon Florid; pou Nixon, tou rapò FEC kanpay li pou Sena a. Nou chèche chak nimewo fòm nan bidjè final Lejislati a te vote a (SB 2500 pou 2025-26, HB 5001E pou 2026-27) ak nan lis veto gouvènè a pou ane sa a. Lis la gen tou vòt manm sa yo nan sesyon plenyè sou pwojè ki te tounen lwa an 2025 ak 2026 lè analiz anplwaye Lejislati a menm di pwojè a ede yon kalite biznis ki te ba yo lajan (konsesyonè machin, distribitè alkòl, devlopè lojman abòdab, konpayi transpò pa aplikasyon).',
};
writeFileSync(FILE, JSON.stringify(d, null, 1) + '\n');
console.log('Nixon: ' + N.requests.length + ' requests, ' + Object.keys(N.votes).length + ' floor votes');
