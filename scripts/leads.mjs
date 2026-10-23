// Conflict-of-interest lead finder. Looks for possible connections between officials and the parties,
// donors, lobbyists and vendors in the data, and writes them as UNCONFIRMED leads for review. A lead
// is a hypothesis. It reaches the public only after review confirms it with an official record that
// states the relationship (scripts/data/leads/review.json). Nothing here is published on its own.
//
//   node scripts/leads.mjs            # rebuild scripts/data/leads/auto.json and public/data/connections.json
//
// Signals (each lead names its signal and the evidence):
//   surname        an official's last name appears as a donor, lobbyist, vendor officer or party name
//   address        a donor, lobbyist or vendor address equals an address on the official's own disclosure
//                  or a business the official lists (from scripts/data/disclosures when present)
//   employer       a donor's reported employer or occupation names a party on an item the official voted on
//   officer        the official is listed as an officer or agent of an entity that is a party, vendor or donor
//                  (from the disclosures register's sunbiz rows)
//   stated         the official's own disclosure lists a business or income source that is a party or vendor
//
// Auto-confirmed (because the signal itself is an official record of the relationship): officer, stated.
// Never auto-confirmed: surname (needs a record stating the family relationship), address, employer.
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const pub = p => JSON.parse(fs.readFileSync(path.join(here, '..', 'public', 'data', p), 'utf8'));
const decisions = pub('decisions.json');
const roster = pub('roster.json');
const countyLobby = pub('county-lobbyists.json');
const schoolLobby = pub('school-board-lobbyists.json');
const upcoming = fs.existsSync(path.join(here, '..', 'public', 'data', 'upcoming.json')) ? pub('upcoming.json') : { meetings: [], procurement: [], payments: [] };
const leadsDir = path.join(here, 'data', 'leads');
fs.mkdirSync(leadsDir, { recursive: true });
const reviewPath = path.join(leadsDir, 'review.json');
const review = fs.existsSync(reviewPath) ? JSON.parse(fs.readFileSync(reviewPath, 'utf8')) : { note: 'Hand review of leads. status: confirmed | dismissed. A confirmed lead needs relationship and record (the official record that states it, with URL). Edit by hand.', leads: {} };

// Disclosures register (optional; lands from research).
const discDir = path.join(here, 'data', 'disclosures');
const disclosures = [];
if (fs.existsSync(discDir)) for (const f of fs.readdirSync(discDir).filter(f => f.endsWith('.json'))) {
  try { disclosures.push(JSON.parse(fs.readFileSync(path.join(discDir, f), 'utf8'))); } catch (e) { console.log('  !', f, 'not valid JSON'); }
}

const SUFFIX = /\b(inc|incorporated|llc|lllp|llp|lp|ltd|corp|corporation|co|company|the|of|florida|fl|pa|pllc|dba|jr|sr|ii|iii|esq)\b/g;
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(SUFFIX, ' ').replace(/\s+/g, ' ').trim();
const normAddr = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|court|ct|suite|ste|floor|fl|unit|apt|#)\b/g, ' ').replace(/\s+/g, ' ').trim();
const lastName = full => { const n = norm(full); if (!n) return ''; if (full.includes(',')) return n.split(' ')[0]; const parts = n.split(' '); return parts[parts.length - 1]; };
const COMMON = new Set(['garcia', 'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez', 'perez', 'sanchez', 'ramirez', 'torres', 'diaz', 'fernandez', 'gomez', 'cruz', 'rivera', 'morales', 'ortiz', 'reyes', 'alvarez', 'castillo', 'jimenez', 'ruiz', 'williams', 'johnson', 'smith', 'brown', 'jones', 'davis', 'miller', 'wilson', 'moore', 'taylor', 'anderson', 'thomas', 'jackson', 'white', 'harris', 'martin', 'thompson', 'robinson', 'lewis', 'walker', 'young', 'allen', 'king', 'wright', 'scott', 'green', 'baker', 'adams', 'nelson', 'hill', 'campbell', 'mitchell', 'roberts', 'carter', 'phillips', 'evans', 'turner', 'parker', 'collins', 'edwards', 'stewart', 'morris', 'murphy', 'cook', 'rogers', 'cooper', 'peterson', 'bailey', 'reed', 'kelly', 'howard', 'ward', 'cox', 'richardson', 'wood', 'watson', 'brooks', 'bennett', 'gray', 'james', 'hughes', 'price', 'sanders', 'myers', 'long', 'ross', 'foster', 'powell', 'jenkins', 'perry', 'russell', 'sullivan', 'bell', 'coleman', 'butler', 'henderson', 'barnes', 'fisher', 'vasquez', 'simmons', 'romero', 'jordan', 'patterson', 'alexander', 'hamilton', 'graham', 'reynolds', 'griffin', 'wallace', 'moreno', 'west', 'cole', 'hayes', 'bryant', 'herrera', 'gibson', 'ellis', 'tran', 'medina', 'aguilar', 'stevens', 'murray', 'ford', 'castro', 'marshall', 'owens', 'harrison', 'fernandes', 'mcdonald', 'woods', 'washington', 'kennedy', 'wells', 'vargas', 'henry', 'chen', 'freeman', 'webb', 'tucker', 'guzman', 'burns', 'crawford', 'olson', 'simpson', 'porter', 'hunter', 'gordon', 'mendez', 'silva', 'shaw', 'snyder', 'mason', 'dixon', 'munoz', 'hunt', 'hicks', 'holmes', 'palmer', 'wagner', 'black', 'robertson', 'boyd', 'rose', 'stone', 'salazar', 'fox', 'warren', 'mills', 'meyer', 'rice', 'schmidt', 'daniels', 'ferguson', 'nichols', 'stephens', 'soto', 'weaver', 'ryan', 'gardner', 'payne', 'grant', 'dunn', 'kelley', 'spencer', 'hawkins', 'arnold', 'pierce', 'vazquez', 'hansen', 'peters', 'santos', 'hart', 'bradley', 'knight', 'elliott', 'cunningham', 'duncan', 'armstrong', 'hudson', 'carroll', 'lane', 'riley', 'andrews', 'alvarado', 'ray', 'delgado', 'berry', 'perkins', 'hoffman', 'johnston', 'matthews', 'pena', 'richards', 'contreras', 'willis', 'carpenter', 'lawrence', 'sandoval', 'guerrero', 'george', 'chapman', 'rios', 'estrada', 'ortega', 'watkins', 'greene', 'nunez', 'wheeler', 'valdez', 'harper', 'burke', 'larson', 'santiago', 'maldonado', 'morrison', 'franklin', 'carlson', 'austin', 'dominguez', 'carr', 'lawson', 'jacobs', 'obrien', 'lynch', 'singh', 'vega', 'bishop', 'montgomery', 'oliver', 'jensen', 'harvey', 'williamson', 'gilbert', 'dean', 'sims', 'espinoza', 'howell', 'li', 'wong', 'reid', 'hanson', 'le', 'mccoy', 'garrett', 'burton', 'fuller', 'wang', 'weber', 'welch', 'rojas', 'lucas', 'marquez', 'fields', 'park', 'yang', 'little', 'banks', 'padilla', 'day', 'walsh', 'bowman', 'schultz', 'luna', 'fowler', 'mejia', 'davidson', 'acosta', 'brewer', 'may', 'holland', 'juarez', 'newman', 'pearson', 'curtis', 'cortez', 'douglas', 'schneider', 'joseph', 'barrett', 'navarro', 'figueroa', 'keller', 'avila', 'wade', 'molina', 'stanley', 'hopkins', 'campos', 'barnett', 'bates', 'chambers', 'caldwell', 'beck', 'lambert', 'miranda', 'byrd', 'craig', 'ayala', 'lowe', 'frazier', 'powers', 'neal', 'leonard', 'gregory', 'carrillo', 'sutton', 'fleming', 'rhodes', 'shelton', 'schwartz', 'norris', 'jennings', 'watts', 'duran', 'walters', 'cohen', 'mcdaniel', 'moran', 'parks', 'steele', 'vaughn', 'becker', 'holt', 'deleon', 'barker', 'terry', 'hale', 'leon', 'hail', 'benson', 'haynes', 'horton', 'miles', 'lyons', 'pham', 'graves', 'bush', 'thornton', 'wolfe', 'warner', 'cabrera', 'mckinney', 'mann', 'zimmerman', 'dawson', 'lara', 'fletcher', 'page', 'mccarthy', 'love', 'robles', 'cervantes', 'solis', 'erickson', 'reeves', 'chang', 'klein', 'salinas', 'fuentes', 'baldwin', 'daniel', 'simon', 'velasquez', 'hardy', 'higgins', 'aguirre', 'lin', 'cummings', 'chandler', 'sharp', 'barber', 'bowen', 'ochoa', 'dennis', 'robbins', 'liu', 'ramsey', 'francis', 'griffith', 'paul', 'blair', 'oconnor', 'cardenas', 'pacheco', 'cross', 'calderon', 'quinn', 'moss', 'swanson', 'chan', 'rivas', 'khan', 'rodgers', 'serrano', 'fitzgerald', 'rosales', 'stevenson', 'christensen', 'manning', 'gill', 'curry', 'mclaughlin', 'harmon', 'mcgee', 'gross', 'doyle', 'garner', 'newton', 'burgess', 'reese', 'walton', 'blake', 'trujillo', 'adkins', 'brady', 'goodman', 'roman', 'webster', 'goodwin', 'fischer', 'huang', 'potter', 'delacruz', 'montoya', 'todd', 'wu', 'hines', 'mullins', 'castaneda', 'malone', 'cannon', 'tate', 'mack', 'sherman', 'hubbard', 'hodges', 'zhang', 'guerra', 'wolf', 'valencia', 'saunders', 'franco', 'rowe', 'gallagher', 'farmer', 'hammond', 'hampton', 'townsend', 'ingram', 'wise', 'gallegos', 'clarke', 'barton', 'schroeder', 'maxwell', 'waters', 'logan', 'camacho', 'strickland', 'norman', 'person', 'colon', 'parsons', 'frank', 'harrington', 'glover', 'osborne', 'buchanan', 'casey', 'floyd', 'patton', 'ibarra', 'ball', 'tyler', 'suarez', 'bowers', 'orozco', 'salas', 'cobb', 'gibbs', 'andrade', 'bauer', 'conner', 'moody', 'escobar', 'mcguire', 'lloyd', 'mueller', 'hartman', 'french', 'kramer', 'mcbride', 'pope', 'lindsey', 'velazquez', 'norton', 'mccormick', 'sparks', 'flynn', 'yates', 'hogan', 'marsh', 'macias', 'villanueva', 'zamora', 'pratt', 'stokes', 'owen', 'ballard', 'lang', 'brock', 'villarreal', 'charles', 'drake', 'barrera', 'cain', 'patrick', 'pineda', 'burnett', 'mercado', 'santana', 'shepherd', 'bautista', 'ali', 'shaffer', 'lamb', 'trevino', 'mckenzie', 'hess', 'beil', 'olsen', 'cochran', 'morton', 'nash', 'wilkins', 'petersen', 'briggs', 'shah', 'roth', 'nicholson', 'holloway', 'lozano', 'flowers', 'rangel', 'hoover', 'arias', 'short', 'mora', 'valenzuela', 'bryan', 'meyers', 'weiss', 'underwood', 'bass', 'greer', 'summers', 'houston', 'carson', 'morrow', 'clayton', 'whitaker', 'decker', 'yoder', 'collier', 'zuniga', 'carey', 'wilcox', 'melendez', 'poole', 'roberson', 'larsen', 'conley', 'davenport', 'copeland', 'massey', 'lam', 'huff', 'rocha', 'cameron', 'jefferson', 'hood', 'monroe', 'anthony', 'pittman', 'huynh', 'randall', 'singleton', 'kirk', 'combs', 'mathis', 'christian', 'skinner', 'bradford', 'richard', 'galvan', 'wall', 'boone', 'kirby', 'wilkinson', 'bridges', 'bruce', 'atkinson', 'velez', 'meza', 'roy', 'vincent', 'york', 'hodge', 'villa', 'abbott', 'allison', 'tapia', 'gates', 'chase', 'sosa', 'sweeney', 'farrell', 'wyatt', 'dalton', 'horn', 'barron', 'phelps', 'yu', 'dickerson', 'heath', 'foley', 'atkins', 'mathews', 'bonilla', 'acevedo', 'benitez', 'zavala', 'hensley', 'glenn', 'cisneros', 'harrell', 'shields', 'rubio', 'choi', 'huffman', 'boyer', 'garrison', 'arroyo', 'bond', 'kane', 'hancock', 'callahan', 'dillon', 'cline', 'wiggins', 'grimes', 'arellano', 'melton', 'oneill', 'savage', 'ho', 'beltran', 'pitts', 'parrish', 'ponce', 'rich', 'booth', 'koch', 'golden', 'ware', 'brennan', 'mcdowell', 'marks', 'cantu', 'humphrey', 'baxter', 'sawyer', 'clark', 'hall', 'nguyen', 'lee', 'kim', 'rosario', 'alonso', 'alfonso', 'cordero', 'blanco', 'cuevas', 'lugo', 'nieves', 'pina', 'prieto', 'quintana', 'rosas', 'tejeda', 'toledo', 'valle', 'vera', 'vidal', 'zapata', 'abreu', 'batista', 'bello', 'calvo', 'campo', 'cardona', 'carvajal', 'ceballos', 'chavez', 'conde', 'cordoba', 'correa', 'cortes', 'cruz', 'de la cruz', 'del valle', 'duarte', 'echeverria', 'escalante', 'espinosa', 'esquivel', 'fuentes', 'gallardo', 'gamboa', 'gil', 'giraldo', 'guevara', 'gutierrez', 'izquierdo', 'lara', 'leal', 'ledesma', 'lemus', 'marin', 'mata', 'mena', 'mendoza', 'merino', 'mesa', 'montero', 'mora', 'morejon', 'naranjo', 'nava', 'ocampo', 'ojeda', 'olivares', 'ordonez', 'orellana', 'osorio', 'otero', 'pacheco', 'palacios', 'pardo', 'paredes', 'parra', 'paz', 'pedraza', 'pereira', 'pinto', 'pizarro', 'quesada', 'quiroga', 'ramos', 'rendon', 'restrepo', 'reyna', 'rincon', 'rivero', 'roa', 'robaina', 'rosa', 'rubio', 'saavedra', 'salgado', 'sanabria', 'sandoval', 'santamaria', 'sarmiento', 'segura', 'sierra', 'soler', 'sotelo', 'tamayo', 'tellez', 'toro', 'trejo', 'uribe', 'valdes', 'valladares', 'vallejo', 'varela', 'vasquez', 'ventura', 'vergara', 'villalobos', 'villegas', 'zambrano', 'zayas', 'zepeda']);

// Officials: everyone seated today on the local bodies we track.
const today = new Date().toISOString().slice(0, 10);
const officeById = new Map(roster.offices.map(o => [o.id, o]));
const seated = roster.terms.filter(t => (t.start == null || t.start <= today) && (t.end != null ? t.end >= today : !(t.endKnown === false && (t.lastSeen || t.endBy || /^Former member/.test(t.note || '')))));
const LOCAL = new Set(['county', 'school', 'municipal']);
const officials = [];
const seen = new Set();
for (const t of seated) {
  const o = officeById.get(t.office); if (!o || !LOCAL.has(o.level)) continue;
  if (seen.has(t.person)) continue; seen.add(t.person);
  const p = roster.people.find(x => x.id === t.person); if (!p) continue;
  const names = [p.name, ...(p.aliases || [])];
  officials.push({ person: p.id, name: p.name, office: o.id, body: o.body, lastNames: [...new Set(names.map(lastName).filter(Boolean))] });
}

const leads = [];
function addLead(l) {
  const key = [l.signal, l.person, norm(l.other), l.otherKind].join('|');
  const existing = leads.find(x => x.key === key);
  if (existing) { for (const e of l.evidence) if (!existing.evidence.some(y => y.url === e.url && y.note === e.note)) existing.evidence.push(e); return; }
  leads.push({ key, ...l });
}

// Signal: surname. The official's last name inside a donor, lobbyist, vendor or party name on items of their own body.
function surnameLeads() {
  const bodyByRoster = new Map(decisions.bodies.map(b => [b.rosterBody, b]));
  for (const of of officials) {
    const b = bodyByRoster.get(of.body); if (!b) continue;
    for (const ln of of.lastNames) {
      if (ln.length < 4) continue;
      const common = COMMON.has(ln);
      const re = new RegExp('\\b' + ln.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
      for (const a of b.actions || []) {
        for (const g of a.gifts || []) {
          if (g.to && b.members && b.members.find(m => m.key === g.to && m.person === of.person)) continue; // the official's own account is not a lead
          if (re.test(norm(g.donor)) && !sameFirst(g.donor, of.name)) addLead({ signal: 'surname', person: of.person, official: of.name, other: g.donor, otherKind: 'donor', weak: common, evidence: [{ note: 'gift $' + g.amount + ' on ' + g.date + ' to ' + g.to + ' (' + g.acct + '), tied to item ' + a.id, url: (a.links || []).map(l => l.url)[0] || null }] });
        }
        for (const l of a.lobbied || []) if (re.test(norm(l.name))) addLead({ signal: 'surname', person: of.person, official: of.name, other: l.name, otherKind: 'lobbyist', weak: common, evidence: [{ note: 'registered for ' + (l.for || l.principal) + ' on item ' + a.id + ' (' + a.date + ')', url: (a.links || []).map(l => l.url)[0] || null }] });
        for (const p of a.parties || []) if (re.test(norm(p))) addLead({ signal: 'surname', person: of.person, official: of.name, other: p, otherKind: 'party', weak: common, evidence: [{ note: 'party on item ' + a.id + ' (' + a.date + '), ' + (of.name) + ' voted ' + ((a.roll || {})[(b.members.find(m => m.person === of.person) || {}).key] || 'n/a'), url: (a.links || []).map(l => l.url)[0] || null }] });
      }
    }
  }
  // Lobbyist registries.
  for (const [reg, body] of [[countyLobby, 'mdc-commission'], [schoolLobby, 'mdcps-board']]) {
    for (const of of officials.filter(o => o.body === body)) for (const ln of of.lastNames) {
      if (ln.length < 4) continue;
      const re = new RegExp('\\b' + ln.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
      for (const l of reg.lobbyists || []) if (re.test(norm(l.name)) && !sameFirst(l.name, of.name)) addLead({ signal: 'surname', person: of.person, official: of.name, other: l.name, otherKind: 'registered lobbyist', weak: COMMON.has(ln), evidence: [{ note: 'registered with ' + body + ' for ' + (l.clients || []).slice(0, 3).map(c => Array.isArray(c) ? c[0] : c).join('; ') + ((l.clients || []).length > 3 ? ' and ' + ((l.clients || []).length - 3) + ' more' : ''), url: reg.source && reg.source.url || null }] });
    }
  }
  // Vendors and parties in the upcoming, procurement and payments registers.
  for (const of of officials) for (const ln of of.lastNames) {
    if (ln.length < 4) continue;
    const re = new RegExp('\\b' + ln.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
    for (const m of upcoming.meetings || []) if (m.rosterBody === of.body) for (const it of m.items || []) for (const p of it.parties || []) if (re.test(norm(p))) addLead({ signal: 'surname', person: of.person, official: of.name, other: p, otherKind: 'party on upcoming item', weak: COMMON.has(ln), evidence: [{ note: 'item ' + it.id + ' on ' + m.meeting.date, url: (it.links || []).map(l => l.url)[0] || null }] });
    for (const pr of upcoming.payments || []) if (pr.rosterBody === of.body) for (const v of (pr.vendors && pr.vendors.top) || []) if (re.test(norm(v.vendor))) addLead({ signal: 'surname', person: of.person, official: of.name, other: v.vendor, otherKind: 'vendor', weak: COMMON.has(ln), evidence: [{ note: 'paid $' + v.amount + ' (' + pr.vendors.period + ')', url: v.source || null }] });
  }
}
function sameFirst(a, b) { const x = norm(a).split(' '), y = norm(b).split(' '); return x.length > 1 && y.length > 1 && (x[0] === y[0] || x[x.length - 1] === y[0] && x[0] === y[y.length - 1]); }

// Signal: employer. A donor whose reported employer or occupation names a party on an item the official voted on.
function employerLeads() {
  for (const b of decisions.bodies) {
    const memberPerson = new Map((b.members || []).map(m => [m.key, m.person]));
    for (const a of b.actions || []) for (const g of a.gifts || []) {
      const occ = norm(g.occ);
      if (!occ || occ.length < 6) continue;
      for (const p of a.parties || []) {
        const np = norm(p);
        if (np.length >= 8 && (occ.includes(np) || np.includes(occ))) {
          const person = memberPerson.get(g.to); if (!person) continue;
          addLead({ signal: 'employer', person, official: (b.members.find(m => m.key === g.to) || {}).name, other: g.donor, otherKind: 'donor who reports working for a party', weak: false, evidence: [{ note: 'reported occupation "' + g.occ + '" matches party ' + p + ' on item ' + a.id + ' (' + a.date + '); gift $' + g.amount + ' on ' + g.date, url: (a.links || []).map(l => l.url)[0] || null }] });
        }
      }
    }
  }
}

// Signals from the disclosures register: stated interests and Sunbiz officer rows, matched to parties, vendors and donors of the official's body.
function disclosureLeads() {
  const bodyByRoster = new Map(decisions.bodies.map(b => [b.rosterBody, b]));
  for (const d of disclosures) for (const of of d.officials || []) {
    const bodyKey = of.office && officeById.get(of.office) ? officeById.get(of.office).body : d.rosterBody;
    const b = bodyByRoster.get(bodyKey);
    const names = [];
    for (const f of of.forms || []) {
      for (const x of f.businesses || []) names.push({ name: x.name, kind: 'stated business (' + f.type + ' ' + f.year + ')', url: f.url, auto: true });
      for (const x of f.incomeSources || []) names.push({ name: x.source, kind: 'stated income source (' + f.type + ' ' + f.year + ')', url: f.url, auto: true });
      for (const x of f.assets || []) if (x.kind === 'business interest') names.push({ name: x.name, kind: 'stated asset (' + f.type + ' ' + f.year + ')', url: f.url, auto: true });
    }
    for (const x of of.sunbiz || []) names.push({ name: x.entity, kind: 'Sunbiz ' + (x.role || 'officer') + ' (' + x.basis + ')', url: x.url, auto: x.basis === 'name and filed address match' });
    const addrs = [];
    for (const x of of.sunbiz || []) if (x.address) addrs.push({ addr: x.address, kind: 'Sunbiz address of ' + x.entity, url: x.url });
    const targets = [];
    if (b) for (const a of b.actions || []) {
      for (const p of a.parties || []) targets.push({ name: p, kind: 'party', note: 'item ' + a.id + ' (' + a.date + ')', url: (a.links || []).map(l => l.url)[0] || null, addr: null });
      for (const g of a.gifts || []) targets.push({ name: g.donor, kind: 'donor', note: 'gift $' + g.amount + ' on ' + g.date + ' to ' + g.to, url: (a.links || []).map(l => l.url)[0] || null, addr: g.addr || null });
      for (const l of a.lobbied || []) targets.push({ name: l.for || l.principal, kind: 'lobbying principal', note: 'item ' + a.id + ' (' + a.date + ')', url: (a.links || []).map(l => l.url)[0] || null, addr: null });
    }
    for (const m of upcoming.meetings || []) if (m.rosterBody === bodyKey) for (const it of m.items || []) for (const p of it.parties || []) targets.push({ name: p, kind: 'party on upcoming item', note: 'item ' + it.id + ' on ' + m.meeting.date, url: (it.links || []).map(l => l.url)[0] || null, addr: null });
    for (const pr of upcoming.payments || []) if (pr.rosterBody === bodyKey) for (const v of (pr.vendors && pr.vendors.top) || []) targets.push({ name: v.vendor, kind: 'vendor', note: 'paid $' + v.amount + ' (' + pr.vendors.period + ')', url: v.source || null, addr: null });
    for (const pr of upcoming.procurement || []) if (pr.rosterBody === bodyKey) for (const e of pr.expiring || []) targets.push({ name: e.vendor, kind: 'contractor', note: 'contract expires ' + e.expires, url: e.url || e.source || null, addr: null });
    for (const n of names) {
      const nn = norm(n.name); if (nn.length < 6) continue;
      for (const t of targets) {
        const nt = norm(t.name); if (!nt) continue;
        if (nn === nt || (nn.length >= 10 && nt.length >= 10 && (nn.startsWith(nt) || nt.startsWith(nn)))) addLead({ signal: n.auto ? (n.kind.startsWith('Sunbiz') ? 'officer' : 'stated') : 'officer', person: of.person, official: (roster.people.find(p => p.id === of.person) || {}).name, other: t.name, otherKind: t.kind, weak: !n.auto, autoConfirm: n.auto, evidence: [{ note: n.kind + ': ' + n.name, url: n.url || null }, { note: t.note, url: t.url }] });
      }
    }
    for (const ad of addrs) {
      const na = normAddr(ad.addr); if (na.length < 10) continue;
      for (const t of targets) if (t.addr && normAddr(t.addr) === na) addLead({ signal: 'address', person: of.person, official: (roster.people.find(p => p.id === of.person) || {}).name, other: t.name, otherKind: t.kind, weak: false, evidence: [{ note: ad.kind + ' equals the address on this filing: ' + ad.addr, url: ad.url || null }, { note: t.note, url: t.url }] });
    }
  }
}

surnameLeads();
employerLeads();
disclosureLeads();

// Status from review.json; auto-confirm only the signals that are themselves official records of the relationship.
for (const l of leads) {
  const r = review.leads[l.key];
  if (r && r.status) { l.status = r.status; l.relationship = r.relationship || null; l.record = r.record || null; l.reason = r.reason || null; }
  else if (l.autoConfirm) { l.status = 'confirmed'; l.relationship = l.signal === 'stated' ? 'stated interest on the official\'s own disclosure' : 'listed officer or agent on Sunbiz'; l.record = l.evidence[0]; }
  else l.status = 'unconfirmed';
  delete l.autoConfirm;
}
leads.sort((a, b) => (a.status === 'confirmed' ? 0 : 1) - (b.status === 'confirmed' ? 0 : 1) || (a.weak ? 1 : 0) - (b.weak ? 1 : 0) || a.official.localeCompare(b.official));

fs.writeFileSync(path.join(leadsDir, 'auto.json'), JSON.stringify({ updated: today, note: 'Machine-found leads. Unconfirmed = a hypothesis for review, never published. Confirm in review.json with the official record that states the relationship.', counts: count(leads), leads }, null, 1) + '\n');
if (!fs.existsSync(reviewPath)) fs.writeFileSync(reviewPath, JSON.stringify(review, null, 1) + '\n');

// Public file: confirmed only, plus counts of what is under review per official (no names of the unconfirmed).
const confirmed = leads.filter(l => l.status === 'confirmed');
const underReview = {};
for (const l of leads) if (l.status === 'unconfirmed') underReview[l.person] = (underReview[l.person] || 0) + 1;
fs.writeFileSync(path.join(here, '..', 'public', 'data', 'connections.json'), JSON.stringify({
  updated: today,
  note: 'Connections between officials and the parties, donors, lobbyists and vendors before them, published only when an official record states the relationship: the official\'s own financial disclosure, a Sunbiz officer listing with a matching filed address, a voting-conflict memo, an ethics opinion or complaint. Leads the tool is still checking are counted per official but not named. Rebuild: node scripts/leads.mjs.',
  confirmed: confirmed.map(l => ({ person: l.person, official: l.official, other: l.other, otherKind: l.otherKind, signal: l.signal, relationship: l.relationship, record: l.record, evidence: l.evidence })),
  underReview
}, null, 1) + '\n');
console.log('leads:', JSON.stringify(count(leads)), '| confirmed published:', confirmed.length, '| officials with leads under review:', Object.keys(underReview).length);
function count(ls) { const c = {}; for (const l of ls) { c[l.signal] = (c[l.signal] || 0) + 1; c[l.status] = (c[l.status] || 0) + 1; if (l.weak) c.weak = (c.weak || 0) + 1; } return c; }
