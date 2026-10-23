// Loads wtp/src/worker.js as a plain module so its internal functions can be tested without Cloudflare.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadWorker(names) {
  const here = path.dirname(new URL(import.meta.url).pathname);
  let src = fs.readFileSync(path.join(here, '..', 'src', 'worker.js'), 'utf8').replace('export default {', 'const __default = {');
  src += '\nexport { __default, ' + names.join(', ') + ' };\n';
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wtp-')), 'worker.mjs');
  fs.writeFileSync(file, src);
  return import(pathToFileURL(file).href);
}

export function fakeKV() {
  const store = new Map();
  return {
    store,
    get: async (k, type) => (store.has(k) ? (type === 'json' ? JSON.parse(store.get(k)) : store.get(k)) : null),
    put: async (k, v) => { store.set(k, v); },
    delete: async k => { store.delete(k); }
  };
}
