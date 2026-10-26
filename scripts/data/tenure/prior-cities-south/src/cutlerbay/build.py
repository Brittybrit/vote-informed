# Builds ../../cutlerbay-mixon/actions.json: Mary Ann Mixon, Cutler Bay Town Council Seat 1 (Nov 2010 - Nov 2018).
# Source: the Town Clerk's Resolutions Register and Ordinances Register (cutlerbay-fl.gov, town_clerk/page/2261), which give
# each item's number, date adopted, full title and each member's recorded vote (YES/NO/ABSENT). register.json = parse_register.py.
# decisions.txt = hand-read items naming a private party (num|kind|parties|short title); owners-lookup.json = Property Appraiser
# owner as of the vote for '@address' parties.
# Oct 26, 2026: checked against the Town Council minutes for Nov 2013 - Nov 2018 (minutes_parse.py -> minutes-items.json,
# minutes_match.py -> minutes-match.json): each register item the minutes cover gets the meeting date, minutes link, mover
# and seconder from the minutes; where the minutes name each member's vote that roll is used. minutes-extra.txt adds the
# votes on named parties' requests that failed or were denied (no register number).
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
MM = json.load(open(SP + '/minutes-match.json')) if os.path.exists(SP + '/minutes-match.json') else {}
MIN_URL = 'https://pub-cutlerbay-fl.escribemeetings.com/FileStream.ashx?DocumentId=%s'
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
    date, mover, second, minutes = x['date'], None, None, None
    m = MM.get(d['key'])
    if m:
        minutes, mover, second = m['url'], m.get('mover'), m.get('second')
        if m.get('relabeled'):
            roll = {{'Sochin': 'Loyzelle', 'Loyzelle': 'Callahan'}.get(k, k): v for k, v in roll.items()}
            notes.append('The register prints these vote columns under the old header (Sochin, Loyzelle); the Dec 14, 2016 minutes show Callahan seated and Loyzelle in the second column, so the votes are labeled from the minutes')
        if m.get('roll') and m.get('agrees') is not False:
            roll = dict(m['roll']); notes.append('Roll call recorded in the minutes of %s (agrees with the register)' % m['date'])
        elif m.get('roll'):
            notes.append('Register: %s; roll call taken from the minutes of %s, which differ' % (', '.join('%s %s' % kv for kv in roll.items()), m['date']))
            roll = dict(m['roll'])
        elif m.get('agrees'):
            notes.append('Minutes of %s: %s (agrees with the register)' % (m['date'], m['said']))
        else:
            notes.append('Minutes of %s: %s' % (m['date'], m['said']))
        if m['date'] != x['date']:
            notes.append('Register gives the adoption date as %s; the minutes show the vote on %s' % (x['date'], m['date'])); date = m['date']
    elif '2013-11-01' <= x['date'] <= END:
        notes.append('No minutes posted for this meeting (eSCRIBE has none for Nov 12 and Nov 20, 2013, Dec 2, 2015 and Oct 24, 2018)')
    pref = 'Resolution ' if x['kind'] == 'R' else 'Ordinance '
    if d.get('note'): notes.insert(1, d['note'])
    acts.append({'id': 'cutlerbay-%s-%s' % ('res' if x['kind'] == 'R' else 'ord', x['num']), 'date': date, 'ref': pref + x['num'],
                 'title': d['title'], 'fullTitle': x['title'], 'kind': KIND.get(d['kind'], d['kind']), 'parties': pl,
                 'amount': amount_of(x['title']), 'roll': roll, 'tally': tally(roll), 'mover': mover, 'second': second,
                 'result': 'denied' if re.search(r'\bDENYING\b', x['title']) else 'adopted', 'notes': '; '.join(notes),
                 'url': 'https://www.cutlerbay-fl.gov/sites/default/files/fileattachments/town_clerk/page/2261/%s_register.pdf' % ('resolutions' if x['kind'] == 'R' else 'ordinances'),
                 'prior': True, **({'minutes': minutes} if minutes else {})})
# votes in the minutes on named parties' requests that failed or were denied (never numbered in the registers)
for ln in open(SP + '/minutes-extra.txt') if os.path.exists(SP + '/minutes-extra.txt') else []:
    if not ln.strip() or ln.startswith('#'): continue
    i, dt, kind, parties, ttl, res, rl, doc, note = (ln.rstrip('\n').split('|') + [''] * 9)[:9]
    roll = dict(kv.split('=') for kv in rl.split(','))
    acts.append({'id': i, 'date': dt, 'ref': 'Town Council minutes, %s' % dt, 'title': ttl, 'fullTitle': None, 'kind': KIND.get(kind, kind),
                 'parties': [p for p in parties.split(';') if p], 'amount': None, 'roll': roll, 'tally': tally(roll), 'mover': None, 'second': None,
                 'result': res, 'notes': '; '.join(x for x in [note, 'Roll call recorded in the minutes'] if x), 'url': MIN_URL % doc,
                 'prior': True, 'minutes': MIN_URL % doc})
acts.sort(key=lambda a: (a['date'], a['ref']))
doc = {'city': 'Cutler Bay', 'body': 'Cutler Bay Town Council', 'person': 'mary-ann-mixon', 'office': 'Council Member, Seat 1',
       'window': {'from': START, 'to': END}, 'members': NAMES, 'actions': acts,
       'sources': [{'name': 'Town of Cutler Bay, Town Clerk: Resolutions Register (2006-present) and Ordinances Register', 'url': 'https://www.cutlerbay-fl.gov/townclerk/page/ordinances-resolutions'},
                   {'name': 'Town of Cutler Bay, Town Council minutes, Nov 2013 - Nov 2018 (eSCRIBE)', 'url': 'https://pub-cutlerbay-fl.escribemeetings.com/'}],
       'gaps': [{'issue': 'Minutes are online (eSCRIBE) only from Nov 2013; for Nov 2010 - Oct 2013 the votes come from the Town Clerk\'s registers alone, and movers, seconders and votes on requests that failed (never numbered) are not available for those years.'},
                {'issue': 'No minutes posted for Nov 12 and Nov 20, 2013, Dec 2, 2015 and Oct 24, 2018; items from those meetings carry the register vote only.'},
                {'issue': 'Items are chosen from the register titles; an award whose title does not name the vendor (e.g. "issue an ITB and award to the lowest bidder") is not listed. In the minutes for Nov 2013 - Nov 2018, 6 qualifying-kind items name no beneficiary (left out): park use agreements with unnamed swim clubs (Res. 15-06), engineering and planning firm pools (14-63, 17-101), Community Fund grants to unnamed nonprofits (18-28), and bus-shelter and sidewalk construction awards to the lowest bidder (17-24, 17-46).'}]}
write_json(OUT + '/actions.json', doc)
print(len(acts), 'actions;', sum(1 for a in acts if a['roll'].get('Mixon') in ('yes', 'no')), 'with Mixon yes/no; missing', missing)
