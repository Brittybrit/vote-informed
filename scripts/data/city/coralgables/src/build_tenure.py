# Extends scripts/data/city/coralgables/actions.json back to the start of the longest-serving incumbent's
# tenure (Vince Lago, seated 2013-04-13). Inputs, all in this folder:
#   legistar-items.json   City Commission event items 2013-04-13..2024-12-31 with their roll calls, pulled
#                         from webapi.legistar.com/v1/coralgables (/events/{id}/eventitems, /eventitems/{id}/votes)
#   matters.json          MatterEnactmentNumber per matter (/matters/{id})
#   decisions/<year>.txt  hand-read list of qualifying items: iid|kind|parties|short title[|note]
#                         parties ';'-separated; '@<address>' = owner of that address; '-' = not named
# Writes actions.json (pre-2025 actions added before the existing ones; existing entries untouched).
# Rerun is idempotent: actions with "tenure": true are rebuilt each time.
import json, os, re, sys
SP = os.path.dirname(os.path.abspath(__file__))
CITY = os.path.dirname(SP)
items = json.load(open(SP + '/legistar-items.json'))['items']
matters = json.load(open(SP + '/matters.json'))
KIND = {'c': 'contract', 'z': 'zoning', 'a': 'agreement', 'o': 'other', 'l': 'lease', 'g': 'grant', 's': 'sale',
        'p': 'license', 'e': 'easement', 't': 'settlement'}
U = json.load(open(CITY + '/actions.json'))
keep = [a for a in U['actions'] if not a.get('tenure')]
have = {a['id'] for a in keep}
new = []
unnamed = []
for f in sorted(os.listdir(SP + '/decisions')):
    for line in open(SP + '/decisions/' + f):
        line = line.rstrip('\n')
        if not line.strip() or line.startswith('#'):
            continue
        p = line.split('|')
        iid, k, parties, title = p[0], p[1], p[2], p[3]
        note = p[4] if len(p) > 4 else ''
        it = items[iid]
        pl = []
        for x in parties.split(';'):
            x = x.strip()
            if not x or x == '-':
                continue
            pl.append('Owner of ' + x[1:] if x.startswith('@') else x)
        roll = dict(it['roll'])
        y = sum(v == 'yes' for v in roll.values()); n = sum(v == 'no' for v in roll.values())
        m = matters.get(str(it['matterId']), {})
        enact = (m.get('MatterEnactmentNumber') or '').strip()
        typ = it['type']
        ref = it['file'] + ('; ' + ('Ord. ' if typ == 'Ordinance' else 'Res. ') + enact if enact else '')
        act = (it['action'] or '').lower()
        result = 'failed' if it['passed'] == 'Fail' else ('denied' if act.startswith('denied') else 'adopted')
        amts = sorted(set(re.findall(r'\$\s?([\d,]+(?:\.\d\d)?)', it['title'])))
        amount = float(amts[0].replace(',', '')) if len(amts) == 1 else None
        notes = []
        if note: notes.append(note)
        if it['consent']: notes.append('Approved on the consent agenda; roll is the item vote record.')
        if it['rollSrc'] != 'item': notes.append('Roll taken from the consent block vote.')
        if it['minutesStatus'] != 'Final': notes.append('Legistar minutes status: ' + str(it['minutesStatus']) + '.')
        aid = it['file']
        if aid in have:
            aid = aid + '-' + it['date']
        have.add(aid)
        a = {'id': aid, 'date': it['date'], 'ref': ref, 'matterId': it['matterId'], 'eventItemId': int(iid),
             'title': title, 'kind': KIND[k], 'parties': pl, 'amount': amount, 'roll': roll,
             'mover': it['mover'], 'second': it['second'], 'notes': ' '.join(notes) or None, 'tally': [y, n],
             'result': result, 'url': 'https://coralgables.legistar.com/gateway.aspx?M=L&ID=%d' % it['matterId'],
             'tenure': True}
        if it['consent']: a['consent'] = True
        new.append(a)
        if not pl: unnamed.append(aid)
new.sort(key=lambda a: (a['date'], a['id']))
# meetings read (every City Commission event in the window whose item list was pulled)
ev = json.load(open(SP + '/legistar-events.json'))
oldm = [m for m in U['meetings'] if not m.get('tenure')]
meet = [{'date': e['EventDate'][:10], 'eventId': e['EventId'], 'read': True, 'tenure': True,
         **({'note': e['EventComment']} if e.get('EventComment') else {})}
        for e in ev if '2013-04-13' <= e['EventDate'][:10] < '2025-01-01']
U['meetings'] = sorted(meet + oldm, key=lambda m: (m['date'], m.get('eventId', 0)))
U['actions'] = new + keep
U['window']['from'] = '2013-04-13'
U['window']['tenureNote'] = ('Window starts 2013-04-13, when Vince Lago joined the Commission (Legistar office records: '
                             'Commissioner 2013-04-13, Vice Mayor 2017-04-28, Mayor 2021-04-30, continuous). '
                             'Melissa Castro was seated 2023-05-02.')
G = [g for g in U['gaps'] if not str(g).startswith('Tenure extension')]
G.append('Tenure extension (2013-04-13 to 2024-12-31): items read from Legistar event items for every City Commission '
         'meeting; votes from each item\'s Legistar vote record (named roll call). First readings are not listed; '
         'second readings and resolutions are. Excluded by rule: appointments, proclamations, minutes, budget and millage, '
         'code text amendments with no named applicant, special assessment rolls, items whose only parties are governments, '
         'forfeiture-fund spending on equipment with no named vendor, and directions to study or negotiate where no '
         'party was named. %d listed actions name no private party (address-only items carry "Owner of <address>"; '
         'see owners.json).' % len(unnamed))
G.append('Tenure extension: Coral Gables lobbyist registry exports exist only from 2017 (dashboard years 2017-2026); '
         'for 2013-2016 only lobbyists named in the Legistar record are listed.')
U['gaps'] = G
json.dump(U, open(CITY + '/actions.json', 'w'), indent=1, ensure_ascii=False)
print(len(new), 'tenure actions;', len(keep), 'kept;', len(unnamed), 'with no named party:', unnamed[:20])
