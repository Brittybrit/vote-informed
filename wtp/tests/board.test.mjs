import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker, fakeKV } from './load-worker.mjs';

const served = [];
const env = () => ({ BOARD: fakeKV(), ADMIN_TOKEN: 'secret-token', ASSETS: { fetch: async req => { const p = new URL(req.url).pathname; served.push(p); return new Response('asset:' + p, { status: 200 }); } } });
const hit = (w, e, host, path, init) => { served.length = 0; return w.__default.fetch(new Request('https://' + host + path, init), e); };

test('board state is sanitized and tools change it', async () => {
  const w = await loadWorker(['boardState', 'runBoardTool', 'BOARD_TOOLS']);
  const st = w.boardState({ status: { a: 'done', b: 'nope' }, notes: { a: ['x'] }, extra: [{ id: 'x-1', title: 'T', url: 'http://bad' }], overrides: { a: { url: 'https://ok', title: 'New' } }, hidden: ['zz', 5] });
  assert.deepEqual(st.status, { a: 'done' });
  assert.equal(st.extra[0].url, '');
  assert.equal(st.overrides.a.url, 'https://ok');
  assert.deepEqual(st.hidden, ['zz']);
  assert.equal(typeof w.runBoardTool(st, ['a'], 'set_status', { id: 'zzz', status: 'done' }), 'string');
  w.runBoardTool(st, ['a'], 'set_status', { id: 'a', status: 'doing' });
  assert.equal(st.status.a, 'doing');
  const r = w.runBoardTool(st, ['a'], 'add_step', { track: 'funding', title: 'New card', status: 'waiting' });
  assert.ok(r.id.startsWith('x-'));
  assert.equal(st.status[r.id], 'waiting');
  w.runBoardTool(st, ['a'], 'remove_step', { id: 'a' });
  assert.ok(st.hidden.includes('a'), 'built-in cards hide');
  w.runBoardTool(st, ['a'], 'remove_step', { id: r.id });
  assert.ok(!st.extra.some(x => x.id === r.id), 'added cards are removed');
  assert.ok(w.BOARD_TOOLS.some(t => t.name === 'read_platform'));
});

test('hosts: admin host serves the board behind the token; public hosts never expose it', async () => {
  const w = await loadWorker([]);
  const e = env();
  let r = await hit(w, e, 'admin.wethepeople305.org', '/');
  assert.equal(served[0], '/admin/board.html');
  r = await hit(w, e, 'wethepeople305.org', '/');
  assert.equal(served[0], '/');
  for (const host of ['wethepeople305.org', 'www.wethepeople305.org']) {
    for (const p of ['/admin/board.html', '/api/admin/board']) { r = await hit(w, e, host, p); assert.equal(r.status, 404, host + p); }
  }
  r = await hit(w, e, 'admin.wethepeople305.org', '/api/admin/board');
  assert.equal(r.status, 401);
  r = await hit(w, e, 'admin.wethepeople305.org', '/api/admin/board', { headers: { Authorization: 'Bearer secret-token' } });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.deepEqual(body.status, {});
  r = await hit(w, e, 'admin.wethepeople305.org', '/api/admin/board', { method: 'POST', headers: { Authorization: 'Bearer secret-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ state: { status: { a: 'done' }, hidden: ['b'] } }) });
  assert.equal((await r.json()).state.status.a, 'done');
  assert.ok(e.BOARD.store.has('board:founder'));
  // Without a token configured the admin API does not exist.
  r = await hit(w, { ...env(), ADMIN_TOKEN: '' }, 'admin.wethepeople305.org', '/api/admin/board');
  assert.equal(r.status, 404);
});

test('docs: every file in index.json exists and the chat context loads them', async () => {
  const { readFileSync } = await import('node:fs');
  const idx = JSON.parse(readFileSync(new URL('../public/docs/index.json', import.meta.url)));
  assert.ok(idx.files.length >= 3);
  for (const f of idx.files) assert.ok(readFileSync(new URL('../public/docs/' + f, import.meta.url), 'utf8').length > 200, f);
  const w = await loadWorker(['loadDocs']);
  const e = { ASSETS: { fetch: async req => { const p = new URL(req.url).pathname; try { return new Response(readFileSync(new URL('../public' + p, import.meta.url)), { status: 200 }); } catch { return new Response('', { status: 404 }); } } } };
  const ctx = await w.loadDocs(e);
  assert.match(ctx, /===== product\.md =====/);
  assert.match(ctx, /open source/i);
  assert.ok(ctx.length < 150001);
});
