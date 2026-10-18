import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker } from './load-worker.mjs';

const w = await loadWorker(['vfReportList', 'tallyCommittee', 'refreshMeasureFilings', 'measureFilingsFor', 'markDisclosure', 'MEASURE_FILINGS_TTL']);
const realFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = realFetch; });

// Preserve and Protect Miami, S01 (Oct 1 to Oct 9, 2026), as the City of Miami's VoterFocus site serves it
const row = (dhc, code, period, mon, ik, exp) => '<tr role="row"> <td class="ReportPeriod" role="gridcell"> <div class="Value"><a href="/CampaignFinance/candidate_pr.php?op=rp&amp;e=1&amp;c=muncitymiami&amp;ca=156&amp;sdc=290&amp;rellevel=3&amp;dhc=' + dhc + '&amp;committee=Y">' + code + '<br>(' + period + ') </a></div> </td> <td class="Monetary" role="gridcell"> <div class="Label" aria-hidden="true">Contributions</div> <div class="Value">' + mon + '</div> </td> <td class="InKind" role="gridcell"> <div class="Label" aria-hidden="true">In-Kind</div> <div class="Value">' + ik + '</div> </td> <td class="Expenditures" role="gridcell"> <div class="Label" aria-hidden="true">Expenditures</div> <div class="Value">' + exp + '</div> </td> </tr>';
const HEAD = '"line number","item date",Cont/Exp,name,"address 1","address 2",city,state,zip,"cont. type",occupation,"item type",description,amount,"Amend. code",lastname\n';
const S01 = HEAD + [
  '1,2026-10-06,E,"EDGE Communications, LLC\t","1742 W Flagler Street",,MIAMI,FL,33135,,,MO,Consulting,2500.00,,"EDGE Communications, LLC\t"',
  '12,2026-10-06,E,"Bank of America\t","P.O. Box 25118",,Tampa,FL,33622,,,MO,"Bank fees",61.00,,"Bank of America\t"',
  '11,2026-10-06,E,"Good Catch Inc\t","PO Box 370366",,Miami,FL,33137,,,MO,"Campaign Attire",1074.00,,"Good Catch Inc\t"',
  '10,2026-10-06,E,"MDW Communications LLC\t","151 N Nob Hill Rd, ste 151",,Plantation,FL,33324,,,MO,"MMS Texting",11108.18,,"MDW Communications LLC\t"',
  '9,2026-10-06,E,"MDW Communications LLC\t","151 N Nob Hill Rd, ste 151",,Plantation,FL,33324,,,MO,"Direct Mail Consulting",12599.80,,"MDW Communications LLC\t"',
  '8,2026-10-06,E,"MDW Communications LLC\t","151 N Nob Hill Rd, ste 151",,Plantation,FL,33324,,,MO,"Direct Mail Consulting",6292.00,,"MDW Communications LLC\t"',
  '7,2026-10-06,E,"MDW Communications LLC\t","151 N Nob Hill Rd, ste 151",,Plantation,FL,33324,,,MO,Retainer,3510.00,,"MDW Communications LLC\t"',
  '5,2026-10-06,E,"MDW Communications LLC\t","151 N Nob Hill Rd, ste 151",,Plantation,FL,33324,,,MO,"Direct Mail Consulting",9468.00,,"MDW Communications LLC\t"',
  '4,2026-10-06,E,"EDGE Communications, LLC\t","1742 W Flagler Street",,MIAMI,FL,33135,,,MO,Advertising,26000.00,,"EDGE Communications, LLC\t"',
  '3,2026-10-06,E,"EDGE Communications, LLC\t","1742 W Flagler Street",,MIAMI,FL,33135,,,MO,"Digital Advertising",2750.00,,"EDGE Communications, LLC\t"',
  '2,2026-10-06,E,"EDGE Communications, LLC\t","1742 W Flagler Street",,MIAMI,FL,33135,,,MO,"Digital Advertising",1230.00,,"EDGE Communications, LLC\t"',
  '1,2026-10-06,C,"Rickenbacker Marina Corp\t","3301 Rickenbacker Cswy\t",,"Key Biscayne",FL,33149,B,Marina<br>Operators,CH,,250000.00,,"Rickenbacker Marina Corp\t"',
  '6,2026-10-06,E,"MDW Communications LLC\t","151 N Nob Hill Rd, ste 151",,Plantation,FL,33324,,,MO,"Campaign Collateral Production",3800.00,,"MDW Communications LLC\t"',
  '13,2026-10-07,E,"Inflence Communications LLC\t","9800 SW 82nd Ave   ",,Miami,FL,33176,,,MO,"Communications Retainer",3000.00,,"Inflence Communications LLC\t"',
  '14,2026-10-07,E,"Bank of America\t","P.O. Box 25118",,Tampa,FL,33622,,,MO,"Bank fees",1.00,,"Bank of America\t"',
  '16,2026-10-08,E,"Bank of America\t","P.O. Box 25118",,Tampa,FL,33622,,,MO,"Bank fees",1.00,,"Bank of America\t"',
  '15,2026-10-08,E,"Stephanie Bromfield and Assoc\t","6815 Biscayne Blvd # 103  ",,Miami,FL,33138,,,MO,Consulting,6000.00,,"Stephanie Bromfield and Assoc\t"',
  '17,2026-10-09,E,"EDGE Communications, LLC\t","1742 W Flagler Street",,Miami,FL,33135,,,MO,Advertising,92550.00,,"EDGE Communications, LLC\t"',
  '18,2026-10-09,E,"Bank of America\t","P.O. Box 25118",,Tampa,FL,33622,,,MO,"Bank fees",92.00,,"Bank of America\t"',
  '19,2026-10-09,E,"MDW Communications LLC\t","151 N Nob Hill Rd, ste 151",,Plantation,FL,33324,,,MO,"Direct Mail Consulting",39188.00,,"MDW Communications LLC\t"',
  '20,2026-10-09,E,"CVS Comms LLC\t","1111 NE 16th Ter Unit 2\t",,"Fort Lauderdale",FL,33304,,,MO,"Campaign Communications",3000.00,,"CVS Comms LLC\t"',
  '21,2026-10-09,E,"Inflence Communications LLC\t","9800 SW 82nd Ave   ",,Miami,FL,33176,,,MO,"Communications Retainer",3000.00,,"Inflence Communications LLC\t"',
  '22,2026-10-09,E,"WIN Canvassing, LLC\t","1742 W Flagler Street",,Miami,FL,33135,,,MO,Outreach,3500.00,,"WIN Canvassing, LLC\t"',
  '23,2026-10-09,E,"WIN Canvassing, LLC\t","1742 W Flagler Street",,Miami,FL,33135,,,MO,Outreach,8700.00,,"WIN Canvassing, LLC\t"',
  '24,2026-10-09,E,"EDGE Communications, LLC\t","1742 W Flagler Street",,Miami,FL,33135,,,MO,Polling,7750.00,,"EDGE Communications, LLC\t"'
].join('\n') + '\n';
const PAGE = '<table><tbody> ' + row(2160, 'S01', '10/1/2026 - 10/9/2026', '$250,000.00', '$0.00', '$247,174.98') + ' </tbody></table>';

test('measure filings: report list read from the committee page', () => {
  assert.deepEqual(w.vfReportList(PAGE), [{ dhc: '2160', code: 'S01', from: '2026-10-01', to: '2026-10-09', monetary: 250000, inkind: 0, spent: 247174.98 }]);
});

test('measure filings: rows add up to the posted totals; donors, shares and payees', () => {
  const f = w.tallyCommittee(w.vfReportList(PAGE), [S01]);
  assert.equal(f.raised, 250000);
  assert.equal(f.spent, 247174.98);
  assert.equal(f.through, '2026-10-09');
  assert.deepEqual(f.donors.map(d => [d.name, d.amount, d.share, d.type, d.place]), [['Rickenbacker Marina Corp', 250000, 100, 'corporation', 'Key Biscayne, FL']]);
  // "EDGE Communications, LLC" rows are one payee; largest first
  assert.equal(f.payees[0].name, 'EDGE Communications LLC');
  assert.equal(f.payees[0].amount, 132780);
  assert.match(f.payees[0].what, /^Advertising/);
  assert.equal(f.payees[1].name, 'MDW Communications LLC');
});

test('measure filings: a mismatch with the posted totals or a new export layout is an error', () => {
  const bad = PAGE.replace('$247,174.98', '$247,999.00');
  assert.throws(() => w.tallyCommittee(w.vfReportList(bad), [S01]), /do not match/);
  assert.throws(() => w.tallyCommittee(w.vfReportList(PAGE), [S01.replace('"Amend. code"', 'amend')]), /layout changed/);
  // a deleted line in an amendment comes off
  const amended = S01 + '24,2026-10-09,E,"EDGE Communications, LLC","1742 W Flagler Street",,Miami,FL,33135,,,MO,Polling,7750.00,D,"EDGE"\n';
  const f = w.tallyCommittee(w.vfReportList(PAGE.replace('$247,174.98', '$239,424.98')), [amended]);
  assert.equal(f.spent, 239424.98);
  // $1,100,000 of $1,100,100 is 99.9%, never rounded up to all of it
  const two = S01.replace('Corp\t"\n', 'Corp\t"\n9,2026-10-06,C,"EDGE Communications LLC","1742 W Flagler Street",,MIAMI,FL,33135,B,Consulting,CH,,100.00,,"EDGE"\n');
  const g = w.tallyCommittee(w.vfReportList(PAGE.replace('$250,000.00', '$250,100.00')), [two]);
  assert.deepEqual(g.donors.map(d => d.share), [99.9, 0]);
});

test('measure filings: replace web research, keep the last good on failure, leave other measures alone', async () => {
  assert.equal(w.measureFilingsFor('Referendum 3', 'Lease of Virginia Key marina property'), w.measureFilingsFor('Virginia Key marinas'));
  assert.equal(w.measureFilingsFor('Charter amendment on term limits', ''), null);
  const pages = {
    155: '<tbody>' + row(2163, 'S01', '10/1/2026 - 10/9/2026', '$1,000.00', '$0.00', '$0.00').replace(/ca=156/, 'ca=155') + '</tbody>',
    156: PAGE
  };
  const csv = { 2163: HEAD + '1,2026-10-01,C,"Suntex Marina Investors LLC","17330 Preston Rd - Ste 100C",,Dallas,TX,75252,B,"Marina Owner/Operator",CH,,1000.00,,"Suntex"\n', 2160: S01 };
  let down = false;
  globalThis.fetch = async u => {
    u = String(u);
    if (down) return new Response('', { status: 503 });
    const ca = (u.match(/ca=(\d+)/) || [])[1], dhc = (u.match(/dhc=(\d+)/) || [])[1];
    if (/op=cv/.test(u)) return new Response(pages[ca]);
    if (/export\.php/.test(u)) return new Response(csv[dhc]);
    throw new Error('unexpected ' + u);
  };
  const result = { summary: 'Lease of Virginia Key marina property', financing: { support: [{ name: 'Suntex Marinas', amount: '$1,500,000' }], oppose: [], note: 'press' } };
  assert.equal(await w.refreshMeasureFilings(null, result, 'Referendum 3', 1000), true);
  const fin = result.financing;
  assert.equal(fin.filed, true);
  assert.equal(fin.support.length, 1);
  assert.equal(fin.support[0].name, 'Help Save Virginia Key PC');
  assert.equal(fin.support[0].note, 'All of its money came from Suntex Marina Investors LLC.');
  assert.equal(fin.oppose[0].amount, '$250,000');
  assert.equal(fin.oppose[0].note, 'All of its money came from Rickenbacker Marina Corp.');
  assert.match(fin.note, /through Oct 9, 2026/);
  assert.equal(fin.research.support[0].name, 'Suntex Marinas');   // research kept aside, not shown
  // fresh: no refetch
  assert.equal(await w.refreshMeasureFilings(null, result, 'Referendum 3', 2000), false);
  // stale and the site is down: the filed numbers stay
  down = true;
  assert.equal(await w.refreshMeasureFilings(null, result, 'Referendum 3', 1000 + w.MEASURE_FILINGS_TTL + 1), true);
  assert.equal(result.financing.oppose[0].amount, '$250,000');
  // an LLC funder gets the "owners not listed" lookup
  w.markDisclosure(result);
  assert.equal(result.financing.support[0].filings.donors[0].disclosure, 'owners_not_listed');
});
