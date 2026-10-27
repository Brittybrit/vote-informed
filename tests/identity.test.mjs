import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkIdentities, keyFits } from '../scripts/check-identities.mjs';

const load = f => JSON.parse(readFileSync(new URL('../public/data/' + f, import.meta.url)));

test('identity checks pass on the published data (node scripts/check-identities.mjs)', () => {
  assert.deepEqual(checkIdentities(load('roster.json'), load('offices-held.json'), load('decisions.json')), []);
});

test('roll keys fit names by surname, initial and compound surname', () => {
  assert.ok(keyFits('Rodriguez', 'Lizelh Rodriguez'));
  assert.ok(keyFits('Rodriguez', 'Lourdes Rodriguez'));
  assert.ok(keyFits('G. Perez', 'Gelien Perez'));
  assert.ok(!keyFits('G. Perez', 'Monica Perez'));
  assert.ok(keyFits('Higgins', 'Danielle Cohen Higgins'));
  assert.ok(keyFits('Cohen Higgins', 'Danielle Cohen Higgins'));
  assert.ok(!keyFits('Cohen Higgins', 'Eileen Higgins'));
  assert.ok(keyFits('ValdesFauli', 'Raul J. Valdes-Fauli'));
  assert.ok(keyFits('Estimé-Irvin', 'Mary Estime-Irvin'));
  assert.ok(keyFits('del Prado', 'Shannon del Prado'));
  assert.ok(!keyFits('Prado', 'Shannon Pradomez'));
});

// A small world: one city, two seats, and the people the checks are about
const world = () => ({
  R: {
    people: [{ id: 'lizelh-rodriguez', name: 'Lizelh Rodriguez' }, { id: 'lourdes-rodriguez', name: 'Lourdes Rodriguez' }, { id: 'edgar-ayala', name: 'Edgar Ayala' }],
    offices: [{ id: 'town-member', name: 'Town, Member', body: 'town', seats: 4 }],
    terms: [
      { person: 'edgar-ayala', office: 'town-member', start: '2012-11-19', end: null, sources: ['x'] },
      { person: 'lizelh-rodriguez', office: 'town-member', start: '2020-11-03', end: null, sources: ['x'] },
      { person: 'lourdes-rodriguez', office: 'town-member', start: '2024-11-05', end: null, sources: ['x'] },
    ],
  },
  H: { people: {} },
  D: { bodies: [{ key: 'town', rosterBody: 'town', members: [{ key: 'Ayala', person: 'edgar-ayala', name: 'Edgar Ayala' }, { key: 'Rodriguez', person: 'lizelh-rodriguez', name: 'Lizelh Rodriguez' }], actions: [] }] },
});

test('a surname roll key fails when two people with that surname sit at once', () => {
  const w = world();
  w.D.bodies[0].actions.push({ id: 'a1', date: '2025-07-07', roll: { Ayala: 'yes', Rodriguez: 'yes' } });
  const p = checkIdentities(w.R, w.H, w.D);
  assert.equal(p.length, 1);
  assert.match(p[0], /fits both lizelh-rodriguez and lourdes-rodriguez/);
  // before the second Rodriguez was seated the key is unambiguous
  w.D.bodies[0].actions[0].date = '2023-07-07';
  assert.deepEqual(checkIdentities(w.R, w.H, w.D), []);
  // a vote the record does not attribute is not a vote on either person
  w.D.bodies[0].actions[0] = { id: 'a1', date: '2025-07-07', roll: { Ayala: 'yes', Rodriguez: 'unknown' } };
  assert.deepEqual(checkIdentities(w.R, w.H, w.D), []);
});

test('a disambiguating key on the other member clears the shared surname', () => {
  const w = world();
  w.D.bodies[0].members = [{ key: 'L. Rodriguez', person: 'lizelh-rodriguez' }];
  w.D.bodies[0].actions.push({ id: 'a1', date: '2025-07-07', roll: { 'L. Rodriguez': 'yes' } });
  // an initial both share does not separate Lizelh from Lourdes
  assert.equal(checkIdentities(w.R, w.H, w.D).length, 1);
  w.R.people.push({ id: 'danielle-cohen-higgins', name: 'Danielle Cohen Higgins' }, { id: 'eileen-higgins', name: 'Eileen Higgins' });
  w.R.terms.push({ person: 'danielle-cohen-higgins', office: 'town-member', start: '2020-12-07', end: null, sources: ['x'] }, { person: 'eileen-higgins', office: 'town-member', start: '2018-07-01', end: null, sources: ['x'] });
  w.D.bodies[0].members.push({ key: 'Higgins', person: 'eileen-higgins' }, { key: 'Cohen Higgins', person: 'danielle-cohen-higgins' });
  w.D.bodies[0].actions = [{ id: 'a2', date: '2023-01-10', roll: { Higgins: 'yes', 'Cohen Higgins': 'no' } }];
  assert.deepEqual(checkIdentities(w.R, w.H, w.D), []);
});

test('a vote outside the member\'s own term fails', () => {
  const w = world();
  w.D.bodies[0].actions.push({ id: 'a1', date: '2019-05-01', roll: { Ayala: 'yes', Rodriguez: 'no' } });
  const p = checkIdentities(w.R, w.H, w.D);
  assert.equal(p.length, 1);
  assert.match(p[0], /Rodriguez \(lizelh-rodriguez\) holds a vote on 2019-05-01, outside their terms/);
});

test('one person with two roster records fails', () => {
  const w = world();
  w.R.people.push({ id: 'edgar-ayala-2', name: 'Edgar Ayala Jr.' });
  assert.match(checkIdentities(w.R, w.H, w.D).join('\n'), /edgar-ayala and edgar-ayala-2 share the name/);
  const v = world();
  v.R.people[0].ids = { openstates: ['ocd-person/1'] };
  v.R.people.push({ id: 'l-rodriguez', name: 'L. Rodriguez', ids: { openstates: ['ocd-person/1'] } });
  assert.match(checkIdentities(v.R, v.H, v.D).join('\n'), /share the id "openstates:ocd-person\/1"/);
  v.R.distinctPeople = [['lizelh-rodriguez', 'l-rodriguez']];
  assert.deepEqual(checkIdentities(v.R, v.H, v.D), []);
});

test('offices-held must agree with the roster on who held an office when', () => {
  const w = world();
  w.H.people['lizelh-rodriguez'] = { name: 'Lizelh Rodriguez', terms: [{ office: 'Town, Member', start: '2020-11-03', end: null }] };
  assert.deepEqual(checkIdentities(w.R, w.H, w.D), []);
  w.H.people['lizelh-rodriguez'].terms[0].start = '2022-11-08';
  assert.match(checkIdentities(w.R, w.H, w.D).join('\n'), /lizelh-rodriguez Town, Member 2022-11-08\.\.null; roster has 2020-11-03\.\.null/);
  w.H.people['lizelh-rodriguez'].terms = [];
  assert.match(checkIdentities(w.R, w.H, w.D).join('\n'), /lizelh-rodriguez is missing roster term Town, Member 2020-11-03/);
  w.H.people['lizelh-rodriguez'].terms = [{ office: 'Town, Member', start: '2020-11-03', end: null }, { office: 'Town, Mayor', start: '2010-01-01', end: '2012-01-01' }];
  assert.match(checkIdentities(w.R, w.H, w.D).join('\n'), /"Town, Mayor" is not a roster office/);
});
