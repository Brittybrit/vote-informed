"""Governor and Cabinet items other than the Board of Trustees, 2019-01-11 to 2024-12-17 (Moody's tenure; Simpson from 2023-01-03).
Universe: every agenda item (raw/cabinet/agenda-items.json, from cabinet.myflorida.com archive agendas). Each item is classed:
  procedural   - minutes, rules, reports, appointments, budgets, policy statements, audit letters, discussions, honors
  government   - the only beneficiary is a government (state bond issues/refundings, fiscal sufficiency of state bonds, Keys reports...)
  private_unnamed - benefits private parties the agenda and transcript do not name (bond award winners, contract and purchase
                 reports, CDD petitions by unnamed landowners, Florida Housing determinations read without a project name,
                 municipal advisor selection, comprehensive-plan orders without a named private intervenor)
  private_named   - benefits a private party named in the agenda or read into the transcript (listed in 'actions' with the roll)
Rolls: votes are by motion; 'Hearing no objection, the motion carries' = yes for each member present (transcript cover / remarks).
SBA trustees are the Governor, CFO and Attorney General only; the other boards here are the Governor and all three Cabinet officers."""
import json, os, re
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(HERE, 'raw', 'cabinet')
A = json.load(open(os.path.join(D, 'agenda-items.json')))
IDX = {x['date']: x for x in json.load(open(os.path.join(D, 'index.json'))) if x['kind'] == 'Transcript'}
AG = {x['date']: x for x in json.load(open(os.path.join(D, 'index.json'))) if x['kind'] == 'Agenda'}
def cls(a):
    t, ag = a['title'], a['agency']
    if 'INTERNAL IMPROVEMENT' in ag: return 'bot'
    if re.search(r'Florida Housing', t): return 'private_unnamed'
    if re.search(r'Reports? of Award|Purchases|Contracts?\b|Contract Report|Municipal Advisors|Equipment Financing|Community Development District|Recommended Order|Final Order|Ramirez|Melzer', t, re.I): return 'private_unnamed'
    if re.search(r'Bond|Fiscal Sufficiency|Redemption|Keys Area|Shelter Plan|First Florida Governmental|Hurricane Catastrophe Fund|Prepaid College|Civil Service Board|Petitions for Appeal', t, re.I): return 'government'
    return 'procedural'
# private parties named in the record: (date, agency-substring, item) -> details
SEC = {'SBA': ['DeSantis', 'Moody', 'Patronis'], 'ALL': None}
NAMED = {
 ('2019-06-04', 'STATE BOARD', '3'): ('Mary Bethune-Cookman High Rise', 'multifamily housing refunding bonds; Tampa. Motion DeSantis; second Moody; no objection.', 'SBA'),
 ('2019-06-04', 'STATE BOARD', '4'): ('Parrish Oaks', 'not to exceed $14 million multifamily mortgage revenue bonds; acquisition and construction, 120 units, Manatee County. Motion DeSantis; second Moody; no objection.', 'SBA'),
 ('2019-06-04', 'STATE BOARD', '5'): ('Pembroke Tower Apartments', 'not to exceed $11 million; acquisition and rehab, Broward County. Motion DeSantis; second Patronis; no objection.', 'SBA'),
 ('2019-02-26', 'STATE BOARD', '3'): ('Suncrest Court', 'not more than $16 million multifamily mortgage bonds; acquisition, construction and equipment, 116 units, Broward County. Motion Moody; second Patronis.', 'SBA'),
 ('2019-02-26', 'STATE BOARD', '4'): ('The Palms at Town Center', 'not exceeding $9 million multifamily mortgage revenue bonds; new construction, 88 workforce units, Flagler County. Motion Moody; second Patronis; no objection.', 'SBA'),
 ('2020-02-04', 'STATE BOARD', '4'): ('Hibiscus Apartments', 'not to exceed $11 million multifamily mortgage revenue notes; new construction, 96 units, Lee County', 'SBA'),
 ('2020-02-04', 'STATE BOARD', '5'): ('Meridian Apartments', 'not to exceed $15,300,000 multifamily housing revenue bonds; acquisition and rehab, 160 senior units, Hollywood', 'SBA'),
 ('2020-02-04', 'STATE BOARD', '6'): ('Northside Transit Village II', 'not to exceed $20,800,000 multifamily mortgage revenue bonds; new construction, 180 units, Miami-Dade', 'SBA'),
 ('2020-05-28', 'STATE BOARD', '20'): ('Hilltop Point', 'not to exceed $5.3 million multifamily revenue notes; new construction, 50 units, Bay County', 'SBA'),
 ('2020-05-28', 'STATE BOARD', '21'): ('Springfield Crossings', 'not to exceed $6.7 million multifamily mortgage revenue bonds; new construction, 60 units, Bay County', 'SBA'),
 ('2020-09-22', 'STATE BOARD', '7'): ('Fairlong Village', 'not to exceed $12 million multifamily mortgage revenue bonds; new construction, 116 units, Orange County', 'SBA'),
 ('2021-03-09', 'STATE BOARD', '2'): ('Ambar Trail', 'not to exceed $32 million multifamily mortgage revenue bonds; acquisition and construction, 210 units, Miami-Dade', 'SBA'),
 ('2021-03-09', 'STATE BOARD', '3'): ('Madison Point', 'not to exceed $39 million multifamily mortgage revenue bonds; new construction, 263 units, Miami-Dade', 'SBA'),
 ('2021-03-09', 'STATE BOARD', '4'): ('Magnolia Oaks', 'not to exceed $12.5 million mortgage revenue notes; new construction, 110 units, Leon County', 'SBA'),
 ('2021-03-09', 'STATE BOARD', '5'): ('Parrish Oaks II', 'not to exceed $6 million multifamily mortgage revenue bonds; new construction, 48 units, Manatee County', 'SBA'),
 ('2021-06-15', 'STATE BOARD', '2'): ('Park at Palo Alto', 'not to exceed $12,500,000 multifamily mortgage revenue bonds; new construction, 120 units, Bay County', 'SBA'),
 ('2021-06-15', 'STATE BOARD', '3'): ('Saratoga Crossings 3', 'not to exceed $13 million multifamily mortgage revenue bonds; new construction, 75 units, Broward County', 'SBA'),
 ('2021-12-20', 'STATE BOARD', '1'): ('Fletcher Black', 'not to exceed $11,500,000 multifamily mortgage revenue notes; Bay County', 'SBA'),
 ('2021-12-20', 'STATE BOARD', '2'): ('Bridge Plaza Apartments', 'not to exceed $15,500,000 multifamily mortgage revenue bonds; Miami-Dade', 'SBA'),
 ('2021-12-20', 'STATE BOARD', '3'): ('The Arbors', 'not to exceed $20,000,000 multifamily mortgage revenue bonds; Miami-Dade', 'SBA'),
 ('2021-12-20', 'STATE BOARD', '4'): ('The Harmony on Santa Barbara', 'not to exceed $12,500,000 multifamily mortgage revenue bonds; Collier County', 'SBA'),
 ('2021-12-20', 'STATE BOARD', '5'): ('The Allegro at Hacienda Lakes', 'not to exceed $22,500,000 multifamily housing revenue bond; Naples', 'SBA'),
 ('2021-12-20', 'STATE BOARD', '6'): ('Canopy at West River (West River Towers 1 and 2)', 'not to exceed $39,000,000 multifamily mortgage revenue bonds; Hillsborough County', 'SBA'),
 ('2021-12-20', 'STATE BOARD', '7'): ('Tupelo Park', 'not to exceed $8,200,000 multifamily mortgage revenue notes; Bay County', 'SBA'),
 ('2022-03-29', 'STATE BOARD', '6'): ('Brownsville Transit Village 5', 'not to exceed $16,510,000 multifamily mortgage revenue bonds; Miami-Dade', 'SBA'),
 ('2022-03-29', 'STATE BOARD', '7'): ('Arbors at Quincy', 'not to exceed $11,700,000 multifamily mortgage revenue bonds; Gadsden County', 'SBA'),
 ('2022-06-22', 'STATE BOARD', '2'): ('Cadenza at Hacienda Lakes', 'not to exceed $24,500,000 multifamily mortgage revenue notes; 160 units, Collier County', 'SBA'),
 ('2022-06-22', 'STATE BOARD', '3'): ('Northside Transit Village III', 'not to exceed $26,180,000 multifamily mortgage revenue bonds; 200 units, Miami-Dade', 'SBA'),
 ('2022-08-23', 'ADMINISTRATION COMMISSION', '2'): ('Southern Comfort Storage, LLC', 'Semmer v. Lee County and Southern Comfort Storage, LLC (intervenor): the Commission overruled the ALJ and voted to find the Lee County plan amendment for 7.5 acres on San Carlos Island (up to 113 units) in compliance, and directed a final order. Motion DeSantis; seconds Patronis and Moody; Fried spoke in favor.', 'ALL'),
 ('2023-12-19', 'FLORIDA LAND AND WATER', '1'): ('Premier Citrus, LLC', 'Petition to amend the boundary of the Capron Trail Community Development District (St. Lucie County): add 2 acres and another 456 acres. The transcript names the petitioner, Premier Citrus, LLC, as owner of most of the land in the district. Motion DeSantis; second Patronis; no objection.', 'ALL'),
 ('2023-01-17', 'ADMINISTRATION COMMISSION', '2'): ('Southern Comfort Storage, LLC', 'Final order adopted in Semmer v. Lee County and Southern Comfort Storage, LLC finding the amendment in compliance. Motion DeSantis; second Patronis; no objection.', 'ALL'),
}
# named only in a Cabinet Aides transcript (the archive has no meeting transcript): party known, vote not read
AIDES = {
 ('2019-07-25', 'STATE BOARD', '3'): ('Daytona Gardens Apartments', 'not exceeding $20 million multifamily mortgage revenue bonds; Volusia County'),
 ('2019-07-25', 'STATE BOARD', '4'): ('Osprey Point', 'not exceeding $11,050,000 multifamily mortgage revenue notes; 110 units, Pasco County'),
 ('2019-07-25', 'POWER PLANT SITING', '2'): ('Tampa Electric Company', 'Final order certifying Big Bend generating station Units 1-3 and its modernization project (Hillsborough County) under the Power Plant Siting Act, adopting the ALJ recommended order'),
 ('2019-09-24', 'STATE BOARD', '3'): ('Azura Estates', 'not exceeding $40,030,000 multifamily housing revenue bonds; 216 units, Palm Beach County'),
 ('2019-09-24', 'STATE BOARD', '4'): ('Brisas del Rio Apartments', 'not exceeding $19,500,000 multifamily mortgage revenue notes; 168 units, Miami-Dade County'),
 ('2019-09-24', 'STATE BOARD', '5'): ('Jordan Park', 'not exceeding $27,400,000 multifamily mortgage revenue notes; 266 units, Pinellas County'),
 ('2019-09-24', 'STATE BOARD', '6'): ('Providence Reserve Seniors', 'not exceeding $12 million multifamily mortgage revenue notes; 139 units, Polk County'),
 ('2019-09-24', 'STATE BOARD', '7'): ('Suncrest Court', 'not exceeding $16,000,000 multifamily mortgage revenue notes; 116 units, Broward County'),
 ('2019-09-24', 'STATE BOARD', '8'): ('Twin Lakes Estates Phase 2', 'not exceeding $12,100,000 multifamily mortgage revenue bonds; 132 units, Polk County'),
 ('2019-09-24', 'STATE BOARD', '9'): ('Waters Edge Apartments', 'not exceeding $14,250,000 multifamily mortgage revenue bonds; 128 units, Miami-Dade County'),
 ('2019-09-24', 'STATE BOARD', '11'): ('Federation Gardens 1 and 2', 'not exceeding $39,050,000 multifamily mortgage revenue notes; 161 units, Miami-Dade County'),
 ('2019-09-24', 'STATE BOARD', '12'): ('Federation Towers', 'not exceeding $28,245,000 multifamily mortgage revenue notes; 114 units, Miami-Dade County'),
}
SEATED = {'DeSantis': ('2019-01-08', None), 'Moody': ('2019-01-08', '2025-01-21'), 'Patronis': ('2017-06-30', '2025-03-31'), 'Fried': ('2019-01-08', '2023-01-03'), 'Simpson': ('2023-01-03', None)}
def roll(date, who):
    ks = SEC['SBA'] if who == 'SBA' else list(SEATED)
    return {k: 'yes' for k in ks if SEATED[k][0] <= date and (SEATED[k][1] is None or date < SEATED[k][1])}
items, actions = [], []
for a in A:
    if not ('2019-01-08' <= a['date'] <= '2025-01-21'): continue
    c = cls(a)
    if c == 'bot': continue
    key = next((k for k in NAMED if k[0] == a['date'] and k[1] in a['agency'] and k[2] == a['item']), None)
    akey = next((k for k in AIDES if k[0] == a['date'] and k[1] in a['agency'] and k[2] == a['item']), None)
    if key or akey: c = 'private_named'
    rec = {'date': a['date'], 'agency': a['agency'], 'item': a['item'], 'title': a['title'], 'class': c,
           'agenda': AG.get(a['date'], {}).get('url'), 'transcript': IDX.get(a['date'], {}).get('url')}
    items.append(rec)
    if key:
        party, what, who = NAMED[key]
        actions.append({'id': 'cab-%s-%s-%s' % (a['date'], 'sba' if who == 'SBA' else 'ac', a['item']), 'date': a['date'],
            'ref': a['agency'].title() + ' item ' + a['item'], 'title': a['title'] + ' (' + party + ')', 'kind': 'housing_bond_determination' if who == 'SBA' else ('cdd_petition' if 'District' in a['title'] else 'land_use_order'),
            'parties': [party], 'summary': what, 'result': 'approved', 'roll': roll(a['date'], who), 'url': rec['transcript'], 'record': {'agenda': rec['agenda'], 'transcript': rec['transcript']},
            'notes': ('Florida Housing Finance Corporation multifamily bonds; the State Board of Administration fiscal determination lets the bonds be issued for this private development. The transcript names the development, not the owner entity. ' if who == 'SBA' else '') + 'Vote by motion; no objection recorded.'})
    if akey and not key:
        party, what = AIDES[akey]
        actions.append({'id': 'cab-%s-%s-%s' % (a['date'], 'sba' if 'STATE BOARD' in a['agency'] else 'ppsb', a['item']), 'date': a['date'], 'ref': a['agency'].title() + ' item ' + a['item'],
            'title': a['title'] + ' (' + party + ')', 'kind': 'housing_bond_determination' if 'STATE BOARD' in a['agency'] else 'siting_certification', 'parties': [party], 'summary': what,
            'result': None, 'roll': None, 'url': rec['transcript'], 'record': {'agenda': rec['agenda'], 'transcript': rec['transcript']},
            'notes': 'Named in the Cabinet Aides meeting transcript, the only transcript the archive posts for this date. The vote at the Cabinet meeting is not in any record read here, so no result or roll call is given.'})
import collections
out = {'body': 'Governor and Cabinet: State Board of Administration, Division of Bond Finance, Administration Commission, Florida Land and Water Adjudicatory Commission, Power Plant Siting Board, Office of Insurance Regulation, Office of Financial Regulation, Department of Revenue, FDLE, DHSMV, Department of Veterans\' Affairs',
 'window': {'from': '2019-01-11', 'to': '2024-12-17'},
 'sources': [{'name': 'Governor and Cabinet meeting archive (agendas and transcripts)', 'url': 'https://www.cabinet.myflorida.com/cabinet_meeting_archive/2022_meetings_of_the_governor_and_cabinet'}],
 'counts': dict(collections.Counter(i['class'] for i in items)), 'actions': sorted(actions, key=lambda x: x['date'], reverse=True), 'items': items,
 'excludedNamed': [
   {'date': '2021-06-15', 'ref': 'Administration Commission item 2', 'parties': ['Limonar Development, LLC', 'Wonderly Holdings, LLC', 'Mills Family, LLC', 'Tropical Audubon Society'], 'why': 'Named petitioners lost: the Commission sided with Miami-Dade County (Kendall Parkway plan amendment fairly debatable) and directed a final order. Roll call at the end of the transcript: DeSantis yes, Patronis yes, Moody concurred with the Governor, Fried no (would adopt the ALJ order). Beneficiary is a government plan amendment, not the named parties.'},
   {'date': '2021-09-21', 'ref': 'Administration Commission item 1', 'parties': ['Limonar Development, LLC', 'Wonderly Holdings, LLC', 'Mills Family, LLC', 'Tropical Audubon Society', 'Michelle Garcia'], 'why': 'Final order granting Miami-Dade County\'s exceptions and finding the Kendall Parkway plan amendment in compliance; the named petitioners lost. Motion DeSantis, second Patronis; Fried opposed in remarks.'}],
 'gaps': ['2019 transcripts are scans; OCR text in raw/cabinet/2019-*_transcript.ocr.txt. Florida Housing project names for 2019 items are added only where the OCR text reads them.', 'For 2019-05-29, 2019-07-25, 2019-09-24, 2019-10-08 and 2019-10-22 the archive posts no meeting transcript (only a Cabinet Aides transcript or none). Parties named in an aides transcript are listed with result and roll null; no vote is given for those dates.',
          'Items in class private_unnamed name no beneficiary in the agenda or transcript (the backup that names bond award winners, FDLE and DHSMV vendors, CDD landowners and some Florida Housing developments is on agency sites not reachable here); they are counted, not listed, per the standard.',
          'Movers and seconders are recorded in the transcripts but were not copied item by item except where noted.']}
os.makedirs(os.path.join(HERE, 'cabinet-other'), exist_ok=True)
json.dump(out, open(os.path.join(HERE, 'cabinet-other', 'actions.json'), 'w'), indent=1, ensure_ascii=False)
print(out['counts'], len(actions))
