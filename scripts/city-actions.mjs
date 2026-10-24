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
  return out;
}

const MAP = { coralgables: 'coralgables', doral: 'doral', aventura: 'aventura', nmb: 'nmb', northmiami: 'northmiami', hialeah: 'hialeah', southmiami: 'southmiami', pinecrest: 'pinecrest', medley: 'medley' };
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
let TR = {};
let report = [];
// Only the cities named on the command line are merged, so a list still being built is never published.
const ONLY = process.argv.slice(2);
if (!ONLY.length) { console.log('usage: node scripts/city-actions.mjs <slug> [...]   e.g. doral'); process.exit(1); }
for (const [slug, key] of Object.entries(MAP).filter(([s]) => ONLY.includes(s))) {
  const f = `scripts/data/city/${slug}/actions.json`;
  if (!existsSync(P(f))) continue;
  const U = J(f), B = d.bodies.find(b => b.key === key);
  // Spanish and Kreyol titles, keyed by action id (scripts/data/city/<slug>/translations.json)
  TR = existsSync(P(`scripts/data/city/${slug}/translations.json`)) ? J(`scripts/data/city/${slug}/translations.json`) : {};
  // Notes shown on a card (a contradiction in the minutes, say), in all three languages, keyed by action id
  const NOTES = existsSync(P(`scripts/data/city/${slug}/card-notes.json`)) ? J(`scripts/data/city/${slug}/card-notes.json`) : {};
  if (!B) { report.push(slug + ': no body in decisions.json'); continue; }
  const prior = new Map(B.actions.map(a => [a.id, a]));
  // How many new actions each old card stands for (one card sometimes covered several resolutions)
  const nLegacy = {}; for (const u of U.actions) if (u.legacyId) nLegacy[u.legacyId] = (nLegacy[u.legacyId] || 0) + 1;
  const donors = donorsFor(slug, B);
  const used = new Set();
  // Ids must be unique across every body: prefix bare file numbers with the city's prefix
  const PFX = { coralgables: 'cg-' }[slug] || slug + '-';
  for (const u of U.actions) if (!String(u.id).startsWith(PFX) && !String(u.id).startsWith(slug)) { u.bareId = u.id; u.id = PFX + u.id; }
  const actions = U.actions.map(u => {
    u.roll = vote(u.roll); u.result = RES[u.result] || u.result;
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
  B.universe = { built: 'actions', from: U.window && U.window.from, to: U.window && U.window.to, meetings: (U.meetings || []).length, file: f, gaps: U.gaps || [] };
  report.push(`${slug}: ${U.actions.length} actions (${used.size} kept from before, ${U.actions.length - used.size} new, ${[...prior.keys()].filter(k => !used.has(k)).length} prior not in list); party gifts on new: ${actions.filter(a => a.universe && !prior.has(a.id)).reduce((n, a) => n + a.gifts.length, 0)}`);
}
writeFileSync(P(FILE), JSON.stringify(d, null, 1) + '\n');
console.log(report.join('\n'));
