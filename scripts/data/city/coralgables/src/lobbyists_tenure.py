# Lobbyists for the pre-2025 (tenure) Coral Gables actions, merged into ../lobbyists.json byAction.
#  record:   "Lobbyist: X" lines in the Legistar matter title (src/legistar-items.json keeps the title; full title
#            re-read from the Legistar matter record cached in src/matters.json when present)
#  registry: city clerk lobbyist dashboard exports ../lobbyists-<year>.csv (2017-2024). A registration counts when
#            its principal is one of the action's parties (or its owner of record in ../owners.json), it is in the
#            list for the vote year or the year before, and it was not withdrawn before the vote.
import csv, io, json, os, re
SP = os.path.dirname(os.path.abspath(__file__)); CITY = os.path.dirname(SP)
SUF = {'INC','LLC','LLLP','LP','LTD','CORP','CORPORATION','CO','COMPANY','PA','PLLC','LLP','THE','OF','AND','A','P','L','C','INCORPORATED','DBA','TRS','TRUSTEE'}
GEN = {'MIAMI','FLORIDA','GROUP','SERVICES','HOLDINGS','DEVELOPMENT','PROPERTIES','ASSOCIATES','PARTNERS','MANAGEMENT','CONSTRUCTION','FOUNDATION','CITY','COUNTY','INTERNATIONAL','USA','AMERICA','SOUTH','NORTH','NATIONAL','CENTER','INVESTMENTS','ENTERPRISES','CORAL','GABLES'}
def norm(s): return re.sub(r'\s+',' ',re.sub(r'[^A-Z0-9 ]',' ',str(s or '').upper().replace('&',' AND '))).strip()
def key(s):
    s = re.sub(r'\(.*?\)', ' ', str(s)); s = re.sub(r'\bd/?b/?a\b.*$', ' ', s, flags=re.I)
    w = [x for x in norm(s).split() if x not in SUF]
    if not w or (len(w) == 1 and (len(w[0]) < 5 or w[0] in GEN)) or all(x in GEN for x in w): return ''
    return ' '.join(w)
def d(s):
    m = re.match(r'(\d\d)/(\d\d)/(\d{4})', s or '')
    return '%s-%s-%s' % (m.group(3), m.group(1), m.group(2)) if m else None
REG = {}
for y in range(2017, 2025):
    f = CITY + '/lobbyists-%d.csv' % y
    if not os.path.exists(f): continue
    for r in csv.DictReader(io.StringIO(open(f, encoding='utf-8-sig', errors='replace').read())):
        if not r.get('Lobbyist1'): continue
        REG.setdefault(y, []).append(dict(name=r['Lobbyist1'].strip(), principal=r['Principal'].strip(), pk=key(r['Principal']),
            date=d(r['Date_of_payment']), wd=d(r.get('Withdrawal') or ''), issue=(r.get('Issue') or '').strip(),
            project=(r.get('Associated_Project') or '').strip(), src='scripts/data/city/coralgables/lobbyists-%d.csv' % y))
items = json.load(open(SP + '/legistar-items.json'))['items']
U = json.load(open(CITY + '/actions.json')); O = json.load(open(CITY + '/owners.json'))['byAction']
L = json.load(open(CITY + '/lobbyists.json'))
for k in [k for k, v in L['byAction'].items() if v and all(x.get('tenure') for x in v)]: del L['byAction'][k]
nrec = nreg = 0
for a in U['actions']:
    if not a.get('tenure'): continue
    it = items[str(a['eventItemId'])]
    out = []
    for nm in re.findall(r'Lobbyist:\s*(.+?)(?=\s*Lobbyist:|\(|$)', it['title']):
        nm = nm.strip(' .;,)(')
        if not nm or re.match(r'N/?[AR]\b', nm, re.I) or len(nm) < 4: continue
        out.append(dict(name=nm, firm=None, **{'for': '; '.join(a['parties'])}, basis='record', src=a['url'], date=a['date'], issue=None, tenure=True)); nrec += 1
    names = [p for p in a['parties'] if not p.startswith('Owner of ')]
    if a['id'] in O and O[a['id']].get('owner'): names.append(re.sub(r'\(.*', '', O[a['id']]['owner']))
    keys = {key(p) for p in names} - {''}
    y = int(a['date'][:4])
    for yy in (y, y - 1):
        for r in REG.get(yy, []):
            if not r['pk'] or r['pk'] not in keys: continue
            if r['date'] and r['date'] > a['date']: continue
            if r['wd'] and r['wd'] < a['date']: continue
            if any(x['name'].upper() == r['name'].upper() for x in out): continue
            out.append(dict(name=r['name'], firm=None, **{'for': r['principal']}, basis='registry', src=r['src'], date=r['date'], issue=r['issue'] or r['project'] or None, tenure=True)); nreg += 1
    if out:
        cur = L['byAction'].setdefault(a['id'], [])
        cur.extend(x for x in out if not any(c['name'] == x['name'] and c['basis'] == x['basis'] for c in cur))
src = [s for s in L['sources'] if not s.get('tenure')]
for y in sorted(REG):
    src.append({'name': 'Coral Gables City Clerk lobbyist dashboard export, %d' % y, 'url': 'https://cgitwebapps.coralgables.com/CGDashboards/CityClerkLobbyistsDashboard.aspx', 'viewed': '2026-10-25', 'covers': '%d dashboard year (scripts/data/city/coralgables/lobbyists-%d.csv)' % (y, y), 'tenure': True})
src.append({'name': 'Coral Gables Legistar matter titles ("Lobbyist:" line), 2013-2024', 'url': 'https://webapi.legistar.com/v1/coralgables/events/{id}/eventitems', 'viewed': '2026-10-25', 'covers': 'tenure actions 2013-04-13 to 2024-12-31; titles carry "Lobbyist:" lines from about 2021', 'tenure': True})
L['sources'] = src
L['tenureNote'] = 'Pre-2025 actions: record lobbyists from the Legistar title; registry matches on principal name (or owner of record) against the 2017-2024 dashboard exports. No registry is online for 2013-2016.'
json.dump(L, open(CITY + '/lobbyists.json', 'w'), indent=1, ensure_ascii=False)
print('record', nrec, 'registry', nreg)
