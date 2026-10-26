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
    if (!o.share) continue;
    const cast = o.actions.filter(a => a.v === 'yes' || a.v === 'no');
    assert.equal(o.share.n, cast.length, p.pid);
    assert.equal(o.share.tied, cast.filter(a => a.g.length).length, p.pid);
  }
});

test('every action is inside the term and links its record or names its party', () => {
  for (const p of all) for (const o of p.offices) for (const a of o.actions) {
    assert.ok(a.d >= String(o.start).slice(0, 10), p.pid + ' ' + a.id);
    if (o.end && !o.endShown) assert.ok(a.d <= o.end, p.pid + ' ' + a.id);
    assert.ok(a.p.length > 0, p.pid + ' ' + a.id + ' has no named party');
  }
});

test('no votes on record means no gift lines', () => {
  for (const p of all) for (const o of p.offices) if (o.noVotes) assert.ok(o.actions.every(a => !a.g.length && a.v === 'unknown'), p.pid);
});
