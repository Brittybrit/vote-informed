import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker, fakeKV } from './load-worker.mjs';

const w = await loadWorker(['warmItems', 'warmRun', 'warmCheck', 'usageCost', 'addUsage', 'FEATURED_KEY']);

const MASTER = {
  jurisdiction: 'Miami-Dade County', electionName: 'General Election', electionDate: 'November 3, 2026',
  races: [
    { office: 'County Commissioner, District 5', candidates: [{ name: 'Vicki L. Lopez' }, { name: 'Write-in' }] },
    { office: 'Shall Judge Jane Roe of the Third District Court of Appeal be retained in office?', isJudicial: true, candidates: [{ name: 'YES' }, { name: 'NO' }] },
    { office: 'Circuit Judge, Group 5', isJudicial: true, candidates: [{ name: 'A. Judge' }, { name: 'B. Judge' }] },
    { office: 'City of Miami Question 3', isMeasure: true, summary: 'Virginia Key marina lease', candidates: [{ name: 'YES' }, { name: 'NO' }] }
  ]
};
function env(extra) {
  const CACHE = fakeKV();
  CACHE.store.set(w.FEATURED_KEY, 'parse4:abc');
  CACHE.store.set('parse4:abc', JSON.stringify(MASTER));
  const jobs = [];
  const RESEARCH = { idFromName: k => k, get: () => ({ fetch: async (u, o) => { jobs.push(JSON.parse(o.body)); return new Response('scheduled'); } }) };
  return Object.assign({ CACHE, RESEARCH, jobs, ADMIN_TOKEN: 't' }, extra || {});
}

test('warm list reads the ballot the way the page does', async () => {
  const items = await w.warmItems(env());
  assert.deepEqual(items.map(x => [x.kind, x.body.name]), [
    ['candidate', 'Vicki L. Lopez'],
    ['judge', 'Jane Roe'],
    ['judge', 'A. Judge'], ['judge', 'B. Judge'],
    ['measure', 'City of Miami Question 3']
  ]);
  assert.equal(items[0].body.election, 'General Election November 3, 2026');
});

test('warm-up schedules the same cache slot a visitor would', async () => {
  const e = env();
  const res = await w.__default.fetch(new Request('https://x/api/research', { method: 'POST', body: JSON.stringify({
    name: 'Vicki L. Lopez', office: 'County Commissioner, District 5', jurisdiction: 'Miami-Dade County',
    election: 'General Election November 3, 2026', isJudicial: false, poll: true, lang: 'en' }), headers: { 'CF-Connecting-IP': '1.2.3.4' } }), e, { waitUntil() {} });
  assert.equal((await res.json()).pending, true);
  const visitorKey = e.jobs[0].key;
  const e2 = env();
  const r = await w.warmRun(e2, { indices: [0, 4] });
  assert.deepEqual(r.states.map(x => x.state), ['pending', 'pending']);
  assert.equal(e2.jobs[0].key, visitorKey);
  assert.equal(e2.jobs[0].warm, true);
  assert.ok(e2.jobs[1].key.startsWith('resm2:'));
});

test('warm-up skips cached, running and failed contests, and retries failed on request', async () => {
  const e = env();
  await w.warmRun(e, { indices: [0] });
  const key = e.jobs[0].key;
  assert.deepEqual((await w.warmRun(e, { indices: [0] })).states, [{ i: 0, state: 'pending' }]);
  assert.equal(e.jobs.length, 1);
  e.CACHE.store.delete('pend:' + key); e.CACHE.store.set('fail:' + key, 'oops');
  assert.equal((await w.warmCheck(e, { indices: [0] })).states[0].state, 'failed');
  assert.equal((await w.warmRun(e, { indices: [0] })).states[0].state, 'failed');
  assert.equal((await w.warmRun(e, { indices: [0], retry: true })).states[0].state, 'pending');
  assert.equal(e.jobs.length, 2);
  e.CACHE.store.set(key, '{}'); e.CACHE.store.set('warmcost:' + key, JSON.stringify({ 'claude-haiku-4-5': { in: 50000, out: 4000, cacheWrite: 0, cacheRead: 0, searches: 3, calls: 2 } }));
  const s = (await w.warmCheck(e, { start: 0, count: 1 })).states[0];
  assert.equal(s.state, 'cached');
  assert.equal(s.cost, 0.1);   // $0.05 in + $0.02 out + $0.03 searches
});

test('warm-up obeys the kill switch', async () => {
  const e = env({ FRESH_OFF: '1' });
  const r = await w.warmRun(e, { indices: [0] });
  assert.equal(r.states[0].state, 'stopped');
  assert.equal(e.jobs.length, 0);
});

test('cost math', () => {
  const acc = {};
  w.addUsage(acc, 'claude-sonnet-4-6', { input_tokens: 100000, output_tokens: 5000, server_tool_use: { web_search_requests: 5 } });
  assert.equal(w.usageCost(acc), 0.425);   // $0.30 + $0.075 + $0.05
});

test('warm-up routes need the admin token', async () => {
  const res = await w.__default.fetch(new Request('https://x/api/admin/warm-list', { method: 'POST', body: '{}' }), env(), {});
  assert.equal(res.status, 401);
});
