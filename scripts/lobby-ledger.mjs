// Where state budget dollars and lobbying-firm money meet: for every lobbying firm named on a state
// budget request form (House APR or Senate LFIR) filed by a legislator on the Nov 3 ballot, how much
// its clients asked for, how much made the final budget after vetoes, what the firm (its PAC, the firm
// itself, or its lobbyists) gave the legislators who filed those requests, and who they are.
// Run: node scripts/lobby-ledger.mjs  (reads public/data/decisions.json, writes public/data/lobby-ledger.json)
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../public/data/', import.meta.url);
const d = JSON.parse(readFileSync(new URL('decisions.json', root)));
const NONE = '_none';
const firmOf = l => (l && l.firm && !/^Page \d/.test(l.firm)) ? l.firm.trim() : null;
const funded = a => { const b = a.budget || {}; return b.status === 'in' && b.amount ? Math.max(0, b.amount - (b.vetoed || 0)) : 0; };
// A project filed in both chambers (an HF and an SF form) is one budget line; count its dollars once.
const projKey = a => [(a.budget || {}).fy, String(a.parties[0] || a.subject.en).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 30), (a.budget || {}).amount].join('|');
const giftKey = g => [g.acct, String(g.donor).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(), Number(g.amount), g.date].join('|');

const firms = {};
for (const B of d.bodies) {
  if (B.type !== 'requests' || B.level === 'federal') continue;
  for (const a of B.actions) {
    if (a.kind !== 'request') continue;
    const filer = Object.keys(a.roll).find(k => a.roll[k] === 'requested');
    const member = B.members.find(m => m.key === filer) || {};
    const names = [...new Set(a.lobbied.map(firmOf).filter(Boolean))];
    for (const name of names.length ? names : [NONE]) {
      const F = firms[name] = firms[name] || { firm: name, requests: 0, asked: 0, funded: 0, fundedN: 0, gifts: {}, members: {}, seen: new Set() };
      const mk = B.key + ':' + filer;
      const M = F.members[mk] = F.members[mk] || { body: B.key, key: filer, name: member.name, person: member.person, race: B.onBallot[filer] && B.onBallot[filer].race, requests: 0, asked: 0, funded: 0, fundedN: 0, gifts: {}, forms: [] };
      const f0 = funded(a), pk = projKey(a), dup = f0 && F.seen.has(pk), f = dup ? 0 : f0; if (f0) F.seen.add(pk);
      F.requests++; F.asked += a.ask || 0; F.funded += f; if (f0) F.fundedN++;
      M.requests++; M.asked += a.ask || 0; M.funded += f; if (f) M.fundedN++;
      M.forms.push({ id: a.id, ref: a.ref, title: a.subject.en, party: a.parties[0] || '', ask: a.ask || 0, funded: f0, dup: !!dup, status: (a.budget || {}).status || null, vetoed: (a.budget || {}).vetoed || 0 });
      if (name === NONE) continue;
      for (const g of a.gifts) {
        if (g.firmName !== name || g.date < '2025-01-01') continue;
        const k = giftKey(g);
        if (!F.gifts[k]) F.gifts[k] = { to: g.to, acct: g.acct, donor: g.donor, amount: Number(g.amount), date: g.date, rel: g.rel || g.kind, lobbyist: g.lobbyist || null };
        if (!M.gifts[k]) M.gifts[k] = F.gifts[k];
      }
    }
  }
}
const sum = o => Math.round(Object.values(o).reduce((n, g) => n + g.amount, 0) * 100) / 100;
const rows = Object.values(firms).map(F => ({
  firm: F.firm === NONE ? null : F.firm, requests: F.requests, asked: F.asked, funded: F.funded, fundedN: F.fundedN,
  gave: sum(F.gifts), giftN: Object.keys(F.gifts).length, giftDonors: [...new Set(Object.values(F.gifts).map(g => g.donor))].length,
  members: Object.values(F.members).map(M => ({ body: M.body, key: M.key, name: M.name, person: M.person, race: M.race, requests: M.requests, asked: M.asked, funded: M.funded, fundedN: M.fundedN, gave: sum(M.gifts), gifts: Object.values(M.gifts).sort((p, q) => p.date.localeCompare(q.date)), forms: M.forms.sort((p, q) => q.funded - p.funded || q.ask - p.ask) })).sort((p, q) => q.funded - p.funded || q.gave - p.gave),
})).sort((p, q) => (p.firm === null) - (q.firm === null) || q.funded - p.funded || q.gave - p.gave);

// Scale: U.S. Census QuickFacts (population July 1, 2025; median household income 2020-2024 in 2024 dollars);
// state budgets as signed (flgov.com Jun 30, 2025; WLRN Jun 30, 2026).
const scale = { flPop: 23462518, flIncome: 74568, mdcPop: 2802029, mdcIncome: 71753, budget: { '2025-26': 117.4e9, '2026-27': 117.6e9 }, vetoes: { '2025-26': 567e6, '2026-27': 810e6 },
  src: { census: 'https://www.census.gov/quickfacts/fact/table/FL,miamidadecountyflorida/PST045224', b2025: 'https://www.flgov.com/eog/news/press/2025/governor-ron-desantis-signs-florida-fiscal-year-2025-2026-budget', b2026: 'https://www.wlrn.org/government-politics/2026-06-30/desantis-signs-florida-budget-what-did-he-veto' } };
const seenAll = new Set(); let fundedAll = 0, fundedFirm = 0;
for (const B of d.bodies) if (B.type === 'requests' && B.level !== 'federal') for (const a of B.actions) {
  if (a.kind !== 'request' || !funded(a)) continue; const k = projKey(a); if (seenAll.has(k)) continue; seenAll.add(k);
  fundedAll += funded(a); if (a.lobbied.some(firmOf)) fundedFirm += funded(a);
}
const totals = { firms: rows.filter(r => r.firm).length, requests: rows.reduce((n, r) => n + r.requests, 0), funded: fundedAll, fundedViaFirm: fundedFirm, projects: seenAll.size, gave: rows.reduce((n, r) => n + r.gave, 0) };
writeFileSync(new URL('lobby-ledger.json', root), JSON.stringify({ updated: d.updated, totals, scale, rows }, null, 1) + '\n');
console.log(`${totals.firms} firms, ${totals.requests} requests, $${totals.funded.toLocaleString()} funded ($${totals.fundedViaFirm.toLocaleString()} through a firm), $${totals.gave.toLocaleString()} given`);
