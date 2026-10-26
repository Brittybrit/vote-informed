// Address or location -> precinct, the browser module (/find-precinct.js): the pure parts.
// The network calls (Census geocoder, county precinct layer) are not exercised here.
import test from 'node:test';
import assert from 'node:assert';   // objects come from another vm realm, so loose deepEqual
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {}, navigator: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../public/find-precinct.js', import.meta.url), 'utf8'), ctx);
const fp = ctx.window.findPrecinct;
const precincts = JSON.parse(fs.readFileSync(new URL('../public/data/precincts.json', import.meta.url), 'utf8'));

test('address gets a state so the geocoder stays in Florida', () => {
  assert.equal(fp.cleanAddress('  1700 Convention Center Dr,  Miami Beach '), '1700 Convention Center Dr, Miami Beach, FL');
  assert.equal(fp.cleanAddress('1700 Convention Center Dr, Miami Beach, FL 33139'), '1700 Convention Center Dr, Miami Beach, FL 33139');
  assert.equal(fp.cleanAddress('111 NW 1st St Miami Florida'), '111 NW 1st St Miami Florida');
  assert.equal(fp.cleanAddress(''), '');
});

test('Census geocoder response: first Florida match, lat/lng swapped from x/y', () => {
  const j = { result: { addressMatches: [{ matchedAddress: '1700 CONVENTION CENTER DR, MIAMI BEACH, FL, 33139',
    coordinates: { x: -80.1333, y: 25.7943 }, addressComponents: { state: 'FL' } }] } };
  assert.deepEqual(fp.parseGeocode(j), { lat: 25.7943, lng: -80.1333, matched: '1700 CONVENTION CENTER DR, MIAMI BEACH, FL, 33139' });
  assert.equal(fp.parseGeocode({ result: { addressMatches: [] } }), null);
  assert.equal(fp.parseGeocode({ result: { addressMatches: [{ coordinates: { x: -84, y: 34 }, addressComponents: { state: 'GA' } }] } }), null);
  assert.equal(fp.parseGeocode(null), null);
});

test('county precinct layer response: the ID of the polygon the point is in', () => {
  assert.equal(fp.parseLayer({ features: [{ attributes: { ID: 503 } }] }), '503');
  assert.equal(fp.parseLayer({ features: [{ attributes: { ID: '033' } }] }), '33');
  assert.equal(fp.parseLayer({ features: [] }), '');
  assert.equal(fp.parseLayer({ error: { code: 400 } }), '');
});

test('whole precinct -> the precinct codes on the county list, two for a split precinct', () => {
  assert.deepEqual(fp.candidates('503', precincts), ['503.0']);
  assert.deepEqual(fp.candidates('33', precincts), ['033.0']);
  assert.deepEqual(fp.candidates('116', precincts), ['116.0', '116.1']);
  assert.deepEqual(fp.candidates('100', precincts), []);   // on the map, not on the Oct 2026 list
  assert.deepEqual(fp.candidates('', precincts), []);
});

test('the county map and the county list name the same precincts', () => {
  // Every precinct on the Oct 1, 2026 cross reference exists as a polygon in the county's layer
  // (checked Oct 23, 2026 against the layer's ID field: 757 polygons; only 100 is not on the list).
  const whole = new Set(Object.keys(precincts.precincts).map(k => k.split('.')[0]));
  assert.equal(whole.size, 756);
  for (const w of whole) assert.ok(fp.candidates(w, precincts).length >= 1, 'precinct ' + w);
});

// The Worker's fallback routes: they reject bad input before calling anyone, and pass a good request
// to the Census geocoder or the county layer unchanged, returning the upstream body with no caching.
import { loadWorker } from './load-worker.mjs';

test('worker fallbacks: bad input is refused, good input passes through unchanged', async () => {
  const w = await loadWorker(['handleGeocode', 'handlePrecinctAt', 'esriGeocode']);
  const calls = [];
  const realFetch = globalThis.fetch;
  // Esri finds nothing usable here, so the Census answer passes through unchanged
  globalThis.fetch = async (url) => { calls.push(String(url)); return new Response(/geocode\.arcgis/.test(String(url)) ? '{"candidates":[]}' : '{"ok":1}', { status: 200 }); };
  try {
    assert.equal((await w.handleGeocode('')).status, 400);
    assert.equal((await w.handlePrecinctAt('40.7', '-74')).status, 400);     // New York: not Miami-Dade
    assert.equal((await w.handlePrecinctAt('x', '-80')).status, 400);
    assert.equal(calls.length, 0);
    const g = await w.handleGeocode('  1700 Convention Center Dr,  Miami Beach, FL ');
    assert.equal(g.status, 200);
    assert.equal(g.headers.get('Cache-Control'), 'no-store');
    assert.equal(await g.text(), '{"ok":1}');
    assert.match(calls[0], /^https:\/\/geocode\.arcgis\.com\/arcgis\/rest\/services\/World\/GeocodeServer\/findAddressCandidates\?.*SingleLine=1700%20Convention/);
    assert.match(calls[1], /^https:\/\/geocoding\.geo\.census\.gov\/geocoder\/locations\/onelineaddress\?benchmark=Public_AR_Current&format=json&address=1700%20Convention/);
    const p = await w.handlePrecinctAt('25.7943', '-80.1333');
    assert.equal(p.status, 200);
    assert.match(calls[2], /Precinct_gdb\/FeatureServer\/0\/query\?f=json&geometryType=esriGeometryPoint&inSR=4326.*geometry=-80\.1333%2C25\.7943$/);
  } finally { globalThis.fetch = realFetch; }
});

test('worker geocode: a rooftop match comes back in the Census shape', async () => {
  const w = await loadWorker(['handleGeocode', 'esriGeocode']);
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ candidates: [{ address: '1504 Bay Rd, Miami Beach, Florida, 33139', location: { x: -80.144, y: 25.7878 }, score: 100, attributes: { Addr_type: 'PointAddress', Region: 'Florida' } }] }), { status: 200 });
  try {
    const j = JSON.parse(await (await w.handleGeocode('1504 bay rd, miami beach, fl')).text());
    const m = j.result.addressMatches[0];
    assert.equal(m.coordinates.y, 25.7878); assert.equal(m.addressComponents.state, 'FL'); assert.equal(j.source, 'esri');
  } finally { globalThis.fetch = realFetch; }
});
