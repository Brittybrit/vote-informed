"""Build cabinet-bot/actions.json and body.json (city actions.json / body.json shape) from raw/bot-items-classified.json.
Board of Trustees of the Internal Improvement Trust Fund (Governor and Cabinet), 2019-01-08 to 2024-12-31 (Moody 2019-01-08..2025-01-21,
Simpson from 2023-01-03). Roll: every Notice of Board Action checked shows all four members present; "Approved without objection" = yes
for each member seated (the same reading scripts/cabinet.mjs uses); "Approved with objection by the CFO" = CFO no."""
import json, os, re
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(HERE, 'raw')
items = json.load(open(os.path.join(R, 'bot-items-classified.json')))
PARTIES = {  # idx -> parties as named in the certified item (manual, from the certificate text)
 2:['Brian A. Richards'],4:['Brian Rosegger'],5:['Ryan McAndrew'],11:['Jeffery McDonald'],12:['Jimmy Wayne Lashley, Jr.','Frederick Register','Jeff Wren'],
 17:['Kevin and Jessica Finch (Welaka Lodge and Resort)'],26:['Two Docks Shellfish, LLC'],27:['John C. Turner','Krista Nicole Miller'],28:['Steven C. Rash'],
 29:['Boys and Girls Clubs of Palm Beach County, Inc.'],33:['Vanderbilt Naples Holdings, LLC','Dugan Villas, LLC','Dugan Properties I, LLC'],
 34:['Everglades Reserve Holdings, LLC'],35:['Everglades Reserve Holdings, LLC'],38:['Shana Marie Alford'],39:['Knot Just an Oyster Farm, LLC'],
 37:["Hall's Tiger Bay Ranch"],43:['Sandestin Holdings, LLC','Sandestin Investments, LLC'],47:['Julia A. Ciotti','James P. Fitzgerald'],
 48:['Florida Oyster Company, LLC'],56:['David R. Carter and Victoria H. Carter, Trustees of The Carter Family Trust'],61:['Indian Lagoon Oyster Corporation'],
 65:['Las Olas SMI, LLC'],67:['Citrus Health Network, Inc.'],69:['Florida Pathways, Inc.','DGN, Inc.','DGN II, Inc.','DGN IV, Inc.','DGN V, Ltd.'],
 70:['Duane S. Rawls and Sandra C. Rawls, individually and as trustees'],76:['Brandimarte and Sons Seafood, LLC'],77:['Indian Pass Oyster Company LLC'],
 78:['Keith Taft'],79:['Treasure Coast Shellfish, LLC'],82:['Platinum Center, LLC'],85:['Marine Biological Laboratory'],89:['The Trust for Public Land'],
 90:['William Connor Clark'],95:['Leeward, LLC'],96:['Philip A. Frank','Rowena P. Garcia'],99:['David Curls'],121:['JPDT Holdings Corporation'],
 122:['RD River City Brewery, LLC'],123:['RSBC Real Estate Company, LLLP'],131:['Alycia Boudreau and Darien Gallian','Jacquelyn Tate Doyle','Lanvers Venture, LLC'],
 149:['The Trust for Public Land'],163:['Charles Kennedy','Derrick New','Dennis New'],169:['Anne B. Kavanaugh','LTI Nassau, LLC','Nassau TI Holdings, LLC'],
 177:['LTL Real Estate Holdings, LLC','Lee A. Lightsey','Tracy V. Lightsey'],178:['Big Slough Ranch, LLC','Land South Manatee, LLC'],
 199:['Doyle E Carlton III LLC'],200:['Midway Farms, LLC','Charles G. Grimes, Sr. Family Limited Partnership'],201:['Dale and Lori S. Grubb'],
 195:['Newton D. Keen and Linda W. Keen, individually and as co-trustees'],211:['Sharkbite Seafood LLC'],219:['Oyster River Ecology, Inc.'],
 226:["Big John's on Central, LLC",'EIL NC Main Office Complex, LLC','83 Clark Street, LLC','160 S Central, LLC'],228:['Carolyn Bermes'],
 230:['Edward Yarborough Ranches, Inc.','James W. Yarborough and Frances M. Yarborough','James Yarborough, Trustee of the JWL QTIP Trust and JWL Residuary Trust'],
 231:['CDC Land Investments, Inc.','Collier Land Holdings, Ltd.','Cow Bone Slough, LLLP'],232:['Goose Island Gold, LLC'],233:['Heart Bar Ranch'],
 245:['Elements Development of Jacksonville, LLC','District Community Development District'],254:['M.L. Carter Services, Inc., Successor Trustee of the Carter-Volusia 1339 Highway 415 Land Trust'],
 229:['Creek Legacy Ranch, LLC','Creek Ranch Mitigation Bank, LLC','Creek Ranch, LLC'],241:['Deer Creek Ranch, LLC','Deer Creek Family Ranch, LLC'],
 273:['Overstreet Ranching, Ltd.','Kissimmee Prairie, LLC'],254.1:[],
}
EXCL_EXTRA = {258: 'aquaculture use zone expansion with 26 new bottom leases; leaseholders not named in the certified item'}
def kind(t):
    t = t.lower()
    for k, w in [('aquaculture', 'aquaculture'), ('rural and family lands', 'rflpp_easement'), ('conservation easement', 'conservation_easement'),
                 ('option agreement', 'land_purchase'), ('acceptance of offer', 'land_sale'), ('sale and purchase', 'land_sale'), ('purchase agreement', 'land_purchase'),
                 ('exchange', 'land_exchange'), ('sublease', 'sublease'), ('lease', 'lease'), ('release', 'deed_release'), ('restrictive', 'deed_release'),
                 ('quitclaim', 'quitclaim'), ('management agreement', 'aquaculture'), ('delegation', 'delegation')]:
        if k in t: return w
    return 'other'
def amount(c):
    if not c: return None
    m = re.search(r'\$\s?([\d,]+(?:\.\d\d)?)', c)
    return float(m.group(1).replace(',', '')) if m else None
SEATED = {'DeSantis': ('2019-01-08', None), 'Moody': ('2019-01-08', '2025-01-21'), 'Patronis': ('2017-06-30', '2025-03-31'),
          'Fried': ('2019-01-08', '2023-01-03'), 'Simpson': ('2023-01-03', None)}
def seated(k, d): s, e = SEATED[k]; return s <= d and (e is None or d < e)
acts, excl = [], []
for x in items:
    title = re.sub(r'\s+', ' ', x['title']).strip()
    base = {'date': x['date'], 'ref': 'Board of Trustees item ' + (x['item'] or '?'), 'title': title,
            'url': x['cert_url'], 'record': {'certification': x['cert_url'], **({'backup': 'https://prodenv.dep.state.fl.us/DslBtlds/public/piDownloadDocument?documentManagementID=' + x['backup']} if x.get('backup') else {})},
            'counties': [c for c in x['counties'] if c != 'All FL Cntys']}
    if not x['qualifies'] or x['idx'] in EXCL_EXTRA:
        excl.append({**base, 'why': x['why'] or EXCL_EXTRA[x['idx']], 'action': x['action']}); continue
    a = (x['action'] or '').strip(' _|[]')
    parties = PARTIES.get(x['idx']) or [x['party_head']]
    roll = {k: 'yes' for k in SEATED if seated(k, x['date'])}
    if 'objection by the CFO' in a: roll['Patronis'] = 'no'
    result = 'approved' if a.lower().startswith('approved') or not a else ('withdrawn' if 'withdraw' in a.lower() else 'other')
    notes = 'Action as certified: ' + (a or 'approved (certificate only; no Notice of Board Action page)')
    if x['date'] == '2019-06-04': notes += '. June 4, 2019 has no Notice of Board Action; the BTLDS transcript shows each motion carried with no objection and Moody seconding items 3 and 4.'
    acts.append({'id': 'bot-%s-%s' % (x['date'], (x['item'] or str(x['idx'])).replace(' ', '')), **base, 'kind': kind(title) if kind(title) != 'other' else kind(title + ' ' + (x['request'] or '')), 'parties': parties,
                 'amount': amount(x['consideration']), 'consideration': x['consideration'], 'request': x['request'], 'result': result,
                 'roll': roll, 'tally': '%d-%d' % (sum(v == 'yes' for v in roll.values()), sum(v == 'no' for v in roll.values())), 'mover': None, 'second': None, 'notes': notes})
acts.sort(key=lambda a: (a['date'], a['ref']), reverse=True)
excl.sort(key=lambda a: (a['date'], a['ref']), reverse=True)
meetings = sorted({x['date'] for x in items}, reverse=True)
out = {
 'city': 'State of Florida', 'body': 'Governor and Cabinet, sitting as the Board of Trustees of the Internal Improvement Trust Fund',
 'window': {'from': '2019-01-08', 'to': '2024-12-31', 'latestRecordRead': meetings[0]},
 'members': {'DeSantis': 'Ron DeSantis (Governor)', 'Moody': 'Ashley Moody (Attorney General, 2019-01-08 to 2025-01-21)',
             'Patronis': 'Jimmy Patronis (Chief Financial Officer)', 'Fried': 'Nikki Fried (Commissioner of Agriculture, to 2023-01-03)',
             'Simpson': 'Wilton Simpson (Commissioner of Agriculture, from 2023-01-03)'},
 'standard': 'Every Board of Trustees item the Governor and Cabinet decided from Moody\'s first meeting (Feb 26, 2019) through Dec 17, 2024 that benefits a named private party (land and easement purchases, sales, exchanges, leases and lease modifications, subleases, deed releases, aquaculture leases, Rural and Family Lands easements). Built from the Office of Cabinet Affairs certifications in DEP\'s Board of Trustees Land Document System, without reference to donors.',
 'sources': [{'name': 'DEP Board of Trustees Land Document System (BTLDS), Agenda Item Search: certifications, backup and transcripts', 'url': 'https://prodenv.dep.state.fl.us/DslBtlds/public/piSearchAgendaLoad'}],
 'meetings': [{'date': d, 'name': 'Governor and Cabinet (Board of Trustees)', 'items': sum(1 for x in items if x['date'] == d), 'read': True} for d in meetings],
 'actions': acts, 'excluded': excl,
 'gaps': [
  {'issue': 'Presence was read visually from the Notice of Board Action member box for two items at each of the 24 meetings that have one (all four members present at every meeting); the other items of the same meeting were assumed to have the same attendance. June 4, 2019 has certificates only; its BTLDS transcript was read.'},
  {'issue': 'Movers and seconders are not in the certifications; BTLDS has the Board of Trustees transcript for Feb 2019 to Mar 2023 only (not read item by item). Left null.'},
  {'issue': 'Only Board of Trustees items are covered. The other Cabinet agencies (State Board of Administration, Division of Bond Finance, Administration Commission, Siting Board, Florida Land and Water Adjudicatory Commission, Financial Services Commission) post their agendas on floridacabinet.gov, which is not reachable from this environment; see needs-browser.md.'},
  {'issue': 'Meetings found in BTLDS: 2019 (7), 2020 (4), 2021 (4), 2022 (2), 2023 (5), 2024 (3). No Board of Trustees records exist there for Jan 2019 or for any other 2019-2024 date; the Florida Department of Revenue cabinet-agenda archive lists the same 2021-2024 dates.'},
 ],
}
os.makedirs(os.path.join(HERE, 'cabinet-bot'), exist_ok=True)
json.dump(out, open(os.path.join(HERE, 'cabinet-bot', 'actions.json'), 'w'), indent=1, ensure_ascii=False)
print(len(acts), 'qualifying', len(excl), 'excluded', len(meetings), 'meetings')
import collections; print(collections.Counter(a['kind'] for a in acts)); print(collections.Counter(a['result'] for a in acts))
print('Moody yes', sum(1 for a in acts if a['roll'].get('Moody') == 'yes'), 'Simpson yes (to 2024-12-31)', sum(1 for a in acts if a['roll'].get('Simpson') == 'yes'))
