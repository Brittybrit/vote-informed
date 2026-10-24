// "What this means for you" data, one file per official on the ballot (public/data/you/<person>.json):
// every action they cast a vote on (or filed, for budget and earmark requests) with its topics
// (scripts/action-topics.mjs), whether a donor of theirs was tied to it, and the body's next meetings,
// agenda items already posted (public/data/upcoming.json) and how to speak or write to the body
// (public/data/cycles.json). The page matches topics to the household groups a voter picked on their own
// device; nothing about the voter is in these files.
// Run after action-topics.mjs and money-summary.mjs:  node scripts/you-files.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const J = p => JSON.parse(readFileSync(new URL(p, root)));
const d = J('public/data/decisions.json');
const S = J('public/data/money-summary.json');
const cycles = J('public/data/cycles.json');
const up = J('public/data/upcoming.json');
const CYCLE = '2025-01-01';
const CAL = { county: 'county' };   // decisions body key -> cycles key when the roster body differs
const CAST = new Set(['yes', 'no', 'requested']);
const dir = new URL('public/data/you/', root);
mkdirSync(dir, { recursive: true });
for (const f of readdirSync(dir)) if (f.endsWith('.json')) unlinkSync(new URL(f, dir));

const L3 = x => (x && typeof x === 'object' ? x : { en: String(x || '') });
let files = 0;
for (const B of d.bodies) {
  const cal = cycles.bodies.find(c => c.key === (CAL[B.key] || B.rosterBody)) || null;
  const agenda = (up.meetings || []).filter(m => cal && m.rosterBody === cal.rosterBody);
  for (const [key, ob] of Object.entries(B.onBallot || {})) {
    const m = B.members.find(x => x.key === key) || {};
    if (!m.person || !S.people[m.person]) continue;
    const accts = new Set(ob.accounts || []);
    const acts = [];
    for (const a of B.actions) {
      const v = (a.roll || {})[key];
      if (!CAST.has(v)) continue;
      if (a.kind === 'bill' && !a.universe && B.actions.some(x => x.kind === 'bill' && x.universe)) continue;
      // a city list built from the actions: only the actions in it, the same list the share line counts
      if (B.universe && B.universe.built === 'actions' && !a.universe) continue;
      const tied = (a.gifts || []).some(g => g.to === key && accts.has(g.acct) && g.date >= CYCLE);
      acts.push({
        id: a.id, date: a.date, kind: a.kind, title: L3(a.subject || a.title), topics: a.topics || [], vote: v,
        ...(tied ? { tied: true } : {}), ...(a.tally && a.tally[1] > 0 ? { split: true } : {}),
        ...(a.amount ? { amount: a.amount } : a.ask ? { amount: a.ask } : {}),
        link: ((a.links || []).find(l => ['minutes', 'matter', 'record', 'vote', 'clerk', 'analysis', 'bill'].includes(l.t)) || (a.links || [])[0] || {}).url || null,
      });
    }
    acts.sort((p, q) => String(q.date).localeCompare(String(p.date)));
    const out = {
      pid: m.person, name: m.name, member: key, body: { key: B.key, name: B.name, level: B.level || (B.type === 'requests' ? 'state' : 'local') },
      actions: acts,
      next: cal ? {
        name: cal.name, schedule: (cal.meetings && cal.meetings.schedule) || [], pattern: (cal.meetings && cal.meetings.pattern) || '',
        levers: (cal.levers || []).filter(l => ['public-comment', 'written-comment', 'contact'].includes(l.key)).map(l => ({ key: l.key, how: l.how, rules: l.rules, deadline: l.deadline, url: l.url })),
        links: cal.links || {},
        agenda: agenda.flatMap(mt => (mt.items || []).filter(it => (it.topics || []).some(t => t !== 'other')).map(it => ({ date: mt.meeting.date, title: it.title, topics: it.topics, link: ((it.links || [])[0] || {}).url || null }))),
      } : null,
    };
    writeFileSync(new URL(m.person + '.json', dir), JSON.stringify(out));
    files++;
  }
}
console.log(files + ' files in public/data/you/');
