import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const J = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url)));
const G = J('public/data/gaps.json'), R = J('scripts/data/gaps/requests.json').requests;
test('gaps: every item has an office, text in three languages and a known status; requests match the request list', () => {
  const ST = new Set(['running', 'requestReady', 'requested', 'received', 'denied', 'unlikely', 'notFound']);
  for (const [pid, v] of Object.entries(G.people)) for (const x of v.items) {
    assert.ok(ST.has(x.status), pid + ' status ' + x.status);
    for (const l of ['en', 'es', 'ht']) { assert.ok(x.text[l], pid + ' text ' + l); assert.ok(x.office[l], pid + ' office ' + l); }
    if (x.req) { const q = R.find(r => r.n === x.req.n); assert.ok(q && q.people.some(([p]) => p === pid), pid + ' request ' + x.req.n); }
    if (x.status === 'requested') assert.match(x.req.sent, /^\d{4}-\d\d-\d\d$/);
  }
  for (const q of R) for (const [p] of q.people) assert.ok(G.people[p], 'request ' + q.n + ' person ' + p + ' has a gap listed');
});
