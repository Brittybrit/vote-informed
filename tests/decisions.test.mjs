import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const d = JSON.parse(readFileSync(new URL('../public/data/decisions.json', import.meta.url)));
const html = readFileSync(new URL('../public/decisions.html', import.meta.url), 'utf8');
const LANGS = ['en', 'es', 'ht'];
// one language block's keys from the page's string table
function keysFor(lang) {
  const start = html.indexOf('\n    ' + lang + ': {');
  assert.ok(start > 0, 'no ' + lang + ' block');
  const end = html.indexOf('\n    }', start);
  return new Set([...html.slice(html.indexOf('{', start) + 1, end).matchAll(/(?:^\s+|',\s+)(?:'([a-zA-Z.0-9]+)'|([a-zA-Z0-9]+))\s*:/gm)].map(m => m[1] || m[2]));
}
const en = keysFor('en');

test('every page string exists in all three languages', () => {
  for (const lang of ['es', 'ht']) {
    const k = keysFor(lang);
    for (const key of en) assert.ok(k.has(key), lang + ' is missing ' + key);
  }
});

test('page script parses', () => {
  const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  new Function(js);
});

test('every body and action is well formed', () => {
  const ids = new Set();
  for (const B of d.bodies) {
    for (const l of LANGS) assert.ok(B.name[l], B.key + ' name ' + l);
    if (B.coverage) for (const l of LANGS) assert.ok(B.coverage[l], B.key + ' coverage ' + l);
    for (const k of Object.keys(B.onBallot)) for (const a of B.onBallot[k].accounts) assert.ok(B.accounts[a], B.key + ' account ' + a);
    for (const a of B.actions) {
      const id = B.key + ' ' + a.id;
      assert.ok(!ids.has(a.id), 'duplicate id ' + a.id); ids.add(a.id);
      if (a.title) for (const l of LANGS) assert.ok(a.title[l], id + ' title ' + l);
      else { for (const l of LANGS) assert.ok(a.subject[l], id + ' subject ' + l); assert.ok(en.has('kind.' + a.kind), id + ' kind ' + a.kind); assert.ok(a.parties.length, id + ' party'); }
      assert.ok(en.has('res.' + a.result), id + ' result ' + a.result);
      assert.match(a.date, /^\d{4}-\d{2}-\d{2}$/);
      for (const v of Object.values(a.roll)) assert.ok(['yes', 'no', 'absent', 'excused', null].concat(B.type === 'requests' ? ['requested'] : []).includes(v), id + ' vote ' + v);
      if (a.rollComplete && a.tally) {
        const vals = Object.values(a.roll);
        assert.deepEqual([vals.filter(v => v === 'yes').length, vals.filter(v => v === 'no').length], a.tally, id + ' tally');
      }
      if (a.rollComplete && B.key !== 'county') assert.ok(a.tally, id + ' complete roll needs a tally');
      for (const l of a.links) { assert.match(l.url, /^https:\/\//, id + ' link'); assert.ok(['matter', 'clerk', 'minutes', 'record'].includes(l.t), id + ' link type'); }
      for (const l of a.lobbied) { assert.ok(l.name, id + ' lobbyist name'); for (const r of (l.regs || (l.reg ? [l.reg] : []))) assert.match(r, /^\d{4}-\d{2}(-\d{2})?$/, id + ' reg date'); }
      for (const g of a.gifts) {
        assert.ok(B.onBallot[g.to], id + ' gift to someone not on the ballot: ' + g.to);
        assert.ok(B.accounts[g.acct], id + ' account ' + g.acct);
        assert.equal(B.accounts[g.acct].owner, g.to, id + ' account owner');
        assert.ok(g.to in a.roll, id + ' gift to someone who did not take part: ' + g.to);
        assert.ok(['party', 'lobbyist', 'firm', 'listed'].includes(g.kind), id + ' kind ' + g.kind);
        assert.ok(g.amount > 0, id + ' amount'); assert.match(g.date, /^\d{4}-\d{2}-\d{2}$/, id + ' gift date');
        if (g.kind === 'lobbyist' || g.kind === 'firm') assert.ok(a.lobbied.some(l => l.name === g.lobbyist), id + ' gift lobbyist not listed: ' + g.lobbyist);
        if (g.kind === 'lobbyist') assert.ok(['addr', 'occ'].includes(g.basis), id + ' basis');
        if (g.kind === 'listed') assert.ok(a.giftNotes && a.giftNotes[g.to] || B.key === 'northmiami', id + ' listed gift needs a note');
      }
      if (a.giftNotes) for (const n of Object.values(a.giftNotes)) for (const l of LANGS) assert.ok(n[l], id + ' note ' + l);
    }
  }
});

test('county roll calls are complete and Lopez is marked not yet seated before Nov 18, 2025 votes', () => {
  const C = d.bodies.find(b => b.key === 'county');
  for (const a of C.actions) {
    assert.equal(Object.keys(a.roll).length, 13, a.id);
    if (a.vacant) assert.equal(a.roll.Lopez, null);
  }
});

test('state budget requests: one filer on the ballot, an amount, and every gift says how it ties to the form', () => {
  const R = d.bodies.filter(b => b.type === 'requests');
  assert.equal(R.length, 2, 'house and senate bodies');
  for (const B of R) {
    assert.ok(B.actions.length > 0, B.key);
    for (const a of B.actions) {
      const ks = Object.keys(a.roll);
      assert.equal(ks.length, 1, a.id); assert.equal(a.roll[ks[0]], 'requested', a.id);
      assert.ok(B.onBallot[ks[0]], a.id + ' filer on ballot');
      assert.ok(a.ask > 0, a.id + ' amount'); assert.equal(a.kind, 'request');
      assert.ok(en.has('res.' + a.result));
      if (a.result === 'requestedW') assert.ok(a.note, a.id + ' withdrawn note');
      for (const g of a.gifts) {
        assert.ok(['named', 'firm', 'firmpac', 'firmlob', 'party'].includes(g.rel), a.id + ' rel ' + g.rel);
        assert.ok(en.has('how.s.' + g.rel));
        if (g.rel !== 'party') { assert.ok(a.lobbied.length, a.id + ' firm gift but no lobbyist on the form'); assert.ok(g.firmName, a.id + ' firm name'); }
      }
    }
  }
});
