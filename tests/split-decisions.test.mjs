// The served split of decisions.json (public/data/decisions/) matches the source, and no data file nears
// Cloudflare's 25 MiB per-asset limit. Fix a failure with: node scripts/split-decisions.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import vm from 'node:vm';
import { split, join } from '../scripts/split-decisions.mjs';

const DATA = new URL('../public/data/', import.meta.url);
const read = p => JSON.parse(readFileSync(new URL(p, DATA)));
const d = read('decisions.json');
const index = read('decisions/index.json');
const files = readdirSync(new URL('decisions/', DATA)).filter(f => f.endsWith('.json') && f !== 'index.json');
const bodies = Object.fromEntries(files.map(f => [f.slice(0, -5), read('decisions/' + f)]));

test('split files match decisions.json (run node scripts/split-decisions.mjs)', () => {
  const want = split(d);
  assert.deepEqual(index, JSON.parse(JSON.stringify(want.index)));
  assert.deepEqual(Object.keys(bodies).sort(), d.bodies.map(b => b.key).sort(), 'one file per body, no strays');
  for (const B of d.bodies) assert.deepEqual(bodies[B.key], B, B.key);
  assert.deepEqual(join(index, bodies), d);
  for (const b of index.bodies) {
    assert.ok(!('actions' in b), b.key + ' index carries actions');
    assert.equal(b.actionCount, bodies[b.key].actions.length, b.key);
  }
});

test('index counts give the same race tabs as the full data on /decisions', () => {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('../public/decision-card.js', import.meta.url), 'utf8'), ctx);
  const DC = ctx.window.DecisionCard(() => 'en');
  const full = DC.groupsOf(d), lite = DC.groupsOf(JSON.parse(JSON.stringify(index)));
  assert.deepEqual(lite.map(g => [g.key, g.count]), full.map(g => [g.key, g.cards.length]));
  for (const g of lite) assert.equal(g.cards, null, g.key + ' should wait for its body files');
});

test('no file in public/data is over 20 MB', () => {
  const walk = u => readdirSync(u, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(new URL(e.name + '/', u)) : [new URL(e.name, u)]);
  const ignored = new Set(['decisions.json']);   // public/.assetsignore: not deployed
  for (const f of walk(DATA)) {
    const rel = f.pathname.slice(DATA.pathname.length);
    if (ignored.has(rel)) continue;
    assert.ok(statSync(f).size <= 20 * 1000 * 1000, rel + ' is ' + statSync(f).size + ' bytes');
  }
});

test('decisions.json is kept out of the deploy', () => {
  const ign = readFileSync(new URL('../public/.assetsignore', import.meta.url), 'utf8').split('\n').map(s => s.trim());
  assert.ok(ign.includes('/data/decisions.json'));
  assert.match(readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8'), /directory = "\.\/public"/);
});
