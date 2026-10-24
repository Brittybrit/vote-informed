// Adds what the action lists' own build could not: for the cities named on the command line, reads
//   scripts/data/city/<slug>/votes.json     roll calls found later (Medley: minutes attached to a later agenda)
//   scripts/data/city/<slug>/owners.json    owner of record / applicant for actions that named only an address
//   scripts/data/city/<slug>/lobbyists.json lobbyists for each action's parties
// and writes them onto that body's actions in public/data/decisions.json, then re-runs the party-gift match
// on every action of the list (so a newly named owner, or newer donor data, is checked too). Idempotent.
// Lobbyists count only when registered with this body or named in its own record ("registry", "record").
// Matches from another body's registry ("otherBody") are written to scripts/data/city/lobbyists-review.json
// for review and never published.
// Run after city-actions.mjs:  node scripts/city-enrich.mjs <slug> [...] && node scripts/city-firm-gifts.mjs
import { writeFileSync, existsSync } from 'node:fs';
import { P, J, norm, donorsFor, partyGifts } from './lib/city.mjs';

const FILE = 'public/data/decisions.json';
const d = J(FILE);
const ONLY = process.argv.slice(2);
if (!ONLY.length) { console.log('usage: node scripts/city-enrich.mjs <slug> [...]'); process.exit(1); }
const KEY = { coralgables: 'cg-' };
const giftKey = g => [g.to, g.acct, norm(g.donor), Number(g.amount), g.date, g.kind].join('|');
const report = [];
const review = existsSync(P('scripts/data/city/lobbyists-review.json')) ? J('scripts/data/city/lobbyists-review.json') : { note: 'Lobbyists for an action\'s party found only in another body\'s registry. Not published (a lobbyist counts only when registered with, or named in the record of, the body that acted). For review.', cities: {} };

for (const slug of ONLY) {
  const B = d.bodies.find(b => b.key === slug);
  if (!B) { report.push(slug + ': no body'); continue; }
  const BJ = existsSync(P(`scripts/data/city/${slug}/body.json`)) ? J(`scripts/data/city/${slug}/body.json`) : {};
  const pfx = KEY[slug] || slug + '-';
  const byId = new Map();
  for (const a of B.actions) { byId.set(a.id, a); if (String(a.id).startsWith(pfx)) byId.set(String(a.id).slice(pfx.length), a); }
  // An action kept from an older card keeps that card's id; actions.json says which (prevId, legacyId)
  const alias = new Map();
  if (existsSync(P(`scripts/data/city/${slug}/actions.json`))) for (const u of J(`scripts/data/city/${slug}/actions.json`).actions || []) for (const o of [u.prevId, u.legacyId]) if (o) alias.set(String(u.id), o);
  const find = id => byId.get(id) || byId.get(pfx + id) || byId.get(alias.get(id)) || byId.get(alias.get(String(id).replace(pfx, '')));
  const n = { votes: 0, owners: 0, lob: 0, review: 0, party: 0, missing: 0 };

  // 1. Roll calls found later, for actions whose record gave none
  if (existsSync(P(`scripts/data/city/${slug}/votes.json`))) {
    for (const [id, v] of Object.entries(J(`scripts/data/city/${slug}/votes.json`).byAction || {})) {
      const a = find(id); if (!a) { n.missing++; continue; }
      if (!v.roll || !Object.keys(v.roll).length) continue;
      const known = Object.values(a.roll || {}).some(x => x && x !== 'unknown');
      if (known) continue;
      a.roll = { ...v.roll };
      a.rollComplete = Object.values(a.roll).every(x => x && x !== 'unknown');
      const vs = Object.values(a.roll); a.tally = [vs.filter(x => x === 'yes').length, vs.filter(x => x === 'no').length];
      if (v.mover) a.mover = v.mover; if (v.second) a.second = v.second; if (v.result) a.result = v.result;
      if (v.src && !(a.links || []).some(l => l.url === v.src)) (a.links = a.links || []).push({ t: 'minutes', url: v.src });
      n.votes++;
    }
  }

  // 2. Owners of record and applicants for actions that named only an address
  if (existsSync(P(`scripts/data/city/${slug}/owners.json`))) {
    for (const [id, o] of Object.entries(J(`scripts/data/city/${slug}/owners.json`).byAction || {})) {
      const a = find(id); if (!a) { n.missing++; continue; }
      const add = [];
      if (o.owner) add.push(`${o.owner} (property owner)`);
      if (o.applicant && norm(o.applicant) !== norm(o.owner)) add.push(`${o.applicant} (applicant)`);
      const have = new Set((a.parties || []).map(p => norm(String(p).replace(/\(.*?\)/g, ''))));
      let changed = false;
      for (const p of add) if (!have.has(norm(p.replace(/\(.*?\)/g, '')))) { (a.parties = a.parties || []).push(p); changed = true; }
      for (const [t, url] of [['property', o.ownerSrc], ['sunbiz', o.sunbizSrc], ['packet', o.applicantSrc]]) if (url && !(a.links || []).some(l => l.url === url)) (a.links = a.links || []).push({ t, url });
      if (changed) n.owners++;
    }
  }

  // 3. Lobbyists for the action's parties
  if (existsSync(P(`scripts/data/city/${slug}/lobbyists.json`))) {
    const L = J(`scripts/data/city/${slug}/lobbyists.json`);
    const rv = review.cities[slug] = {};
    // Links this step added earlier (they carry a basis) that the file no longer supports are taken off
    const keep = new Map();
    for (const [id, list] of Object.entries(L.byAction || {})) { const a = find(id); if (a) for (const l of list || []) if (l && ['registry', 'record'].includes(l.basis)) (keep.get(a.id) || keep.set(a.id, new Set()).get(a.id)).add(norm(l.name)); }
    for (const a of B.actions) if (a.lobbied) { const k = keep.get(a.id) || new Set(); const n0 = a.lobbied.length; a.lobbied = a.lobbied.filter(l => !l.basis || k.has(norm(l.name))); n.dropped = (n.dropped || 0) + n0 - a.lobbied.length; }
    for (const [id, list] of Object.entries(L.byAction || {})) {
      const a = find(id); if (!a) { n.missing++; continue; }
      for (const l of list || []) {
        if (!l || !l.name) continue;
        if (!['registry', 'record'].includes(l.basis)) { (rv[a.id] = rv[a.id] || []).push(l); n.review++; continue; }
        a.lobbied = a.lobbied || [];
        const nk = norm(l.name);
        const ex = a.lobbied.find(x => norm(x.name) === nk);
        if (ex) { if (!ex.firm && l.firm) ex.firm = l.firm; continue; }
        a.lobbied.push({ name: l.name, for: l.for || '', ...(l.firm ? { firm: l.firm } : {}), ...(l.date ? { regs: [l.date] } : {}), basis: l.basis, ...(l.src ? { src: l.src } : {}) });
        n.lob++;
      }
    }
  }

  // 4. Party gifts on every action of the list (newly named owners, newer donor data)
  const donors = donorsFor(slug, B, BJ.ballotNames || {});
  for (const a of B.actions) {
    if (!a.universe) continue;
    a.gifts = a.gifts || [];
    const same = g => [g.to, norm(g.donor), Number(g.amount), g.date].join('|');
    const have = new Set(a.gifts.map(same));
    let added = false;
    for (const g of partyGifts(a, donors)) if (!have.has(same(g))) { a.gifts.push(g); have.add(same(g)); n.party++; added = true; }
    if (added) a.gifts.sort((p, q) => String(p.date).localeCompare(String(q.date)));
  }
  report.push(`${slug}: dropped ${n.dropped || 0}, votes ${n.votes}, owners ${n.owners}, lobbyists ${n.lob} (+${n.review} for review), new party gifts ${n.party}${n.missing ? `, ${n.missing} ids not found` : ''}`);
}
writeFileSync(P(FILE), JSON.stringify(d, null, 1) + '\n');
writeFileSync(P('scripts/data/city/lobbyists-review.json'), JSON.stringify(review, null, 1) + '\n');
console.log(report.join('\n'));
