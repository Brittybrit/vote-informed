import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const d = JSON.parse(readFileSync(new URL('../public/data/decisions.json', import.meta.url)));
const html = readFileSync(new URL('../public/decisions.html', import.meta.url), 'utf8');
// the card renderer and its strings are shared with the dossier on the home page
const card = readFileSync(new URL('../public/decision-card.js', import.meta.url), 'utf8');
const LANGS = ['en', 'es', 'ht'];
// one language block's keys from the page's string table
function keysFor(lang) {
  const start = card.indexOf('\n    ' + lang + ': {');
  assert.ok(start > 0, 'no ' + lang + ' block');
  const end = card.indexOf('\n    }', start);
  return new Set([...card.slice(card.indexOf('{', start) + 1, end).matchAll(/(?:^\s+|',\s+)(?:'([a-zA-Z.0-9]+)'|([a-zA-Z0-9]+))\s*:/gm)].map(m => m[1] || m[2]));
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
  new Function(card);
  assert.match(html, /<script src="\/decision-card\.js"><\/script>/);
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
      for (const l of a.links) { assert.match(l.url, /^https:\/\//, id + ' link'); assert.ok(['matter', 'clerk', 'minutes', 'record', 'vote', 'analysis', 'bill', 'cmte', 'cbo', 'crs', 'fr'].includes(l.t), id + ' link type'); }
      for (const l of a.lobbied) { assert.ok(l.name, id + ' lobbyist name'); for (const r of (l.regs || (l.reg ? [l.reg] : []))) assert.match(r, /^\d{4}-\d{2}(-\d{2})?$/, id + ' reg date'); }
      for (const g of a.gifts) {
        assert.ok(B.onBallot[g.to], id + ' gift to someone not on the ballot: ' + g.to);
        assert.ok(B.accounts[g.acct], id + ' account ' + g.acct);
        assert.equal(B.accounts[g.acct].owner, g.to, id + ' account owner');
        assert.ok(g.to in a.roll, id + ' gift to someone who did not take part: ' + g.to);
        assert.ok(['party', 'lobbyist', 'firm', 'listed', 'class'].includes(g.kind), id + ' kind ' + g.kind);
        assert.ok(g.amount > 0, id + ' amount'); assert.match(g.date, /^\d{4}-\d{2}-\d{2}$/, id + ' gift date');
        if ((g.kind === 'lobbyist' || g.kind === 'firm') && B.level !== 'federal') assert.ok(a.lobbied.some(l => l.name === g.lobbyist), id + ' gift lobbyist not listed: ' + g.lobbyist);
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
  const R = d.bodies.filter(b => b.type === 'requests' && b.level !== 'federal');
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
  for (const B of d.bodies.filter(b => b.type === 'requests' && b.level !== 'federal')) {
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
  for (const B of d.bodies.filter(b => b.type === 'requests' && b.level !== 'federal')) {
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

test('U.S. House earmark requests: one requester, an amount, a source, and gifts tied through a registered firm', () => {
  const B = d.bodies.find(b => b.key === 'ushouse');
  assert.ok(B && B.level === 'federal' && B.type === 'requests');
  const R = B.actions.filter(a => a.kind !== 'bill');
  assert.equal(R.length, 156);
  for (const a of R) {
    const ks = Object.keys(a.roll);
    assert.equal(ks.length, 1, a.id); assert.equal(a.roll[ks[0]], 'requested', a.id);
    assert.equal(a.result, 'requestedF'); assert.ok(en.has('res.requestedF'));
    assert.ok(a.ask > 0 && a.ask < 2e8, a.id + ' amount ' + a.ask);
    for (const l of LANGS) assert.ok(a.dateLabel[l] && a.title[l], a.id + ' label ' + l);
    assert.ok(a.links.some(l => l.t === 'record' && /\.house\.gov\//.test(l.url)), a.id + ' member page');
    for (const g of a.gifts) {
      assert.ok(['ldaFirm', 'ldaPac', 'ldaLob', 'ldaOwn'].includes(g.rel), a.id + ' rel ' + g.rel);
      assert.ok(en.has('how.s.' + g.rel));
      assert.ok(a.lobbied.length, a.id + ' gift but no registered lobbyist');
      assert.ok(a.lobbied.some(l => l.firm === g.firmName || l.name === g.firmName || (g.rel === 'ldaOwn' && l.for === g.forParty)), a.id + ' gift firm not among registrants: ' + g.firmName);
      assert.match(g.src, /^https:\/\/lda\.gov\/filings\/public\/contribution\//, a.id + ' LD-203 link');
      assert.ok(g.date >= '2025-01-01', a.id + ' cycle');
    }
    for (const l of a.lobbied) assert.match(l.url, /^https:\/\/lda\.gov\/filings\/public\/filing\//, a.id + ' LDA link');
  }
  for (const k of ['lobbiedF', 'noGiftF', 'howFed', 'offBallotF', 'srcL', 'cmteL', 'reqPage', 'how.s.noFec', 'st.norequests']) assert.ok(en.has(k), k);
  assert.ok(!d.others.some(o => o.body.en === 'U.S. Senate'), 'Moody has her own body now');
  assert.ok(/no Congressionally Directed Spending requests/.test(d.bodies.find(b => b.key === 'ussenate').coverage.en));
});

test('Congress floor votes: enacted laws, official roll calls, a quoted source, and PAC gifts from the named kind of business', () => {
  const fv = JSON.parse(readFileSync(new URL('../scripts/data/federal/floor-votes.json', import.meta.url)));
  const H = d.bodies.find(b => b.key === 'ushouse'), S = d.bodies.find(b => b.key === 'ussenate');
  assert.ok(S && S.level === 'federal' && S.onBallot.Moody, 'senate body for Moody');
  const votes = [...H.actions, ...S.actions].filter(a => a.kind === 'bill');
  assert.equal(votes.length, fv.bills.reduce((n, b) => n + b.votes.length, 0));
  for (const a of votes) {
    assert.equal(a.result, 'passed', a.id);
    assert.ok(a.links.some(l => l.t === 'vote' && /^https:\/\/(clerk\.house\.gov\/Votes\/|www\.senate\.gov\/legislative\/LIS\/roll_call_votes\/)/.test(l.url)), a.id + ' roll call link');
    assert.ok(a.links.some(l => ['cbo', 'crs', 'fr'].includes(l.t)), a.id + ' source link');
    for (const l of LANGS) assert.match(a.note[l], /\u201c.+\u201d/, a.id + ' quote ' + l);
    assert.match(a.note.en, /P\.L\. 119-\d+/, a.id + ' public law');
    const B = a.id.includes('-S') ? S : H;
    for (const k of Object.keys(a.roll)) assert.ok(B.onBallot[k], a.id + ' roll member ' + k);
    for (const g of a.gifts) {
      assert.equal(g.kind, 'class'); assert.equal(g.rel, 'clsF');
      assert.ok(g.donor.endsWith(' PAC'), a.id + ' donor ' + g.donor);
      for (const l of LANGS) assert.ok(g.occ[l], a.id + ' occ ' + l);
      assert.ok(g.date >= '2025-01-01', a.id + ' cycle');
      if (g.n) assert.ok(g.n > 1 && g.last >= g.date, a.id + ' range');
      assert.match(g.src, /^https:\/\/www\.fec\.gov\/data\/receipts\//);
    }
  }
  for (const k of ['gaveN', 'how.s.clsF', 'cboL', 'crsL', 'frL', 'howFedV']) assert.ok(en.has(k), k);
});

test('Angie Nixon (on the ballot for U.S. Senate) is on the Florida House tab with her six requests and her floor votes', () => {
  const B = d.bodies.find(b => b.key === 'flhouse');
  assert.equal(B.onBallot.Nixon.race.en, 'U.S. Senate');
  const req = B.actions.filter(a => a.kind === 'request' && a.roll.Nixon);
  assert.equal(req.length, 6);
  for (const a of req) assert.ok(a.budget && a.budget.ref === 'HF ' + a.ref.match(/APR (\d+)/)[1], a.id);
  assert.equal(B.actions.filter(a => a.kind === 'bill' && a.roll.Nixon).length, B.actions.filter(a => a.kind === 'bill').length);
  for (let i = 1; i < B.actions.length; i++) assert.ok(B.actions[i - 1].date >= B.actions[i].date, 'newest first at ' + B.actions[i].id);
});
