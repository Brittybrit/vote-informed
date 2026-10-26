// Matches every official action (earlier offices: public/data/prior/<pid>.json; current seats: public/data/decisions/*.json)
// against the business interests each official disclosed for that year (scripts/data/business/history-*/history.jsonl).
// Candidate matches for review, not published: scripts/data/business/history-matches.json.
//
// Year rules (Brit, Oct 26, 2026):
//   1. listed on that year's form -> tie ("listed")
//   2. listed the year before and the year after, missing in between -> tie ("bridged", the gap is named)
//   3. after the last listing: a Sunbiz end date (officer removed, dissolved) before the action ends it; otherwise
//      the tie is shown as "last disclosed <year>" ("lastDisclosed")
//   4. never on a form but Sunbiz shows they ran it then (name + address) -> tie ("sunbiz")
// Matching: the business name against the action's named parties / budget-request recipient (name match), or, for
// laws, the business's industry tags against the law's donor-class tags (industry match, weaker). Government
// employers (tag "government") are not matched by industry.
// Run: node scripts/business-history.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
const root = new URL('../', import.meta.url), P = p => new URL(p, root);
const J = p => JSON.parse(readFileSync(P(p), 'utf8')), opt = p => existsSync(P(p)) ? J(p) : null;
const lines = p => existsSync(P(p)) ? readFileSync(P(p), 'utf8').split('\n').filter(Boolean).flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } }) : [];

const B = 'scripts/data/business/';
const rows = readdirSync(P(B)).filter(d => /^history-\d+$/.test(d)).flatMap(d => lines(B + d + '/history.jsonl'));
const STOP = /\b(inc|incorporated|llc|l l c|pllc|pa|p a|corp|corporation|co|company|ltd|lp|llp|the|of|and|d b a|dba|group|holdings|services|associates|enterprises|international|florida|fl|usa|america|national|united|miami|dade|county|city)\b/g;
const norm = s => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const core = s => norm(s).replace(STOP, ' ').replace(/\s+/g, ' ').trim();
const nameHit = (biz, party) => {
  const a = core(biz), b = core(party);
  if (!a || !b || a.length < 4 || b.length < 4) return false;
  if (a === b) return true;
  const wa = a.split(' '), wb = new Set(b.split(' '));
  // every distinctive word of the business name appears in the party name (2+ words, or 1 long word)
  const distinct = wa.filter(w => w.length > 2);
  if (!distinct.length) return false;
  if (distinct.length === 1 && distinct[0].length < 7) return false;
  return distinct.every(w => wb.has(w));
};

// interests per person: business -> {years:Set, rows:[], industry:Set, role, sunbiz:{to, dissolved}}
const people = {};
for (const r of rows) {
  if (!r.pid) continue;
  const P0 = people[r.pid] = people[r.pid] || { biz: {}, missing: new Set(), illegible: new Set(), f8b: [] };
  if (r.missing) { P0.missing.add(r.year); continue; }
  if (r.legible === false) { P0.illegible.add(r.year); continue; }
  if (r.form8b) { P0.f8b.push(r); continue; }
  if (r.sunbiz && r.business) {
    const k = core(r.business); const b = P0.biz[k] = P0.biz[k] || { name: r.business, years: new Set(), rows: [], industry: new Set(), sunbiz: [] };
    b.sunbiz.push(r); continue;
  }
  if (!r.business || !r.year) continue;
  const k = core(r.business); if (!k) continue;
  const b = P0.biz[k] = P0.biz[k] || { name: r.business, years: new Set(), rows: [], industry: new Set(), sunbiz: [] };
  b.years.add(Number(r.year)); b.rows.push(r); for (const t of r.industry || []) b.industry.add(t);
  if (/owner|officer|director|employee|partner|income|client/i.test(r.role || '') && !/stock|bond|fund|loan|mortgage|credit card|securit|trust|shares/i.test((r.nature || '') + ' ' + r.business)) b.active = true;
  if ((r.industry || []).includes('government')) b.gov = true;
}
// rule check for an action in year y on date d
const heldIn = (b, y, d) => {
  if (b.years.has(y)) return { basis: 'listed' };
  if (b.years.has(y - 1) && b.years.has(y + 1)) return { basis: 'bridged', note: `listed for ${y - 1} and ${y + 1}; not on the ${y} form` };
  const ys = [...b.years].sort((a, c) => a - c);
  const last = ys.filter(x => x < y).pop();
  const ends = b.sunbiz.map(s => s.officerTo || s.dissolved).filter(Boolean).sort();
  if (last != null) {
    if (ends.length && ends[0] < d) return null;
    // only when no later form covers that year without it (a later form that omits it after a gap is still "last disclosed")
    return { basis: 'lastDisclosed', note: `last disclosed for ${last}` };
  }
  // never on a form: Sunbiz officer dates covering the date
  for (const s of b.sunbiz) if (s.officerFrom && s.officerFrom <= d && (!s.officerTo || s.officerTo >= d) && (!s.dissolved || s.dissolved >= d)) return { basis: 'sunbiz', note: 'Sunbiz officer listing' };
  return null;
};

// donor-class tags per law chapter (same files prior-legislature.mjs reads)
const T = 'scripts/data/tenure/';
const CLS = { ...opt(T + 'prior-flsenate/bills/classes-by-chapter.json'), ...opt(T + 'prior-flhouse/bills/classes-by-chapter.json'), ...opt(T + 'flsenate/bills/classes-senate.json'),
  ...opt(T + 'flhouse/bills/classes-2122.json'), ...opt(T + 'flhouse/bills/classes-by-chapter.json'), ...opt('scripts/data/state/bills/classes-by-chapter.json') };
const tagsOf = ch => { const K = CLS[ch]; return K ? new Set(Array.isArray(K) ? K : (K.tags || [])) : new Set(); };
const clsOf = ch => { const K = CLS[ch]; return K && !Array.isArray(K) ? K : {}; };

const out = [];
const push = (pid, a, b, h, how) => out.push({ pid, date: a.date, office: a.office, ref: a.ref, title: a.title, party: a.party || null, vote: a.vote || null,
  business: b.name, government: !!b.gov, role: [...new Set(b.rows.map(r => r.role))].join(', '), basis: h.basis, note: h.note || null, how,
  form: (b.rows.find(r => Number(r.year) === Number(String(a.date).slice(0, 4))) || b.rows[b.rows.length - 1] || {}).record || null });

const check = (pid, a) => {
  const P0 = people[pid]; if (!P0 || !a.date) return;
  const y = Number(String(a.date).slice(0, 4));
  for (const b of Object.values(P0.biz)) {
    const names = (a.parties || []).filter(Boolean);
    const hitName = names.find(n => nameHit(b.name, n));
    if (hitName) { const h = heldIn(b, y, a.date); if (h) push(pid, { ...a, party: hitName }, b, h, 'name'); continue; }
    // industry ties only for a business they own, run, work for or get income from (not loans, card debt or stock)
    if (a.law && a.tags.size && b.active) {
      const ind = [...b.industry].filter(t => t !== 'government' && a.tags.has(t));
      const K = a.cls || {}, re = K.re ? new RegExp(K.re, 'i') : null, nre = K.not ? new RegExp(K.not, 'i') : null;
      const txt = b.name + ' | ' + b.rows.map(r => r.nature || '').join(' ');
      if (ind.length && (!re || re.test(txt)) && !(nre && nre.test(txt))) { const h = heldIn(b, y, a.date); if (h) push(pid, a, b, h, 'industry:' + ind.join('+')); }
    }
  }
};

// earlier offices
for (const f of readdirSync(P('public/data/prior/')).filter(f => f.endsWith('.json') && f !== 'index.json')) {
  const d = J('public/data/prior/' + f), pid = d.pid;
  for (const o of d.offices || []) {
    const office = o.office || o.body;
    for (const x of o.actions || []) check(pid, { date: x.d, office, ref: x.r, title: x.t, parties: x.p, vote: x.v });
    for (const x of (o.requests || {}).list || []) check(pid, { date: x.d || (String(x.fy || '').slice(0, 4) + '-07-01'), office, ref: x.r, title: x.t, parties: [x.rec], vote: 'filed' });
    for (const x of (o.laws || {}).list || []) check(pid, { date: x.d || (x.ch.slice(0, 4) + '-06-30'), office, ref: x.r, title: x.t, parties: [], vote: x.v, law: true, tags: tagsOf(x.ch), cls: clsOf(x.ch) });
  }
}
// current seats (decisions files: roll keyed by member key)
for (const f of readdirSync(P('public/data/decisions/')).filter(f => f.endsWith('.json') && f !== 'index.json')) {
  const d = J('public/data/decisions/' + f);
  for (const body of d.bodies || [d]) {
    const mem = {}; for (const m of body.members || []) if (m.person) mem[m.key] = m.person;
    for (const a of body.actions || []) for (const [k, v] of Object.entries(a.roll || {})) {
      const pid = mem[k]; if (!pid) continue;
      const subj = typeof a.subject === 'object' ? a.subject.en : (a.subject || a.title || '');
      check(pid, { date: a.date, office: (body.name && body.name.en) || body.key, ref: a.ref || a.id, title: subj, parties: a.parties || [], vote: v });
    }
  }
}

const f8b = Object.entries(people).flatMap(([pid, p]) => p.f8b.map(r => ({ pid, ...r })));
const cover = Object.fromEntries(Object.entries(people).map(([pid, p]) => [pid, {
  years: [...new Set(Object.values(p.biz).flatMap(b => [...b.years]))].sort(), missing: [...p.missing].sort(), illegible: [...p.illegible].sort() }]));
out.sort((a, b) => a.pid.localeCompare(b.pid) || String(b.date).localeCompare(String(a.date)));
writeFileSync(P(B + 'history-matches.json'), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), note: 'Candidate matches for review; not published. Name matches are leads until a reviewer opens the record.', matches: out, form8b: f8b, coverage: cover }, null, 1) + '\n');
const byHow = out.reduce((m, x) => (m[x.how.split(':')[0]] = (m[x.how.split(':')[0]] || 0) + 1, m), {});
console.log(`business-history: ${Object.keys(people).length} people with disclosures, ${out.length} matches`, byHow, `Form 8B: ${f8b.length}`);
