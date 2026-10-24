// Topics for every official action (public/data/decisions.json), so a dossier can show a voter the
// decisions that touch their household: renters see housing, transit riders see roads and transit, and so on.
// Rule-based and auditable: a topic is set only when a listed word or phrase appears in the action's own
// title, its parties, its kind, or (for state laws) the business the staff analysis names. No model output.
// The topic -> household map (GROUPS) uses the same household groups the measure panel asks about
// (public/measure-impact.js), so a voter answers once for the whole ballot.
// Run: node scripts/action-topics.mjs  (writes a.topics on every action; idempotent)
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../public/data/decisions.json', import.meta.url);
const d = JSON.parse(readFileSync(FILE));

// Order matters only for readability; an action can have several topics.
export const RULES = [
  ['housing', /\b(housing|affordable|workforce hous|apartment|rental|renter|tenant|landlord|homeless|dwelling|condominium|condo\b|townhome|townhouse|single-family|multifamily|multi-family|dwelling units?|residential|live local|mobile home|veterans? housing)/i],
  ['development', /\b(zoning|rezon|land use|variance|site plan|plat\b|replat|special (use|exception)|conditional use|development agreement|master development|\bmda\b|pattern book|development order|comprehensive plan|annex|setback|height|density|mixed[- ]use|subdivision|vacat(e|ion) .*(alley|right[- ]of[- ]way|street)|right[- ]of[- ]way vacation|real estate developer|infill|brownfield)/i],
  ['taxes', /\b(millage|property tax|ad valorem|tax(es)?\b|special assessment|tax assessment|impact fee|user fees?|fee increase|stormwater fee|solid waste fee|utility rate|rate increase|business tax|surtax|non-?ad valorem|tax credit|tax break|tax exemption|homestead exemption)/i],
  ['insurance', /\b(property insur|homeowners? insur|citizens property|windstorm|reinsurance|insurers?\b)/i],
  ['transit', /\b(transit|bus\b|buses|trolley|metrorail|rail\b|road(way)?s?\b|street|traffic|signal|intersection|sidewalk|crosswalk|parking|garage|bike|bicycl|pedestrian|resurfac|paving|highway|bridges?\b(?! housing)|i-\d+|turnpike|ride[- ]hail|transportation network|freebee|on-demand|shuttle|toll)/i],
  ['parks', /\b(park\b|parks\b|recreation|playground|athletic|ball ?field|playing field|turf field|stadium|pool\b|aquatic|beach (park|access|renourish|restoration)|beaches|marina|boat|golf|tennis|zoo|trail|greenway|nature|botanic|gym\b|youth center|community center|splash)/i],
  ['schools', /\b(school|charter|education|student|teacher|academy|college|universit|pre-?k|preschool|daycare|day care|child care|after-?school|youth program|scholarship|literacy|tutoring)/i],
  ['libraries', /\blibrar(y|ies)\b/i],
  ['seniors', /\b(senior|elderly|elder|aging|older adult|meals on wheels|assisted living|nursing home|pace provider|alzheimer)/i],
  ['health', /\b(health|hospital|clinic|medical|medicaid|mental|behavioral|substance|addiction|pharmac|physician|surgery|dental|vaccin|ambulance|ems\b|emergency medical)/i],
  ['police', /\b(police|sheriff|law enforcement|public safety|crime prevention|body[- ]worn|camera|license plate reader|lpr\b|security guard|security services|jail|prison|correction)/i],
  ['fire', /\b(fire\b|fire rescue|firefighter|fire station|fire alarm|sprinkler|hurricane|emergency management|evacuat)/i],
  ['water', /\b(water(?! heater)|sewer|wastewater|stormwater|drainage|flood|resilien|seawall|septic|pump station|lift station|canal)/i],
  ['trash', /\b(solid waste|garbage|trash|recycl|sanitation|waste collection|bulk pickup|landfill)/i],
  ['business', /\b(small business|business\b|businesses|business licens|liquor licens|permit fee|liquor|alcohol|beverage|nightlife|bar\b|restaurant|vendor program|economic development|grant to (businesses|merchants)|merchant|retail|cardroom|pari-?mutuel|casino|lottery retailer|pawn|towing|contractor licens|food truck|special event permit|sidewalk caf)/i],
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
const KIND = { zoning: 'development', landuse: 'development', plat: 'development', easement: 'development', permit: 'business' };
const L = x => (x && typeof x === 'object' ? (x.en || '') : String(x || ''));

export function topicsOf(a) {
  const text = [L(a.subject), L(a.title), (a.parties || []).join(' '), a.ref || ''].join(' | ');
  const t = new Set();
  for (const [k, re] of RULES) if (re.test(text)) t.add(k);
  if (KIND[a.kind]) t.add(KIND[a.kind]);
  // A state or federal law: the business its analysis names is what it does
  if (a.kind === 'bill' && a.note) { const n = L(a.note); const m = n.match(/helps ([^:]+):/); if (m) for (const [k, re] of RULES) if (re.test(m[1])) t.add(k); }
  // "homes" in a zoning item's title is development near people, and housing when units are added
  return [...t];
}

let n = 0, none = 0;
const count = {};
for (const B of d.bodies) for (const a of B.actions) {
  a.topics = topicsOf(a);
  n++; if (!a.topics.length) none++;
  for (const x of a.topics) count[x] = (count[x] || 0) + 1;
}
writeFileSync(FILE, JSON.stringify(d, null, 1) + '\n');
console.log(`${n} actions, ${none} with no topic;`, JSON.stringify(count));
