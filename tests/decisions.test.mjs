import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const d = JSON.parse(readFileSync(new URL('../public/data/decisions.json', import.meta.url)));
const html = readFileSync(new URL('../public/decisions.html', import.meta.url), 'utf8');
const LANGS = ['en', 'es', 'ht'];
// pull one language block's keys out of the page's string table
function keysFor(lang) {
  const start = html.indexOf('\n    ' + lang + ': {');
  assert.ok(start > 0, 'no ' + lang + ' block');
  const end = html.indexOf('\n    }', start);
  return new Set([...html.slice(html.indexOf('{', start) + 1, end).matchAll(/'([a-zA-Z.]+)'\s*:|\n\s+([a-zA-Z0-9]+)\s*:/g)].map(m => m[1] || m[2]));
}

test('every page string exists in all three languages', () => {
  const en = keysFor('en');
  for (const lang of ['es', 'ht']) {
    const k = keysFor(lang);
    for (const key of en) assert.ok(k.has(key), lang + ' is missing ' + key);
  }
});

test('every action is well formed and its roll call matches the tally', () => {
  for (const B of d.bodies) {
    const members = B.members.map(m => m.key);
    const keys = { en: keysFor('en') };
    for (const k of Object.keys(B.onBallot)) assert.ok(members.includes(k), 'on-ballot member ' + k);
    for (const a of B.actions) {
      const id = a.id;
      for (const l of LANGS) assert.ok(a.subject[l], id + ' subject ' + l);
      assert.ok(keys.en.has('kind.' + a.kind), id + ' kind ' + a.kind);
      assert.ok(keys.en.has('res.' + a.result), id + ' result ' + a.result);
      assert.ok(a.parties.length, id + ' needs a named party');
      assert.match(a.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.deepEqual(Object.keys(a.roll).sort(), members.slice().sort(), id + ' roll members');
      const yes = members.filter(m => a.roll[m] === 'yes').length, no = members.filter(m => a.roll[m] === 'no').length;
      assert.deepEqual([yes, no], a.tally, id + ' tally');
      for (const m of members) assert.ok(['yes', 'no', 'absent', 'excused', null].includes(a.roll[m]), id + ' vote ' + m);
      if (a.vacant) assert.equal(a.roll[a.vacant], null);
      for (const k of ['matterUrl', 'minutesUrl']) assert.match(a[k], /^https:\/\/www\.miamidade\.gov\//);
      for (const l of a.lobbied) { assert.ok(l.name && l.for); assert.match(l.reg, /^\d{4}-\d{2}-\d{2}$/); assert.ok(a.parties.includes(l.for), id + ' lobbyist for unknown party ' + l.for); }
      for (const g of a.gifts) {
        assert.ok(B.accounts[g.acct], id + ' account ' + g.acct);
        assert.equal(B.accounts[g.acct].owner, g.to, id + ' account owner');
        assert.ok(B.onBallot[g.to], id + ' gift to someone not on the ballot');
        assert.ok(['party', 'lobbyist', 'firm'].includes(g.kind));
        assert.ok(g.amount > 0); assert.match(g.date, /^\d{4}-\d{2}-\d{2}$/);
        if (g.kind !== 'party') { assert.ok(g.lobbyist && a.parties.includes(g.forParty), id + ' gift link'); assert.ok(a.lobbied.some(l => l.name === g.lobbyist), id + ' gift lobbyist not listed: ' + g.lobbyist); }
        if (g.kind === 'lobbyist') assert.ok(['addr', 'occ'].includes(g.basis));
      }
    }
  }
});
