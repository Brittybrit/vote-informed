// We the People 305: its own Worker, separate from ballot305.org so nothing here can touch the voter guide.
// Today it serves the founder board at admin.wethepeople305.org and a holding page at wethepeople305.org.
// The board's chat reads the public ballot305 data API over HTTPS; it has no access to that Worker's storage.

const MODEL = 'claude-haiku-4-5';
const API_URL = 'https://api.anthropic.com/v1/messages';
const ADMIN_HOSTS = new Set(['admin.wethepeople305.org']);
const BOARD_KEY = 'board:founder';
const BOARD_CONTEXT_KEY = 'board:context';   // project notes the board's chat reads (claude.ai Projects are not reachable by API)

function platformOrigin(env) { return /^https:\/\//.test(env.PLATFORM_ORIGIN || '') ? env.PLATFORM_ORIGIN.replace(/\/$/, '') : 'https://ballot305.org'; }

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (ADMIN_HOSTS.has(url.hostname)) {
        if (url.pathname === '/' || url.pathname === '/index.html') return env.ASSETS.fetch(new Request('https://assets.local/admin/board.html', request));
        if (url.pathname.startsWith('/api/admin/')) return await handleAdmin(request, env, url);
        return env.ASSETS.fetch(request);
      }
      // Public hosts: the board and its state are not reachable here at all.
      if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
      return env.ASSETS.fetch(request);
    } catch (e) {
      return json({ error: 'Something went wrong' }, 500);
    }
  }
};

async function handleAdmin(request, env, url) {
  if (!env.ADMIN_TOKEN) return json({ error: 'Not found' }, 404);
  if (!adminOk(request, env)) return json({ error: 'Unauthorized' }, 401);
  const route = url.pathname.slice('/api/admin/'.length);
  if (request.method === 'GET' && route === 'board') return json((await env.CACHE.get(BOARD_KEY, 'json')) || { status: {}, notes: {}, extra: [], overrides: {}, hidden: [], updated: null });
  if (request.method === 'GET' && route === 'board-context') return json({ text: (await env.CACHE.get(BOARD_CONTEXT_KEY)) || '' });
  if (request.method !== 'POST') return json({ error: 'Not found' }, 404);
  const b = await request.json().catch(() => ({}));
  if (route === 'board') { const st = boardState(b.state); st.updated = new Date().toISOString(); await env.CACHE.put(BOARD_KEY, JSON.stringify(st)); return json({ ok: true, state: st }); }
  if (route === 'board-context') { const t = isStr(b.text) ? b.text.slice(0, 200000) : ''; if (t) await env.CACHE.put(BOARD_CONTEXT_KEY, t); else await env.CACHE.delete(BOARD_CONTEXT_KEY); return json({ ok: true, chars: t.length }); }
  if (route === 'board-chat') return json(await boardChat(env, b, url));
  return json({ error: 'Not found' }, 404);
}

function adminOk(request, env) {
  const tok = env.ADMIN_TOKEN;
  const got = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!tok || !got || got.length !== tok.length) return false;
  let diff = 0;
  for (let i = 0; i < tok.length; i++) diff |= tok.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

const BOARD_COLS = ['todo', 'doing', 'waiting', 'done'];
function boardState(x) {
  x = x && typeof x === 'object' ? x : {};
  const st = { status: {}, notes: {}, extra: [], overrides: {}, hidden: [] };
  for (const h of Array.isArray(x.hidden) ? x.hidden.slice(0, 200) : []) if (typeof h === 'string') st.hidden.push(h.slice(0, 80));
  for (const [k, v] of Object.entries(x.status || {})) if (BOARD_COLS.includes(v)) st.status[String(k).slice(0, 80)] = v;
  for (const [k, v] of Object.entries(x.notes || {})) if (Array.isArray(v)) st.notes[String(k).slice(0, 80)] = v.slice(0, 50).map(n => String(n).slice(0, 400));
  for (const e of Array.isArray(x.extra) ? x.extra.slice(0, 200) : []) if (e && e.id && e.title) st.extra.push({ id: String(e.id).slice(0, 80), track: String(e.track || 'running').slice(0, 20), title: String(e.title).slice(0, 160), route: String(e.route || '').slice(0, 500), cost: String(e.cost || '').slice(0, 60), time: String(e.time || '').slice(0, 60), url: /^https:/.test(String(e.url || '')) ? String(e.url).slice(0, 500) : '' });
  for (const [k, v] of Object.entries(x.overrides || {})) if (v && typeof v === 'object') st.overrides[String(k).slice(0, 80)] = { title: v.title ? String(v.title).slice(0, 160) : undefined, route: v.route ? String(v.route).slice(0, 500) : undefined, url: /^https:/.test(String(v.url || '')) ? String(v.url).slice(0, 500) : undefined, label: v.label ? String(v.label).slice(0, 40) : undefined };
  return st;
}
const BOARD_TOOLS = [
  { name: 'set_status', description: 'Move a card to a column by step id. status is one of: todo, doing, waiting, done.', input_schema: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' } }, required: ['id', 'status'] } },
  { name: 'add_note', description: 'Attach a short note to a step by its id (a decision, a date, a link).', input_schema: { type: 'object', properties: { id: { type: 'string' }, text: { type: 'string' } }, required: ['id', 'text'] } },
  { name: 'edit_step', description: 'Change a step\'s title, its route text, or add or replace its main link (url must be https, label is the button text). Only the fields given change.', input_schema: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, route: { type: 'string' }, url: { type: 'string' }, label: { type: 'string' } }, required: ['id'] } },
  { name: 'add_step', description: 'Add a new card. track is one of: name, nonprofit, records, comms, funding, running. status defaults to todo.', input_schema: { type: 'object', properties: { track: { type: 'string' }, title: { type: 'string' }, route: { type: 'string' }, cost: { type: 'string' }, time: { type: 'string' }, url: { type: 'string' }, status: { type: 'string' } }, required: ['track', 'title'] } },
  { name: 'remove_step', description: 'Delete a card from the board by id. Built-in cards are hidden (restorable from the board), added cards are removed.', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'read_platform', description: 'Read the live We the People 305 data API. path is a /api/v1 path with query, for example /api/v1/now?precinct=033.0, /api/v1/upcoming?body=county, /api/v1/procurement/county, /api/v1/payments/county, /api/v1/people/vicki-l-lopez, /api/v1/cycles/county, /api/v1/connections. Returns JSON, truncated to 12000 characters.', input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }
];
function runBoardTool(st, ids, name, i) {
  const has = id => ids.includes(id) || st.extra.some(x => x.id === id);
  if (name === 'set_status') { const id = String(i.id); if (!has(id)) return 'Error: no step with id ' + id; const v = String(i.status); if (!BOARD_COLS.includes(v)) return 'Error: status must be todo, doing, waiting or done'; st.status[id] = v; return { id, status: v }; }
  if (name === 'add_note') { const id = String(i.id); if (!has(id)) return 'Error: no step with id ' + id; st.notes[id] = (st.notes[id] || []).concat([String(i.text || '').slice(0, 400)]); return st.notes[id]; }
  if (name === 'edit_step') {
    const id = String(i.id); if (!has(id)) return 'Error: no step with id ' + id;
    const x = st.extra.find(y => y.id === id);
    if (x) { if (i.title) x.title = String(i.title).slice(0, 160); if (i.route) x.route = String(i.route).slice(0, 500); if (i.url && /^https:/.test(String(i.url))) x.url = String(i.url); return x; }
    const o = st.overrides[id] || {};
    if (i.title) o.title = String(i.title).slice(0, 160); if (i.route) o.route = String(i.route).slice(0, 500);
    if (i.url) { if (!/^https:/.test(String(i.url))) return 'Error: url must start with https'; o.url = String(i.url); o.label = i.label ? String(i.label).slice(0, 40) : 'Open'; }
    st.overrides[id] = o; return { id, ...o };
  }
  if (name === 'add_step') { const id = 'x-' + Date.now().toString(36); st.extra.push({ id, track: String(i.track || 'running').slice(0, 20), title: String(i.title || '').slice(0, 160), route: String(i.route || '').slice(0, 500), cost: String(i.cost || '').slice(0, 60), time: String(i.time || '').slice(0, 60), url: /^https:/.test(String(i.url || '')) ? String(i.url) : '' }); if (BOARD_COLS.includes(i.status)) st.status[id] = i.status; return { id }; }
  if (name === 'remove_step') { const id = String(i.id); if (!has(id)) return 'Error: no step with id ' + id; const n = st.extra.length; st.extra = st.extra.filter(x => x.id !== id); if (st.extra.length === n && !st.hidden.includes(id)) st.hidden.push(id); return { removed: id }; }
  return 'Error: unknown tool';
}
async function boardChat(env, b, url) {
  if (!env.ANTHROPIC_API_KEY) return { error: 'No API key configured' };
  const q = isStr(b.question) ? b.question.slice(0, 2000) : '';
  if (!q) return { error: 'Empty question' };
  const st = boardState(await env.CACHE.get(BOARD_KEY, 'json'));
  const board = isStr(b.board) ? b.board.slice(0, 40000) : '';
  const ids = Array.isArray(b.ids) ? b.ids.map(String).slice(0, 500) : [];
  const focus = isStr(b.stepId) && b.stepId ? '\n\nThe owner opened the edit box on step id "' + b.stepId.slice(0, 80) + '" and typed the instruction below. Apply it to that step with edit_step (and set_status or add_note if that is what they mean), then confirm in one short sentence.' : '';
  const context = (await env.CACHE.get(BOARD_CONTEXT_KEY)) || '';
  const system = 'You are helping the owner of the founder board for We the People 305, a Miami-Dade civic data nonprofit. The board is a kanban with columns todo, doing, waiting, done. Answer from the board, the project notes and, when the question is about officials, agendas, money or the platform\'s data, the live API through read_platform. If asked to change the board, use the tools, then confirm in one short sentence. You cannot change the website or the repo from here; say so plainly if asked. Plain language, no em dashes, no markdown headers.' + (context ? '\n\nPROJECT NOTES (the owner\'s own planning documents):\n' + context.slice(0, 120000) : '');
  const payload = { model: env.MODEL || MODEL, max_tokens: 800, system, tools: BOARD_TOOLS, messages: [{ role: 'user', content: 'BOARD (one JSON line per step):\n' + board + focus + '\n\nINSTRUCTION: ' + q }] };
  let text = '', changed = false;
  for (let round = 0; round < 6; round++) {
    const data = await callAnthropicOnce(env, payload);
    text += (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    const uses = (data.content || []).filter(c => c.type === 'tool_use');
    if (!uses.length || data.stop_reason !== 'tool_use') break;
    payload.messages.push({ role: 'assistant', content: data.content });
    const results = [];
    for (const u of uses) {
      let r;
      if (u.name === 'read_platform') {
        const p = String((u.input || {}).path || '');
        if (!p.startsWith('/api/v1')) r = 'Error: path must start with /api/v1';
        else { try { const res = await fetch(platformOrigin(env) + p, { headers: { 'User-Agent': 'wethepeople305-board' } }); r = (await res.text()).slice(0, 12000); } catch (e) { r = 'Error: ' + e.message; } }
      } else { r = runBoardTool(st, ids, u.name, u.input || {}); if (typeof r !== 'string' || !r.startsWith('Error')) changed = true; }
      results.push({ type: 'tool_result', tool_use_id: u.id, content: typeof r === 'string' ? r : JSON.stringify(r) });
    }
    payload.messages.push({ role: 'user', content: results });
  }
  if (changed) { st.updated = new Date().toISOString(); await env.CACHE.put(BOARD_KEY, JSON.stringify(st)); }
  return { text: text.trim(), state: st, changed };
}

async function callAnthropicOnce(env, payload) {
  const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('Anthropic API ' + res.status + ': ' + (await res.text()).slice(0, 300));
  return res.json();
}
function isStr(v) { return typeof v === 'string' && v.trim().length > 0; }
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } });
}
