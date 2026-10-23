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
