import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadWorker, fakeKV } from './load-worker.mjs';
import { build as buildMillage } from '../scripts/millage.mjs';

const store = new Map();
const ctx = { window: {}, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) } };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../public/millage-2026.js', import.meta.url), 'utf8'), ctx);
vm.runInContext(readFileSync(new URL('../public/measure-impact.js', import.meta.url), 'utf8'), ctx);
const MI = ctx.window.measureImpact;

const A3 = 'No. 3 Constitutional Amendment: Increased Homestead Exemption; Lower Cap on Increases in Non-Homestead Property Assessments';
const LEVY = 'School Board Referendum: Renewal of Existing Ad Valorem Levy for Teachers, Instructional Personnel, Student Safety and Security';

test('answers stay on the device and only known fields are kept', () => {
  MI.save({ groups: { homestead: true, renter: true, bogus: true }, homeValue: '$320,000', nsTax: 'abc', address: '1 Main St' });
  const saved = JSON.parse(store.get('ballot305.me'));
  assert.deepEqual(Object.keys(saved).sort(), ['groups', 'homeValue', 'nsTax', 'otherValue', 'pa', 'place']);
  assert.deepEqual(saved.groups, { homestead: true });   // owner and renter can't both be true; unknown keys dropped
  assert.equal(saved.homeValue, 320000);
  assert.equal(saved.nsTax, 0);
  MI.clear();
  assert.equal(MI.load(), null);
});

test('current non-school homestead exemption follows the 2026 amounts', () => {
  const f = MI._test.currentNonSchoolExempt;
  assert.equal(f(20000), 20000);
  assert.equal(f(40000), 25000);
  assert.equal(f(60000), 35000);
  assert.equal(f(76411), 51411);
  assert.equal(f(900000), 51411);
});

test('Amendment 3: savings come with what the County loses and what it pays for', () => {
  const me = MI.normalize({ groups: { homestead: true, transit: true }, homeValue: 320000, nsTax: 3900 });
  const c = MI.calc(A3, me, 'en');
  // 98,589 and 198,589 more exempt, at 3,900 / 268,589 of taxable value
  assert.deepEqual({ ...c.savings }, { y2027: 1432, y2028: 2884 });
  assert.ok(c.reconcile.loss.includes('$385.8 million') && c.reconcile.loss.includes('$696.7 million'));
  assert.ok(c.reconcile.share.includes('$2,884'));
  assert.ok(c.reconcile.funds.find(f => /bus routes/.test(f.label)).mine);
  assert.ok(!c.reconcile.funds.find(f => f.label === 'Parks').mine);
  assert.ok(c.sources.every(s => s.url.startsWith('https://')));
});

test('Amendment 3: savings never exceed the tax paid, and small homes go to zero', () => {
  const c = MI.calc(A3, MI.normalize({ groups: { homestead: true }, homeValue: 120000, nsTax: 1000 }), 'en');
  assert.equal(c.savings.y2027, 1000);
  assert.equal(c.savings.y2028, 1000);
});

test('Amendment 3: a renter sees the services side but no savings', () => {
  const c = MI.calc(A3, MI.normalize({ groups: { renter: true, library: true } }), 'es');
  assert.equal(c.savings, undefined);
  assert.equal(c.reconcile.share, '');
  assert.ok(c.reconcile.funds.find(f => f.label === 'Bibliotecas').mine);
});

test('school levy: what you pay against what the district would lose', () => {
  const c = MI.calc(LEVY, MI.normalize({ groups: { homestead: true, owner_other: true, school_parent: true }, homeValue: 325000, otherValue: 200000 }), 'en');
  assert.equal(c.payHome, 300);   // (325,000 - 25,000) / 1,000
  assert.equal(c.payOther, 200);
  assert.ok(c.reconcile.loss.includes('$585 million'));
  assert.ok(c.reconcile.mine);
});

test('other measures get no calculation', () => {
  assert.equal(MI.calc('County Referendum 6: Charter Amendment Expanding Allowable Advertising at Parks', MI.normalize({ groups: { park_user: true } }), 'en'), null);
});

test('every wording exists in all three languages', () => {
  const keys = o => Object.keys(o).sort();
  for (const lang of ['es', 'ht']) {
    assert.deepEqual(keys(MI.words(lang)), keys(MI.words('en')), lang);
    for (const k of ['g', 'o', 'addr', 'a3', 'lv']) assert.deepEqual(keys(MI.words(lang)[k]), keys(MI.words('en')[k]), lang + ' ' + k);
    assert.deepEqual(keys(MI.words(lang).a3.f), keys(MI.words('en').a3.f), lang);
  }
  for (const g of MI.GROUPS) assert.ok(MI.words('en').g[g], g);
});

/* ---------------- the endpoint ---------------- */
const w = await loadWorker(['handleMeasureImpact', 'runImpact', 'cleanImpact', 'impactPrompt', 'IMPACT_GROUPS', 'handleProperty', 'paValues']);

test('the endpoint never receives or keys on personal details', () => {
  const p = w.impactPrompt({ name: 'X', summary: 'S', jurisdiction: 'Miami-Dade County', election: '2026' });
  for (const k of Object.keys(w.IMPACT_GROUPS)) assert.ok(p.includes('"' + k + '"'), k);
  assert.match(p, /never recommend a vote/);
  assert.match(p, /MONEY BOTH WAYS/);
});

test('cleanImpact keeps only known groups, valid source indexes and plain text', () => {
  const r = w.cleanImpact({
    yesNote: 'Raises the exemption.', noNote: 'Nothing changes.',
    groups: [{ group: 'homestead', yesNote: 'Lower bill.', sources: [0, 7] }, { group: 'aliens', yesNote: 'x' }, { group: 'homestead', yesNote: 'dupe' }, { group: 'renter' }],
    money: [{ whatNote: 'County Fire Rescue', amount: '$743.7 million a year', yesNote: 'Less money.', groups: ['homestead', 'nope'], sources: [0] }, { whatNote: 'empty' }],
    sources: [{ name: 'County', url: 'https://example.gov/a' }],
    extra: 'dropped'
  });
  assert.deepEqual(r.groups.map(g => g.group), ['homestead']);
  assert.deepEqual(r.groups[0].sources, [0]);
  assert.equal(r.money.length, 1);
  assert.deepEqual(r.money[0].groups, ['homestead']);
  assert.equal(r.extra, undefined);
});

test('fresh request runs in the background, then serves the shared cache', async () => {
  const CACHE = fakeKV();
  const env = { CACHE, ANTHROPIC_API_KEY: 'k' };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    stop_reason: 'end_turn',
    content: [{ type: 'web_search_tool_result', content: [{ type: 'web_search_result', url: 'https://example.gov/a', title: 'A' }] },
      { type: 'text', text: JSON.stringify({ yesNote: 'Y', noNote: 'N', groups: [], money: [], sources: [{ name: 'A', url: 'https://example.gov/a' }, { name: 'B', url: 'https://made.up/b' }] }) }]
  }), { status: 200 });
  const waits = [];
  const ctx = { waitUntil: p => waits.push(p) };
  const req = () => new Request('https://x/api/measure-impact', { method: 'POST', body: JSON.stringify({ name: 'County Referendum 6: Parks', jurisdiction: 'Miami-Dade County', election: 'November 3, 2026' }), headers: { 'CF-Connecting-IP': '1.2.3.4' } });
  try {
    const first = await (await w.handleMeasureImpact(req(), env, ctx)).json();
    assert.equal(first.pending, true);
    await Promise.all(waits);
    const second = await (await w.handleMeasureImpact(req(), env, ctx)).json();
    assert.equal(second.cached, true);
    assert.equal(second.result.yesNote, 'Y');
    assert.equal(second.result.sources[0].url, 'https://example.gov/a');
    assert.equal(second.result.sources[1].url, '');   // a link the search never returned is dropped
    assert.ok([...CACHE.store.keys()].some(k => k.startsWith('impm1:')));
  } finally { globalThis.fetch = realFetch; }
});

/* ---------------- property lookup by address ---------------- */
const FOLIO_DATA = {
  PropertyInfo: { FolioNumber: '03-4129-026-1461', Municipality: 'Coral Gables', DORDescription: 'RESIDENTIAL - SINGLE FAMILY : 1 UNIT' },
  SiteAddress: [{ Address: '905 HARDEE RD, Coral Gables, FL 33146' }],
  Assessment: { AssessmentInfos: [{ Year: 2025, AssessedValue: 670000 }, { Year: 2026, AssessedValue: 693845 }] },
  Taxable: { TaxableInfos: [{ Year: 2026, CountyTaxableValue: 642434, SchoolTaxableValue: 668845, CityTaxableValue: 642434 }] },
  Benefit: { BenefitInfos: [{ TaxYear: 2026, Description: 'Save Our Homes Cap', Value: 1 }, { TaxYear: 2026, Description: 'Homestead', Value: 25000 }, { TaxYear: 2026, Description: 'Second Homestead', Value: 26411 }] }
};

test('paValues reads the latest year and the homestead exemption', () => {
  const v = w.paValues(FOLIO_DATA);
  assert.equal(v.year, 2026);
  assert.equal(v.assessed, 693845);
  assert.equal(v.homestead, true);
  assert.equal(v.schoolTaxable, 668845);
  assert.equal(MI._test.currentNonSchoolExempt(v.assessed), v.assessed - v.countyTaxable);   // our formula matches the appraiser's
});

test('address lookup returns values, never stores the address', async () => {
  const CACHE = fakeKV();
  const env = { CACHE };
  const realFetch = globalThis.fetch;
  const asked = [];
  globalThis.fetch = async u => {
    asked.push(String(u));
    const body = /GetAddress/.test(u)
      ? { MinimumPropertyInfos: /condo/i.test(u) ? [{ Strap: '01-0000-000-0010', SiteAddress: '1 CONDO WAY', SiteUnit: '1', Owner1: 'SOMEONE' }, { Strap: '01-0000-000-0020', SiteAddress: '1 CONDO WAY', SiteUnit: '2', Owner1: 'OTHER' }] : [{ Strap: '03-4129-026-1461', SiteAddress: '905 HARDEE RD' }] }
      : FOLIO_DATA;
    return new Response(JSON.stringify(body), { status: 200 });
  };
  const call = b => w.handleProperty(new Request('https://x/api/property', { method: 'POST', body: JSON.stringify(b), headers: { 'CF-Connecting-IP': '5.6.7.8' } }), env).then(r => r.json());
  try {
    const one = await call({ address: '905 Hardee Rd, Coral Gables, FL 33146' });
    assert.equal(one.property.assessed, 693845);
    assert.match(asked[0], /myAddress=905\+Hardee\+Rd(&|$)/);   // street line only
    const many = await call({ address: '1 Condo Way' });
    assert.equal(many.choices.length, 2);
    assert.ok(!JSON.stringify(many).includes('SOMEONE'));   // owner names not passed on
    const picked = await call({ folio: many.choices[0].folio });
    assert.equal(picked.found, 1);
    for (const [k, v] of CACHE.store) assert.ok(!/hardee|condo/i.test(k + v), 'address written to KV: ' + k);
    assert.equal((await call({ address: '12' })).error !== undefined, true);
  } finally { globalThis.fetch = realFetch; }
});

/* ---------------- 2026 adopted tax rates by city ---------------- */
test('millage-2026.js matches the chart rows (run node scripts/millage.mjs)', () => {
  const built = buildMillage(readFileSync(new URL('../scripts/data/millage/2026-adopted-rows.txt', import.meta.url), 'utf8'));
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.window.MILLAGE_2026)), JSON.parse(JSON.stringify(built)));
  assert.equal(Object.keys(built.places).length, 35);
});

test('Property Appraiser city names map to the chart', () => {
  for (const [name, key] of [['Miami', 'Miami'], ['City of Miami Beach', 'Miami Beach'], ['Unincorporated County', 'Unincorporated'], ['Opa-locka', 'Opa-Locka'], ['Bay Harbor Islands', 'Bay Harbor Islands'], ['Sunny Isles Beach', 'Sunny Isles Beach'], ['Atlantis', '']])
    assert.equal(MI.placeKey(name), key, name);
});

test('with a city, taxes come from adopted rates and the savings split adds up', () => {
  const me = MI.normalize({ groups: { homestead: true, library: true }, homeValue: 320000, place: 'Miami' });
  const T = MI._test.homeTaxes(me);
  assert.equal(Math.round(T.nsMills * 1e4) / 1e4, 13.3314);   // 19.9544 total less 6.6230 school
  assert.equal(Math.round(T.nsTax), 3581);
  const c = MI.calc(A3, me, 'en');
  const sum = c.reconcile.split.reduce((a, x) => a + x.amount, 0);
  assert.ok(Math.abs(sum - c.savings.y2028) <= c.reconcile.split.length, sum + ' vs ' + c.savings.y2028);
  // the City of Miami runs its own fire department: County Fire Rescue isn't on the bill or in the split
  const fire = c.reconcile.funds.find(f => f.label === 'Fire Rescue');
  assert.ok(fire.note && !fire.mine);
  assert.ok(!c.reconcile.split.some(x => /Fire/.test(x.label)));
  assert.ok(c.reconcile.split.some(x => x.label === 'Miami-Dade Public Library System'));
  assert.ok(c.reconcile.funds.find(f => f.label === 'Libraries').mine);
});

test('lookup values are used only for the value they came with', () => {
  const pa = { assessed: 693845, countyTaxable: 600000, schoolTaxable: 668845 };
  assert.equal(MI._test.homeTaxes(MI.normalize({ groups: { homestead: true }, homeValue: 693845, place: 'Coral Gables', pa })).nsTaxable, 600000);
  assert.equal(MI._test.homeTaxes(MI.normalize({ groups: { homestead: true }, homeValue: 700000, place: 'Coral Gables', pa })).nsTaxable, 700000 - 51411);
});
