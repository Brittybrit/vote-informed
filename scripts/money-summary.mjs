// One-line money summary per incumbent on the Nov 3 ballot, built from public/data/decisions.json.
// Run: node scripts/money-summary.mjs   (writes public/data/money-summary.json)
// tests/money-summary.test.mjs fails if the JSON and this builder disagree.
//
// Rules:
// - Only gifts dated 2025-01-01 or later count (2025-2026 cycle rule).
// - A gift is counted once, however many actions it ties to.
// - "Before": a gift dated before at least one action it ties to.
// - State legislators: money tied to budget requests and money tied only to bill votes are kept apart.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const CYCLE_START = '2025-01-01';

function giverKey(n) {
  let s = String(n || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ');
  s = s.replace(/\b(INC|LLC|LLP|LLLP|LP|PA|P A|CORP|CORPORATION|CO|LTD|THE)\b/g, ' ');
  return s.split(/\s+/).filter(Boolean).join(' ');
}
const giftKey = g => [g.acct, giverKey(g.donor), Number(g.amount), g.date].join('|');

const PRON = (() => { try { return JSON.parse(readFileSync(new URL('./data/pronouns.json', import.meta.url), 'utf8')); } catch (e) { return { she: [], he: [] }; } })();
const pronOf = pid => PRON.she.includes(pid) ? 'she' : PRON.he.includes(pid) ? 'he' : undefined;

// Share of the official's actions tied to a donor, out of a list that was NOT built by starting from donors
// (otherwise every item would tie to one by construction and the share would mean nothing):
// - county: every commission action that benefited a named company or group, while seated
// - cities with a lobbyist registry: every item a registered lobbyist worked on, while seated
// - state legislators and Congress: every budget or earmark request the member filed
// - Cabinet: every Board of Trustees item while seated plus the office's own actions reviewed
// Cities whose lists start from donors (no registry online) get no share.
const CAST = new Set(['yes', 'no']);
const DONOR_FIRST = new Set(['southmiami', 'pinecrest', 'medley']);
function shareOf(B, key, tied) {
  const tiedIds = new Set(tied.map(([a]) => a.id));
  const sat = a => a.roll && CAST.has(a.roll[key]);
  let pool, def;
  if (B.type === 'requests') { pool = B.actions.filter(a => a.kind === 'request' && a.roll && a.roll[key] === 'requested'); def = B.level === 'federal' ? 'earmarks' : 'requests'; }
  else if (B.cabinet) { const n = (B.reviewed || {})[key]; return n ? { def: 'cabinet', n, tied: tiedIds.size } : undefined; }
  else if (B.key === 'county') { pool = B.actions.filter(sat); def = 'county'; }
  else if (B.universe && B.universe.built === 'actions') { pool = B.actions.filter(a => a.universe && sat(a)); def = 'actions'; }
  else if (DONOR_FIRST.has(B.key)) return { def: 'donorFirst' };
  else { pool = B.actions.filter(a => sat(a) && (a.lobbied || []).length); def = 'lobbied'; }
  if (!pool.length) return undefined;
  // A list whose record gives most of the member's votes as unknown (agenda-only meetings) gets no share:
  // the few recorded votes are not a fair count of what the member did.
  if (def === 'actions') { const seated = B.actions.filter(a => a.universe && a.roll && a.roll[key] != null).length; if (pool.length * 2 < seated && B.actions.filter(a => a.universe && a.roll && a.roll[key] === 'unknown').length * 2 > seated) return undefined; }
  return { def, n: pool.length, tied: pool.filter(a => tiedIds.has(a.id)).length };
}

export function build(decisions, officesHeld) {
  const byPerson = {};
  for (const [k, pid] of Object.entries(officesHeld.byBallot)) (byPerson[pid] = byPerson[pid] || []).push(k);
  const people = {}, byBallot = {};
  const add = (pid, entry) => {
    // A person with actions in two bodies (Ingoglia: Senate requests, then Cabinet votes) keeps the line
    // with more money behind it; the dossier still shows both bodies' cards.
    if (people[pid] && (people[pid].total || 0) > (entry.total || 0)) return;
    if (pronOf(pid)) entry.pron = pronOf(pid);
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
        // On a voting body (city, county), a tie needs a vote the member cast: absent, excused, abstained,
        // recused or a vote the minutes do not give is not counted (Brit, Oct 24, 2026).
        if (!state && !B.cabinet && !CAST.has((a.roll || {})[key])) continue;
        // Once a body's bill cards are a full list, a bill card outside it (picked from donors earlier) no
        // longer adds money or ties: only laws whose analysis names the business count
        if (a.kind === 'bill' && !a.universe && B.actions.some(x => x.kind === 'bill' && x.universe)) continue;
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
        pid: m.person, body: B.key, bodyName: B.cabinet ? { en: 'Cabinet or their own office', es: 'el Gabinete o su propio despacho', ht: 'Kabinè a oswa pwòp biwo yo' } : B.name, name: m.name, last: key, kind: state ? (B.level === 'federal' ? 'federal' : 'state') : B.cabinet ? 'cabinet' : 'votes',
        total: sum(all), donors: new Set(all.map(g => g.donor)).size, gifts: all.length,
        before: before.length, beforeAmt: sum(before), afterAmt: Math.round((sum(all) - sum(before)) * 100) / 100,
        accounts: Object.keys(byAcct).filter(a => byAcct[a] > 0).length,
      };
      // Campaign money and political committee money, kept apart so the line can say which got what
      const isCmte = a => /^(pc|pac)/i.test(a) || /political committee|\bPAC\b/i.test(String(((B.accounts || {})[a] || {}).en || (B.accounts || {})[a] || ''));
      e.campaignAmt = Math.round(Object.entries(byAcct).filter(([a]) => !isCmte(a)).reduce((n, [, v]) => n + v, 0) * 100) / 100;
      e.committeeAmt = Math.round(Object.entries(byAcct).filter(([a]) => isCmte(a)).reduce((n, [, v]) => n + v, 0) * 100) / 100;
      if (state) {
        const req = tied.filter(([a]) => a.kind === 'request');
        const bills = tied.filter(([a]) => a.kind === 'bill');
        const reqKeys = new Set(req.flatMap(([, gs]) => gs.map(giftKey)));
        // Bill money counts only donors tied to bills the member voted yes on, since the summary line
        // says "voted yes on ... bills that help kinds of business that gave".
        const yesKeys = new Set(bills.filter(([a]) => a.roll[key] === 'yes').flatMap(([, gs]) => gs.map(giftKey)));
        const billOnly = all.filter(g => !reqKeys.has(g.key) && yesKeys.has(g.key));
        // Donors tied only to bills the member did not vote yes on (voted no or did not vote)
        const billOther = all.filter(g => !reqKeys.has(g.key) && !yesKeys.has(g.key));
        const funded = a => {
          const b = a.budget || {};
          return b.status === 'in' && b.amount ? Math.max(0, b.amount - (b.vetoed || 0)) : 0;
        };
        const reqGifts = all.filter(g => reqKeys.has(g.key));
        e.requests = {
          n: req.length, ask: sum(req.map(([a]) => ({ amount: a.ask || 0 }))),
          funded: sum(req.map(([a]) => ({ amount: funded(a) }))),
          money: sum(reqGifts), donors: new Set(reqGifts.map(g => g.donor)).size,
          inBudget: sum(req.map(([a]) => ({ amount: (a.budget || {}).status === 'in' ? (a.budget.amount || 0) : 0 }))),
          vetoed: sum(req.map(([a]) => ({ amount: (a.budget || {}).status === 'in' ? Math.min(a.budget.amount || 0, a.budget.vetoed || 0) : 0 }))),
          inN: req.filter(([a]) => (a.budget || {}).status === 'in').length,
        };
        e.bills = {
          bills: new Set(bills.map(([a]) => a.ref)).size, votes: bills.length,
          yes: bills.filter(([a]) => a.roll[key] === 'yes').length,
          money: sum(billOnly), donors: new Set(billOnly.map(g => g.donor)).size,
          no: bills.filter(([a]) => a.roll[key] === 'no').length,
          otherMoney: sum(billOther), otherDonors: new Set(billOther.map(g => g.donor)).size,
        };
        // When the body's bill cards are a full list (every enacted law whose analysis names a kind of business
        // it helps, built without looking at donors), count the laws the member voted on and how many drew
        // money from donors in that kind of business. One law can have a vote in each chamber: counted once.
        const uni = B.actions.filter(a => a.kind === 'bill' && a.universe && ['yes', 'no'].includes(a.roll[key]));
        if (uni.length) {
          const laws = new Set(uni.map(a => a.ref));
          const tiedLaws = new Set(uni.filter(a => (a.gifts || []).some(g => g.to === key && accts.has(g.acct) && g.date >= CYCLE_START)).map(a => a.ref));
          e.bills.universe = { n: laws.size, tied: tiedLaws.size };
        }
      } else {
        const v = { yes: 0, no: 0, away: 0, acted: 0, abst: 0, unk: 0 };
        for (const [a] of tied) { const x = a.roll[key]; if (x === 'yes') v.yes++; else if (x === 'no') v.no++; else if (x === 'acted') v.acted++; else if (x === 'abstain' || x === 'recused') v.abst++; else if (x === 'unknown') v.unk++; else v.away++; }
        e.items = tied.length; e.yes = v.yes; e.no = v.no; e.away = v.away;
        if (v.abst) e.abst = v.abst;
        if (v.unk) e.unk = v.unk;
        if (B.cabinet) { e.acted = v.acted; e.votes = tied.length - v.acted; }
        e.split = tied.filter(([a]) => a.tally && a.tally[1] > 0).length;
        // The share line counts actions since January 2025; when older cards are in the items, say from when
        const y0 = tied.map(([a]) => a.date).sort()[0];
        if (B.universe && y0 && y0 < '2025') e.since = Number(y0.slice(0, 4));
      }
      e.share = shareOf(B, key, tied);
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

// One file per incumbent (public/data/ties/<person>.json) with exactly the actions and gifts their
// summary counts, so the dossier can show the cards behind the one-line summary without loading
// all of decisions.json. Gifts to other members are left out; the full roll call stays.
export function tiedActions(B, key) {
  const accts = new Set(B.onBallot[key].accounts);
  const out = [];
  for (const a of B.actions) {
    if (B.type !== 'requests' && !B.cabinet && !CAST.has((a.roll || {})[key])) continue;
    if (a.kind === 'bill' && !a.universe && B.actions.some(x => x.kind === 'bill' && x.universe)) continue;
    const gifts = (a.gifts || []).filter(g => g.to === key && accts.has(g.acct) && g.date >= CYCLE_START);
    if (!gifts.length) continue;
    const x = { ...a, gifts };
    if (a.giftNotes) { if (a.giftNotes[key]) x.giftNotes = { [key]: a.giftNotes[key] }; else delete x.giftNotes; }
    out.push(x);
  }
  return out.sort((p, q) => String(q.date).localeCompare(String(p.date)) || String(p.id).localeCompare(String(q.id)));
}

export function buildTies(decisions) {
  const files = {};
  for (const B of decisions.bodies) for (const key of Object.keys(B.onBallot)) {
    const m = B.members.find(x => x.key === key) || {};
    if (!m.person) continue;
    const ob = B.onBallot[key];
    const accounts = {};
    for (const k of ob.accounts) if (B.accounts[k]) accounts[k] = B.accounts[k];
    const acts = tiedActions(B, key);
    const money = f => (f ? f.actions : []).reduce((n, a) => n + a.gifts.reduce((x, g) => x + Number(g.amount), 0), 0);
    if (files[m.person] && money(files[m.person]) > money({ actions: acts })) continue;   // same choice as build()
    files[m.person] = {
      updated: decisions.updated, cycleStart: CYCLE_START,
      body: { key: B.key, name: B.name, type: B.type || null, level: B.level || null, members: B.members.map(x => ({ key: x.key, name: x.name })),
        onBallot: { [key]: ob }, accounts, registries: B.registries || null },
      actions: acts,
    };
  }
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL('../public/data/', import.meta.url);
  const d = JSON.parse(readFileSync(new URL('decisions.json', root)));
  const h = JSON.parse(readFileSync(new URL('offices-held.json', root)));
  const out = build(d, h);
  writeFileSync(new URL('money-summary.json', root), JSON.stringify(out, null, 1) + '\n');
  const dir = new URL('ties/', root), ties = buildTies(d);
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (f.endsWith('.json') && !ties[f.slice(0, -5)]) unlinkSync(new URL(f, dir));
  for (const [pid, t] of Object.entries(ties)) writeFileSync(new URL(pid + '.json', dir), JSON.stringify(t) + '\n');
  console.log(Object.keys(out.people).length + ' people, ' + Object.keys(ties).length + ' tie files');
}
