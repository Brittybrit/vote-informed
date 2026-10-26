import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../public/data/prior/', import.meta.url);
const files = readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json');
const all = files.map(f => JSON.parse(readFileSync(new URL(f, dir))));

test('every earlier-office file is in the index', () => {
  const idx = JSON.parse(readFileSync(new URL('index.json', dir))).people;
  assert.deepEqual([...idx].sort(), all.map(p => p.pid).sort());
});

test('a donor share only where that office’s reports were read; otherwise a reason is given', () => {
  for (const p of all) for (const o of p.offices) {
    if (o.share) assert.equal(o.donors, 'files', p.pid + ' ' + o.body);
    else assert.ok(['notOnline', 'notCollected', 'appointed', 'selfFunded', 'files'].includes(o.donors), p.pid + ' ' + o.body);
  }
});

test('the share counts only yes or no votes, and ties need a gift', () => {
  for (const p of all) for (const o of p.offices) {
    if (!o.share || o.kind === 'leg') continue;
    const cast = o.actions.filter(a => a.v === 'yes' || a.v === 'no');
    assert.equal(o.share.n, cast.length, p.pid);
    assert.equal(o.share.tied, cast.filter(a => a.g.length).length, p.pid);
  }
});

test('every action is inside the term and links its record or names its party', () => {
  for (const p of all) for (const o of p.offices) for (const a of o.actions || []) {
    assert.ok(a.d >= String(o.start).slice(0, 10), p.pid + ' ' + a.id);
    if (o.end && !o.endShown) assert.ok(a.d <= o.end, p.pid + ' ' + a.id);
    assert.ok(a.p.length > 0, p.pid + ' ' + a.id + ' has no named party');
  }
});

test('no votes on record means no gift lines', () => {
  for (const p of all) for (const o of p.offices) if (o.noVotes) assert.ok(o.actions.every(a => !a.g.length && a.v === 'unknown'), p.pid);
});

test('earlier legislative seats: a share only when every item could be checked, counting yes or no votes only', () => {
  for (const p of all) for (const o of p.offices) if (o.kind === 'leg') {
    const L = o.laws, Q = o.requests;
    const cast = L.list.filter(x => x.v === 'yes' || x.v === 'no');
    assert.equal(L.cast, cast.length, p.pid);
    if (L.share) { assert.equal(L.noClass, 0, p.pid); assert.equal(L.share.n, cast.length, p.pid); assert.equal(L.share.tied, cast.filter(x => x.g.length).length, p.pid); }
    if (Q.share) { assert.equal(Q.unread, 0, p.pid); assert.equal(Q.share.n, Q.list.length, p.pid); }
    for (const x of L.list) if (!x.cls) assert.equal(x.g.length, 0, p.pid + ' gifts on a law with no donor class');
    for (const x of Q.list) if (!x.read) assert.equal(x.g.length, 0, p.pid + ' gifts on an unread request');
  }
});
