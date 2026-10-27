// Earlier legislative seats (Florida House, Florida Senate, U.S. House) for scripts/prior-offices.mjs.
//
// Same standard as the current state and federal lists (scripts/data/tenure/STANDARD.md):
// - Requests: every budget request the member filed in that seat (House Appropriations Project Requests or project
//   bills, Senate Local Funding Initiative Requests). A request ties when the group getting the money, the lobbyist
//   named on the form, the lobbying firm, or another lobbyist that firm lists in that year's Legislature directory
//   gave to the member (name match; a person needs a lobbying, government or legal occupation on the report).
// - Laws: every enacted law in the seat's sessions whose own staff analysis (CRS summary for Congress) names a kind
//   of business that benefits. It ties when donors in that kind of business (scripts/data/industry tags and the
//   law's class pattern on name and occupation; federal: that industry's PACs) gave to the member. Yes and no votes
//   make the share's pool; only a yes vote counts as tied and toward the money (Brit, Oct 27, 2026).
// - Donors: that seat's campaign account and the political committees the state registers with the member as chair
//   (scripts/data/tenure/doe-browser/README.md), from one cycle before the term to its end.
// A share is given only when every item in it could be checked; otherwise the items are listed and the page says
// what is still being read.
import { materiality } from './lib/materiality.mjs';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { pkey, dkey } from './lib/city.mjs';
import { fitsLaw, execPending, recordFor } from './lib/donor-class.mjs';
import { voteStatus } from './lib/contested.mjs';

const root = new URL('../', import.meta.url);
const P = p => new URL(p, root);
const has = p => existsSync(P(p));
const J = p => JSON.parse(readFileSync(P(p)));
const opt = p => has(p) ? J(p) : {};
const T = 'scripts/data/tenure/';
const DOE = T + 'doe-browser/';

// ---- donors -------------------------------------------------------------------------------------------------------
// DOE tab-delimited rows; `acct` keeps rows whose first column contains it (an office tag or a name)
const doe = (f, acct) => {
  if (!has(f)) return [];
  return readFileSync(P(f), 'utf8').split(/\r?\n/).filter(l => l.trim() && !l.startsWith('Candidate/Committee')).map(l => l.split('\t'))
    .filter(c => c.length >= 8 && (!acct || [].concat(acct).every(a => c[0].includes(a))) && !['INT', 'REF', 'LOA', 'COF'].includes(c[3]) && Number(c[2]) > 0)
    .map(c => { const [m, d, y] = c[1].split('/'); return { donor: c[4].replace(/\s+/g, ' ').trim(), amount: Number(c[2]), date: `${y}-${m}-${d}`, occ: (c[7] || '').trim(), addr: c[5] || '', city: c[6] || '', acct: f.split('/').pop().replace(/\.tsv$/, '') }; });
};
const SRC = {
  'vicki-l-lopez|fl-house': [[DOE + 'lopez-house.tsv', '(STR)'], [DOE + 'pc80020-lopez-pre2025.tsv'], ['scripts/data/county/donors/pc80020.tsv']],
  'byron-donalds|fl-house': [[DOE + 'donalds-house.tsv', '(STR)']],
  'bryan-avila|fl-house': [[DOE + 'avila-cand.tsv', '(STR)'], [DOE + 'pc64489-avila.tsv']],
  'blaise-ingoglia|fl-house': [[DOE + 'ingoglia-cand.tsv', '(STR)'], [DOE + 'pc70076-ingoglia-pre2020.tsv'], [T + 'flsenate/donors/pc70076.tsv'], [T + 'flsenate/donors/pc79506.tsv']],
  'ana-maria-rodriguez|fl-house': [[DOE + 'amrodriguez-house.tsv', '(STR)'], [DOE + 'pc70258-amr-pre2018.tsv'], [T + 'flsenate/donors/pc70258.tsv']],
  'javier-fernandez|fl-house': [[DOE + 'fernandez-house.tsv', '(STR)']],
  'jared-moskowitz|fl-house': [[DOE + 'moskowitz-house.tsv', '(STR)']],
  'bryan-avila|fl-senate': [[DOE + 'avila-cand.tsv', '(STS)'], [DOE + 'pc64489-avila.tsv']],
  'annette-taddeo|fl-senate': [[DOE + 'taddeo-cand.tsv', '(STS)']],
  'wilton-simpson|fl-senate': [[DOE + 'simpson-cand.tsv', '(STS)'], ...['pc60614', 'pc74435', 'pc74437', 'pc79644-simpson-pre2025', 'pc88885'].map(f => [DOE + (f.includes('-') ? f : f + '-simpson') + '.tsv'])],
  'jose-javier-rodriguez|fl-senate': [[DOE + 'jjrodriguez-cand.tsv', 'Rodriguez, Jose Javier']],
  'daphne-campbell|fl-senate': [[DOE + 'campbell-cand.tsv', '(STS)']],
};
// Industry tags for state donors: the 2025-26 file wins, then the tenure files, then the browser pulls
const TAGS = { ...opt(DOE + 'industry.json').donors, ...opt(T + 'prior-flsenate/donors/industry-pre2025.json').donors, ...opt(T + 'flsenate/donors/industry-pre2025.json').donors, ...opt(T + 'flhouse/donors/industry-pre2025.json').donors, ...J('scripts/data/industry/state-donors.json').donors };
const tagOf = n => (TAGS[n.toUpperCase()] || {}).tags || [];

// ---- laws ---------------------------------------------------------------------------------------------------------
const CLS = { ...opt(T + 'prior-flsenate/bills/classes-by-chapter.json'), ...opt(T + 'prior-flhouse/bills/classes-by-chapter.json'), ...opt(T + 'flsenate/bills/classes-senate.json'),
  ...opt(T + 'flhouse/bills/classes-2122.json'), ...opt(T + 'flhouse/bills/classes-by-chapter.json'), ...opt('scripts/data/state/bills/classes-by-chapter.json') };
// Which donors count for a law: scripts/data/industry/INSTRUCTIONS.md (scripts/lib/donor-class.mjs)
const fits = (K, name, occ) => fitsLaw(K, name, occ, tagOf(name));
// Laws whose analysis states no benefit to the business it names are left out (scripts/data/industry/not-a-benefit.json)
const NOT_A_BENEFIT = J('scripts/data/industry/not-a-benefit.json').laws;
// Every qualifying law by chapter, from every screened file (one reading per chapter)
const LAWS = {};
const addLaw = b => { if (b && b.benefits && b.chapter && !LAWS[b.chapter] && !NOT_A_BENEFIT[b.chapter]) LAWS[b.chapter] = b; };
for (const dir of [T + 'prior-flhouse/', T + 'flhouse/']) if (has(dir)) for (const f of readdirSync(P(dir)).filter(f => /^bills-\d+\.json$/.test(f))) for (const b of J(dir + f).bills || []) addLaw(b);
for (const b of (opt('scripts/data/state/bills/universe.json').bills || [])) addLaw(b);
for (const f of [T + 'flsenate/bills/stageB.jsonl', T + 'prior-flsenate/bills/stageB.jsonl']) if (has(f)) for (const l of readFileSync(P(f), 'utf8').split('\n').filter(Boolean)) {
  const b = JSON.parse(l); if (b.b && b.ch && !LAWS[b.ch] && !NOT_A_BENEFIT[b.ch]) LAWS[b.ch] = { chapter: b.ch, bill: b.bill || '', title: b.title || '', analysisUrl: b.au, benefits: { category: b.cat, quote: b.q } };
}
// House votes: the House slices' bills files (roll keyed by member)
const houseVotes = key => {
  const out = {};
  for (const dir of [T + 'prior-flhouse/']) for (const f of readdirSync(P(dir)).filter(f => /^bills-\d+\.json$/.test(f))) for (const b of J(dir + f).bills || []) {
    const h = b.votes && b.votes.house; if (!b.benefits || !h || !h.roll || !(key in h.roll)) continue;
    out[b.chapter] = { date: h.date, v: h.roll[key], url: h.url, tally: h.tally };
  }
  return out;
};
// Senate votes: the last final-passage sheet read per chapter (prior-flsenate/bills/rolls.jsonl)
const SROLL = {};
for (const f of [T + 'prior-flsenate/bills/rolls.jsonl']) if (has(f)) for (const l of readFileSync(P(f), 'utf8').split('\n').filter(Boolean)) { const c = JSON.parse(l); SROLL[c.ch] = c; }
for (const dir of [T + 'prior-flsenate/']) if (has(dir)) for (const f of readdirSync(P(dir)).filter(f => /^bills-\d+\.json$/.test(f))) for (const b of J(dir + f).bills || []) {
  const s = b.votes && b.votes.senate; if (b.benefits) addLaw(b); if (s && s.roll) SROLL[b.chapter] = { ch: b.chapter, d: s.date, u: s.url, t: s.tally, r: s.roll };
}
const isoD = s => { const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : (s || null); };
const vote = x => { x = String(x || '').toLowerCase(); return /^y/.test(x) ? 'yes' : /^n(o|ay)$/.test(x) ? 'no' : /not seated/.test(x) ? null : /excused|absent/.test(x) ? 'absent' : /not voting|nv/.test(x) ? 'absent' : x ? 'unknown' : null; };

// ---- requests -----------------------------------------------------------------------------------------------------
const FIRMS = { ...opt(T + 'prior-flsenate/lobbyfirms/firms-by-year.json'), ...opt(T + 'flsenate/lobbyfirms/firms-by-year.json') };
const F2526 = opt('scripts/data/state/lobbyfirms/firms.json').firms || {};
const norm = s => String(s || '').toUpperCase().replace(/&/g, ' AND ').replace(/[.,'"()\-]/g, ' ').replace(/\s+/g, ' ').trim();
const SUFFIX = /\b(LLC|INC|PA|P A|PLLC|LLP|THE|CORP|CO)\b/g;
const phrase = s => ' ' + norm(s).replace(SUFFIX, '').replace(/\b(AND|OF)\b/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
const LOBOCC = /LOBBY|GOVERNMENT|GOVT|GOV\b|CONSULT|ATTORNEY|LAWYER|LAW FIRM|PUBLIC AFFAIRS|ADVOCA/i;
const ORG = /\b(INC|LLC|PAC|COMMITTEE|CORP|GROUP|TRUST|ASSOCIATES|P A|PA)\b/;
const firmList = (name, year) => {
  const D = FIRMS[String(year)] || F2526; const n = norm(name).replace(SUFFIX, '').replace(/\s+/g, ' ').trim();
  for (const k of Object.keys(D)) { const kk = norm(k).replace(SUFFIX, '').replace(/\s+/g, ' ').trim(); if (kk === n || (n.length > 8 && (kk.includes(n) || n.includes(kk)))) return D[k]; }
  return null;
};
const personHit = (p, r) => { // "Last, First" or "First Last" against a donor row
  const s = p.includes(',') ? p.split(',').map(x => x.trim()) : [p.trim().split(/\s+/).pop(), p.trim().split(/\s+/)[0]];
  const last = norm(s[0].replace(/\s+(Jr|Sr|III|II)\.?$/i, '')), first = norm((s[1] || '').replace(/\(.*?\)/g, '')).split(' ')[0];
  const w = new Set(norm(r.donor).split(' '));
  return last && first && w.has(last) && w.has(first) && !ORG.test(norm(r.donor)) && LOBOCC.test(r.occ);
};
const requestGifts = (q, rows) => {
  const g = [], seen = new Set();
  const push = (r, k, why) => { const id = [r.acct, r.donor, r.amount, r.date].join('|'); if (seen.has(id)) return; seen.add(id); g.push({ n: r.donor, amt: r.amount, dt: r.date, k, why }); };
  const rk = q.recipient ? pkey(q.recipient) : '';
  for (const r of rows) { const dk = dkey(r.donor); if (rk && (dk === rk || (rk.split(' ').length >= 2 && dk.startsWith(rk + ' ')))) push(r, 'party'); }
  const year = String(q.fy || '').slice(0, 4) || String(q.date || '').slice(0, 4);
  for (const l of q.lobbied || []) {
    if (l.name && !/^none$/i.test(l.name)) for (const r of rows) if (personHit(l.name, r)) push(r, 'lob', l.name);
    const firm = l.firm && !/^(none|n\/a)$/i.test(l.firm) ? l.firm : null; if (!firm) continue;
    const ph = phrase(firm); if (ph.trim().length > 4) for (const r of rows) if (phrase(r.donor).includes(ph)) push(r, 'firm', firm);
    const L = firmList(firm, year) || []; for (const p of L) for (const r of rows) if (personHit(p, r)) push(r, 'firmlob', firm);
  }
  return g;
};
const houseRequests = (pid, key) => {
  const out = [];
  for (const f of readdirSync(P(T + 'prior-flhouse/')).filter(f => /^requests-\d+\.json$/.test(f))) {
    const R = J(T + 'prior-flhouse/' + f);
    for (const q of R.requests || []) if (q.pid === pid || q.member === key) out.push({ ...q, partial: !!R.listPartial });
  }
  return out;
};
const senateRequests = key => {
  const out = [];
  for (const f of readdirSync(P(T + 'prior-flsenate/')).filter(f => /^requests-[\d-]+\.json$/.test(f))) for (const q of J(T + 'prior-flsenate/' + f).requests || []) if (q.member === key) out.push(q);
  return out;
};

// ---- build --------------------------------------------------------------------------------------------------------
const pair = (t, n) => { const a = Math.round(t / n * 100); return t && !a ? ['<1%', '>99%'] : t < n && a === 100 ? ['>99%', '<1%'] : [a + '%', (100 - a) + '%']; };
// Donors tied only to items voted no on, with gifts the headline (counted: key -> amount) does not already count.
// Context only, never in the money total (Brit, Oct 27, 2026). null when there are none.
export function againstOf(noActs, counted, gk) {
  const fresh = new Map(); let votes = 0;
  for (const a of noActs) {
    const gs = a.g.filter(g => !counted.has(gk(g)));
    if (!gs.length) continue;
    votes++;
    for (const g of gs) fresh.set(gk(g), g);
  }
  if (!votes) return null;
  const gs = [...fresh.values()];
  return { votes, money: Math.round(gs.reduce((s, g) => s + g.amt, 0) * 100) / 100, donors: new Set(gs.map(g => dkey(g.n))).size };
}
// pending: optional list; gets every gift on a contested yes vote that would count with an executive's official
// record (donor-class rule 5), for scripts/exec-candidates.mjs
export function buildLegislative(nameOf = x => x, pending = null) {
  const out = [];
  const offices = [...(opt(T + 'prior-flhouse/offices.json').length ? J(T + 'prior-flhouse/offices.json') : []), ...(opt(T + 'prior-flsenate/offices.json').length ? J(T + 'prior-flsenate/offices.json') : [])];
  for (const o of offices) {
    const id = o.pid + '|' + o.body;
    if (!SRC[id]) continue;
    // the Simpson 2012-2016 seat and anything else with its own entry: same sources, own dates
    const key = o.key || ({ 'bryan-avila': 'Avila', 'annette-taddeo': 'Taddeo', 'wilton-simpson': 'Simpson', 'jose-javier-rodriguez': 'Rodriguez', 'daphne-campbell': 'Campbell' })[o.pid];
    const start = o.start, end = o.end, from = o.giftsFrom;
    const inTerm = d => d && d >= start && (!end || d <= end);
    const rows = SRC[id].flatMap(([f, a]) => doe(f, a)).filter(r => (!from || r.date >= from) && (!end || r.date <= end));
    const self = dkey(nameOf(o.pid) || "");
    const gifts = rows.filter(r => !self || dkey(r.donor) !== self);
    // a donor is in the business when any occupation they reported to this seat's accounts shows it
    const occsOf = new Map(); for (const r of gifts) if (r.occ) { const n = r.donor.toUpperCase(); if (!occsOf.has(n)) occsOf.set(n, new Set()); occsOf.get(n).add(r.occ); }
    for (const [n, v] of occsOf) occsOf.set(n, [...v]);
    // requests
    const RQ = (o.body === 'fl-house' ? houseRequests(o.pid, key) : senateRequests(o.pid === 'jose-javier-rodriguez' ? 'JJRodriguez' : key))
      .filter(q => { const y = Number(String(q.fy).slice(0, 4)); return y >= Number(start.slice(0, 4)) && y <= Number((end || '2099').slice(0, 4)) + (o.body === 'fl-senate' ? 0 : 0); });
    const reqs = RQ.map(q => {
      const read = q.formRead !== false;
      const g = read ? requestGifts(q, gifts) : [];
      return { d: /^\d{4}-\d\d-\d\d$/.test(q.date || '') ? q.date : null, fy: q.fy, t: q.title || '', r: q.bill || (q.form ? (o.body === 'fl-house' ? 'APR ' : 'SF ') + q.form : ''), rec: q.recipient || null, ask: q.ask || null,
        b: q.budget || null, l: (q.lobbied || []).map(x => [x.name, x.firm].filter(y => y && !/^none$/i.test(y)).join(', ')).filter(Boolean), read, u: q.record || q.textUrl || null, g };
    });
    const unread = reqs.filter(x => !x.read).length;
    // laws
    const V = o.body === 'fl-house' ? houseVotes(key) : (() => {
      const m = {}; for (const [ch, c] of Object.entries(SROLL)) { const r = c.r || {}; const v = r[o.pid === 'jose-javier-rodriguez' ? 'JJRodriguez' : key] ?? (o.pid === 'jose-javier-rodriguez' ? r.Rodriguez : undefined); if (v != null) m[ch] = { date: isoD(c.d), v, url: c.u, tally: c.t }; } return m; })();
    const laws = [];
    for (const [ch, x] of Object.entries(V)) {
      const b = LAWS[ch]; if (!b) continue;
      const v = vote(x.v); if (!v) continue;
      const yr = Number(ch.slice(0, 4)), d = x.date || null;
      if (d ? !inTerm(d) : (yr < Number(start.slice(0, 4)) || (end && yr > Number(end.slice(0, 4))))) continue;
      const K = CLS[ch];
      // an executive who counts through an official record of their stake (donor-class rule 5) carries the record
      const recOf = r => { const os = occsOf.get(r.donor.toUpperCase()) || [r.occ]; if (os.some(o => fits(K, r.donor, o) && !recordFor(K, r.donor, o, tagOf(r.donor)))) return null; for (const o of os) { const x = recordFor(K, r.donor, o, tagOf(r.donor)); if (x) return { company: x.company, role: x.role, url: x.recordUrl }; } return null; };
      const g = K ? gifts.filter(r => r.occ && (occsOf.get(r.donor.toUpperCase()) || [r.occ]).some(o => fits(K, r.donor, o))).map(r => { const rec = recOf(r); return { n: r.donor, amt: r.amount, dt: r.date, k: 'class', occ: r.occ, ...(rec ? { rec } : {}) }; }) : [];
      // vs: contested (a recorded no), unanimous or unknown tally; only a contested yes ties (Brit, Oct 27, 2026)
      laws.push({ d, ch, t: b.title || '', r: (b.bill || '') + ' · Ch. ' + ch, cat: (b.benefits || {}).category || '', v, vs: voteStatus(x.tally, null, false), u: x.url || b.url || null, cls: !!K, g });
      if (pending && K && v === 'yes' && voteStatus(x.tally, null, false) === 'contested') for (const r of gifts) {
        const occs = r.occ ? (occsOf.get(r.donor.toUpperCase()) || [r.occ]) : [];
        // counts without a record: not a candidate; waits on a record or counts through one: listed
        if (!occs.length || occs.some(o => fits(K, r.donor, o) && !recordFor(K, r.donor, o, tagOf(r.donor)))) continue;
        if (!occs.some(o => execPending(K, r.donor, o, tagOf(r.donor)) || recordFor(K, r.donor, o, tagOf(r.donor)))) continue;
        pending.push({ donor: r.donor, occ: r.occ, occs, addr: r.addr, city: r.city, amount: r.amount, date: r.date, acct: r.acct, pid: o.pid, office: o.body, card: (b.bill || '') + ' · Ch. ' + ch, ch, vote: x.url || null, cls: K });
      }
    }
    // $1,000 threshold (scripts/lib/materiality.mjs): persons whose total giving to this seat in the window is under
    // $1,000, and who are not registered lobbyists tied here, are listed (gb) but not counted
    const M = materiality([...reqs.flatMap(x => x.g), ...gifts.map(r => ({ n: r.donor, amt: r.amount, dt: r.date, occ: r.occ }))],
      { donorOf: g => dkey(g.n), amountOf: g => g.amt, giftId: g => dkey(g.n) + '|' + g.amt + '|' + g.dt });
    for (const x of [...reqs, ...laws]) { const below = x.g.filter(g => !M.counts(g)); if (below.length) { x.g = x.g.filter(M.counts); x.gb = below; } }
    laws.sort((a, b) => String(b.d || b.ch).localeCompare(String(a.d || a.ch)));
    reqs.sort((a, b) => String(b.d || b.fy).localeCompare(String(a.d || a.fy)));
    // the pool: contested votes cast (unanimous laws and laws whose tally is not known are left out)
    const castAll = laws.filter(x => x.v === 'yes' || x.v === 'no'), castL = castAll.filter(x => x.vs === 'contested'), noCls = castL.filter(x => !x.cls).length;
    // Years of this term whose laws are not all screened yet (prior-flhouse/bills-<year>.json counts): no share until done
    const pendYears = [];
    // a year counts only if the term covers that year's regular session (Jan-May); done if either slice screened every law
    const y0 = Number(start.slice(0, 4)) + (Number(start.slice(5, 7)) > 5 ? 1 : 0), y1 = end ? Number(end.slice(0, 4)) - (Number(end.slice(5, 7)) < 3 ? 1 : 0) : 2026;
    for (let y = y0; y <= y1; y++) {
      const cs = ['prior-flhouse', 'prior-flsenate', 'flhouse'].map(d => T + d + '/bills-' + y + '.json').filter(has).map(f => J(f).counts || {}).filter(c => c.enacted);
      if (cs.length && !cs.some(c => c.screened >= c.enacted)) pendYears.push(y);
    }
    // tied laws: a yes vote on a law that helps an industry whose donors gave (Brit, Oct 27, 2026)
    const lawShare = castL.length && !noCls && !pendYears.length && gifts.length ? { n: castL.length, tied: castL.filter(x => x.g.length && x.v === 'yes').length, from: (castL.map(x => x.d).filter(Boolean).sort()[0] || String(castL.map(x => x.ch).sort()[0]).slice(0, 4)) } : null;
    const reqShare = reqs.length && !unread && gifts.length ? { n: reqs.length, tied: reqs.filter(x => x.g.length).length, from: reqs.map(x => x.d).filter(Boolean).sort()[0] || String(reqs.map(x => x.fy).sort()[0]) } : null;
    const tiedGifts = new Map(), gk = g => g.n + '|' + g.amt + '|' + g.dt, yesL = castL.filter(x => x.v === 'yes');
    for (const x of [...reqs, ...yesL]) for (const g of x.g) tiedGifts.set(gk(g), g.amt);
    const against = againstOf(castL.filter(x => x.v === 'no'), tiedGifts, gk);
    out.push({ pid: o.pid, office: {
      kind: 'leg', body: o.body, start, end: end || null, office: o.office || '', district: o.district || null, source: o.source || null,
      donors: gifts.length ? 'files' : 'notCollected', gifts: gifts.length, giftTotal: Math.round(gifts.reduce((s, r) => s + r.amount, 0) * 100) / 100,
      money: Math.round([...tiedGifts.values()].reduce((s, x) => s + x, 0)), moneyDonors: new Set([...[...reqs, ...yesL].flatMap(x => x.g.map(g => dkey(g.n)))]).size,
      ...(against ? { against } : {}),
      requests: { n: reqs.length, unread, share: reqShare, list: reqs, none: o.noRequestSystem || null },
      laws: { n: laws.length, cast: castAll.length, contested: castL.length, noClass: noCls, share: lawShare, list: laws, pending: pendYears.length ? pendYears : (o.lawsPending || null) },
      counts: { actions: reqs.length + laws.length },
    } });
  }
  // U.S. House (prior-congress): laws with a House roll call; PAC gifts by industry class
  const PC = T + 'prior-congress/';
  if (has(PC + 'offices.json') && has(PC + 'floor-votes.json')) {
    const fv = J(PC + 'floor-votes.json');
    const classes = { ...opt('scripts/data/federal/floor-votes.json').classes, ...opt(T + 'congress/floor-votes-tenure.json').classes, ...fv.classes };
    const R = J(PC + 'fec-receipts.json'), cols = R.cols;
    const rec = R.rows.map(r => Object.fromEntries(cols.map((k, i) => [k, r[i]])));
    for (const o of J(PC + 'offices.json').filter(x => x.body === 'us-house')) {
      const key = o.memberKey || o.pid.split('-').pop().replace(/^./, c => c.toUpperCase());
      const mine = rec.filter(x => x.member === key && x.amount > 0 && x.date >= (o.giftsFrom || '') && x.date <= o.end);
      const laws = [];
      for (const b of fv.bills) for (const v of b.votes) {
        if (v.chamber !== 'house' || !v.members || v.members[key] == null) continue;
        const vv = vote(v.members[key]); if (!vv) continue;
        const cls = classes[b.class];
        // a conditional benefit ties no PAC (scripts/data/industry/INSTRUCTIONS.md, rule 7)
        const g = cls && !b.conditional ? mine.filter(x => cls.donors.some(([re]) => new RegExp(re).test(x.contributor))).map(x => ({ n: x.contributor, amt: x.amount, dt: x.date, k: 'pac' })) : [];
        laws.push({ d: v.date, ch: b.law, t: (b.subject && b.subject.en) || '', r: b.ref + ' · ' + b.law, cat: (cls && cls.label && cls.label.en) || '', v: vv, vs: voteStatus(v.tally, v.members, false), u: b.bill, cls: !!cls, g });
      }
      laws.sort((a, b) => b.d.localeCompare(a.d));
      // the pool: contested votes cast (unanimous laws and laws whose tally is not known are left out)
    const castAll = laws.filter(x => x.v === 'yes' || x.v === 'no'), castL = castAll.filter(x => x.vs === 'contested'), noCls = castL.filter(x => !x.cls).length;
      const tied = new Map(), gk = g => g.n + '|' + g.amt + '|' + g.dt, yesL = castL.filter(x => x.v === 'yes');
      for (const x of yesL) for (const g of x.g) tied.set(gk(g), g.amt);
      const against = againstOf(castL.filter(x => x.v === 'no'), tied, gk);
      out.push({ pid: o.pid, office: {
        kind: 'leg', body: 'us-house', start: o.start, end: o.end, office: o.office, district: o.district, source: o.source || null,
        donors: mine.length ? 'files' : 'notCollected', gifts: mine.length, giftTotal: Math.round(mine.reduce((s, x) => s + x.amount, 0)),
        money: Math.round([...tied.values()].reduce((s, x) => s + x, 0)), moneyDonors: new Set(yesL.flatMap(x => x.g.map(g => g.n))).size,
        ...(against ? { against } : {}),
        requests: { n: 0, unread: 0, share: null, list: [], none: 'earmarks' },
        laws: { n: laws.length, cast: castAll.length, contested: castL.length, noClass: noCls, share: castL.length && !noCls ? { n: castL.length, tied: yesL.filter(x => x.g.length).length, from: castL.map(x => x.d).sort()[0] } : null, list: laws, fed: true },
        counts: { actions: laws.length },
      } });
    }
  }
  return out;
}
export { pair };
