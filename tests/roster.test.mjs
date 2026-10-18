import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = f => JSON.parse(readFileSync(new URL('../public/data/' + f, import.meta.url)));
const R = load('roster.json');
const people = new Map(R.people.map(p => [p.id, p]));
const offices = new Map(R.offices.map(o => [o.id, o]));
const day = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : null;

// a term covers a date when it started on or before it and had not ended before it
function covers(t, date) {
  const s = day(t.start), e = day(t.end);
  if (s && date < s) return false;
  if (e && date > e) return false;
  if (!s && t.startKnown === false && t.servingFrom && date < t.servingFrom) return false;
  if (!e && t.endKnown === false && t.lastSeen && date > t.lastSeen) return false;
  if (!e && day(t.endBy) && date > t.endBy) return false;
  return true;
}
const termsOf = (pid, pred) => R.terms.filter(t => t.person === pid && (!pred || pred(offices.get(t.office))));

test('roster: ids are unique and every term points at a real person and office', () => {
  assert.equal(people.size, R.people.length, 'duplicate person id');
  assert.equal(offices.size, R.offices.length, 'duplicate office id');
  for (const t of R.terms) {
    assert.ok(people.has(t.person), 'term for unknown person ' + t.person);
    assert.ok(offices.has(t.office), 'term for unknown office ' + t.office);
    assert.ok(t.sources && t.sources.length, 'term without a source: ' + t.person + ' ' + t.office);
    if (day(t.start) && day(t.end)) assert.ok(t.start <= t.end, 'term ends before it starts: ' + t.person + ' ' + t.office);
  }
});

test('roster: one person per single-seat office at a time', () => {
  const byOffice = new Map();
  for (const t of R.terms) (byOffice.get(t.office) || byOffice.set(t.office, []).get(t.office)).push(t);
  for (const [oid, ts] of byOffice) {
    const o = offices.get(oid);
    if ((o.seats || 1) > 1) continue;
    const dated = ts.filter(t => day(t.start));
    for (const a of dated) for (const b of dated) {
      if (a === b || a.person === b.person) continue;
      const overlap = a.start < (day(b.end) || day(b.endBy) || '9999') && b.start < (day(a.end) || day(a.endBy) || '9999');
      assert.ok(!overlap, oid + ': ' + a.person + ' and ' + b.person + ' overlap');
    }
  }
});

test('roster: every candidate race on the Nov 3 ballot is mapped to an office and real people', () => {
  for (const r of R.ballot) {
    assert.ok(offices.has(r.officeId), 'ballot race without an office: ' + r.office);
    for (const c of r.candidates) assert.ok(people.has(c.person), r.office + ': unknown person ' + c.person);
  }
});

test('roster: judicial offices allow campaign finance only', () => {
  for (const o of R.offices) if (o.kind === 'judicial') assert.equal(o.actionScope, 'finance-only', o.id);
});

test('candidate actions: each one names a roster person who held the office on that date', () => {
  const D = load('donor-actions.json');
  for (const o of D.officeholders) assert.ok(people.has(o.person), 'officeholder without roster id: ' + o.candidate);
  for (const a of D.actions) {
    assert.ok(people.has(a.person), 'action without roster id: ' + a.candidate + ' ' + a.date);
    const ts = termsOf(a.person, o => o.body === a.bodyId);
    assert.ok(ts.length, a.candidate + ' never held a seat on ' + a.bodyId);
    assert.ok(ts.some(t => covers(t, a.date)), a.candidate + ' did not hold a seat on ' + a.bodyId + ' on ' + a.date);
    for (const t of ts) assert.notEqual(offices.get(t.office).kind, 'judicial', 'action linked to a judicial office');
  }
});

test('official actions: every vote is cast by the roster person seated on that date', () => {
  const D = load('decisions.json');
  for (const B of D.bodies) {
    assert.ok(B.rosterBody, B.key + ' has no roster body');
    for (const m of B.members) assert.ok(people.has(m.person), B.key + ' member without roster id: ' + m.key);
    for (const k of Object.keys(B.onBallot)) assert.ok(people.has(B.members.find(m => m.key === k)?.person), B.key + ' on-ballot ' + k + ' not in roster');
    const pid = k => B.members.find(m => m.key === k)?.person;
    for (const a of B.actions) {
      for (const [k, v] of Object.entries(a.roll)) {
        if (v == null) continue;   // not yet seated: shown as such
        const ts = termsOf(pid(k), o => o.body === B.rosterBody);
        assert.ok(ts.some(t => covers(t, a.date)), B.key + ' ' + a.id + ': ' + k + ' was not seated on ' + a.date);
      }
    }
  }
});
