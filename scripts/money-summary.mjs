// One-line money summary per incumbent on the Nov 3 ballot, built from public/data/decisions.json.
// Run: node scripts/money-summary.mjs   (writes public/data/money-summary.json, public/data/ties/, and the
// served split of decisions.json in public/data/decisions/ via scripts/split-decisions.mjs)
// tests/money-summary.test.mjs fails if the JSON and this builder disagree.
//
// Rules:
// - Only gifts dated 2025-01-01 or later count (2025-2026 cycle rule), except federal members, whose gifts
//   count from one cycle before their tenure began (giftStart); so do county members with a tenure entry (Gilbert)
//   and the full-tenure city lists (TENURE_CITIES).
// - A gift is counted once, however many actions it ties to.
// - "Before": a gift dated before at least one action it ties to.
// - State legislators: money tied to budget requests and money tied only to bill votes are kept apart.
// - In the donor's favor only (Brit, Oct 27, 2026): every headline number (money, donors, gifts, before/after,
//   items, the share line's tied count) counts only actions that went the donor's way: a yes vote on an item or
//   law that helps the donor, a budget or earmark request the member filed for them, or an action the member
//   took as head of the office (IN_FAVOR). A no vote, an absence, an abstention, a recusal or a vote the record
//   does not give never counts. Donors tied only to items the member voted no on are kept apart in `against`.
// - Unanimous votes are not ties (Brit, Oct 27, 2026): a yes vote counts only when the record shows at least one no
//   (scripts/lib/contested.mjs). Unanimous votes, and votes whose tally is not known, also leave the share line's pool,
//   so the share is of the contested votes the member cast. Requests and office actions are not votes: unaffected.
// - $1,000 materiality threshold (Brit, Oct 27, 2026, "Option A"; scripts/lib/materiality.mjs): a donor counts in any
//   headline number only when it is an organization, a registered lobbyist tied through a lobbying registration, or a
//   person whose total giving to the official (every gift on the body's cards to the official's accounts in the
//   window, grouped by giverKey) is $1,000 or more. Persons below stay on the cards, marked belowThreshold.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { contested } from './lib/contested.mjs';
import { materiality, INDIVIDUAL_MIN_TOTAL } from './lib/materiality.mjs';
import { fileURLToPath } from 'node:url';

export const CYCLE_START = '2025-01-01';
// Federal bodies built over each member's full tenure (B.tenure[key] = { start, giftsFrom }) count gifts
// from one cycle before the member took office (Brit, Oct 25, 2026). The County Commission does the same for each
// member with a B.tenure entry (Gilbert: from 2019); members without one (Lopez) and everything else keep CYCLE_START.
// City lists built back to each incumbent's tenure start (Coral Gables, Doral, South Miami) do the same, from
// scripts/data/city/<slug>/body.json tenure (Lago from 2011, Castro 2021, Porras 2020, South Miami 2020).
export const TENURE_CITIES = new Set(['coralgables', 'doral', 'southmiami', 'cutlerbay', 'pinecrest', 'keybiscayne', 'sunnyisles', 'medley', 'northmiami', 'aventura', 'nmb', 'opalocka']);
// The Florida House list runs from the 2023 session (scripts/state-tenure.mjs): Basabe, Gantt, Chambliss, Porras and
// Nixon from Nov 4, 2020, Redondo from Nov 9, 2022; Blanco (seated Nov 2024) has no entry and keeps CYCLE_START.
// The Florida Senate list runs from the 2021 session: Garcia and Rodriguez from Nov 7, 2018, Calatayud and Ingoglia from
// Nov 4, 2020 (scripts/state-tenure.mjs).
export const TENURE_STATE = new Set(['flhouse', 'flsenate']);
export const giftStart = (B, key) => ((B.level === 'federal' || B.key === 'county' || TENURE_CITIES.has(B.key) || TENURE_STATE.has(B.key)) && B.tenure && B.tenure[key] && B.tenure[key].giftsFrom) || CYCLE_START;

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
// CAST: votes the member cast, yes or no; the share line's pool of actions (the denominator).
// IN_FAVOR: actions that went the donor's way; the only ones whose donors count toward any headline number.
export const CAST = new Set(['yes', 'no']);
export const IN_FAVOR = new Set(['yes', 'requested', 'acted']);
export const inFavor = (a, key) => { const v = (a.roll || {})[key]; return v === 'yes' ? contested(a) : IN_FAVOR.has(v); };
// Which actions a member's summary looks at, before the vote: a body's full bill list replaces bill cards picked
// from donors earlier; a law voted before a member of Congress was seated has no vote for them.
function considered(B, a, key) {
  if (a.kind === 'bill' && !a.universe && B.actions.some(x => x.kind === 'bill' && x.universe)) return false;
  if (B.level === 'federal' && a.kind === 'bill' && !(a.roll && a.roll[key] != null)) return false;
  return true;
}
const giftsOf = (B, a, key, accts, G0) => (a.gifts || []).filter(g => g.to === key && accts.has(g.acct) && g.date >= G0);
// Which of this official's donors count (scripts/lib/materiality.mjs). Totals are over every gift on the body's cards
// to the official's accounts in the window, whatever the vote, each gift once.
export function materialityOf(B, key) {
  const accts = new Set(B.onBallot[key].accounts), G0 = giftStart(B, key);
  const all = B.actions.flatMap(a => considered(B, a, key) ? giftsOf(B, a, key, accts, G0) : []);
  return materiality(all, { donorOf: g => giverKey(g.donor), amountOf: g => g.amount, giftId: giftKey });
}
// Marks every gift to an official on the ballot whose donor is a person below the threshold (belowThreshold: true),
// so the cards can list it as not counted. Recomputed on every build; returns how many gifts changed.
export function markBelowThreshold(decisions) {
  let changed = 0;
  for (const B of decisions.bodies) {
    const M = {};
    for (const key of Object.keys(B.onBallot || {})) if (B.onBallot[key].accounts) M[key] = materialityOf(B, key);
    for (const a of B.actions) for (const g of a.gifts || []) {
      const below = !!(M[g.to] && !M[g.to].counts(g));
      if (below && !g.belowThreshold) { g.belowThreshold = true; changed++; }
      else if (!below && 'belowThreshold' in g) { delete g.belowThreshold; changed++; }
    }
  }
  return changed;
}
const DONOR_FIRST = new Set(['southmiami', 'pinecrest', 'medley']);
function shareOf(B, key, tied) {
  const tiedIds = new Set(tied.map(([a]) => a.id));
  // the pool: contested votes the member cast (a unanimous vote, or one whose tally is not known, is left out)
  const sat = a => a.roll && CAST.has(a.roll[key]) && contested(a);
  let pool, def;
  if (B.type === 'requests') { pool = B.actions.filter(a => a.kind === 'request' && a.roll && a.roll[key] === 'requested'); def = B.level === 'federal' ? 'earmarks' : 'requests'; }
  else if (B.cabinet) { const n = (B.reviewed || {})[key]; return n ? { def: 'cabinet', n, tied: tiedIds.size, from: '2025-01' } : undefined; }
  else if (B.key === 'county') { pool = B.actions.filter(sat); def = 'county'; }
  else if (B.universe && B.universe.built === 'actions') { pool = B.actions.filter(a => a.universe && sat(a)); def = 'actions'; }
  else if (DONOR_FIRST.has(B.key)) return { def: 'donorFirst' };
  else { pool = B.actions.filter(a => sat(a) && (a.lobbied || []).length); def = 'lobbied'; }
  if (!pool.length) return undefined;
  // A list whose record gives most of the member's votes as unknown (agenda-only meetings) gets no share:
  // the few recorded votes are not a fair count of what the member did.
  if (def === 'actions') { const seated = B.actions.filter(a => a.universe && a.roll && a.roll[key] != null).length; if (pool.length * 2 < seated && B.actions.filter(a => a.universe && a.roll && a.roll[key] === 'unknown').length * 2 > seated) return undefined; }
  // from: month of the first counted action, for 'Since <month year>, ...'
  const d0 = pool.map(a => a.date).filter(Boolean).sort()[0];
  return { def, n: pool.length, tied: pool.filter(a => tiedIds.has(a.id)).length, from: d0 ? String(d0).slice(0, 7) : undefined };
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
      const G0 = giftStart(B, key);
      const tied = [], noVotes = [], M = materialityOf(B, key), below = new Map();
      for (const a of B.actions) {
        if (!considered(B, a, key)) continue;
        const gs0 = giftsOf(B, a, key, accts, G0);
        // persons below the $1,000 threshold are listed on the card but counted nowhere
        const gs = gs0.filter(M.counts);
        if (inFavor(a, key)) for (const g of gs0) if (!M.counts(g)) below.set(giftKey(g), g);
        if (!gs.length) continue;
        // A tie needs an action in the donor's favor (Brit, Oct 27, 2026): a yes vote, a request the member
        // filed, or an action the member took. No, absent, excused, abstained, recused or unknown: not counted.
        if (inFavor(a, key)) tied.push([a, gs]);
        else if ((a.roll || {})[key] === 'no') noVotes.push([a, gs]);
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
      // How many committees got money (a member's earlier campaign accounts are campaigns, not committees)
      e.committees = Object.keys(byAcct).filter(a => isCmte(a) && byAcct[a] > 0).length;
      // A committee the member reported soliciting for (Miami-Dade form MD-ED 28) but does not chair
      if (Object.keys(byAcct).some(a => isCmte(a) && (B.accounts[a] || {}).role === 'solicits')) e.cmteRole = 'solicits';
      // Context, never in the headline: donors tied to items the member voted no on, counting only gifts the
      // headline does not already count (a donor helped by one yes vote is in the total already)
      const counted = new Set(all.map(g => g.key)), agGifts = new Map(), agActs = [];
      for (const [a, gs] of noVotes) {
        const fresh = gs.filter(g => !counted.has(giftKey(g)));
        if (!fresh.length) continue;
        agActs.push(a);
        for (const g of fresh) if (!agGifts.has(giftKey(g))) agGifts.set(giftKey(g), { amount: Number(g.amount), donor: giverKey(g.donor) });
      }
      if (agActs.length) {
        const ag = [...agGifts.values()];
        e.against = { votes: agActs.length, money: sum(ag), donors: new Set(ag.map(g => g.donor)).size };
        if (state) e.against.bills = new Set(agActs.map(a => a.ref)).size;
      }
      if (state) {
        const req = tied.filter(([a]) => a.kind === 'request');
        const bills = tied.filter(([a]) => a.kind === 'bill');
        const reqKeys = new Set(req.flatMap(([, gs]) => gs.map(giftKey)));
        // Bill money: donors tied to bills the member voted yes on (every bill tie is a yes vote), not already
        // counted with a budget request
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
          inBudget: sum(req.map(([a]) => ({ amount: (a.budget || {}).status === 'in' ? (a.budget.amount || 0) : 0 }))),
          vetoed: sum(req.map(([a]) => ({ amount: (a.budget || {}).status === 'in' ? Math.min(a.budget.amount || 0, a.budget.vetoed || 0) : 0 }))),
          inN: req.filter(([a]) => (a.budget || {}).status === 'in').length,
        };
        // Congress: funded amounts known for FY2022-FY2025 requests (GAO); FY2026-27 not checked
        if (B.level === 'federal') {
          const chk = req.filter(([a]) => a.funded != null);
          if (chk.length) Object.assign(e.requests, { fedChecked: chk.length, fedAsk: sum(chk.map(([a]) => ({ amount: a.ask || 0 }))), fedFunded: sum(chk.map(([a]) => ({ amount: a.funded }))) });
        }
        e.bills = {
          bills: new Set(bills.map(([a]) => a.ref)).size, votes: bills.length,
          yes: bills.filter(([a]) => a.roll[key] === 'yes').length,
          money: sum(billOnly), donors: new Set(billOnly.map(g => g.donor)).size,
        };
        // When the body's bill cards are a full list (every enacted law whose analysis names a kind of business
        // it helps, built without looking at donors), count the laws the member voted on and how many drew
        // money from donors in that kind of business. One law can have a vote in each chamber: counted once.
        const uni = B.actions.filter(a => a.kind === 'bill' && a.universe && ['yes', 'no'].includes(a.roll[key]) && contested(a));
        if (uni.length) {
          const laws = new Set(uni.map(a => a.ref));
          // tied: laws the member voted yes on that help an industry whose donors gave
          const tiedLaws = new Set(uni.filter(a => a.roll[key] === 'yes' && giftsOf(B, a, key, accts, G0).some(M.counts)).map(a => a.ref));
          const u0 = uni.map(a => a.date).filter(Boolean).sort()[0];
          e.bills.universe = { n: laws.size, tied: tiedLaws.size, from: u0 ? String(u0).slice(0, 7) : undefined };
        }
      } else {
        // every tied item is a yes vote, or (Cabinet) an action the member took as head of the office
        const acted = tied.filter(([a]) => a.roll[key] === 'acted').length;
        e.items = tied.length; e.yes = tied.length - acted;
        if (B.cabinet) { e.acted = acted; e.votes = tied.length - acted; }
        e.split = tied.filter(([a]) => a.tally && a.tally[1] > 0).length;
        // The share line counts actions since January 2025; when older cards are in the items, say from when
        const y0 = tied.map(([a]) => a.date).sort()[0];
        if (B.universe && y0 && y0 < '2025') e.since = Number(y0.slice(0, 4));
      }
      e.share = shareOf(B, key, tied);
      // Context, never in a headline: persons under the threshold on cards in the donor's favor
      if (below.size) { const bl = [...below.values()]; e.belowThreshold = { min: INDIVIDUAL_MIN_TOTAL, donors: new Set(bl.map(g => giverKey(g.donor))).size, gifts: bl.length, money: sum(bl.map(g => ({ amount: Number(g.amount) }))) }; }
      if (G0 !== CYCLE_START) e.giftsFrom = G0;
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
  // Years whose campaign reports are missing (scripts/data/donor-gaps.json): shown under the summary
  const gaps = JSON.parse(readFileSync(new URL('./data/donor-gaps.json', import.meta.url)));
  for (const [pid, g] of Object.entries(gaps)) if (!pid.startsWith('_') && people[pid]) people[pid].donorGap = g;
  // Full-check headlines (scripts/data/full-check/headlines.json): one count for every candidate in a race, from
  // every office they held (Brit, Oct 27, 2026: "the comparison blocks have to have the exact same numerator and
  // denominator and descriptor across two candidates"). Replaces the automatic one-line summary for these people;
  // candidates with no seat now (Rodriguez, Taddeo) get an entry so the dossier shows the same line for both.
  const FC = JSON.parse(readFileSync(new URL('./data/full-check/headlines.json', import.meta.url))).people;
  for (const [pid, f] of Object.entries(FC)) {
    const fullCheck = { decisions: f.decisions, helped: f.helped, amount: f.amount, donors: f.donors, record: f.record };
    if (people[pid]) { people[pid].fullCheck = fullCheck; continue; }
    if (!(byPerson[pid] || []).length) continue;
    add(pid, { pid, body: null, name: f.name, last: f.name.split(' ').pop(), kind: 'fullcheck', total: f.amount, pron: f.pron, fullCheck });
  }
  return { updated: decisions.updated, cycleStart: CYCLE_START, people, byBallot };
}

// One file per incumbent (public/data/ties/<person>.json) with exactly the actions and gifts their
// summary counts, so the dossier can show the cards behind the one-line summary without loading
// all of decisions.json. Gifts to other members are left out; the full roll call stays.
export function tiedActions(B, key) {
  const accts = new Set(B.onBallot[key].accounts);
  const G0 = giftStart(B, key);
  const M = materialityOf(B, key);
  const out = [];
  for (const a of B.actions) {
    if (!considered(B, a, key) || !inFavor(a, key)) continue;
    // a card is behind the summary only when a counted donor is on it; persons below the threshold stay listed, marked
    const gifts = giftsOf(B, a, key, accts, G0).map(g => { const { belowThreshold, ...rest } = g; return M.counts(g) ? rest : { ...rest, belowThreshold: true }; });
    if (!gifts.some(g => !g.belowThreshold)) continue;
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
    const money = f => (f ? f.actions : []).reduce((n, a) => n + a.gifts.reduce((x, g) => x + (g.belowThreshold ? 0 : Number(g.amount)), 0), 0);
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
  // mark persons under the $1,000 threshold on the cards (decisions.json and its served split)
  const marked = markBelowThreshold(d);
  if (marked) writeFileSync(new URL('decisions.json', root), JSON.stringify(d, null, 1) + '\n');
  console.log('belowThreshold marks changed: ' + marked);
  const h = JSON.parse(readFileSync(new URL('offices-held.json', root)));
  const out = build(d, h);
  writeFileSync(new URL('money-summary.json', root), JSON.stringify(out, null, 1) + '\n');
  const dir = new URL('ties/', root), ties = buildTies(d);
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (f.endsWith('.json') && !ties[f.slice(0, -5)]) unlinkSync(new URL(f, dir));
  for (const [pid, t] of Object.entries(ties)) writeFileSync(new URL(pid + '.json', dir), JSON.stringify(t) + '\n');
  console.log(Object.keys(out.people).length + ' people, ' + Object.keys(ties).length + ' tie files');
  // The site serves decisions.json split per body (public/data/decisions/); keep the split current.
  const { writeSplit } = await import('./split-decisions.mjs');
  const { bodies } = writeSplit(d);
  console.log('decisions split: index.json + ' + Object.keys(bodies).length + ' body files');
}
