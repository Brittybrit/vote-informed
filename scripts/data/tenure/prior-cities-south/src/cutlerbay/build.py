# Builds ../../cutlerbay-mixon/actions.json: Mary Ann Mixon, Cutler Bay Town Council Seat 1 (Nov 2010 - Nov 2018).
# Source: the Town Clerk's Resolutions Register and Ordinances Register (cutlerbay-fl.gov, town_clerk/page/2261), which give
# each item's number, date adopted, full title and each member's recorded vote (YES/NO/ABSENT). register.json = parse_register.py.
# decisions.txt = hand-read items naming a private party (num|kind|parties|short title); owners-lookup.json = Property Appraiser
# owner as of the vote for '@address' parties.
import json, os, sys, re
SP = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(SP, '..', '..', 'cutlerbay-mixon')
sys.path.insert(0, os.path.join(SP, '..', '..', 'lib')); from common import *
R = {x['kind'] + x['num']: x for x in json.load(open(SP + '/register.json'))}
OWN = json.load(open(SP + '/owners-lookup.json')) if os.path.exists(SP + '/owners-lookup.json') else {}
START, END = '2010-11-17', '2018-11-05'   # first and last register entries with Mixon in the vote columns
KEY = {'MACDOUGALL': 'MacDougall', 'SOCHIN': 'Sochin', 'MIXON': 'Mixon', 'LOYZELLE': 'Loyzelle', 'BELL': 'Bell', 'CORIAT': 'Coriat',
       'CALLAHAN': 'Callahan', 'VROOMAN': 'Vrooman', 'MEERBOTT': 'Meerbott', 'DUNCAN': 'Duncan'}
NAMES = {'MacDougall': 'Edward P. MacDougall', 'Sochin': 'Ernest N. Sochin', 'Mixon': 'Mary Ann Mixon', 'Loyzelle': 'Sue Ellen Loyzelle',
         'Bell': 'Peggy R. Bell', 'Coriat': 'Roger Coriat', 'Callahan': 'Michael P. Callahan'}
acts, missing = [], []
for d in read_decisions(SP + '/decisions.txt'):
    x = R.get(d['key'])
    if not x: missing.append(d['key']); continue
    if not (START <= x['date'] <= END) or d['kind'] == 'skip': continue
    raw = x.get('roll') or {}
    roll = {KEY.get(k, k.title()): v for k, v in raw.items() if not k.startswith('_')}
    notes = ['Vote from the Town Clerk\'s %s Register' % ('Resolutions' if x['kind'] == 'R' else 'Ordinances')]
    if raw.get('_aligned'): notes.append('A vote cell is blank in the register; votes matched to members by column position')
    if 'Mixon' not in roll: notes.append('Mixon has no entry in the register for this item')
    pl = []
    for p in d['parties'].split(';'):
        p = p.strip()
        if not p: continue
        if p.startswith('@'):
            o = OWN.get(p[1:])
            if o and o.get('owner'):
                pl.append(o['owner']); notes.append('Owner of %s per the Property Appraiser (folio %s): %s' % (p[1:], o.get('folio'), o.get('note') or ''))
            else:
                pl.append('Owner of ' + p[1:])
                if o: notes.append('Owner of %s not resolved: %s' % (p[1:], o.get('note') or ''))
        else: pl.append(p)
    pref = 'Resolution ' if x['kind'] == 'R' else 'Ordinance '
    acts.append({'id': 'cutlerbay-%s-%s' % ('res' if x['kind'] == 'R' else 'ord', x['num']), 'date': x['date'], 'ref': pref + x['num'],
                 'title': d['title'], 'fullTitle': x['title'], 'kind': KIND.get(d['kind'], d['kind']), 'parties': pl,
                 'amount': amount_of(x['title']), 'roll': roll, 'tally': tally(roll), 'mover': None, 'second': None,
                 'result': 'denied' if re.search(r'\bDENYING\b', x['title']) else 'adopted', 'notes': '; '.join(notes),
                 'url': 'https://www.cutlerbay-fl.gov/sites/default/files/fileattachments/town_clerk/page/2261/%s_register.pdf' % ('resolutions' if x['kind'] == 'R' else 'ordinances'),
                 'prior': True})
acts.sort(key=lambda a: (a['date'], a['ref']))
doc = {'city': 'Cutler Bay', 'body': 'Cutler Bay Town Council', 'person': 'mary-ann-mixon', 'office': 'Council Member, Seat 1',
       'window': {'from': START, 'to': END}, 'members': NAMES, 'actions': acts,
       'sources': [{'name': 'Town of Cutler Bay, Town Clerk: Resolutions Register (2006-present) and Ordinances Register', 'url': 'https://www.cutlerbay-fl.gov/townclerk/page/ordinances-resolutions'}],
       'gaps': [{'issue': 'Minutes and agenda packets are in eSCRIBE (pub-cutlerbay-fl.escribemeetings.com), whose files sit behind a browser check; movers, seconders and lobbyist appearances are not available here (see needs-browser.md).'},
                {'issue': 'Items are chosen from the register titles; an award whose title does not name the vendor (e.g. "issue an ITB and award to the lowest bidder") is not listed.'}]}
write_json(OUT + '/actions.json', doc)
print(len(acts), 'actions;', sum(1 for a in acts if a['roll'].get('Mixon') in ('yes', 'no')), 'with Mixon yes/no; missing', missing)
