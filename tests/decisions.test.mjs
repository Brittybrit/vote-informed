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
      else { for (const l of LANGS) assert.ok(a.subject[l], id + ' subject ' + l); assert.ok(en.has('kind.' + a.kind), id + ' kind ' + a.kind); if (a.kind !== 'bill') assert.ok(a.parties.length, id + ' party'); }
      assert.ok(en.has('res.' + a.result), id + ' result ' + a.result);
      assert.match(a.date, /^\d{4}-\d{2}-\d{2}$/);
      for (const v of Object.values(a.roll)) assert.ok(['yes', 'no', 'absent', 'excused', null].concat(B.type === 'requests' ? ['requested', 'nv', 'abstain'] : []).includes(v), id + ' vote ' + v);
      if (a.rollComplete && a.tally) {
        const vals = Object.values(a.roll);
        assert.deepEqual([vals.filter(v => v === 'yes').length, vals.filter(v => v === 'no').length], a.tally, id + ' tally');
      }
      if (a.rollComplete && B.key !== 'county') assert.ok(a.tally, id + ' complete roll needs a tally');
      for (const l of a.links) { assert.match(l.url, /^https:\/\//, id + ' link'); assert.ok(['matter', 'clerk', 'minutes', 'record', 'vote', 'analysis', 'bill'].includes(l.t), id + ' link type'); }
      for (const l of a.lobbied) { assert.ok(l.name, id + ' lobbyist name'); for (const r of (l.regs || (l.reg ? [l.reg] : []))) assert.match(r, /^\d{4}-\d{2}(-\d{2})?$/, id + ' reg date'); }
      for (const g of a.gifts) {
        assert.ok(B.onBallot[g.to], id + ' gift to someone not on the ballot: ' + g.to);
        assert.ok(B.accounts[g.acct], id + ' account ' + g.acct);
        assert.equal(B.accounts[g.acct].owner, g.to, id + ' account owner');
        assert.ok(g.to in a.roll, id + ' gift to someone who did not take part: ' + g.to);
        assert.ok(['party', 'lobbyist', 'firm', 'listed', 'class'].includes(g.kind), id + ' kind ' + g.kind);
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
    for (const a of B.actions.filter(a => a.kind === 'request')) {
      const ks = Object.keys(a.roll);
      assert.equal(ks.length, 1, a.id); assert.equal(a.roll[ks[0]], 'requested', a.id);
      assert.ok(B.onBallot[ks[0]], a.id + ' filer on ballot');
      assert.ok(a.ask > 0 && a.ask < 1e9, a.id + ' amount ' + a.ask); assert.equal(a.kind, 'request');
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

test('state budget requests: each one says where it stands in that year’s final budget', () => {
  const LAW = { '25': ['2025-26', 'SB 2500'], '26': ['2026-27', 'HB 5001E'] };
  for (const B of d.bodies.filter(b => b.type === 'requests')) {
    for (const a of B.actions.filter(a => a.kind === 'request')) {
      const b = a.budget; assert.ok(b, a.id + ' has no budget status');
      const [fy, law] = LAW[a.id.slice(1, 3)];
      assert.equal(b.fy, fy, a.id); assert.equal(b.law, law, a.id);
      assert.ok(/^https:\/\/www\.flsenate\.gov\//.test(b.url), a.id + ' act link');
      assert.equal(b.ref, (B.key === 'flhouse' ? 'HF ' : 'SF ') + a.id.split('-')[1], a.id + ' form number');
      assert.ok(['in', 'notIn'].includes(b.status), a.id + ' status');
      if (b.status === 'notIn') assert.ok(!b.amount && !b.vetoed, a.id + ' amount or veto on a request not in the budget');
      if (b.amount != null) assert.ok(b.amount > 0 && b.amount < 1e9, a.id + ' budget amount ' + b.amount);
      if (b.vetoed) { assert.ok(b.vetoed > 0 && b.vetoed < 1e9, a.id); assert.ok(/^https:\/\/www\.flgov\.com\//.test(b.vetoUrl), a.id + ' veto link'); }
      if (b.vetoed && b.amount) assert.ok(b.vetoed <= b.amount, a.id + ' vetoed more than appropriated');
    }
  }
  for (const k of ['bud.in', 'bud.inNoAmt', 'bud.more', 'bud.veto', 'bud.vetoAll', 'bud.notIn', 'bud.law', 'bud.vetoL', 'fFund']) assert.ok(en.has(k), k);
});

test('state floor votes: official roll call, the staff analysis, every member of the chamber, and donors in the group the analysis names', () => {
  let n = 0;
  for (const B of d.bodies.filter(b => b.type === 'requests')) {
    for (const a of B.actions.filter(a => a.kind === 'bill')) {
      n++;
      assert.deepEqual(Object.keys(a.roll).sort(), B.members.map(m => m.key).sort(), a.id + ' every member of the chamber');
      assert.ok(a.tally && a.tally[0] >= 0 && a.tally[1] >= 0, a.id + ' tally');
      assert.ok(a.links.some(l => l.t === 'vote' && /^https:\/\/www\.flsenate\.gov\/Session\/Bill\/.*(House|Senate)Vote_/.test(l.url)), a.id + ' roll call link');
      assert.ok(a.links.some(l => l.t === 'analysis' && /Analyses/.test(l.url)), a.id + ' analysis link');
      for (const l of LANGS) assert.ok(a.note && a.note[l] && a.note[l].includes('“'), a.id + ' note quotes the analysis ' + l);
      for (const g of a.gifts) { assert.equal(g.kind, 'class', a.id); assert.equal(g.rel, 'cls', a.id); assert.ok(g.occ, a.id + ' occupation as reported'); }
    }
  }
  assert.ok(n > 0, 'floor votes present');
  for (const k of ['kind.bill', 'v.nv', 'v.abstain', 'how.s.cls', 'noGiftB', 'fBill', 'rollCall', 'analysisL', 'billL']) assert.ok(en.has(k), k);
});
