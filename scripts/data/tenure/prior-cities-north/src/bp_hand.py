"""Adds Biscayne Park actions the motion parser cannot split out (consent agenda resolutions and 2020-2022 votes written
in other formats), each read by hand from the minutes, to the parsed items. Usage: python3 bp_hand.py <items.json> <bp dir> <out.json>"""
import json, sys, os, copy
IT, BP, OUT = sys.argv[1:4]
items = json.load(open(IT)); by = {r['key']: r for r in items}
URLS = {}
for ln in open(os.path.join(BP, 'urls.txt')):
    ln = ln.strip()
    if ln: URLS[os.path.basename(ln)[:-4]] = 'https://biscayneparkfl.gov' + ln
C20 = ["O'Halpin", 'Kennedy', 'Tudor', 'Ross', 'Samaria']
C21 = ["O'Halpin", 'Kennedy', 'Gonzalez', 'Hamelburg', 'Samaria']
def allyes(ms): return {m: 'yes' for m in ms}
def consent(ck, ref, title):
    c = by[ck]; r = copy.deepcopy(c); r.update(key=ck + '-' + ref.replace('Resolution ', 'R'), ref=ref, title=title, what='consent agenda: ' + c['what'], consent=True)
    return r
def hand(key, date, doc, ref, title, roll, mover=None, second=None, result='passed', note=None):
    u = URLS.get(doc)
    return dict(key=key, date=date, meeting='regular', title=title, what=title, ref=ref, roll=roll, tally=None, mover=mover, second=second, result=result,
                consent=False, url=u, minutes=u, src='minutes', note=note or 'Vote read by hand from the minutes.', ctx='', after='', doc=doc + '.txt')
add = [
    consent('bp-2019-12-03-2', 'Resolution 2019-28', 'Agreement for a judo program with Josue Deprez'),
    consent('bp-2020-06-02-4', 'Resolution 2020-29', 'Extension of the Calvin, Giordano & Associates agreement'),
    consent('bp-2020-10-06-6', 'Resolution 2020-52', 'Ratifying a $2,500 donation to the North Miami Foundation for Senior Services, Inc.'),
    consent('bp-2021-03-02-1', 'Resolution 2021-11', 'Agreements with Envirowaste Services Group, National Water Main Cleaning and Shenandoah General Construction for storm drain cleaning and video inspection'),
    consent('bp-2021-10-05-1', 'Resolution 2021-54', 'Professional services contract with Grind Fitness instructor Jairo Moralos for a wellness program'),
    consent('bp-2022-01-11-1', 'Resolution 2022-02', 'Agreement with Meraki Sports, LLC for beach tennis at Ed Burke Park'),
    consent('bp-2022-04-05-1', 'Resolution 2022-17', 'First amendment to the Meraki Sports, LLC agreement assigning it to Agilis Sports, LLC'),
    hand('bp-2020-09-01-R2020-46', '2020-09-01', 'Minutes_-_Regular_Commission_Meeting_09_01_2020', 'Resolution 2020-46', 'Extension of Waste Pro of Florida, Inc. services to December 31, 2020', allyes(C20), 'Ross', "O'Halpin", note='Roll call recorded in the minutes.'),
    hand('bp-2020-09-01-R2020-42', '2020-09-01', 'Minutes_-_Regular_Commission_Meeting_09_01_2020', 'Resolution 2020-42', 'Credit card merchant services agreement with Synovus Bank and TSYS Merchant Solutions LLC', allyes(C20), 'Samaria', None, note='Roll call recorded in the minutes.'),
    hand('bp-2020-09-01-cga', '2020-09-01', 'Minutes_-_Regular_Commission_Meeting_09_01_2020', None, 'Engage Calvin Giordano & Associates to work with the village and FDOT on the 6th Avenue proposals', allyes(C20), 'Kennedy', 'Samaria', note='Passed 5-0 per the minutes with all five members present.'),
    hand('bp-2021-11-17-R2021-53', '2021-11-17', 'November_17_2021_Special_Commission_Meeting', 'Resolution 2021-53', 'Agreement with Calvin, Giordano & Associates, Inc. for building plan review, inspection and planning services (65/35 permit revenue split, as amended)', allyes(C21), "O'Halpin", None, note='Passed 5-0 per the minutes with all five members present.'),
    hand('bp-2021-11-17-R2021-61', '2021-11-17', 'November_17_2021_Special_Commission_Meeting', 'Resolution 2021-61', 'Purchase of OpenGov cloud ERP software through Carahsoft Technology Corp. (up to $139,195.40), as amended', allyes(C21), "O'Halpin", None, note='Passed 5-0 per the minutes with all five members present.'),
    hand('bp-2021-12-07-R2021-66', '2021-12-07', 'December_7_2021_Regular_Commission_Meeting_Minutes', 'Resolution 2021-66', 'Agreement with Access Information Management Corporation d/b/a Access for records scanning (up to $116,000), approved on consent', allyes(C21), 'Kennedy', 'Samaria', note='Consent agenda passed 5-0 per the minutes with all five members present.'),
    hand('bp-2022-02-08-R2022-09', '2022-02-08', 'February_8_2022_Regular_Commission_Meeting', 'Resolution 2022-09', 'Awarding RFP 2022-001 to Media Relations Group, LLC for communication support services', {"O'Halpin": 'yes', 'Kennedy': 'no', 'Gonzalez': 'yes', 'Hamelburg': 'yes', 'Samaria': 'yes'}, 'Samaria', 'Hamelburg', note='Roll call recorded in the minutes.'),
    hand('bp-2022-05-03-R2022-20', '2022-05-03', 'May_3_2022_Regular_Commisson_Meeting_Minutes', 'Resolution 2022-20', 'Employee health, life, dental and vision insurance with Florida Blue, Unum Life Insurance and Solstice', allyes(C21), note='Passed 5-0 per the minutes with all five members present.'),
    hand('bp-2022-05-03-R2022-21', '2022-05-03', 'May_3_2022_Regular_Commisson_Meeting_Minutes', 'Resolution 2022-21', 'Bluebeam, Inc. plan review software licenses (up to $5,476), bidding waived', allyes(C21), note='Passed 5-0 per the minutes with all five members present.'),
    hand('bp-2022-05-03-R2022-22', '2022-05-03', 'May_3_2022_Regular_Commisson_Meeting_Minutes', 'Resolution 2022-22', 'Disaster debris removal agreements with Ceres Environmental Services, Inc. and TFR Enterprises, Inc. (RFP 2022-003)', allyes(C21), note='Passed 5-0 per the minutes with all five members present.'),
    hand('bp-2022-05-03-R2022-23', '2022-05-03', 'May_3_2022_Regular_Commisson_Meeting_Minutes', 'Resolution 2022-23', 'Design-build phase 1A drainage and roadway improvements awarded to GenCon Partners, Inc. (up to $1,078,590.70)', allyes(C21), 'Samaria', 'Hamelburg', note='Passed 5-0 per the minutes with all five members present.'),
    hand('bp-2022-05-03-R2022-24', '2022-05-03', 'May_3_2022_Regular_Commisson_Meeting_Minutes', 'Resolution 2022-24', 'Lease of a copier from Toshiba American Business Solutions, Inc. ($6,694.56 over 48 months)', allyes(C21), 'Samaria', 'Kennedy', note='Passed 5-0 per the minutes with all five members present.'),
    hand('bp-2022-06-07-R2022-30', '2022-06-07', 'JUNE_7_2022_COMMISSION_MEETING_MINUTES', 'Resolution 2022-30', 'Apply for and enter into an agreement for a Stripe payment account', allyes(C21), 'Kennedy', 'Hamelburg', note='Passed 5-0 per the minutes with all five members present.'),
    hand('bp-2022-06-07-R2022-31', '2022-06-07', 'JUNE_7_2022_COMMISSION_MEETING_MINUTES', 'Resolution 2022-31', 'Purchase of one dewatering pump (up to $50,000), bidding waived; vendor not named', allyes(C21), 'Kennedy', 'Samaria', note='Passed 5-0 per the minutes with all five members present.'),
    hand('bp-2022-08-16-R2022-39', '2022-08-16', '8.16.2022_Regular_Commission_minutes-approved', 'Resolution 2022-39', 'Awarding RFP 2022-005 to C.A.P. Government, Inc.', allyes(C21), 'Hamelburg', 'Gonzalez', note='Passed 5-0 per the minutes with all five members present.'),
    hand('bp-2022-10-04-O2022-10', '2022-10-04', 'October_4_2022_Regular_Commission_Meeting_Minutes', 'Ordinance 2022-10', 'First amendment to the solid waste franchise agreement with Great Waste and Recycling Services, LLC (second reading)', {"O'Halpin": 'yes', 'Samaria': 'no', 'Gonzalez': 'yes', 'Hamelburg': 'yes', 'Kennedy': 'no'}, 'Hamelburg', 'Gonzalez', note='Roll call recorded in the minutes.'),
]
for r in add:
    if r['roll']:
        r['tally'] = [sum(1 for v in r['roll'].values() if v == 'yes'), sum(1 for v in r['roll'].values() if v == 'no')]
    if r['key'] in by: raise SystemExit('dup ' + r['key'])
items += add
json.dump(items, open(OUT, 'w'), indent=0, ensure_ascii=False); print(len(add), 'hand items;', len(items), 'total')
