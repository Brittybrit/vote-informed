import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { normEntity, sameEntity, anySame, aliasIndex, isCustomerOf, voteCounts, inWindow, yearsFor, evidence, endedBefore } from '../scripts/lib/business-rules.mjs';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const business = JSON.parse(read('../public/data/business.json'));
const dir = new URL('../scripts/data/business/', import.meta.url);
const lines = f => existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(l => l.trim()).flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } }) : [];
const slices = readdirSync(dir).filter(d => /^s\d/.test(d));
const interests = slices.flatMap(s => lines(new URL(s + '/interests.jsonl', dir)));
const ALIAS = aliasIndex(JSON.parse(read('../scripts/data/business/aliases.json')));

test('entity names match exactly after normalizing, never by prefix', () => {
  assert.equal(normEntity('The Goodyear Tire & Rubber Company'), 'goodyear tire and rubber');
  assert.equal(normEntity('Keith and Associates, Inc., d/b/a Keith'), 'keith and associates');
  assert.equal(normEntity('OptimaEd, Inc. (formerly OptimaEd, LLC)'), 'optimaed');
  assert.ok(sameEntity('Javier E Fernandez Esq. P.A.', 'Javier E. Fernandez, Esq. P.A.'));
  assert.ok(sameEntity('AlphaLoans.com, Inc.', 'AlphaLoans.com LLC'));
  assert.ok(sameEntity('Redondo Law PA', 'REDONDO LAW, P.A.'));
  assert.ok(!sameEntity('Miami-Dade County', 'Miami-Dade County Public Schools'));
  assert.ok(!sameEntity('Miami-Dade County Public Schools', 'Miami-Dade County'));
  assert.ok(!sameEntity('Keith and Associates', 'Keith and Associates Holdings'));
  assert.ok(!sameEntity('', ''));
  // names joined by ';' or ' / ' are each matched on their own
  assert.ok(anySame('Javier E Fernandez Esq. P.A. / SMGQ Law', 'SMGQ Law'));
  assert.ok(!anySame('Javier E Fernandez Esq. P.A. / SMGQ Law', 'SMGQ'));
});

test('curated aliases join names that differ by more than suffixes', () => {
  const ix = aliasIndex({ groups: [['Aventura Beach Associates, Miami', 'Aventura Beach Associates']] });
  assert.ok(sameEntity('Aventura Beach Associates', 'Aventura Beach Associates, Miami', ix));
  assert.ok(!sameEntity('Aventura Beach Associates', 'Aventura Beach Associates, Miami'));
  assert.ok(!sameEntity('Aventura Beach', 'Aventura Beach Associates', ix));
});

test('a tie to an official action counts only when it went the business\'s way (yes, requested or acted)', () => {
  assert.ok(voteCounts({ kind: 'vote', candidateVote: 'yes' }));
  assert.ok(voteCounts({ kind: 'vote', candidateVote: 'Yes' }));
  assert.ok(voteCounts({ kind: 'vote', candidateVote: 'requested' }));
  assert.ok(voteCounts({ kind: 'vote', candidateVote: 'acted' }));
  // a no vote went against the business: not a tie (Brit, Oct 27, 2026)
  assert.ok(!voteCounts({ kind: 'vote', candidateVote: 'no' }));
  assert.ok(!voteCounts({ kind: 'zoning', candidateVote: 'no' }));
  for (const v of ['absent', 'abstain', 'recused', 'excused', 'unknown', 'n/a', null]) assert.ok(!voteCounts({ kind: 'vote', candidateVote: v }), String(v));
  // another government's payment carries no vote of theirs and is not affected
  assert.ok(voteCounts({ kind: 'contract', candidateVote: 'n/a' }));
  assert.ok(voteCounts({ kind: 'payment' }));
  // a vote given on a contract or zoning item must be a yes
  assert.ok(!voteCounts({ kind: 'contract', candidateVote: 'absent' }));
  assert.ok(voteCounts({ kind: 'zoning', candidateVote: 'yes' }));
  // an abstention record is about the abstention
  assert.ok(voteCounts({ kind: 'abstention', candidateVote: 'abstain' }));
});

test('every published tie with a vote shows yes or no', () => {
  for (const [pid, p] of Object.entries(business.people)) for (const t of p.ties)
    if (t.kind === 'vote' || t.vote) assert.ok(['yes', 'no'].includes(t.vote) || t.kind === 'abstention', pid + ' ' + t.title);
});

test('a customer, client or source of income of the filer\'s company is held back', () => {
  const held = [
    { role: 'client', nature: 'Secondary source of income of a business she partly owns' },
    { role: 'client', nature: 'major source of income of Simpson Farms, Inc. (egg production), Form 6 secondary sources 2015-2022' },
    { role: 'client', nature: "secondary source of income (major customer) of Hyannis Investments LLC, which he owns; 'Retail sales'" },
    { role: 'client', nature: 'Secondary source of income of JJR P.A. (law practice)' },
    { role: 'client', nature: 'Source of compensation over $5,000 to filer or his business; manager, valet parking services (Schedule J)' },
    { role: null, nature: 'tenant of a building his LLC owns' },
  ];
  for (const i of held) assert.ok(isCustomerOf(i), i.nature);
  const own = [
    { role: 'owner', nature: '33.3%; major customer Sunshine Restaurants Merger Sub, LLC (restaurant)' },
    { role: 'owner', nature: 'paving contractor; major customers listed: Publix Supermarkets' },
    { role: 'owner', nature: 'Airbnb clients / marketing (listed under secondary sources of income to a business owned by the filer)' },
    { role: 'income source', nature: 'Spouse salary (Schedule C)' },
    { role: 'client', nature: 'Schedule J: source of compensation over $5,000 for consulting services (Miami, FL), period 01/01/2021-12/31/2022' },
    { role: 'employee', nature: 'Salary' },
  ];
  for (const i of own) assert.ok(!isCustomerOf(i), i.nature);
  assert.ok(!isCustomerOf(undefined));
});

test('a published tie to a customer of their company only when the action names that customer as the party', () => {
  for (const [pid, p] of Object.entries(business.people)) for (const t of p.ties) {
    if (t.kind === 'abstention' || !t.business) continue;
    const iv = interests.find(i => i.pid === pid && i.business && anySame(i.business, t.business, ALIAS));
    if (!isCustomerOf(iv)) continue;
    assert.ok(t.party && anySame(t.party, t.business, ALIAS), pid + ' ' + t.business + ': customer not named as the party');
    assert.equal((t.rel || {}).r, 'customerOf', pid + ' ' + t.business + ': must be labeled as a customer of their company');
  }
});

test('published ties name a published interest exactly', () => {
  for (const [pid, p] of Object.entries(business.people)) for (const t of p.ties) {
    if (t.kind === 'abstention') continue;
    assert.ok(p.interests.some(i => anySame(i.business, t.business, ALIAS)), pid + ' ' + t.business);
  }
});

test('disclosure window: a tie counts only while the person held an office that required a form', () => {
  const spans = { a: [['2020-11-17', '2024-11-19'], ['2026-01-01', '9999-12-31']] };
  assert.ok(inWindow(spans, 'a', '2020-11-17'));
  assert.ok(inWindow(spans, 'a', '2024-11-19'));
  assert.ok(!inWindow(spans, 'a', '2020-11-16'));
  assert.ok(!inWindow(spans, 'a', '2025-06-01'));
  assert.ok(inWindow(spans, 'a', '2026-10-01'));
  assert.ok(!inWindow(spans, 'b', '2026-10-01'));
});

test('disclosure window: a form for that year must show the business', () => {
  const fy = [{ pid: 'a', business: 'Acme, Inc.', years: new Set([2016, 2018]) }, { pid: 'a', business: 'Acme Holdings LLC', years: new Set([2025]) }];
  const ys = yearsFor(fy, 'a', 'ACME INC', new Map());
  assert.deepEqual([...ys].sort(), [2016, 2018]);
  const t = { pid: 'a', business: 'Acme Inc', kind: 'vote' };
  assert.equal(evidence(t, 2016, ys), 'listed');
  assert.equal(evidence(t, 2017, ys), 'bridged');
  assert.equal(evidence(t, 2020, ys), 'lastDisclosed');
  assert.equal(evidence(t, 2015, ys), null);
  assert.equal(evidence(t, 2016, new Set()), null);
  assert.equal(evidence({ ...t, basis: 'sunbiz' }, 2015, new Set()), 'sunbiz');
  assert.equal(evidence({ ...t, kind: 'abstention' }, 2015, new Set()), 'record');
});

test('Sunbiz end date: a tie dated after the business dissolved is not published', () => {
  const sb = [{ pid: 'a', business: 'Palmetto Zephyrhills-SR 54, LLC', dissolved: '2020-09-25' }];
  const t = { pid: 'a', business: 'Palmetto Zephyrhills-SR 54 LLC' };
  assert.ok(endedBefore(sb, t, '2022-02-17', new Map()));
  assert.ok(!endedBefore(sb, t, '2019-05-03', new Map()));
  assert.ok(!endedBefore(sb, { pid: 'b', business: t.business }, '2022-02-17', new Map()));
  // a sibling company with the same first words is a different business
  assert.ok(!endedBefore(sb, { pid: 'a', business: 'Palmetto Zephyrhills-SR 54 East, LLC' }, '2022-02-17', new Map()));
});
