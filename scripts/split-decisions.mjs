// Splits public/data/decisions.json (the source of truth every script in scripts/ reads and writes) into the
// files the site serves, so no single asset nears Cloudflare's 25 MiB per-file limit:
//   public/data/decisions/index.json   everything except each body's actions, plus per body
//                                      actionCount (its number of actions) and cardCounts (cards it adds to each
//                                      race group on /decisions, so the tabs can show counts before any body loads)
//   public/data/decisions/<key>.json   one body, exactly as in decisions.json, with its actions
// decisions.json itself is not deployed (public/.assetsignore).
// Run: node scripts/split-decisions.mjs   (scripts/money-summary.mjs runs it too, so every chain ending in
// money-summary.mjs keeps the split current). tests/split-decisions.test.mjs fails if the split is stale.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const DATA = new URL('../public/data/', import.meta.url);
export const SPLIT_DIR = new URL('decisions/', DATA);

// The /decisions page's own grouping (public/decision-card.js), so the counts are the ones the page shows.
function cardCounts(d) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('../public/decision-card.js', import.meta.url), 'utf8'), ctx);
  const G = ctx.window.DecisionCard(() => 'en').groupsOf(d);
  const out = {};
  for (const g of G) for (const c of g.cards) {
    const k = c.B.key;
    out[k] = out[k] || {};
    out[k][g.key] = (out[k][g.key] || 0) + 1;
  }
  return out;
}

export function split(d) {
  const counts = cardCounts(d);
  const index = {}, bodies = {};
  for (const [k, v] of Object.entries(d)) {
    if (k !== 'bodies') { index[k] = v; continue; }
    index.bodies = v.map(B => {
      bodies[B.key] = B;
      const { actions, ...rest } = B;
      return { ...rest, actionCount: (actions || []).length, cardCounts: counts[B.key] || {} };
    });
  }
  return { index, bodies };
}

// Rebuilds decisions.json's shape from the split files (used by the test and as the reference for readers).
export function join(index, bodies) {
  return { ...index, bodies: index.bodies.map(b => bodies[b.key]) };
}

export function writeSplit(d) {
  const { index, bodies } = split(d);
  mkdirSync(SPLIT_DIR, { recursive: true });
  for (const f of readdirSync(SPLIT_DIR)) if (f.endsWith('.json') && f !== 'index.json' && !bodies[f.slice(0, -5)]) unlinkSync(new URL(f, SPLIT_DIR));
  for (const [k, B] of Object.entries(bodies)) writeFileSync(new URL(k + '.json', SPLIT_DIR), JSON.stringify(B) + '\n');
  writeFileSync(new URL('index.json', SPLIT_DIR), JSON.stringify(index) + '\n');
  return { index, bodies };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const d = JSON.parse(readFileSync(new URL('decisions.json', DATA)));
  const { bodies } = writeSplit(d);
  console.log('decisions split: index.json + ' + Object.keys(bodies).length + ' body files');
}
