// Action-first city lists. Each city's full list of actions (scripts/data/city/<slug>/actions.json: every
// action since Jan 1, 2025 that benefits a named private party, with its roll call, built from the body's
// own records) becomes that body's actions in public/data/decisions.json. Actions already there (with
// their hand-checked gifts and lobbyists) are kept and matched by id; new ones get gifts by party match:
// a donor to an on-ballot member whose name is the party's name (company suffixes ignored).
// Firm and lobbyist gifts are added afterwards by scripts/city-firm-gifts.mjs.
// Run: node scripts/city-actions.mjs && node scripts/city-firm-gifts.mjs && node scripts/money-summary.mjs
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const P = p => new URL(p, root);
const J = p => JSON.parse(readFileSync(P(p)));
const FILE = 'public/data/decisions.json';
const d = J(FILE);

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/&/g, ' AND ').replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const SUFFIX = new Set(['INC', 'LLC', 'LLLP', 'LP', 'LTD', 'CORP', 'CORPORATION', 'CO', 'COMPANY', 'PA', 'PLLC', 'LLP', 'THE', 'OF', 'AND', 'A', 'P', 'L', 'C', 'INCORPORATED']);
const GENERIC = new Set(['MIAMI', 'FLORIDA', 'DORAL', 'GROUP', 'SERVICES', 'HOLDINGS', 'DEVELOPMENT', 'PROPERTIES', 'ASSOCIATES', 'PARTNERS', 'MANAGEMENT', 'CONSTRUCTION', 'FOUNDATION', 'CITY', 'COUNTY', 'INTERNATIONAL', 'USA', 'AMERICA', 'SOUTH', 'NORTH', 'NATIONAL', 'CENTER', 'INVESTMENTS', 'ENTERPRISES']);
// The words of a party's name that identify it. Too short or too generic to match on its own: no key.
function pkey(name) {
  const w = norm(String(name).replace(/\(.*?\)/g, ' ').replace(/\bd\/?b\/?a\b.*$/i, ' ')).split(' ').filter(x => x && !SUFFIX.has(x));
  if (!w.length) return '';
  if (w.length === 1 && (w[0].length < 5 || GENERIC.has(w[0]))) return '';
  if (w.every(x => GENERIC.has(x))) return '';
  return w.join(' ');
}
const dkey = n => norm(n).split(' ').filter(x => x && !SUFFIX.has(x)).join(' ');
const csv = s => { const out = []; let f = '', q = false, row = []; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === '"' && s[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; } else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); out.push(row); row = []; f = ''; } else if (c !== '\r') f += c; } if (f || row.length) { row.push(f); out.push(row); } return out; };

// Donors for each on-ballot member: VoterFocus exports in scripts/data/city/<slug>/<acct>.csv, else the
// hand-typed reports in public/data/city-reports.json (no occupation there).
function donorsFor(slug, B) {
  const out = [];
  const dir = `scripts/data/city/${slug}/`;
  const files = existsSync(P(dir)) ? readdirSync(P(dir)) : [];
  for (const [key, ob] of Object.entries(B.onBallot)) for (const acct of ob.accounts) {
    // one export per account (<acct>.csv), or one per report (<acct>_g2.csv, <acct>_g3.csv ...)
    for (const f of files.filter(n => n === acct + '.csv' || (n.startsWith(acct + '_') && n.endsWith('.csv'))).map(n => dir + n)) {
      const [h, ...rows] = csv(readFileSync(P(f), 'utf8'));
      const ix = n => h.indexOf(n);
      for (const r of rows) {
        if (r[ix('Cont/Exp')] !== 'C' || r[ix('Amend. code')] === 'D') continue;
        const amt = Number(r[ix('amount')]); if (!(amt > 0)) continue;
        out.push({ to: key, acct, donor: r[ix('name')].replace(/\s+/g, ' ').trim(), amount: amt, date: r[ix('item date')], addr: r[ix('address 1')], occ: r[ix('occupation')] || '' });
      }
    }
  }
  // No export: the hand-typed treasurer's reports (rows [date, name, type, amount, note]; 'S' is the
  // candidate's own money and a note marks a loan or refund)
  const reports = J('public/data/city-reports.json').cities.find(c => c.city === CITY[slug]);
  for (const [key, ob] of Object.entries(B.onBallot)) {
    if (out.some(g => g.to === key) || !reports) continue;
    const m = B.members.find(x => x.key === key);
    const c = reports.candidates.find(x => x.name === (BALLOT[key] || m.name));
    for (const r of (c && c.reports) || []) for (const x of r.rows) if (x[2] !== 'S' && !x[4] && x[3] > 0)
      out.push({ to: key, acct: ob.accounts[0], donor: String(x[1]).replace(/\s+/g, ' ').trim(), amount: x[3], date: x[0], addr: '', occ: '' });
  }
  return out;
}
const CITY = { aventura: 'Aventura', nmb: 'North Miami Beach', northmiami: 'North Miami', sunnyisles: 'Sunny Isles Beach', southmiami: 'South Miami', pinecrest: 'Pinecrest', medley: 'Medley' };

const MAP = { coralgables: 'coralgables', doral: 'doral', aventura: 'aventura', nmb: 'nmb', northmiami: 'northmiami', hialeah: 'hialeah', southmiami: 'southmiami', pinecrest: 'pinecrest', medley: 'medley', cutlerbay: 'cutlerbay', opalocka: 'opalocka', keybiscayne: 'keybiscayne', sunnyisles: 'sunnyisles' };
// Who held a seat on a date (public/data/roster.json), for actions whose minutes give no vote
const RO = J('public/data/roster.json');
const OFF = new Map(RO.offices.map(o => [o.id, o]));
const dayOk = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : null;
function covers(t, date) {
  const s = dayOk(t.start), e = dayOk(t.end);
  if (s && date < s) return false;
  if (e && date > e) return false;
  if (!s && t.startKnown === false && t.servingFrom && date < t.servingFrom) return false;
  if (!e && t.endKnown === false && t.lastSeen && date > t.lastSeen) return false;
  if (!e && dayOk(t.endBy) && date > t.endBy) return false;
  return true;
}
const seatedOn = (B, person, date) => RO.terms.some(t => t.person === person && (OFF.get(t.office) || {}).body === B.rosterBody && covers(t, date));
// The list's opening line, from the list itself, in all three languages
const MON = { en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], ht: ['janvye', 'fevriye', 'mas', 'avril', 'me', 'jen', 'jiyè', 'out', 'septanm', 'oktòb', 'novanm', 'desanm'] };
const fmt = (d, l) => { const [y, m, dd] = d.split('-').map(Number); return l === 'en' ? `${MON.en[m - 1]} ${dd}, ${y}` : l === 'es' ? `${dd} de ${MON.es[m - 1]} de ${y}` : `${dd} ${MON.ht[m - 1]} ${y}`; };
function coverage(B, from, to, n, extra) {
  const nm = B.name;
  const c = {
    en: `This list starts from the actions, not the donors: every action the ${nm.en} took from ${fmt(from, 'en')} to ${fmt(to, 'en')} that benefits a named company, developer, group or person (contracts and purchases, zoning and land use, leases, grants, settlements and permits), read from the records of ${n} meetings. Votes come from the minutes and signed resolutions. Each action's parties, and any lobbyist named for it, were then checked against the donors of members on the ballot.`,
    es: `Esta lista parte de los actos, no de los donantes: cada acto ${/^(Concejo|Consejo)/.test(nm.es) ? 'del ' + nm.es : /^(Comisión|Junta)/.test(nm.es) ? 'de la ' + nm.es : 'de ' + nm.es} entre el ${fmt(from, 'es')} y el ${fmt(to, 'es')} que beneficia a una empresa, desarrollador, grupo o persona con nombre (contratos y compras, zonificación y uso del suelo, arrendamientos, subvenciones, acuerdos y permisos), según los registros de ${n} reuniones. Los votos vienen de las actas y las resoluciones firmadas. Luego se compararon las partes de cada acto, y cualquier cabildero nombrado para él, con los donantes de los miembros en la boleta.`,
    ht: `Lis sa a kòmanse ak aksyon yo, pa ak donatè yo: chak aksyon ${nm.ht} te pran ant ${fmt(from, 'ht')} ak ${fmt(to, 'ht')} ki benefisye yon konpayi, pwomotè, gwoup oswa moun ki gen non (kontra ak acha, zonaj ak itilizasyon tè, lokasyon, sibvansyon, akò ak pèmi), selon dosye ${n} reyinyon. Vòt yo soti nan pwosè-vèbal yo ak rezolisyon ki siyen yo. Apre sa, nou konpare pati chak aksyon, ak nenpòt lobiyis yo nonmen pou li, ak donatè manm ki sou bilten an.`,
  };
  if (extra) for (const l of ['en', 'es', 'ht']) c[l] += ' ' + extra[l];
  return c;
}
// The page's words for each kind of action
// Votes as the page shows them (null on the page means not yet seated; a vote the minutes do not give is 'unknown')
const VOTE = { yes: 'yes', no: 'no', absent: 'absent', excused: 'excused', abstain: 'abstain', recused: 'recused', unknown: 'unknown' };
const vote = r => Object.fromEntries(Object.entries(r || {}).map(([k, v]) => [k, v in VOTE ? VOTE[v] : v]));
// Results as the page's labels name them
const RES = { 'first reading': 'firstReading', 'second reading': 'adopted' };
// Gifts on an old card that bundled several actions: the item's lobbyist and the people listed for it go on
// every action; a gift from a party (or a person whose occupation names it) only on actions naming that party.
function split(old, a) {
  const keys = a.parties.map(pkey).filter(Boolean);
  const hit = g => { const w = new Set(norm(g.donor + ' ' + (g.occ || '')).split(' ')); return keys.some(k => { const f = k.split(' ')[0]; return f.length >= 3 && !GENERIC.has(f) && w.has(f); }); };
  return old.gifts.filter(g => !['party', 'class'].includes(g.kind) || hit(g));
}
const KIND = { contract: 'award', grant: 'funding', license: 'permit', sale: 'land', agreement: 'agreement', easement: 'easement', settlement: 'settlement', zoning: 'zoning', lease: 'lease' };
// Members who voted in the window but have left the body (roster ids in public/data/roster.json)
const FORMER = { hialeah: [['Junco', 'Juan Junco', 'juan-junco'], ['Tundidor', 'Jesus Tundidor', 'jesus-tundidor'], ['Garcia-Roves', 'Jacqueline Garcia-Roves', 'jacqueline-garcia-roves']] };
let TR = {}, BALLOT = {};
let report = [];
// Only the cities named on the command line are merged, so a list still being built is never published.
const ONLY = process.argv.slice(2);
if (!ONLY.length) { console.log('usage: node scripts/city-actions.mjs <slug> [...]   e.g. doral'); process.exit(1); }
for (const [slug, key] of Object.entries(MAP).filter(([s]) => ONLY.includes(s))) {
  const f = `scripts/data/city/${slug}/actions.json`;
  if (!existsSync(P(f))) continue;
  const U = J(f);
  // scripts/data/city/<slug>/body.json: the body's name and full membership, and for a body not yet on the
  // page, who is on the ballot and their accounts. Those people leave the "no list yet" section.
  const BJ = existsSync(P(`scripts/data/city/${slug}/body.json`)) ? J(`scripts/data/city/${slug}/body.json`) : {};
  BALLOT = BJ.ballotNames || {};
  let B = d.bodies.find(b => b.key === key);
  if (!B && BJ.name && BJ.onBallot) {
    B = { key, name: BJ.name, since: '2025-01-01', members: [], onBallot: {}, accounts: {}, registries: BJ.registries || [], coverage: {}, rosterBody: BJ.rosterBody, actions: [] };
    const at = d.bodies.findIndex(b => b.key === 'flhouse');
    d.bodies.splice(at < 0 ? d.bodies.length : at, 0, B);
  }
  if (B) {
    for (const m of BJ.members || []) { const x = B.members.find(y => y.key === m.key); if (!x) B.members.push(m); else if (!x.person) x.person = m.person; }
    for (const [k, v] of Object.entries(BJ.onBallot || {})) if (!B.onBallot[k]) B.onBallot[k] = v;
    for (const [k, v] of Object.entries(BJ.accounts || {})) if (!B.accounts[k]) B.accounts[k] = v;
    const names = new Set(Object.values(BJ.ballotNames || {}));
    for (const o of d.others || []) o.people = o.people.filter(p => !names.has(p.name));
    d.others = (d.others || []).filter(o => o.people.length);
  }
  // Spanish and Kreyol titles, keyed by action id (scripts/data/city/<slug>/translations.json)
  TR = existsSync(P(`scripts/data/city/${slug}/translations.json`)) ? J(`scripts/data/city/${slug}/translations.json`) : {};
  // Notes shown on a card (a contradiction in the minutes, say), in all three languages, keyed by action id
  const NOTES = existsSync(P(`scripts/data/city/${slug}/card-notes.json`)) ? J(`scripts/data/city/${slug}/card-notes.json`) : {};
  if (!B) { report.push(slug + ': no body in decisions.json'); continue; }
  for (const [k, name, person] of FORMER[slug] || []) if (!B.members.some(m => m.key === k)) B.members.push({ key: k, name, person, former: true });
  const prior = new Map(B.actions.map(a => [a.id, a]));
  // How many new actions each old card stands for (one card sometimes covered several resolutions)
  const nLegacy = {}; for (const u of U.actions) if (u.legacyId) nLegacy[u.legacyId] = (nLegacy[u.legacyId] || 0) + 1;
  const donors = donorsFor(slug, B);
  const used = new Set();
  // Ids must be unique across every body: prefix bare file numbers with the city's prefix
  const PFX = { coralgables: 'cg-' }[slug] || slug + '-';
  for (const u of U.actions) if (!String(u.id).startsWith(PFX) && !String(u.id).startsWith(slug)) { u.bareId = u.id; u.id = PFX + u.id; }
  // An action that names no private party cannot be checked against donors: left out of the list and counted
  const unnamed = U.actions.filter(u => !(u.parties || []).length).length;
  U.actions = U.actions.filter(u => (u.parties || []).length);
  const actions = U.actions.map(u => {
    // No vote in the record (an agenda-only meeting): every member seated that day, vote not given
    if (!u.roll || !Object.values(u.roll).some(v => v)) { u.roll = {}; for (const m of B.members) if (m.person && seatedOn(B, m.person, u.date)) u.roll[m.key] = 'unknown'; u.tally = null; }
    u.roll = vote(u.roll); u.result = RES[u.result] || u.result;
    // the page's tally is [yes, no]; absences and abstentions are in the roll
    if (typeof u.tally === 'string') { const m = u.tally.match(/^(\d+)-(\d+)/); u.tally = m ? [+m[1], +m[2]] : null; }
    if (Array.isArray(u.tally)) u.tally = u.tally.slice(0, 2);
    // no tally printed but every vote known: count it from the roll
    const vs = Object.values(u.roll || {});
    if (!u.tally && vs.length && vs.every(v => v != null && v !== 'unknown')) u.tally = [vs.filter(v => v === 'yes').length, vs.filter(v => v === 'no').length];
    const leg = u.legacyId && prior.get(u.legacyId);
    const old = prior.get(u.id) || (u.prevId && prior.get(u.prevId)) || (leg && nLegacy[u.legacyId] === 1 ? leg : null);
    if (old) { used.add(old.id); if (!old.roll || !Object.keys(old.roll).length) { old.roll = u.roll; old.tally = u.tally; } old.universe = true; return old; }
    const a = {
      id: u.id, date: u.date, ref: u.ref || '', kind: KIND[u.kind] || u.kind, subject: { en: u.title, ...(TR[u.bareId || u.id] || TR[u.id] || {}) }, parties: u.parties || [],
      result: u.result || 'adopted', tally: u.tally || null, roll: u.roll || {}, rollComplete: !!u.roll && Object.keys(u.roll).length > 0 && Object.values(u.roll).every(v => v != null && v !== 'unknown'),
      ...(u.consent != null ? { consent: u.consent } : {}), mover: u.mover || '', second: u.second || '', lobbied: [], namedLobbyist: '', gifts: [],
      ...(u.amount ? { amount: u.amount } : {}), links: u.url ? [{ t: 'minutes', url: u.url }] : [], universe: true
    };
    // party gifts: a donor whose name is one of the parties (to members who voted on it)
    const keys = a.parties.map(pkey).filter(Boolean);
    for (const g of donors) {
      if (!(g.to in a.roll) || a.roll[g.to] == null) continue;
      const dk = dkey(g.donor);
      if (keys.some(k => dk === k || (k.split(' ').length >= 2 && dk.startsWith(k + ' ')))) a.gifts.push({ ...g, kind: 'party' });
    }
    if (leg && !old) {
      used.add(leg.id);
      a.gifts.push(...split(leg, a).filter(g => !a.gifts.some(x => x.donor === g.donor && x.date === g.date && x.amount === g.amount)));
      a.lobbied = leg.lobbied || []; a.namedLobbyist = leg.namedLobbyist || '';
      // the old note describes all of its gifts: only where every one of them landed
      if (leg.note && leg.gifts.length && leg.gifts.every(g => a.gifts.some(x => x.donor === g.donor && x.date === g.date && x.amount === g.amount))) a.note = leg.note;
      if (leg.giftNotes) a.giftNotes = leg.giftNotes;
    }
    const cn = NOTES[u.bareId || u.id] || NOTES[u.id];
    if (cn) a.note = a.note ? { en: cn.en + ' ' + a.note.en, es: cn.es + ' ' + a.note.es, ht: cn.ht + ' ' + a.note.ht } : cn;
    return a;
  });
  // Prior actions not found in the full list (outside its window, or not an action on a named party) stay, flagged.
  for (const [id, a] of prior) if (!used.has(id)) { a.universe = false; actions.push(a); }
  actions.sort((p, q) => q.date.localeCompare(p.date) || String(p.id).localeCompare(String(q.id)));
  B.actions = actions;
  const win = Array.isArray(U.window) ? { from: U.window[0], to: U.window[1] } : (U.window || {});
  const dates = U.actions.map(a => a.date).sort();
  const from = win.from || dates[0], to = (U.meetings || []).map(m => m.date).filter(x => x <= (win.to || '9999')).sort().pop() || dates[dates.length - 1];
  B.universe = { built: 'actions', from, to, meetings: (U.meetings || []).length, file: f, gaps: U.gaps || [] };
  B.universe.unnamed = unnamed;
  B.coverage = coverage(B, from, to, (U.meetings || []).length, BJ.coverageNote);
  if (unnamed) {
    B.coverage.en += ` ${unnamed} more action${unnamed === 1 ? '' : 's'} benefit${unnamed === 1 ? 's' : ''} a party the record does not name, so ${unnamed === 1 ? 'it is' : 'they are'} not listed or counted.`;
    B.coverage.es += ` Otro${unnamed === 1 ? '' : 's'} ${unnamed} acto${unnamed === 1 ? '' : 's'} beneficia${unnamed === 1 ? '' : 'n'} a una parte que el registro no nombra, así que no se muestra${unnamed === 1 ? '' : 'n'} ni se cuenta${unnamed === 1 ? '' : 'n'}.`;
    B.coverage.ht += ` ${unnamed} lòt aksyon benefisye yon pati dosye a pa nonmen, kidonk nou pa montre yo ni konte yo.`;
  }
  report.push(`${slug}: ${U.actions.length} actions (${used.size} kept from before, ${U.actions.length - used.size} new, ${[...prior.keys()].filter(k => !used.has(k)).length} prior not in list); party gifts on new: ${actions.filter(a => a.universe && !prior.has(a.id)).reduce((n, a) => n + a.gifts.length, 0)}`);
}
writeFileSync(P(FILE), JSON.stringify(d, null, 1) + '\n');
console.log(report.join('\n'));
