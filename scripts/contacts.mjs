// Merges scripts/data/contacts/*.json into public/data/contacts.json keyed by roster office id.
// Checks every office id exists in the roster and every row has a source. Re-runnable.
//   node scripts/contacts.mjs
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const srcDir = path.join(here, 'data', 'contacts');
const roster = JSON.parse(fs.readFileSync(path.join(here, '..', 'public', 'data', 'roster.json'), 'utf8'));
const officeIds = new Set(roster.offices.map(o => o.id));
const out = { updated: new Date().toISOString().slice(0, 10), note: 'Official contacts per office, from each body\'s own pages. Source files: scripts/data/contacts/. Rebuild: node scripts/contacts.mjs.', offices: {}, bodies: {} };
const problems = [];
for (const f of fs.readdirSync(srcDir).filter(f => f.endsWith('.json')).sort()) {
  let b;
  try { b = JSON.parse(fs.readFileSync(path.join(srcDir, f), 'utf8')); } catch (e) { problems.push(f + ': not valid JSON: ' + e.message); continue; }
  if (!b.rosterBody) { problems.push(f + ': missing rosterBody'); continue; }
  for (const o of b.offices || []) {
    if (!officeIds.has(o.office)) { problems.push(f + ': unknown office id ' + o.office + ', dropped'); continue; }
    if (!o.source) { problems.push(f + ': ' + o.office + ' has no source, dropped'); continue; }
    out.offices[o.office] = { ...o, body: b.rosterBody, checked: b.checked || null };
  }
  if (b.body) out.bodies[b.rosterBody] = { ...b.body, checked: b.checked || null, notes: b.notes || null };
}
fs.writeFileSync(path.join(here, '..', 'public', 'data', 'contacts.json'), JSON.stringify(out, null, 1) + '\n');
console.log('wrote public/data/contacts.json', Object.keys(out.offices).length, 'offices,', Object.keys(out.bodies).length, 'bodies');
for (const p of problems) console.log('  !', p);
