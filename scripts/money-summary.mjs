// One-line money summary per incumbent on the Nov 3 ballot, built from public/data/decisions.json.
// Run: node scripts/money-summary.mjs   (writes public/data/money-summary.json)
// tests/money-summary.test.mjs fails if the JSON and this builder disagree.
//
// Rules:
// - Only gifts dated 2025-01-01 or later count (2025-2026 cycle rule).
// - A gift is counted once, however many actions it ties to.
// - "Before": a gift dated before at least one action it ties to.
// - State legislators: money tied to budget requests and money tied only to bill votes are kept apart.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const CYCLE_START = '2025-01-01';

function giverKey(n) {
  let s = String(n || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ');
  s = s.replace(/\b(INC|LLC|LLP|LLLP|LP|PA|P A|CORP|CORPORATION|CO|LTD|THE)\b/g, ' ');
  return s.split(/\s+/).filter(Boolean).join(' ');
}
const giftKey = g => [g.acct, giverKey(g.donor), Number(g.amount), g.date].join('|');

export function build(decisions, officesHeld) {
  const byPerson = {};
  for (const [k, pid] of Object.entries(officesHeld.byBallot)) (byPerson[pid] = byPerson[pid] || []).push(k);
  const people = {}, byBallot = {};
  const add = (pid, entry) => {
    people[pid] = entry;
    for (const k of byPerson[pid] || []) byBallot[k] = pid;
  };

  for (const B of decisions.bodies) {
    const state = B.type === 'requests';
    for (const [key, ob] of Object.entries(B.onBallot)) {
      const m = B.members.find(x => x.key === key) || {};
      if (!m.person) continue;
      const accts = new Set(ob.accounts);
      const tied = [];
      for (const a of B.actions) {
        const gs = (a.gifts || []).filter(g => g.to === key && accts.has(g.acct) && g.date >= CYCLE_START);
        if (gs.length) tied.push([a, gs]);
      }
      const gifts = new Map(); // key -> {amount, date, acct, actionDates}
      for (const [a, gs] of tied) for (const g of gs) {
        const k = giftKey(g);
        if (!gifts.has(k)) gifts.set(k, { key: k, amount: Number(g.amount), date: g.date, acct: g.acct, donor: giverKey(g.donor), dates: [] });
        gifts.get(k).dates.push(a.date);
      }
      const all = [...gifts.values()];
      const sum = xs => Math.round(xs.reduce((n, g) => n + g.amount, 0) * 100) / 100;
      const before = all.filter(g => g.dates.some(d => g.date < d));
      const byAcct = {};
      for (const g of all) byAcct[g.acct] = (byAcct[g.acct] || 0) + g.amount;
      const e = {
        body: B.key, bodyName: B.name, name: m.name, last: key, kind: state ? 'state' : 'votes',
        total: sum(all), donors: new Set(all.map(g => g.donor)).size, gifts: all.length,
        before: before.length, beforeAmt: sum(before),
        accounts: Object.keys(byAcct).filter(a => byAcct[a] > 0).length,
      };
      if (state) {
        const req = tied.filter(([a]) => a.kind === 'request');
        const bills = tied.filter(([a]) => a.kind === 'bill');
        const reqKeys = new Set(req.flatMap(([, gs]) => gs.map(giftKey)));
        const billOnly = all.filter(g => !reqKeys.has(g.key));
        const funded = a => {
          const b = a.budget || {};
          return b.status === 'in' && b.amount ? Math.max(0, b.amount - (b.vetoed || 0)) : 0;
        };
        const reqGifts = all.filter(g => reqKeys.has(g.key));
        e.requests = {
          n: req.length, ask: sum(req.map(([a]) => ({ amount: a.ask || 0 }))),
          funded: sum(req.map(([a]) => ({ amount: funded(a) }))),
          money: sum(reqGifts), donors: new Set(reqGifts.map(g => g.donor)).size,
        };
        e.bills = {
          bills: new Set(bills.map(([a]) => a.ref)).size, votes: bills.length,
          yes: bills.filter(([a]) => a.roll[key] === 'yes').length,
          money: sum(billOnly), donors: new Set(billOnly.map(g => g.donor)).size,
        };
      } else {
        const v = { yes: 0, no: 0, away: 0 };
        for (const [a] of tied) { const x = a.roll[key]; if (x === 'yes') v.yes++; else if (x === 'no') v.no++; else v.away++; }
        e.items = tied.length; e.yes = v.yes; e.no = v.no; e.away = v.away;
        e.split = tied.filter(([a]) => a.tally && a.tally[1] > 0).length;
      }
      add(m.person, e);
    }
  }
  // People reviewed with nothing to show
  for (const o of decisions.others || []) for (const p of o.people) {
    const keys = Object.keys(officesHeld.byBallot).filter(k => k.split('|')[1] === p.name);
    const pid = keys.length && officesHeld.byBallot[keys[0]];
    if (!pid || people[pid]) continue;
    add(pid, { body: null, bodyName: o.body, name: p.name, kind: 'none', status: p.status });
  }
  return { updated: decisions.updated, cycleStart: CYCLE_START, people, byBallot };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL('../public/data/', import.meta.url);
  const d = JSON.parse(readFileSync(new URL('decisions.json', root)));
  const h = JSON.parse(readFileSync(new URL('offices-held.json', root)));
  const out = build(d, h);
  writeFileSync(new URL('money-summary.json', root), JSON.stringify(out, null, 1) + '\n');
  console.log(Object.keys(out.people).length + ' people');
}
