import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker } from './load-worker.mjs';

const w = await loadWorker(['flOutsideRows', 'refreshFlOutside', 'FL_OUT_VERSION', 'FL_OUT_TTL_MS']);
const realFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = realFetch; });
const R = (filer, date, amt, purpose, type = 'MON') => [filer, date, String(amt), 'PAYEE', 'ADDR', 'MIAMI, FL 33101', purpose, type];

test('FL outside: side only when the filing says it; contributions and own campaigns left out', () => {
  const rows = [
    R('First Amendment LLC (PAC)', '10/02/2026', 33286, 'ESTIMATED DIGITAL ADS OPPOSING RICHARD LAMONDIN (SD-38)'),
    R('Equality Florida Action PAC, Inc. (PAC)', '09/29/2026', 10, 'TEXTS IN SUPPORT OF RICHARD LAMONDIN SD 38'),
    R('Florida Republican Senatorial Campaign C (PAP)', '08/01/2026', 20475, 'POLLING-SD38 LAMONDIN'),        // district tag, no first name
    R('Metro-Dade Firefighters PAC (PAC)', '07/01/2026', 4000, 'POLITICAL COMMITEE - RICHARD LAMONDIN'),   // a transfer
    R('Yeager For Florida (PAC)', '07/02/2026', 1000, 'CANDIDATE CONTRIBUTION - LAMONDIN/SD38'),
    R('Lamondin, Richard  (DEM)(STS)', '07/03/2026', 900, 'MAILERS RICHARD LAMONDIN'),                     // his own campaign
    R('Some PAC (PAC)', '07/04/2026', 500, 'MAILERS FOR JOHN LAMONDIN'),                                   // someone else
    R('First Amendment LLC (PAC)', '10/09/2026', -200, 'REFUND OPPOSING RICHARD LAMONDIN')
  ];
  const o = w.flOutsideRows(rows, 'Richard Lamondin Jr.', 'State Senator, District 38');
  assert.deepEqual(o.oppose.map(i => [i.name, i.amt]), [['First Amendment LLC', 33286]]);
  assert.deepEqual(o.support.map(i => [i.name, i.amt]), [['Equality Florida Action PAC, Inc.', 10]]);
  assert.deepEqual(o.unstated.map(i => [i.name, i.amt, i.kind]), [['Florida Republican Senatorial Campaign C', 20475, 'party committee']]);
  assert.deepEqual(o.totals, { support: 10, oppose: 33286, unstated: 20475 });
  assert.equal(o.oppose[0].from, '2026-10-02');
  assert.equal(o.oppose[0].bought[0].c, 'digital');
});

test('FL outside: hyphenated last names, and federal or local offices skipped', async () => {
  const o = w.flOutsideRows([R('First Amendment LLC (PAC)', '10/02/2026', 13801, 'ESTIMATED DIGITAL ADS OPPOSING LUCIA BAEZ-GELLER (HD-106)')],
    'Lucia Baez-Geller', 'State Representative, District 106');
  assert.equal(o.totals.oppose, 13801);
  assert.equal(w.flOutsideRows([], 'Ana Rodriguez', 'Doral - Councilmember - Seat 2'), null);
  const r = {};
  assert.equal(await w.refreshFlOutside({}, r, 'Ana Rodriguez', 'Doral - Councilmember - Seat 2'), false);
});

test('FL outside: daily refresh; keeps the last pull when the state site is down', async () => {
  const t0 = 1_800_000_000_000;
  globalThis.fetch = async () => ({ ok: true, text: async () => 'Candidate/Committee\tDate\tAmount\tPayee Name\tAddress\tCity State Zip\tPurpose\tType\n' +
    R('First Amendment LLC (PAC)', '10/02/2026', 13801, 'DIGITAL ADS OPPOSING LUCIA BAEZ-GELLER').join('\t') + '\n' });
  const r = {};
  assert.equal(await w.refreshFlOutside({}, r, 'Lucia Baez-Geller', 'State Representative, District 106', t0), true);
  assert.equal(r.flOutside.totals.oppose, 13801);
  assert.equal(await w.refreshFlOutside({}, r, 'Lucia Baez-Geller', 'State Representative, District 106', t0 + 1000), false);
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  assert.equal(await w.refreshFlOutside({}, r, 'Lucia Baez-Geller', 'State Representative, District 106', t0 + w.FL_OUT_TTL_MS + 1), true);
  assert.equal(r.flOutside.totals.oppose, 13801);
});
