// Loads src/worker.js as a plain module so its internal functions can be tested without Cloudflare.
// The worker's own import and default export are swapped out; every named function listed is exported.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadWorker(names) {
  const here = path.dirname(new URL(import.meta.url).pathname);
  let src = fs.readFileSync(path.join(here, '..', 'src', 'worker.js'), 'utf8')
    .replace(/^import \{ POLLING_PLACES.*$/m, 'const POLLING_PLACES = [], PP_SOURCE = "";')
    .replace(/^import \{ handleApi \}.*$/m, 'import { handleApi } from ' + JSON.stringify(pathToFileURL(path.join(here, '..', 'src', 'api.js')).href) + ';')
    .replace('export default {', 'const __default = {');
  src += '\nexport { __default, ' + names.join(', ') + ' };\n';
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'b305-')), 'worker.mjs');
  fs.writeFileSync(file, src);
  return import(pathToFileURL(file).href);
}

// An in-memory stand-in for the Cloudflare KV namespace
export function fakeKV() {
  const store = new Map(), ttls = new Map();
  return {
    store, ttls,
    get: async (k, type) => (store.has(k) ? (type === 'json' ? JSON.parse(store.get(k)) : store.get(k)) : null),
    put: async (k, v, o) => { store.set(k, v); ttls.set(k, (o && o.expirationTtl) || 'none'); },
    delete: async k => { store.delete(k); },
    list: async ({ prefix }) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).sort().map(name => ({ name })) })
  };
}
