// Builds the source library catalog: one line per distinct source document cited anywhere in the research data.
// Output: scripts/data/sources/catalog.jsonl (see scripts/data/SOURCES.md for the fields and the capture rule).
// Rerunnable: archive fields (archived, sha256, bytes, fetched, textChars, error...) carry over from the existing catalog.
// Run: node scripts/sources/catalog.mjs [--carry other-catalog.jsonl ...] [--quiet]
//   --carry  also carry archive fields from another copy of the catalog (the archive job uses this after a merge conflict).
// Reads only files tracked by git (plus the inbox), so gitignored private files never feed the public catalog.
import { readFileSync, readdirSync, existsSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ROOT, CATALOG, INBOX, ARCHIVE_PREFIX, idOf, cleanUrl, parseDocUrl, kindOf, rawExt, loadBlocked, readCatalog, writeCatalog, ARCHIVE_FIELDS } from './lib.mjs';

const args = process.argv.slice(2);
const carryFiles = args.flatMap((a, i) => a === '--carry' ? [args[i + 1]] : []);
const quiet = args.includes('--quiet');
const P = p => ROOT + p;
const blocked = loadBlocked();

// ---------- files ----------
let tracked;
try { tracked = execFileSync('git', ['-C', ROOT, 'ls-files', '-z', 'scripts/data', 'public/data'], { maxBuffer: 1 << 28 }).toString().split('\0').filter(Boolean); }
catch { console.error('catalog: git ls-files failed; run inside the repo checkout'); process.exit(1); }
tracked = tracked.filter(f => existsSync(P(f))).sort();
const skip = f => f.startsWith('scripts/data/sources/') || f === 'scripts/data/research-index.json' || f.includes('/__pycache__/') || f.includes('/node_modules/');
const scanFiles = tracked.filter(f => !skip(f) && (/\.(json|jsonl)$/.test(f) || (f.startsWith('scripts/data/') && /\.(md|tsv)$/.test(f))));
const textFiles = tracked.filter(f => !skip(f) && f.startsWith('scripts/data/') && /\.(txt|ocr)$/i.test(f) && !/\/(fetch|log|errors?)[^/]*\.txt$/i.test(f));
const rawFiles = tracked.filter(f => !skip(f) && f.startsWith('scripts/data/') && /\.(pdf|html?|xlsx?)$/i.test(f));

// ---------- people ids ----------
const PIDS = new Set();
const optJ = p => { try { return JSON.parse(readFileSync(P(p), 'utf8')); } catch { return null; } };
for (const p of ['public/data/offices-held.json', 'public/data/money-summary.json', 'public/data/business.json', 'public/data/gaps.json', 'public/data/connections.json'])
  for (const k of Object.keys((optJ(p) || {}).people || {})) PIDS.add(k);
for (const f of existsSync(P('public/data/prior')) ? readdirSync(P('public/data/prior')) : []) if (f.endsWith('.json') && f !== 'index.json') PIDS.add(f.slice(0, -5));
const roster = optJ('public/data/roster.json');
(function grab(o, d = 0) { if (!o || typeof o !== 'object' || d > 6) return; if (Array.isArray(o)) return o.forEach(x => grab(x, d + 1)); if (typeof o.pid === 'string') PIDS.add(o.pid); if (typeof o.id === 'string' && /^[a-z]+(-[a-z0-9]+)+$/.test(o.id) && o.name) PIDS.add(o.id); for (const v of Object.values(o)) grab(v, d + 1); })(roster);
const isPid = s => typeof s === 'string' && PIDS.has(s);
const PID_FIELDS = ['pid', 'p', 'person', 'personId', 'official', 'member', 'candidate', 'who'];
const pathPids = f => f.split('/').map(s => s.replace(/\.(json|jsonl|md|tsv)$/, '')).filter(isPid);

// ---------- dates ----------
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = n => String(n).padStart(2, '0');
const okY = y => y >= 1980 && y <= 2030;
function normDate(v, key = '') {
  if (v == null) return null;
  if (typeof v === 'number') return /year|^y$|^yr$/i.test(key) && okY(v) ? String(v) : null;
  if (typeof v !== 'string' || v.length > 40) return null;
  let m;
  if ((m = v.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/)) && okY(+m[1])) return m[3] ? `${m[1]}-${m[2]}-${m[3]}` : `${m[1]}-${m[2]}`;
  if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)) && okY(+m[3])) return `${m[3]}-${pad(m[1])}-${pad(m[2])}`;
  if ((m = v.match(/^([A-Za-z]{3})[a-z]*\.? (\d{1,2}),? (\d{4})/)) && MONTHS[m[1].toLowerCase()] && okY(+m[3])) return `${m[3]}-${pad(MONTHS[m[1].toLowerCase()])}-${pad(m[2])}`;
  if ((m = v.match(/^(\d{4})$/)) && okY(+m[1]) && /year|date|^y$|^d$/i.test(key)) return m[1];
  return null;
}
const DATE_FIELDS = ['date', 'd', 'dt', 'meetingDate', 'meeting_date', 'filed', 'year', 'y', 'published', 'signed', 'adopted', 'when', 'day'];

// ---------- titles ----------
const L = v => v && typeof v === 'object' && !Array.isArray(v) ? (typeof v.en === 'string' ? v.en : null) : (typeof v === 'string' ? v : null);
const TITLE_FIELDS = ['title', 'headline', 'item', 'subject', 'label', 'name', 'caption', 'business', 'meeting', 'body_name', 'bill'];
const BAD_TITLE = /^(yes|no|nay|aye|y|n|absent|unknown|present|excused|abstain(ed)?|recused|none|n\/a|true|false|null|pass(ed)?|fail(ed)?|adopted|approved|denied|withdrawn|deferred)$/i;
const INHERIT_FIELDS = ['title', 'headline', 'item', 'subject', 'meeting'];
const SUFFIX_KEYS = /minutes|agenda|transcript|video|backup|veto|analysis|cert|packet|memo|report|journal|textUrl/i;
const tidy = s => s.replace(/\s+/g, ' ').trim().slice(0, 200);
function urlTitle(p) {
  let seg = p.path.split('/').filter(Boolean).pop() || '';
  try { seg = decodeURIComponent(seg); } catch { }
  seg = seg.replace(/\.(pdf|html?|aspx?|php)$/i, '').replace(/[_+]/g, ' ');
  return tidy(p.host + (seg ? ' ' + seg : '') + (p.search && seg.length < 4 ? ' ' + p.search.slice(0, 60) : ''));
}

// ---------- accumulate ----------
const E = new Map(); // url -> acc
function acc(url) {
  let a = E.get(url);
  if (!a) { const p = parseDocUrl(url); if (!p) return null; a = { url, p, title: null, ts: -1, people: new Set(), dmin: null, dmax: null, cited: [] }; E.set(url, a); }
  return a;
}
function cite(rawUrl, file, { title, score = 0, people = [], date = null } = {}) {
  const url = cleanUrl(rawUrl); const a = acc(url); if (!a) return null;
  if (title && (title = tidy(title)) && title.length >= 3 && !/^https?:/.test(title) && !BAD_TITLE.test(title) && score > a.ts) { a.title = title; a.ts = score; }
  for (const x of people) a.people.add(x);
  if (date) { if (!a.dmin || date < a.dmin) a.dmin = date; if (!a.dmax || date > a.dmax) a.dmax = date; }
  if (file && a.cited.length < 10 && !a.cited.includes(file)) a.cited.push(file);
  return a;
}
const URL_RE = /https?:\/\/[^\s"'<>)\]\\`|]+/g;
const FILE_FIELDS = ['file', 'txt', 'text', 'textFile', 'textPath', 'path', 'local', 'saved', 'pdfFile', 'minutesFile', 'ocr'];
const fileLinks = []; // {url, from, value, how}

function visit(node, file, ctx, key) {
  if (node == null) return;
  if (typeof node === 'string') {
    if (node.length > 7 && node.includes('http')) {
      const whole = /^https?:\/\/\S+$/.test(node.trim());
      for (const m of node.matchAll(URL_RE)) cite(m[0], file, { title: ctx.title && (whole && key && SUFFIX_KEYS.test(key) ? ctx.title + ' · ' + key.replace(/_?url$/i, '').replace(/Url$/, '') : ctx.title), score: ctx.score, people: ctx.people, date: ctx.date });
    }
    return;
  }
  if (Array.isArray(node)) {
    // tuple rows like ["5/14/2013", "https://...pdf", "Economic Affairs Committee (Post-Meeting)"]
    if (node.length && node.length <= 8 && node.every(x => x == null || typeof x !== 'object') && node.some(x => typeof x === 'string' && /^https?:\/\//.test(x))) {
      const date = node.map(x => normDate(x, 'date')).find(Boolean) || ctx.date;
      const words = node.filter(x => typeof x === 'string' && !/^https?:\/\//.test(x) && !normDate(x, 'date') && /[a-z]{3}/i.test(x)).join(' · ');
      const people = [...ctx.people, ...node.filter(isPid)];
      for (const x of node) if (typeof x === 'string' && /^https?:\/\//.test(x)) cite(x, file, { title: words || ctx.title, score: words ? 3 : ctx.score, people, date });
      return;
    }
    for (const x of node) visit(x, file, ctx, key);
    return;
  }
  if (typeof node !== 'object') return;
  // context from this object
  let people = ctx.people, title = null, date = ctx.date, own = false;
  const add = [];
  for (const f of PID_FIELDS) if (isPid(node[f])) add.push(node[f]);
  for (const f of ['people', 'pids']) if (Array.isArray(node[f])) for (const x of node[f]) if (isPid(x)) add.push(x);
  if (add.length) people = [...new Set([...people, ...add])];
  for (const f of TITLE_FIELDS) { const t = L(node[f]); if (t && t.length >= 3 && !/^https?:/.test(t) && !BAD_TITLE.test(t.trim())) { title = t; own = true; break; } }
  for (const f of DATE_FIELDS) { const d = normDate(node[f], f); if (d) { date = d; break; } }
  if (!title) title = ctx.inherit;
  const inherit = (() => { for (const f of INHERIT_FIELDS) { const t = L(node[f]); if (t && t.length >= 3 && !/^https?:/.test(t) && !BAD_TITLE.test(t.trim())) return t; } return ctx.inherit; })();
  const here = { people, title, date, score: own ? 4 : (title ? 2 : 0), inherit };
  // url + extracted-file pairs in the same row
  const fv = FILE_FIELDS.map(f => node[f]).find(v => typeof v === 'string' && /\.(txt|ocr|pdf|html?)$/i.test(v) && !/^https?:/.test(v));
  if (fv) {
    const urls = Object.entries(node).filter(([k, v]) => typeof v === 'string' && /^https?:\/\/\S+$/.test(v.trim()));
    const pick = urls.length === 1 ? urls[0] : urls.find(([k]) => ['url', 'u', 'pdf', 'record', 'minutes', 'minutesUrl', 'src'].includes(k));
    if (pick) fileLinks.push({ url: cleanUrl(pick[1]), from: file, value: fv, how: 'row' });
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === 'people' && v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [pk, pv] of Object.entries(v)) visit(pv, file, isPid(pk) ? { ...here, people: [...new Set([...people, pk])] } : here, pk);
      continue;
    }
    visit(v, file, isPid(k) ? { ...here, people: [...new Set([...people, k])] } : here, k);
  }
}

const lines = t => t.split('\n');
let nScan = 0;
for (const f of scanFiles) {
  let t; try { t = readFileSync(P(f), 'utf8'); } catch { continue; }
  if (!t.includes('http')) continue;
  nScan++;
  const base = { people: pathPids(f), title: null, date: null, score: 0, inherit: null };
  if (f.endsWith('.json')) { try { visit(JSON.parse(t), f, base); } catch { for (const m of t.matchAll(URL_RE)) cite(m[0], f, base); } }
  else if (f.endsWith('.jsonl')) { for (const ln of lines(t)) { if (!ln.includes('http')) continue; try { visit(JSON.parse(ln), f, base); } catch { for (const m of ln.matchAll(URL_RE)) cite(m[0], f, base); } } }
  else if (f.endsWith('.md')) {
    for (const ln of lines(t)) {
      if (!ln.includes('http')) continue;
      const lp = [...new Set([...base.people, ...(ln.match(/\b[a-z]+(?:-[a-z0-9]+)+\b/g) || []).filter(isPid)])];
      const date = (ln.match(/\b\d{4}-\d{2}-\d{2}\b/) || [])[0] || null;
      const linked = new Set();
      for (const m of ln.matchAll(/\[([^\]]{3,200})\]\((https?:\/\/[^)\s]+)\)/g)) { cite(m[2], f, { title: m[1].replace(/[*_`]/g, ''), score: 3, people: lp, date }); linked.add(cleanUrl(m[2])); }
      const text = ln.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(URL_RE, '').replace(/^[-*#>\s|0-9.]+/, '').replace(/[*_`]/g, '').trim();
      for (const m of ln.matchAll(URL_RE)) if (!linked.has(cleanUrl(m[0]))) cite(m[0], f, { title: text.length >= 8 ? text.slice(0, 140) : null, score: 1, people: lp, date });
    }
  } else if (f.endsWith('.tsv')) {
    const rows = lines(t).map(l => l.split('\t'));
    const head = rows[0] && !rows[0].some(c => /^https?:\/\//.test(c)) ? rows[0].map(c => c.trim().toLowerCase()) : null;
    const ti = head ? head.findIndex(c => /^(title|item|subject|label|name|meeting|type)$/.test(c)) : -1;
    const di = head ? head.findIndex(c => /^(date|d|meeting_date|filed)$/.test(c)) : -1;
    for (const r of head ? rows.slice(1) : rows) {
      const urls = r.filter(c => /^https?:\/\//.test(c.trim()));
      if (!urls.length) continue;
      const date = (di >= 0 ? normDate(r[di], 'date') : null) || r.map(c => normDate(c.trim(), 'date')).find(Boolean) || null;
      const title = ti >= 0 && r[ti] && r[ti].length >= 3 ? r[ti] : null;
      const lp = [...new Set([...base.people, ...r.filter(isPid)])];
      for (const u of urls) cite(u.trim(), f, { title: title && date ? title + ' ' + date : title, score: title ? 2 : 0, people: lp, date });
      const fc = r.map(c => c.trim()).filter(c => !/^https?:/.test(c) && !/\s/.test(c) && /\.(txt|ocr|pdf|html?)$/i.test(c));
      if (urls.length === 1 && fc.length) for (const c of fc) fileLinks.push({ url: cleanUrl(urls[0].trim()), from: f, value: c, how: 'tsv' });
    }
  }
}

// ---------- inbox (documents saved by researchers; see SOURCES.md) ----------
const inbox = new Map(); // id -> {raw, text, side}
if (existsSync(P(INBOX))) {
  for (const f of readdirSync(P(INBOX)).sort()) {
    const m = f.match(/^([0-9a-f]{16})\.(.+)$/); if (!m) continue;
    const o = inbox.get(m[1]) || {}; inbox.set(m[1], o);
    if (m[2] === 'json') o.side = INBOX + f; else if (m[2] === 'txt') o.text = INBOX + f; else o.raw = INBOX + f;
  }
}
const inboxByUrl = new Map();
for (const [id, o] of inbox) {
  if (!o.side) continue;
  let s; try { s = JSON.parse(readFileSync(P(o.side), 'utf8')); } catch { continue; }
  if (!s.url) continue;
  const url = cleanUrl(s.url);
  const a = cite(url, o.side, { title: s.title, score: 5, people: (s.people || []).filter(x => typeof x === 'string'), date: normDate(s.date || '', 'date') });
  if (!a) continue;
  a.inbox = { ...o, read: s.read, how: s.how };
  inboxByUrl.set(url, id);
}

// ---------- link extracted text and saved raw files ----------
const textLink = new Map(), localLink = new Map(); // url -> {path, how, rank}
const RANK = { firstline: 1, tsv: 2, row: 2, rule: 2, name: 3, archive: 4 };
const setLink = (map, url, path, how) => { if (!E.has(url)) return; const r = RANK[how], cur = map.get(url); if (!cur || r < cur.rank) map.set(url, { path, how, rank: r }); };
const size = p => { try { return statSync(P(p)).size; } catch { return 0; } };

// 1. text files whose first line is the source URL (bill-analysis excerpts, roll calls, project-bill text)
for (const f of textFiles) {
  let buf = Buffer.alloc(600), n = 0;
  try { const fd = openSync(P(f), 'r'); n = readSync(fd, buf, 0, 600, 0); closeSync(fd); } catch { continue; }
  const [l1, l2 = ''] = buf.slice(0, n).toString('utf8').split('\n');
  const first = l1.replace(/^\s*(URL|Source|source|url):\s*/, '').trim();
  // a file that is a list of URLs is not one document's text
  if (/^https?:\/\/\S+$/.test(first) && !/^\s*https?:\/\//.test(l2)) setLink(textLink, cleanUrl(first), f, 'firstline');
}
// 2. rows that name both a URL and a saved file (index.tsv files, minutes-items.json and the like)
const byBase = new Map();
for (const f of [...textFiles, ...rawFiles]) { const b = f.split('/').pop().toLowerCase(); (byBase.get(b) || byBase.set(b, []).get(b)).push(f); }
const commonPrefix = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return i; };
function resolveFile(from, value) {
  const dir = from.split('/').slice(0, -1).join('/');
  if (value.includes('/')) {
    for (const c of [dir + '/' + value, value, 'scripts/data/' + value]) { const n = c.split('/').reduce((s, x) => x === '..' ? s.slice(0, -1) : x === '.' ? s : [...s, x], []).join('/'); if (existsSync(P(n))) return n; }
    value = value.split('/').pop();
  }
  const cands = byBase.get(value.toLowerCase()) || [];
  if (cands.length === 1) return cands[0];
  if (!cands.length) return null;
  const scored = cands.map(c => [commonPrefix(c, from), c]).sort((a, b) => b[0] - a[0]);
  return scored[0][0] > scored[1][0] ? scored[0][1] : null;
}
const asText = f => { if (/\.(txt|ocr)$/i.test(f)) return f; for (const alt of [f.replace(/\.[^.]+$/, '.txt'), f + '.txt', f.replace(/\.[^.]+$/, '.ocr.txt')]) if (existsSync(P(alt)) && textFiles.includes(alt)) return alt; return null; };
const textSet = new Set(textFiles);
for (const l of fileLinks) {
  const f = resolveFile(l.from, l.value); if (!f) continue;
  if (/\.(pdf|html?|xlsx?)$/i.test(f)) { setLink(localLink, l.url, f, l.how); const t = asText(f); if (t && textSet.has(t)) setLink(textLink, l.url, t, l.how); }
  else setLink(textLink, l.url, f, l.how);
}
// 3. explicit rules where the file name is a document id in the URL
for (const f of textFiles) {
  let m;
  if ((m = f.match(/prior-statewide\/raw\/cert-ocr\/(\d+)\.txt$/))) setLink(textLink, `https://prodenv.dep.state.fl.us/DslBtlds/public/piDownloadDocument?documentManagementID=${m[1]}`, f, 'rule');
}
// 4. file name equals the URL's file name (unique on both sides)
const stemOf = s => s.toLowerCase().replace(/\.(txt|ocr)$/, '').replace(/\.(txt|ocr)$/, '').replace(/\.(pdf|html?|aspx?|xlsx?)$/, '');
const distinctive = s => s.length >= 8 && /\d/.test(s) && /[a-z_-]/.test(s) || s.length >= 14;
const variants = new Map(); // variant -> Set(url)
const addVar = (v, url) => { if (!distinctive(v)) return; (variants.get(v) || variants.set(v, new Set()).get(v)).add(url); };
for (const [url, a] of E) {
  let seg = a.p.path.split('/').filter(Boolean).pop(); if (!seg) continue;
  try { seg = decodeURIComponent(seg); } catch { }
  const st = stemOf(seg); if (!st) continue;
  addVar(st, url);
  const noPre = st.replace(/^[a-z]{1,3}(?=\d)/, ''); if (noPre !== st) addVar(noPre, url);
}
function nameMatch(path) {
  const st = stemOf(path.split('/').pop());
  const tries = [st]; for (let i = 0; i < st.length; i++) if (/[_\-\s.]/.test(st[i]) && st.length - i - 1 >= 8) tries.push(st.slice(i + 1));
  for (const t of tries) { const s = variants.get(t); if (s) return s.size === 1 ? [...s][0] : null; }
  return null;
}
const claim = (files, map, how) => {
  const by = new Map();
  for (const f of files) { const u = nameMatch(f); if (u) (by.get(u) || by.set(u, []).get(u)).push(f); }
  for (const [u, fs] of by) setLink(map, u, fs.sort((a, b) => size(b) - size(a))[0], how);
};
claim(textFiles, textLink, 'name');
claim(rawFiles, localLink, 'name');
// 5. the interim text archive on branch sources-archive (list.txt): only exact unique file-name matches
let archiveList = [];
try { archiveList = execFileSync('git', ['-C', ROOT, 'show', 'origin/sources-archive:list.txt'], { maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n').filter(Boolean); }
catch { try { archiveList = execFileSync('git', ['-C', ROOT, 'show', 'sources-archive:list.txt'], { maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n').filter(Boolean); } catch { } }
{
  const by = new Map();
  for (const f of archiveList) { const u = nameMatch(f); if (u && !textLink.has(u)) (by.get(u) || by.set(u, []).get(u)).push(f); }
  for (const [u, fs] of by) if (fs.length === 1) setLink(textLink, u, ARCHIVE_PREFIX + fs[0].replace(/^\.\//, ''), 'archive');
}

// ---------- write ----------
const old = readCatalog();
for (const f of carryFiles) for (const [id, e] of readCatalog(f)) { const o = old.get(id); if (!o || (e.archived && !o.archived) || (e.textArchived && !o.textArchived) || (e.attempts || 0) > (o.attempts || 0) || (e.error && !o.error && !o.archived)) old.set(id, e); }
const out = new Map();
for (const [url, a] of E) {
  const id = idOf(url), o = old.get(id) || {};
  let kind = kindOf(a.p);
  const e = {
    id, url, title: a.title || urlTitle(a.p), kind, host: a.p.host,
    people: [...a.people].sort(), dates: a.dmin ? [a.dmin, a.dmax] : [], citedBy: a.cited,
  };
  const tl = textLink.get(url), ll = localLink.get(url);
  if (a.inbox && a.inbox.text) e.text = a.inbox.text; else if (tl) { e.text = tl.path; if (/\/bills\/ps\//.test(tl.path)) e.textExcerpt = true; } else if (o.text && o.text.startsWith(ARCHIVE_PREFIX)) e.text = o.text;
  if (a.inbox && a.inbox.raw) e.local = a.inbox.raw; else if (ll) e.local = ll.path;
  if (a.inbox) e.inbox = true;
  if (o.archived && o.kind) e.kind = kind = o.kind;           // the archive job saw the real content type
  e.r2 = (o.archived || o.textArchived) && o.r2 ? o.r2 : { raw: `raw/${id}.${a.inbox && a.inbox.raw ? a.inbox.raw.split('.').pop() : rawExt(kind, url)}`, text: `text/${id}.txt` };
  e.archived = !!o.archived;
  e.fetchable = !blocked(a.p.host) && !/^(robots|blocked)/.test(o.error || '');
  for (const k of ARCHIVE_FIELDS) if (k !== 'archived' && o[k] !== undefined && e[k] === undefined) e[k] = o[k];
  if (o.read && !a.inbox) {   // came in through the inbox earlier: keep the researcher's title and people
    if (o.title) e.title = o.title;
    e.people = [...new Set([...e.people, ...(o.people || [])])].sort();
  }
  if (a.inbox) { if (a.inbox.read) e.read = a.inbox.read; if (a.inbox.how) e.how = a.inbox.how; }
  out.set(id, e);
}
// keep archived documents that nothing cites any more, so the R2 copy stays findable
let kept = 0;
for (const [id, o] of old) if (!out.has(id) && (o.archived || o.textArchived)) { out.set(id, { ...o, citedBy: (o.citedBy || []).filter(c => !c.startsWith(INBOX)), fetchable: !blocked(o.host) && !/^(robots|blocked)/.test(o.error || '') }); kept++; }
const bytes = writeCatalog(out);

if (!quiet) {
  const all = [...out.values()];
  const count = (f) => all.reduce((m, e) => (m[f(e)] = (m[f(e)] || 0) + 1, m), {});
  const top = (m, n = 25) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
  console.log(`catalog: ${all.length} documents from ${nScan} files (${(bytes / 1e6).toFixed(1)} MB) -> ${CATALOG}${kept ? `, ${kept} archived but no longer cited` : ''}`);
  console.log('kind:', count(e => e.kind));
  console.log('text linked:', all.filter(e => e.text).length, count(e => !e.text ? 'none' : e.text.startsWith(ARCHIVE_PREFIX) ? 'archive' : e.inbox ? 'inbox' : 'repo'));
  console.log('text link method:', [...textLink.values()].reduce((m, l) => (m[l.how] = (m[l.how] || 0) + 1, m), {}));
  console.log('local raw:', all.filter(e => e.local).length, '| with people:', all.filter(e => e.people.length).length, '| inbox:', all.filter(e => e.inbox).length);
  console.log('fetchable:', all.filter(e => e.fetchable).length, '| not fetchable:', all.filter(e => !e.fetchable).length, '| archived:', all.filter(e => e.archived).length);
  console.log('hosts:', top(count(e => e.host)).map(([h, n]) => h + ' ' + n).join(', '));
  const orphan = [...inbox].filter(([, o]) => !o.side).map(([id]) => id);
  if (orphan.length) console.log('inbox files without a .json sidecar (not catalogued):', orphan.join(' '));
}
