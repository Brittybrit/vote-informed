// Builds public/data/gaps.json: for each official or candidate, the records this site is missing and what is being done
// about each (the dossier's "Gaps in data and what we're doing about it" link).
// Inputs: public/data/prior/*.json (earlier offices), public/data/money-summary.json (current seat), public/data/city-reports.json
// (2026 city races), scripts/data/gaps/requests.json (public records requests, edited by hand), scripts/data/gaps/extra.json
// (optional hand-written gaps). Run after prior-offices.mjs and money-summary.mjs: node scripts/gaps.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
const root = new URL('../', import.meta.url), P = p => new URL(p, root);
const J = p => JSON.parse(readFileSync(P(p), 'utf8')), opt = p => existsSync(P(p)) ? J(p) : null;

const REQ = J('scripts/data/gaps/requests.json').requests;
const reqFor = (pid, body, kind) => REQ.find(q => (q.covers || []).includes(kind) && q.people.some(([p, b]) => p === pid && b === body)) || null;
const L3 = (en, es, ht) => ({ en, es, ht });

// place names for earlier-office bodies
const BODY = {
  'fl-house': L3('Florida House', 'Cámara de Florida', 'Chanm Reprezantan Florid'),
  'fl-senate': L3('Florida Senate', 'Senado de Florida', 'Sena Florid'),
  'us-house': L3('U.S. House', 'Cámara de EE. UU.', 'Chanm Reprezantan Etazini'),
  'mdc-commission': L3('Miami-Dade County Commission', 'Comisión del Condado Miami-Dade', 'Komisyon Konte Miami-Dade'),
  'mdc-mayor': L3('Miami-Dade County Mayor', 'Alcalde del Condado Miami-Dade', 'Majistra Konte Miami-Dade'),
  'mdcps-school-board': L3('Miami-Dade School Board', 'Junta Escolar de Miami-Dade', 'Konsèy Lekòl Miami-Dade'),
  'broward-commission': L3('Broward County Commission', 'Comisión del Condado Broward', 'Komisyon Konte Broward'),
  'cabinet': L3('Florida Cabinet', 'Gabinete de Florida', 'Kabinè Florid'),
};
const cityName = b => b.replace(/^city-/, '').split('-').map(w => w === 'of' ? w : w[0].toUpperCase() + w.slice(1)).join(' ').replace('Opa Locka', 'Opa-locka');
const placeOf = o => BODY[o.body] || (String(o.body).startsWith('city-') ? L3(cityName(o.body), cityName(o.body), cityName(o.body)) : L3(o.body, o.body, o.body));
const yr = d => String(d || '').slice(0, 4);
const span = o => yr(o.start) + '–' + (o.end ? yr(o.end) : (o.current ? '' : ''));
const officeLabel = o => { const pl = placeOf(o), s = ' (' + span(o).replace(/–$/, '–now') + ')'; return L3(pl.en + s, pl.es + s.replace('now', 'hoy'), pl.ht + s.replace('now', 'kounye a')); };

// what each kind of gap says (office label goes first as the heading)
const W = {
  donorsNotOnline: L3('Campaign reports for this seat are not online, so donors could not be checked against these votes.',
    'Los informes de campaña de este cargo no están en línea, así que los donantes no se pudieron comparar con estos votos.',
    'Rapò kanpay pou pòs sa a pa sou entènèt, kidonk nou pa t ka konpare donatè yo ak vòt sa yo.'),
  donorsNotCollected: L3('Campaign reports for this seat are not collected here yet, so donors are not yet checked against these votes.',
    'Los informes de campaña de este cargo aún no se han recopilado aquí, así que los donantes todavía no se comparan con estos votos.',
    'Nou poko ranmase rapò kanpay pou pòs sa a, kidonk nou poko konpare donatè yo ak vòt sa yo.'),
  missing: y => L3(`Campaign reports from ${y.en} are not online, so gifts from then are not counted.`,
    `Los informes de campaña de ${y.es} no están en línea, así que esas donaciones no se cuentan.`,
    `Rapò kanpay ${y.ht} yo pa sou entènèt, kidonk don lè sa a pa konte.`),
  actionsNotOnline: L3('Meeting minutes from these years are not online, so no votes from this seat are listed.',
    'Las actas de estos años no están en línea, así que no se lista ningún voto de este cargo.',
    'Pwosè vèbal ane sa yo pa sou entènèt, kidonk pa gen okenn vòt pou pòs sa a.'),
  actionsNotCollected: L3('Meeting minutes from these years are not read here yet, so no votes from this seat are listed yet.',
    'Las actas de estos años aún no se han leído aquí, así que todavía no se lista ningún voto de este cargo.',
    'Nou poko li pwosè vèbal ane sa yo, kidonk poko gen vòt pou pòs sa a.'),
  lawsPending: y => L3(`Florida laws passed in ${y} are still being read, so the list of laws is incomplete.`,
    `Las leyes de Florida aprobadas en ${y} aún se están leyendo, así que la lista de leyes está incompleta.`,
    `Nou poko fin li lwa Florid ki pase an ${y}, kidonk lis lwa yo pa konplè.`),
  reqUnread: n => L3(`${n} budget request forms are still being read.`, `Aún se están leyendo ${n} formularios de solicitudes de presupuesto.`, `Nou poko fin li ${n} fòm demann bidjè.`),
  gapCur: (y, why) => why === 'cantRead'
    ? L3(`Campaign reports from ${y} are posted as scans that cannot be read, so gifts from then are not counted.`,
      `Los informes de campaña de ${y} están publicados como imágenes que no se pueden leer, así que esas donaciones no se cuentan.`,
      `Rapò kanpay ${y} yo afiche kòm imaj ki pa ka li, kidonk don lè sa a pa konte.`)
    : L3(`Campaign reports from ${y} are not online, so gifts from then are not counted.`,
      `Los informes de campaña de ${y} no están en línea, así que esas donaciones no se cuentan.`,
      `Rapò kanpay ${y} yo pa sou entènèt, kidonk don lè sa a pa konte.`),
  nodata: L3('No itemized donor reports are posted for this seat, so donors could not be checked against these votes.',
    'No hay informes detallados de donantes publicados para este cargo, así que los donantes no se pudieron comparar con estos votos.',
    'Pa gen rapò donatè detaye ki afiche pou pòs sa a, kidonk nou pa t ka konpare donatè yo ak vòt sa yo.'),
};

const ZONING = L3('County Commission zoning hearings before July 2017 are not in the Clerk’s online minutes, so zoning items from those years are not listed.',
  'Las audiencias de zonificación de la Comisión del Condado anteriores a julio de 2017 no están en las actas en línea del Secretario, así que esos asuntos de zonificación no se listan.',
  'Odyans zonaj Komisyon Konte a anvan jiyè 2017 pa nan pwosè vèbal Grefye a sou entènèt, kidonk dosye zonaj ane sa yo pa nan lis la.');
const out = {};
const add = (pid, name, item) => { (out[pid] = out[pid] || { name, items: [] }).items.push(item); };
// status of a gap: a records request wins; else in progress (being collected) or not online (not expected before Nov 3)
const statusOf = (pid, body, kind, base) => {
  const q = reqFor(pid, body, kind);
  if (!q) return { status: base };
  const req = { n: q.n, office: q.office, sent: q.sent || null };
  // still being collected by machine: say so first, with the request alongside
  if (base === 'running' && !['received', 'denied'].includes(q.status)) return { status: 'running', req };
  return { status: q.status === 'received' ? 'received' : q.status === 'denied' ? 'denied' : q.sent ? 'requested' : 'requestReady', req };
};

// 1. earlier offices
const PD = 'public/data/prior/';
for (const f of readdirSync(P(PD)).filter(f => f.endsWith('.json') && f !== 'index.json')) {
  const d = J(PD + f), pid = d.pid;
  for (const o of d.offices || []) {
    const lab = officeLabel(o), it = (kind, text, base) => add(pid, d.name, { area: 'prior', kind, office: lab, text, ...statusOf(pid, o.body, kind, base) });
    if (o.donors === 'notOnline') it('donors', W.donorsNotOnline, 'unlikely');
    if (o.donors === 'notCollected') it('donors', W.donorsNotCollected, 'running');
    if (o.missing && o.donors !== 'notOnline') it('donors', W.missing(o.missing), 'unlikely');
    if (o.noActions === 'notOnline') it('actions', W.actionsNotOnline, 'unlikely');
    if (o.noActions === 'notCollected') it('actions', W.actionsNotCollected, 'running');
    // notes on missing meetings; County zoning results before July 2017 are being tried again in a browser
    if (o.body === 'mdc-mayor' && /Zoning hearings before July 2017/.test((o.actsNote || {}).en || '')) it('actions', ZONING, 'running');
    else if (o.actsNote && !o.noActions && !/does not vote/.test(o.actsNote.en || '')) it('actions', o.actsNote, /zoning hearings before July 2017/i.test(o.actsNote.en || '') ? 'running' : 'unlikely');
    const L = o.laws || {}, Q = o.requests || {};
    if (Array.isArray(L.pending) && L.pending.length) it('laws', W.lawsPending(L.pending.join(', ')), 'running');
    if (Q.unread) it('requests', W.reqUnread(Q.unread), 'running');
  }
}
// 2. current seat (money summary)
const MS = J('public/data/money-summary.json').people;
for (const [pid, p] of Object.entries(MS)) {
  const bn = p.bodyName || '', seat = typeof bn === 'object' ? bn : L3(bn, bn, bn);
  const it = (kind, text, base) => add(pid, p.name, { area: 'current', kind, office: seat, text, ...statusOf(pid, 'current', kind, base) });
  if (p.donorGap) { const [a, b] = p.donorGap.years; it('donors', W.gapCur(a === b ? String(a) : a + '–' + b, p.donorGap.why), p.donorGap.why === 'cantRead' ? 'unlikely' : 'unlikely'); }
  if (p.status === 'nodata') it('donors', W.nodata, 'unlikely');
}
// 3. 2026 city candidates whose city posts no reports
const CR = opt('public/data/city-reports.json');
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
for (const c of (CR && CR.cities) || []) for (const k of c.candidates || []) {
  if (!k.none) continue; const pid = slug(k.name);
  if (out[pid] && out[pid].items.some(x => x.area === 'current' && x.kind === 'donors')) continue;
  const tx = typeof k.none === 'string' ? L3(k.none, k.none, k.none) : k.none;
  add(pid, k.name, { area: 'race', kind: 'donors', office: L3(c.label || c.city, c.label || c.city, c.label || c.city), text: tx, status: 'unlikely' });
}
// 4. hand-written extras
for (const [pid, xs] of Object.entries((opt('scripts/data/gaps/extra.json') || {}).people || {})) for (const x of xs) add(pid, x.name || pid, x);

const people = Object.fromEntries(Object.entries(out).sort());
const byName = {}; for (const [pid, v] of Object.entries(people)) byName[slug(v.name)] = pid;
writeFileSync(P('public/data/gaps.json'), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), people, byName }) + '\n');
const n = Object.values(people).reduce((s, v) => s + v.items.length, 0);
console.log(`gaps: ${Object.keys(people).length} people, ${n} items`);
