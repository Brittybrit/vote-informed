// Amendment 2 (2026): Exemption of Tangible Personal Property on Agricultural Land from Taxation (HJR 1215, 2025).
// Gifts from donors in the business the amendment's tax break goes to (agriculture: farms, ranches, groves, nurseries,
// dairies, citrus and sugar growers and their trade groups) to the three officials who put it on the ballot or
// campaigned for it: the House sponsor (Rep. Danny Alvarez), the Senate companion's sponsor (Sen. Keith Truenow) and
// Agriculture Commissioner Wilton Simpson, who is on the Nov 3, 2026 ballot. Brit, Oct 27, 2026.
//
// Donors count by the same rules as every law tie (scripts/lib/donor-class.mjs, scripts/data/industry/INSTRUCTIONS.md):
// a company, PAC or trade group whose name or reported business is agriculture; a person whose own occupation shows
// they ARE the business (FARMER, RANCHER, GROWER, CATTLEMAN, NURSERYMAN, or an owner title next to the business);
// executives only with an official record; umbrella words never. Individuals count only at $1,000 or more in total to
// that official (scripts/lib/materiality.mjs). Refunds cancel the gift they return (scripts/lib/refunds.mjs).
//
// Inputs (Florida Division of Elections contrib.exe exports, 9-column layout, pulled Oct 27, 2026):
//   scripts/data/measures/amendment-2-2026/donors/*.tsv (Alvarez, Truenow, their committees, Simpson 2023+ and his
//   committees 2025+) and scripts/data/tenure/doe-browser/ (Simpson's Senate and 2022 Agriculture accounts and his
//   committees to 2024). Output: scripts/data/measures/amendment-2-2026/money.json
// Run: node scripts/measure-money-amendment2.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fitsLaw } from './lib/donor-class.mjs';
import { INDIVIDUAL_MIN_TOTAL, isOrgDonor } from './lib/materiality.mjs';
import { cancelRefunds } from './lib/refunds.mjs';

const root = new URL('../', import.meta.url);
const P = p => new URL(p, root);
const J = p => JSON.parse(readFileSync(P(p)));
const DIR = 'scripts/data/measures/amendment-2-2026/';

// The class: same phrases as the agriculture laws in the Florida House lists (classes-2122.json "2021-7"), plus the
// look-alikes that are not agriculture (insurers and lenders with FARM in the name, places and clinics named CITRUS).
export const CLASS = {
  tags: ['agriculture-other', 'agriculture-sugar', 'agriculture-citrus'],
  re: 'FARM|AGRICULTUR|GROWER|CATTLE|CITRUS|SUGAR|NURSERY|DAIRY|RANCH',
  not: 'STATE FARM|FARMERS INSURANCE|FARM BUREAU INSURANCE|FARM BUREAU MUTUAL|FARM CREDIT|FARMERS? (?:BANK|NATIONAL)|CITRUS HEALTH|CITRUS COUNTY|CITRUS PARK|CITRUS HILLS|CITRUS SPRINGS|CITRUS HOTEL|RESEARCH|SUGARLOAF|SUGAR ?LAND|DAY NURSERY|FARMACIA|PHARM',
};

// Who, which accounts, and what each did
export const OFFICIALS = [
  { key: 'alvarez', name: 'Danny Alvarez', role: 'State Representative, District 69; filed HJR 1215 on Feb. 26, 2025 and voted yes on Apr. 25, 2025',
    onBallot: false, acted: '2025-02-26',
    accounts: [{ file: DIR + 'donors/alvarez.tsv', acct: 'alvarez', keep: /^Alvarez, Daniel/, label: 'campaign (State House)' },
               { file: DIR + 'donors/pc83561.tsv', acct: 'pc83561', label: "Friends of Danny Alvarez (political committee he chairs)" }] },
  { key: 'truenow', name: 'Keith Truenow', role: 'State Senator, District 13; filed the Senate companion, SJR 318, and voted yes on HJR 1215 on May 2, 2025',
    onBallot: false, acted: '2025-02-26',
    accounts: [{ file: DIR + 'donors/truenow.tsv', acct: 'truenow', keep: /^Truenow, Keith/, label: 'campaign (State House, then State Senate)' },
               { file: DIR + 'donors/pc79296.tsv', acct: 'pc79296', label: "Growing Florida's Leadership (political committee he chairs)" }] },
  { key: 'simpson', name: 'Wilton Simpson', role: 'Commissioner of Agriculture (on the Nov. 3, 2026 ballot); his department supports the amendment',
    onBallot: true, acted: null,
    accounts: [{ file: 'scripts/data/tenure/doe-browser/simpson-cand.tsv', acct: 'simpson-old', keep: /^Simpson, Wilton/, label: 'campaign (State Senate 2012-2022, Agriculture Commissioner 2022)' },
               { file: DIR + 'donors/simpson2325.tsv', acct: 'simpson', keep: /^Simpson, Wilton/, label: 'campaign (Agriculture Commissioner 2026)' },
               { file: 'scripts/data/tenure/doe-browser/pc60614-simpson.tsv', acct: 'pc60614', keep: /^Jobs for Florida/, label: 'Jobs for Florida (political committee he chaired)' },
               { file: 'scripts/data/tenure/doe-browser/pc74435-simpson.tsv', acct: 'pc74435', label: 'Florida Green PAC (political committee he chairs)' },
               { file: DIR + 'donors/pc74435.tsv', acct: 'pc74435', label: 'Florida Green PAC (political committee he chairs)' },
               { file: 'scripts/data/tenure/doe-browser/pc74437-simpson.tsv', acct: 'pc74437', label: 'Future Florida (political committee he chairs)' },
               { file: DIR + 'donors/pc74437.tsv', acct: 'pc74437', label: 'Future Florida (political committee he chairs)' },
               { file: 'scripts/data/tenure/doe-browser/pc79644-simpson-pre2025.tsv', acct: 'pc79644', label: 'Friends of Wilton Simpson (political committee he chairs)' },
               { file: 'scripts/data/cabinet/pc79644.tsv', acct: 'pc79644', label: 'Friends of Wilton Simpson (political committee he chairs)' },
               { file: 'scripts/data/tenure/doe-browser/pc88885-simpson.tsv', acct: 'pc88885', label: 'Home Grown PAC (political committee he chairs)' },
               { file: DIR + 'donors/pc88885.tsv', acct: 'pc88885', label: 'Home Grown PAC (political committee he chairs)' }] },
];

// Industry tags already assigned to donor names (scripts/data/industry and the tenure folders)
const TAGS = {};
for (const f of ['scripts/data/industry/state-donors.json', 'scripts/data/tenure/doe-browser/industry.json',
  'scripts/data/tenure/flhouse/donors/industry-pre2025.json', 'scripts/data/tenure/flsenate/donors/industry-pre2025.json',
  'scripts/data/tenure/prior-flsenate/donors/industry-pre2025.json']) {
  if (!existsSync(P(f))) continue;
  for (const [n, v] of Object.entries(J(f).donors || {})) if (!TAGS[n.toUpperCase()]) TAGS[n.toUpperCase()] = v.tags || [];
}
const key = n => String(n || '').toUpperCase().replace(/&/g, ' AND ').replace(/[.,'"()\-]/g, ' ').replace(/\b(INC|LLC|LLLP|LLP|LP|LTD|CORP|CORPORATION|CO|COMPANY|PA|PC|PLLC|THE)\b/g, ' ').replace(/\s+/g, ' ').trim();
// Named for agriculture but not shown by any record to be a farm business or a farm group's own committee: the name
// alone is not enough when the committee's own reports show its money comes mostly from outside farming (DOE contributions
// to each committee, read Oct 27, 2026), or when its funders are not public. Listed apart with the reason, never counted.
// Farm Bureau committees (Florida Farm PAC, county Farm Bureau PACs funded by member dues), the Citrus Mutual, Nursery
// Growers and Landscape, Dairy Farmers, Cattlemen and Citrus Packers committees count as farm trade groups.
export const UNCLEAR = {
  'FLORIDIANS FOR SUSTAINABLE AGRICULTURE': 'a Florida not-for-profit corporation (Sunbiz N08000010899), not a registered political committee; who funds it is not public',
  'FLORIDA FARMERS': 'a political committee first funded in January 2026; its money came from other political committees (Florida PC, The Committee, Committee on Civic Knowledge), a developer (JMBI Development) and Organics Management, not from farms',
  'ADVANCING FLORIDA AGRICULTURE': 'a political committee whose largest funders are Floridians for Sustainable Agriculture, NextEra Energy, Freedom First Committee, U.S. Sugar, Publix and Trulieve: mostly not farm money',
  'FLORIDA FARMERS AND RANCHERS UNITED': 'a political committee whose largest funders are other political committees (Capitol Conservative Alliance, Florida Conservative Federation, Florida First Patriots), Associated Industries, Publix and NextEra: mostly not farm money',
};
const SINCE = '2025-02-26';   // HJR 1215 filed
const SELF = { alvarez: /^ALVAREZ DAN/, truenow: /^TRUENOW/, simpson: /^SIMPSON WILTON|^SIMPSON FARMS|^SIMPSON EGG/ };

function rowsOf(o) {
  const seen = new Set(), rows = [];
  for (const a of o.accounts) {
    if (!existsSync(P(a.file))) continue;
    for (const line of readFileSync(P(a.file), 'utf8').split('\n')) {
      const c = line.replace(/\r$/, '').split('\t'); if (c.length < 8 || !/^\d\d\/\d\d\/\d{4}$/.test(c[1])) continue;
      if (a.keep && !a.keep.test(c[0])) continue;
      const [mm, dd, yy] = c[1].split('/');
      const r = { acct: a.acct, label: a.label, cmte: c[0].trim(), date: `${yy}-${mm}-${dd}`, amount: Math.round(parseFloat(c[2]) * 100) / 100, typ: c[3].trim(), donor: c[4].trim(), addr: c[5].trim(), csz: c[6].trim(), occ: c[7].trim() };
      if (/^(INT)$/.test(r.typ) || !r.amount) continue;
      const id = [r.cmte, r.date, r.amount, r.typ, r.donor, r.addr].join('|');
      // the same account read from two files (an older pull and a newer one) is counted once per identical row;
      // identical rows inside one file are separate gifts
      const fid = a.file + '|' + id;
      if (seen.has('x|' + id) && !seen.has(fid)) continue;
      seen.add('x|' + id); seen.add(fid);
      rows.push(r);
    }
  }
  return cancelRefunds(rows, key).live;
}

const out = { built: new Date().toISOString().slice(0, 10), class: CLASS, officials: [] };
for (const o of OFFICIALS) {
  const rows = rowsOf(o);
  const fits = r => !SELF[o.key].test(key(r.donor)) && !UNCLEAR[key(r.donor)] && fitsLaw(CLASS, r.donor, r.occ, TAGS[r.donor.toUpperCase()] || []);
  const ag = rows.filter(fits);
  const by = new Map();
  for (const r of ag) { const k = key(r.donor); if (!by.has(k)) by.set(k, { donor: r.donor, org: isOrgDonor(r.donor, r.occ), gifts: [] }); by.get(k).gifts.push(r); }
  const donors = [...by.values()].map(d => {
    const total = Math.round(d.gifts.reduce((s, g) => s + g.amount, 0) * 100) / 100;
    const dates = d.gifts.map(g => g.date).sort();
    return { donor: d.donor, org: d.org, counts: d.org || total >= INDIVIDUAL_MIN_TOTAL, total, n: d.gifts.length, first: dates[0], last: dates.at(-1),
      occ: [...new Set(d.gifts.map(g => g.occ).filter(Boolean))].join('; '), csz: d.gifts[0].csz,
      accounts: [...new Set(d.gifts.map(g => g.label))], since: Math.round(d.gifts.filter(g => g.date >= SINCE).reduce((s, g) => s + g.amount, 0) * 100) / 100 };
  }).sort((p, q) => q.total - p.total);
  const C = donors.filter(d => d.counts);
  const sum = xs => Math.round(xs.reduce((s, x) => s + x, 0) * 100) / 100;
  const allDates = rows.map(r => r.date).sort();
  out.officials.push({ key: o.key, name: o.name, role: o.role, onBallot: o.onBallot, acted: o.acted,
    accounts: [...new Set(o.accounts.map(a => a.label))], records: { from: allDates[0], to: allDates.at(-1), gifts: rows.length, dollars: sum(rows.map(r => r.amount)) },
    total: sum(C.map(d => d.total)), donors: C.length, gifts: C.reduce((s, d) => s + d.n, 0),
    sinceFiling: sum(C.map(d => d.since)), sinceFilingDonors: C.filter(d => d.since > 0).length,
    unclear: Object.entries(UNCLEAR).map(([k, why]) => { const g = rows.filter(r => key(r.donor) === k); return g.length ? { donor: g[0].donor, why, total: sum(g.map(r => r.amount)), n: g.length, first: g.map(r => r.date).sort()[0], last: g.map(r => r.date).sort().at(-1), accounts: [...new Set(g.map(r => r.label))] } : null; }).filter(Boolean),
    belowThreshold: { donors: donors.length - C.length, dollars: sum(donors.filter(d => !d.counts).map(d => d.total)) },
    list: donors });
}
writeFileSync(P(DIR + 'money.json'), JSON.stringify(out, null, 1) + '\n');
for (const o of out.officials) console.log(o.name, '| records', o.records.from, '..', o.records.to, o.records.gifts, 'gifts $' + o.records.dollars, '| ag $' + o.total, o.donors, 'donors', o.gifts, 'gifts', '| since filing $' + o.sinceFiling, o.sinceFilingDonors, 'donors', o.unclear.length ? '| unclear $' + o.unclear.map(u => u.total) : '', '| below threshold', o.belowThreshold.donors, '$' + o.belowThreshold.dollars);

// For the page: public/measure-money.js (window.MEASURE_MONEY.amend2), read by public/measure-impact.js
const FB = /FARM PAC|FARM BUREAU|^DADE FARM|^POLK COUNTY FARM|^HILLSBOROUGH COUNTY AGRICULT/;
const NICE = { 'UNITED STATES SUGAR CORPORATION': 'U.S. Sugar', 'FLORIDA CRYSTALS CORPORATION': 'Florida Crystals', 'FLORIDA FARM PAC': 'Florida Farm Bureau (Florida Farm PAC)',
  'LYKES BROS. INC.': 'Lykes Bros.', 'LYKES BROS INC': 'Lykes Bros.', 'A. DUDA & SONS, INC.': 'A. Duda & Sons', 'UNITED DAIRY FARMERS OF FLORIDA PAC': 'United Dairy Farmers of Florida',
  'SOUTHERN GARDENS CITRUS HOLDING CORP': 'Southern Gardens Citrus', 'FLORIDA CITRUS MUTUAL PC': 'Florida Citrus Mutual', 'DADE FARM PAC': 'Dade County Farm Bureau (Dade Farm PAC)',
  'FLORIDA CITRUS MUTUAL POLTICAL COMMITTEE': 'Florida Citrus Mutual', 'FLORIDIANS FOR SUSTAINABLE AGRICULTURE, INC.': 'Floridians for Sustainable Agriculture, Inc.',
  'FLORIDA FARMERS': 'Florida Farmers (political committee)', 'ADVANCING FLORIDA AGRICULTURE': 'Advancing Florida Agriculture', 'FLORIDA FARMERS AND RANCHERS UNITED': 'Florida Farmers and Ranchers United' };
const nice = n => NICE[n.toUpperCase()] || n.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()).replace(/,? (Inc|Llc|Corp|Corporation|Co)\.?$/, '');
const page = { built: out.built, rec: { amount: 28.7e6, date: '2025-04-18', url: 'https://www.flsenate.gov/Session/Bill/2025/1215/Analyses/h1215e.SAC.PDF' }, officials: out.officials.map(o => ({
  key: o.key, name: o.name, onBallot: o.onBallot, total: o.total, donors: o.donors, from: o.list.filter(d => d.counts).map(d => d.first).sort()[0], to: o.list.filter(d => d.counts).map(d => d.last).sort().at(-1),
  since: o.sinceFiling, sinceDonors: o.sinceFilingDonors,
  farmBureau: Math.round(o.list.filter(d => d.counts && FB.test(d.donor.toUpperCase())).reduce((s, d) => s + d.total, 0)),
  top: o.list.filter(d => d.counts).slice(0, 5).map(d => ({ name: nice(d.donor), total: d.total })),
  unclear: o.unclear.map(u => ({ name: nice(u.donor), total: u.total })) })) };
writeFileSync(P('public/measure-money.js'), '// Built by scripts/measure-money-amendment2.mjs from Florida Division of Elections reports. Do not edit by hand.\nwindow.MEASURE_MONEY = ' + JSON.stringify({ amend2: page }) + ';\n');
