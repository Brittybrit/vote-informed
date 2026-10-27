import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { principalMatches, notInForce, registryLinkProblem, principalAliases } from '../scripts/lib/lobby-links.mjs';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const decisions = JSON.parse(read('../public/data/decisions.json'));
const IX = principalAliases(JSON.parse(read('../scripts/data/city/principal-aliases.json')));

test('a registration counts only for a principal named as a party on the item', () => {
  assert.ok(principalMatches('Creh Galiano LLC', ['CREH Galiano LLC (property owner)']));
  assert.ok(principalMatches('ProTransportation Inc. dba Prokel Mobility', ['Pro Transportation, Inc. (ProKel Mobility)']));
  assert.ok(principalMatches('Grupo Eulen', ['United States Service Industries (USSI), dba Grupo Eulen']));
  assert.ok(principalMatches('Cellco Partnership, L.P. d/b/a Verizon Wireless', ['Cellco Partnership (Verizon Wireless)']));
  assert.ok(principalMatches('University of Miami c/o Jessica Brumley', ['University of Miami']));
  assert.ok(principalMatches('Archdiocese of Miami', ['St. Theresa Catholic School (Archdiocese of Miami)']));
  assert.ok(principalMatches('University Miami', ['University of Miami'], IX));
  assert.ok(!principalMatches('University Miami', ['University of Miami']));
  // a different or larger entity is not the party
  assert.ok(!principalMatches('Miami-Dade County Public Schools', ['Miami-Dade County']));
  assert.ok(!principalMatches('Taco Bell of America, LLC', ['Taco Bell (applicant)']));
  assert.ok(!principalMatches('AECOM', ['AECOM Technical Services, Inc.']));
  assert.ok(!principalMatches('1700 Service Holdings, LLC', ['Applicant for 1700 Service Road (not named in minutes)']));
  assert.ok(!principalMatches('Gulfstream Park Racing Association, Inc.', []));
});

test('a registration counts only when in force on the action date', () => {
  assert.equal(notInForce({ date: '2025-01-15' }, '2025-01-15'), null);
  assert.match(notInForce({ date: '2026-01-15' }, '2025-01-15'), /registered 2026-01-15, after the action/);
  assert.equal(notInForce({ date: '2025-03' }, '2025-03-04'), null);
  assert.match(notInForce({ date: '2025-04' }, '2025-03-04'), /after the action/);
  assert.match(notInForce({ date: '2023-07-03', note: 'Registered 7/3/23 for PROTRANSPORTATION, INC.; issue: Trolley Operation WITHDRAWN 1/16/2025' }, '2025-05-20'), /withdrawn 2025-01-16/);
  assert.equal(notInForce({ date: '2023-07-03', note: 'WITHDRAWN 1/16/2025' }, '2024-05-20'), null);
  assert.equal(notInForce({ date: null, regYear: '2024-2025' }, '2025-03-11'), null);
  assert.match(notInForce({ date: null, regYear: '2024-2025' }, '2026-03-24'), /registration year 2024-2025/);
  assert.equal(notInForce({ date: null, note: '2025 registered lobbyists list (no dates shown).' }, '2025-02-19'), null);
  assert.match(notInForce({ date: null, src: 'scripts/data/city/coralgables/lobbyists-2017.csv' }, '2016-11-15'), /listed only for 2017/);
  assert.match(notInForce({ date: null }, '2025-02-19'), /no registration date/);
});

test('registryLinkProblem leaves links named in the record alone', () => {
  assert.equal(registryLinkProblem({ basis: 'record', for: 'Anyone', date: '2030-01-01' }, { date: '2025-01-01', parties: [] }), null);
  assert.match(registryLinkProblem({ basis: 'registry', for: 'Acme LLC', date: '2024-01-01' }, { date: '2025-01-01', parties: ['Other Co'] }), /not a party/);
  assert.equal(registryLinkProblem({ basis: 'registry', for: 'Acme LLC', date: '2024-01-01' }, { date: '2025-01-01', parties: ['ACME, L.L.C.'] }), null);
});

test('every registry lobbyist on a city card rests on a registration that passes', () => {
  for (const B of decisions.bodies) {
    const f = new URL(`../scripts/data/city/${B.key}/lobbyists.json`, import.meta.url);
    if (!existsSync(f)) continue;
    const L = JSON.parse(readFileSync(f, 'utf8')).byAction || {};
    const pfx = B.key === 'coralgables' ? 'cg-' : B.key + '-';
    const links = new Map();
    for (const [id, list] of Object.entries(L)) for (const l of list || []) if (l && l.basis === 'registry') {
      for (const k of [id, pfx + id]) (links.get(k) || links.set(k, []).get(k)).push(l);
    }
    const nk = s => String(s).toLowerCase().replace(/[^a-z]/g, '');
    for (const a of B.actions) for (const x of a.lobbied || []) {
      if (x.basis !== 'registry') continue;
      const mine = (links.get(a.id) || []).filter(l => nk(l.name) === nk(x.name));
      if (!mine.length) continue;   // linked under an older card id; city-enrich resolves those
      assert.ok(mine.some(l => !registryLinkProblem(l, a, IX)), `${B.key} ${a.id}: ${x.name} has no registration that names the party and was in force`);
    }
  }
});
