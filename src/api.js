/**
 * Public read API, version 1. Serves the hand-checked data the site is built from, in one normalized
 * shape, so other platforms can use it without scraping ballot305.org.
 *
 *   GET /api/v1                      index: version, data date, license, endpoints
 *   GET /api/v1/bodies               every body covered, with members, accounts, coverage note
 *   GET /api/v1/bodies/{key}         one body
 *   GET /api/v1/actions              official actions; filters below
 *   GET /api/v1/actions/{body}/{id}  one action
 *   GET /api/v1/ties                 every gift tied to an action, one row per gift
 *   GET /api/v1/people               roster people (q= name search)
 *   GET /api/v1/people/{id}          one person: terms, offices, actions summary, ties
 *   GET /api/v1/transparency         city records scorecard
 *   GET /api/v1/cycles               governance calendar and citizen levers per body
 *   GET /api/v1/cycles/{key}         one body's cycle
 *   GET /api/v1/now?precinct=033.0   my offices, who holds them, who is running, each body's phase, next meetings, levers, upcoming items
 *   GET /api/v1/upcoming             items on posted agendas, with ledger matches and tags; filters body, precinct, since, until, tagged
 *   GET /api/v1/contacts/{office}    official contact for one roster office
 *   GET /api/v1/bulk                 the raw files behind everything
 *   GET /api/v1/openapi.json         OpenAPI 3 description
 *
 * Filters on /actions: body, person (roster id), since, until (YYYY-MM-DD), kind, split=1 (any no vote),
 * tied=1 (at least one gift), party (substring of a named party), q (substring of subject/ref/party).
 * Filters on /ties: person, body, donor (substring), timing (before|after|same|unknown), match (gift kind),
 * since, until, minAmount.
 * Paging on lists: limit (default 100, max 500), offset.
 *
 * Every tie carries its epistemic status as fields, not prose: match (how the donor was tied to the
 * item), basis (what the match rests on), timing and days (gift date relative to the action date),
 * and the action's split flag. Consumers that drop the prose keep the caveats.
 *
 * Read-only. All data comes from the committed JSON under public/data, read through the assets binding
 * and cached per isolate until the data file's "updated" date changes.
 */

export const API_VERSION = '1';
// Data license. Code is MIT (LICENSE). The data is published under CC BY 4.0 with attribution to
// Ballot305 (ballot305.org); the underlying records are public government records.
export const DATA_LICENSE = { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', attribution: 'Ballot305 (ballot305.org)' };

const FILES = {
  decisions: '/data/decisions.json',
  roster: '/data/roster.json',
  transparency: '/data/transparency.json',
  moneySummary: '/data/money-summary.json',
  cycles: '/data/cycles.json',
  precincts: '/data/precincts.json',
  contacts: '/data/contacts.json',
  upcoming: '/data/upcoming.json'
};
const MAX_LIMIT = 500, DEFAULT_LIMIT = 100;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
  'Access-Control-Expose-Headers': 'ETag, X-Data-Updated, X-Total-Count'
};

let cache = null; // { key, data } per isolate

export async function loadApiData(env) {
  const raw = {};
  for (const [k, path] of Object.entries(FILES)) {
    const res = await env.ASSETS.fetch(new Request('https://assets.local' + path));
    raw[k] = res.ok ? await res.json() : null;
  }
  const key = [raw.decisions && raw.decisions.updated, raw.roster && raw.roster.updated, raw.transparency && raw.transparency.updated, raw.cycles && raw.cycles.updated, raw.precincts && raw.precincts.asOf, raw.contacts && raw.contacts.updated, raw.upcoming && raw.upcoming.updated].join('|');
  if (cache && cache.key === key) return cache.data;
  cache = { key, data: buildIndex(raw) };
  return cache.data;
}

// Builds the normalized view once per data version.
export function buildIndex(raw) {
  const dec = raw.decisions || { bodies: [], updated: null };
  const roster = raw.roster || { people: [], offices: [], terms: [], ballot: [] };
  const people = new Map(roster.people.map(p => [p.id, p]));
  const termsByPerson = new Map();
  for (const t of roster.terms || []) {
    if (!termsByPerson.has(t.person)) termsByPerson.set(t.person, []);
    termsByPerson.get(t.person).push(t);
  }
  const offices = new Map((roster.offices || []).map(o => [o.id, o]));

  const bodies = [];
  const actions = [];
  const ties = [];
  for (const b of dec.bodies || []) {
    const memberByKey = new Map((b.members || []).map(m => [m.key, m]));
    const accounts = {};
    for (const [k, a] of Object.entries(b.accounts || {})) {
      const owner = memberByKey.get(a.owner);
      accounts[k] = { key: k, person: owner ? owner.person : null, owner: a.owner, name: text(a.name), url: a.url || null, kind: accountKind(k, a) };
    }
    const body = {
      key: b.key,
      name: text(b.name),
      names: b.name,
      type: b.type || 'votes',
      rosterBody: b.rosterBody || null,
      since: b.since || null,
      members: (b.members || []).map(m => ({ key: m.key, person: m.person || null, name: m.name, district: m.district == null ? null : m.district })),
      onBallot: Object.entries(b.onBallot || {}).map(([k, v]) => ({ key: k, person: (memberByKey.get(k) || {}).person || null, race: text(v.race), accounts: v.accounts || [] })),
      accounts,
      coverage: text(b.coverage),
      registries: b.registries || null,
      actionCount: (b.actions || []).length
    };
    bodies.push(body);
    for (const a of b.actions || []) {
      const roll = {};
      for (const [k, v] of Object.entries(a.roll || {})) {
        const m = memberByKey.get(k);
        roll[m && m.person ? m.person : k] = v;
      }
      const noVotes = Object.values(a.roll || {}).filter(v => v === 'no').length;
      const split = noVotes > 0 || (Array.isArray(a.tally) && Number(a.tally[1]) > 0);
      const act = {
        id: a.id,
        body: b.key,
        bodyName: text(b.name),
        date: a.date || null,
        ref: a.ref || null,
        kind: a.kind || null,
        meeting: a.meeting || null,
        subject: text(a.subject),
        subjects: a.subject || null,
        parties: a.parties || [],
        result: a.result || null,
        tally: a.tally || null,
        notVoting: a.notVoting == null ? null : a.notVoting,
        split,
        roll,
        rollComplete: a.rollComplete !== false,
        mover: personFor(memberByKey, a.mover),
        second: personFor(memberByKey, a.second),
        role: a.role || null,
        amount: a.amount == null ? null : a.amount,
        recipient: a.recipient || null,
        status: a.status || null,
        budget: a.budget || null,
        lobbied: a.lobbied || [],
        ties: [],
        note: text(a.note),
        notes: a.note || null,
        links: a.links || [],
        source: { file: FILES.decisions, updated: dec.updated || null }
      };
      // Carry any field this view does not name so nothing is lost; the named ones win.
      for (const [k, v] of Object.entries(a)) if (!(k in act) && k !== 'gifts' && k !== 'roll' && k !== 'subject' && k !== 'note') act[k] = v;
      for (const g of a.gifts || []) {
        const to = memberByKey.get(g.to);
        const acct = accounts[g.acct] || null;
        const tie = {
          action: a.id,
          body: b.key,
          actionDate: a.date || null,
          actionSplit: split,
          person: to && to.person ? to.person : null,
          memberKey: g.to,
          vote: a.roll && a.roll[g.to] != null ? a.roll[g.to] : (a.role || null),
          account: acct ? { key: acct.key, name: acct.name, kind: acct.kind, url: acct.url } : { key: g.acct, name: g.acct, kind: accountKind(g.acct, {}), url: null },
          donor: g.donor,
          amount: g.amount == null ? null : g.amount,
          date: g.date || null,
          timing: timing(g.date, a.date),
          days: daysBetween(g.date, a.date),
          match: g.kind || null,
          rel: g.rel || null,
          basis: g.basis || null,
          lobbyist: g.lobbyist || null,
          firm: g.firm || null,
          forParty: g.forParty || null,
          occupation: g.occ || null,
          address: g.addr || null,
          note: g.note ? text(g.note) : null
        };
        for (const [k, v] of Object.entries(g)) if (!(k in tie) && !['to', 'acct', 'kind', 'occ', 'addr'].includes(k)) tie[k] = v;
        act.ties.push(tie);
        ties.push(tie);
      }
      actions.push(act);
    }
  }
  actions.sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')) || String(x.id).localeCompare(String(y.id)));

  const actionsByPerson = new Map();
  for (const act of actions) {
    const seen = new Set();
    for (const pid of [...Object.keys(act.roll), act.mover, act.second, ...act.ties.map(t => t.person)]) {
      if (!pid || seen.has(pid)) continue;
      seen.add(pid);
      if (!actionsByPerson.has(pid)) actionsByPerson.set(pid, []);
      actionsByPerson.get(pid).push(act);
    }
  }
  const ms = raw.moneySummary && raw.moneySummary.people ? raw.moneySummary.people : {};
  const summaries = new Map(Object.entries(ms).map(([pid, s]) => [pid, { ...s, bodyName: text(s.bodyName) }]));

  const onBallot = new Set();
  for (const race of roster.ballot || []) for (const c of race.candidates || []) if (c.person) onBallot.add(c.person);

  return {
    updated: dec.updated || null,
    rosterUpdated: roster.updated || null,
    bodies, actions, ties, people, termsByPerson, offices, actionsByPerson, summaries, onBallot,
    ballot: roster.ballot || [],
    transparency: raw.transparency || null,
    cycles: raw.cycles || { updated: null, bodies: [] },
    cyclesByBody: new Map(((raw.cycles && raw.cycles.bodies) || []).map(c => [c.rosterBody, c])),
    precincts: raw.precincts || null,
    contacts: raw.contacts || { updated: null, offices: {}, bodies: {} },
    upcoming: raw.upcoming || { updated: null, meetings: [] },
    officesByBody: groupBy(roster.offices || [], o => o.body),
    termsByOffice: groupBy(roster.terms || [], t => t.office),
    ballotByOffice: groupBy(roster.ballot || [], r => r.officeId)
  };
}

function groupBy(rows, fn) { const m = new Map(); for (const r of rows) { const k = fn(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r); } return m; }

/* ---------------- request handling ---------------- */

export async function handleApi(request, env, url) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'GET') return reply({ error: 'Method not allowed' }, 405);
  const path = url.pathname.replace(/^\/api\/v1\/?/, '').replace(/\/+$/, '');
  const parts = path ? path.split('/').map(decodeURIComponent) : [];
  const q = url.searchParams;
  try {
    const data = await loadApiData(env);
    const etag = '"v1-' + hash((data.updated || '') + (data.rosterUpdated || '') + url.pathname + url.search) + '"';
    if (request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers: { ...CORS, ETag: etag } });
    const out = route(parts, q, data, url);
    if (out instanceof Response) return out;
    const { body, status = 200, total } = out;
    const headers = { ...CORS, ETag: etag, 'X-Data-Updated': data.updated || '', 'Cache-Control': 'public, max-age=300' };
    if (total != null) headers['X-Total-Count'] = String(total);
    return reply(body, status, headers);
  } catch (e) {
    return reply({ error: 'Server error: ' + (e && e.message ? e.message : String(e)) }, 500);
  }
}

function route(parts, q, data, url) {
  const [a, b, c] = parts;
  if (!a) return { body: index(data, url) };
  if (a === 'openapi.json') return { body: openapi(url) };
  if (a === 'bulk') return { body: bulk(data, url) };
  if (a === 'bodies') {
    if (!b) return { body: { updated: data.updated, bodies: data.bodies } };
    const body = data.bodies.find(x => x.key === b);
    return body ? { body } : notFound('body');
  }
  if (a === 'actions') {
    if (b && c) {
      const act = data.actions.find(x => x.body === b && String(x.id) === c);
      return act ? { body: act } : notFound('action');
    }
    if (b) return notFound('action (use /actions/{body}/{id})');
    return page(filterActions(data, q), q, data);
  }
  if (a === 'ties') {
    if (b) return notFound('ties');
    return page(filterTies(data, q), q, data);
  }
  if (a === 'people') {
    if (!b) {
      const needle = (q.get('q') || '').toLowerCase();
      const ballotOnly = q.get('onBallot') === '1';
      let rows = [...data.people.values()];
      if (needle) rows = rows.filter(p => (p.name + ' ' + (p.aliases || []).join(' ')).toLowerCase().includes(needle));
      if (ballotOnly) rows = rows.filter(p => data.onBallot.has(p.id));
      rows = rows.map(p => personSummary(p, data));
      return page(rows, q, data);
    }
    const p = data.people.get(b);
    return p ? { body: personDetail(p, data) } : notFound('person');
  }
  if (a === 'transparency') return { body: data.transparency || { cities: [] } };
  if (a === 'cycles') {
    if (!b) return { body: data.cycles };
    const c = data.cycles.bodies.find(x => x.key === b || x.rosterBody === b);
    return c ? { body: c } : notFound('cycle');
  }
  if (a === 'now') return now(data, q);
  if (a === 'upcoming') {
    if (b) return notFound('upcoming');
    return page(filterUpcoming(data, q), q, data);
  }
  if (a === 'payments') {
    const rows = data.upcoming.payments || [];
    if (!b) return { body: { updated: data.upcoming.updated, bodies: rows.map(p => ({ body: p.body, rosterBody: p.rosterBody, checked: p.checked, datasets: p.datasets.length, topVendors: p.vendors.top.length, departments: p.staffing ? p.staffing.byDepartment.length : 0 })) } };
    const py = rows.find(p => p.body === b || p.rosterBody === b);
    return py ? { body: py } : notFound('payments');
  }
  if (a === 'procurement') {
    const rows = data.upcoming.procurement || [];
    if (!b) return { body: { updated: data.upcoming.updated, bodies: rows.map(p => ({ body: p.body, rosterBody: p.rosterBody, checked: p.checked, open: p.solicitations.length, expiring: p.expiring.length, plan: p.capitalPlan.length })) } };
    const pr = rows.find(p => p.body === b || p.rosterBody === b);
    return pr ? { body: pr } : notFound('procurement');
  }
  if (a === 'contacts') {
    if (!b) return { body: { updated: data.contacts.updated, offices: Object.keys(data.contacts.offices).length, bodies: data.contacts.bodies } };
    const c = data.contacts.offices[b];
    return c ? { body: c } : notFound('contact');
  }
  return notFound('endpoint');
}

function index(data, url) {
  const base = url.origin + '/api/v1';
  return {
    name: 'Ballot305 public data API',
    version: API_VERSION,
    updated: data.updated,
    rosterUpdated: data.rosterUpdated,
    license: DATA_LICENSE,
    counts: { bodies: data.bodies.length, actions: data.actions.length, ties: data.ties.length, people: data.people.size },
    endpoints: {
      bodies: base + '/bodies',
      actions: base + '/actions?body=county&split=1&tied=1',
      action: base + '/actions/{body}/{id}',
      ties: base + '/ties?timing=before&match=party',
      people: base + '/people?q=lopez&onBallot=1',
      person: base + '/people/{id}',
      transparency: base + '/transparency',
      cycles: base + '/cycles',
      now: base + '/now?precinct=033.0',
      upcoming: base + '/upcoming?precinct=033.0&tagged=money',
      contacts: base + '/contacts/{office}',
      procurement: base + '/procurement/county',
      payments: base + '/payments/county',
      bulk: base + '/bulk',
      openapi: base + '/openapi.json'
    },
    fields: {
      'tie.match': 'how the donor was tied to the item: party (the company itself), lobbyist (the registered lobbyist), firm (the lobbying firm, its PAC or another of its lobbyists), office (a lobbyist at the same registered office), listed (name-only match, flagged), class (a kind of business the item helps, not a named party)',
      'tie.basis': 'what the match rests on (occ = reported occupation, addr = address, name = name only)',
      'tie.timing': 'gift date relative to the action date: before, after, same, unknown',
      'tie.days': 'signed days from action to gift (negative = before)',
      'action.split': 'true when any member voted no',
      'action.rollComplete': 'false when the roll shows only the members covered, not the whole body'
    },
    docs: url.origin + '/api',
    methodology: url.origin + '/methodology',
    corrections: 'corrections@ballot305.org'
  };
}

function bulk(data, url) {
  const o = url.origin;
  return {
    updated: data.updated,
    license: DATA_LICENSE,
    files: [
      { path: o + FILES.decisions, what: 'every body, action, roll call, lobbyist registration and tied gift (site-native shape)' },
      { path: o + '/data/donor-actions.json', what: 'hand-checked candidate action cards' },
      { path: o + '/data/donor-actions.csv', what: 'the same cards as CSV' },
      { path: o + FILES.roster, what: 'officeholder roster: people, offices, terms, ballot' },
      { path: o + FILES.moneySummary, what: 'one-line money summary per incumbent' },
      { path: o + FILES.transparency, what: 'city records scorecard' },
      { path: o + FILES.cycles, what: 'governance calendar and citizen levers per body' },
      { path: o + FILES.precincts, what: 'precinct to district cross reference (county elections office)' },
      { path: o + FILES.contacts, what: 'official contacts per office' },
      { path: o + FILES.upcoming, what: 'items on posted agendas with ledger matches and tags' },
      { path: o + '/data/lobby-ledger.json', what: 'state budget requests by lobbying firm' },
      { path: o + '/data/county-lobbyists.json', what: 'Miami-Dade County lobbyist registrations used for matching' },
      { path: o + '/data/school-board-lobbyists.json', what: 'M-DCPS lobbyist registrations' },
      { path: o + '/data/city-reports.json', what: 'typed transcriptions of scanned city campaign reports' }
    ],
    repo: 'https://github.com/Brittybrit/vote-informed'
  };
}

function filterActions(data, q) {
  const body = q.get('body'), person = q.get('person'), kind = q.get('kind');
  const since = q.get('since'), until = q.get('until');
  const split = q.get('split') === '1', tied = q.get('tied') === '1';
  const party = (q.get('party') || '').toLowerCase(), needle = (q.get('q') || '').toLowerCase();
  let rows = person ? (data.actionsByPerson.get(person) || []) : data.actions;
  return rows.filter(a =>
    (!body || a.body === body) &&
    (!kind || a.kind === kind) &&
    (!since || (a.date && a.date >= since)) &&
    (!until || (a.date && a.date <= until)) &&
    (!split || a.split) &&
    (!tied || a.ties.length > 0) &&
    (!party || a.parties.some(p => String(p).toLowerCase().includes(party))) &&
    (!needle || [a.subject, a.ref, ...a.parties].some(s => String(s || '').toLowerCase().includes(needle)))
  );
}

function filterTies(data, q) {
  const person = q.get('person'), body = q.get('body'), timing = q.get('timing'), match = q.get('match');
  const donor = (q.get('donor') || '').toLowerCase();
  const since = q.get('since'), until = q.get('until');
  const min = q.get('minAmount') ? Number(q.get('minAmount')) : null;
  return data.ties.filter(t =>
    (!person || t.person === person) &&
    (!body || t.body === body) &&
    (!timing || t.timing === timing) &&
    (!match || t.match === match) &&
    (!donor || String(t.donor || '').toLowerCase().includes(donor)) &&
    (!since || (t.date && t.date >= since)) &&
    (!until || (t.date && t.date <= until)) &&
    (min == null || (t.amount != null && t.amount >= min))
  );
}

function page(rows, q, data) {
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(q.get('limit')) || DEFAULT_LIMIT));
  const offset = Math.max(0, Number(q.get('offset')) || 0);
  return { body: { updated: data.updated, total: rows.length, limit, offset, items: rows.slice(offset, offset + limit) }, total: rows.length };
}

function personSummary(p, data) {
  const terms = (data.termsByPerson.get(p.id) || []).map(t => ({ ...t, officeName: (data.offices.get(t.office) || {}).name || t.office }));
  const acts = data.actionsByPerson.get(p.id) || [];
  const tied = data.ties.filter(t => t.person === p.id);
  return {
    id: p.id, name: p.name, aliases: p.aliases || [], ids: p.ids || {},
    onBallot: data.onBallot.has(p.id),
    offices: terms.map(t => ({ office: t.office, name: t.officeName, start: t.start || null, end: t.end || null, startKnown: t.startKnown !== false, endKnown: t.endKnown !== false, via: t.via || null })),
    actionCount: acts.length,
    tieCount: tied.length,
    tiedAmount: tied.reduce((s, t) => s + (t.amount || 0), 0),
    summary: data.summaries.get(p.id) || null
  };
}

function personDetail(p, data) {
  const s = personSummary(p, data);
  const terms = (data.termsByPerson.get(p.id) || []);
  const races = data.ballot.filter(r => (r.candidates || []).some(c => c.person === p.id)).map(r => ({ office: r.office, officeId: r.officeId, judicial: !!r.judicial }));
  return {
    ...s,
    terms,
    races,
    actions: (data.actionsByPerson.get(p.id) || []).map(a => ({ id: a.id, body: a.body, date: a.date, ref: a.ref, kind: a.kind, subject: a.subject, result: a.result, split: a.split, vote: a.roll[p.id] || (a.role || null), ties: a.ties.filter(t => t.person === p.id).length })),
    ties: data.ties.filter(t => t.person === p.id)
  };
}

/* ---------------- now: the citizen's view for one precinct ---------------- */

// Precinct municipality names (county cross reference) to roster body ids.
const MUNI_ALIAS = { 'N MIAMI BEACH': 'north-miami-beach', 'N BAY VILLAGE': 'north-bay-village', 'INDIAN CREEK VILLAGE': 'indian-creek', 'OPA LOCKA': 'opa-locka', 'UNINCORPORATED M-D': null };
function muniBody(name) {
  if (name == null) return null;
  const n = String(name).toUpperCase().trim();
  if (n in MUNI_ALIAS) return MUNI_ALIAS[n] ? 'city-' + MUNI_ALIAS[n] : null;
  return 'city-' + n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
export function normPrecinct(p) {
  const m = String(p || '').match(/(\d{1,4})(?:\.(\d))?/);
  if (!m) return '';
  return String(parseInt(m[1], 10)).padStart(3, '0') + '.' + (m[2] || '0');
}

function now(data, q) {
  const pct = normPrecinct(q.get('precinct'));
  const today = DATE_RE.test(q.get('date') || '') ? q.get('date') : new Date().toISOString().slice(0, 10);
  if (!pct) return { body: { error: 'precinct is required, e.g. ?precinct=033.0. Find yours on your voter card or at the county elections office.' }, status: 400 };
  const row = data.precincts && data.precincts.precincts && data.precincts.precincts[pct];
  if (!row) return notFound('precinct ' + pct);
  const [congress, stateSenate, stateHouse, muni, schoolBoard, countyCommission] = row;
  const cityBody = muniBody(muni);
  const cityDistrict = cityBody === 'city-north-miami' ? (data.precincts.northMiamiDistrict || {})[pct] : cityBody === 'city-miami-gardens' ? (data.precincts.miamiGardensDistrict || {})[pct] : null;

  // Which offices are mine: every office on a body I'm in, narrowed to my district where the office has one.
  const wanted = [
    { body: 'mdc-commission', district: String(countyCommission) }, { body: 'mdc-mayor' }, { body: 'mdc-sheriff' }, { body: 'mdc-clerk' },
    { body: 'mdc-property-appraiser' }, { body: 'mdc-tax-collector' }, { body: 'mdc-supervisor-of-elections' },
    { body: 'mdcps-board', district: String(schoolBoard) },
    cityBody ? { body: cityBody, district: cityDistrict == null ? null : String(cityDistrict) } : null,
    { body: 'fl-state-attorney-11' }, { body: 'fl-public-defender-11' },
    { body: 'fl-house', district: String(stateHouse) }, { body: 'fl-senate', district: String(stateSenate) },
    { body: 'us-house', district: String(congress) }, { body: 'us-senate' }, { body: 'fl-executive' }
  ].filter(Boolean);

  const bodiesOut = [];
  for (const w of wanted) {
    const offices = (data.officesByBody.get(w.body) || []).filter(o => w.district == null || o.district == null || String(o.district) === w.district);
    if (!offices.length) continue;
    const cycle = data.cyclesByBody.get(w.body) || null;
    const seats = offices.map(o => {
      const terms = (data.termsByOffice.get(o.id) || []).filter(t => (t.start == null || t.start <= today) && (t.end == null || t.end >= today));
      const holders = terms.map(t => holder(t, data));
      const races = (data.ballotByOffice.get(o.id) || []).map(r => ({ office: r.office, judicial: !!r.judicial, candidates: (r.candidates || []).map(c => ({ person: c.person, name: c.asPrinted || (c.person && data.people.get(c.person) || {}).name || null, party: c.party || null, incumbent: holders.some(h => h.person === c.person) })) }));
      return { office: o.id, name: o.name, district: o.district == null ? null : o.district, kind: o.kind || null, actionScope: o.actionScope || 'all', holders, onBallot: races, contact: data.contacts.offices[o.id] || null };
    });
    bodiesOut.push({
      body: w.body,
      name: cycle ? cycle.name : (data.bodies.find(b => b.rosterBody === w.body) || {}).name || offices[0].jurisdiction || w.body,
      level: offices[0].level,
      jurisdiction: offices[0].jurisdiction,
      decisionsBody: (data.bodies.find(b => b.rosterBody === w.body) || {}).key || null,
      seats,
      cycle: cycle ? cycleNow(cycle, today) : null,
      bodyContact: data.contacts.bodies[w.body] || null,
      upcoming: upcomingFor(data, w.body, today, { countyDistrict: String(countyCommission), cityBody, cityDistrict }),
      procurement: procurementFor(data, w.body, today, { countyDistrict: String(countyCommission), cityBody, cityDistrict }),
      payments: paymentsFor(data, w.body)
    });
  }
  return { body: {
    precinct: pct, date: today, updated: data.cycles.updated || null, rosterUpdated: data.rosterUpdated,
    districts: { congress, stateSenate, stateHouse, municipality: muni, municipalityBody: cityBody, cityDistrict: cityDistrict == null ? null : cityDistrict, schoolBoard, countyCommission },
    note: 'Offices are every seat on the bodies this precinct falls in, narrowed to its district. Holders are the people the roster shows seated today; candidates are from the Nov 3, 2026 ballot. The cycle block says what phase each body is in, its next posted meetings, and what a resident can do; bodies without a cycle block have not been researched yet.',
    bodies: bodiesOut
  } };
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Items on this body's posted agendas from today on, each with a relevance block for the precinct.
function upcomingFor(data, rosterBody, today, me) {
  const out = [];
  for (const m of data.upcoming.meetings || []) {
    if (m.rosterBody !== rosterBody || !m.meeting || m.meeting.date < today) continue;
    for (const it of m.items || []) out.push(relevance(itemView(m, it), me));
  }
  return out;
}
// Spending under consideration for this body: open solicitations, expiring contracts, the capital plan,
// each row with a near flag for the precinct where the row states a district or the body is the city.
function procurementFor(data, rosterBody, today, me) {
  const pr = (data.upcoming.procurement || []).find(p => p.rosterBody === rosterBody);
  if (!pr) return null;
  const near = loc => { if (!loc) return null; if (rosterBody === 'mdc-commission' && loc.district != null) return String(loc.district) === me.countyDistrict; if (rosterBody === me.cityBody) return loc.district == null || me.cityDistrict == null ? true : String(loc.district) === String(me.cityDistrict); return null; };
  return {
    checked: pr.checked, links: pr.links, levers: pr.levers, notes: pr.notes,
    open: pr.solicitations.filter(s => !s.due || s.due >= today).map(s => ({ ...s, near: near(s.location), daysToDue: s.due ? Math.round((Date.parse(s.due) - Date.parse(today)) / 86400000) : null })),
    expiring: pr.expiring.map(e => ({ ...e, daysToExpiry: Math.round((Date.parse(e.expires) - Date.parse(today)) / 86400000), money: e.matches && e.matches.ties.length > 0, lobbied: e.matches && e.matches.lobbyists.length > 0 })),
    plan: pr.capitalPlan.map(c => ({ ...c, near: near(c.location) })),
    counts: { open: pr.solicitations.length, expiring: pr.expiring.length, plan: pr.capitalPlan.length, planTotal: pr.capitalPlan.reduce((n, c) => n + (c.total || 0), 0) }
  };
}
// Who this body pays: staffing totals, top vendors with their ledger matches, union contracts, levers.
function paymentsFor(data, rosterBody) {
  const py = (data.upcoming.payments || []).find(p => p.rosterBody === rosterBody);
  if (!py) return null;
  return {
    checked: py.checked, datasets: py.datasets, staffing: py.staffing,
    vendors: py.vendors ? { period: py.vendors.period, total: py.vendors.total, source: py.vendors.source, top: py.vendors.top.map(v => ({ ...v, money: v.matches && v.matches.ties.length > 0, lobbied: v.matches && v.matches.lobbyists.length > 0, history: v.matches && v.matches.priorActions.length > 0 })) } : null,
    unionContracts: py.unionContracts, levers: py.levers, notes: py.notes
  };
}
function itemView(m, it) {
  return { body: m.body, rosterBody: m.rosterBody, bodyName: m.bodyName, meeting: m.meeting, comment: m.comment || [], ...it };
}
// What this item has to do with this precinct: computed from the item's own fields only.
function relevance(it, me) {
  const r = { near: null, wallet: !!(it.tags && it.tags.wallet), money: !!(it.tags && it.tags.money), lobbied: !!(it.tags && it.tags.lobbied), hearing: !!(it.tags && it.tags.hearing), why: [] };
  const loc = it.location || {};
  if (it.rosterBody === 'mdc-commission' && loc.district != null) { r.near = String(loc.district) === me.countyDistrict; r.why.push(r.near ? 'in your county commission district' : 'county district ' + loc.district + ', not yours'); }
  else if (it.rosterBody === me.cityBody) { r.near = true; r.why.push('your city'); if (loc.district != null && me.cityDistrict != null) { r.near = String(loc.district) === String(me.cityDistrict); r.why[r.why.length - 1] = r.near ? 'in your city district' : 'city district ' + loc.district + ', not yours'; } }
  if (r.wallet && it.fiscal) r.why.push('fiscal impact stated: ' + it.fiscal.slice(0, 160));
  if (r.money) r.why.push(it.matches.ties.length + ' gift' + (it.matches.ties.length === 1 ? '' : 's') + ' from a named party to a member');
  if (r.lobbied) r.why.push(it.matches.lobbyists.length + ' registered lobbyist' + (it.matches.lobbyists.length === 1 ? '' : 's'));
  if (it.matches && it.matches.priorActions.length) r.why.push(it.matches.priorActions.length + ' prior action' + (it.matches.priorActions.length === 1 ? '' : 's') + ' on this party');
  return { ...it, relevance: r };
}
function filterUpcoming(data, q) {
  const body = q.get('body'), since = q.get('since'), until = q.get('until');
  const tagged = (q.get('tagged') || '').split(',').map(s => s.trim()).filter(Boolean);
  const pct = normPrecinct(q.get('precinct'));
  const row = pct && data.precincts && data.precincts.precincts ? data.precincts.precincts[pct] : null;
  const me = row ? { countyDistrict: String(row[5]), cityBody: muniBody(row[3]), cityDistrict: muniBody(row[3]) === 'city-north-miami' ? (data.precincts.northMiamiDistrict || {})[pct] : muniBody(row[3]) === 'city-miami-gardens' ? (data.precincts.miamiGardensDistrict || {})[pct] : null } : null;
  const myBodies = me ? new Set(['mdc-commission', 'mdcps-board', me.cityBody].filter(Boolean)) : null;
  const out = [];
  for (const m of data.upcoming.meetings || []) {
    if (body && m.body !== body && m.rosterBody !== body) continue;
    if (since && m.meeting.date < since) continue;
    if (until && m.meeting.date > until) continue;
    if (myBodies && !myBodies.has(m.rosterBody)) continue;
    for (const it of m.items || []) {
      const v = me ? relevance(itemView(m, it), me) : itemView(m, it);
      if (tagged.length && !tagged.every(t => t === 'near' ? (v.relevance && v.relevance.near) : (v.tags && v.tags[t]))) continue;
      out.push(v);
    }
  }
  return out;
}

function holder(t, data) {
  const p = data.people.get(t.person) || {};
  const s = data.summaries.get(t.person) || null;
  return { person: t.person, name: p.name || t.person, since: t.start || null, sinceKnown: t.startKnown !== false, via: t.via || null, termExpires: t.termExpires || null, actionCount: (data.actionsByPerson.get(t.person) || []).length, moneySummary: s ? { total: s.total, donors: s.donors, gifts: s.gifts, before: s.before, items: s.items, split: s.split } : null };
}

// What phase a body is in today, its next meetings, and the levers, from its cycle file.
export function cycleNow(c, today) {
  const md = today.slice(5);
  const inPhase = p => {
    if (!p.start && !p.end) return false;
    if (p.repeats === 'yearly') {
      const s = (p.start || p.end).slice(5), e = (p.end || p.start).slice(5);
      return s <= e ? (md >= s && md <= e) : (md >= s || md <= e);
    }
    return (p.start || '0000') <= today && today <= (p.end || '9999');
  };
  const current = c.phases.filter(inPhase);
  const upcoming = c.phases
    .map(p => ({ p, start: nextStart(p, today) }))
    .filter(x => x.start && x.start > today)
    .sort((x, y) => x.start.localeCompare(y.start))
    .slice(0, 4)
    .map(x => ({ ...x.p, start: x.start }));
  const meetings = c.meetings.schedule.filter(m => m.date >= today).slice(0, 5);
  const next = meetings[0] || null;
  const levers = c.levers.map(l => ({ ...l, nextMeeting: /comment/.test(l.key) && next ? next.date : null }));
  return {
    key: c.key, checked: c.checked || null, links: c.links || {},
    meetings: { pattern: c.meetings.pattern || null, agendaLeadDays: c.meetings.agendaLeadDays == null ? null : c.meetings.agendaLeadDays, next: meetings, scheduleEnds: c.meetings.schedule.length ? c.meetings.schedule[c.meetings.schedule.length - 1].date : null },
    phases: { current, upcoming },
    levers,
    elections: c.elections || null,
    contacts: c.contacts || [],
    notes: c.notes || null
  };
}
function nextStart(p, today) {
  if (!p.start) return null;
  if (p.repeats !== 'yearly') return p.start;
  const y = Number(today.slice(0, 4));
  const thisYear = y + '-' + p.start.slice(5);
  return thisYear > today ? thisYear : (y + 1) + '-' + p.start.slice(5);
}

/* ---------------- helpers ---------------- */

function text(v) { return v == null ? null : (typeof v === 'string' ? v : (v.en || Object.values(v)[0] || null)); }
function personFor(memberByKey, key) { if (!key) return null; const m = memberByKey.get(key); return m && m.person ? m.person : key; }
function accountKind(key, a) {
  if (key === 'fec' || /fec\.gov/.test(String(a.url || ''))) return 'federal';
  if (key === 'pac' || /^pc\d+$/.test(key)) return 'committee';
  return 'campaign';
}
function timing(gift, action) {
  if (!gift || !action) return 'unknown';
  if (gift < action) return 'before';
  if (gift > action) return 'after';
  return 'same';
}
function daysBetween(gift, action) {
  if (!gift || !action) return null;
  const a = Date.parse(gift), b = Date.parse(action);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((a - b) / 86400000);
}
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(16); }
function notFound(what) { return { body: { error: 'Not found: ' + what }, status: 404 }; }
function reply(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...headers } });
}

function openapi(url) {
  const base = url.origin + '/api/v1';
  const list = (desc, params) => ({ get: { summary: desc, parameters: params.map(([name, d]) => ({ name, in: 'query', schema: { type: 'string' }, description: d })), responses: { 200: { description: 'OK' } } } });
  const paging = [['limit', 'rows per page, max 500'], ['offset', 'rows to skip']];
  return {
    openapi: '3.0.3',
    info: { title: 'Ballot305 public data API', version: API_VERSION, description: 'Official actions by elected officials joined to their campaign donors and registered lobbyists, with every tie carrying its match kind, basis and timing. Data is CC BY 4.0, attribution Ballot305.', contact: { email: 'corrections@ballot305.org' } },
    servers: [{ url: base }],
    paths: {
      '/': list('Index, counts, license, field definitions', []),
      '/bodies': list('Bodies covered', []),
      '/bodies/{key}': { get: { summary: 'One body', parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 404: { description: 'Unknown body' } } } },
      '/actions': list('Official actions', [['body', 'body key'], ['person', 'roster person id'], ['kind', 'action kind'], ['since', 'YYYY-MM-DD'], ['until', 'YYYY-MM-DD'], ['split', '1 = any no vote'], ['tied', '1 = at least one gift'], ['party', 'substring of a named party'], ['q', 'substring of subject, ref or party'], ...paging]),
      '/actions/{body}/{id}': { get: { summary: 'One action', parameters: [{ name: 'body', in: 'path', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 404: { description: 'Unknown action' } } } },
      '/ties': list('Gifts tied to actions, one row per gift', [['person', 'roster person id'], ['body', 'body key'], ['donor', 'substring'], ['timing', 'before | after | same | unknown'], ['match', 'party | lobbyist | firm | office | listed | class'], ['since', 'gift date from'], ['until', 'gift date to'], ['minAmount', 'number'], ...paging]),
      '/people': list('Roster people', [['q', 'name substring'], ['onBallot', '1 = on the Nov 3, 2026 ballot'], ...paging]),
      '/people/{id}': { get: { summary: 'One person with terms, races, actions and ties', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 404: { description: 'Unknown person' } } } },
      '/transparency': list('City records scorecard', []),
      '/cycles': list('Governance calendar and citizen levers per body', []),
      '/cycles/{key}': { get: { summary: 'One body: meetings, phases, levers, elections, contacts', parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 404: { description: 'Unknown body' } } } },
      '/upcoming': list('Items on posted agendas, with ledger matches, tags and, given a precinct, relevance', [['body', 'cycle body key or roster body id'], ['precinct', 'county precinct; limits to the bodies it votes for and adds a relevance block'], ['since', 'YYYY-MM-DD'], ['until', 'YYYY-MM-DD'], ['tagged', 'comma list of money, lobbied, wallet, place, hearing, history, near'], ...paging]),
      '/payments': list('Who each body pays: staffing by department, top vendors with ledger matches, union contracts, levers', []),
      '/payments/{body}': { get: { summary: 'One body\'s staffing and vendor payments', parameters: [{ name: 'body', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 404: { description: 'Not researched' } } } },
      '/procurement': list('Spending under consideration per body: open solicitations, expiring contracts, capital plan, levers', []),
      '/procurement/{body}': { get: { summary: 'One body\'s procurement register', parameters: [{ name: 'body', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 404: { description: 'Not researched' } } } },
      '/contacts/{office}': { get: { summary: 'Official contact for one roster office', parameters: [{ name: 'office', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 404: { description: 'No contact on file' } } } },
      '/now': list('For one precinct today: my offices, who holds them, who is running, each body\'s phase, next meetings and what a resident can do', [['precinct', 'county precinct, e.g. 033.0 (required)'], ['date', 'YYYY-MM-DD, defaults to today']]),
      '/bulk': list('Raw data files', [])
    }
  };
}
