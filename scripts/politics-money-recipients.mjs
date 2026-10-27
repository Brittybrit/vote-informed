// Public money to political money, stage 1: who got public money by an official act of someone on the ballot.
//   node scripts/politics-money-recipients.mjs
//     -> scripts/data/politics-money/recipients.json   one row per distinct recipient organization, with its actions
//     -> scripts/data/politics-money/doe-search.tsv     contributor names for the Division of Elections browser pass
//     -> scripts/data/politics-money/fec-search.tsv     contributor names to check in FEC Schedule A
// Rule and search method: scripts/data/politics-money/README.md. No candidate-facing output here.
//
// Inputs (read only):
//   public/data/decisions/<body>.json   current seats: each on-ballot member's yes votes and budget/earmark requests
//   public/data/prior/<pid>.json        earlier seats (scripts/prior-offices.mjs): votes, AG office grants, FDACS buys,
//                                       earlier legislative budget requests
//   scripts/data/tenure/**/actions.json addresses the record gives, joined by action id
//   scripts/data/federal/requests.json  earmark recipients' addresses (House CPF tables), joined by member + project
//   scripts/data/politics-money/manual-actions.json  actions read by hand from the record (Centene settlement)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { P, J, norm, dkey, GENERIC } from './lib/city.mjs';

const OUT = 'scripts/data/politics-money/';
const DEC = 'public/data/decisions/', PRI = 'public/data/prior/';

// Kinds where the record says the government pays the party (money 'paid'), and kinds where the money can run either
// way and the record must be read (money 'unclear': an agreement or settlement may pay the party or be paid by it; a
// lease or land item may be the government renting or buying, or renting out or selling). Everything else (zoning,
// permits, plats, licenses, easements granted, labor contracts, bond findings, bills) moves no public money to the party.
const PAID = new Set(['award', 'contract', 'funding', 'grant', 'change', 'request', 'land_purchase', 'conservation_easement', 'rflpp_easement', 'rflpp_dept_easement']);
const UNCLEAR = new Set(['agreement', 'settlement', 'lease', 'land']);
// A vote or act that puts the official behind the money. 'unknown' (minutes give no vote) is kept so the name is
// searched, but it cannot make a flag.
const COUNTS = new Set(['yes', 'acted', 'requested']);
const KEEP_VOTE = new Set(['yes', 'acted', 'requested', 'unknown']);

// Government bodies (cities, counties, school boards, state and federal agencies, public universities and colleges,
// special districts): not in scope, they cannot give to campaigns.
const GOV = new RegExp([
  '\\b(city|town|village|county|state) of\\b', '\\bcounty\\b.*\\b(commission|commissioners|board|department|government|schools?|clerk|sheriff|property appraiser|tax collector)\\b',
  '^miami-dade\\b', '^broward\\b', '^palm beach county\\b', '^monroe county\\b', '\\bschool (board|district)\\b', '\\bpublic schools\\b',
  '\\bdepartment of\\b', '\\bdept\\.? of\\b', '\\bflorida department\\b', '\\bboard of (trustees|county commissioners|education|governors)\\b',
  '\\b(water management|drainage|fire control|mosquito control|inland navigation|community development|special taxing|hospital) district\\b',
  '\\bcommunity redevelopment agency\\b', '\\b(cra)\\b', '\\bhousing (authority|finance (authority|corporation))\\b', '\\bport (authority|of)\\b',
  '\\b(florida international|florida atlantic|florida state|florida gulf coast|florida a ?& ?m|florida agricultural and mechanical|florida polytechnic|new college of florida) university\\b',
  '\\buniversity of (florida|central florida|south florida|north florida|west florida)\\b', '\\b(miami dade|broward|palm beach state|valencia|santa fe|seminole state|tallahassee|indian river state|st\\.? petersburg|hillsborough|polk state|daytona state) college\\b',
  '\\bunited states\\b', '\\bu\\.?s\\.? (army|department|fish|geological|coast guard|navy|air force)\\b', '\\bfederal (aviation|emergency|highway|transit)\\b',
  '\\bstate of florida\\b', '\\bflorida (fish and wildlife|highway patrol|division|agency|office of|inland navigation|department|forest service)\\b',
  '\\bwater and sewer department\\b', '\\btransit\\b.*\\b(department|authority)\\b', '\\bexpressway authority\\b', '\\bsouth florida regional (transportation|planning)\\b',
  '\\bpolice department\\b', '\\bfire rescue\\b', '\\bsheriff\\b', '\\bpublic library\\b', '\\btrust\\b.*\\bchildren\\b.*\\bmiami-dade\\b',
  '\\bcounty(, florida)?$', '\\bmiami-? ?dade county\\b', '\\b(village|city)$', '^(village|town|city) of\\b', '\\b(aqueduct|downtown development|development|transit|airport|seaport|library|parking|sports) authority\\b',
  '\\bstate college\\b', '^the college of the florida keys$', '\\bboard of county commissioners\\b', '\\bbocc\\b', '\\bclerk of (the )?court',
  '\\bemergency operations\\b', '\\b(engineering|parks|police|fire) department\\b', '\\bcounty (fire|parks|waterways|emergency)\\b', '\\b(dad|moroe) county\\b', '\\bgovernmental utility\\b', '\\bcity utility\\b', '\\b(senior|middle) high$', '^city\\W*s use\\b',
  '\\bjackson health\\b', '\\bpublic health trust\\b', '\\bthe children\'s trust\\b', '\\bmiami-dade county public schools\\b',
].join('|'), 'i');
// Organization words: a party with one of these is an organization; a party with none is 'unclassified' (could be a
// person or an organization; it stays on the search list and the record decides).
const ORG = /\b(inc|incorporated|llc|l\.l\.c|corp|corporation|co|company|ltd|lp|llp|lllp|pa|p\.a|pllc|pc|foundation|fund|association|assn|society|institute|center|centre|council|club|league|alliance|coalition|chamber|church|ministr(y|ies)|temple|synagogue|academy|school|college|university|hospital|health|clinic|services?|group|partners|partnership|holdings|enterprises|trust|bank|authority|agency|committee|federation|union|network|project|program|initiative|collaborative|coop|cooperative|consultants?|consulting|engineers?|engineering|architects?|construction|contractors?|systems|solutions|technologies|industries|international|america|usa|of florida|florida|miami|museum|theat(er|re)|orchestra|ballet|opera|festival|youth|boys|girls|ymca|ywca|habitat|united way|red cross|salvation army|goodwill|catholic|jewish|baptist|methodist|community|development|properties|realty|investments|management|associates|studio|media|productions|events|sports|ford|lincoln|chevrolet|toyota|honda|nissan|dodge|jeep|motors|ranch|farms?|house|nursery|kids?)\b/i;

const urlOf = a => (a.links || []).find(l => l.t === 'record')?.url || (a.links || []).find(l => l.t === 'matter')?.url || (a.links || [])[0]?.url || a.url || a.u || '';
const tx = v => typeof v === 'string' ? v : v && v.en ? v.en : '';

// Grouping key: the name without legal suffixes, punctuation, "the", or a d/b/a tail (the d/b/a name becomes an alias).
function splitDba(name) {
  const s = String(name || '').replace(/\s+/g, ' ').trim();
  const m = s.match(/^(.*?)\s*,?\s*\b(?:d\/?b\/?a|a\/?k\/?a|f\/?k\/?a)\b\.?\s*(.*)$/i);
  return m ? [m[1].trim(), m[2].trim()] : [s, ''];
}
const gkey = name => dkey(splitDba(name)[0].replace(/\(.*?\)/g, ' '));
// First names seen on individual contributions (rows with an occupation and no organization word) in the DOE files
// already pulled (scripts/data/tenure/doe-browser, "LAST FIRST" layout), five times or more. A party with no organization
// word, two to four words, whose first word is one of these, is a person: left out of the list and counted.
const FIRST = new Set(), LAST = new Set();
{
  const c = new Map(), l2 = new Map();
  const D = 'scripts/data/tenure/doe-browser/';
  for (const f of readdirSync(P(D)).filter(x => x.endsWith('.tsv'))) for (const l of readFileSync(P(D + f), 'utf8').split('\n').slice(1)) {
    const x = l.split('\t');
    if (x.length < 8 || !x[7].trim() || /\b(INC|LLC|CORP|PA|P\.A|LLP|PLLC|LTD|CO|COMPANY|ASSOCIATION|PAC|COMMITTEE|GROUP|FUND|FOUNDATION|PARTNERS|HOLDINGS|TRUST|BANK)\b/.test(x[4])) continue;
    const t = x[4].trim().split(/\s+/);
    if (t.length >= 2 && t[1].length > 1) { const k = t[1].replace(/\./g, ''); c.set(k, (c.get(k) || 0) + 1); l2.set(t[0], (l2.get(t[0]) || 0) + 1); }
  }
  for (const [k, n] of c) if (n >= 5 && !['THE', 'OF', 'AND', 'DE', 'LA', 'DEL'].includes(k)) FIRST.add(k);
  for (const [k, n] of l2) if (n >= 2) LAST.add(k);
}
// Placeholders the action files use when the record names no one, and title fragments that slipped into a party field
const JUNK = /:|\bnot named\b|\bunnamed\b|^owner of\b|\bgrantees\b|\bcreating a\b|^various\b|\bto be determined\b|^n\/?a$/i;
function typeOf(name) {
  if (JUNK.test(name)) return 'placeholder';
  if (GOV.test(name)) return 'government';
  if (ORG.test(name)) return 'organization';
  // a person: two to four words, no '&', 'and' or digits, the first word a first name and the last a surname that DOE
  // files show on individual contributions (a suffix like Jr. or Esq. is skipped)
  const bare = name.replace(/\(.*?\)/g, ' ').replace(/,?\s*\b(jr|sr|ii|iii|iv|esq|md|phd)\b\.?/gi, ' ').trim();
  const w = bare.split(/\s+/).filter(Boolean);
  if (!/[&\d]|\band\b/i.test(bare) && w.length >= 2 && w.length <= 4 && FIRST.has(norm(w[0])) && LAST.has(norm(w[w.length - 1]).replace(/ /g, ''))) return 'person';
  return 'unclassified';
}

// addresses the action records give (north cities, Parkland), by action id
const ADDR = new Map();
for (const dir of readdirSync(P('scripts/data/tenure'))) {
  const walk = d => { for (const f of readdirSync(P(d), { withFileTypes: true })) {
    if (f.isDirectory() && f.name !== 'raw' && f.name !== 'src') walk(d + f.name + '/');
    else if (f.name === 'actions.json') for (const a of J(d + f.name).actions || []) if (a.id && a.address) ADDR.set(a.id, a.address);
  } };
  if (dir.startsWith('prior-') || dir === 'county') walk('scripts/data/tenure/' + dir + '/');
}
// earmark addresses: House CPF tables (member, project, recipient, address)
const FEDREQ = existsSync(P('scripts/data/federal/requests.json')) ? J('scripts/data/federal/requests.json') : [];
const fedAddr = (member, project) => { const p = norm(project); const r = FEDREQ.find(x => x.member === member && norm(x.project) === p); return r ? r.address : null; };

const R = new Map();   // key -> recipient
const stats = { actionsRead: 0, partiesSeen: 0, government: 0, byKind: {}, bySource: {}, skippedOfficeSettlements: 0, people: new Set(), placeholders: new Set() };
function add(party, act, address) {
  const raw = String(party || '').replace(/\s+/g, ' ').trim();
  if (!raw) return;
  stats.partiesSeen++;
  const t = typeOf(raw);
  if (t === 'government') { stats.government++; return; }
  if (t === 'placeholder') { stats.placeholders.add(raw); return; }
  if (t === 'person') { stats.people.add(raw); return; }
  const k = gkey(raw);
  if (!k) return;
  let r = R.get(k);
  if (!r) R.set(k, r = { key: k, name: splitDba(raw)[0], aliases: new Set(), type: t, addresses: new Set(), ids: {}, actions: [] });
  const [main, dba] = splitDba(raw);
  r.aliases.add(raw); if (dba) r.aliases.add(dba);
  if (t === 'organization') r.type = 'organization';
  if (address) r.addresses.add(String(address).replace(/\s+/g, ' ').trim());
  if (!r.actions.some(x => x.pid === act.pid && x.id === act.id)) r.actions.push(act);
  stats.bySource[act.src] = (stats.bySource[act.src] || 0) + 1;
}

// 1. current seats
for (const f of readdirSync(P(DEC)).filter(x => x.endsWith('.json') && x !== 'index.json')) {
  const B = J(DEC + f);
  const pidOf = Object.fromEntries((B.members || []).map(m => [m.key, m.person]));
  const onBallot = Object.keys(B.onBallot || {});
  for (const a of B.actions || []) {
    stats.actionsRead++;
    const paid = PAID.has(a.kind), unclear = UNCLEAR.has(a.kind) && !(f === 'cabinet.json' && a.kind === 'settlement');
    if (!paid && !unclear) continue;
    if (a.universe === false) continue;
    for (const key of onBallot) {
      const v = (a.roll || {})[key];
      const vote = v === 'excused' ? 'absent' : v;
      if (!KEEP_VOTE.has(vote)) continue;
      const pid = pidOf[key];
      if (!pid) continue;
      const isFed = f === 'ushouse.json';
      const title = tx(a.subject) || tx(a.title);
      const act = { pid, id: a.id, date: a.date, body: B.key, kind: a.kind, vote, counts: COUNTS.has(vote), money: paid ? 'paid' : 'unclear',
        amount: a.amount ?? null, ask: a.ask ?? null, funded: a.budget ? { status: a.budget.status, amount: a.budget.amount ?? null, law: a.budget.law || null, fy: a.budget.fy || null } : (a.funded != null ? a.funded : undefined),
        title: title.slice(0, 200), url: urlOf(a), src: isFed ? 'federal earmark request' : a.kind === 'request' ? 'state budget request' : 'current seat vote' };
      if (act.funded === undefined) delete act.funded;
      const parties = a.parties || [];
      for (const p of parties) add(p, act, ADDR.get(a.id) || (isFed ? fedAddr(key, title.replace(/^Earmark request:\s*/, '')) : null));
    }
  }
}

// 2. earlier seats
// public/data/prior is deleted and rewritten on every run of scripts/prior-offices.mjs; if it is missing or empty
// (a rebuild in progress), read the committed copy instead of silently counting nothing.
const priorFiles = existsSync(P(PRI)) ? readdirSync(P(PRI)).filter(x => x.endsWith('.json') && x !== 'index.json') : [];
const fromGit = !priorFiles.length;
const priorList = fromGit ? execFileSync('git', ['ls-tree', '--name-only', 'HEAD', PRI], { cwd: P('.'), encoding: 'utf8' }).split('\n').filter(x => x.endsWith('.json') && !x.endsWith('/index.json')).map(x => x.slice(PRI.length)) : priorFiles;
if (!priorList.length) throw new Error('no earlier-seat files in ' + PRI + ' or in HEAD');
if (fromGit) console.log('public/data/prior is empty: reading the committed copy (HEAD)');
for (const f of priorList) {
  const Pp = fromGit ? JSON.parse(execFileSync('git', ['show', 'HEAD:' + PRI + f], { cwd: P('.'), encoding: 'utf8', maxBuffer: 1 << 28 })) : J(PRI + f);
  for (const o of Pp.offices || []) {
    for (const a of o.actions || []) {
      stats.actionsRead++;
      // the AG's own settlements are companies paying the State, not public money to them
      if (a.v === 'acted' && a.k === 'settlement') { stats.skippedOfficeSettlements++; continue; }
      const paid = PAID.has(a.k), unclear = UNCLEAR.has(a.k);
      if ((!paid && !unclear) || !KEEP_VOTE.has(a.v)) continue;
      const src = String(a.id).startsWith('grant#') ? 'AG office grant' : a.v === 'acted' ? 'statewide office act' : o.body === 'cabinet' ? 'Cabinet vote' : 'earlier seat vote';
      const act = { pid: Pp.pid, id: a.id, date: a.d, body: o.body, kind: a.k, vote: a.v, counts: COUNTS.has(a.v), money: paid ? 'paid' : 'unclear',
        amount: a.a ?? null, title: String(a.t || '').slice(0, 200), url: a.u, src };
      for (const p of a.p || []) add(p, act, ADDR.get(a.id));
    }
    if (o.requests && o.requests.list) for (const q of o.requests.list) {
      stats.actionsRead++;
      const act = { pid: Pp.pid, id: (o.body === 'fl-senate' ? 'S' : 'H') + q.fy + ':' + q.r, date: q.d, body: o.body, kind: 'request', vote: 'requested', counts: true, money: 'paid',
        amount: null, ask: q.ask ?? null, funded: q.b ? { status: q.b.status, amount: q.b.amount ?? null, fy: q.fy } : null, title: String(q.t || '').slice(0, 200), url: q.u, src: 'state budget request (earlier seat)' };
      add(q.rec, act, null);
    }
  }
}

// 3. actions read by hand from the record
const M = J(OUT + 'manual-actions.json');
for (const a of M.actions) {
  stats.actionsRead++;
  add(a.recipient, { pid: a.pid, id: a.id, date: a.date, body: 'oag', kind: a.kind, vote: 'acted', counts: true, money: 'paid', amount: a.amount,
    title: a.title, url: a.record.urls[0], src: 'manual (record read by hand)' }, null);
}
for (const [name, ids] of Object.entries(M.recipientIds || {})) {
  const r = R.get(gkey(name));
  if (r) { r.ids = { ein: ids.ein || null, sunbiz: ids.sunbiz || null, source: ids.source }; if (ids.irsAddress) r.addresses.add(ids.irsAddress + ' (IRS)'); }
}

// An amount over $5 billion on a local action is a parsing error upstream (e.g. "$6300000 million" in
// scripts/data/tenure/prior-county/actions.json); keep it as read but flag it.
let suspect = 0;
for (const r of R.values()) for (const a of r.actions) if (Number(a.amount) > 5e9 && !a.amountSuspect) { a.amountSuspect = true; suspect++; }
// rows
const rows = [...R.values()].map(r => {
  r.actions.sort((x, y) => String(x.date).localeCompare(String(y.date)));
  const pids = [...new Set(r.actions.map(a => a.pid))].sort();
  const srcs = [...new Set(r.actions.map(a => a.src))].sort();
  return { key: r.key, name: r.name, aliases: [...r.aliases].filter(x => x !== r.name).sort(), type: r.type,
    addresses: [...r.addresses].sort(), ids: r.ids, officials: pids, sources: srcs,
    qualifying: r.actions.filter(a => a.counts && a.money === 'paid').length, actions: r.actions };
}).sort((a, b) => b.qualifying - a.qualifying || a.key.localeCompare(b.key));

const bySource = {};
for (const r of rows) for (const s of r.sources) bySource[s] = (bySource[s] || 0) + 1;
const byType = {};
for (const r of rows) byType[r.type] = (byType[r.type] || 0) + 1;
const meta = {
  updated: new Date().toISOString().slice(0, 10),
  what: 'One row per distinct non-government recipient of an action by an official on the Nov 3, 2026 ballot that directed or may have directed public money to it. Built by scripts/politics-money-recipients.mjs; rule in README.md.',
  fields: {
    key: 'grouping key: the name without legal suffixes, punctuation or a d/b/a tail. Rows with the same key are the same name, not proven the same entity; an address or ID must confirm before a flag.',
    type: "'organization' (name has an organization word) or 'unclassified' (no such word: may be a business or a person; read the record). Names that look like a person (first word is a first name seen on individual DOE contributions) are left out and listed in peopleLeftOut.",
    addresses: 'only addresses an official record gives (action record, House CPF table, IRS file)',
    'actions[].counts': "true when the official voted yes, requested, or acted; false when the minutes give no vote ('unknown')",
    'actions[].money': "'paid' when the record kind is a payment to the party (award, contract, grant, funding, change order, budget or earmark request, State land or easement purchase); 'unclear' when the kind can run either way (agreement, settlement, lease, land)",
    'actions[].funded': 'budget requests only: whether the request made the final budget (status in/notIn/vetoed and the amount)',
    qualifying: "actions with counts true and money 'paid'",
  },
  counts: { recipients: rows.length, byType, recipientsBySource: bySource, actionLinks: rows.reduce((s, r) => s + r.actions.length, 0),
    qualifyingRecipients: rows.filter(r => r.qualifying).length, partiesRead: stats.partiesSeen, governmentPartiesLeftOut: stats.government,
    agOfficeSettlementsLeftOut: stats.skippedOfficeSettlements, amountSuspectActionLinks: suspect, peopleLeftOut: stats.people.size, placeholdersLeftOut: stats.placeholders.size },
  peopleLeftOut: [...stats.people].sort(),
  placeholdersLeftOut: [...stats.placeholders].sort(),
};
writeFileSync(P(OUT + 'recipients.json'), '{\n' + Object.entries(meta).map(([k, v]) => JSON.stringify(k) + ': ' + JSON.stringify(v)).join(',\n')
  + ',\n"recipients": [\n' + rows.map(r => JSON.stringify(r)).join(',\n') + '\n]\n}\n');

// search lists. DOE: every recipient (state committees and candidates take corporate and nonprofit money). The chain
// orgs from manual-actions.json go first, then recipients with qualifying actions by total dollars, then the rest.
// one action counted once even when several officials voted on it; amounts flagged amountSuspect are left out
const dollars = r => { const by = new Map(); for (const a of r.actions) if (a.counts && a.money === 'paid' && !a.amountSuspect) by.set(a.id, Number(a.funded && a.funded.amount != null ? a.funded.amount : a.amount ?? a.ask ?? 0) || 0); return [...by.values()].reduce((s, x) => s + x, 0); };
const searchName = n => splitDba(n)[0].replace(/\(.*?\)/g, ' ').replace(/[,.]?\s*\b(inc|incorporated|llc|l\.l\.c|corp|corporation|co|company|ltd|lp|llp|lllp|p\.?a|pllc)\b\.?\s*$/i, '').replace(/^the\s+/i, '').replace(/\s+/g, ' ').trim();
// The term typed into the contributor-name box: the leading run of plain words. An apostrophe, '&' or other punctuation
// is stored inconsistently in DOE contributor names, so the term stops before the first word that has one (when at
// least two words come before it); otherwise that punctuation is dropped. Rows found are then kept only on a full match
// (README.md, matching).
function searchTerm(sn) {
  const w = sn.split(' ');
  const i = w.findIndex(x => /[^A-Za-z0-9\u00C0-\u017F-]/.test(x));
  if (i >= 2 && !w.slice(0, i).every(x => GENERIC.has(norm(x)) || /^(of|the|and|university|police)$/i.test(x))) return w.slice(0, i).join(' ');
  return sn.replace(/['\u2019]/g, '').replace(/[^A-Za-z0-9\u00C0-\u017F -]/g, ' ').replace(/\s+/g, ' ').trim();
}
const doe = [];
const seen = new Set();
const push = (row) => { row.splice(2, 0, searchTerm(row[1])); const s = row[2].toLowerCase() + '|' + row[1].toLowerCase(); if (!row[2] || seen.has(s)) return; seen.add(s); doe.push(row); };
push(['hope-florida', searchName('The Hope Florida Foundation, Inc.'), 'The Hope Florida Foundation, Inc.', 'chain', 'ashley-moody', '10000000', '2024-09-27', '93-3379025', '']);
for (const o of M.chain.orgs.filter(o => o.receivedFrom && o.ein)) push(['hope-florida', searchName(o.name), o.name, 'chain', 'ashley-moody', '', '', o.ein || '', '']);
const ranked = rows.map(r => ({ r, d: dollars(r) })).sort((a, b) => (b.r.qualifying > 0) - (a.r.qualifying > 0) || b.d - a.d || a.r.key.localeCompare(b.r.key));
for (const { r, d } of ranked) {
  const sn = searchName(r.name);
  if (sn.replace(/[^a-z0-9]/gi, '').length < 4) continue;   // too short to search as "contains"
  const last = r.actions.filter(a => a.counts && a.money === 'paid').map(a => a.date || '').sort().pop() || '';
  // a recipient whose last qualifying action is before 2014 has no 24-month window inside a since-2016 search
  const tier = !r.qualifying ? 'unknown-vote-or-unclear' : last < '2014-01-01' ? 'qualifying-before-2014' : 'qualifying';
  push([r.key, sn, r.name, tier, r.officials.join(' '), String(Math.round(d)), last, r.ids.ein || '', r.aliases.slice(0, 3).join(' | ')]);
}
const TIER = { chain: 0, qualifying: 1, 'qualifying-before-2014': 2, 'unknown-vote-or-unclear': 3 };
doe.sort((a, b) => TIER[a[4]] - TIER[b[4]]);
writeFileSync(P(OUT + 'doe-search.tsv'), ['key\tsearch_name\tsearch_term\trecipient\ttier\tofficials\tqualifying_dollars\tlast_paid_action\tein\taliases', ...doe.map(x => x.map(c => String(c).replace(/[\t\n]/g, ' ')).join('\t'))].join('\n') + '\n');

// FEC: federal committees take no corporate or union treasury money except super PACs and other independent-expenditure-
// only committees (and party building funds), so the likely federal donors are for-profit companies, trade and
// membership associations, unions and 501(c)(4) groups. Charities (foundations, churches, schools, 501(c)(3)) are
// barred from political giving; they stay off this list unless named in the chain.
const C3 = /\b(foundation|church|ministr(y|ies)|temple|synagogue|academy|school|college|university|hospital|museum|theat(er|re)|orchestra|ballet|opera|ymca|ywca|habitat for humanity|united way|red cross|salvation army|goodwill|catholic charities|boys (and|&) girls|children's|child|youth|scholarship|charter)\b/i;
const C6 = /\b(association|assn|chamber|council|league|federation|union|alliance|coalition|society|institute|board of realtors|realtors|builders)\b/i;
const FORPROFIT = /\b(inc|incorporated|llc|l\.l\.c|corp|corporation|co|company|ltd|lp|llp|lllp|p\.?a|pllc|holdings|partners|group|enterprises|bank)\b\.?/i;
const fec = [];
const fseen = new Set();
const fpush = row => { const s = row[1].toLowerCase(); if (fseen.has(s)) return; fseen.add(s); fec.push(row); };
for (const o of M.chain.orgs.filter(o => o.receivedFrom && /501\(c\)\(4\)/.test(o.irsSubsection || ''))) fpush(['hope-florida', searchName(o.name), o.name, 'chain: 501(c)(4) may give to super PACs', o.ein || '']);
for (const { r } of ranked) {
  const n = r.name;
  let why = null;
  if (C3.test(n) && !C6.test(n)) continue;
  if (C6.test(n)) why = 'association/union/chamber: may give to federal PACs or super PACs';
  else if (FORPROFIT.test(n)) why = 'company: may give to super PACs';
  else continue;
  const sn = searchName(n);
  if (sn.replace(/[^a-z0-9]/gi, '').length < 4) continue;
  fpush([r.key, sn, n, why + (r.qualifying ? '' : ' (no qualifying action yet)'), r.ids.ein || '']);
}
writeFileSync(P(OUT + 'fec-search.tsv'), ['key\tcontributor_name\trecipient\twhy\tein', ...fec.map(x => x.map(c => String(c).replace(/[\t\n]/g, ' ')).join('\t'))].join('\n') + '\n');

console.log(JSON.stringify(meta.counts, null, 1));
console.log('doe-search.tsv', doe.length, 'names; fec-search.tsv', fec.length, 'names');
