import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { cancelRefunds } from '../scripts/lib/refunds.mjs';
import { donorRows, norm } from '../scripts/lib/city.mjs';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const decisions = JSON.parse(read('../public/data/decisions.json'));

test('a refund cancels the latest earlier gift of the same amount from the same donor to the same account', () => {
  const rows = [
    { acct: 'x', donor: 'MARIO  GARCIA-SERRA', amount: 1000, date: '2024-06-12' },
    { acct: 'x', donor: 'MARIO GARCIA-SERRA', amount: 500, date: '2025-01-20' },
    { acct: 'x', donor: 'MARIO GARCIA-SERRA', amount: 500, date: '2025-01-29' },
    { acct: 'x', donor: 'Mario Garcia-Serra', amount: -500, date: '2025-02-07' },
    { acct: 'y', donor: 'MARIO GARCIA-SERRA', amount: 500, date: '2025-01-30' },
    { acct: 'x', donor: 'ANA LOPEZ', amount: 500, date: '2025-03-01' },
  ];
  const { live, refunded } = cancelRefunds(rows, norm);
  assert.deepEqual(refunded.map(r => r.date), ['2025-01-29']);
  assert.deepEqual(live.map(r => r.date).sort(), ['2024-06-12', '2025-01-20', '2025-01-30', '2025-03-01']);
  assert.ok(live.every(r => r.amount > 0));
});

test('a refund with no matching earlier gift cancels nothing', () => {
  const rows = [
    { acct: 'x', donor: 'A B', amount: 250, date: '2025-05-01' },
    { acct: 'x', donor: 'A B', amount: -250, date: '2025-04-01' },
    { acct: 'x', donor: 'A B', amount: -100, date: '2025-06-01' },
  ];
  const { live, refunded } = cancelRefunds(rows, norm);
  assert.equal(refunded.length, 0);
  assert.equal(live.length, 1);
});

test('two refunds cancel two gifts, one each', () => {
  const rows = [
    { acct: 'x', donor: 'A B', amount: 1000, date: '2025-01-01' },
    { acct: 'x', donor: 'A B', amount: 1000, date: '2025-01-01' },
    { acct: 'x', donor: 'A B', amount: -1000, date: '2025-02-01' },
    { acct: 'x', donor: 'A B', amount: -1000, date: '2025-02-02' },
  ];
  const { live, refunded } = cancelRefunds(rows, norm);
  assert.equal(refunded.length, 2);
  assert.equal(live.length, 0);
});

test('no city card shows a gift its report refunded', () => {
  for (const B of decisions.bodies) {
    if (!B.universe || B.universe.built !== 'actions' || !existsSync(new URL(`../scripts/data/city/${B.key}/actions.json`, import.meta.url))) continue;
    const BJ = existsSync(new URL(`../scripts/data/city/${B.key}/body.json`, import.meta.url)) ? JSON.parse(read(`../scripts/data/city/${B.key}/body.json`)) : {};
    const { live, refunded } = donorRows(B.key, B, BJ.ballotNames || {});
    const k = g => [g.to, g.acct, norm(g.donor), Number(g.amount), g.date].join('|');
    const liveKeys = new Set(live.map(k));
    const gone = new Set(refunded.map(k).filter(x => !liveKeys.has(x)));
    for (const a of B.actions) for (const g of a.gifts || []) assert.ok(!gone.has(k(g)), `${B.key} ${a.id}: ${g.donor} $${g.amount} ${g.date} was refunded`);
  }
});

test('city donor rows never include a negative or zero amount', () => {
  for (const B of decisions.bodies) {
    if (!B.universe || B.universe.built !== 'actions' || !existsSync(new URL(`../scripts/data/city/${B.key}/actions.json`, import.meta.url))) continue;
    const BJ = existsSync(new URL(`../scripts/data/city/${B.key}/body.json`, import.meta.url)) ? JSON.parse(read(`../scripts/data/city/${B.key}/body.json`)) : {};
    for (const r of donorRows(B.key, B, BJ.ballotNames || {}).live) assert.ok(r.amount > 0, B.key + ' ' + r.donor);
  }
});
