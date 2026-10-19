import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const data = JSON.parse(read('../public/data/precincts.json'));
const offices = JSON.parse(read('./fixtures/master-offices-2026-11-03.json')).map(([office, m]) => ({ office, isMeasure: !!m }));
const ctx = { window: {} };
vm.runInNewContext(read('../public/precinct-filter.js'), ctx);
const { raceInPrecinct, normPrecinct } = ctx.window.precinctFilter;
const pcts = Object.keys(data.precincts);
const on = (office, p) => raceInPrecinct(offices.find(r => r.office === office) || { office }, p, data);

test('precinct list matches the county polling place list', () => {
  const pp = read('../src/polling-places.js');
  const keys = [...pp.matchAll(/^\s*"(\d{3}\.\d)":/gm)].map(m => m[1]).sort();
  assert.equal(pcts.length, 767);
  assert.deepEqual([...pcts].sort(), keys);
});

test('precinct numbers normalize', () => {
  assert.equal(normPrecinct('33'), '033.0');
  assert.equal(normPrecinct('PRECINCT 116.1'), '116.1');
  assert.equal(normPrecinct('0503.0'), '503.0');
  assert.equal(normPrecinct(''), '');
});

test('every race on the master ballot is placed, except special districts', () => {
  for (const r of offices) {
    const res = pcts.map(p => raceInPrecinct(r, p, data));
    if (/community development district/i.test(r.office)) { assert.ok(res.every(x => x === null), r.office); continue; }
    assert.ok(res.every(x => x === true || x === false), r.office + ' has unplaced precincts');
    assert.ok(res.some(x => x), r.office + ' is on no precinct\'s ballot');
  }
});

test('each precinct gets exactly one of each district race that is up', () => {
  for (const p of pcts) {
    const n = re => offices.filter(r => re.test(r.office) && raceInPrecinct(r, p, data)).length;
    assert.equal(n(/^Representative in Congress/), 1, p);
    assert.ok(n(/^State Senator/) <= 1 && n(/^State Representative/) <= 1, p);
    assert.equal(n(/^(United States Senator|Governor)/), 2, p);
  }
});

test('spot checks against the county cross reference', () => {
  // 503.0: City of Miami, Congress 24, Senate 36, House 113, County Commission 5
  assert.equal(on('City of Miami 1: Safe and Ready Miami: General Obligation Bonds for Police/Fire Facilities without Increasing Millage Rate', '503.0'), true);
  assert.equal(on('City of Miami Beach: Two 20-year Lease Extension Options for City Property at 1691 Michigan Avenue', '503.0'), false);
  assert.equal(on('County Commissioner, District 5', '503.0'), true);
  assert.equal(on('State Representative, District 113', '503.0'), true);
  assert.equal(on('Representative in Congress, District 24', '503.0'), true);
  // 001.0: Golden Beach, no city races on this ballot, Senate 37 not up
  assert.equal(offices.filter(r => /^State Senator/.test(r.office) && raceInPrecinct(r, '001.0', data)).length, 0);
  assert.equal(on('Sunny Isles Beach - Mayor', '001.0'), false);
  assert.equal(on('Sunny Isles Beach - Mayor', '002.0'), true);
  // hyphenated and abbreviated city names
  assert.equal(on('Opa-locka - Mayor', '236.0'), true);
  assert.equal(on('City of Opa-locka 1: Amending compensation for Mayor and City Commissioners', '236.0'), true);
  assert.equal(on('North Miami Beach - Group 2 - Commissioner', '109.0'), true);
  // North Miami districts: 142.0 is District 2, 138.0 District 3, 133.0 District 4
  assert.equal(on('North Miami - Councilperson - District 2', '142.0'), true);
  assert.equal(on('North Miami - Councilperson - District 3', '142.0'), false);
  assert.equal(on('North Miami - Councilperson - District 3', '138.0'), true);
  assert.equal(on('North Miami - Mayor', '133.0'), true);
  // Miami Gardens Seat 4 is voted on in district 4 only
  assert.equal(on('Miami Gardens - Residential Area Council Member - Seat 4', '225.0'), true);
  assert.equal(on('Miami Gardens - Residential Area Council Member - Seat 4', '203.0'), false);
  // split precincts can differ in congressional district
  assert.equal(on('Representative in Congress, District 24', '116.0'), true);
  assert.equal(on('Representative in Congress, District 25', '116.1'), true);
  assert.equal(raceInPrecinct({ office: 'State Senator, District 34' }, '999.9', data), null);
});
