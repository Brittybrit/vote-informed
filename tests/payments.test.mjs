// Committee spending: every payment line kept, and online/social work totaled from the filer's own words.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker } from './load-worker.mjs';
const w = await loadWorker(['digitalSpend', 'paidList']);

test('digital spending counts only lines whose filed purpose names online or social work', () => {
  const paid = new Map([
    ['big', { name: 'Big Tuesday Media', amount: 300, what: new Map(), items: [
      { date: '2026-07-24', what: 'PR & Social Media Engagements', amount: 100 },
      { date: '2026-07-24', what: 'Digital Media', amount: 50 },
      { date: '2026-08-21', what: 'Direct Mail', amount: 150 }] }],
    ['art', { name: 'Artisan Media Group LLC', amount: 80, what: new Map(), items: [{ date: '2026-09-09', what: 'Spanish TV & Radio', amount: 80 }] }],
    ['ber', { name: 'Berthier Group Inc', amount: 20, what: new Map(), items: [{ date: '2026-08-25', what: 'Robo Calls', amount: 20 }] }]
  ]);
  const payees = w.paidList(paid);
  assert.equal(payees[0].items.length, 3);
  const d = w.digitalSpend(payees);
  assert.equal(d.amount, 150);
  assert.deepEqual(d.payees, [{ name: 'Big Tuesday Media', amount: 150 }]);
});
