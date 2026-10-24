// Topics for every official action (public/data/decisions.json), so a dossier can show a voter the
// decisions that touch their household: renters see housing, transit riders see roads and transit, and so on.
// Rule-based and auditable: a topic is set only when a listed word or phrase appears in the action's own
// title, its parties, its kind, or (for state laws) the business the staff analysis names. No model output.
// The topic -> household map (GROUPS) uses the same household groups the measure panel asks about
// (public/measure-impact.js), so a voter answers once for the whole ballot.
// Run: node scripts/action-topics.mjs  (writes a.topics on every action; idempotent)
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../public/data/decisions.json', import.meta.url);

// Order matters only for readability; an action can have several topics.
export const RULES = [
  ['housing', /\b(housing|affordable (housing|homes|units|rental)|workforce hous|apartment|rental (housing|units|assistance)|renter|tenant|landlord|homeless|condominium|condo\b|townhome|townhouse|single-family|multifamily|multi-family|dwelling units?|\d+[- ](residential |housing )?units|\d+ homes|(?<!funeral |nursing |group |mobile )\bhomes\b|residential (units|development|project|tower|building)|live local|mobile home|veterans? housing|\bship\b|home (repair|rehab)|homebuyer|homeownership|down payment)/i],
  ['development', /\b(zoning|rezon|land use|variance|site plan|plat\b|replat|special (use|exception)|conditional use|development agreement|master development|\bmda\b|pattern book|development order|comprehensive plan|annex|setback|height|density|mixed[- ]use|subdivision|vacat(e|ion) .*(alley|right[- ]of[- ]way|street)|right[- ]of[- ]way vacation|real estate developer|infill|brownfield)/i],
  ['taxes', /\b(millage|property tax|ad valorem|tax(es)?\b|special assessment|tax assessment|impact fee|user fees?|fee increase|stormwater fee|solid waste fee|utility rate|rate increase|business tax|surtax|non-?ad valorem|tax credit|tax break|tax exemption|homestead exemption)/i],
  ['insurance', /\b(property insur|homeowners? insur|citizens property|windstorm|reinsurance|insurers?\b)/i],
  ['transit', /\b(transit(?!ion)|bus\b|buses|trolley|metrorail|rail\b|(?<!jericho )road(way)?s?\b(?! rescue| finishers| to housing)|street|traffic(?!king)|signal|intersection|sidewalk|crosswalk|parking|garage|bike|bicycl|pedestrian|resurfac|paving|highway|bridges?\b(?! housing)|i-\d+\b(?! industrial| zon| district)|turnpike|right[- ]of[- ]way|streetscape|road reconstruction|ride[- ]hail|transportation network|freebee|on-demand|shuttle|toll)/i],
  ['parks', /\b(park\b|parks\b|recreation|playground|athletic|ball ?field|playing field|turf field|stadium|swimming pool|pool (renovation|resurfac|repair|deck)|aquatic|lifeguard|youth sports|beach (park|access|renourish|restoration)|beaches|marina|boat|golf|tennis|zoo|trail|greenway|nature|botanic|gym\b|youth center|community center|splash)/i],
  ['schools', /\b(school|charter|education|student|teacher|academy|college|universit|pre-?k|preschool|daycare|day care|child care|after-?school|youth program|scholarship|literacy|tutoring)/i],
  ['libraries', /\blibrar(y|ies)\b/i],
  ['seniors', /\b(senior|elderly|elder|aging|older adult|meals on wheels|assisted living|nursing home|pace provider|alzheimer)/i],
  ['health', /\b(health|hospital(?!ity)|clinic|suicide|counseling|outpatient|treatment facility|cardiac|aeds?\b|medical|medicaid|mental|behavioral|substance|addiction|pharmac|physician|surgery|dental|vaccin|ambulance|ems\b|emergency medical)/i],
  ['police', /\b(police|sheriff|law enforcement|public safety|crime prevention|body[- ]worn|camera|license plate reader|lpr\b|security guard|security services|jail|prison|correction)/i],
  ['fire', /\b(fire\b|fire rescue|firefighter|fire station|fire alarm|sprinkler|hurricane|emergency management|evacuat|disaster)/i],
  ['water', /\b(water(?! heater)|sewer|wastewater|stormwater|drainage|flood|resilien|seawall|septic|pump station|lift station|canal|force main|water main|hypochlorite|water treatment)/i],
  ['trash', /\b(solid waste|garbage|trash|recycl|sanitation|waste collection|bulk pickup|landfill|debris)/i],
  ['business', /\b(small business|(?<!comcast |toshiba |amazon )business\b|businesses|business licens|liquor licens|permit fee|liquor|alcohol|beverage|nightlife|bar\b(?! association)|restaurant|vendor program|economic development|grant to (businesses|merchants)|merchant|retail|cardroom|pari-?mutuel|casino|lottery retailer|pawn|towing|contractor licens|food truck|sidewalk caf)/i],
  ['labor', /\b(union|collective bargaining|bargaining unit|pension|retirement plan|salar(y|ies)|wage|cost of living|employees?\b.*(contract|agreement)|fop\b|iaff|afscme|teamsters|cwa\b)/i],
  ['farming', /\b(farm|agricultur|grower|nursery|citrus|cattle|ranch|packinghouse)/i],
];
// Which household groups (public/measure-impact.js GROUPS) each topic touches. 'all' = services every
// resident uses; shown to everyone.
export const GROUPS = {
  housing: ['renter', 'homestead', 'owner_other'], development: ['homestead', 'owner_other'], taxes: ['homestead', 'owner_other', 'business'],
  insurance: ['homestead', 'owner_other'], transit: ['transit'], parks: ['park_user'], schools: ['school_parent', 'school_staff'],
  libraries: ['library'], seniors: ['senior'], labor: ['public_employee'], business: ['business'], farming: ['farm'],
  health: ['all'], police: ['all'], fire: ['all'], water: ['all'], trash: ['all'],
};
const KIND = { zoning: 'development', landuse: 'development', plat: 'development', easement: 'development' };  // a permit is business only when its words say so (alcohol, vendor), not a church procession
const L = x => (x && typeof x === 'object' ? (x.en || '') : String(x || ''));

export function topicsOf(a) {
  // The item's own words only: a vendor's name (Academy Bus, Affordable Interior Systems) is not a topic
  // Street addresses are where, not what: "981 East 13th Street" is not a roads item, nor is a Ford Transit van
  const text = [L(a.subject), L(a.title)].join(' | ')
    .replace(/\b\d+(-\d+)?\s+([NSEW]\.?|North|South|East|West|NE|NW|SE|SW)?\s*[\w.]+(\s+[\w.]+)?\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Court|Ct|Place|Pl|Terrace|Ter|Way|Lane|Ln|Parkway|Pkwy|Causeway|Highway|Hwy)\b\.?/g, ' ')
    .replace(/\b(\d+(-\d+)?\s+)?((NE|NW|SE|SW|N|S|E|W)\.?\s+)\d+(st|nd|rd|th)?\s+(Street|St|Avenue|Ave|Road|Rd|Court|Ct|Place|Pl|Terrace|Terr|Ter|Way|Lane|Ln|Drive|Dr)\b\.?/g, ' ')
    .replace(/\bFord Transit\b/gi, 'Ford van');
  const t = new Set();
  for (const [k, re] of RULES) if (re.test(text)) t.add(k);
  if (KIND[a.kind]) t.add(KIND[a.kind]);
  // A parking variance on a private lot is building and zoning, not roads and transit
  if (t.has('transit') && /variance|waiver/i.test(text) && !/\b(transit(?!ion)|bus(es)?\b|road|street|traffic(?!king)|sidewalk|bike)/i.test(text.replace(/parking/ig, ''))) t.delete('transit');
  // Resurfacing a park's courts or fields is parks, not roads
  if (t.has('transit') && t.has('parks') && !RULES.find(r => r[0] === 'transit')[1].test(text.replace(/resurfac\w*|paving/ig, ''))) t.delete('transit');
  // University research earmarks are not schools a family uses
  if (t.has('schools') && a.kind === 'request' && /universit|college/i.test(text) && /research|institute|lab|center for/i.test(text) && !/student|scholar|teacher|k-12|school\b/i.test(text)) t.delete('schools');
  // A state or federal law: the business its analysis names is what it does
  if (a.kind === 'bill' && a.note) { const n = L(a.note); const m = n.match(/helps ([^:]+):/); if (m) for (const [k, re] of RULES) if (re.test(m[1])) t.add(k); }
  // "homes" in a zoning item's title is development near people, and housing when units are added
  return [...t];
}

// Run as a script: tag every action. Imported (scripts/you-files.mjs): only topicsOf and the rules.
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
const d = JSON.parse(readFileSync(FILE));
let n = 0, none = 0;
const count = {};
for (const B of d.bodies) for (const a of B.actions) {
  a.topics = topicsOf(a);
  n++; if (!a.topics.length) none++;
  for (const x of a.topics) count[x] = (count[x] || 0) + 1;
}
writeFileSync(FILE, JSON.stringify(d, null, 1) + '\n');
console.log(`${n} actions, ${none} with no topic;`, JSON.stringify(count));
}
