// Miami-Dade behavior snapshot. Runs the worker with no COUNTY set (Ballot305) against canned
// responses and records every route's output, every outgoing request (URL, method, body) and
// every cache write. Run it before and after a change and diff the two files: any difference
// means Ballot305's behavior changed.
//   node tests/miami-snapshot.mjs > before.json
import { loadWorker, fakeKV } from './load-worker.mjs';

console.log = console.warn = (...a) => console.error(...a);   // keep stdout for the snapshot
const FIXED =Date.parse('2026-10-16T20:00:00Z');
const RealDate = Date;
globalThis.Date = class extends RealDate {
  constructor(...a) { super(...(a.length ? a : [FIXED])); }
  static now() { return FIXED; }
};

const w = await loadWorker(['runResearch', 'refreshCached', 'sourceHealth', 'localScope', 'ringOf', 'fecLocal', 'contributionCap']);
const log = [];
const dossier = {
  summary: 'Test candidate summary.', bio: 'Bio.', donors: [{ name: 'Acme LLC', amount: '$5,000', type: 'corporation', url: 'https://example.com/a' }],
  endorsements: [{ name: 'Miami Herald editorial board', url: 'https://www.miamiherald.com/x' }], ratings: [], positions: [],
  donorListUrl: 'https://dos.elections.myflorida.com/x', federalistSociety: { status: 'none_found', evidence: [] }
};
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  const body = init.body ? String(init.body) : '';
  log.push({ url, method: init.method || 'GET', body });
  if (url.startsWith('https://api.anthropic.com/')) {
    return new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(dossier) }] }), { status: 200 });
  }
  return new Response('not found', { status: 404 });
};

function env() {
  return { CACHE: fakeKV(), ANTHROPIC_API_KEY: 'k', FEC_API_KEY: 'f', ASSETS: { fetch: async () => new Response('', { status: 404 }) } };
}
const ctx = { waitUntil: p => p && p.catch && p.catch(() => {}) };
async function call(e, method, path, body) {
  const req = new Request('https://ballot305.org' + path, {
    method, headers: { 'content-type': 'application/json', 'cf-connecting-ip': '2001:db8::1' }, body: body ? JSON.stringify(body) : undefined
  });
  const res = await w.__default.fetch(req, e, ctx);
  const text = await res.text();
  return { status: res.status, body: text.length > 6000 ? text.slice(0, 6000) + '…' : text };
}

const out = {};
async function scenario(name, fn) {
  log.length = 0;
  const e = env();
  let result;
  try { result = await fn(e); } catch (err) { result = 'THREW ' + err.message; }
  out[name] = { result, fetches: [...log], kv: [...e.CACHE.store.keys()].sort().map(k => [k, e.CACHE.store.get(k).slice(0, 3000)]) };
}

const races = [
  ['federal', 'Maria Elvira Salazar', 'U.S. Representative, District 27'],
  ['state', 'Vicki Lopez', 'State Representative, District 113'],
  ['statewide', 'Jason Pizzo', 'Governor and Lieutenant Governor'],
  ['county', 'Vicki L. Lopez', 'County Commissioner, District 5'],
  ['city-vf', 'Maureen Porras', 'Doral Council Member, Seat 2'],
  ['city-ev', 'Alix Desulme', 'North Miami Mayor'],
  ['city-tx', 'Daniel Samaria', 'Biscayne Park Commissioner'],
  ['judge', 'Jane Doe', 'Circuit Judge, 11th Judicial Circuit, Group 4'],
  ['school', 'John Roe', 'School Board Member, District 5']
];
for (const [tag, name, office] of races) {
  await scenario('research:' + tag, e => call(e, 'POST', '/api/research', { name, office, jurisdiction: 'Miami-Dade County, Florida', election: 'General Election, November 3, 2026' }));
  await scenario('runResearch:' + tag, async e => {
    await w.runResearch(e, 'k:' + tag, { name, office, jurisdiction: 'Miami-Dade County, Florida', election: 'General Election, November 3, 2026',
      isJudicial: tag === 'judge', isMeasure: false, measureSummary: '', officeCode: tag === 'federal' ? 'H' : null, alias: 'alias:k:' + tag });
    return 'done';
  });
}
await scenario('measure', e => call(e, 'POST', '/api/research', { name: 'Amendment 1', office: 'Ballot measure', isMeasure: true, summary: 'Budget fund.', jurisdiction: 'Florida', election: 'General Election, November 3, 2026' }));
await scenario('race-money', e => call(e, 'POST', '/api/race-money', { office: 'U.S. Representative, District 27', names: ['Maria Elvira Salazar', 'Robin Peguero'] }));
await scenario('shared-donors', e => call(e, 'POST', '/api/shared-donors', { races: [{ office: 'Doral Council Member, Seat 2', names: ['Maureen Porras', 'Fernanda Gomes'] }] }));
await scenario('org', e => call(e, 'GET', '/api/org?name=' + encodeURIComponent('Florida Realtors PAC')));
await scenario('evsites', e => call(e, 'GET', '/api/evsites'));
await scenario('pollingplace', e => call(e, 'GET', '/api/pollingplace?p=033.0'));
await scenario('master', e => call(e, 'GET', '/api/master'));
await scenario('featured', e => call(e, 'POST', '/api/featured', {}));
await scenario('translate', e => call(e, 'POST', '/api/translate-ballot', { lang: 'es', offices: ['Sheriff'], measureOptions: [], electionName: 'General Election' }));
await scenario('ballot-text', e => call(e, 'POST', '/api/ballot-text', { offices: ['Sheriff'], measureOptions: [], electionName: 'General Election' }));
await scenario('actions-csv', e => call(e, 'GET', '/data/donor-actions.csv'));
await scenario('health', async e => JSON.stringify(await w.sourceHealth(e)));
await scenario('scope', async () => JSON.stringify(['Governor', 'Sheriff', 'Doral Council Member, Seat 2', 'State Senator, District 36'].map(o => [w.localScope(o, 'FL'), w.localScope(o, 'MDC')])));
await scenario('caps', async () => JSON.stringify(['Governor', 'Sheriff', 'Justice of the Supreme Court'].map(o => w.contributionCap(o, null))));
await scenario('404', e => call(e, 'GET', '/api/nope'));

process.stdout.write(JSON.stringify(out, null, 1));
