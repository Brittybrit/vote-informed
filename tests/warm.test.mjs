import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker, fakeKV } from './load-worker.mjs';

const w = await loadWorker(['warmItems', 'warmRun', 'warmCheck', 'usageCost', 'addUsage', 'researchSlot', 'FEATURED_KEY']);

const MASTER = {
  jurisdiction: 'Miami-Dade County', electionName: 'General Election', electionDate: 'November 3, 2026',
  races: [
    { office: 'County Commissioner, District 5', candidates: [{ name: 'Vicki L. Lopez' }, { name: 'Write-in' }] },
    { office: 'Shall Judge Jane Roe of the Third District Court of Appeal be retained in office?', isJudicial: true, candidates: [{ name: 'YES' }, { name: 'NO' }] },
    { office: 'Representative in Congress, District 27', candidates: [{ name: 'Maria Elvira Salazar' }, { name: 'Other Person' }] },
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
    ['candidate', 'Maria Elvira Salazar'], ['candidate', 'Other Person'],
    ['judge', 'A. Judge'], ['judge', 'B. Judge'],
    ['measure', 'City of Miami Question 3'],
    ['impact', 'City of Miami Question 3']   // "what it means for you" research, warmed last
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
  const r = await w.warmRun(e2, { indices: [0, 6] });
  assert.deepEqual(r.states.map(x => x.state), ['pending', 'pending']);
  assert.equal(e2.jobs[0].key, visitorKey);
  assert.equal(e2.jobs[0].warm, true);
  assert.ok(e2.jobs[1].key.startsWith('resm2:'));
  const r2 = await w.warmRun(e2, { indices: [7] });
  assert.deepEqual(r2.states.map(x => x.state), ['pending']);
  assert.ok(e2.jobs[2].key.startsWith('impm3:') && e2.jobs[2].impact === true);
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
  e.CACHE.store.set(key, '{}');
  assert.equal((await w.warmCheck(e, { start: 0, count: 1 })).states[0].state, 'translate');
  const tr = await w.warmRun(e, { indices: [0] });
  assert.equal(tr.states[0].state, 'pending');
  assert.equal(e.jobs[2].translateOnly, true);
  assert.equal(e.jobs[2].at, key);
  e.CACHE.store.delete('pend:tr:' + key);
  e.CACHE.store.set('warmtr:es:' + key, '1'); e.CACHE.store.set('warmtr:ht:' + key, '1');
  e.CACHE.store.set('warmcost:' + key, JSON.stringify({ 'claude-haiku-4-5': { in: 50000, out: 4000, cacheWrite: 0, cacheRead: 0, searches: 3, calls: 2 } }));
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

const MASTER_ELECTION = 'General Election November 3, 2026';
const slot = async (e, body) => (await w.researchSlot(e, body)).key;
test('an uploaded ballot reuses the countywide entry when it is the same contest', async () => {
  const e = env();
  const master = await slot(e, { name: 'Vicki L. Lopez', office: 'County Commissioner, District 5', jurisdiction: 'Miami-Dade County', election: MASTER_ELECTION });
  // parse wrote the county, the date and the name a little differently
  assert.equal(await slot(e, { name: 'VICKI LOPEZ', office: 'County Commissioner, District 5', jurisdiction: 'Miami-Dade County, FL', election: 'Tuesday, November 3, 2026' }), master);
  // office worded differently, same exact name, same district number
  const cong = await slot(e, { name: 'Maria Elvira Salazar', office: 'Representative in Congress, District 27', jurisdiction: 'Miami-Dade County', election: MASTER_ELECTION });
  assert.equal(await slot(e, { name: 'Maria Elvira Salazar', office: 'U.S. Representative, District 27', jurisdiction: 'Miami-Dade', election: MASTER_ELECTION }), cong);
  // ballot question title with different punctuation
  const q = await slot(e, { name: 'City of Miami Question 3', office: 'Ballot measure', jurisdiction: 'Miami-Dade County', election: MASTER_ELECTION, isMeasure: true });
  assert.equal(await slot(e, { name: 'CITY OF MIAMI - QUESTION 3', office: 'Ballot measure', jurisdiction: 'x Miami-Dade', election: MASTER_ELECTION, isMeasure: true, summary: 'slanted' }), q);
});

test('an uploaded ballot does not borrow across elections, counties, districts or people', async () => {
  const e = env();
  const master = await slot(e, { name: 'Vicki L. Lopez', office: 'County Commissioner, District 5', jurisdiction: 'Miami-Dade County', election: MASTER_ELECTION });
  assert.notEqual(await slot(e, { name: 'Vicki L. Lopez', office: 'County Commissioner, District 5', jurisdiction: 'Miami-Dade County', election: 'Primary Election August 18, 2026' }), master);
  assert.notEqual(await slot(e, { name: 'Vicki L. Lopez', office: 'County Commissioner, District 5', jurisdiction: 'Broward County', election: MASTER_ELECTION }), master);
  const cong = await slot(e, { name: 'Maria Elvira Salazar', office: 'Representative in Congress, District 27', jurisdiction: 'Miami-Dade County', election: MASTER_ELECTION });
  assert.notEqual(await slot(e, { name: 'Maria Elvira Salazar', office: 'U.S. Representative, District 26', jurisdiction: 'Miami-Dade County', election: MASTER_ELECTION }), cong);
  // a looser name only counts inside the same office
  assert.notEqual(await slot(e, { name: 'Vicki Lopez', office: 'Mayor', jurisdiction: 'Miami-Dade County', election: MASTER_ELECTION }), master);
});

test('a changed line re-translates only that line', async () => {
  const v = await loadWorker(['localize']);
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u, o) => {
    const items = JSON.parse(JSON.parse(o.body).messages[0].content.split('\n').pop()).items;
    sent.push(items.map(x => x.text));
    const text = JSON.stringify({ items: items.map(x => ({ id: x.id, text: 'ES ' + x.text })) });
    return new Response(JSON.stringify({ content: [{ type: 'text', text }], stop_reason: 'end_turn', usage: {} }));
  };
  try {
    const e = { CACHE: fakeKV(), ANTHROPIC_API_KEY: 'k' };
    const a = await v.localize(e, { summary: 'Runs for mayor.', donorDataNote: '12 gifts on file.' }, 'es');
    assert.equal(a.summary, 'ES Runs for mayor.');
    const b = await v.localize(e, { summary: 'Runs for mayor.', donorDataNote: '13 gifts on file.' }, 'es');
    assert.equal(b.donorDataNote, 'ES 13 gifts on file.');
    assert.deepEqual(sent, [['Runs for mayor.', '12 gifts on file.'], ['13 gifts on file.']]);
  } finally { globalThis.fetch = realFetch; }
});
