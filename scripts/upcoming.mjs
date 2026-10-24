// Merges scripts/data/upcoming/*.json (one file per posted meeting) into public/data/upcoming.json,
// matching each item's named parties against the ledger (decisions.json: prior actions, lobbyist
// registrations on those actions, gifts) and the county and school board lobbyist registries, and
// tagging each item. Nothing is inferred: a match is a normalized name equality or a registered
// client name, and every match says which it was. Re-runnable.
//   node scripts/upcoming.mjs
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const srcDir = path.join(here, 'data', 'upcoming');
const pub = p => JSON.parse(fs.readFileSync(path.join(here, '..', 'public', 'data', p), 'utf8'));
const decisions = pub('decisions.json');
const cycles = pub('cycles.json');
const countyLobby = pub('county-lobbyists.json');
const schoolLobby = pub('school-board-lobbyists.json');
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = new Set(['award', 'contract', 'zoning', 'landuse', 'plat', 'lease', 'land', 'fee', 'rate', 'millage', 'budget', 'ordinance', 'resolution', 'appointment', 'other']);
const TOPICS = new Set(['housing', 'transit', 'parks', 'schools', 'water', 'police', 'fire', 'libraries', 'seniors', 'daycare', 'nightlife', 'parking', 'towing', 'noise', 'boating', 'pets', 'cycling', 'business', 'other']);

// Name normalization for matching: lower case, no punctuation, no organization suffixes.
const SUFFIX = /\b(inc|incorporated|llc|l l c|lllp|llp|lp|ltd|corp|corporation|co|company|the|of|florida|fl|pa|p a|pllc|dba|d b a)\b/g;
export function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(SUFFIX, ' ').replace(/\s+/g, ' ').trim();
}
function sameName(a, b) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  if (x === y) return 'exact';
  if (x.length >= 10 && y.length >= 10 && (x.startsWith(y) || y.startsWith(x))) return 'prefix';
  return false;
}

// Index the ledger by body.
const bodyByRoster = new Map(decisions.bodies.map(b => [b.rosterBody, b]));
const cycleByKey = new Map(cycles.bodies.map(c => [c.key, c]));

function ledgerMatches(rosterBody, party) {
  const b = bodyByRoster.get(rosterBody);
  const out = { priorActions: [], lobbyists: [], ties: [] };
  if (!b) return out;
  const members = new Map((b.members || []).map(m => [m.key, m]));
  for (const a of b.actions || []) {
    const hit = (a.parties || []).map(p => sameName(p, party)).find(Boolean);
    const lobHit = (a.lobbied || []).filter(l => sameName(l.for, party) || sameName(l.principal, party));
    if (!hit && !lobHit.length) continue;
    out.priorActions.push({ id: a.id, date: a.date, ref: a.ref || null, subject: text(a.subject), result: a.result || null, tally: a.tally || null, roll: a.roll || null, basis: hit || 'lobbyist registration' });
    for (const l of lobHit) if (!out.lobbyists.some(x => x.name === l.name)) out.lobbyists.push({ name: l.name, for: l.for || l.principal, registered: l.reg || null, basis: 'registered on a prior item naming this party' });
    for (const g of a.gifts || []) {
      const m = members.get(g.to);
      const giverIsParty = sameName(g.donor, party) || (g.forParty && sameName(g.forParty, party));
      if (!giverIsParty) continue;
      if (out.ties.some(t => t.donor === g.donor && t.date === g.date && t.to === g.to && t.amount === g.amount)) continue;
      out.ties.push({ to: g.to, person: m && m.person ? m.person : null, acct: g.acct, donor: g.donor, amount: g.amount, date: g.date, match: g.kind, basis: g.basis || null, lobbyist: g.lobbyist || null, fromAction: a.id });
    }
  }
  return out;
}

function registryMatches(rosterBody, party) {
  const reg = rosterBody === 'mdc-commission' ? countyLobby : rosterBody === 'mdcps-board' ? schoolLobby : null;
  if (!reg) return [];
  const out = [];
  for (const l of reg.lobbyists || []) {
    for (const c of l.clients || []) {
      const name = Array.isArray(c) ? c[0] : (c && c.name) || c;
      const date = Array.isArray(c) ? c[1] : (c && c.date) || null;
      const how = sameName(name, party);
      if (how) out.push({ name: l.name, for: name, registered: date, basis: 'registry: ' + how + ' name match', source: reg.source && reg.source.url || null });
    }
  }
  return out;
}

const problems = [];
const meetings = [];
for (const f of fs.readdirSync(srcDir).filter(f => f.endsWith('.json')).sort()) {
  let m;
  try { m = JSON.parse(fs.readFileSync(path.join(srcDir, f), 'utf8')); } catch (e) { problems.push(f + ': not valid JSON: ' + e.message); continue; }
  if (!m.body || !m.rosterBody || !m.meeting || !DATE.test(String(m.meeting.date || ''))) { problems.push(f + ': missing body, rosterBody or meeting.date'); continue; }
  if (!m.meeting.agendaUrl) { problems.push(f + ': meeting has no agendaUrl'); }
  const cycle = cycleByKey.get(m.body) || null;
  // Plain-language subjects written from the full printed agenda (subjects/<same file>): {id: [subject, amount]}
  const subF = path.join(srcDir, 'subjects', f);
  const SUB = fs.existsSync(subF) ? JSON.parse(fs.readFileSync(subF, 'utf8')) : {};
  for (const id of Object.keys(SUB)) if (id[0] !== '_' && !(m.items || []).some(it => it.id === id)) problems.push(f + ': subject for unknown item ' + id);
  const items = [];
  for (const it of m.items || []) {
    if (!it.id || !it.title) { problems.push(f + ': item without id or title dropped'); continue; }
    if (!(it.links || []).some(l => l.url)) { problems.push(f + ': item ' + it.id + ' has no link'); }
    const kind = KINDS.has(it.kind) ? it.kind : 'other';
    const topics = (it.topics || []).filter(t => TOPICS.has(t));
    const parties = (it.parties || []).map(String).filter(Boolean);
    const matches = { priorActions: [], lobbyists: [], ties: [] };
    for (const p of parties) {
      const lm = ledgerMatches(m.rosterBody, p);
      for (const x of lm.priorActions) if (!matches.priorActions.some(y => y.id === x.id)) matches.priorActions.push({ ...x, party: p });
      for (const x of lm.lobbyists) if (!matches.lobbyists.some(y => y.name === x.name && y.for === x.for)) matches.lobbyists.push({ ...x, party: p });
      for (const x of lm.ties) if (!matches.ties.some(y => y.donor === x.donor && y.date === x.date && y.to === x.to)) matches.ties.push({ ...x, party: p, daysBeforeMeeting: days(m.meeting.date, x.date) });
      for (const x of registryMatches(m.rosterBody, p)) if (!matches.lobbyists.some(y => y.name === x.name && y.for === x.for)) matches.lobbyists.push({ ...x, party: p });
    }
    for (const l of it.lobbyists || []) if (l && l.name && !matches.lobbyists.some(y => y.name === l.name)) matches.lobbyists.push({ name: l.name, for: l.for || null, registered: null, basis: 'named on this agenda item', party: l.for || null });
    const tags = {
      wallet: ['fee', 'rate', 'millage', 'budget'].includes(kind) || (it.fiscal && /\$\s?[\d,]+/.test(it.fiscal) && /(per|each|household|resident|owner|customer|monthly|annual)/i.test(it.fiscal)),
      place: !!(it.location && (it.location.address || it.location.district != null)),
      industry: it.industry || null,
      topics,
      hearing: !!it.publicHearing,
      money: matches.ties.length > 0,
      lobbied: matches.lobbyists.length > 0,
      history: matches.priorActions.length > 0
    };
    const sub = SUB[it.id];
    if (sub) { it.subject = sub[0]; if (sub[1] != null && it.amount == null) it.amount = sub[1]; }
    items.push({ ...it, kind, topics, parties, matches, tags });
  }
  const comment = cycle ? cycle.levers.filter(l => /comment/.test(l.key)).map(l => ({ key: l.key, rules: l.rules, deadline: l.deadline, url: l.url, source: l.source })) : [];
  meetings.push({ body: m.body, rosterBody: m.rosterBody, bodyName: cycle ? cycle.name : m.body, meeting: m.meeting, checked: m.checked || null, comment, items, notes: m.notes || null });
}
meetings.sort((a, b) => a.meeting.date.localeCompare(b.meeting.date) || a.body.localeCompare(b.body));

// Procurement register: solicitations, capital plan, expiring contracts, levers, per body.
const procDir = path.join(here, 'data', 'procurement');
const procurement = [];
if (fs.existsSync(procDir)) for (const f of fs.readdirSync(procDir).filter(f => f.endsWith('.json')).sort()) {
  let pr;
  try { pr = JSON.parse(fs.readFileSync(path.join(procDir, f), 'utf8')); } catch (e) { problems.push(f + ': not valid JSON: ' + e.message); continue; }
  if (!pr.body || !pr.rosterBody) { problems.push(f + ': missing body or rosterBody'); continue; }
  const keep = (rows, what, need) => (rows || []).filter(r => { const ok = need.every(k => r[k] != null && r[k] !== '') && r.source; if (!ok) problems.push(f + ': ' + what + ' row dropped (needs ' + need.join(', ') + ' and source): ' + JSON.stringify(r).slice(0, 80)); return ok; });
  const sol = keep(pr.solicitations, 'solicitation', ['id', 'title', 'url']).map(r => {
    const m = { priorActions: [], lobbyists: [], ties: [] };
    return { ...r, matches: m, horizon: 'open' };
  });
  const cap = keep(pr.capitalPlan, 'capital', ['project']).map(r => ({ ...r, total: r.total == null ? Object.values(r.amounts || {}).reduce((n, v) => n + (Number(v) || 0), 0) || null : r.total, horizon: 'plan' }));
  const exp = (pr.expiring || []).filter(r => { const ok = (r.vendor || r.contract) && r.expires && r.source; if (!ok) problems.push(f + ': expiring row dropped (needs contract or vendor, expires and source): ' + JSON.stringify(r).slice(0, 80)); return ok; }).map(r => {
    const lm = r.vendor ? ledgerMatches(pr.rosterBody, r.vendor) : { priorActions: [], lobbyists: [], ties: [] };
    const reg = r.vendor ? registryMatches(pr.rosterBody, r.vendor) : [];
    return { ...r, matches: { priorActions: lm.priorActions, lobbyists: [...lm.lobbyists, ...reg.filter(x => !lm.lobbyists.some(y => y.name === x.name))], ties: lm.ties }, horizon: 'expiring' };
  });
  const levers = (pr.levers || []).filter(l => { if (!l.key || !l.source) { problems.push(f + ': lever without key or source dropped'); return false; } return true; });
  procurement.push({ body: pr.body, rosterBody: pr.rosterBody, checked: pr.checked || null, links: pr.links || {}, solicitations: sol.sort((a, b) => String(a.due || '').localeCompare(String(b.due || ''))), capitalPlan: cap.sort((a, b) => (b.total || 0) - (a.total || 0)), expiring: exp.sort((a, b) => a.expires.localeCompare(b.expires)), levers, notes: pr.notes || null });
}

// Who gets paid: staffing and vendor payments per body.
const payDir = path.join(here, 'data', 'payments');
const payments = [];
if (fs.existsSync(payDir)) for (const f of fs.readdirSync(payDir).filter(f => f.endsWith('.json')).sort()) {
  let py;
  try { py = JSON.parse(fs.readFileSync(path.join(payDir, f), 'utf8')); } catch (e) { problems.push(f + ': not valid JSON: ' + e.message); continue; }
  if (!py.body || !py.rosterBody) { problems.push(f + ': missing body or rosterBody'); continue; }
  const vendors = py.vendors || { period: null, total: null, top: [], source: null };
  vendors.top = (vendors.top || []).filter(v => { const ok = v.vendor && v.amount != null && v.source; if (!ok) problems.push(f + ': vendor row dropped: ' + JSON.stringify(v).slice(0, 80)); return ok; }).map(v => {
    const lm = ledgerMatches(py.rosterBody, v.vendor);
    const reg = registryMatches(py.rosterBody, v.vendor);
    return { ...v, matches: { priorActions: lm.priorActions, lobbyists: [...lm.lobbyists, ...reg.filter(x => !lm.lobbyists.some(y => y.name === x.name))], ties: lm.ties } };
  });
  const staffing = py.staffing || null;
  if (staffing) staffing.byDepartment = (staffing.byDepartment || []).filter(d => { const ok = d.department && d.source; if (!ok) problems.push(f + ': department row dropped: ' + JSON.stringify(d).slice(0, 80)); return ok; });
  payments.push({ body: py.body, rosterBody: py.rosterBody, checked: py.checked || null, datasets: (py.datasets || []).filter(d => d.url), staffing, vendors, unionContracts: (py.unionContracts || []).filter(u => u.union && u.source), levers: (py.levers || []).filter(l => l.key && l.source), notes: py.notes || null });
}

const result = {
  updated: new Date().toISOString().slice(0, 10),
  note: 'Posted agendas read from each body\'s own system. Parties are names printed on the item. Matches are name matches against the ledger (prior actions, lobbyist registrations, gifts) and the county and school board registries; each says its basis. A gift tied to a party is a fact from the filings, not a claim about the vote. Source files: scripts/data/upcoming/. Rebuild: node scripts/upcoming.mjs.',
  meetings,
  procurement,
  payments
};
fs.writeFileSync(path.join(here, '..', 'public', 'data', 'upcoming.json'), JSON.stringify(result, null, 1) + '\n');
const nItems = meetings.reduce((n, m) => n + m.items.length, 0);
const nMoney = meetings.reduce((n, m) => n + m.items.filter(i => i.tags.money).length, 0);
const nLob = meetings.reduce((n, m) => n + m.items.filter(i => i.tags.lobbied).length, 0);
console.log('wrote public/data/upcoming.json', meetings.length, 'meetings,', nItems, 'items,', nMoney, 'with gifts tied,', nLob, 'with lobbyists;', procurement.length, 'procurement bodies,', procurement.reduce((n, p) => n + p.solicitations.length, 0), 'solicitations,', procurement.reduce((n, p) => n + p.capitalPlan.length, 0), 'capital rows,', procurement.reduce((n, p) => n + p.expiring.length, 0), 'expiring;', payments.length, 'payment bodies,', payments.reduce((n, p) => n + p.vendors.top.length, 0), 'top vendors');
for (const p of problems) console.log('  !', p);

function text(v) { return v == null ? null : (typeof v === 'string' ? v : (v.en || Object.values(v)[0] || null)); }
function days(meeting, gift) { if (!meeting || !gift) return null; const a = Date.parse(meeting), b = Date.parse(gift); return Number.isNaN(a) || Number.isNaN(b) ? null : Math.round((a - b) / 86400000); }
