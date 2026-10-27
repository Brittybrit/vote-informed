// Shared helpers for the source library (catalog.mjs, archive.mjs, research-index.mjs).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';

export const ROOT = new URL('../../', import.meta.url).pathname;
export const CATALOG = 'scripts/data/sources/catalog.jsonl';
export const INBOX = 'scripts/data/sources/inbox/';
export const BUCKET = 'wethepeople305-sources';
// The interim text archive saved before the research scratch area was cleared (branch sources-archive).
export const ARCHIVE_PREFIX = 'sources-archive:scratch-text.tar.xz:';

// id = first 16 hex of sha1 of the URL (without #fragment), the same id the inbox files use.
export const idOf = url => createHash('sha1').update(url).digest('hex').slice(0, 16);

// Trim a URL found in text: trailing punctuation, markdown leftovers, unbalanced brackets, html entities, fragment.
export function cleanUrl(raw) {
  let u = String(raw).trim().replace(/&amp;/g, '&');
  for (let i = 0; i < 6; i++) {
    const before = u;
    u = u.replace(/[.,;:!?'"*_>\]]+$/, '');
    if (u.endsWith(')') && (u.match(/\(/g) || []).length < (u.match(/\)/g) || []).length) u = u.slice(0, -1);
    if (u === before) break;
  }
  const h = u.indexOf('#'); if (h > 0) u = u.slice(0, h);
  return u;
}

// URLs that are not documents: API endpoints, templates, local or example hosts.
const NOT_DOC_HOSTS = new Set(['api.congress.gov', 'webapi.legistar.com', 'api.open.fec.gov', 'api.usaspending.gov',
  'opalockafl.api.civicclerk.com', 'localhost', 'example.com', 'www.example.com', 'ballot305.org', 'www.ballot305.org',
  'github.com', 'raw.githubusercontent.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net', 'unpkg.com', 'schema.org', 'www.w3.org']);
export function parseDocUrl(u) {
  if (!/^https?:\/\/[^\s/]+\.[^\s/]+/.test(u)) return null;
  if (/[<>{}\s]|\.\.\.|…|%3C|%7B|\$\{/i.test(u)) return null;
  let x; try { x = new URL(u); } catch { return null; }
  const host = x.host.toLowerCase();
  if (NOT_DOC_HOSTS.has(host) || /(^|\.)api\./.test(host) && !/\.pdf$/i.test(x.pathname)) return null;
  if (/[?&](api_key|apikey|token)=/i.test(x.search)) return null;
  return { url: u, host, path: x.pathname, search: x.search };
}

// kind from the URL alone; archive.mjs corrects it from the response.
const PDF_PATTERNS = /\.pdf$|piDownloadDocument|\/DocumentCenter\/View\/|FileStream\.ashx|\/loaddoc\.aspx|\/api\/document\/|ViewDocument|GetDocument|\/MetaViewer\.php|\/Download\.aspx|\/edocs\.|\/WebLink\/ElectronicFile|\/Archive\.aspx\?ADID=|\/fileadmin\/|\/attachments\/[0-9a-f-]+\.pdf/i;
export function kindOf(p) {
  const path = p.path.toLowerCase(), ext = (path.match(/\.([a-z0-9]{2,5})$/) || [])[1];
  if (ext === 'pdf') return 'pdf';
  if (ext === 'xls' || ext === 'xlsx' || ext === 'xlsm') return 'xlsx';
  if (ext && /^(zip|csv|txt|json|xml|jpg|jpeg|png|gif|tif|tiff|mp3|mp4|m4a|wav|doc|docx|ppt|pptx|rtf)$/.test(ext)) return 'other';
  if (PDF_PATTERNS.test(p.path + p.search)) return 'pdf';
  return 'html';
}
export function rawExt(kind, url) {
  if (kind === 'pdf') return 'pdf';
  if (kind === 'html') return 'html';
  const m = (() => { try { return new URL(url).pathname.toLowerCase().match(/\.([a-z0-9]{2,5})$/); } catch { return null; } })();
  return m ? m[1] : (kind === 'xlsx' ? 'xlsx' : 'bin');
}

// blocked-hosts.txt: exact host, or ".suffix" for a host and its subdomains.
export function loadBlocked() {
  const p = ROOT + 'scripts/sources/blocked-hosts.txt';
  const exact = new Set(), suffix = [];
  if (existsSync(p)) for (const ln of readFileSync(p, 'utf8').split('\n')) {
    const h = ln.replace(/#.*/, '').trim().toLowerCase(); if (!h) continue;
    if (h.startsWith('.')) suffix.push(h); else exact.add(h);
  }
  return host => exact.has(host) || suffix.some(s => host === s.slice(1) || host.endsWith(s));
}

export function readCatalog(path = ROOT + CATALOG) {
  const m = new Map();
  if (!existsSync(path)) return m;
  for (const ln of readFileSync(path, 'utf8').split('\n')) { if (!ln.trim()) continue; try { const e = JSON.parse(ln); m.set(e.id, e); } catch { } }
  return m;
}
// Stable order (by id) and a fixed key order, so reruns only change what changed.
const KEYS = ['id', 'url', 'title', 'kind', 'host', 'people', 'dates', 'citedBy', 'text', 'textExcerpt', 'local', 'inbox', 'r2', 'archived', 'textArchived', 'fetchable',
  'sha256', 'bytes', 'contentType', 'fetched', 'textChars', 'ocr', 'pages', 'dupOf', 'finalUrl', 'read', 'how', 'attempts', 'error'];
export function orderEntry(e) {
  const o = {};
  for (const k of KEYS) if (e[k] !== undefined) o[k] = e[k];
  for (const k of Object.keys(e)) if (!(k in o) && e[k] !== undefined) o[k] = e[k];
  return o;
}
export function writeCatalog(map, path = ROOT + CATALOG) {
  const out = [...map.values()].sort((a, b) => a.id < b.id ? -1 : 1).map(e => JSON.stringify(orderEntry(e))).join('\n') + '\n';
  writeFileSync(path + '.tmp', out); renameSync(path + '.tmp', path);
  return out.length;
}
// Fields the archive job owns; catalog.mjs carries them over on every rebuild.
export const ARCHIVE_FIELDS = ['archived', 'textArchived', 'finalUrl', 'sha256', 'bytes', 'contentType', 'fetched', 'textChars', 'ocr', 'pages', 'dupOf', 'attempts', 'error', 'read', 'how'];
