// Merges the hand-researched cycle files in scripts/data/cycles/*.json into public/data/cycles.json.
// Checks: every dated schedule row, phase and election field with a date has a source URL; dates are
// YYYY-MM-DD; keys are unique. Prints what it kept and what it dropped. Re-runnable.
//   node scripts/cycles.mjs
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const srcDir = path.join(here, 'data', 'cycles');
const out = path.join(here, '..', 'public', 'data', 'cycles.json');
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PHASES = new Set(['budget-proposal', 'budget-hearings', 'fiscal-year-start', 'qualifying', 'campaign', 'election', 'swearing-in', 'recess', 'regular', 'planning', 'other']);
const LEVERS = new Set(['public-comment', 'written-comment', 'contact', 'records-request', 'petition', 'referendum', 'recall', 'qualify', 'vote', 'serve-on-board', 'other']);
const MEETING_KINDS = new Set(['regular', 'zoning', 'budget-hearing', 'workshop', 'special', 'other']);

const problems = [];
const bodies = [];
for (const f of fs.readdirSync(srcDir).filter(f => f.endsWith('.json')).sort()) {
  let b;
  try { b = JSON.parse(fs.readFileSync(path.join(srcDir, f), 'utf8')); }
  catch (e) { problems.push(f + ': not valid JSON: ' + e.message); continue; }
  const where = f + ' ';
  if (!b.key || !b.rosterBody || !b.name || !b.level) { problems.push(where + 'missing key, rosterBody, name or level'); continue; }
  b.meetings = b.meetings || { pattern: null, agendaLeadDays: null, schedule: [] };
  b.meetings.schedule = (b.meetings.schedule || []).filter(m => {
    if (!DATE.test(String(m.date || ''))) { problems.push(where + 'meeting without a date dropped: ' + JSON.stringify(m)); return false; }
    if (!m.source) { problems.push(where + 'meeting ' + m.date + ' has no source, dropped'); return false; }
    if (m.kind && !MEETING_KINDS.has(m.kind)) { problems.push(where + 'meeting ' + m.date + ' kind ' + m.kind + ' set to other'); m.kind = 'other'; }
    return true;
  }).sort((x, y) => x.date.localeCompare(y.date));
  b.phases = (b.phases || []).filter(p => {
    if (!p.key || !PHASES.has(p.key)) { problems.push(where + 'phase with unknown key dropped: ' + JSON.stringify(p.key)); return false; }
    for (const k of ['start', 'end']) if (p[k] != null && !DATE.test(String(p[k]))) { problems.push(where + 'phase ' + p.key + ' bad ' + k + ' ' + p[k] + ', dropped'); return false; }
    if ((p.start || p.end) && !p.source) { problems.push(where + 'phase ' + p.key + ' has dates but no source, dropped'); return false; }
    p.repeats = p.repeats === 'yearly' ? 'yearly' : 'once';
    return true;
  });
  b.levers = (b.levers || []).filter(l => {
    if (!l.key || !LEVERS.has(l.key)) { problems.push(where + 'lever with unknown key dropped: ' + JSON.stringify(l.key)); return false; }
    if (!l.source) { problems.push(where + 'lever ' + l.key + ' has no source, dropped'); return false; }
    return true;
  });
  b.elections = b.elections || { next: null, qualifying: null, terms: null, source: null };
  if (b.elections.next && !DATE.test(b.elections.next)) { problems.push(where + 'elections.next not a date, cleared'); b.elections.next = null; }
  if (b.elections.next && !b.elections.source) { problems.push(where + 'elections.next has no source, cleared'); b.elections.next = null; }
  b.contacts = b.contacts || [];
  b.links = b.links || {};
  bodies.push(b);
}
const keys = bodies.map(b => b.key);
const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
if (dup.length) problems.push('duplicate keys: ' + dup.join(', '));

const result = {
  updated: new Date().toISOString().slice(0, 10),
  note: 'Governance calendar and citizen levers per body. Hand-researched from each body\'s own site, code and charter; every date and rule carries the page it was read from. Source files: scripts/data/cycles/. Rebuild: node scripts/cycles.mjs.',
  bodies
};
fs.writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
console.log('wrote', path.relative(process.cwd(), out), bodies.length, 'bodies;', bodies.reduce((n, b) => n + b.meetings.schedule.length, 0), 'meetings;', bodies.reduce((n, b) => n + b.phases.length, 0), 'phases;', bodies.reduce((n, b) => n + b.levers.length, 0), 'levers');
for (const p of problems) console.log('  !', p);
if (dup.length) process.exit(1);
