// Adds what the action lists' own build could not: for the cities named on the command line, reads
//   scripts/data/city/<slug>/votes.json     roll calls found later (Medley: minutes attached to a later agenda)
//   scripts/data/city/<slug>/owners.json    owner of record / applicant for actions that named only an address, and
//                                           parties the item's own record names (parties: [{name, role, src}])
//   scripts/data/city/<slug>/lobbyists.json lobbyists for each action's parties
// and writes them onto that body's actions in public/data/decisions.json, then re-runs the party-gift match
// on every action of the list (so a newly named owner, or newer donor data, is checked too). Idempotent.
// Lobbyists count only when registered with this body or named in its own record ("registry", "record").
// Matches from another body's registry ("otherBody") are written to scripts/data/city/lobbyists-review.json
// for review and never published. A registry link counts only when the registration names one of the action's
// parties as its principal and was in force on the action's date (scripts/lib/lobby-links.mjs); links that fail
// are listed in scripts/data/city/lobbyists-dropped.json. Lobbyist lines a hand-built card carries without a basis
// pass the same checks (handLinkProblem) or come off, logged there with hand: true. Two lines for one person
// (names differing only by a middle initial, same firm or registration) become one.
// Portal registrations (PORTAL in lobby-links.mjs: Doral's Lobbyist Portal, current principals only): every portal
// pair whose principal is a party on an action and whose registration date is on or before the vote is added to
// lobbyists.json (basis registry, src the portal, asOf the read date). It ties only when the same lobbyist and
// principal are on the 2025 list or the item's record names the lobbyist; pairs that are only on the portal now are
// written to scripts/data/city/<slug>/lobbyists-portal-only.json for review, never published.
// Run after city-actions.mjs:  node scripts/city-enrich.mjs <slug> [...] && node scripts/city-firm-gifts.mjs
import { writeFileSync, existsSync } from 'node:fs';
import { P, J, norm, donorsFor, partyGifts } from './lib/city.mjs';
import { registryLinkProblem, handLinkProblem, sameLobbyist, principalAliases, principalMatches, notInForce, namesDifferOnlyByMiddle, PORTAL, portalContext, priorPairFor, recordNames } from './lib/lobby-links.mjs';
const PIX = principalAliases(existsSync(P('scripts/data/city/principal-aliases.json')) ? J('scripts/data/city/principal-aliases.json') : {});

const FILE = 'public/data/decisions.json';
const d = J(FILE);
const ONLY = process.argv.slice(2);
if (!ONLY.length) { console.log('usage: node scripts/city-enrich.mjs <slug> [...]'); process.exit(1); }
const KEY = { coralgables: 'cg-' };
const giftKey = g => [g.to, g.acct, norm(g.donor), Number(g.amount), g.date, g.kind].join('|');
const report = [];
const droppedFile = 'scripts/data/city/lobbyists-dropped.json';
const dropped = existsSync(P(droppedFile)) ? J(droppedFile) : { note: 'Lobbyist registrations not used as ties: the registered principal is not a party named on the item, or the registration was not in force on the action date (scripts/lib/lobby-links.mjs).', cities: {} };
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
      for (const p of o.parties || []) if (p && p.name) add.push(p.role ? `${p.name} (${p.role})` : p.name);
      const have = new Set((a.parties || []).map(p => norm(String(p).replace(/\(.*?\)/g, ''))));
      let changed = false;
      for (const p of add) if (!have.has(norm(p.replace(/\(.*?\)/g, '')))) { (a.parties = a.parties || []).push(p); changed = true; }
      const partySrc = (o.parties || []).flatMap(p => [].concat(p.src || [])).map(u => ['packet', u]);
      for (const [t, url] of [['property', o.ownerSrc], ['sunbiz', o.sunbizSrc], ['packet', o.applicantSrc], ...partySrc]) if (url && !(a.links || []).some(l => l.url === url)) (a.links = a.links || []).push({ t, url });
      if (changed) n.owners++;
    }
  }

  // 3. Lobbyists for the action's parties
  // Lines a hand-built card carries without a basis: kept only when the item's record names the lobbyist or a
  // registration on the line passes the party and in-force checks. A line dropped on an earlier run stays logged.
  const dr = dropped.cities[slug] = (dropped.cities[slug] || []).filter(x => x.hand);
  const PT = PORTAL[slug] && existsSync(P(PORTAL[slug].principals)) && existsSync(P(PORTAL[slug].prior)) ? PORTAL[slug] : null;
  const LF = `scripts/data/city/${slug}/lobbyists.json`;
  const ctx = PT ? portalContext(slug, { principals: J(PT.principals), regs: J(PT.regs), prior: J(PT.prior), lobbyists: existsSync(P(LF)) ? J(LF) : {} }, pfx) : null;
  for (const a of B.actions) if (a.lobbied && a.lobbied.length) {
    a.lobbied = a.lobbied.filter(x => {
      const why = handLinkProblem(x, a, PIX, slug, ctx); if (!why) return true;
      if (!dr.some(y => y.hand && y.action === a.id && y.name === x.name && y.for === x.for)) dr.push({ action: a.id, date: a.date, name: x.name, for: x.for, regDate: (x.regs || [])[0] || x.reg || null, why, hand: true });
      n.handDropped = (n.handDropped || 0) + 1; return false;
    });
  }
  if (existsSync(P(`scripts/data/city/${slug}/lobbyists.json`))) {
    const L = J(`scripts/data/city/${slug}/lobbyists.json`);
    if (ctx) {
      ctx.L = L;
      // Portal pairs for each action's parties, registered on or before the vote; existing portal links get the read date
      const onPortal = l => ctx.pairs.find(p => namesDifferOnlyByMiddle(p.name, l.name) && (principalMatches(p.for, [l.for], PIX) || principalMatches(l.for, [p.for], PIX)));
      for (const list of Object.values(L.byAction || {})) for (const l of list || []) if (l && l.basis === 'registry' && String(l.src || '') === PT.src) { const p = onPortal(l); if (p) { l.asOf = p.asOf; if (!l.issue && p.issue) l.issue = p.issue; } }
      for (const a of B.actions) for (const p of ctx.pairs) {
        if (!p.date || !principalMatches(p.for, a.parties, PIX) || notInForce(p, a.date, slug)) continue;
        const k = Object.keys(L.byAction || {}).find(id => find(id) === a) || a.id;
        const list = (L.byAction = L.byAction || {})[k] = L.byAction[k] || [];
        if (list.some(l => l && l.basis === 'registry' && String(l.src || '') === PT.src && namesDifferOnlyByMiddle(l.name, p.name) && principalMatches(l.for, [p.for], PIX))) continue;
        list.push({ name: p.name, firm: p.firm, for: p.for, basis: 'registry', src: p.src, date: p.date, issue: p.issue, asOf: p.asOf });
        n.portal = (n.portal || 0) + 1;
      }
      writeFileSync(P(LF), JSON.stringify(L, null, 1) + '\n');
    }
    // What a portal link rests on, carried on the card line: the portal read date and the 2025 pair or the record
    const portalBasis = (l, a) => {
      if (!ctx || l.basis !== 'registry' || String(l.src || '') !== PT.src) return {};
      const p = priorPairFor(l, ctx, PIX);
      return { asOf: l.asOf || ctx.pairs[0].asOf, ...(p ? { prior: { src: p.src, name: p.name, for: p.for, listed: p.listed } } : recordNames(l, a, ctx) ? { recordNamed: true } : {}) };
    };
    const rv = review.cities[slug] = {};
    // A registry link that fails the principal or in-force check is not used
    const usable = (l, a) => { const why = registryLinkProblem(l, a, PIX, slug, ctx); if (why) dr.push({ action: a.id, date: a.date, name: l.name, for: l.for, regDate: l.date || l.regYear || null, why }); return !why; };
    // Links this step added earlier (they carry a basis) that the file no longer supports are taken off
    const keep = new Map();
    for (const [id, list] of Object.entries(L.byAction || {})) { const a = find(id); if (a) for (const l of list || []) if (l && ['registry', 'record'].includes(l.basis) && usable(l, a)) (keep.get(a.id) || keep.set(a.id, new Map()).get(a.id)).set(norm(l.name) + '|' + l.basis, true); }
    for (const a of B.actions) if (a.lobbied) { const k = keep.get(a.id) || new Map(); const n0 = a.lobbied.length; a.lobbied = a.lobbied.filter(l => !l.basis || k.has(norm(l.name) + '|' + l.basis)); n.dropped = (n.dropped || 0) + n0 - a.lobbied.length; }
    for (const [id, list] of Object.entries(L.byAction || {})) {
      const a = find(id); if (!a) { n.missing++; continue; }
      for (const l of list || []) {
        if (!l || !l.name) continue;
        if (!['registry', 'record'].includes(l.basis)) { (rv[a.id] = rv[a.id] || []).push(l); n.review++; continue; }
        if (registryLinkProblem(l, a, PIX, slug, ctx)) continue;
        a.lobbied = a.lobbied || [];
        const nk = norm(l.name);
        const line = { name: l.name, for: l.for || '', ...(l.firm ? { firm: l.firm } : {}), ...(l.date ? { regs: [l.date] } : {}), basis: l.basis, ...(l.src ? { src: l.src } : {}), ...portalBasis(l, a) };
        // a line with a basis for this person is already there; a hand-built line for them gives way below
        const ex = a.lobbied.find(x => x.basis && (norm(x.name) === nk || sameLobbyist(x, line)));
        if (ex) { if (!ex.firm && l.firm) ex.firm = l.firm; if (ex.basis === 'registry' && ex.src === l.src) Object.assign(ex, portalBasis(l, a)); continue; }
        a.lobbied.push(line);
        n.lob++;
      }
    }
    // A registry link's registration dates are the dates of the registrations that passed the check
    for (const [id, list] of Object.entries(L.byAction || {})) {
      const a = find(id); if (!a || !a.lobbied) continue;
      for (const x of a.lobbied) if (x.basis === 'registry') {
        const ds = (list || []).filter(l => l && l.basis === 'registry' && norm(l.name) === norm(x.name) && l.date && !registryLinkProblem(l, a, PIX, slug, ctx)).map(l => l.date);
        if (!x.regs || x.regs.every(r => ds.includes(r))) continue;
        if (ds.length) x.regs = [...new Set(ds)].sort(); else if (x.regs && !(list || []).some(l => l && l.basis === 'registry' && norm(l.name) === norm(x.name) && !registryLinkProblem(l, a, PIX, slug, ctx))) delete x.regs;
      }
    }
  }
  // One line per person: a line with a basis is kept over one without (record over registry), then the fuller
  // name; the other's
  // registrations and principal are merged in, and gifts filed under the other name follow
  const rank = x => ({ record: 0, registry: 1 }[x.basis] ?? 2);
  for (const a of B.actions) if (a.lobbied && a.lobbied.length > 1) {
    const out = [];
    for (const x of [...a.lobbied].sort((p, q) => rank(p) - rank(q) || q.name.length - p.name.length || p.name.localeCompare(q.name))) {
      const k = out.find(y => sameLobbyist(y, x));
      if (!k) { out.push(x); continue; }
      const rs = [...new Set([...(k.regs || []), ...(x.regs || []), ...(x.reg ? [x.reg] : [])])].sort();
      if (rs.length && !k.basis) k.regs = rs;
      if (!k.firm && x.firm) k.firm = x.firm;
      if (x.for && k.for && !k.basis && !k.for.split(' / ').includes(x.for)) k.for = `${k.for} / ${x.for}`;
      for (const g of a.gifts || []) if (g.lobbyist === x.name) g.lobbyist = k.name;
      n.merged = (n.merged || 0) + 1;
    }
    if (out.length !== a.lobbied.length) a.lobbied = a.lobbied.filter(x => out.includes(x));
  }

  // Portal pairs that would tie only on being on the portal now: listed for review, not published
  if (ctx) {
    const only = dr.filter(x => /^portal only/.test(x.why || '')).map(x => { const a = B.actions.find(y => y.id === x.action) || {};
      const byA = (ctx.L && ctx.L.byAction) || {}; const l = (byA[Object.keys(byA).find(id => find(id) === a)] || []).find(l => l.name === x.name && l.for === x.for) || {};
      return { action: x.action, ref: a.ref, date: x.date, subject: a.subject && a.subject.en, parties: a.parties, lobbyist: x.name, firm: l.firm || null, principal: x.for, regDate: x.regDate, issue: l.issue || null, src: PT.src, asOf: l.asOf || null, why: x.why }; });
    const OF = `scripts/data/city/${slug}/lobbyists-portal-only.json`;
    const old = existsSync(P(OF)) ? J(OF) : {};
    writeFileSync(P(OF), JSON.stringify({ note: 'Lobbyist-principal pairs read on the city lobbyist portal that would tie a lobbyist to a vote only because the pair is on the portal now: the pair is not on the 2025 list and the item\'s record does not name the lobbyist, and the portal does not say when the principal was authorized. Not published; for Brit to decide (scripts/lib/lobby-links.mjs PORTAL). gifts: what city-firm-gifts.mjs would add to the card if the pair tied (from: card marks a gift the card showed before the pair was held back).', pairs: only.map(x => ({ ...x, gifts: ((old.pairs || []).find(o => o.action === x.action && o.lobbyist === x.lobbyist && o.principal === x.principal) || {}).gifts || [] })) }, null, 1) + '\n');
    n.portalOnly = only.length;
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
  report.push(`${slug}: dropped ${n.dropped || 0}, hand lines dropped ${n.handDropped || 0}, merged ${n.merged || 0}, votes ${n.votes}, owners ${n.owners}, lobbyists ${n.lob} (+${n.review} for review)${ctx ? `, portal pairs added ${n.portal || 0}, portal only ${n.portalOnly || 0}` : ''}, new party gifts ${n.party}${n.missing ? `, ${n.missing} ids not found` : ''}`);
}
writeFileSync(P(FILE), JSON.stringify(d, null, 1) + '\n');
writeFileSync(P('scripts/data/city/lobbyists-review.json'), JSON.stringify(review, null, 1) + '\n');
for (const k of Object.keys(dropped.cities)) if (!dropped.cities[k].length) delete dropped.cities[k];
writeFileSync(P(droppedFile), JSON.stringify(dropped, null, 1) + '\n');
console.log(report.join('\n'));
