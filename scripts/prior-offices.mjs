// Official actions from candidates' earlier offices (scripts/data/tenure/prior-*), one file per person:
//   node scripts/prior-offices.mjs   ->  public/data/prior/<pid>.json and public/data/prior/index.json
//
// Same standard as the current lists (scripts/data/tenure/STANDARD.md, PRIOR.md): every action of the body,
// while the person sat, that benefits a named private party, with the person's vote from the body's own record.
// Donors: that office's campaign reports, from one cycle before the term to its end. A tie needs a yes or no
// vote the person cast and a gift from the action's party or from a lobbyist registered for (or named in the
// record for) that party. Where the reports are not online, not collected yet, or the seat was appointed, the
// actions are still listed and the page says why there is no donor share (Brit, Oct 26, 2026).
// Voice votes: a member present is shown as voting yes only when the minutes give a tally that accounts for
// every yes; otherwise the vote is "not given in the minutes".
// Not here yet: earlier Florida House/Senate and Congress seats (bills and requests; their donors are pending),
// the county mayor's recommendations and vetoes (how they count is Brit's call), and agency actions without votes.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { P, J, csv, pkey, dkey } from './lib/city.mjs';
import { buildLegislative } from './prior-legislature.mjs';

const T = 'scripts/data/tenure/';
const OUT = 'public/data/prior/';

const BODY = {
  'mdc-commission': ['Miami-Dade County Commission', 'Comisión del Condado Miami-Dade', 'Komisyon Konte Miami-Dade'],
  'mdc-mayor': ['Miami-Dade County', 'Condado Miami-Dade', 'Konte Miami-Dade'],
  'mdcps-school-board': ['Miami-Dade County School Board', 'Junta Escolar del Condado Miami-Dade', 'Konsèy Lekòl Konte Miami-Dade'],
  'broward-commission': ['Broward County Commission', 'Comisión del Condado Broward', 'Komisyon Konte Broward'],
  'city-miami-gardens': ['Miami Gardens City Council', 'Concejo de la Ciudad de Miami Gardens', 'Konsèy Vil Miami Gardens'],
  'city-north-miami-beach': ['North Miami Beach City Council', 'Concejo de la Ciudad de North Miami Beach', 'Konsèy Vil North Miami Beach'],
  'city-surfside': ['Surfside Town Commission', 'Comisión del Pueblo de Surfside', 'Komisyon Vil Surfside'],
  'city-aventura': ['Aventura City Commission', 'Comisión de la Ciudad de Aventura', 'Komisyon Vil Aventura'],
  'city-biscayne-park': ['Biscayne Park Village Commission', 'Comisión de la Villa de Biscayne Park', 'Komisyon Vilaj Biscayne Park'],
  'city-opa-locka': ['Opa-locka City Commission', 'Comisión de la Ciudad de Opa-locka', 'Komisyon Vil Opa-locka'],
  'city-sunny-isles-beach': ['Sunny Isles Beach City Commission', 'Comisión de la Ciudad de Sunny Isles Beach', 'Komisyon Vil Sunny Isles Beach'],
  'city-hialeah': ['Hialeah City Council', 'Concejo de la Ciudad de Hialeah', 'Konsèy Vil Hialeah'],
  'city-medley': ['Medley Town Council', 'Concejo del Pueblo de Medley', 'Konsèy Vil Medley'],
  'city-palmetto-bay': ['Palmetto Bay Village Council', 'Concejo de la Villa de Palmetto Bay', 'Konsèy Vilaj Palmetto Bay'],
  'city-doral': ['Doral City Council', 'Concejo de la Ciudad de Doral', 'Konsèy Vil Doral'],
  'city-cutler-bay': ['Cutler Bay Town Council', 'Concejo del Pueblo de Cutler Bay', 'Konsèy Vil Cutler Bay'],
  'city-key-biscayne': ['Key Biscayne Village Council', 'Concejo de la Villa de Key Biscayne', 'Konsèy Vilaj Key Biscayne'],
  'city-boca-raton': ['Boca Raton City Council', 'Concejo de la Ciudad de Boca Raton', 'Konsèy Vil Boca Raton'],
  'city-parkland': ['Parkland City Commission', 'Comisión de la Ciudad de Parkland', 'Komisyon Vil Parkland'],
  'cabinet': ['Governor and Cabinet', 'Gobernador y Gabinete', 'Gouvènè ak Kabinè'],
  'fl-house': ['Florida House', 'Cámara de Representantes de Florida', 'Chanm Reprezantan Florid'],
  'fl-senate': ['Florida Senate', 'Senado de Florida', 'Sena Florid'],
  'us-house': ['U.S. House', 'Cámara de Representantes de EE. UU.', 'Chanm Reprezantan Etazini'],
};
const tri = a => ({ en: a[0], es: a[1], ht: a[2] });

// Per office (pid|start): where its actions are, its roll key, and the state of its donor reports.
//   donors: 'files' (matched), 'notOnline', 'notCollected' (online, not pulled yet), 'appointed', 'selfFunded'
//   missing: campaign years whose reports are not online (said under the share line)
//   noActions: why no action is listed ('notOnline' or 'notCollected')
const DOE = T + 'doe-browser/';
const N = T + 'prior-cities-north/', S = T + 'prior-cities-south/', C = T + 'prior-county/', W = T + 'prior-statewide/';
const OFFICES = [
  { pid: 'oliver-g-gilbert-iii', start: '2008-03-26', role: 'member', acts: [N + 'miamigardens/actions.json'], key: 'Gilbert', donors: 'notCollected' },
  { pid: 'oliver-g-gilbert-iii', start: '2012-11-14', role: 'mayor', acts: [N + 'miamigardens/actions.json'], key: 'Gilbert', donors: 'notCollected' },
  { pid: 'katrina-wilson', start: '2018-11-06', role: 'member', acts: [N + 'miamigardens/actions.json'], key: 'Wilson', donors: 'notCollected', current: true },
  { pid: 'phyllis-smith', start: '2007-05-01', role: 'member', acts: [N + 'northmiamibeach/actions.json'], key: 'Smith', donors: 'files',
    files: ['smith_2007', 'smith_2009', 'smith_2011', 'smith_2015'].map(f => N + 'northmiamibeach/donors/' + f + '.csv'),
    actsNote: ['North Miami Beach posts no council minutes before May 2013, so actions from 2007 to May 2013 are not listed.', 'North Miami Beach no publica actas del concejo antes de mayo de 2013, así que las acciones de 2007 a mayo de 2013 no aparecen.', 'North Miami Beach pa pibliye pwosè vèbal konsèy la anvan me 2013, kidonk aksyon soti 2007 rive me 2013 pa parèt.'] },
  { pid: 'jay-r-chernoff', start: '2001-05-01', role: 'member', acts: [], key: 'Chernoff', donors: 'files', noActions: 'notOnline' },
  { pid: 'charles-burkett', start: '2006-03-21', role: 'mayor', acts: [N + 'surfside/actions.json'], key: 'Burkett', donors: 'notOnline',
    actsNote: ['Surfside posts no town records before 2010, so only the last meetings of this term are listed.', 'Surfside no publica registros antes de 2010, así que solo aparecen sus últimas reuniones de este período.', 'Surfside pa pibliye dosye vil la anvan 2010, kidonk se sèlman dènye reyinyon manda sa a ki parèt.'] },
  { pid: 'charles-burkett', start: '2020-03-17', role: 'mayor', acts: [N + 'surfside/actions.json'], key: 'Burkett', donors: 'selfFunded' },
  { pid: 'charles-burkett', start: '2024-03-19', role: 'mayor', acts: [N + 'surfside/actions.json'], key: 'Burkett', donors: 'files',
    files: [N + 'surfside/donors/burkett_2022.csv', N + 'surfside/donors/burkett_2024.csv'] },
  { pid: 'ruben-a-coto', start: '2004-03-16', role: 'member', acts: [], key: 'Coto', donors: 'notOnline', noActions: 'notOnline' },
  { pid: 'ruben-a-coto', start: '2024-03-19', role: 'member', acts: [N + 'surfside/actions.json'], key: 'Coto', donors: 'files', files: [N + 'surfside/donors/coto_2024.csv'] },
  { pid: 'howard-s-weinberg', start: '2006-03-21', role: 'member', acts: [N + 'surfside/actions.json'], key: 'Weinberg', donors: 'notOnline',
    actsNote: ['Surfside posts no town records before 2010, so only the last meetings of this term are listed.', 'Surfside no publica registros antes de 2010, así que solo aparecen sus últimas reuniones de este período.', 'Surfside pa pibliye dosye vil la anvan 2010, kidonk se sèlman dènye reyinyon manda sa a ki parèt.'] },
  { pid: 'howard-s-weinberg', start: '2012-11-13', role: 'member', acts: [N + 'aventura/actions.json'], key: 'Howard Weinberg', donors: 'notOnline' },
  { pid: 'daniel-samaria', start: '2018-11-06', role: 'member', acts: [N + 'biscaynepark/actions.json'], key: 'Samaria', donors: 'notOnline' },
  { pid: 'sherelean-bass', start: '2018-11-06', role: 'member', acts: [N + 'opalocka/actions.json'], key: 'Bass', donors: 'notOnline',
    actsNote: ['Opa-locka posts no minutes for November 2018 to October 2019, so actions from those months are not listed.', 'Opa-locka no publica actas de noviembre de 2018 a octubre de 2019, así que las acciones de esos meses no aparecen.', 'Opa-locka pa pibliye pwosè vèbal novanm 2018 rive oktòb 2019, kidonk aksyon mwa sa yo pa parèt.'] },
  { pid: 'rose-tydus', start: '2004-11-02', role: 'member', acts: [], key: 'Tydus', donors: 'notOnline', noActions: 'notOnline' },
  { pid: 'dana-goldman', start: '2015-02-17', role: 'member', acts: [], key: 'Goldman', donors: 'notCollected', noActions: 'notCollected' },
  { pid: 'dana-goldman', start: '2021-11-16', role: 'mayor', acts: [], key: 'Goldman', donors: 'notCollected', noActions: 'notCollected' },
  { pid: 'larisa-svechin', start: '2016-11-08', role: 'member', acts: [], key: 'Svechin', donors: 'notCollected', noActions: 'notCollected' },
  { pid: 'luis-gonzalez', start: '2005-11-15', role: 'member', acts: [S + 'hialeah-groupv/actions.json'], key: 'Gonzalez', donors: 'notOnline',
    actsNote: ['Hialeah posts no council records before 2007, so actions from the first year of the term are not listed.', 'Hialeah no publica registros del concejo antes de 2007, así que las acciones del primer año del período no aparecen.', 'Hialeah pa pibliye dosye konsèy la anvan 2007, kidonk aksyon premye ane manda a pa parèt.'] },
  { pid: 'ivan-pacheco', start: '2016-11-08', role: 'member', acts: [S + 'medley-pacheco/actions.json'], key: 'IPacheco', donors: 'notOnline' },
  { pid: 'lucia-baez-geller', start: '2020-11-17', role: 'member', acts: [S + 'schoolboard/actions.json'], key: 'BaezGeller', donors: 'files',
    files: [S + 'schoolboard/baez-geller_2020_contributions.csv'],
    actsNote: ['Votes come from the Board\u2019s official approved minutes. The minutes of four meetings (Dec 9, 2020; Feb 10, Apr 21 and Nov 17, 2021) are not in the district\u2019s archive, so those actions show no vote.', 'Los votos provienen de las actas oficiales aprobadas de la Junta. Las actas de cuatro reuniones (9 de dic. de 2020; 10 de feb., 21 de abr. y 17 de nov. de 2021) no están en el archivo del distrito, así que esas acciones aparecen sin voto.', 'Vòt yo soti nan pwosè vèbal ofisyèl Konsèy la apwouve. Pwosè vèbal kat reyinyon (9 des. 2020; 10 fev., 21 avr. ak 17 nov. 2021) pa nan achiv distri a, kidonk aksyon sa yo parèt san vòt.'] },
  { pid: 'david-m-singer', start: '2016-11-08', role: 'member', acts: [S + 'palmettobay/actions.json'], key: 'Singer', donors: 'notOnline' },
  { pid: 'ana-maria-rodriguez', start: '2010-11-10', role: 'member', acts: [S + 'doral/actions.json'], key: 'Rodriguez', donors: 'files',
    files: [S + 'doral/rodriguez_2014.csv'], missing: ['2010', '2010', '2010'] },
  { pid: 'mary-ann-mixon', start: '2010-11-17', role: 'member', acts: [S + 'cutlerbay-mixon/actions.json'], key: 'Mixon', donors: 'notOnline' },
  { pid: 'luis-f-de-la-cruz', start: '2014-11-18', role: 'member', acts: [S + 'keybiscayne-delacruz/actions.json'], key: 'DeLaCruz', donors: 'notOnline' },
  { pid: 'scott-singer', start: '2014-03', role: 'member', acts: [], key: 'Singer', donors: 'notOnline', noActions: 'notCollected' },
  { pid: 'scott-singer', start: '2018-04-27', role: 'mayor', acts: [], key: 'Singer', donors: 'notOnline', noActions: 'notCollected', current: true },
  { pid: 'jared-moskowitz', start: '2022-01-12', role: 'member', acts: [T + 'prior-congress/broward/actions.json'], key: 'Moskowitz', donors: 'appointed' },
  { pid: 'jared-moskowitz', start: '2006', role: 'member', acts: [], key: 'Moskowitz', donors: 'notCollected', noActions: 'notCollected' },
  { pid: 'bruno-a-barreiro', start: '1998-06-02', role: 'member', acts: [C + 'actions.json'], key: 'Barreiro', donors: 'files',
    files: [2004, 2008, 2012, 2016].map(y => C + 'donors/barreiro-campaign-' + y + '.csv'), missing: ['1998 and 2000', '1998 y 2000', '1998 ak 2000'],
    actsNote: ['County Commission zoning hearings before July 2017 are not in the Clerk’s online minutes, so most zoning votes from these years are not listed.', 'Las audiencias de zonificación de la Comisión antes de julio de 2017 no están en las actas en línea de la Secretaría, así que la mayoría de los votos de zonificación de estos años no aparecen.', 'Odyans zonaj Komisyon an anvan jiyè 2017 pa nan pwosè vèbal Grefye a sou entènèt, kidonk pifò vòt zonaj ane sa yo pa parèt.'] },
  { pid: 'carlos-a-gimenez', start: '2011-06-28', role: 'mayor', body: 'mdc-mayor', acts: [C + 'actions.json'], key: 'Gimenez', mayorRule: true, donors: 'files',
    files: [2011, 2012, 2016].map(y => C + 'donors/gimenez-mayor-' + y + '.csv'),
    actsNote: ['The mayor does not vote on the County Commission. Here an item counts as his yes when it went to the Commission with his recommendation and he did not veto it, and as his no when he vetoed it. Items he did not recommend show no vote. Zoning hearings before July 2017 are not in the Clerk\u2019s online minutes.', 'El alcalde no vota en la Comisión del Condado. Aquí un asunto cuenta como su voto a favor cuando llegó a la Comisión con su recomendación y no lo vetó, y como su voto en contra cuando lo vetó. Los asuntos que no recomendó aparecen sin voto. Las audiencias de zonificación antes de julio de 2017 no están en las actas en línea de la Secretaría.', 'Majistra a pa vote nan Komisyon Konte a. Isit la yon dosye konte kòm wi li lè li te rive nan Komisyon an ak rekòmandasyon l epi li pa t mete veto, e kòm non li lè li te mete veto. Dosye li pa t rekòmande yo parèt san vòt. Odyans zonaj anvan jiyè 2017 pa nan pwosè vèbal Grefye a sou entènèt.'] },
  { pid: 'carlos-a-gimenez', start: '2004-11-17', role: 'member', acts: [C + 'actions.json'], key: 'Gimenez', donors: 'files',
    files: [2004, 2008].map(y => C + 'donors/gimenez-campaign-' + y + '.csv'),
    actsNote: ['County Commission zoning hearings before July 2017 are not in the Clerk’s online minutes, so zoning votes from these years are not listed.', 'Las audiencias de zonificación de la Comisión antes de julio de 2017 no están en las actas en línea de la Secretaría, así que los votos de zonificación de estos años no aparecen.', 'Odyans zonaj Komisyon an anvan jiyè 2017 pa nan pwosè vèbal Grefye a sou entènèt, kidonk vòt zonaj ane sa yo pa parèt.'] },
  // donors: the state elections office's records (scripts/data/tenure/doe-browser): her Attorney General campaigns (no committee
  // registered to her; Friends of Ashley Moody names another chair)
  { pid: 'ashley-moody', start: '2019-01-08', role: 'ag', body: 'cabinet', acts: [W + 'cabinet-bot/actions.json', W + 'cabinet-other/actions.json'], key: 'Moody', donors: 'files',
    doe: [[DOE + 'moody-cand.tsv', '(ATG)']] },
  // his 2022 Agriculture campaign and the committees registered with him as chair
  { pid: 'wilton-simpson', start: '2023-01-03', role: 'agriculture', body: 'cabinet', acts: [W + 'cabinet-bot/actions.json', W + 'cabinet-other/actions.json'], key: 'Simpson', donors: 'files',
    doe: [[DOE + 'simpson-cand.tsv', '(AGR)'], ...['pc60614-simpson', 'pc74435-simpson', 'pc74437-simpson', 'pc79644-simpson-pre2025', 'pc88885-simpson'].map(f => [DOE + f + '.tsv', ''])],
    endShown: '2024-12-31' },
];

const ROLE = {
  member: ['Member', 'Miembro', 'Manm'], mayor: ['Mayor', 'Alcalde', 'Majistra'],
  ag: ['Attorney General, voting on the Governor and Cabinet', 'Fiscal General, con voto en el Gobernador y Gabinete', 'Pwokirè Jeneral, ki vote nan Gouvènè ak Kabinè'],
  agriculture: ['Commissioner of Agriculture, voting on the Governor and Cabinet', 'Comisionado de Agricultura, con voto en el Gobernador y Gabinete', 'Komisyonè Agrikilti, ki vote nan Gouvènè ak Kabinè'],
};

// offices.json from every slice, by pid|start
const OJ = {};
for (const d of readdirSync(P(T)).filter(x => x.startsWith('prior-'))) {
  if (!existsSync(P(T + d + '/offices.json'))) continue;
  let o = J(T + d + '/offices.json'); o = Array.isArray(o) ? o : o.offices || [];
  for (const x of o) OJ[x.pid + '|' + x.start] = x;
}
const PRON = J('scripts/data/pronouns.json');
const pron = pid => PRON.she.includes(pid) ? 'she' : PRON.he.includes(pid) ? 'he' : null;
const ROSTER = J('public/data/roster.json');
const nameOf = pid => { const p = (Array.isArray(ROSTER.people) ? ROSTER.people : Object.values(ROSTER.people)).find(x => x.id === pid); return p ? p.name : pid; };

const cache = {};
const load = f => cache[f] || (cache[f] = J(f));
const donorRows = f => {
  if (!existsSync(P(f))) return [];
  const [h, ...rows] = csv(readFileSync(P(f), 'utf8'));
  const ix = n => h.indexOf(n);
  return rows.filter(r => r[ix('Cont/Exp')] === 'C' && r[ix('Amend. code')] !== 'D' && Number(r[ix('amount')]) > 0)
    .map(r => ({ donor: r[ix('name')].replace(/\s+/g, ' ').trim(), amount: Number(r[ix('amount')]), date: r[ix('item date')], occ: ix('occupation') >= 0 ? r[ix('occupation')] : '', file: f.split('/').pop() }));
};
// Florida Division of Elections export (tab-delimited, scripts/data/tenure/doe-browser): keep the accounts whose
// first column matches `acct` (an office tag like '(ATG)' or a committee name)
const doeRows = (f, acct) => {
  if (!existsSync(P(f))) return [];
  return readFileSync(P(f), 'utf8').split(/\r?\n/).slice(1).filter(l => l.trim()).map(l => l.split('\t'))
    .filter(c => !acct || c[0].includes(acct))
    .map(c => { const [m, d, y] = c[1].split('/'); return { donor: c[4].replace(/\s+/g, ' ').trim(), amount: Number(c[2]), date: `${y}-${m}-${d}`, occ: c[7] || '', file: f.split('/').pop(), type: c[3] }; })
    .filter(g => g.amount > 0 && !/^(LOA|INT|REF)$/.test(g.type));
};
const tallyOf = t => Array.isArray(t) ? t : typeof t === 'string' && /^\d+\s*-\s*\d+/.test(t) ? t.split('-').map(Number) : null;
const VOTE = v => v === 'yes' || v === 'no' ? v : v === 'absent' || v === 'excused' ? 'absent' : v === 'abstain' || v === 'recused' ? 'abstain' : 'unknown';

if (existsSync(P(OUT))) rmSync(P(OUT), { recursive: true });
mkdirSync(P(OUT), { recursive: true });
const people = {};
const report = [];
for (const C0 of OFFICES) {
  const o = OJ[C0.pid + '|' + C0.start];
  if (!o) { report.push('missing in offices.json: ' + C0.pid + ' ' + C0.start); continue; }
  const bodyKey = C0.body || o.body;
  const start = o.start, end = C0.endShown || o.end || null;
  const inTerm = d => d && d >= String(start).slice(0, 10) && (!end || d <= end);
  // actions while seated, with this person's vote
  const actions = [];
  const seen = new Set();
  let unnamed = 0;
  for (const f of C0.acts) for (const a of load(f).actions || []) {
    if (!a.date || !inTerm(a.date) || seen.has(a.id)) continue;
    const roll = a.roll || {};
    if (!C0.mayorRule && !(C0.key in roll)) continue;
    if (C0.mayorRule && !a.mayor) continue;
    if (a.universe === false) continue;
    seen.add(a.id);
    // the standard leaves out an action whose record names no beneficiary, and counts it
    if (!(a.parties || []).some(x => String(x || '').trim())) { unnamed++; continue; }
    let v = VOTE(roll[C0.key]);
    // County mayor (Brit, Oct 26, 2026, option a): the mayor does not vote on the Commission; an item he sent with his
    // own recommendation and did not veto counts as his yes, a veto as his no, anything else shows no vote
    if (C0.mayorRule) { const m = a.mayor; v = m.vetoed ? 'no' : (m.mayorMemo || /gim[eé']?nez/i.test(m.recommendedBy || '')) ? 'yes' : 'unknown'; }
    if (C0.noVotes) v = 'unknown';
    // a voice vote gives this member a yes only when the tally accounts for every yes
    if (v === 'yes' && /voice vote/i.test(a.notes || '')) {
      const t = tallyOf(a.tally), ys = Object.values(roll).filter(x => x === 'yes').length;
      if (!t || t[0] !== ys) v = 'unknown';
    }
    const lob = [];
    for (const l of a.lobbied || []) if (l && l.name && (!l.reg || l.reg <= a.date)) lob.push({ name: l.name, firm: l.firm || null, for: l.for || null });
    for (const n of a.reps || []) if (n) lob.push({ name: typeof n === 'string' ? n : n.name, firm: null, for: null, record: true });
    for (const l of a.representatives || []) if (l && l.name) lob.push({ name: l.name, firm: l.firm || null, for: l.for || null, record: true });
    const url = a.url || (a.links || []).map(x => x.url)[0] || (a.record && (a.record.certification || a.record.url)) || '';
    actions.push({ id: a.id, d: a.date, t: String(a.title || a.summary || '').replace(/\s+/g, ' ').trim(), r: a.ref || '', k: a.kind || '',
      p: (a.parties || []).slice(0, 4), a: a.amount == null ? null : a.amount, v, res: a.result || '', u: url, l: lob, g: [] });
  }
  // donors for this office and the gifts tied to each action
  const gFrom = o.giftsFrom || null;
  const donors = C0.donors === 'files' ? [...(C0.files || []).flatMap(donorRows), ...(C0.doe || []).flatMap(([f, a]) => doeRows(f, a))]
    .filter(g => (!gFrom || g.date >= gFrom) && (!end || g.date <= end)) : [];
  const self = dkey(nameOf(C0.pid));
  const gifts = donors.filter(g => dkey(g.donor) !== self);
  if (gifts.length && !C0.noVotes) for (const a of actions) {
    const keys = a.p.map(pkey).filter(Boolean);
    const lk = new Map(a.l.map(l => [dkey(l.name), l]));
    for (const g of gifts) {
      const dk = dkey(g.donor);
      if (keys.some(k => dk === k || (k.split(' ').length >= 2 && dk.startsWith(k + ' ')))) a.g.push({ n: g.donor, amt: g.amount, dt: g.date, k: 'party' });
      else if (dk.split(' ').length >= 2 && lk.has(dk)) a.g.push({ n: g.donor, amt: g.amount, dt: g.date, k: 'lobbyist', of: lk.get(dk).for || null });
      else if (a.l.some(l => l.firm && pkey(l.firm) && (dk === pkey(l.firm) || dk.startsWith(pkey(l.firm) + ' ')))) a.g.push({ n: g.donor, amt: g.amount, dt: g.date, k: 'firm' });
    }
  }
  const cnt = { actions: actions.length, yes: 0, no: 0, absent: 0, abstain: 0, unknown: 0 };
  for (const a of actions) cnt[a.v]++;
  const cast = actions.filter(a => a.v === 'yes' || a.v === 'no');
  const tied = cast.filter(a => a.g.length);
  const tiedGifts = new Map(); for (const a of tied) for (const g of a.g) tiedGifts.set(g.n + '|' + g.amt + '|' + g.dt, g.amt);
  const share = C0.donors === 'files' && cast.length && gifts.length ? { n: cast.length, tied: tied.length, from: cast.map(a => a.d).sort()[0], to: cast.map(a => a.d).sort().pop(),
    money: [...tiedGifts.values()].reduce((s, x) => s + x, 0), donors: new Set([...tied.flatMap(a => a.g.map(g => dkey(g.n)))]).size } : null;
  // tied first, then newest first
  const counted = a => a.g.length > 0 && (a.v === 'yes' || a.v === 'no');
  actions.sort((x, y) => counted(y) - counted(x) || String(y.d).localeCompare(String(x.d)));
  const P0 = people[C0.pid] || (people[C0.pid] = { pid: C0.pid, name: nameOf(C0.pid), pron: pron(C0.pid), offices: [] });
  P0.offices.push({
    body: bodyKey, bodyName: tri(BODY[bodyKey] || [bodyKey, bodyKey, bodyKey]), role: tri(ROLE[C0.role]), office: o.office || '',
    start, end: o.end || null, current: !!C0.current, endShown: C0.endShown || null,
    donors: C0.donors, gifts: gifts.length, giftTotal: Math.round(gifts.reduce((s, g) => s + g.amount, 0) * 100) / 100,
    missing: C0.missing ? tri(C0.missing) : null, noActions: C0.noActions || null, noVotes: !!C0.noVotes,
    actsNote: C0.actsNote ? tri(C0.actsNote) : null, source: o.source || null, mayor: !!C0.mayorRule,
    counts: cnt, unnamed, share, actions,
  });
  report.push(`${C0.pid} ${bodyKey} ${start}: ${cnt.actions} actions (yes ${cnt.yes}, no ${cnt.no}, unknown ${cnt.unknown}) | gifts ${gifts.length} | tied ${tied.length}${share ? ' (' + Math.round(tied.length / cast.length * 100) + '%)' : ''}`);
}
// Earlier legislative seats (scripts/prior-legislature.mjs): requests and laws instead of council votes
const DIST = { 'fl-house': ['State Representative, District ', 'Representante estatal, Distrito ', 'Reprezantan Leta, Distri '], 'fl-senate': ['State Senator, District ', 'Senador estatal, Distrito ', 'Senatè Leta, Distri '], 'us-house': ['U.S. Representative, ', 'Representante federal, ', 'Reprezantan federal, '] };
for (const { pid, office } of buildLegislative(nameOf)) {
  const P0 = people[pid] || (people[pid] = { pid, name: nameOf(pid), pron: pron(pid), offices: [] });
  const dd = String(office.district || '').split(/\s*\/\s*/).pop();
  P0.offices.push({ ...office, bodyName: tri(BODY[office.body]), role: tri(DIST[office.body].map(x => x + dd)) });
  const L = office.laws, Q = office.requests;
  report.push(`${pid} ${office.body} ${office.start}: requests ${Q.n} (unread ${Q.unread}${Q.share ? ', tied ' + Q.share.tied : ''}) | laws ${L.n} (cast ${L.cast}, no class ${L.noClass}${L.share ? ', tied ' + L.share.tied : ''}) | gifts ${office.gifts}, tied money ${office.money}`);
}
for (const p of Object.values(people)) {
  p.offices.sort((a, b) => String(b.start).localeCompare(String(a.start)));
  writeFileSync(P(OUT + p.pid + '.json'), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), ...p }) + '\n');
}
writeFileSync(P(OUT + 'index.json'), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), people: Object.keys(people).sort() }) + '\n');
console.log(report.join('\n'));
