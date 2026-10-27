// Archives source documents to Cloudflare R2 (bucket ballot305-sources): raw file at raw/<id>.<ext>, extracted text at
// text/<id>.txt, and records the result in scripts/data/sources/catalog.jsonl. Runs nightly in GitHub Actions
// (.github/workflows/archive-sources.yml); also runs locally.
//
//   node scripts/sources/archive.mjs --dry-run            list what it would do, no network, no credentials needed
//   node scripts/sources/archive.mjs --limit 200          archive up to 200 documents (needs CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)
// Options: --limit N (default 2000) · --host H (only this host) · --id ID (only this id) · --max-minutes M (default 320)
//          --archive-dir DIR (unpacked scratch-text.tar.xz from branch sources-archive) · --cleared-list FILE · --concurrency N (default 4)
//
// Order of work: 1) the inbox (documents researchers saved by hand: upload, then delete from the inbox),
// 2) raw files already in the repo, 3) text-only documents from hosts that block scripts, 4) downloads of fetchable URLs.
// Downloads are polite: at least 2 s between requests to one host (more if robots.txt asks), robots.txt honored,
// 3 tries with backoff, 60 MB cap, 120 s timeout, an identifying user agent.
// Text: pdftotext; OCR with ocrmypdf --skip-text (first 60 pages) when a PDF has no text layer; HTML as readable text.
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, statSync, appendFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { ROOT, BUCKET, ARCHIVE_PREFIX, readCatalog, writeCatalog, rawExt } from './lib.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const DRY = argv.includes('--dry-run');
const LIMIT = +opt('--limit', 2000);
const ONLY_HOST = opt('--host', null), ONLY_ID = opt('--id', null);
const MAX_MS = +opt('--max-minutes', 320) * 60e3;
const ARCHIVE_DIR = opt('--archive-dir', null);
const CLEARED = opt('--cleared-list', null);
const CONC = Math.max(1, +opt('--concurrency', 4));
const HOST_DELAY = 2000, MAX_BYTES = 60 * 1024 * 1024, TIMEOUT = 120e3, TRIES = 3, OCR_PAGES = 60, MAX_ATTEMPTS = 3;
const UA = 'Mozilla/5.0 (compatible; Ballot305SourceArchiver/1.0; +https://ballot305.org) nonpartisan voter guide research archive';
const TODAY = new Date().toISOString().slice(0, 10);
const P = p => ROOT + p;
const T0 = Date.now();

const cat = readCatalog();
const entries = [...cat.values()].filter(e => (!ONLY_HOST || e.host === ONLY_HOST) && (!ONLY_ID || e.id === ONLY_ID));

// ---------- plan ----------
const repoText = e => e.text && !e.text.startsWith(ARCHIVE_PREFIX) && existsSync(P(e.text)) ? P(e.text) : null;
const tarText = e => e.text && e.text.startsWith(ARCHIVE_PREFIX) && ARCHIVE_DIR ? (p => existsSync(p) ? p : null)(ARCHIVE_DIR + '/' + e.text.slice(ARCHIVE_PREFIX.length)) : null;
const anyText = e => (e.textExcerpt ? null : repoText(e)) || tarText(e);
const prio = e => (e.people && e.people.length ? 0 : 2) + (e.kind === 'pdf' ? 0 : 1);
const plan = [];
for (const e of entries) {
  if (e.inbox) { plan.push({ e, act: 'inbox' }); continue; }
  if (e.archived) { if (!e.textArchived && anyText(e)) plan.push({ e, act: 'text' }); continue; }
  if (e.local && existsSync(P(e.local))) { plan.push({ e, act: 'local' }); continue; }
  if (!e.fetchable) { if (!e.textArchived && anyText(e)) plan.push({ e, act: 'text' }); continue; }
  if ((e.attempts || 0) >= MAX_ATTEMPTS) continue;
  plan.push({ e, act: 'fetch' });
}
const ORDER = { inbox: 0, local: 1, text: 2, fetch: 3 };
plan.sort((a, b) => ORDER[a.act] - ORDER[b.act] || prio(a.e) - prio(b.e) || (a.e.id < b.e.id ? -1 : 1));
const work = plan.slice(0, LIMIT);

const tally = (xs, f) => xs.reduce((m, x) => (m[f(x)] = (m[f(x)] || 0) + 1, m), {});
if (DRY) {
  console.log(`archive --dry-run: ${plan.length} documents waiting, would do ${work.length} (limit ${LIMIT})`);
  console.log('by action:', tally(work, w => w.act));
  console.log('by kind:', tally(work, w => w.e.kind));
  const hosts = Object.entries(tally(work.filter(w => w.act === 'fetch'), w => w.e.host)).sort((a, b) => b[1] - a[1]);
  console.log('downloads by host:', hosts.slice(0, 20).map(([h, n]) => `${h} ${n}`).join(', ') + (hosts.length > 20 ? ` (+${hosts.length - 20} hosts)` : ''));
  const busiest = hosts.length ? hosts[0][1] : 0;
  console.log(`time floor at ${HOST_DELAY / 1000}s per request per host: about ${Math.ceil(busiest * (HOST_DELAY / 1000 + 1.5) / 60)} min (busiest host), plus uploads`);
  for (const w of work.slice(0, 40)) console.log(w.act.padEnd(5), w.e.id, w.e.kind.padEnd(4), w.act === 'fetch' ? w.e.url : (w.e.local || w.e.text || w.e.url));
  if (work.length > 40) console.log(`... and ${work.length - 40} more`);
  const tarNeeded = work.filter(w => w.e.text && w.e.text.startsWith(ARCHIVE_PREFIX)).length;
  if (tarNeeded && !ARCHIVE_DIR) console.log(`note: ${tarNeeded} use text from the sources-archive tarball; pass --archive-dir to include it`);
  process.exit(0);
}
if (!work.length) { console.log('archive: nothing to do'); process.exit(0); }
if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) { console.error('archive: set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID (or use --dry-run)'); process.exit(1); }

// ---------- helpers ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));
const run = (cmd, args, { timeout = 600e3, input } = {}) => new Promise(res => {
  const c = execFile(cmd, args, { timeout, maxBuffer: 1 << 26, env: process.env }, (err, stdout, stderr) => res({ ok: !err, code: err ? err.code : 0, out: String(stdout || ''), err: String(stderr || '') + (err && err.killed ? ' (timed out)' : '') }));
  if (input) { c.stdin.end(input); }
});
const has = async t => (await run('sh', ['-c', `command -v ${t}`])).ok;
const TOOLS = { pdftotext: await has('pdftotext'), pdfinfo: await has('pdfinfo'), ocrmypdf: await has('ocrmypdf'), unzip: await has('unzip') };
if (!TOOLS.pdftotext) console.warn('archive: pdftotext not found (apt install poppler-utils); PDFs get no text');
if (!TOOLS.ocrmypdf) console.warn('archive: ocrmypdf not found; scanned PDFs get no OCR');
const TMP = tmpdir() + '/ballot305-archive'; mkdirSync(TMP, { recursive: true });

let sem = CONC; const waiters = [];
const acquire = () => sem > 0 ? (sem--, Promise.resolve()) : new Promise(r => waiters.push(r));
const release = () => { const w = waiters.shift(); if (w) w(); else sem++; };

async function wrangler(args) {
  let last;
  for (let i = 0; i < 3; i++) {
    last = await run('npx', ['--yes', 'wrangler@4', ...args], { timeout: 300e3 });
    if (last.ok) return last;
    await sleep(3000 * (i + 1));
  }
  return last;
}
async function put(key, file, type) {
  const r = await wrangler(['r2', 'object', 'put', `${BUCKET}/${key}`, `--file=${file}`, `--content-type=${type}`, '--remote']);
  if (!r.ok) throw new Error('upload ' + key + ': ' + (r.err || r.out).split('\n').filter(Boolean).slice(-2).join(' ').slice(0, 300));
}
async function ensureBucket() {
  const r = await wrangler(['r2', 'bucket', 'create', BUCKET]);
  const msg = r.out + r.err;
  if (r.ok || /already exists|already own/i.test(msg)) return;
  throw new Error('could not create or find bucket ' + BUCKET + ': ' + msg.slice(-500) + '\nThe API token needs Account > Workers R2 Storage > Edit, and R2 must be enabled on the account.');
}

// robots.txt per host
const robots = new Map();
async function robotsFor(origin) {
  if (robots.has(origin)) return robots.get(origin);
  const p = (async () => {
    try {
      const r = await fetch(origin + '/robots.txt', { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20e3) });
      if (r.status >= 500) return { unavailable: true, rules: [], delay: 0 };
      if (!r.ok) return { rules: [], delay: 0 };
      const txt = (await r.text()).slice(0, 500e3);
      const groups = []; let cur = null, lastWasUA = false;
      for (const raw of txt.split(/\r?\n/)) {
        const ln = raw.replace(/#.*/, '').trim(); const m = ln.match(/^([A-Za-z-]+)\s*:\s*(.*)$/); if (!m) continue;
        const k = m[1].toLowerCase(), v = m[2].trim();
        if (k === 'user-agent') { if (!lastWasUA) { cur = { agents: [], rules: [], delay: 0 }; groups.push(cur); } cur.agents.push(v.toLowerCase()); lastWasUA = true; continue; }
        lastWasUA = false; if (!cur) continue;
        if (k === 'allow' || k === 'disallow') { if (v || k === 'allow') cur.rules.push({ allow: k === 'allow', path: v }); }
        else if (k === 'crawl-delay') cur.delay = Math.min(30, +v || 0) * 1000;
      }
      const mine = groups.filter(g => g.agents.some(a => a !== '*' && 'ballot305sourcearchiver'.includes(a)));
      const g = mine.length ? mine : groups.filter(g => g.agents.includes('*'));
      return { rules: g.flatMap(x => x.rules), delay: Math.max(0, ...g.map(x => x.delay)) };
    } catch { return { rules: [], delay: 0 }; }
  })();
  robots.set(origin, p); return p;
}
function robotsAllows(rb, pathQuery) {
  let best = null;
  for (const r of rb.rules) {
    const re = new RegExp('^' + r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    if (re.test(pathQuery) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  }
  return !best || best.allow;
}

const CHALLENGE = /cf-chl|challenge-platform|Just a moment\.\.\.|Attention Required! \| Cloudflare|Sorry, you have been blocked|Request Rejected|The requested URL was rejected|Access Denied<\/title>|captcha|Verify you are human|bot check/i;
async function download(url) {
  let lastErr = 'failed';
  for (let i = 0; i < TRIES; i++) {
    if (i) await sleep(Math.min(60e3, 5000 * 2 ** (i - 1)));
    const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), TIMEOUT);
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow', signal: ac.signal });
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      if (r.status === 429 || r.status >= 500) {
        const body = r.status === 503 ? (await r.text().catch(() => '')).slice(0, 20000) : '';
        if (CHALLENGE.test(body) || r.headers.get('cf-mitigated')) return { blocked: 'blocked: challenge (' + r.status + ')' };
        const ra = +r.headers.get('retry-after'); if (ra > 0) await sleep(Math.min(60, ra) * 1000);
        lastErr = 'http ' + r.status; continue;
      }
      if (!r.ok) {
        const body = (await r.text().catch(() => '')).slice(0, 20000);
        if ((r.status === 403 || r.status === 401) && (CHALLENGE.test(body) || r.headers.get('cf-mitigated') || /cloudflare/i.test(r.headers.get('server') || ''))) return { blocked: 'blocked: challenge (' + r.status + ')' };
        return { error: 'http ' + r.status, final: r.status === 404 || r.status === 410 };
      }
      const len = +r.headers.get('content-length'); if (len > MAX_BYTES) { ac.abort(); return { error: 'too large: ' + len + ' bytes', final: true }; }
      const chunks = []; let n = 0;
      for await (const c of r.body) { n += c.length; if (n > MAX_BYTES) { ac.abort(); return { error: 'too large: over 60 MB', final: true }; } chunks.push(c); }
      const buf = Buffer.concat(chunks);
      if (/html/.test(ct) && buf.length < 60000 && CHALLENGE.test(buf.toString('utf8'))) return { blocked: 'blocked: challenge page' };
      return { buf, ct, finalUrl: r.url };
    } catch (err) { lastErr = err.name === 'AbortError' ? 'timeout' : String(err.cause && err.cause.code || err.message).slice(0, 120); }
    finally { clearTimeout(timer); }
  }
  return { error: lastErr };
}

function sniff(buf, ct, url) {
  const head = buf.slice(0, 8).toString('latin1');
  if (head.startsWith('%PDF')) return { kind: 'pdf', ext: 'pdf', type: 'application/pdf' };
  if (head.startsWith('PK\x03\x04')) {
    const e = /\.(xlsx|xlsm|docx|pptx|zip)(\?|$)/i.exec(url); const ext = e ? e[1].toLowerCase() : (/spreadsheet/.test(ct) ? 'xlsx' : /wordprocessing/.test(ct) ? 'docx' : 'zip');
    return { kind: ext.startsWith('xls') ? 'xlsx' : 'other', ext, type: ct.split(';')[0] || 'application/zip' };
  }
  if (head.startsWith('\xD0\xCF\x11\xE0')) return { kind: /\.doc(\?|$)/i.test(url) ? 'other' : 'xlsx', ext: /\.doc(\?|$)/i.test(url) ? 'doc' : 'xls', type: ct.split(';')[0] || 'application/vnd.ms-excel' };
  if (/html/.test(ct) || /^\s*<(!doctype html|html|head|body)/i.test(buf.slice(0, 500).toString('utf8'))) return { kind: 'html', ext: 'html', type: 'text/html; charset=utf-8' };
  const m = { 'text/plain': 'txt', 'text/csv': 'csv', 'application/json': 'json', 'application/xml': 'xml', 'text/xml': 'xml', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/tiff': 'tif', 'image/gif': 'gif' }[ct.split(';')[0].trim()];
  const ext = m || rawExt('other', url);
  return { kind: 'other', ext, type: ct.split(';')[0] || 'application/octet-stream' };
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', hellip: '...', copy: '(c)', reg: '(R)', sect: '§', middot: '·', bull: '·' };
function htmlToText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe|head)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(nav|footer)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|table|section|article|header|blockquote|pre|dd|dt|ul|ol|form)>/gi, '\n')
    .replace(/<(td|th)\b[^>]*>/gi, '\t')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, c) => c[0] === '#' ? (n => n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ' ')(c[1].toLowerCase() === 'x' ? parseInt(c.slice(2), 16) : +c.slice(1)) : (ENT[c.toLowerCase()] ?? m))
    .replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
const nonWs = s => s.replace(/\s+/g, '').length;

async function extract(file, kind, e) {
  const info = {};
  if (kind === 'pdf') {
    if (!TOOLS.pdftotext) return { text: '', info };
    let pages = 0;
    if (TOOLS.pdfinfo) { const r = await run('pdfinfo', [file], { timeout: 60e3 }); pages = +((r.out.match(/^Pages:\s+(\d+)/m) || [])[1] || 0); if (pages) info.pages = pages; }
    const r = await run('pdftotext', ['-enc', 'UTF-8', '-layout', file, '-'], { timeout: 300e3 });
    let text = r.ok ? r.out : '';
    const need = nonWs(text) < 200 || (pages && nonWs(text) / pages < 40);
    if (need && TOOLS.ocrmypdf) {
      const side = file + '.ocr.txt', out = file + '.ocr.pdf';
      const a = ['--skip-text', '-l', 'eng', '--sidecar', side, '--output-type', 'pdf', '--optimize', '0', '-q'];
      if (!pages || pages > OCR_PAGES) a.push('--pages', `1-${OCR_PAGES}`);
      const o = await run('ocrmypdf', [...a, file, out], { timeout: 1500e3 });
      if (existsSync(side)) { const ot = readFileSync(side, 'utf8').replace(/\[OCR skipped on page\(s\) [^\]]*\]/g, ''); if (nonWs(ot) > nonWs(text)) { text = ot; info.ocr = pages > OCR_PAGES ? `first ${OCR_PAGES} of ${pages} pages` : true; } }
      else if (!o.ok) info.ocrError = (o.err || '').split('\n').filter(Boolean).pop()?.slice(0, 160);
      for (const f of [side, out]) try { unlinkSync(f); } catch { }
    }
    return { text, info };
  }
  if (kind === 'html') return { text: htmlToText(readFileSync(file, 'utf8')), info };
  if (kind === 'xlsx' && TOOLS.unzip && /\.xlsx?m?$/.test(file)) {
    const r = await run('unzip', ['-p', file, 'xl/sharedStrings.xml'], { timeout: 60e3 });
    return { text: r.ok ? r.out.replace(/<\/si>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '', info };
  }
  if (/\.(txt|csv|json|xml)$/.test(file)) return { text: readFileSync(file, 'utf8'), info };
  return { text: '', info };
}

// ---------- process ----------
const shaToKey = new Map(); for (const e of cat.values()) if (e.archived && e.sha256 && !e.dupOf) shaToKey.set(e.sha256, { id: e.id, key: e.r2.raw });
const cleared = [];
let done = 0, okN = 0, failN = 0, sinceSave = 0;
const save = () => { writeCatalog(cat); sinceSave = 0; };
const typeOfExt = x => ({ pdf: 'application/pdf', html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8', txt: 'text/plain; charset=utf-8', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel', csv: 'text/csv', json: 'application/json', xml: 'application/xml', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', zip: 'application/zip' })[x] || 'application/octet-stream';

async function storeRaw(e, file, buf, sn) {
  const sha = createHash('sha256').update(buf).digest('hex');
  e.sha256 = sha; e.bytes = buf.length; e.contentType = sn.type; e.kind = sn.kind;
  const dup = shaToKey.get(sha);
  if (dup && dup.id !== e.id) { e.dupOf = dup.id; e.r2 = { ...e.r2, raw: dup.key }; }
  else { e.r2 = { ...e.r2, raw: `raw/${e.id}.${sn.ext}` }; await put(e.r2.raw, file, sn.type); shaToKey.set(sha, { id: e.id, key: e.r2.raw }); delete e.dupOf; }
  e.archived = true;
}
async function storeText(e, text, info = {}) {
  if (info.pages) e.pages = info.pages;
  if (info.ocr) e.ocr = info.ocr; else delete e.ocr;
  e.textChars = nonWs(text);
  if (!e.textChars) { e.textArchived = false; if (info.ocrError) e.error = 'no text: ' + info.ocrError; return; }
  const f = `${TMP}/${e.id}.txt`; writeFileSync(f, text);
  await put(e.r2.text || `text/${e.id}.txt`, f, 'text/plain; charset=utf-8');
  e.textArchived = true;
  try { unlinkSync(f); } catch { }
}
const better = (extracted, e) => { const t = anyText(e); if (!t) return extracted; const own = readFileSync(t, 'utf8'); return nonWs(own) > nonWs(extracted) ? own : extracted; };

async function processOne({ e, act }) {
  try {
    if (act === 'inbox') {
      const files = ['json', 'txt'].map(x => `scripts/data/sources/inbox/${e.id}.${x}`).filter(f => existsSync(P(f)));
      const raw = e.local && existsSync(P(e.local)) ? e.local : null;
      if (raw) {
        const buf = readFileSync(P(raw)); const ext = raw.split('.').pop().toLowerCase();
        const sn = sniff(buf, typeOfExt(ext), e.url); if (sn.kind === 'other') { sn.ext = ext; sn.type = typeOfExt(ext); }
        await storeRaw(e, P(raw), buf, sn);
        let text = e.text && existsSync(P(e.text)) ? readFileSync(P(e.text), 'utf8') : '';
        let info = {};
        if (nonWs(text) < 50) { const x = await extract(P(raw), sn.kind, e); if (nonWs(x.text) > nonWs(text)) { text = x.text; info = x.info; } }
        await storeText(e, text, info);
        files.push(raw);
      } else if (e.text && existsSync(P(e.text))) {
        await storeText(e, readFileSync(P(e.text), 'utf8'));
      } else throw new Error('inbox entry has neither a raw file nor a .txt');
      e.fetched = e.fetched || e.read || TODAY;
      for (const f of new Set(files)) { try { unlinkSync(P(f)); cleared.push(f); } catch { } }
      delete e.inbox; delete e.local; if (e.text && e.text.startsWith('scripts/data/sources/inbox/')) delete e.text;
      e.citedBy = (e.citedBy || []).filter(c => !c.startsWith('scripts/data/sources/inbox/'));
    } else if (act === 'local') {
      const buf = readFileSync(P(e.local)); const ext = e.local.split('.').pop().toLowerCase();
      const sn = sniff(buf, typeOfExt(ext), e.url);
      await storeRaw(e, P(e.local), buf, sn);
      const x = await (anyText(e) && nonWs(readFileSync(anyText(e), 'utf8')) > 200 ? { text: '', info: {} } : extract(P(e.local), sn.kind, e));
      await storeText(e, better(x.text, e), x.info);
      e.fetched = e.fetched || TODAY;
    } else if (act === 'text') {
      await storeText(e, readFileSync(anyText(e), 'utf8'));
    } else {
      const u = new URL(e.url);
      const rb = await robotsFor(u.origin);
      if (rb.unavailable) throw Object.assign(new Error('robots.txt unavailable (5xx); will retry'), { soft: true });
      if (!robotsAllows(rb, u.pathname + u.search)) { e.fetchable = false; e.error = 'robots: disallowed by robots.txt'; return false; }
      const d = await download(e.url);
      if (d.blocked) { e.fetchable = false; e.error = d.blocked; return false; }
      if (d.error) { e.error = d.error; e.attempts = d.final ? MAX_ATTEMPTS : (e.attempts || 0) + 1; return false; }
      const sn = sniff(d.buf, d.ct, d.finalUrl || e.url);
      const file = `${TMP}/${e.id}.${sn.ext}`; writeFileSync(file, d.buf);
      await storeRaw(e, file, d.buf, sn);
      const x = await extract(file, sn.kind, e);
      await storeText(e, better(x.text, e), x.info);
      e.fetched = TODAY;
      if (d.finalUrl && d.finalUrl !== e.url) e.finalUrl = d.finalUrl;
      try { unlinkSync(file); } catch { }
    }
    delete e.attempts; if (!/^no text/.test(e.error || '')) delete e.error;
    return true;
  } catch (err) {
    if (!err.soft) e.attempts = (e.attempts || 0) + 1;
    e.error = String(err.message || err).slice(0, 300);
    return false;
  }
}

let stopping = false;
process.on('SIGTERM', () => { stopping = true; }); process.on('SIGINT', () => { stopping = true; });
const timeUp = () => stopping || Date.now() - T0 > MAX_MS;
const finish = (w, ok) => {
  done++; ok ? okN++ : failN++;
  console.log(`${ok ? 'ok  ' : 'fail'} ${w.act.padEnd(5)} ${w.e.id} ${w.e.kind.padEnd(4)} ${ok ? (w.e.bytes || '') + ' B, ' + (w.e.textChars || 0) + ' chars' + (w.e.ocr ? ', ocr' : '') : w.e.error} ${w.act === 'fetch' ? w.e.url : ''}`);
  if (++sinceSave >= 20) save();
};

await ensureBucket();
// local work (inbox, repo files, text-only) in a pool; downloads in per-host lanes sharing the same pool
const localWork = work.filter(w => w.act !== 'fetch'), fetchWork = work.filter(w => w.act === 'fetch');
const lanes = new Map(); for (const w of fetchWork) { const h = w.e.host; (lanes.get(h) || lanes.set(h, []).get(h)).push(w); }
async function localLane() { while (localWork.length && !timeUp()) { const w = localWork.shift(); await acquire(); try { finish(w, await processOne(w)); } finally { release(); } } }
async function hostLane(host, items) {
  let last = 0;
  for (const w of items) {
    if (timeUp()) return;
    const rb = await robotsFor(new URL(w.e.url).origin);
    const gap = Math.max(HOST_DELAY, rb.delay || 0);
    const wait = last + gap - Date.now(); if (wait > 0) await sleep(wait);
    await acquire();
    last = Date.now();
    try { finish(w, await processOne(w)); } finally { release(); }
    if (rb.unavailable) return;
  }
}
await Promise.all([...Array(Math.min(CONC, Math.max(1, localWork.length)))].map(localLane).concat([...lanes].map(([h, items]) => hostLane(h, items))));
save();
if (CLEARED && cleared.length) appendFileSync(CLEARED, cleared.join('\n') + '\n');
const all = [...cat.values()];
console.log(`archive: ${okN} archived, ${failN} failed, ${work.length - done} not reached${timeUp() ? ' (time limit)' : ''}; inbox files cleared: ${cleared.length}`);
console.log(`catalog now: ${all.filter(e => e.archived).length} raw and ${all.filter(e => e.textArchived).length} text in R2, of ${all.length} documents`);
