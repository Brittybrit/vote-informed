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
  moneySummary: '/data/money-summary.json'
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
  const key = [raw.decisions && raw.decisions.updated, raw.roster && raw.roster.updated, raw.transparency && raw.transparency.updated].join('|');
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
    transparency: raw.transparency || null
  };
}

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
      '/bulk': list('Raw data files', [])
    }
  };
}
