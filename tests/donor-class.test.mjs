// Which donors count for a law that helps a kind of business (scripts/data/industry/INSTRUCTIONS.md,
// scripts/lib/donor-class.mjs), with the cases found on Angie Nixon's Florida House law ties (Brit, Oct 27, 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fitsLaw, phrases, isOrg, execPending, recordFor, setExecRecords, donorKey, narrowCondition } from '../scripts/lib/donor-class.mjs';

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
  for (const ref of ['HB 927 · 2026', 'HB 399 · 2026']) {
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
  for (const ref of ['SB 362 · 2024', 'HB 1175 · 2026']) {
    assert.ok(fits(ref, 'COWART JENNIFER', 'PHYSICIAN'), ref);
    assert.ok(nixon(ref).has('COWART JENNIFER') && nixon(ref).has('KHATIB YAZAN'), ref);
  }
  for (const ref of ['HB 1137 · 2026']) {
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

// Rule 5 (Brit, Oct 27, 2026): an executive title without ownership counts only with an official record of the person's
// stake (Sunbiz officer listing or SEC filing). scripts/data/industry/EXEC-RECORDS.md
const REC = J('scripts/data/industry/exec-records.json').records;
const CONSTR = { tags: [], re: 'CONTRACTOR|CONSTRUCTION|BUILDER|HOMEBUILD|HOME BUILD' };
const HOSP = { tags: [], re: 'HOSPITAL|HEALTH|MEDICAL|PHYSICIAN|NURSING|CLINIC' };
const RETAIL = { tags: [], re: 'RETAIL|STORE|SUPERMARKET' };

test('executives without a record do not count; they wait on a record', () => {
  setExecRecords({});
  for (const [K, occ] of [[CONSTR, 'CONSTRUCTION COMPANY EXECUTIVE'], [HOSP, 'HEALTHCARE EXECUTIVE'], [HOSP, 'HOSPITAL VP'], [CONSTR, 'CONSTRUCTION COMPANY CFO'],
    [CONSTR, 'EXECUTIVE VP/CONSTRUCTION COMP'], [HOSP, 'HEALTH CARE EXECUTIVE CHAIRMAN'], [RETAIL, 'RETAIL CO. DIRECTOR'], [CONSTR, 'MUNILLA CONSTRUCTION VP']]) {
    assert.ok(!fitsLaw(K, 'DOE JOHN', occ, []), occ);
    assert.ok(execPending(K, 'DOE JOHN', occ, []), occ);
  }
  // CHAIRMAN and PRINCIPAL are executive titles, not ownership
  assert.ok(!fitsLaw({ tags: [], re: 'PRIVATE EQUITY' }, 'BONWITT GIL', 'PRIVATE EQUITY FIRM PRINCIPAL', []));
  assert.ok(execPending({ tags: [], re: 'PRIVATE EQUITY' }, 'BONWITT GIL', 'PRIVATE EQUITY FIRM PRINCIPAL', []));
  // owners still count without a record, and are not waiting on one
  for (const occ of ['OWNER CONSTRUCTION COMPANY', 'PRESIDENT, CONSTRUCTION CO', 'CEO HOMEBUILDER', 'MANAGING MEMBER CONSTRUCTION LLC']) {
    assert.ok(fitsLaw(CONSTR, 'DOE JOHN', occ, []), occ);
    assert.ok(!execPending(CONSTR, 'DOE JOHN', occ, []), occ);
  }
  // a vice president is not a president
  assert.ok(!fitsLaw(CONSTR, 'DOE JOHN', 'VICE PRESIDENT CONSTRUCTION', []));
  assert.ok(execPending(CONSTR, 'DOE JOHN', 'VICE PRESIDENT CONSTRUCTION', []));
  // the title alone, or the business alone, is not a candidate; nor is a school principal or a plain employee
  for (const [K, occ] of [[CONSTR, 'EXECUTIVE'], [CONSTR, 'CONSTRUCTION'], [CONSTR, 'PROJECT MANAGER CONSTRUCTION'], [{ tags: [], re: 'SCHOOL|ACADEMY' }, 'SCHOOL PRINCIPAL'], [HOSP, 'REGISTERED NURSE']])
    assert.ok(!execPending(K, 'DOE JOHN', occ, []), occ);
  // companies are never executives
  assert.ok(!execPending(CONSTR, 'ACME CONSTRUCTION LLC', 'CONSTRUCTION EXECUTIVE', []));
});

test('an official record of the stake makes the executive count, only for a company in the class', () => {
  const rec = { company: 'LENNAR CORPORATION', role: 'Executive Chairman', source: 'SEC', business: 'SEC industry code 1520: General Bldg Contractors - Residential Bldgs', recordUrl: 'https://www.sec.gov/x', quote: 'officerTitle Executive Chairman' };
  setExecRecords({ 'DOE JOHN A': rec });
  assert.equal(donorKey('Doe, John A.'), 'DOE JOHN A');
  assert.ok(fitsLaw(CONSTR, 'DOE JOHN A', 'CONSTRUCTION COMPANY EXECUTIVE', []));
  assert.equal(recordFor(CONSTR, 'DOE JOHN A', 'CONSTRUCTION COMPANY EXECUTIVE', []), rec);
  assert.ok(fitsLaw(CONSTR, 'DOE, JOHN A.', 'CONSTRUCTION COMPANY EXECUTIVE', []));
  // the record is per donor key: someone else with the same title is still out, and so is a shared surname
  assert.ok(!fitsLaw(CONSTR, 'DOE JANE', 'CONSTRUCTION COMPANY EXECUTIVE', []));
  // the occupation must still name the business the law helps
  assert.ok(!fitsLaw(CONSTR, 'DOE JOHN A', 'EXECUTIVE', []));
  assert.ok(!fitsLaw(HOSP, 'DOE JOHN A', 'HEALTHCARE EXECUTIVE', []));
  // an owner does not need the record (recordFor is null), and the record does not turn an owner into anything else
  assert.equal(recordFor(CONSTR, 'DOE JOHN A', 'OWNER CONSTRUCTION COMPANY', []), null);
  // a company outside the class does not count, even with a record
  setExecRecords({ 'DOE JOHN A': { ...rec, company: 'DOLPHIN DIGITAL MEDIA INC', business: 'Services-Motion Picture & Video Tape Production' } });
  assert.ok(!fitsLaw(CONSTR, 'DOE JOHN A', 'CONSTRUCTION COMPANY EXECUTIVE', []));
  // ... unless the occupation names that company itself
  setExecRecords({ 'DOE JOHN A': { ...rec, company: 'MUNILLA CONSTRUCTION MANAGEMENT LLC', business: '' } });
  assert.ok(fitsLaw(CONSTR, 'DOE JOHN A', 'MUNILLA CONSTRUCTION VP', []));
  // a record without its link or the exact line does not count
  setExecRecords({ 'DOE JOHN A': { ...rec, quote: '' } });
  assert.ok(!fitsLaw(CONSTR, 'DOE JOHN A', 'CONSTRUCTION COMPANY EXECUTIVE', []));
  setExecRecords({ 'DOE JOHN A': { ...rec, recordUrl: '' } });
  assert.ok(!fitsLaw(CONSTR, 'DOE JOHN A', 'CONSTRUCTION COMPANY EXECUTIVE', []));
  setExecRecords(REC);
});

test('SEC records on file: Stuart A. Miller (Lennar) and George Feldenkreis (Perry Ellis)', () => {
  setExecRecords(REC);
  for (const [k, r] of Object.entries(REC)) {
    assert.equal(k, donorKey(k), k);
    assert.match(r.recordUrl, /^https:\/\/(www\.sec\.gov|search\.sunbiz\.org)\//, k);
    assert.ok(r.quote && r.company && r.role && r.source, k);
  }
  for (const ref of ['SB 360 · 2023', 'HB 705 · 2024']) {
    assert.ok(fits(ref, 'MILLER STUART A.', 'CONSTRUCTION COMPANY EXECUTIVE'), ref);
    assert.ok(!fits(ref, 'MILLER STUART', 'CONSTRUCTION COMPANY EXECUTIVE'), ref + ' (a different report spelling needs its own record)');
  }
  assert.ok(fitsLaw(RETAIL, 'FELDENKREIS GEORGE', 'RETAIL CO. DIRECTOR', []));
  // on the cards, with the record attached, for members seated for the vote
  const S = d.bodies.find(b => b.key === 'flsenate');
  const card = S.actions.find(a => a.id === 'SV24-705-1041');
  const g = card.gifts.filter(g => donorKey(g.donor) === 'MILLER STUART A');
  assert.ok(g.some(x => x.to === 'Calatayud' && x.amount === 50000), 'Calatayud');
  assert.ok(g.some(x => x.to === 'Ingoglia' && x.amount === 25000), 'Ingoglia');
  for (const x of g) assert.equal(x.record.url, REC['MILLER STUART A'].recordUrl);
  // executives without a record are not on any card
  const C = J('scripts/data/industry/exec-candidates.json');
  const open = new Set(C.gifts.filter(x => !x.resolved).map(x => x.donor));
  for (const B of d.bodies.filter(b => ['flhouse', 'flsenate'].includes(b.key))) for (const a of B.actions.filter(a => a.kind === 'bill'))
    for (const x of a.gifts) if (x.kind === 'class' && open.has(x.donor)) assert.ok(!execPending(K(a.ref) || {}, x.donor, x.occ, (TAGS[x.donor] || {}).tags || []), a.id + ' ' + x.donor);
  assert.equal(C.totals.gifts, C.gifts.length);
});

// Rule 7 (Brit, Oct 27, 2026): a benefit the analysis limits to a subset ties a donor only with a record that the donor is in it
test('conditional benefit: SB 7016 (2024) physicians do not tie without a record of FRAME or DSLR participation', () => {
  const k = K('SB 7016 · 2024');
  assert.match(k.conditional, /who are able to participate in FRAME or the DSLR Program/);
  for (const [n, o] of [['COWART JENNIFER', 'PHYSICIAN MAYO CLINIC FLORIDA'], ['KHATIB YAZAN', 'PHYSICIAN'], ['SARWAR ZAHIR', 'PHYSICIAN']]) {
    assert.ok(!fits('SB 7016 · 2024', n, o), n);
    assert.ok(!nixon('SB 7016 · 2024').has(n), n);
  }
  // a record showing the donor is in the subset makes the gift count
  const withRec = { ...k, subset: { [donorKey('KHATIB YAZAN')]: { recordUrl: 'https://example.org/frame-awards.pdf', quote: 'Yazan Khatib, MD: FRAME award' } } };
  const tg = n => (TAGS[n] || {}).tags || [];
  assert.ok(fitsLaw(withRec, 'KHATIB YAZAN', 'PHYSICIAN', tg('KHATIB YAZAN')));
  assert.ok(!fitsLaw(withRec, 'SARWAR ZAHIR', 'PHYSICIAN', tg('SARWAR ZAHIR')));
  // a record entry without its source and quote is not a record
  assert.ok(!fitsLaw({ ...k, subset: { [donorKey('KHATIB YAZAN')]: { recordUrl: '' } } }, 'KHATIB YAZAN', 'PHYSICIAN', tg('KHATIB YAZAN')));
});

test('conditional benefits: every marked class quotes words from its own analysis; federal narrow-condition laws tie no PAC', () => {
  const law = {};
  for (const dir of [T + 'flhouse/', T + 'prior-flhouse/', T + 'prior-flsenate/']) for (const y of ['2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2122', '2023', '2024', '2025'])
    for (const b of (opt(dir + 'bills-' + y + '.json').bills || [])) if (b.benefits && b.benefits.quote) law[b.chapter] = b.benefits.quote;
  for (const b of J('scripts/data/state/bills/universe.json').bills) if (b.benefits && b.benefits.quote) law[b.chapter] = b.benefits.quote;
  let n = 0;
  for (const f of ['scripts/data/state/bills/classes-by-chapter.json', T + 'flhouse/bills/classes-by-chapter.json', T + 'prior-flhouse/bills/classes-by-chapter.json', T + 'prior-flsenate/bills/classes-by-chapter.json'])
    for (const [ch, c] of Object.entries(opt(f))) if (c.conditional && law[ch]) { n++; assert.ok(law[ch].includes(c.conditional), f + ' ' + ch); }
  assert.ok(n >= 100, 'conditional classes: ' + n);
  const us = d.bodies.filter(b => b.level === 'federal');
  const cond = new Set([...J('scripts/data/federal/floor-votes.json').bills, ...(opt(T + 'congress/floor-votes-tenure.json').bills || [])].filter(b => narrowCondition(b)).map(b => b.ref));
  assert.ok(cond.size > 5);
  for (const B of us) for (const a of B.actions) if (a.kind === 'bill' && cond.has(a.ref)) assert.equal(a.gifts.filter(g => g.kind === 'class').length, 0, a.id);
});

// Over-breadth (Brit, Oct 27, 2026): a class names only the kinds of business its own analysis names
test('HB 619 (2024) helps professional firms doing FDOT monitoring and inspection: contractors do not tie', () => {
  const k = K('HB 619 · 2024');
  assert.ok(!/CONTRACTOR|CONSTRUCTION|DEBRIS/.test(k.re), k.re);
  for (const [n, o] of [['MINION JAMES', 'CONTRACTOR'], ['MINION JAMES', 'SIGN CONTRACTOR/SELF'], ['ALVAREZ JOSE', 'CONTRACTOR'], ['RED APPLE DEVELOPMENT, LLC', 'CONSTRUCTION']]) assert.ok(!fits('HB 619 · 2024', n, o), n + ' ' + o);
  assert.ok(!nixon('HB 619 · 2024').has('MINION JAMES'));
  // and it is conditional: only a firm shielded by the FDOT contract immunity, which no record here shows
  assert.match(k.conditional, /professional firm shielded by sovereign immunity/);
  for (const B of d.bodies.filter(b => b.key === 'flhouse' || b.key === 'flsenate')) for (const a of B.actions) if (a.ref === 'HB 619 · 2024') assert.equal(a.gifts.filter(g => g.kind === 'class').length, 0, a.id);
});

test('other classes cut to what the analysis names', () => {
  // HB 149 (2024): CCNA professional services, construction management, project management; not builders
  assert.ok(!fits('HB 149 · 2024', 'MILLER STUART A.', 'CONSTRUCTION COMPANY EXECUTIVE'));
  assert.ok(!fits('HB 149 · 2024', 'MINION JAMES', 'CONTRACTOR'));
  // HB 1459 (2023): craft brewers and brewpubs, not beer distributors
  assert.ok(!fits('HB 1459 · 2023', 'NORTH FLORIDA SALES', 'BEER DISTRIBUTOR'));
  // HB 709 (2024): liquor distributors, not beer wholesalers
  assert.ok(!fits('HB 709 · 2024', 'FLORIDA BEER WHOLESALERS GOOD GOVERNMENT COMMITTEE', 'PAC'));
  // HB 583 (2024): businesses that sell wine, not beer wholesalers
  assert.ok(!fits('HB 583 · 2024', 'GOLD COAST BEVERAGE, LLC', 'BEVERAGE WHOLESALER'));
  // HB 615 (2025): landlords, not property managers
  assert.ok(!fits('HB 615 · 2025', '7501 PARKLAND LLC', 'PROPERTY MANAGEMENT'));
  // HB 705 (2024): contractors, not a construction materials supplier
  assert.ok(!fits('HB 705 · 2024', 'CEMEX MATERIALS LLC', 'CONSTRUCTION MATERIALS'));
  // SB 808 (2024) pays only authorized medical specialists, SB 784 (2025) helps only those whose plats are in process:
  // both conditional, so no record, no tie
  assert.ok(!fits('SB 808 · 2024', 'COWART JENNIFER', 'PHYSICIAN'));
  assert.ok(!fits('SB 784 · 2025', 'WOHL MICHAEL D.', 'REAL ESTATE DEVELOPER'));
});

// Brit, Oct 27, 2026: "developer" in an analysis includes home builders (same business); the other neighbouring trades stay out
test('developer laws take home builders, not realtors, manufactured housing, property managers or materials suppliers', () => {
  const dev = ['HB 399 · 2026', 'HB 927 · 2026', 'SB 102 · 2023', 'HB 487 · 2021', 'SB 706 · 2022'];
  // tags as an industry file would give them, so only the class's own words decide
  const ft = (ref, n, o, t) => fitsLaw(K(ref), n, o, t);
  const HB = ['homebuilders', 'realestate-dev'];
  for (const ref of dev) {
    assert.match(K(ref).re, /DEVELOP/, ref);
    assert.ok(fits(ref, 'FLORIDA HOME BUILDERS PAC', 'PAC'), ref);
    assert.ok(fits(ref, 'HOMES BY WEST BAY, LLC', 'REAL ESTATE DEVELOPMENT CO. / HOME BUILDERS'), ref);
    assert.ok(ft(ref, 'SMITH JOHN', 'HOME BUILDER', HB), ref);
    assert.ok(ft(ref, 'SMITH JOHN', 'RESIDENTIAL BUILDER', HB), ref);
    assert.ok(ft(ref, 'SMITH JOHN', 'OWNER, HOMEBUILDING COMPANY', HB), ref);
    assert.ok(ft(ref, 'SUNSHINE HOMEBUILDERS INC', 'HOMEBUILDING', HB), ref);
    assert.ok(fits(ref, 'WOHL MICHAEL D.', 'REAL ESTATE DEVELOPER'), ref);
    assert.ok(!ft(ref, 'DAVIDSON ELSIE', 'REALTOR', HB), ref);
    assert.ok(!ft(ref, 'REALTORS POLITICAL ADVOCACY COMMITTEE', 'POLITICAL COMMITTEE (PC)', HB), ref);
    assert.ok(!ft(ref, 'SMITH JOHN', 'PROPERTY MANAGER', HB), ref);
    assert.ok(!ft(ref, 'SUNCOAST PROPERTY MANAGEMENT LLC', 'PROPERTY MANAGEMENT', HB), ref);
    assert.ok(!ft(ref, 'CEMEX MATERIALS LLC', 'CONSTRUCTION MATERIALS', HB), ref);
    if (!/HOUSING/.test(K(ref).re)) assert.ok(!ft(ref, 'FLORIDA MANUFACTURED HOUSING ASSOCIATION', 'TRADE ASSOCIATION', HB), ref);
  }
  // every class tied to a developer analysis, current and earlier seats, carries the home-builder terms
  const files = ['scripts/data/state/bills/classes.json', 'scripts/data/state/bills/classes-by-chapter.json', T + 'flhouse/bills/classes-2122.json',
    T + 'flhouse/bills/classes-by-chapter.json', T + 'prior-flhouse/bills/classes-by-chapter.json'];
  for (const f of files) for (const [k, c] of Object.entries(J(f)))
    if (c.re && (c.tags || []).includes('homebuilders') && c.re.split('|').includes('DEVELOP')) assert.match(c.re, /BUILDER\|HOMEBUILD\|HOME BUILD/, f + ' ' + k);
  for (const k of ['2019-110', '2019-157', '2019-165']) assert.match(J(T + 'prior-flhouse/bills/classes-by-chapter.json')[k].re, /BUILDER/, k);
});

// Rule 7, breadth (Brit, Oct 27, 2026): a NARROW condition (join or apply to a program, be eligible or selected, a place,
// a size band, a license tier) needs a subset record; a BROAD one (met by nearly every business in normal operations)
// counts like no condition
const CONDFILES = ['scripts/data/state/bills/classes.json', 'scripts/data/state/bills/classes-by-chapter.json', T + 'flhouse/bills/classes-2122.json',
  T + 'flhouse/bills/classes-by-chapter.json', T + 'flsenate/bills/classes-senate.json', T + 'prior-flhouse/bills/classes-by-chapter.json', T + 'prior-flsenate/bills/classes-by-chapter.json'];
const FEDFILES = ['scripts/data/federal/floor-votes.json', T + 'congress/floor-votes-tenure.json', T + 'prior-congress/floor-votes.json'];
test('every conditional class says whether its condition is narrow or broad, and why', () => {
  let n = 0;
  const all = [...CONDFILES.flatMap(f => Object.entries(J(f)).map(([k, c]) => [f + ' ' + k, c])), ...FEDFILES.flatMap(f => J(f).bills.map(b => [f + ' ' + b.ref, b]))];
  for (const [k, c] of all) if (c.conditional) {
    n++;
    assert.ok(['narrow', 'broad'].includes(c.conditionBreadth), k);
    assert.ok(typeof c.conditionBreadthReason === 'string' && c.conditionBreadthReason.length > 10, k);
  }
  assert.ok(n >= 180, 'conditional classes: ' + n);
});

test('H.R. 1 (2025) "qualified property" is a broad condition: oil and gas PACs tie', () => {
  const b = J('scripts/data/federal/floor-votes.json').bills.find(b => b.ref === 'H.R. 1 · 2025');
  assert.equal(b.conditional, 'qualified property');
  assert.equal(b.conditionBreadth, 'broad');
  assert.ok(!narrowCondition(b));
  const cards = d.bodies.filter(B => B.level === 'federal').flatMap(B => B.actions.filter(a => a.kind === 'bill' && a.ref === 'H.R. 1 · 2025'));
  assert.ok(cards.length > 0);
  assert.ok(cards.some(a => a.gifts.some(g => g.kind === 'class')), 'H.R. 1 ties class PACs');
  // the 2004 manufacturing deduction ("qualified production activities income") is broad too
  const q = J(T + 'congress/floor-votes-tenure.json').bills.find(b => b.conditional === 'qualified production activities income');
  assert.equal(q.conditionBreadth, 'broad');
  // a broad state class ties without a subset record
  const broad = { tags: [], re: 'DENTIST', conditional: 'dentists who may be able to benefit', conditionBreadth: 'broad', conditionBreadthReason: 'x' };
  assert.ok(fitsLaw(broad, 'SMITH JOHN', 'DENTIST', []));
  assert.ok(!fitsLaw({ ...broad, conditionBreadth: 'narrow' }, 'SMITH JOHN', 'DENTIST', []));
  assert.ok(!fitsLaw({ ...broad, conditionBreadth: undefined }, 'SMITH JOHN', 'DENTIST', []), 'no breadth means narrow');
});

test('SB 7016 (2024) FRAME/DSLR stays narrow, and so do the other program, place, size and license conditions', () => {
  assert.equal(K('SB 7016 · 2024').conditionBreadth, 'narrow');
  assert.ok(!fits('SB 7016 · 2024', 'KHATIB YAZAN', 'PHYSICIAN'));
  for (const ref of ['SB 2502 · 2025', 'SB 1662 · 2025', 'SB 1028 · 2026', 'SB 784 · 2025']) assert.equal(K(ref).conditionBreadth, 'narrow', ref);
  const fed = FEDFILES.flatMap(f => J(f).bills);
  for (const t of ['certain small rural hospitals', 'disproportionate-share hospital'])
    for (const b of fed.filter(b => b.conditional === t)) assert.equal(b.conditionBreadth, 'narrow', b.ref);
});
