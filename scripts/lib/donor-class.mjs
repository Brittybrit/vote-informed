import { readFileSync, existsSync } from 'node:fs';
// Which donors count for a law whose staff analysis names a kind of business it helps (Brit, Oct 27, 2026).
// Used by every state law tie: scripts/state-bills.mjs (Florida House and Senate, current and full tenure) and
// scripts/prior-legislature.mjs (earlier Florida House and Senate seats). Federal law ties use company and trade
// group PACs listed by name per class (scripts/data/federal/floor-votes.json and the tenure files); see
// scripts/data/industry/INSTRUCTIONS.md for the whole rule.
//
// A law's class (classes*.json) has `tags` (industry tags from scripts/data/industry), `re` (the kinds of business
// the analysis names, as phrases) and `not`. Optional: `realtors: true` when the analysis names realtors, real
// estate brokers or sales associates; `unions: true` when it names the workers a union represents as benefiting;
// `who` (a pattern of practitioner nouns the analysis names, beyond the standard list below).
//
// 1. Phrases match on word boundaries. A short word (4 letters or fewer) matches only itself and its plain endings
//    (BANK: BANKS, BANKER, BANKING; not BANKRUPTCY); longer terms are stems (PHARMAC: PHARMACY, PHARMACIST).
//    Phrases that only look like a business are removed first (FOOD BANK is not a bank).
// 2. A person counts only when their own reported occupation on that gift shows they ARE the business: a licensed
//    practitioner or business noun the law's class names (PHYSICIAN, CONTRACTOR, PSYCHOLOGIST, DISTRIBUTOR), or an
//    owner role (OWNER, PRESIDENT, CEO, FOUNDER, PARTNER, MANAGING MEMBER, SELF-EMPLOYED) next to the business itself.
//    Employees of a company in the industry (banker, teller, driver, staff, counselor, software engineer) do not
//    count; executives only under rule 5. A person's name is never matched (MARINA, WATERS, TEMPLE, BARBER are surnames).
// 3. Committees, PACs and companies count when their own name or reported business is that business or its trade
//    group. A labor union counts only for a law with `unions: true`.
// 4. Realtors, real estate brokers and sales associates count only for a law with `realtors: true`; a law that helps
//    developers does not help realtors.
// 5. An executive without ownership in the title (EXECUTIVE, CFO, COO, VP, CHAIRMAN, DIRECTOR, MANAGING DIRECTOR,
//    GENERAL MANAGER, PRINCIPAL ...) next to the business itself counts only when an official record shows that person's
//    stake in that company: Florida Sunbiz lists them as an officer, director, manager/managing member or registered
//    agent-owner, or an SEC filing (DEF 14A, 10-K Item 10, Form 3/4) names them an executive officer, director or 10%
//    owner. Records: scripts/data/industry/exec-records.json ({donor key: {company, role, recordUrl, quote}}), filled by
//    hand from the record (scripts/data/industry/EXEC-RECORDS.md). No record, no tie (Brit, Oct 27, 2026).
// 6. A conditional benefit (`conditional`: the analysis's own words that limit it to a subset: those who participate,
//    qualify, apply, are eligible, are selected, take advantage of or use a program, are located in a place): a donor
//    counts only when a record shows the donor is in that subset (`subset`: {donor key: {recordUrl, quote}}). Without
//    one the law ties no one (Brit, Oct 27, 2026; scripts/data/industry/INSTRUCTIONS.md rule 7).
const NOT_BUSINESS = /\b(?:ECONOMIC|BUSINESS|WORKFORCE|SOFTWARE|PRODUCT|CHILD|LEADERSHIP|PROFESSIONAL) DEVELOPMENT\b|\b(?:FOOD|BLOOD|DIAPER|MILK|EYE|TISSUE|SPERM|DATA|TIME|CLOTHING|TOY|BOOK|SEED|PIGGY|WEST|LEFT|RIVER|SOUTH|NORTH) BANKS?\b|\bSOCIAL SECURITY\b|\bBANKRUPTCY\b/g;
const REALTY = /\bREALTORS?\b|\bREALTY\b|\bREAL ESTATE (?:BROKER(?:AGE)?|AGENT|AGENCY|SALES(?: ASSOCIATE)?|SALESPERSON|LICENSEE)S?\b|\bR\.?E\.? (?:BROKER|AGENT)S?\b|\bBROKER ASSOCIATE\b|\bSALES ASSOCIATE\b/g;
const UNION = /\b(?:(?<!CREDIT )UNIONS?|AFL-?CIO|LABOR COUNCIL|TEAMSTERS|SEIU|IBEW|AFSCME|UNITED FACULTY|UNITED TEACHERS|TEACHERS UNION|EDUCATION ASSOCIATION|FRATERNAL ORDER OF POLICE|BENEVOLENT ASSOCIATION|PBA|FIRE ?FIGHTERS|PROFESSIONAL FIREFIGHTERS|BROTHERHOOD|LOCAL \d+|LABOR UNION)\b/;
// is the donor an organization (company, committee, union) rather than a person
const ORGNAME = /\b(?:LLC|L\.L\.C|INC|CORP|CORPORATION|COMPANY|COMPANIES|CO|P\.?A|PL|P\.L|PLLC|LLP|LP|LTD|LLLP|PAC|PC|COMMITTEE|ASSOCIATION|ASSN|ASSOC|ASSOCIATES|GROUP|FUND|UNION|LOCAL|PARTY|TRIBE|FRIENDS OF|FLORIDA|FLORIDIANS|COUNCIL|SOCIETY|ALLIANCE|COALITION|FOUNDATION|TRUST|HOLDINGS|PARTNERS|PARTNERSHIP|ENTERPRISES|SERVICES|SOLUTIONS|STRATEGIES|CONSULTING|CONSULTANTS|ADVISORS|BANK|BANCORP|INDUSTRIES|SYSTEMS|AUTHORITY|UNIVERSITY|SCHOOLS?|ACADEMY|FARMS?|GROVES?|NURSERY|MANAGEMENT|DEVELOPMENT|DEVELOPERS|BUILDERS|HOMES|CONSTRUCTION|CONTRACTING|CONTRACTORS|DRYWALL|STUCCO|ROOFING|PLUMBING|PAVING|CONCRETE|MATERIALS|SUPPLY|ENGINEERING|ENGINEERS|ARCHITECTS|DESIGN|PROPERTIES|PROPERTY|APARTMENTS|COMMUNITIES|HOUSING|REALTY|REAL ESTATE|RENTALS|INVESTMENTS|INVESTORS|CAPITAL|VENTURES|FINANCIAL|LENDING|LOANS|INSURANCE|UNDERWRITERS|TITLE|INTERNATIONAL|WORLDWIDE|GLOBAL|ENERGY|ELECTRIC|POWER|UTILITIES|COMMUNICATIONS|TELECOM|WIRELESS|MEDIA|BROADCASTING|ENTERTAINMENT|CASINO|SPEEDWAY|RACING|DISTRIBUTORS?|DISTRIBUTING|WHOLESALERS?|BEVERAGES?|BREWING|BREWERY|LIQUORS|WINES?|SPIRITS|BRANDS|MOTORS|AUTOMOTIVE|DEALERSHIP|DEALERS|AUTO|TOWING|TRUCKING|LOGISTICS|TRANSPORT|TRANSPORTATION|AVIATION|AIRLINES|TECHNOLOGIES|TECHNOLOGY|LABS|LABORATORIES|PHARMA|PHARMACEUTICALS|THERAPEUTICS|HEALTH|HEALTHCARE|HOSPITAL|CLINIC|MEDICAL|INSTITUTE|CENTER|CENTRE|PHARMACY|PLANS|FUNERAL|CHAPEL|CEMETERY|MEMORIAL|RESTAURANTS?|GRILL|HOTELS?|RESORTS?|CLUB|MARKETS?|STORES?|SHOPS?|RETAIL|FOODS?|PRODUCE|PACKING|CITRUS|SUGAR|GROWERS|DAIRY|CATTLE|AMERICA|AMERICAN|NATIONAL|COUNTY|CITY|USA|CARE|INITIATIVE|PROJECT|NETWORK|BROS|BROTHERS|COAST|GAMING|MOTORCARS|MOBILE|AUDI|LEXUS|MERCEDES|BMW|TOYOTA|HONDA|NISSAN|ACURA|INFINITI|PORSCHE|VOLVO|CADILLAC|ANHEUSER|BUSCH|COORS|MOLSON|JPMORGAN|CHASE|THE|AND|OF|FOR|GULFSTREAM PARK)\b|&|\d|\b[B-DF-HJ-NP-TV-XZ]{3,}\b/;
// a single word (MASTEC, GEICO, CEMEX) is never a person's name on these reports
const oneWord = n => !/\s/.test(String(n).trim().replace(/,/g, ' '));
// a committee reports its type as its occupation; a person's occupation can name an employer (INC, LLC), so only the name says company
const ORGOCC = /POLITICAL|\bPAC\b|\bP\.?C\.?$|\bPC\b|COMMITTEE|\bECO\b|\bCCE\b|\bNPO\b|TRADE ASSOC|LABOR UNION/;
export const isOrg = (name, occ = '') => oneWord(name) || ORGNAME.test(' ' + String(name).toUpperCase() + ' ') || ORGOCC.test(String(occ).toUpperCase());
export const isUnion = (name, occ = '') => UNION.test(String(name).toUpperCase() + ' | ' + String(occ).toUpperCase());

// Owner or principal of a business (the business itself must also be named in the occupation)
const OWNER = /\b(?:CO-?OWNER|OWNER|PROPRIETOR|CO-?FOUNDER|FOUNDER|(?<!VICE |ASST\.? |ASSISTANT |SR\.? |SENIOR |EXECUTIVE |EXEC\.? )PRESIDENT|CEO|C\.E\.O\.?|CHIEF EXECUTIVE(?: OFFICER)?|MANAGING PARTNER|PARTNER|MANAGING MEMBER|SELF[- ]?EMPLOYED|SELF)\b/g;
// An executive title without ownership (rule 5): counts only with an official record of the person's stake
const EXEC = /\b(?:(?:SR\.? |SENIOR |EXECUTIVE |EXEC\.? |ASST\.? |ASSISTANT )?VICE[- ]PRESIDENT|(?:S|E|A)?VP|V\.P\.?|EXECUTIVE|EXEC|CFO|COO|CTO|CIO|CMO|CHIEF (?:FINANCIAL|OPERATING|OPERATIONS|TECHNOLOGY|INFORMATION|MARKETING|COMMERCIAL|REVENUE|LEGAL|DEVELOPMENT|INVESTMENT) OFFICER|CO-?CHAIR(?:MAN|WOMAN|PERSON)?|CHAIR(?:MAN|WOMAN|PERSON)?|MANAGING DIRECTOR|(?:EXECUTIVE )?DIRECTOR|GENERAL MANAGER|PRINCIPAL)\b/g;
const SCHOOLISH = /\bSCHOOL|ACADEMY|ELEMENTARY|EDUCATION|TEACH/;
// Licensed practitioners and business nouns: the person is the business when the law's class names it
const PRACT = new RegExp('\\b(?:' + [
  'PHYSICIANS?(?! ASSISTANT)', 'DOCTOR(?! OF PHILOSOPHY)', 'M\\.? ?D\\.?(?=$|[^A-Z])', 'D\\.O\\.', 'MEDICAL DOCTOR', 'SURGEONS?', '(?!TECHNOLOGIST)[A-Z]*OLOGIST', 'PEDIATRICIAN', 'OBSTETRICIAN', 'OB ?/ ?GYN', 'OBGYN',
  'INTERNIST', 'HOSPITALIST', 'PSYCHIATRIST', 'PHYSIATRIST', 'DENTIST', 'ORTHODONTIST', 'PERIODONTIST', 'ENDODONTIST', 'ORAL SURGEON', 'OPTOMETRIST', 'CHIROPRACTOR',
  'PODIATRIST', 'PHARMACIST', 'NURSE PRACTITIONER', 'NURSE ANESTHETIST', 'CRNA', 'APRN', 'PHYSICAL THERAPIST', 'OCCUPATIONAL THERAPIST', 'SPEECH(?:-LANGUAGE)? PATHOLOGIST',
  'VETERINARIAN', 'DVM', '(?:GENERAL |BUILDING |ROOFING |ELECTRICAL |PLUMBING |MECHANICAL |SIGN |POOL |PAVING |UNDERGROUND |CERTIFIED |LICENSED )?CONTRACTOR',
  '(?:HOME ?)?BUILDER', 'HOMEBUILDER', '(?<!SOFTWARE |WEB |BUSINESS |APP |APPLICATION |GAME |PRODUCT |LEAD |FRONT[- ]END |BACK[- ]END |FULL[- ]STACK )DEVELOPER',
  '(?<!SOFTWARE |SOLUTIONS? |SYSTEMS? |CLOUD |DATA |ENTERPRISE |IT |NETWORK |SECURITY |TECHNICAL |INFORMATION )ARCHITECT', 'PROFESSIONAL ENGINEER', 'P\\.E\\.', 'SURVEYOR',
  'FARMER', 'RANCHER', 'GROWER', 'CATTLEMAN', 'DAIRYMAN', 'NURSERYMAN', 'DEALER', 'DISTRIBUTOR', 'WHOLESALER', 'BROKER', 'PAWNBROKER', 'INSURANCE AGENT', 'FUNERAL DIRECTOR',
  'EMBALMER', 'BARBER', 'REALTOR', 'REAL ESTATE (?:BROKER|AGENT|SALES ASSOCIATE)', 'BROKER ASSOCIATE', 'SALES ASSOCIATE', 'APPRAISER', 'LANDLORD', 'HARBOR PILOT', 'BAR PILOT', 'BAY PILOT', 'OUTFITTER', 'BAIL BONDS?(?:MAN| AGENT)?',
].join('|') + ')S?\\b', 'g');

// Short abbreviations in the class patterns that stand for longer words: matched only as these words
const STEMS = {
  SURG: 'SURGEONS?|SURGICAL|SURGERY|SURGERIES|SURGI', AUTO: 'AUTOS?|AUTOMOBILES?|AUTOMOTIVE', LIMO: 'LIMOS?|LIMOUSINES?', PAWN: 'PAWNS?|PAWNBROKERS?|PAWNSHOPS?',
  LAB: 'LABS?|LABORATORY|LABORATORIES', INS: 'INSURANCE|INSURERS?', CENT: 'CENTERS?|CENTRES?', SERV: 'SERVICES?|SERVERS?', ARCH: 'ARCHITECTS?|ARCHITECTURE|ARCHITECTURAL',
  UTIL: 'UTILITY|UTILITIES', CHEM: 'CHEMICALS?', DIAG: 'DIAGNOSTICS?', FISH: 'FISH|FISHING|FISHERM[AE]N|FISHERY|FISHERIES', DRUG: 'DRUGS?|DRUGSTORES?',
  BREW: 'BREWS?|BREWERS?|BREWERY|BREWERIES|BREWING', WINE: 'WINES?|WINERY|WINERIES', TOUR: 'TOURS?|TOURISM', AGRO: 'AGRO|AGROSCIENCES?',
  LAND: 'LANDS?|LANDOWNERS?|LANDHOLDINGS?|LANDHOLDERS?', HOME: 'HOMES?', GAS: 'GAS|GASES', CARE: 'CARE', PARI: 'PARI|PARI-? ?MUTUELS?|PARIMUTUELS?', SPA: 'SPAS?', WIND: 'WIND',
};
// Words that start with a business stem but are something else (CHURCHILL is not a church, WATERPROOFING is not water)
const BLOCK = ['CHURCHILL', 'CITRUST', 'CREMATA', 'JACKSONVILLE', 'MOBILE', 'MOBILITY', 'SOLARES', 'WASTEFUL', 'WATERPROOFING', 'HEALTHY'];
// The law's business phrases, compiled with word boundaries (rule 1)
const cache = new Map();
export function phrases(src) {
  if (!src) return null;
  if (cache.has(src)) return cache.get(src);
  const alts = []; let depth = 0, cls = false, cur = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') { cur += c + (src[++i] || ''); continue; }
    if (cls) { if (c === ']') cls = false; cur += c; continue; }
    if (c === '[') cls = true; else if (c === '(') depth++; else if (c === ')') depth--;
    if (c === '|' && depth === 0) { alts.push(cur); cur = ''; continue; }
    cur += c;
  }
  alts.push(cur);
  const out = new RegExp(alts.filter(a => a !== '').map(a => {
    const last = /[A-Z]$/i.test(a) ? (a.match(/([A-Z]+)$/i) || [])[1] : null;
    if (last && STEMS[last.toUpperCase()]) return '(?<![A-Z0-9])(?:' + a.slice(0, -last.length) + '(?:' + STEMS[last.toUpperCase()] + '))(?![A-Z])';
    const tail = last && last.length <= 4 ? '(?:S|ES|ER|ERS|ING|INGS|ED|ERY|ERIES)?(?![A-Z])'
      : last ? BLOCK.filter(w => w.startsWith(last.toUpperCase()) && w !== last.toUpperCase()).map(w => '(?!' + w.slice(last.length) + '(?![A-Z]))').join('') : '';
    return '(?<![A-Z0-9])(?:' + a + ')' + tail;
  }).join('|'), 'i');
  cache.set(src, out);
  return out;
}
const clean = (s, K) => { let x = ' ' + String(s || '').toUpperCase().replace(/\s+/g, ' ').replace(/\b([A-Z]{2,})PAC\b/g, '$1 PAC') + ' '; x = x.replace(NOT_BUSINESS, ' ').replace(UNGLUE, '$1 ').replace(/\bNEURO(?=PSYCHOLOGIST)/g, 'NEURO '); if (!/ADULT/.test((K && K.re) || '')) x = x.replace(/\bADULT DAY ?CARE\b/g, ' ADULT_DAY_CENTER '); if (!(K && K.realtors)) x = x.replace(REALTY, ' '); return x; };

// "REAL ESTATE" alone does not say which real estate business (developer, broker, investor, landlord): it is not
// matched unless a word next to it says which (REAL ESTATE DEVELOPMENT, COMMERCIAL REAL ESTATE)
const bare = s => s.replace(/(?<!COMMERCIAL |INDUSTRIAL )\bREAL ESTATE\b(?! ?(?:DEV|BUILD|CONSTRUCT))/g, ' ');
// A practitioner noun run into the employer on the report ("PSYCHOLOGISTTOTAL SPECTRUM", "PHYSICIANMAYO CLINIC")
const UNGLUE = /\b(PHYSICIAN|PSYCHOLOGIST|CONTRACTOR|VETERINARIAN|DENTIST|PHARMACIST|CHIROPRACTOR|OPTOMETRIST|PODIATRIST|SURGEON|ARCHITECT|DEVELOPER|BUILDER|FARMER|RANCHER|GROWER)(?=[A-Z]{3,})/g;
// Industry tags that are a kind of business a law can help (the rest are not industries)
const NOT_INDUSTRY = new Set(['political-committee', 'party', 'self', 'individual-noindustry', 'other', 'trade-association', 'lobbying', 'law-firm', 'labor-union', 'unknown']);
// Phrases for a class that gives tags only (no `re`): the business each tag names
export const SECTOR = {
  physicians: 'PHYSICIAN|DOCTOR|M\\.? ?D\\.?|D\\.O\\.|MEDICAL DOCTOR|SURGEON|SURGICAL|PEDIATRIC|OBSTETRIC|GYNECOLOG|OBGYN|OB ?/ ?GYN|INTERNIST|HOSPITALIST|PSYCHIATR|ANESTHESIOLOG|RADIOLOG|CARDIOLOG|DERMATOLOG|ONCOLOG|NEUROLOG|UROLOG|OPHTHALMOLOG|GASTROENTEROLOG|NEPHROLOG|PATHOLOG|ENDOCRINOLOG|PULMONOLOG|RHEUMATOLOG|HEMATOLOG|OTOLARYNGOLOG|ORTHOPA|ORTHOPE|FAMILY MEDICINE|FAMILY PRACTICE|INTERNAL MEDICINE|EMERGENCY MEDICINE|MEDICAL (?:GROUP|PRACTICE|ASSOCIATION|ASSOCIATES|SOCIETY)',
  'autos-dealers': 'AUTO DEALER|AUTOMOBILE DEALER|AUTOMOTIVE RETAILER|AUTO DEALERS|AUTOMOBILE DEALERS|MOTOR VEHICLE DEALERS|AUTOMOTIVE DEALER|CAR DEALER|MOTOR VEHICLE DEALER|DEALERSHIP|AUTOMOBILE DEALERS|AUTO GROUP|AUTONATION|AUTO NATION|CAR PAC|CAR PC|MOTORS|TOYOTA|HONDA|CHEVROLET|NISSAN|LEXUS|MERCEDES|HYUNDAI|SUBARU|BRAMAN|JM FAMILY|LIPTON',
  'pharmacies-pbm': 'PHARMAC|DRUG STORE|WALGREEN|CVS',
  'alcohol-beverage': 'BEVERAGE|BEER|WINE|SPIRITS|LIQUOR|ANHEUSER|BREW|DISTILL|WHOLESALER',
  grocery: 'GROCER|SUPERMARKET|PUBLIX|FOOD STORE|WINN-DIXIE|SOUTHEASTERN GROCERS',
  firearms: 'FIREARM|GUN|AMMUNITION|SIG SAUER|RUGER|SHOOTING SPORTS',
  'private-prisons': 'CORRECTION|GEO GROUP|CORECIVIC|MANAGEMENT & TRAINING',
  'insurance-health': 'HEALTH INSURANCE|HEALTH PLANS?|MOLINA|HUMANA|CENTENE|SUNSHINE HEALTH|SIMPLY HEALTHCARE|AETNA|CIGNA|UNITEDHEALTH|UNITED HEALTHCARE|ELEVANCE|FLORIDA BLUE|BLUE CROSS|MAGELLAN|MANAGED CARE',
  aerospace: 'AEROSPACE|SPACEFLIGHT|ROCKET|AVIATION|AIRCRAFT|BOEING|LOCKHEED|SPACEX|BLUE ORIGIN|NORTHROP|EMBRAER|SPACE FLORIDA',
  'charter-schools': 'CHARTER SCHOOL|ACADEMICA|SCHOOL DEVELOPERS|MATER ACADEMY|SOMERSET ACADEM',
};
const reOf = K => Array.isArray(K) ? (K.map(t => SECTOR[t]).filter(Boolean).join('|') || null) : (K.re || (K.tags || []).map(t => SECTOR[t]).filter(Boolean).join('|') || null);

// Does this gift's donor count for the law with class K? tags: the donor's industry tags (scripts/data/industry)
const notCache = new Map();
const phrasesNot = src => { if (!notCache.has(src)) notCache.set(src, new RegExp(src, 'i')); return notCache.get(src); };
let memo = new WeakMap();
export function fitsLaw(K, name, occ, tags = []) {
  if (!K) return false;
  let M = memo.get(K); if (!M) memo.set(K, M = new Map());
  const mk = name + '\u0000' + occ + '\u0000' + tags.join(',');
  if (!M.has(mk)) M.set(mk, decide(K, name, occ, tags) === true);
  return M.get(mk);
}
// Would this gift count if an official record showed the executive's stake (rule 5)? For the records worklist
// (scripts/data/industry/exec-candidates.json); true only for a person whose occupation names the business with an
// executive title and no owner title, and who does not count today.
export function execPending(K, name, occ, tags = []) {
  if (!K || fitsLaw(K, name, occ, tags)) return false;
  return decide(K, name, occ, tags, 'assume') === 'exec';
}
// The official record that makes this gift count (rule 5), or null when it counts without one or not at all
export function recordFor(K, name, occ, tags = []) {
  if (!K || !fitsLaw(K, name, occ, tags) || decide(K, name, occ, tags, 'assume') !== 'exec') return null;
  return execRecord(K, name, bare(clean(String(occ || '').toUpperCase(), K)));
}
const globalRe = new Map();
const once = f => { const c = new Map(); return (...a) => { const k = a.join('\u0000'); if (!c.has(k)) c.set(k, f(...a)); return c.get(k); }; };
const orgOf = once((N, O) => isOrg(N, O)), unionOf = once((N, O) => isUnion(N, O));
function decide(K, name, occ, tags, mode) {
  if (!Array.isArray(K) && K.conditional && !inSubset(K, name)) return false;
  const want = new Set(Array.isArray(K) ? K : (K.tags || []));
  const re = phrases(reOf(K)), nre = !Array.isArray(K) && K.not ? phrasesNot(K.not) : null;
  if (!want.size && !re) return false;
  if (want.size && !tags.some(x => want.has(x))) return false;
  const N = String(name || '').toUpperCase(), O = String(occ || '').toUpperCase();
  if (nre && nre.test(N + ' | ' + O)) return false;
  if (unionOf(N, O)) return !!K.unions && (!re || re.test(clean(N + ' | ' + O, K)));
  if (orgOf(N, O)) {
    // a company or committee: its own name or reported business is the business (rule 3)
    if (re && re.test(bare(clean(N + ' | ' + O, K)))) return true;
    // a class with tags only: the company's industry tag (from its name and reported business) is the business
    return !(K.re) && tags.some(x => want.has(x) && !NOT_INDUSTRY.has(x));
  }
  // a person: only the reported occupation, never the name (rule 2)
  if (!re && !K.who) return false;
  const o = bare(clean(O, K));
  const who = K.who ? new RegExp('(?<![A-Z])(?:' + K.who + ')', 'i') : null;
  if (who && who.test(o)) return true;
  if (!re) return false;
  // a practitioner or business noun that the law's phrases name (the phrase match covers the noun)
  if (!globalRe.has(re)) globalRe.set(re, new RegExp(re.source, 'gi'));
  const hits = [...o.matchAll(globalRe.get(re))].map(m => [m.index, m.index + m[0].length]);
  for (const p of o.matchAll(PRACT)) { const a = p.index, b = a + p[0].length; if (hits.some(([x, y]) => x < b && a < y)) return true; }
  // an owner role, next to the business itself (the role word is not the business)
  const roles = [...o.matchAll(OWNER)].map(m => m[0]);
  // an executive title without ownership (rule 5); a school principal is not a business principal
  const execs = [...o.matchAll(EXEC)].map(m => m[0]).filter(r => !(r === 'PRINCIPAL' && SCHOOLISH.test(o)));
  if (!roles.length && !execs.length) return false;
  const biz = o.replace(OWNER, ' ').replace(EXEC, ' ');
  // "REAL ESTATE" alone does not say which real estate business (developer, broker, investor, landlord)
  const words = biz.replace(/[^A-Z ]/g, ' ').replace(/\b(?:AND|OF|THE|AT|IN|CO)\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (words === 'REAL ESTATE') return false;
  if (!re.test(bare(biz))) return false;
  if (roles.length) return true;
  // an executive: only with an official record of their stake in that company
  return mode === 'assume' ? 'exec' : !!execRecord(K, name, o);
}

// rule 6: the record that shows this donor is in the subset a conditional benefit is limited to
const inSubset = (K, name) => { const r = (K.subset || {})[donorKey(name)]; return !!(r && r.recordUrl && r.quote); };

// ---- rule 5: executive records ------------------------------------------------------------------------------------
// donor key: the name as reported, upper case, punctuation dropped, single spaces ("SMITH JOHN A")
export const donorKey = n => String(n || '').toUpperCase().replace(/[.,'"]/g, ' ').replace(/\s+/g, ' ').trim();
const RECFILE = new URL('../data/industry/exec-records.json', import.meta.url);
let RECORDS = existsSync(RECFILE) ? JSON.parse(readFileSync(RECFILE, 'utf8')).records || {} : {};
// tests and tools can swap the records (clears the memo)
export function setExecRecords(r) { RECORDS = r || {}; memo = new WeakMap(); }
const CORP = /\b(?:INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|COMPANIES|LLC|L L C|LP|LLP|LTD|PA|P A|PLLC|THE|HOLDINGS?|GROUP)\b/g;
const core = s => ' ' + String(s || '').toUpperCase().replace(/&/g, ' AND ').replace(/[^A-Z0-9 ]/g, ' ').replace(CORP, ' ').replace(/\s+/g, ' ').trim() + ' ';
// The record counts for this occupation when its company is the business the law names: the company's name, or its
// business as an official record states it (`business`: the SEC's industry code or the company's own 10-K line),
// matches the class; or the company is the employer the occupation names (the occupation already names the business)
export function execRecord(K, name, occ) {
  const r = RECORDS[donorKey(name)];
  if (!r || !r.company || !r.recordUrl || !r.quote) return null;
  const re = phrases(reOf(K));
  const c = core(r.company);
  if (c.trim().length < 3) return null;
  if ((re && re.test(bare(clean(r.company + ' | ' + (r.business || ''), K)))) || core(occ).includes(c)) return r;
  return null;
}
