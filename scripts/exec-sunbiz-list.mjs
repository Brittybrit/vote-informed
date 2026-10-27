// The Sunbiz worklist (scripts/data/industry/EXEC-RECORDS.md): every executive donor in exec-candidates.json without a
// record yet, one row per donor, for the browser pass on search.sunbiz.org. sec_note and sunbiz_note: what the SEC and
// Sunbiz searches found and why they did not tie. Run after scripts/exec-candidates.mjs: node scripts/exec-sunbiz-list.mjs
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
// Sunbiz pass, Oct 27, 2026 (EXEC-RECORDS.md): what the officer search found and why it did not tie.
const SUNBIZ_NOTE = {
  "FERNANDEZ MIGUEL B": "Sunbiz: director of MBF Healthcare Acquisition Corp. at the gift address (the blank-check company above); other Miguel Fernandez entries are other addresses; not tied",
  "SOLOMON STEVEN": "Sunbiz: no entry at the gift address (Dallas); not tied",
  "WORKMAN RICHARD": "Sunbiz: no entry at the gift address (Windermere); not tied",
  "JARDON MARIO E": "Sunbiz: President and CEO of Citrus Health Network, Inc., listed only at the company address (4175 W 20 Ave, Hialeah); the gift address is a Miami Beach home and no second record ties them; not tied",
  "BARNETT WESLEY": "Sunbiz: no officer entries; not tied",
  "ESPINOSA FERNANDO": "Sunbiz: no officer entries; not tied",
  "HEDRICK DALE": "Sunbiz: at the gift address only as officer of two nonprofits/associations (Transformation Palm Beach County; Flagler Promenade owners), not a construction company; not tied",
  "FERNANDEZ AURELIO M": "Sunbiz: no entry at the gift address (Plantation); not tied",
  "PEREZ PEDRO VILLAR": "Sunbiz: no entry at the gift address (Cutler Bay); not tied",
  "VANOSDOL THOMAS JOHN": "Sunbiz: no officer entries; not tied",
  "ALBRITTON PAMELA S": "Sunbiz: Albritton Grove Services (inactive) at another address; not tied",
  "DE MOYA ALVARO": "Sunbiz: The De Moya Group officer \"DE MOYA, A J\" at the company address only; the gift address is a Miami home; not tied",
  "FOREMAN ROBERT LEE": "Sunbiz: no entry at the gift address (Spring Hill); not tied",
  "ALONSO MARIA A": "Sunbiz: a Maria Alonso is treasurer of a Citrus Health affiliate at the company address only; the gift address differs; not tied",
  "ANTONUCCI LAWRENCE R": "Sunbiz: President of Lee Health System, Inc. at the company address only; the gift address (Miromar Lakes) differs; not tied",
  "BACHSCHMIDT WILLIAM": "Sunbiz: officer of King B Corporation and Arrowhead Heavy Hauling (both inactive) at the gift P.O. box; neither record states a construction business; not tied",
  "BODIE DONALD": "Sunbiz: no entry at the gift address (Tampa); not tied",
  "BULLOCK BRIAN T": "Sunbiz: entries are other Brian Bullocks (other middle initials or addresses); not tied",
  "CUETO JOSENRIQUE": "Sunbiz: at the gift address only as treasurer of Cucciolina Couture (clothing, inactive); no real estate development company; not tied",
  "DUART CARLOS A": "Sunbiz: CEO of CDR Maguire Inc. at a Miami company address; the gift address is Tallahassee; not tied",
  "FORD LEE T": "Sunbiz: entries are a Lee Ford in Fort Myers, not the gift address; not tied",
  "GUILLAMA NOEL J": "Sunbiz: health care company entries all at other addresses, mostly inactive; not tied",
  "LINDBERG GREG E": "Sunbiz: President of Who Is Your Insurance, Inc. at the gift address (dissolved Jan 2018, after the Dec 2017 gift), but no record shows it is an insurance company rather than an agency; not tied",
  "MARTINEZ DAVID": "Sunbiz: no entry at the gift address (Davie); not tied",
  "MOSS CHAD": "Sunbiz: only Moss Foundation, Inc. (a foundation); not tied",
  "READ FRANCIS J": "Sunbiz: no officer entries; not tied",
  "VIDAL DUART TINA": "Sunbiz: Executive Vice President of CDR Maguire Inc. at a Miami company address; the gift address is Tallahassee; not tied",
  "WILSON CIRANNA TAMI": "Sunbiz: CFO of Curative companies at the Austin company address only; the gift address is California; not tied",
  "BELTRAN REBECCA": "Sunbiz: President of Pedikidz of Florida at the company address only; the gift address differs; not tied",
  "FOREMAN ROBERT": "Sunbiz: no entry at the gift address (Spring Hill); not tied",
  "HIRONS DALE": "Sunbiz: Gardensmith Design (inactive) at another address; not tied",
  "MUNILLA PEDRO R": "Sunbiz: no Munilla Construction entry under his name; not tied",
  "SCHAFER ROBERT": "Sunbiz: a Robert Schafer is President of Ranger Construction Industries at the company address only; the gift address is a home and no second record ties them; not tied",
  "SHANAHAN KATHLEEN": "Sunbiz: no pavement or soil stabilization company; entries at other addresses; not tied",
  "YOUNG LEE CHRISTINE": "Sunbiz: at the gift address only as officer of a nonprofit (Tru Pyrates for True Patriots); not tied",
  "BROCHARD LEILANI M": "Sunbiz: no officer entries; not tied",
  "BAUER CLIFFORD J": "Sunbiz: at the gift address only as director of Hialeah Foundation (inactive), not a health care provider; not tied",
  "SCHMEISER BRENT": "Sunbiz: officer of BAMB Enterprises (inactive) at the gift address; no record states its business; not tied",
  "KOBLINSKI MONICA": "Sunbiz: no officer entries; not tied",
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
const rows = [['donor_key', 'search_name', 'employer_reported', 'occupations_reported', 'address', 'city_state_zip', 'gifts', 'dollars', 'candidates', 'sec_note', 'sunbiz_note']];
for (const b of [...by.values()].sort((p, q) => q.amt - p.amt)) {
  const w = b.key.split(' ');
  const employers = [...new Set([...b.occs].map(emp).filter(e => e && !GENERIC.test(e)))];
  rows.push([b.key, SEARCH[b.key] || w.slice(0, 2).join(' '), employers.join('; '), [...b.occs].join('; '), b.addr, b.city, b.n, Math.round(b.amt * 100) / 100, [...b.cands].join(', '), NOTE[b.key] || '', SUNBIZ_NOTE[b.key] || '']);
}
writeFileSync(new URL('data/industry/exec-sunbiz-search.tsv', import.meta.url), rows.map(r => r.map(c => String(c).replace(/\t/g, ' ')).join('\t')).join('\n') + '\n');
console.log(rows.length - 1);
