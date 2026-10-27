// Builds one searchable record set of every research finding, including searches that found nothing, for Brit's
// private research index (not part of the public site). Output: scripts/data/research-index.json
// Run after the other builds: node scripts/research-index.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
const root = new URL('../', import.meta.url), P = p => new URL(p, root);
const J = p => JSON.parse(readFileSync(P(p), 'utf8')), opt = p => existsSync(P(p)) ? J(p) : null;
const lines = p => existsSync(P(p)) ? readFileSync(P(p), 'utf8').split('\n').filter(Boolean).flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } }) : [];
const L = o => (o && typeof o === 'object' ? o.en : o) || '';
const R = [];
const names = {};
const add = (r) => { if (r.title || r.detail) R.push(Object.fromEntries(Object.entries(r).filter(([, v]) => v != null && v !== ''))); };

// names
for (const [pid, p] of Object.entries((opt('public/data/offices-held.json') || {}).people || {})) names[pid] = p.name;
for (const [pid, p] of Object.entries((opt('public/data/money-summary.json') || {}).people || {})) names[pid] = names[pid] || p.name;
for (const f of readdirSync(P('public/data/prior/')).filter(f => f.endsWith('.json') && f !== 'index.json')) { const d = J('public/data/prior/' + f); names[d.pid] = d.name; }

// 1. business ties: published, held back, unverified
const B = 'scripts/data/business/';
const pubTies = (opt('public/data/business.json') || {}).people || {};
for (const [pid, p] of Object.entries(pubTies)) for (const t of p.ties || [])
  add({ p: pid, type: 'tie', status: 'on site', d: t.date, title: t.title, detail: [t.body, t.business, t.vote && 'vote: ' + t.vote, t.helps && 'law helps: ' + t.helps, t.basis].filter(Boolean).join(' · '), url: t.url });
for (const t of (opt(B + 'private-ties.json') || {}).ties || [])
  add({ p: t.pid, type: 'tie', status: 'held back', d: t.date, title: t.title || t.headline, detail: [t.body, t.business, 'why: ' + t.why].filter(Boolean).join(' · '), url: t.record && t.record.url });
for (const d of readdirSync(P(B)).filter(d => /^s\d/.test(d) && statSync(P(B + d)).isDirectory())) {
  for (const t of lines(B + d + '/ties.jsonl')) if (t.verified !== true)
    add({ p: t.pid, type: 'tie', status: 'not confirmed', d: t.date, title: t.title, detail: [t.body, t.business, t.note || t.link].filter(Boolean).join(' · '), url: t.record && t.record.url });
  for (const r of lines(B + d + '/findings.jsonl'))
    add({ p: r.pid, type: 'family', status: 'found', d: r.date, title: r.item, detail: [r.body, 'relative: ' + r.relative, r.party, r.vote && 'vote: ' + r.vote, r.quote].filter(Boolean).join(' · '), url: r.record && r.record.url });
  for (const s of lines(B + d + '/sunbiz.jsonl'))
    add({ p: s.pid, type: 'sunbiz', status: 'checked', title: s.business + ' (' + s.sunbiz + ')', detail: s.note, d: s.dissolved || s.lastListed, url: s.record && s.record.url });
}
// 2. disclosures by year: what each form listed, and every year searched and not found
for (const d of readdirSync(P(B)).filter(d => /^history-\d+$/.test(d))) for (const r of lines(B + d + '/history.jsonl')) {
  if (r.missing) add({ p: r.pid, type: 'disclosure', status: 'not found', d: String(r.year), title: 'No form found for ' + r.year, detail: r.searched || (r.onFile ? 'On file, not online: ' + JSON.stringify(r.onFile) : '') });
  else if (r.legible === false) add({ p: r.pid, type: 'disclosure', status: 'unreadable', d: String(r.year), title: 'Form for ' + r.year + ' could not be read', url: r.record && r.record.url });
  else if (r.form8b !== undefined) add({ p: r.pid, type: 'disclosure', status: r.form8b ? 'Form 8B' : 'recusal', d: r.date, title: r.item || 'Voting conflict', detail: [r.body, r.interest].filter(Boolean).join(' · '), url: r.record && r.record.url });
  else if (r.business) add({ p: r.pid, type: 'disclosure', status: 'listed', d: String(r.year || ''), title: r.business, detail: [r.role, r.nature, r.form].filter(Boolean).join(' · '), url: r.record && r.record.url });
}
for (const d of readdirSync(P(B)).filter(d => /^s\d/.test(d) && statSync(P(B + d)).isDirectory())) for (const r of lines(B + d + '/interests.jsonl'))
  if (r.business) add({ p: r.pid, type: 'disclosure', status: 'listed', d: (r.record && r.record.date) || '', title: r.business, detail: [r.role, r.nature, r.record && r.record.label, r.basis].filter(Boolean).join(' · '), url: r.record && r.record.url });
// 3. machine matches between disclosed businesses and actions (before review)
for (const m of (opt(B + 'history-matches.json') || {}).matches || [])
  add({ p: m.pid, type: 'match', status: m.government ? 'government employer' : 'candidate', d: m.date, title: m.title, detail: [m.office, m.business, m.role, m.how, m.basis, m.vote && 'vote: ' + m.vote].filter(Boolean).join(' · ') });
// 4. leads about connections (machine-found and reviewed)
const rev = (opt('scripts/data/leads/review.json') || {}).leads || {};
for (const l of (opt('scripts/data/leads/auto.json') || {}).leads || []) {
  const rv = rev[l.key];
  add({ p: l.person, type: 'lead', status: rv ? rv.status : l.status, title: l.other + ' (' + l.otherKind + ')', detail: [(l.evidence || []).map(e => e.note).join('; '), rv && 'review: ' + rv.reason].filter(Boolean).join(' · '), url: ((l.evidence || [])[0] || {}).url });
}
// 5. gaps, as the site shows them
for (const [pid, g] of Object.entries((opt('public/data/gaps.json') || {}).people || {})) for (const x of g.items || [])
  add({ p: pid, type: 'gap', status: x.status, title: L(x.office), detail: L(x.text) + (x.req ? ' · records request #' + x.req.n + ' (' + x.req.office + ')' : '') });
// 6. records requests
for (const q of (opt('scripts/data/gaps/requests.json') || {}).requests || [])
  add({ type: 'request', status: q.status + (q.sent ? ' ' + q.sent : ''), title: '#' + q.n + ' ' + q.office, detail: 'Covers: ' + (q.covers || []).join(', ') + ' · ' + q.people.map(([p]) => names[p] || p).join(', ') });
// 7. search log: every progress, summary and needs-browser note in the research folders (what was searched, found, not found)
const walk = dir => readdirSync(P(dir)).flatMap(f => { const p = dir + f; try { return statSync(P(p)).isDirectory() ? (f === 'node_modules' || f.startsWith('.') ? [] : walk(p + '/')) : [p]; } catch { return []; } });
for (const f of walk('scripts/data/').filter(f => /\/(progress|summary|needs-browser|README)\.md$/.test(f))) {
  const src = f.replace('scripts/data/', '');
  for (const ln of readFileSync(P(f), 'utf8').split('\n')) {
    const t = ln.replace(/^[-*#\s|]+/, '').trim();
    if (t.length < 40) continue;
    add({ type: 'log', status: src.split('/').slice(0, -1).join('/'), title: t.slice(0, 140), detail: t.length > 140 ? t : '', src });
  }
}
// 8. source library: every document the research cites (scripts/data/sources/catalog.jsonl, see scripts/data/SOURCES.md)
{
  const cat = lines('scripts/data/sources/catalog.jsonl');
  const rec = e => ({
    p: (e.people || [])[0], type: 'source', status: e.archived ? 'archived' : e.fetchable === false ? 'blocked' : 'not yet',
    d: (e.dates || [])[1], dates: e.dates && e.dates[0] !== e.dates[1] ? e.dates : undefined,
    title: e.title, url: e.url, host: e.host,
    people: e.people && e.people.length > 1 ? e.people : undefined,
    detail: e.people && e.people.length > 1 ? e.people.slice(1).map(p => names[p] || p).join(', ') : undefined,
    text: e.textArchived ? 'r2' : e.text ? (e.text.startsWith('sources-archive:') ? 'tarball' : 'repo') : undefined,
    raw: e.archived ? 'r2' : undefined,
  });
  // Keep the index near 15 MB: if all sources don't fit, keep those cited for a person plus every pdf;
  // if that still doesn't fit, the pdfs without any text are left out.
  const BUDGET = 16.5e6, base = JSON.stringify(R).length;
  const tiers = [[() => true, ''], [e => (e.people && e.people.length) || e.kind === 'pdf', 'cited for a person, or a pdf'],
    [e => (e.people && e.people.length) || (e.kind === 'pdf' && (e.text || e.textArchived)), 'cited for a person, or a pdf with text']];
  let src = [];
  for (const [keep, why] of tiers) {
    src = cat.filter(keep).map(rec);
    const size = src.reduce((s, r) => s + JSON.stringify(r).length + 1 + (r.p ? 30 : 0), 0);
    if (base + size <= BUDGET || why === tiers[tiers.length - 1][1]) { if (why) console.log(`research-index: ${src.length} of ${cat.length} sources (${why}), to stay near 15 MB`); break; }
  }
  for (const r of src) add(r);
}
for (const r of R) if (r.p) r.n = names[r.p] || r.p;
writeFileSync(P('scripts/data/research-index.json'), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), records: R }) + '\n');
const c = R.reduce((m, r) => (m[r.type] = (m[r.type] || 0) + 1, m), {});
console.log('research-index:', R.length, 'records', c);
