# Builds ../../schoolboard/actions.json: Lucia Baez-Geller, Miami-Dade County School Board District 3 (Nov 17, 2020 - Nov 19, 2024).
# Universe: every item in the Board's "Excerpts from Unofficial Minutes" (pdfs.dadeschools.net/Bdarch/<yyyy>/Bd<mmddyy>/lastbda.pdf)
# for meetings she sat in, that benefits a named private party: contract awards, supplemental awards, bid waivers, A/E and CM
# commissions, GMPs, change orders, leases, development/mitigation agreements, charter school approvals and amendments,
# settlements, contractor prequalification. The excerpts record no member votes; official minutes are in ImageSilo (see
# needs-browser.md), so every member is "Vote not given in the minutes". Parties: names printed in the excerpt; where the excerpt
# says "as delineated in the Official Agenda Item", names printed in the agenda item PDF (agenda/<item>.pdf), noted on the action.
import json, os, sys, re
SP = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(SP, '..', '..', 'schoolboard')
sys.path.insert(0, os.path.join(SP, '..', '..', 'lib')); from common import *
C = json.load(open(SP + '/cache/candidates.json'))
START, END = '2020-11-17', '2024-11-19'
def mdate(m):
    s = m[2:8]; return '20%s-%s-%s' % (s[4:6], s[0:2], s[2:4])
EXCL = re.compile(r'(?i)budget review|mid-year budget|spring budget|monthly financial|accept (?:one|two|three|four|five|six|seven|eight|\d+) grant awards?|grant awards? and|tentative budget|rulemaking')
def kind(t, sec, item):
    u = t.upper()
    if re.search(r'SETTLEMENT', u): return 'settlement'
    if sec == 'D' and re.search(r'CHARTER', u): return 'license'
    if re.search(r'PREQUALIFICATION', u): return 'license'
    if re.search(r'\bLEASE', u): return 'lease'
    if re.search(r'EASEMENT', u): return 'easement'
    if re.search(r'MITIGATION DEVELOPMENT AGREEMENT|CONCURRENCY|HOUSING PROJECT FOR THE ELDERLY|DEVELOPMENT AGREEMENT', u): return 'zoning'
    if re.search(r'SALE OF PROPERTY|CONVEY|PURCHASE OF (?:THE )?PROPERTY', u): return 'sale'
    return 'contract'

def seated(date):
    # composition from the Board's own excerpts (co-sponsor lists) and organization meetings
    s = ['BaezGeller', 'Gallon', 'BendrossMindingall', 'Rojas', 'Santos']
    if date < '2022-11-22': s += ['Hantman', 'Fraga', 'Perez', 'Navarro']
    else: s += ['Alonso', 'Colucci', 'Espino'] + (['Navarro'] if date < '2023-02-01' else ['Blanco'])
    return s
acts = []; unnamed = []
OV = {}
for ln in open(SP + '/parties-overrides.txt'):
    if ln.strip() and not ln.startswith('#'):
        d_, it, ps, k = ln.rstrip('\n').split('|'); OV[(d_, it)] = ([x.strip() for x in ps.split(';')], k)
for r in C:
    date = mdate(r['meeting'])
    if not (START <= date <= END): continue
    t = r['text']; sec = r['item'].split('-')[0]
    if EXCL.search(t[:400]) or r['item'] in ('E-1',) or re.search(r'(?i)^E-1[5-8]$', r['item']): continue
    if sec in ('G', 'C') and not re.search(r'(?i)settle', t): continue
    if r['action'].startswith(('REJECTED', 'WITHDRAWN', 'DEFERRED', 'DENIED', 'FAILED')): continue
    src = 'excerpt'; pl = r.get('ents2') or []
    if not pl and r.get('ents_ag'): pl = r['ents_ag']; src = 'agenda'
    pl = [p for p in pl if not re.match(r'(?i)^(inc|llc|corp|company|group|associates|enterprise, inc\.?|co\., inc\.?|engineering, inc\.?|technology, inc\.?)\.?$', p)]
    kov = None
    if not pl and (date, r['item']) in OV: pl, kov = OV[(date, r['item'])]; src = 'excerpt'
    if not pl:
        unnamed.append({'meeting': date, 'item': r['item'], 'text': re.sub(r'\s+', ' ', t)[:200]}); continue
    roll = {k: 'unknown' for k in seated(date)}
    notes = ['Vote not given in the minutes (the Board posts only "Excerpts from Unofficial Minutes", which record the action but not member votes)']
    if src == 'agenda': notes.append('Parties as printed in the official agenda item; the list can include proposers or bidders the Board did not select')
    title = re.sub(r'\s+', ' ', t)
    title = re.sub(r'^(?:The Superintendent to:?\s*|1\.\s*)', '', title)[:180]
    acts.append({'id': 'mdcps-%s-%s' % (r['meeting'][2:], r['item']), 'date': date, 'ref': 'Item %s' % r['item'], 'item': r['item'],
                 'title': title, 'kind': kov or kind(t, sec, r['item']), 'parties': pl[:20], 'amount': amount_of(t[:600]),
                 'roll': roll, 'tally': None, 'mover': None, 'second': None, 'result': r['action'].strip('/ ').lower(),
                 'notes': '; '.join(notes), 'url': 'https://pdfs.dadeschools.net/Bdarch/%s/%s/lastbda.pdf' % (date[:4], r['meeting']), 'prior': True})
acts.sort(key=lambda a: (a['date'], a['item']))
doc = {'body': 'The School Board of Miami-Dade County, Florida', 'person': 'lucia-baez-geller', 'office': 'School Board Member, District 3',
       'window': {'from': START, 'to': END}, 'actions': acts, 'unnamed': unnamed,
       'members': {'BaezGeller': 'Lucia Baez-Geller', 'Hantman': 'Perla Tabares Hantman', 'Gallon': 'Steve Gallon III', 'BendrossMindingall': 'Dorothy Bendross-Mindingall',
                   'Fraga': 'Christi Fraga', 'Navarro': 'Lubby Navarro', 'Perez': 'Marta Perez', 'Rojas': 'Mari Tere Rojas', 'Santos': 'Luisa Santos',
                   'Alonso': 'Roberto J. Alonso', 'Colucci': 'Monica Colucci', 'Espino': 'Daniel Espino', 'Blanco': 'Mary Blanco'},
       'sources': [{'name': 'M-DCPS School Board meeting archive: Excerpts from Unofficial Minutes and agenda items', 'url': 'https://pdfs.dadeschools.net/Bdarch/'}],
       'gaps': [{'issue': 'No member votes: official minutes are only in the ImageSilo document system (login.imagesilo.com, public login); see needs-browser.md.'},
                {'issue': 'Seated members are taken from the names in each meeting\'s excerpts: Hantman, Fraga and Perez through the Nov 16, 2022 meeting; Alonso, Colucci and Espino from the Nov 22, 2022 organization meeting; Navarro appears through Dec 14, 2022 and Blanco from Feb 15, 2023 (Jan 2023 excerpts not posted, so the changeover date is approximate).'},
                {'issue': 'Jan 18, 2023 regular meeting: no excerpts posted (agenda only); not included.'}]}
write_json(OUT + '/actions.json', doc)
print(len(acts), 'actions;', len(unnamed), 'unnamed')
