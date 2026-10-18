import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker } from './load-worker.mjs';

const w = await loadWorker(['buildLobbyIndex', 'countyLobbyTies', 'lobbyMatch', 'isCountyRace']);
const idx = w.buildLobbyIndex({ year: 2026, asOf: '2026-10-18', source: { name: 'Clerk', url: 'https://x' }, lobbyists: [
  { id: '1', name: 'MANZANO, JESSE', addr: 'PO BOX 348068, CORAL GABLES, FL 33234', clients: [['CARAHSOFT', '12/17/2025'], ['NWN Corporation', '12/17/2025']] },
  { id: '2', name: 'LOSNER, MAX', addr: '2100 PONCE DE LEON BLVD, 825, CORAL GABLES, FL 33134', clients: [['PANTIN GOV LLC', '1/1/2026']] },
  { id: '3', name: 'DIAZ, JOSE', addr: '201 East Park Avenue, Tallahassee, FL 32301', clients: [['RICKENBACKER MARINA, INC.', '12/15/2025']] },
  { id: '4', name: 'WECHSLER, ESQ, OLIVER', addr: '1450 BRICKELL AVENUE, SUITE 2300, MIAMI, FL 33131', clients: [['Kendall Associates I, LLLP', '1/7/2026']] }
] });

test('county lobbyists: people need a name and a ZIP or occupation match', () => {
  assert.equal(w.lobbyMatch(idx, { name: 'JESSE MANZANO', type: 'individual', zip: '33234', occ: 'CONSULTANT' }).as, 'lobbyist');
  assert.equal(w.lobbyMatch(idx, { name: 'MAX LOSNER', type: 'individual', zip: '33030', occ: 'GOVERNMENT AFFAIRS' }).as, 'lobbyist');   // occupation, not ZIP
  assert.equal(w.lobbyMatch(idx, { name: 'LORI LOSNER', type: 'individual', zip: '33030', occ: 'RETIRED' }), null);                  // other first name
  assert.equal(w.lobbyMatch(idx, { name: 'JOSE DIAZ', type: 'individual', zip: '33155', occ: 'TEACHER' }), null);                    // common name, nothing else matches
  assert.equal(w.lobbyMatch(idx, { name: 'OLIVER WECHSLER', type: 'individual', zip: '33131', occ: 'ATTORNEY' }).lobbyist, 'Oliver Wechsler');   // "ESQ" dropped
});

test('county lobbyists: companies match on the registered client name', () => {
  assert.deepEqual(w.lobbyMatch(idx, { name: 'Rickenbacker Marina Inc', type: 'corporation' }), { as: 'client', lobbyists: ['Jose Diaz'], more: 0 });
  assert.equal(w.lobbyMatch(idx, { name: 'KENDALL ASSOCIATES I, LLLP', type: 'corporation' }).as, 'client');
  assert.equal(w.lobbyMatch(idx, { name: 'Rickenbacker Marina Holdings', type: 'corporation' }), null);
  const r = w.countyLobbyTies(idx, [{ name: 'CARAHSOFT', type: 'corporation', amount: 500 }, { name: 'JESSE MANZANO', type: 'individual', zip: '33234', amount: 1000 }, { name: 'A B', type: 'individual', amount: 9 }]);
  assert.deepEqual([r.count, r.total, r.of, r.givers[0].name], [2, 1500, 3, 'JESSE MANZANO']);
});

test('county lobbyists: county offices only', () => {
  assert.ok(w.isCountyRace('County Commissioner, District 5'));
  assert.ok(!w.isCountyRace('School Board Member, District 1'));
  assert.ok(!w.isCountyRace('Coral Gables - for Mayor - Group I'));
});

test('lobbying firms: filed address with suite or PO box equals a lobbyist office', async () => {
  const { loadWorker } = await import('./load-worker.mjs');
  const v = await loadWorker(['buildLobbyIndex', 'lobbyMatch']);
  const ix = v.buildLobbyIndex({ lobbyists: [
    { id: '1', name: 'MEJIA, DANIELLE', addr: '3800 NE 1st Ave, Suite 200, Miami, FL 33137', clients: [['AVMED, INC.', '']] },
    { id: '2', name: 'MANZANO, JESSE', addr: 'PO BOX 348068, CORAL GABLES, FL 33234', clients: [['NWN Corporation', '']] }
  ] });
  assert.deepEqual(v.lobbyMatch(ix, { name: 'LSN PARTNERS', type: 'corporation', street: '3800 NE 1 AVE STE 200', zip: '33137' }), { as: 'firm', lobbyists: ['Danielle Mejia'], more: 0 });
  assert.equal(v.lobbyMatch(ix, { name: 'TRIDENTE STRATEGIES, INC.', type: 'corporation', street: 'PO BOX 348068', zip: '33234' }).as, 'firm');
  assert.equal(v.lobbyMatch(ix, { name: 'OTHER CO', type: 'corporation', street: '3800 NE 1 AVE STE 300', zip: '33137' }), null);   // other suite
  assert.equal(v.lobbyMatch(ix, { name: 'NO SUITE CO', type: 'corporation', street: '3800 NE 1 AVE', zip: '33137' }), null);           // no suite, no match
});
