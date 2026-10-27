// Executive donors who would count for a law only with an official record of their stake (donor-class rule 5,
// scripts/lib/donor-class.mjs; scripts/data/industry/EXEC-RECORDS.md). Lists every individual's gift that the rule
// leaves out today only because the reported occupation names the business with an executive title (EXECUTIVE, CFO,
// VP, CHAIRMAN, DIRECTOR, PRINCIPAL ...) and no owner title, on a card that otherwise counts: a contested floor vote
// the member voted yes on (scripts/lib/contested.mjs), current Florida House and Senate lists (public/data/decisions.json,
// same donor files as scripts/state-bills.mjs) and earlier legislative seats (scripts/prior-legislature.mjs).
// Budget requests and own-office actions do not use the donor class, so nothing there waits on a record.
// Writes scripts/data/industry/exec-candidates.json. A donor already in exec-records.json is marked resolved.
// Run: node scripts/exec-candidates.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execPending, fitsLaw, donorKey, recordFor } from './lib/donor-class.mjs';
import { contested } from './lib/contested.mjs';
import { buildLegislative } from './prior-legislature.mjs';

const root = new URL('../', import.meta.url);
const has = p => existsSync(new URL(p, root));
const J = p => JSON.parse(readFileSync(new URL(p, root)));
const opt = p => has(p) ? J(p) : {};
const T = 'scripts/data/tenure/', TDIR = T + 'flhouse/', SDIR = T + 'flsenate/';
const CYCLE = '2025-01-01';
const d = J('public/data/decisions.json');
const CLASSES = opt('scripts/data/state/bills/classes.json');
const LAB = { ...J(TDIR + 'bills/labels.json'), ...opt(TDIR + 'bills/labels-2122.json'), ...opt(SDIR + 'bills/labels-senate.json') };
const BYCH = { ...J(TDIR + 'bills/classes-by-chapter.json'), ...opt(TDIR + 'bills/classes-2122.json'), ...opt(SDIR + 'bills/classes-senate.json') };
const classOf = ref => CLASSES[ref] || (LAB[ref] && BYCH[LAB[ref].chapter]) || null;
const TAGS = J('scripts/data/industry/state-donors.json').donors;
const TEN_TAGS = { ...opt(TDIR + 'donors/industry-pre2025.json').donors, ...opt(SDIR + 'donors/industry-pre2025.json').donors };
const tagsOf = n => (TAGS[n.toUpperCase()] || TEN_TAGS[n.toUpperCase()] || {}).tags || [];
const RECORDS = opt('scripts/data/industry/exec-records.json').records || {};

// Donor rows as scripts/state-bills.mjs reads them, with the address kept
const tsv = f => !has(f) ? [] : readFileSync(new URL(f, root), 'utf8').split('\n').filter(Boolean).map(l => l.split('\t'))
  .filter(r => !['INT', 'REF', 'LOA', 'COF'].includes(r[3]) && Number(r[2]) > 0)
  .map(r => { const [mm, dd, yy] = r[1].split('/'); return { date: `${yy}-${mm}-${dd}`, amount: Number(r[2]), donor: r[4].trim(), addr: (r[5] || '').trim(), city: (r[6] || '').trim(), occ: (r[7] || '').trim() }; });
const rowsOf = (body, acct, tenure) => body === 'flsenate'
  ? [...tsv(`scripts/data/state/donors/${acct}.tsv`), ...(tenure ? tsv(SDIR + 'donors/' + acct + '.tsv').filter(r => r.date < CYCLE) : [])]
  : [...(tenure && acct.endsWith('-pre2025') ? [] : tsv(`scripts/data/state/donors/${acct}.tsv`)),
     ...(tenure ? tsv(TDIR + 'donors/' + (acct.endsWith('-pre2025') ? acct : /^pc\d+$/.test(acct) ? acct + '-pre2025' : '_none') + '.tsv') : [])];

const out = [];
for (const body of ['flhouse', 'flsenate']) {
  const B = d.bodies.find(b => b.key === body);
  const G0 = k => (B.tenure && B.tenure[k] && B.tenure[k].giftsFrom) || CYCLE;
  const rows = {}, OCCS = new Map();
  for (const k of Object.keys(B.onBallot)) {
    rows[k] = (B.onBallot[k].accounts || []).flatMap(a => rowsOf(body, a, !!B.tenure).map(r => ({ ...r, acct: a })));
    for (const r of rows[k]) if (r.occ) { const n = r.donor.toUpperCase(); if (!OCCS.has(n)) OCCS.set(n, new Set()); OCCS.get(n).add(r.occ); }
  }
  for (const a of B.actions.filter(a => a.kind === 'bill' && contested(a))) {
    const K = classOf(a.ref); if (!K) continue;
    for (const k of Object.keys(a.roll).filter(k => a.roll[k] === 'yes')) for (const r of rows[k]) {
      if (r.date < G0(k) || !r.occ) continue;
      const occs = [...new Set([r.occ, ...(OCCS.get(r.donor.toUpperCase()) || [])])], t = tagsOf(r.donor);
      if (!occs.some(o => execPending(K, r.donor, o, t) || recordFor(K, r.donor, o, t))) continue;
      if (occs.some(o => fitsLaw(K, r.donor, o, t) && !recordFor(K, r.donor, o, t))) continue;
      out.push({ donor: r.donor, occ: r.occ, occs, addr: r.addr, city: r.city, amount: r.amount, date: r.date, acct: r.acct, candidate: k, body, card: a.id, ref: a.ref, cls: K.re || (K.tags || []).join('|') });
    }
  }
}
const nameOf = pid => pid.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
const pend = [];
buildLegislative(nameOf, pend);
// buildLegislative leaves out gifts that already count; a donor counting through a record is listed by the record pass below
for (const p of pend) out.push({ donor: p.donor, occ: p.occ, occs: p.occs, addr: p.addr, city: p.city, amount: p.amount, date: p.date, acct: p.acct, candidate: p.pid, body: p.office, card: p.card, ref: p.card, cls: p.cls.re || (p.cls.tags || []).join('|') });

// one gift appears once per card; the same gift on several cards is one gift of money
const gk = g => [g.candidate, g.acct, g.donor, g.amount, g.date].join('|');
const gifts = new Map();
for (const g of out) { const k = gk(g); if (!gifts.has(k)) gifts.set(k, { ...g, cards: [] }); gifts.get(k).cards.push({ card: g.card, ref: g.ref, cls: g.cls }); }
const list = [...gifts.values()].map(({ card, ref, cls, ...g }) => ({ key: donorKey(g.donor), ...g, resolved: !!RECORDS[donorKey(g.donor)] }))
  .sort((p, q) => p.key.localeCompare(q.key) || p.date.localeCompare(q.date));
const donors = new Set(list.map(g => g.key));
const sum = xs => Math.round(xs.reduce((s, g) => s + g.amount, 0) * 100) / 100;
const res = {
  about: 'Individual gifts that count for a law only with an official record of the executive donor\'s stake (scripts/lib/donor-class.mjs rule 5): occupation names the business with an executive title and no owner title; card is a contested floor vote the candidate voted yes on. Built by scripts/exec-candidates.mjs. resolved: the donor has a record in exec-records.json.',
  built: new Date().toISOString().slice(0, 10),
  totals: { gifts: list.length, donors: donors.size, dollars: sum(list), resolved: { gifts: list.filter(g => g.resolved).length, donors: new Set(list.filter(g => g.resolved).map(g => g.key)).size, dollars: sum(list.filter(g => g.resolved)) } },
  gifts: list,
};
writeFileSync(new URL('scripts/data/industry/exec-candidates.json', root), JSON.stringify(res, null, 1) + '\n');
console.log(`exec candidates: ${list.length} gifts, ${donors.size} donors, $${sum(list)}; resolved by a record: ${res.totals.resolved.gifts} gifts, ${res.totals.resolved.donors} donors, $${res.totals.resolved.dollars}`);
