// Next-ballot email signups from the post-election popup (POST /api/notify-signup) and the admin export.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

function fakeKV() {
  const m = new Map();
  return {
    m,
    get: async (k, type) => { const v = m.get(k); return v == null ? null : type === 'json' ? JSON.parse(v) : v; },
    put: async (k, v) => { m.set(k, v); },
    delete: async k => { m.delete(k); },
    list: async ({ prefix = '' }) => ({ keys: [...m.keys()].filter(k => k.startsWith(prefix)).sort().map(name => ({ name })), list_complete: true })
  };
}
const post = (env, body, ip = '1.2.3.4') => worker.fetch(new Request('https://ballot305.org/api/notify-signup', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }, body: JSON.stringify(body) }), env, {});

test('stores a valid email once, lowercased, keeping the first signup date', async () => {
  const env = { CACHE: fakeKV() };
  let r = await post(env, { email: ' Voter@Example.com ', lang: 'es' });
  assert.equal(r.status, 200);
  const first = JSON.parse(env.CACHE.m.get('notify-signup:voter@example.com'));
  assert.equal(first.lang, 'es');
  r = await post(env, { email: 'voter@example.com', lang: 'en' });
  assert.equal(r.status, 200);
  const again = JSON.parse(env.CACHE.m.get('notify-signup:voter@example.com'));
  assert.equal(again.at, first.at);
  assert.equal([...env.CACHE.m.keys()].filter(k => k.startsWith('notify-signup:')).length, 1);
});

test('rejects bad emails and quietly drops honeypot hits', async () => {
  const env = { CACHE: fakeKV() };
  assert.equal((await post(env, { email: 'not-an-email' })).status, 400);
  assert.equal((await post(env, {})).status, 400);
  assert.equal((await post(env, { email: 'bot@spam.com', website: 'http://x' })).status, 200);
  assert.equal(env.CACHE.m.has('notify-signup:bot@spam.com'), false);
});

test('limits signups per connection per day', async () => {
  const env = { CACHE: fakeKV() };
  for (let i = 0; i < 5; i++) assert.equal((await post(env, { email: 'a' + i + '@example.com' })).status, 200);
  assert.equal((await post(env, { email: 'a9@example.com' })).status, 429);
});

test('admin export lists signups and needs the token', async () => {
  const env = { CACHE: fakeKV(), ADMIN_TOKEN: 'secret-token' };
  await post(env, { email: 'one@example.com', lang: 'ht' });
  const req = auth => worker.fetch(new Request('https://ballot305.org/api/admin/notify-signups', { headers: auth ? { Authorization: 'Bearer ' + auth } : {} }), env, {});
  assert.equal((await req('wrong-token!')).status, 401);
  const d = await (await req('secret-token')).json();
  assert.deepEqual(d.signups.map(s => [s.email, s.lang]), [['one@example.com', 'ht']]);
});
