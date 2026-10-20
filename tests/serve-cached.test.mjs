// A cached dossier comes back fast even when its daily refresh from official sources is slow.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker, fakeKV } from './load-worker.mjs';

const w = await loadWorker(['serveCached', 'QUICK_MS', 'fecOverride']);

test('slow refresh: the stored dossier is returned within the quick window and the refresh continues', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => new Promise(() => {});   // every official source hangs
  const waited = [];
  try {
    const env = { CACHE: fakeKV() };
    const cached = { summary: 'x', donors: [{ name: 'A', amount: '$500' }], endorsements: [], sumV: 999, oppV: 999, cycV: 999, linkV: 999 };
    const t0 = Date.now();
    const r = await w.serveCached(env, { waitUntil: p => waited.push(p) }, null, 'resl4:x', cached,
      'Jane Doe', null, 'State Representative, District 113');
    const ms = Date.now() - t0;
    assert.ok(ms < w.QUICK_MS + 1000, 'returned in ' + ms + 'ms');
    assert.equal(r.summary, 'x');
    assert.equal(waited.length, 1, 'refresh handed to waitUntil');
  } finally { globalThis.fetch = realFetch; }
});

test('FEC spelling override for a ballot name the FEC misspells', () => {
  assert.equal(w.fecOverride('Neil J. Gillespie'), 'S6FL00863');
  assert.equal(w.fecOverride('Ashley Moody'), '');
});

test('old sample ballots are turned away; this election and undated ballots load', async () => {
  const x = await loadWorker(['otherElection']);
  assert.ok(x.otherElection({ electionName: 'General Election', electionDate: 'November 5, 2024' }));
  assert.ok(x.otherElection({ electionName: 'Primary Election', electionDate: 'August 18, 2026' }));
  assert.equal(x.otherElection({ electionName: 'General Election', electionDate: 'Tuesday, November 3, 2026' }), '');
  assert.equal(x.otherElection({ electionName: 'General Election', electionDate: '' }), '');
});
