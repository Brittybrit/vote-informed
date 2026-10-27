// Which donors count for a law that helps a kind of business (scripts/data/industry/INSTRUCTIONS.md,
// scripts/lib/donor-class.mjs), with the cases found on Angie Nixon's Florida House law ties (Brit, Oct 27, 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fitsLaw, phrases, isOrg } from '../scripts/lib/donor-class.mjs';

const J = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const opt = p => existsSync(new URL('../' + p, import.meta.url)) ? J(p) : {};
const T = 'scripts/data/tenure/';
const LAB = { ...J(T + 'flhouse/bills/labels.json'), ...opt(T + 'flhouse/bills/labels-2122.json'), ...opt(T + 'flsenate/bills/labels-senate.json') };
const BYCH = { ...J(T + 'flhouse/bills/classes-by-chapter.json'), ...opt(T + 'flhouse/bills/classes-2122.json'), ...opt(T + 'flsenate/bills/classes-senate.json') };
const CLS = J('scripts/data/state/bills/classes.json');
const TAGS = { ...opt(T + 'flsenate/donors/industry-pre2025.json').donors, ...opt(T + 'flhouse/donors/industry-pre2025.json').donors, ...J('scripts/data/industry/state-donors.json').donors };
const K = ref => CLS[ref] || (LAB[ref] && BYCH[LAB[ref].chapter]);
const fits = (ref, name, occ) => { const k = K(ref); assert.ok(k, 'no class for ' + ref); return fitsLaw(k, name, occ, (TAGS[name] || {}).tags || []); };

const d = J('public/data/decisions.json');
const H = d.bodies.find(b => b.key === 'flhouse');
// Nixon's class gifts on a law's cards, by donor
const nixon = ref => new Set(H.actions.filter(a => a.kind === 'bill' && a.ref === ref).flatMap(a => a.gifts.filter(g => g.to === 'Nixon' && g.kind === 'class').map(g => g.donor)));

test('phrases match on word boundaries: a food bank is not a bank, labor is not a lab', () => {
  assert.ok(!phrases('BANK').test(' FOOD BANK STAFF '.replace(/FOOD BANK/, ' ')));
  assert.ok(!fits('HB 85 · 2024', 'HOFFMAN KATHRYN', 'FOOD BANK STAFF'));
  assert.ok(!fits('HB 1305 · 2024', 'HOFFMAN KATHRYN', 'FOOD BANK STAFF'));
  assert.ok(!phrases('LAB').test('NORTH FLORIDA CENTRAL LABOR COUNCIL'));
  assert.ok(phrases('LAB').test('ABBOTT LABORATORIES'));
  assert.ok(!phrases('MOBIL').test('T-MOBILE USA'));
  assert.ok(!phrases('CHURCH').test('CHURCHILL SURGICAL INSTRUMENTS'));
  assert.ok(phrases('PHARMAC').test('RETAIL PHARMACY'));
});

test('a person is matched on their occupation, never on their name', () => {
  assert.ok(!fits('SB 1388 · 2025', 'DIAZ MARINA', 'NOT EMPLOYED'));
  assert.ok(!fitsLaw({ tags: [], re: 'BARBER' }, 'BARBER NOELLE', 'SELF EMPLOYED', []));
  assert.ok(fitsLaw({ tags: [], re: 'BARBER' }, 'SMITH JOHN', 'BARBER', []));
});

test('employees of a business in the industry are not the business (Nixon cases)', () => {
  for (const ref of ['HB 149 · 2024', 'HB 781 · 2024', 'HB 619 · 2024', 'HB 1557 · 2024', 'HB 683 · 2025']) {
    assert.ok(!fits(ref, 'ABDOU TAREK', 'SOFTWARE ENGINEER'), ref);
    assert.ok(!fits(ref, 'ABDOU TAREK', 'ENGINEER'), ref);
    assert.ok(!fits(ref, 'QUADER SYEDA', 'ANALYTICS ENGINEER'), ref);
  }
  assert.ok(!fits('SB 7020 · 2024', 'BYRNE SCOTT', 'DRIVER/FOOD DELIVERY'));
  assert.ok(!fits('SB 7020 · 2024', 'BLAKE RICHARD', 'DELIVERY DRIVER'));
  for (const ref of ['HB 7073 · 2024', 'HB 1569 · 2024']) assert.ok(!fits(ref, 'HICKS JOSHUA', 'AFFORDABLE HOUSING DIRECTOR'), ref);
  for (const occ of ['BANKING/WELLS FARGO', 'BANKING WELLS FARGO BANK NA', 'BANKING', 'BANKER'])
    for (const ref of ['HB 85 · 2024', 'HB 1305 · 2024']) assert.ok(!fits(ref, 'WORLEY MICHELLE', occ), ref + ' ' + occ);
  // the bank itself, or its owner, still counts
  assert.ok(fits('HB 85 · 2024', 'SEACOAST NATIONAL BANK', 'BANKING'));
  assert.ok(fitsLaw(K('HB 85 · 2024'), 'DOE JANE', 'PRESIDENT/COMMUNITY BANK', ['banks']));
});

test('realtors are not developers', () => {
  for (const ref of ['HB 927 · 2026', 'SB 784 · 2025']) {
    assert.ok(!fits(ref, 'DAVIDSON ELSIE', 'REALTOR'), ref);
    assert.ok(!fits(ref, 'REALTORS POLITICAL ADVOCACY COMMITTEE', 'POLITICAL COMMITTEE (PC)'), ref);
    assert.ok(fits(ref, 'WOHL MICHAEL D.', 'REAL ESTATE DEVELOPER'), ref);
  }
  // a law that names realtors would count them
  assert.ok(fitsLaw({ tags: [], re: 'REALTOR|REAL ESTATE BROKER', realtors: true }, 'DAVIDSON ELSIE', 'REALTOR', []));
});

test('labor unions count only when the analysis names the workers they represent as benefiting', () => {
  const k = { tags: [], re: 'LAB|DNA|FORENSIC' };
  assert.ok(!fitsLaw(k, 'NORTH FLORIDA CENTRAL LABOR COUNCIL', 'POLITICAL COMMITTEE', ['labor-union']));
  assert.ok(!fitsLaw(k, 'THE FLORIDA EDUCATION ASSOCIATION ADVOCACY FUND', 'LABOR UNION', ['labor-union']));
  assert.ok(fitsLaw({ tags: [], re: 'TEACHER|EDUCATION ASSOCIATION', unions: true }, 'THE FLORIDA EDUCATION ASSOCIATION ADVOCACY FUND', 'LABOR UNION', ['labor-union']));
});

test('analysis sentences that state no benefit leave the law out (HB 633 and HB 847, 2025)', () => {
  const nb = J('scripts/data/industry/not-a-benefit.json').laws;
  assert.ok(nb['2025-137'] && nb['2025-141']);
  for (const B of d.bodies) for (const a of B.actions) assert.ok(!['HB 633 · 2025', 'HB 847 · 2025'].includes(a.ref) || a.kind !== 'bill', B.key + ' ' + a.id);
});

test('practitioners and the businesses themselves still tie (Nixon cases)', () => {
  for (const ref of ['SB 362 · 2024', 'SB 808 · 2024', 'HB 1175 · 2026', 'SB 7016 · 2024']) {
    assert.ok(fits(ref, 'COWART JENNIFER', 'PHYSICIAN'), ref);
    assert.ok(nixon(ref).has('COWART JENNIFER') && nixon(ref).has('KHATIB YAZAN'), ref);
  }
  for (const ref of ['HB 1137 · 2026', 'HB 709 · 2024']) {
    assert.ok(fits(ref, 'NORTH FLORIDA SALES', 'BEER DISTRIBUTOR'), ref);
    assert.ok(fits(ref, 'FLORIDA BEER WHOLESALERS GOOD GOVERNMENT COMMITTEE', 'PAC'), ref);
    assert.ok(nixon(ref).has('NORTH FLORIDA SALES') && nixon(ref).has('FLORIDA BEER WHOLESALERS GOOD GOVERNMENT COMMITTEE'), ref);
  }
  for (const ref of ['HB 803 · 2026', 'HB 683 · 2025']) {
    assert.ok(fits(ref, 'MINION JAMES', 'CONTRACTOR'), ref);
    assert.ok(nixon(ref).has('MINION JAMES'), ref);
  }
  for (const occ of ['PSYCHOLOGIST', 'CLINICAL PSYCHOLOGIST', 'NEUROPSYCHOLOGIST UTHSC', 'PSYCHOLOGISTTOTAL SPECTRUM COU']) assert.ok(fits('SB 944 · 2025', 'PROIA FELIX', occ), occ);
  assert.ok(nixon('SB 944 · 2025').has('PROIA FELIX'));
});

test('Nixon: none of the wrong pairings is on her cards', () => {
  const wrong = {
    'HB 85 · 2024': ['HOFFMAN KATHRYN', 'WORLEY MICHELLE', 'DELAHOUSIE SHARYN', 'BSISU WASFI', 'DECANTO JOHN', 'SUBEDAR SAMAD'],
    'HB 1305 · 2024': ['HOFFMAN KATHRYN', 'WORLEY MICHELLE'],
    'HB 149 · 2024': ['ABDOU TAREK', 'QUADER SYEDA'], 'HB 781 · 2024': ['ABDOU TAREK', 'QUADER SYEDA'], 'HB 619 · 2024': ['ABDOU TAREK', 'QUADER SYEDA'],
    'HB 1557 · 2024': ['ABDOU TAREK', 'QUADER SYEDA'], 'HB 683 · 2025': ['ABDOU TAREK', 'QUADER SYEDA'],
    'SB 7020 · 2024': ['BYRNE SCOTT', 'BLAKE RICHARD'],
    'HB 7073 · 2024': ['HICKS JOSHUA'], 'HB 1569 · 2024': ['HICKS JOSHUA'],
    'HB 927 · 2026': ['DAVIDSON ELSIE', 'REALTORS POLITICAL ADVOCACY COMMITTEE'], 'SB 784 · 2025': ['DAVIDSON ELSIE', 'REALTORS POLITICAL ADVOCACY COMMITTEE'],
    'SB 1388 · 2025': ['DIAZ MARINA'], 'HB 735 · 2025': ['DIAZ MARINA'],
  };
  for (const [ref, names] of Object.entries(wrong)) for (const n of names) assert.ok(!nixon(ref).has(n), ref + ' ' + n);
});

test('a company is told from a person by its name', () => {
  assert.ok(isOrg('MASTEC'));
  assert.ok(isOrg('MOSS & ASSOCIATES, LLC'));
  assert.ok(isOrg('REALTORS POLITICAL ADVOCACY COMMITTEE'));
  assert.ok(!isOrg('MINION JAMES', 'CONTRACTOR'));
  assert.ok(!isOrg('COWART JENNIFER', 'PHYSICIAN MAYO CLINIC FLORIDA'));
});
