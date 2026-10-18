import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadWorker } from './load-worker.mjs';

const { actionsToCsv } = await loadWorker(['actionsToCsv']);

test('CSV lists registered lobbyists, and keeps an action with no donors as one row', () => {
  const csv = actionsToCsv({ actions: [{
    candidate: 'A', body: 'B', date: '2025-05-06', title: { en: 'Approved a variance' }, passed: true, votes: { unanimous: true }, role: ['yes'],
    lobbied: [{ name: 'Alan Krischer', firm: 'Holland & Knight', for: 'Regency Centers Corporation', reg: '2025-05', src: 'aventura' }],
    donors: [] }] });
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[0].includes('registered_lobbyists'));
  assert.ok(lines[1].includes('Alan Krischer (Holland & Knight) for Regency Centers Corporation, registered 2025-05'));
});

test('every action in the data file is well formed', () => {
  const d = JSON.parse(readFileSync(new URL('../public/data/donor-actions.json', import.meta.url)));
  const roles = new Set(['yes', 'no', 'absent', 'moved', 'seconded', 'presented', 'requested', 'sponsor', 'sponsoredItem']);
  for (const a of d.actions) {
    for (const k of ['en', 'es', 'ht']) assert.ok(a.title[k], a.title.en + ' ' + k);
    if (a.context) for (const k of ['en', 'es', 'ht']) assert.ok(a.context[k], a.title.en + ' context ' + k);
    for (const r of a.role) assert.ok(roles.has(r), r);
    assert.ok((a.donors || []).length || (a.lobbied || []).length, 'needs a donor or a lobbyist: ' + a.title.en);
    for (const l of a.lobbied || []) {
      assert.ok(l.name);
      if (l.src !== 'form') assert.ok(d.registries[l.src], 'registry ' + l.src);
      if (l.reg) assert.match(l.reg, /^\d{4}-\d{2}(-\d{2})?$/);
    }
  }
});
