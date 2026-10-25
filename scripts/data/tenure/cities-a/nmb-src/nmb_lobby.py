"""Add tenure-era (2022-12 .. 2024-12) lobbyist links to scripts/data/city/nmb/lobbyists.json.
registry: NMB Registered Lobbyist lists 2023 (DocumentCenter/View/10962) and 2024 (View/12769), parsed to nmb/reg/reg.json
(nmb/regparse.py). A registration counts only when it is for the same entity, dated on or before the vote, in that year's
list, and not withdrawn before the vote. record: people the minutes name as representing the party on the item."""
import json, re, sys, os
from datetime import date
REPO = sys.argv[1]
P = os.path.join(REPO, 'scripts/data/city/nmb/lobbyists.json')
L = json.load(open(P))
A = {a['id']: a for a in json.load(open(os.path.join(REPO, 'scripts/data/city/nmb/tenure/actions.json')))['actions']}
R = json.load(open('nmb/reg/reg.json'))
SRC = {2023: 'https://www.citynmb.com/DocumentCenter/View/10962', 2024: 'https://www.citynmb.com/DocumentCenter/View/12769'}
MURL = 'https://nmb.novusagenda.com/agendapublic/DisplayAgendaPDF.ashx?MinutesMeetingID=%s'
# action id -> list of (principal as printed in registry, party label on the action)
REG = {
 'R2022-168': [('BH-SG OWNER LLC', 'BH-SG Owner LLC')],
 'R2023-68': [('PRESTIGUE BOARDWALK, LLC', 'Prestige Boardwalk LLC')],
 'R2023-86': [('PRESTIGUE BOARDWALK, LLC', 'Prestige Boardwalk LLC')],
 'R2023-71': [('CARBYNE, INC.', 'Carbyne, Inc.')],
 'R2023-85': [('1700 NE 164 ASSOCIATES, LLC', '1700 NE 164 Associates, LLC')],
 'R2023-102': [('PROTRANSPORTATION, INC.', 'Pro Transportation, Inc. (Prokel Mobility)')],
 'R2023-103': [('LANAAR PROPERTIES LLC', 'Lanaar Properties LLC')],
 'R2023-104': [('UNIVIDA MEDICAL CENTER', 'Univida Medical Center'), ('IVANA. HERRERA-UniVida MEDICAL', 'Univida Medical Center'), ('17100 PROPERTY HOLDINGS LLC', '17100 Property Holdings LLC')],
 'R2023-105': [('PPG ARK EQUISHARES OWNER, LLC', 'PPG ARK Equishares Owner LLC'), ('PPG ARK EQUISHARES OWNER LLC', 'PPG ARK Equishares Owner LLC')],
 'R2023-120': [('CITADEL CARE CENTERS', 'Citadel Care Centers')],
 'R2023-121': [('BULLISH INTERNATIONAL', 'Bullish International (B-side Liquors)')],
 'R2023-119': [('MAY NMB LLC', 'May NMB LLC')],
 '2023-10-17-deans': [('PLATINUM SOUTH, INC.', "Platinum South Inc. (Dean's Gold)")],
 'R2024-44': [('PROTRANSPORTATION, INC.', 'Pro Transportation, Inc. (Prokel Mobility)')],
 'R2024-70': [('AHS RESIDENTIAL, LLC', 'AHS Residential, LLC (Resia)'), ('AHS RESIDENTIAL, LLC d/b/a RESIA', 'AHS Residential, LLC (Resia)'), ('NEW NORTH STRATEGIES, INC.', 'New North (15780 W Dixie Hwy)')],
 'R2024-71': [('AHS RESIDENTIAL, LLC', 'AHS Residential, LLC (Resia)'), ('AHS RESIDENTIAL, LLC d/b/a RESIA', 'AHS Residential, LLC (Resia)'), ('NEW NORTH STRATEGIES, INC.', 'New North (15780 W Dixie Hwy)')],
 'ord-2024-10': [('AHS RESIDENTIAL, LLC', 'AHS Residential, LLC (Resia)'), ('AHS RESIDENTIAL, LLC d/b/a RESIA', 'AHS Residential, LLC (Resia)'), ('NEW NORTH STRATEGIES, INC.', 'New North (15780 W Dixie Hwy)')],
 'R2024-78': [('ELEVATE 163 NORTH MIAMI BEACH,', 'Elevate 163 North Miami Beach LLC'), ('ELEVATE 163 NORTH MIAMI BEACH, LLC', 'Elevate 163 North Miami Beach LLC')],
 'R2024-131': [('TRINSIC ACQUISITION COMPANY LLC', 'Trinsic Acquisition Company LLC (Aura North Miami Beach)')],
 '2024-12-17-brunson': [('ANTHONY BRUNSON PA', 'Anthony Brunson P.A.')],
}
# record-named representatives (minutes): action id -> [(name, firm, for, quote)]
REC = {
 'R2022-168': [('Matthew Amster', 'Bercow Radell Fernandez Larkin & Tapanes', 'BH 164 applicant/owner', 'Matthew Amster and Sandy Peaceman appeared before the Mayor and Commission to represent the applicant/owner'), ('Sandy Peaceman', None, 'BH 164 applicant/owner', 'Matthew Amster and Sandy Peaceman appeared before the Mayor and Commission to represent the applicant/owner')],
 'R2022-169': [('Ben Fernandez', 'Bercow Radell Fernandez Larkin & Tapanes', 'Biscayne Office Complex applicant/owner', 'Ben Fernandez appeared before the Mayor and Commission to represent the applicant/owner')],
 'R2023-68': [('Pedro Gassant', 'Holland & Knight', 'Prestige Boardwalk', 'Pedro Gassant of Holland and Knight and Manuel Del Monte of Zyscovich provided a presentation'), ('Manuel Del Monte', 'Zyscovich', 'Prestige Boardwalk', 'Pedro Gassant of Holland and Knight and Manuel Del Monte of Zyscovich provided a presentation')],
 'R2023-73': [('Eduardo Robayna', None, 'An owner of North Miami Beach Village', 'Eduardo Robayna appeared before the Acting Mayor and Commission on behalf of one of the owners of the property')],
 'R2023-85': [('Ethan Wasserman', 'Greenberg Traurig', 'The Helios applicant', 'Ethan Wasserman appeared before the Acting Mayor and Commission on behalf of the applicant')],
 'R2023-86': [('Pedro Gassant', 'Holland & Knight', 'Prestige Boardwalk', 'Pedro Gassant appeared before the Acting Mayor and Commission on behalf of the applicant')],
 'R2023-103': [('Matt Amster', 'Bercow Radell Fernandez Larkin & Tapanes', 'Lanaar Academy applicant/owner', 'Matt Amster represented the applicant/property owner')],
 'R2023-104': [('Javier Vazquez', 'Berger Singerman', 'Univida Medical Center applicant/owner', 'Javier Vazquez represented the applicant/property owner')],
 'R2023-105': [('Matt Amster', 'Bercow Radell Fernandez Larkin & Tapanes', 'Palm Aire applicant/owner', 'Matt Amster represented the applicant/property owner'), ('Kobi Karp', 'Kobi Karp Architecture', 'Palm Aire applicant/owner', 'Kobi Karp presented the master site plan')],
 'R2023-119': [('Matthew Amster', 'Bercow Radell Fernandez Larkin & Tapanes', 'May NMB applicant/owner', 'Matthew Amster appeared before the Mayor and Commission and represented the applicant/property owner (Dec 19, 2023)')],
 'R2023-120': [('Javier Vazquez', 'Berger Singerman', 'Citadel Care Center applicant/owner', 'Javier Vazquez appeared before the Mayor and Commission and represented the applicant/property owner')],
 'R2023-121': [('Willis Andrews', 'Spectra Holdings Group', 'B-side Liquors applicant/owner', 'Willis Andrews appeared before the Mayor and Commission and represented the applicant/property owner')],
 '2023-10-17-deans': [('Alan Rosenthal', 'Rosenthal Rosenthal Rasco', "Dean's Gold", 'Alan Rosenthal appeared before the City Commission to represent the business')],
 'R2024-42': [('Michael Snyder', 'Michael J. Snyder & Assoc., P.A.', '3rd Day Church, Inc.', 'Michael Snyder appeared before the Mayor and Commission on behalf of 3rd Day Church')],
 'R2024-58': [('Joseph Geller', 'Greenspoon Marder', 'Greenspoon Marder, LLP', 'Joseph Geller appeared before the Mayor and Commission')],
 'R2024-69': [('Patience Shaffer', None, 'At Home store', 'Patience Shaffer appeared before the Mayor and Commission on behalf of the At Home store')],
 'R2024-72': [('Eduardo Machado', None, 'Howl Nation, 16385 Biscayne Blvd', 'Eduardo Machado appeared before the Mayor and Commission on behalf of the property located at 16385 Biscayne Boulevard')],
 'R2024-70': [('Pedro Gassant', 'Holland & Knight', 'New North applicant', 'Pedro Gassant appeared before the Mayor and Commission and presented the request for site plan approval with variances, alley vacation, development agreement amendment')],
 'R2024-71': [('Pedro Gassant', 'Holland & Knight', 'New North applicant', 'Pedro Gassant appeared before the Mayor and Commission and presented the request for site plan approval with variances, alley vacation, development agreement amendment')],
 'ord-2024-10': [('Pedro Gassant', 'Holland & Knight', 'New North applicant', 'Pedro Gassant appeared before the Mayor and Commission and presented the request for site plan approval with variances, alley vacation, development agreement amendment')],
 'R2024-78': [('Matt Amster', 'Bercow Radell Fernandez Larkin & Tapanes', 'Elevate 163 applicant', 'Matt Amster appeared before the Mayor and Commission on behalf of the applicant')],
 '2024-08-27-g5ive': [('Shemara Todd', None, 'G5ive (Taboo Miami)', 'Shemara Todd and Noel Johnson appeared before the Mayor and Commission on behalf of the establishment'), ('Noel Johnson', None, 'G5ive (Taboo Miami)', 'Shemara Todd and Noel Johnson appeared before the Mayor and Commission on behalf of the establishment')],
 'R2024-131': [('Vanessa Madrid', 'Holland & Knight', 'Central Subdivision (Aura) applicant/developer', 'Vanessa Madrid appeared on behalf of the applicant/developer')],
 '2024-12-17-brunson': [('Tony Brunson', 'Anthony Brunson P.A.', 'Anthony Brunson P.A.', 'Tony Brunson appeared before the Mayor and Commission and represented the Anthony Brunson firm')],
 '2024-12-17-marcum': [('Mo Ariza', 'Marcum, LLP', 'Marcum, LLP', 'Mo Ariza appeared before the Mayor and Commission and represented the Marcum firm')],
 'R2024-124': [('Mo Ariza', 'Marcum, LLP', 'Marcum, LLP', 'Mo Ariza appeared before the Mayor and Commission and represented the Marcum firm')],
}
def d(s):
    m, dd, y = s.split('/'); y = int(y); y = y + 2000 if y < 100 else y; return date(y, int(m), int(dd))
def wd(r):
    w = r.get('withdrawn')
    if isinstance(w, str):
        m = re.search(r'(\d{1,2}/\d{1,2}/\d{2,4})', w)
        if m: return d(m.group(1))
    return None
def tc(s):
    s = re.sub(r'\s{2,}.*$', '', s.strip())
    KEEP = {'LLC', 'LLP', 'PA', 'P.A.', 'II', 'III', 'NMB', 'AHS', 'RSP', 'JR.', 'GT'}
    out = ' '.join(w if w.upper() in KEEP else w.capitalize() for w in s.split())
    for a, b in [('Mcdowell', 'McDowell'), ('Mcdearmaid', 'McDearmaid'), ('Greenerg', 'Greenberg'), ('Kimley-hom', 'Kimley-Horn'), ('Kimley-horn', 'Kimley-Horn'), ('“bobby”', '"Bobby"'), ('Architecs', 'Architects')]:
        out = out.replace(a, b)
    FIX = {'Bercow Radell Fernandez': 'Bercow Radell Fernandez Larkin & Tapanes, PLLC', 'Bercow Radell Fernandez &': 'Bercow Radell Fernandez Larkin & Tapanes, PLLC', 'Bercow Radell Fernandez Larkin': 'Bercow Radell Fernandez Larkin & Tapanes, PLLC',
           'Strategic Campaign': 'Strategic Campaign Consultants', 'AHS Residential, LLC D/b/a Resia': 'AHS Residential, LLC (Resia)', 'Kimley-Horn And Associates, Inc': 'Kimley-Horn and Associates, Inc.',
           'Lsn Partners, LLC': 'LSN Partners, LLC', 'Kobi Karp Architecture & Interior': 'Kobi Karp Architecture & Interior Design'}
    return FIX.get(out, out)
n = {'registry': 0, 'record': 0}
for aid in sorted(set(REG) | set(REC)):
    a = A[aid]; ad = date.fromisoformat(a['date']); out = []
    for princ, label in REG.get(aid, []):
        for r in R:
            if r['principal'] != princ or r['year'] != ad.year: continue
            rd = d(r['date']); w = wd(r)
            if rd > ad or (w and w <= ad): continue
            e = {'name': tc(r['lobbyist']), 'firm': tc(r['firm'] or ''), 'for': label, 'basis': 'registry', 'src': SRC[r['year']], 'date': rd.isoformat(),
                 'note': 'Registered %s for %s; issue: %s' % (r['date'], r['principal'].strip(' ,'), re.sub(r'\s+', ' ', r['issue'].replace('SPECIFIC ISSUE:', '').replace('SPECIFIS ISSUE:', '')).strip()[:160])}
            if not any(x['name'].lower() == e['name'].lower() and x['basis'] == 'registry' for x in out): out.append(e); n['registry'] += 1
    for nm, firm, fr, q in REC.get(aid, []):
        mid = re.search(r'MinutesMeetingID=(\d+)', a['url']).group(1)
        out.append({'name': nm, 'firm': firm, 'for': fr, 'basis': 'record', 'src': MURL % mid, 'date': a['date'], 'quote': q}); n['record'] += 1
    if out: L['byAction'][aid] = out
srcs = {s['url'] for s in L['sources']}
for y, u, c in [(2023, SRC[2023], '2023 registrations (lobbyist, principal, date registered, issue, withdrawals)'), (2024, SRC[2024], '2024 registrations; used only for actions in 2024')]:
    if u not in srcs: L['sources'].append({'name': 'NMB %d Registered Lobbyist List' % y, 'url': u, 'viewed': '2026-10-25', 'covers': c})
u = 'https://nmb.novusagenda.com/agendapublic/DisplayAgendaPDF.ashx?MinutesMeetingID=363..436'
if u not in srcs: L['sources'].append({'name': 'NMB minutes Dec 2022 - Dec 2024 (NovusAgenda MinutesMeetingID 363-414, 435, 436)', 'url': u, 'viewed': '2026-10-25', 'covers': 'Record-named representatives for tenure-era actions (scanned minutes read by OCR)'})
L['notFound'] = L['notFound'].rstrip() + ' Tenure era (2022-12 .. 2024-12): registry links use the 2023 and 2024 lists, counted only when the registration predates the vote in the same year and was not withdrawn before it (e.g. Pedro Gassant\'s 2023 Prestige Boardwalk registration was withdrawn 11/14/23, after both Prestige votes). Not linked: Coastal Waste (Luciano Isla is registered for Florida Waste Haulers, a different principal); JME Holdings (Gunster registration was 2023, the Feldman House vote was 2024 with no 2024 registration); May NMB on Jan 16, 2024 counts only Bercow (12/21/23) and Edelstein (1/4/24), since Amster, Beame, Plummer and Lee were on the 2023 list only.'
json.dump(L, open(P, 'w'), ensure_ascii=False, indent=1); open(P, 'a').write('\n')
print(n, len(L['byAction']))
