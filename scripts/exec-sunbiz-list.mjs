// The Sunbiz worklist (scripts/data/industry/EXEC-RECORDS.md): every executive donor in exec-candidates.json without a
// record yet, one row per donor, for the browser pass on search.sunbiz.org. sec_note: what the SEC search found and why
// it did not tie. Run after scripts/exec-candidates.mjs: node scripts/exec-sunbiz-list.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const x = JSON.parse(readFileSync(new URL('data/industry/exec-candidates.json', import.meta.url)));
const NOTE = {
  'FERNANDEZ MIGUEL B': 'SEC: chairman of MBF Healthcare Acquisition Corp. (blank-check company, 2007-08) at the same address; not a health care provider, not tied',
  'RABINOWITZ MATTHEW': 'SEC: Natera Inc. executive chairman (medical laboratory), name only; SEC address is Natera in Austin TX, not the gift address; not tied',
  'GUILLAMA NOEL J': 'SEC: MediXall Group officer/director (SEC code railroads, a former shell); not tied',
  'BLISKO MICHAEL': 'SEC: Strawberry Fields REIT and OptimumBank Holdings director (a REIT and a bank, not the class); not tied',
  'DANIAL ETHAN': 'SEC: 10% holder of Puerto Rico closed-end funds via RAD Investments LLC (an investor in a fund, not an officer of a securities business); not tied',
  'SHANAHAN KATHLEEN': 'SEC: Great Lakes Dredge & Dock director from 2021 (gifts are 2013-14; occupation names pavement/soil stabilization); not tied',
  'DE MOYA ALVARO': 'SEC: Dolphin Digital Media director (media, not construction); not tied',
  'LINDBERG GREG E': 'SEC: Quadro Acquisition One Corp. only (blank-check company); not tied',
};
const SEARCH = { 'DE MOYA ALVARO': 'DE MOYA ALVARO', 'VIDAL DUART TINA': 'VIDAL DUART TINA', 'YOUNG LEE CHRISTINE': 'YOUNG LEE CHRISTINE', 'WILSON CIRANNA TAMI': 'WILSON CIRANNA TAMI', 'REYES M JUDE': 'REYES JUDE', 'PEREZ PEDRO VILLAR': 'PEREZ PEDRO' };
const EXEC = /\b(?:SENIOR |EXECUTIVE |EXEC\.? )?(?:VICE[- ]PRESIDENT|VP|EXECUTIVE|EXEC\.?|CFO|COO|CHAIR(?:MAN)?|DIRECTOR|PRINCIPAL|ADMIN|MGMT)\b/g;
const GENERIC = /^(?:HEALTH ?CARE|HOSPITAL|CONSTRUCTION|CONSTRUCTION COMPANY|CORP|RETIRED|REAL ESTATE|CITRUS|ENGINEERING|ENGINEERING FIRM|TOWING|INSURANCE CO|PRIVATE EQUITY FIRM|HEALTHCARE CO|HEALTH NETWORK|MANUFACTURER|EQUITY ANALYST|PRIVATE EQUITY ANALYST|RETAIL CO|CONSTRUCTORS CO|FOR|OF|INDIVIDUAL|)$/;
const by = new Map();
for (const g of x.gifts) {
  if (g.resolved) continue;
  if (!by.has(g.key)) by.set(g.key, { key: g.key, donor: g.donor, occs: new Set(), addr: g.addr, city: g.city, n: 0, amt: 0, cands: new Set() });
  const b = by.get(g.key); for (const o of g.occs) b.occs.add(o); b.n++; b.amt += g.amount; b.cands.add(g.candidate);
}
const emp = o => o.toUpperCase().replace(EXEC, ' ').replace(/[\/\-,.]/g, ' ').replace(/\b(?:FOR|OF|OR|AND)\b/g, ' ').replace(/\s+/g, ' ').trim();
const rows = [['donor_key', 'search_name', 'employer_reported', 'occupations_reported', 'address', 'city_state_zip', 'gifts', 'dollars', 'candidates', 'sec_note']];
for (const b of [...by.values()].sort((p, q) => q.amt - p.amt)) {
  const w = b.key.split(' ');
  const employers = [...new Set([...b.occs].map(emp).filter(e => e && !GENERIC.test(e)))];
  rows.push([b.key, SEARCH[b.key] || w.slice(0, 2).join(' '), employers.join('; '), [...b.occs].join('; '), b.addr, b.city, b.n, Math.round(b.amt * 100) / 100, [...b.cands].join(', '), NOTE[b.key] || '']);
}
writeFileSync(new URL('data/industry/exec-sunbiz-search.tsv', import.meta.url), rows.map(r => r.map(c => String(c).replace(/\t/g, ' ')).join('\t')).join('\n') + '\n');
console.log(rows.length - 1);
