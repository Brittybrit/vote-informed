import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { principalMatches, notInForce, registryLinkProblem, principalAliases, handLinkProblem, sameLobbyist, namesDifferOnlyByMiddle, occupationConfirmsLobbyist, ANNUAL } from '../scripts/lib/lobby-links.mjs';

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
      assert.ok(mine.some(l => !registryLinkProblem(l, a, IX, B.key)), `${B.key} ${a.id}: ${x.name} has no registration that names the party and was in force`);
    }
  }
});

test('annual cities: a registration counts only in its registration year', () => {
  const cg = 'coralgables';
  // Coral Gables: the dashboard year is the registration year
  assert.equal(notInForce({ date: '2025-01-27', src: 'scripts/data/city/coralgables/lobbyists-2025.csv' }, '2025-06-01', cg), null);
  assert.match(notInForce({ date: '2025-01-27', src: 'scripts/data/city/coralgables/lobbyists-2025.csv' }, '2026-02-01', cg), /annual registration for 2025/);
  assert.equal(notInForce({ date: '2024-12-10', src: 'scripts/data/city/coralgables/lobbyists-2025.csv' }, '2025-01-05', cg), null);
  assert.match(notInForce({ date: '2024-12-10', src: 'scripts/data/city/coralgables/lobbyists-2025.csv' }, '2024-12-20', cg), /annual registration for 2025/);
  // a dated registration with no list year: its calendar year only
  assert.equal(notInForce({ date: '2025-03-01' }, '2025-11-30', cg), null);
  assert.match(notInForce({ date: '2025-03-01' }, '2026-01-02', cg), /annual registration for 2025/);
  // carry-over lists (Aventura, Doral, North Miami Beach): the year of the date and the year of a list it is on
  const av = 'https://www.cityofaventura.com/DocumentCenter/View/4161/Registered-Lobbyists-and-Principals';
  assert.equal(notInForce({ date: '2024-06', src: av }, '2024-09-03', 'aventura'), null);
  assert.equal(notInForce({ date: '2024-06', src: av }, '2026-04-07', 'aventura'), null);
  assert.match(notInForce({ date: '2024-06', src: av }, '2025-03-04', 'aventura'), /annual registration for 2024, 2026/);
  const dor = 'https://www.cityofdoral.com/files/assets/city/v/1/city-hall/city-clerk/lobbyist-docs/authorized-lobbyist-list.pdf';
  assert.equal(notInForce({ date: '2024-11-14', src: dor }, '2025-10-08', 'doral'), null);
  assert.match(notInForce({ date: '2024-11-14', src: dor }, '2026-06-10', 'doral'), /2024, 2025/);
  assert.equal(notInForce({ date: '2021-03-02', src: 'nmb2026' }, '2026-05-01', 'nmb'), null);
  assert.match(notInForce({ date: '2021-03-02', src: 'nmb2026' }, '2024-05-01', 'nmb'), /2021, 2026/);
  assert.match(notInForce({ date: '2024-01-19', src: 'https://www.citynmb.com/DocumentCenter/View/12769/2024-Registered-Lobbyist-List-PDF' }, '2025-05-20', 'nmb'), /annual registration for 2024/);
  // Cutler Bay: an undated list counts for its year
  assert.equal(notInForce({ date: null, src: 'https://www.cutlerbay-fl.gov/node/11002', note: '2025 registered lobbyists list (no dates shown).' }, '2025-02-19', 'cutlerbay'), null);
  assert.match(notInForce({ date: null, src: 'https://www.cutlerbay-fl.gov/node/11002' }, '2026-02-19', 'cutlerbay'), /annual registration for 2025/);
  // North Miami: the affidavit's fiscal year, October 1 to September 30
  assert.equal(notInForce({ date: null, regYear: '2024-2025' }, '2025-03-11', 'northmiami'), null);
  assert.equal(notInForce({ date: null, regYear: '2024-2025' }, '2024-10-01', 'northmiami'), null);
  assert.match(notInForce({ date: null, regYear: '2025-2026' }, '2025-07-08', 'northmiami'), /fiscal year 2025-2026/);
  assert.match(notInForce({ date: null, regYear: '2024-2025' }, '2025-10-01', 'northmiami'), /fiscal year 2024-2025/);
  // still never before it was filed, and never after a withdrawal
  assert.match(notInForce({ date: '2025-09', src: av }, '2025-03-04', 'aventura'), /after the action/);
  assert.match(notInForce({ date: '2023-07-03', src: 'nmb2025', note: 'WITHDRAWN 1/16/2025' }, '2025-05-20', 'nmb'), /withdrawn/);
  for (const k of ['doral', 'coralgables', 'nmb', 'aventura', 'cutlerbay', 'northmiami']) assert.ok(ANNUAL[k], k);
});

test('a registration whose project field names the party counts, without a global alias', () => {
  const a = { date: '2026-07-07', parties: ['Ponce Park Residences, LLC'] };
  assert.equal(registryLinkProblem({ basis: 'registry', for: 'RC Acquisitions, LLC', date: '2026-01-06', src: 'scripts/data/city/coralgables/lobbyists-2026.csv', issue: 'Project Land Use & Zoning approvals. (project: Ponce Park Residences)' }, a, IX, 'coralgables'), null);
  assert.match(registryLinkProblem({ basis: 'registry', for: 'RC Acquisitions, LLC', date: '2026-01-06', src: 'scripts/data/city/coralgables/lobbyists-2026.csv', issue: 'RC Acquisitions, LLC. development' }, a, IX, 'coralgables'), /not a party/);
  assert.ok(!principalMatches('RC Acquisitions, LLC', ['Ponce Park Residences, LLC'], IX));
});

test('hand-built card lines pass the same party and in-force checks', () => {
  const a = { date: '2026-07-07', parties: ['University of Miami'], namedLobbyist: '' };
  assert.equal(handLinkProblem({ name: 'Ben Hutchens', for: 'University of Miami', regs: ['2026-01-10'] }, a, IX, 'coralgables'), null);
  assert.match(handLinkProblem({ name: 'Frank L. Presta', for: 'University of Miami', regs: ['2026-07-09'] }, a, IX, 'coralgables'), /after the action/);
  assert.match(handLinkProblem({ name: 'Ricardo Herran', for: 'University of Miami', regs: ['2025-12-12'] }, a, IX, 'coralgables'), /annual registration for 2025/);
  assert.match(handLinkProblem({ name: 'Brian May', for: 'Publix Super Markets, Inc.', regs: ['2026-01-10'] }, a, IX, 'coralgables'), /not a party/);
  assert.match(handLinkProblem({ name: 'Someone', for: 'University of Miami' }, a, IX, 'coralgables'), /no registration date/);
  // a line the item's own record names is the record
  assert.equal(handLinkProblem({ name: 'W. Allen Morris', for: 'RC Acquisitions, LLC', regs: ['2026-01-06'] }, { ...a, parties: ['Ponce Park Residences, LLC'], namedLobbyist: 'Walter Allen Spencer Morris and Derek Cardenas' }, IX, 'coralgables'), null);
  // lines with a basis are checked as registry or record links, not here
  assert.equal(handLinkProblem({ name: 'X Y', for: 'Other', basis: 'registry' }, a, IX, 'coralgables'), null);
});

test('every lobbyist on every city card passes the party and in-force checks', () => {
  for (const B of decisions.bodies) {
    if (!existsSync(new URL(`../scripts/data/city/${B.key}/`, import.meta.url))) continue;
    for (const a of B.actions || []) for (const x of a.lobbied || []) {
      assert.ok(['record', 'registry', undefined].includes(x.basis), `${B.key} ${a.id}: ${x.name} basis ${x.basis}`);
      if (!x.basis) assert.equal(handLinkProblem(x, a, IX, B.key), null, `${B.key} ${a.id}: hand line ${x.name}`);
      if (x.basis === 'registry' && x.regs && x.regs.length) {
        const ok = x.regs.some(date => !registryLinkProblem({ basis: 'registry', name: x.name, for: x.for, date, src: x.src, issue: x.issue }, a, IX, B.key));
        assert.ok(ok, `${B.key} ${a.id}: ${x.name} (${x.for}, ${x.regs.join(', ')}) has no registration in force that names the party`);
      }
    }
  }
});

test('one line per lobbyist on a card', () => {
  assert.ok(namesDifferOnlyByMiddle('Michael Marrero', 'Michael J. Marrero'));
  assert.ok(namesDifferOnlyByMiddle('W. Allen Morris', 'Walter Allen Spencer Morris'));
  assert.ok(namesDifferOnlyByMiddle('Tucker Gibbs', 'W. Tucker Gibbs'));
  assert.ok(!namesDifferOnlyByMiddle('Maria Lopez', 'Mario Lopez'));
  assert.ok(!namesDifferOnlyByMiddle('Alan Krischer', 'Alan S. Rosenthal'));
  assert.ok(sameLobbyist({ name: 'Michael Marrero', firm: 'Bercow Radell Fernandez Larkin & Tapanes', reg: '2023-02' }, { name: 'Michael J. Marrero', firm: 'Bercow Radell Fernandez Larkin & Tapanes PLLC', basis: 'registry', regs: ['2024-06'] }));
  assert.ok(sameLobbyist({ name: 'Jose Fuentes', regs: ['2025-01-03'] }, { name: 'Jose K. Fuentes', regs: ['2025-01-03'] }));
  assert.ok(!sameLobbyist({ name: 'Jose Fuentes', firm: 'Becker', regs: ['2025-01-03'] }, { name: 'Jose K. Fuentes', firm: 'Gunster', regs: ['2024-01-03'] }));
  for (const B of decisions.bodies) {
    if (!existsSync(new URL(`../scripts/data/city/${B.key}/`, import.meta.url))) continue;
    for (const a of B.actions || []) { const L = a.lobbied || []; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++)
      assert.ok(!sameLobbyist(L[i], L[j]), `${B.key} ${a.id}: ${L[i].name} and ${L[j].name} are one person`); }
  }
});

test('a name-only donor match counts neither as the lobbyist nor as the firm', () => {
  assert.ok(occupationConfirmsLobbyist({ occ: 'ATTORNEY' }));
  assert.ok(occupationConfirmsLobbyist({ occ: 'Government Consultant' }));
  assert.ok(!occupationConfirmsLobbyist({ occ: '' }));
  assert.ok(!occupationConfirmsLobbyist({ occ: 'RETIRED' }));
  assert.ok(!occupationConfirmsLobbyist({ hand: true }));
  for (const B of decisions.bodies) {
    if (!existsSync(new URL(`../scripts/data/city/${B.key}/`, import.meta.url))) continue;
    for (const a of B.actions || []) for (const g of a.gifts || []) {
      const person = (g.kind === 'lobbyist' && g.basis !== 'addr') || (g.kind === 'firm' && g.rel === 'firmlob');
      if (!person) continue;
      assert.ok(g.basis !== 'name' && !/name match only/.test((g.why && g.why.en) || ''), `${B.key} ${a.id}: ${g.donor} $${g.amount} is a name-only ${g.kind} gift`);
      assert.ok(occupationConfirmsLobbyist(g), `${B.key} ${a.id}: ${g.donor} $${g.amount} (${g.kind}${g.rel ? '/' + g.rel : ''}) has no occupation confirming a lobbyist`);
    }
  }
});
