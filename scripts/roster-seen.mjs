// Where the roster only knows a member was seated from "the first meeting record in this data", move that
// date back to the member's earliest recorded vote in a city's action list, citing the record that shows it.
// Terms whose start date a source states are never changed.
// Run: node scripts/roster-seen.mjs <slug> [...]   (after node scripts/city-actions.mjs)
import { readFileSync, writeFileSync } from 'node:fs';
const P = p => new URL('../' + p, import.meta.url);
const J = p => JSON.parse(readFileSync(P(p)));
const R = J('public/data/roster.json'), d = J('public/data/decisions.json');
const OFF = new Map(R.offices.map(o => [o.id, o]));
const slugs = process.argv.slice(2), log = [];
for (const B of d.bodies.filter(b => slugs.includes(b.key))) {
  for (const m of B.members) {
    const voted = B.actions.filter(a => a.universe && ['yes', 'no', 'abstain', 'recused'].includes(a.roll[m.key])).sort((p, q) => p.date.localeCompare(q.date));
    if (!voted.length) continue;
    const first = voted[0];
    for (const t of R.terms.filter(t => t.person === m.person && (OFF.get(t.office) || {}).body === B.rosterBody)) {
      if (t.start || t.startKnown !== false || !t.servingFrom || t.servingFrom <= first.date) continue;
      if (!/first official meeting record in this data/.test(t.servingFromSource || '')) continue;
      const url = (first.links || []).find(l => l.url)?.url;
      log.push(`${m.person}: ${t.servingFrom} -> ${first.date} (${first.id})`);
      t.servingFrom = first.date; t.servingFromSource = `earliest recorded vote in the ${B.name.en} records: ${first.ref || first.id} (${first.date})`;
      if (url && !t.sources.includes(url)) t.sources.push(url);
    }
  }
}
writeFileSync(P('public/data/roster.json'), JSON.stringify(R, null, 1));
console.log(log.join('\n') || 'no changes');
