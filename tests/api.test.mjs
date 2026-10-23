// Public read API (/api/v1) against the committed data files. No network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handleApi, buildIndex } from '../src/api.js';

const read = f => JSON.parse(readFileSync(new URL('../public/data/' + f, import.meta.url)));
const raw = { decisions: read('decisions.json'), roster: read('roster.json'), transparency: read('transparency.json'), moneySummary: read('money-summary.json') };

const env = {
  ASSETS: {
    fetch: async req => {
      const p = new URL(req.url).pathname.replace(/^\/data\//, '');
      try { return new Response(readFileSync(new URL('../public/data/' + p, import.meta.url)), { status: 200 }); }
      catch { return new Response('no', { status: 404 }); }
    }
  }
};
const get = async (path, headers = {}) => {
  const url = new URL('https://ballot305.org' + path);
  const res = await handleApi(new Request(url, { headers }), env, url);
  return { res, body: res.status === 304 ? null : await res.json() };
};

test('index lists counts, license and endpoints', async () => {
  const { res, body } = await get('/api/v1');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(body.version, '1');
  assert.equal(body.license.name, 'CC BY 4.0');
  assert.ok(body.counts.actions > 1000);
  assert.ok(body.counts.ties > 1000);
  assert.ok(body.endpoints.openapi.endsWith('/api/v1/openapi.json'));
});

test('every action and tie is reachable and normalized', () => {
  const idx = buildIndex(raw);
  const expected = raw.decisions.bodies.reduce((n, b) => n + b.actions.length, 0);
  assert.equal(idx.actions.length, expected);
  const gifts = raw.decisions.bodies.reduce((n, b) => n + b.actions.reduce((m, a) => m + (a.gifts || []).length, 0), 0);
  assert.equal(idx.ties.length, gifts);
  for (const t of idx.ties) {
    assert.ok(['before', 'after', 'same', 'unknown'].includes(t.timing), t.timing);
    assert.ok(t.match, 'tie has a match kind');
    if (t.timing === 'before') assert.ok(t.days < 0);
    if (t.timing === 'after') assert.ok(t.days > 0);
  }
  // Roll calls are keyed by roster person id wherever the body maps the member.
  const county = idx.actions.find(a => a.body === 'county');
  assert.ok(Object.keys(county.roll).includes('vicki-l-lopez'));
});

test('split and tied filters agree with the data', async () => {
  const { body: split } = await get('/api/v1/actions?body=county&split=1&limit=500');
  assert.ok(split.total >= 10 && split.total < 30, 'county split votes: ' + split.total);
  for (const a of split.items) assert.equal(a.split, true);
  const { body: calusa } = await get('/api/v1/actions?party=kendall%20associates&tied=1');
  assert.ok(calusa.total >= 1);
  const a = calusa.items[0];
  assert.equal(a.split, true);
  assert.ok(a.ties.some(t => t.timing === 'before' && t.person === 'vicki-l-lopez'));
});

test('single action, person, body and 404s', async () => {
  const { body: list } = await get('/api/v1/actions?body=county&limit=1');
  const one = list.items[0];
  const { res, body } = await get('/api/v1/actions/county/' + encodeURIComponent(one.id));
  assert.equal(res.status, 200);
  assert.equal(body.id, one.id);
  const { body: p } = await get('/api/v1/people/vicki-l-lopez');
  assert.equal(p.name, 'Vicki L. Lopez');
  assert.ok(p.onBallot);
  assert.ok(p.terms.length >= 1);
  assert.ok(p.actions.length >= 50);
  assert.ok(p.ties.length >= 50);
  assert.ok(p.summary && p.summary.total > 0);
  const { body: b } = await get('/api/v1/bodies/county');
  assert.equal(b.key, 'county');
  assert.ok(b.members.length === 13);
  for (const path of ['/api/v1/bodies/nope', '/api/v1/people/nope', '/api/v1/actions/county/nope', '/api/v1/whatever']) {
    const { res } = await get(path);
    assert.equal(res.status, 404, path);
  }
});

test('ties filters, paging and totals', async () => {
  const { res, body } = await get('/api/v1/ties?person=vicki-l-lopez&timing=before&limit=10&offset=5');
  assert.equal(res.headers.get('X-Total-Count'), String(body.total));
  assert.equal(body.items.length, 10);
  for (const t of body.items) { assert.equal(t.person, 'vicki-l-lopez'); assert.equal(t.timing, 'before'); }
  const { body: big } = await get('/api/v1/ties?minAmount=25000');
  for (const t of big.items) assert.ok(t.amount >= 25000);
  const { body: capped } = await get('/api/v1/ties?limit=9999');
  assert.equal(capped.limit, 500);
});

test('people search, transparency, bulk, openapi, etag', async () => {
  const { body: ppl } = await get('/api/v1/people?q=lopez&onBallot=1');
  assert.ok(ppl.items.some(p => p.id === 'vicki-l-lopez'));
  const { body: tr } = await get('/api/v1/transparency');
  assert.ok(tr.cities.length >= 18);
  const { body: bulk } = await get('/api/v1/bulk');
  assert.ok(bulk.files.some(f => f.path.endsWith('/data/decisions.json')));
  const { body: oa } = await get('/api/v1/openapi.json');
  assert.equal(oa.openapi, '3.0.3');
  assert.ok(oa.paths['/ties']);
  const first = await get('/api/v1/bodies');
  const etag = first.res.headers.get('ETag');
  const again = await get('/api/v1/bodies', { 'If-None-Match': etag });
  assert.equal(again.res.status, 304);
  const opt = await handleApi(new Request('https://ballot305.org/api/v1', { method: 'OPTIONS' }), env, new URL('https://ballot305.org/api/v1'));
  assert.equal(opt.status, 204);
});

test('now: one precinct gives my offices, holders, candidates and a cycle block where researched', async () => {
  const { res, body } = await get('/api/v1/now?precinct=33&date=2026-10-23');
  assert.equal(res.status, 200);
  assert.equal(body.precinct, '033.0');
  assert.equal(body.districts.countyCommission, 5);
  const county = body.bodies.find(b => b.body === 'mdc-commission');
  assert.equal(county.seats.length, 1);
  assert.equal(county.seats[0].holders[0].person, 'vicki-l-lopez');
  assert.ok(county.seats[0].onBallot[0].candidates.some(c => c.incumbent));
  const city = body.bodies.find(b => b.level === 'municipal');
  assert.equal(city.body, 'city-miami-beach');
  assert.ok(city.seats.length >= 5);
  for (const b of body.bodies) if (b.cycle) {
    assert.ok(Array.isArray(b.cycle.levers));
    for (const m of b.cycle.meetings.next) assert.ok(m.date >= '2026-10-23');
  }
  const bad = await get('/api/v1/now');
  assert.equal(bad.res.status, 400);
  const miss = await get('/api/v1/now?precinct=999.9');
  assert.equal(miss.res.status, 404);
});

test('cycleNow: yearly phases wrap the year and next meetings are in the future', async () => {
  const { cycleNow } = await import('../src/api.js');
  const c = { key: 't', phases: [
    { key: 'budget-hearings', start: '2026-09-01', end: '2026-09-30', repeats: 'yearly', source: 'x' },
    { key: 'recess', start: '2026-12-15', end: '2027-01-10', repeats: 'yearly', source: 'x' },
    { key: 'election', start: '2026-11-03', end: '2026-11-03', repeats: 'once', source: 'x' }
  ], meetings: { schedule: [{ date: '2026-10-01', source: 'x' }, { date: '2026-11-05', source: 'x' }] }, levers: [{ key: 'public-comment', source: 'x' }] };
  const sept = cycleNow(c, '2027-09-15');
  assert.deepEqual(sept.phases.current.map(p => p.key), ['budget-hearings']);
  const jan = cycleNow(c, '2027-01-05');
  assert.deepEqual(jan.phases.current.map(p => p.key), ['recess']);
  const oct = cycleNow(c, '2026-10-23');
  assert.deepEqual(oct.meetings.next.map(m => m.date), ['2026-11-05']);
  assert.equal(oct.phases.upcoming[0].key, 'election');
  assert.equal(oct.levers[0].nextMeeting, '2026-11-05');
});

test('connections: only confirmed rows are public and every one cites a record', async () => {
  const { res, body } = await get('/api/v1/connections');
  assert.equal(res.status, 200);
  for (const c of body.confirmed) {
    assert.ok(c.record && (c.record.url || c.record.note), 'confirmed connection has a record');
    assert.ok(c.relationship);
  }
  assert.ok(typeof body.underReview === 'object');
  const { body: one } = await get('/api/v1/people/vicki-l-lopez');
  assert.ok(one.connections && typeof one.connections.underReview === 'number');
});

test('founder board: state is sanitized and tools change it', async () => {
  const { loadWorker } = await import('./load-worker.mjs');
  const w = await loadWorker(['boardState', 'runBoardTool', 'BOARD_TOOLS']);
  const st = w.boardState({ status: { a: 'done', b: 'nope' }, notes: { a: ['x'] }, extra: [{ id: 'x-1', title: 'T', url: 'http://bad' }], overrides: { a: { url: 'https://ok', title: 'New' } } });
  assert.deepEqual(st.status, { a: 'done' });
  assert.equal(st.extra[0].url, '');
  assert.equal(st.overrides.a.url, 'https://ok');
  assert.equal(typeof w.runBoardTool(st, ['a'], 'set_status', { id: 'zzz', status: 'done' }), 'string');
  w.runBoardTool(st, ['a'], 'set_status', { id: 'a', status: 'doing' });
  assert.equal(st.status.a, 'doing');
  const r = w.runBoardTool(st, ['a'], 'add_step', { track: 'funding', title: 'New card', status: 'waiting' });
  assert.ok(r.id.startsWith('x-'));
  assert.equal(st.status[r.id], 'waiting');
  assert.ok(w.BOARD_TOOLS.some(t => t.name === 'read_platform'));
});

test('hosts: ballot305.org root is the home page, the admin host root is the board, nothing else differs', async () => {
  const { loadWorker, fakeKV } = await import('./load-worker.mjs');
  const w = await loadWorker([]);
  const served = [];
  const wenv = { CACHE: fakeKV(), ASSETS: { fetch: async req => { const u = new URL(req.url); if (u.pathname.startsWith('/data/')) return env.ASSETS.fetch(req); served.push(u.pathname); return new Response('asset:' + u.pathname, { status: 200, headers: { 'content-type': 'text/html' } }); } } };
  const hit = async (host, path) => { served.length = 0; const r = await w.__default.fetch(new Request('https://' + host + path), wenv, { waitUntil() {} }); return { status: r.status, asset: served[0] || null, text: await r.text() }; };
  for (const host of ['ballot305.org', 'www.ballot305.org', 'wethepeople305.org', 'www.wethepeople305.org']) {
    const r = await hit(host, '/');
    assert.equal(r.status, 200, host);
    assert.equal(r.asset, '/', host + ' root must come from the static home page');
    assert.doesNotMatch(r.text, /Not found/, host);
  }
  const admin = await hit('admin.wethepeople305.org', '/');
  assert.equal(admin.asset, '/admin/board.html');
  // Other pages never reach the Worker in production (assets serve them first), so only the root is checked here.
  const api = await w.__default.fetch(new Request('https://wethepeople305.org/api/v1'), wenv, { waitUntil() {} });
  assert.equal(api.status, 200);
  // The board's state and chat stay behind the token on every host.
  const board = await w.__default.fetch(new Request('https://ballot305.org/api/admin/board'), wenv, { waitUntil() {} });
  assert.ok([401, 404].includes(board.status), 'board state is not served without the token');
});
