# Builds ../../doral/actions.json (Ana Maria Rodriguez, Doral City Council Nov 10, 2010 - Nov 1, 2018).
# Inputs (this folder): cache/items.json (every Council agenda item 2010-11..2018-11 parsed from the Granicus final
# minutes text by scratchpad tools/drparse.py, with the roll the minutes record), decisions-*.txt (hand-read
# qualifying items: idx|kind|parties|short title|note), owners-lookup.json (Property Appraiser owner for '@address').
import json, os, sys, re
SP = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(SP, '..', '..', 'doral')
sys.path.insert(0, os.path.join(SP, '..', '..', 'lib')); from common import *
I = json.load(open(SP + '/cache/items.json'))
SPK = json.load(open(SP + '/cache/speakers.json')) if os.path.exists(SP + '/cache/speakers.json') else {}  # people the minutes name as representing a party on the item
OWN = json.load(open(SP + '/owners-lookup.json')) if os.path.exists(SP + '/owners-lookup.json') else {}
START, END = '2010-11-10', '2018-11-01'
MEMBERS = {'Rodriguez': ('Ana Maria Rodriguez', 'ana-maria-rodriguez'), 'Bermudez': ('Juan Carlos Bermudez', None),
           'VanName': ('Robert Van Name', None), 'DiPietro': ('Michael DiPietro', None), 'Cabrera': ('Pete Cabrera', None),
           'Ruiz': ('Sandra Ruiz', None), 'Boria': ('Luigi Boria', None), 'Fraga': ('Christi Fraga', 'christi-fraga'), 'Mariaca': ('Claudia Mariaca', None)}
acts, skipped, meets = [], [], {}
seen = set()
import glob
for f in sorted(glob.glob(SP + '/decisions-*.txt')):
    for d in read_decisions(f):
        i = int(d['key']); it = I[i]
        if not (START <= it['date'] <= END): continue
        fl = it.get('flags') or []
        roll = dict(it['roll'] or {})
        if not it['roll'] and set(fl) & {'deferred', 'withdrawn', 'removed from the agenda'}:
            skipped.append({'idx': i, 'date': it['date'], 'item': it['item'], 'title': d['title'], 'why': 'deferred or withdrawn; no vote on the item'}); continue
        notes = []
        if not it['roll']:
            for k in it['seated']: roll[k] = 'unknown'
            notes.append('Vote not given in the minutes')
        for k in it.get('absent') or []: roll.setdefault(k, 'absent')
        if it['how'].startswith('consent'): notes.append('Approved on consent agenda; roll is the consent vote')
        if 'First Reading' in fl: notes.append('First reading')
        if 'Second Reading' in fl: notes.append('Second reading (final adoption)')
        if d['note']: notes.append(d['note'])
        pl = parties_of(d['parties'], OWN)
        for x in d['parties'].split(';'):
            x = x.strip()
            if x.startswith('@') and OWN.get(x[1:]):
                o = OWN[x[1:]]; notes.append('Owner of %s per the Property Appraiser (folio %s): %s. %s' % (x[1:], o.get('folio'), o.get('owner'), o.get('note') or ''))
        aid = 'doral-%s-%s-%s' % (it['file'] or 'item', it['date'], it['item'])
        if aid in seen: aid += '-%d' % i
        seen.add(aid)
        m = re.search(r'Ordinance #(\d{4}-\d+)', it['title'] + ' ' + (it.get('caption') or ''))
        acts.append({'id': aid, 'date': it['date'], 'ref': (it['file'] or '') + (' (Ord. %s)' % m.group(1) if m else ''), 'item': it['item'],
                     'title': d['title'], 'kind': KIND[d['kind']], 'parties': pl, 'amount': amount_of(it['title'] + ' ' + (it.get('caption') or '')),
                     'roll': roll, 'tally': tally(roll), 'mover': it.get('mover'), 'second': it.get('second'),
                     'result': it.get('result') or ('unknown' if not it['roll'] else None), 'consent': it['how'].startswith('consent'),
                     'notes': '; '.join(notes), 'url': None, 'clip': it['clip'], 'prior': True,
                     **({'representatives': SPK[str(i)]} if str(i) in SPK else {})})
        meets[(it['date'], it['clip'])] = it.get('meeting')
acts.sort(key=lambda a: (a['date'], a['item']))
# meeting urls from the Granicus ViewPublisher index saved with the cache
MU = json.load(open(SP + '/cache/meetings.json')) if os.path.exists(SP + '/cache/meetings.json') else {}
for a in acts: a['url'] = MU.get(a.pop('clip'), {}).get('url')
meetings = [{'date': d, 'clip_id': c, 'name': n, 'url': MU.get(c, {}).get('url'), 'read': True} for (d, c), n in sorted(meets.items())]
doc = {'city': 'Doral', 'body': 'Doral City Council', 'person': 'ana-maria-rodriguez', 'office': 'Council Member (Vice Mayor 2017-2018)',
       'window': {'from': START, 'to': END},
       'members': {k: v[0] for k, v in MEMBERS.items()},
       'standard': 'Every action benefiting a named private party (scripts/data/tenure/STANDARD.md); universe = every such item heard while Rodriguez sat.',
       'sources': [{'name': 'City of Doral Granicus final minutes (MinutesViewer view_id=2), Nov 2010 - Nov 2018', 'url': 'https://cityofdoral.granicus.com/ViewPublisher.php?view_id=2'},
                   {'name': 'Miami-Dade Property Appraiser (owner of record for address-only items)', 'url': 'https://apps.miamidadepa.gov/PApublicServiceProxy/PaServicesProxy.ashx'}],
       'meetings': meetings, 'actions': acts, 'skipped': skipped}
write_json(OUT + '/actions.json', doc)
body = {'members': [{'key': k, 'name': v[0], 'person': v[1]} if v[1] else {'key': k, 'name': v[0], 'former': True} for k, v in MEMBERS.items()],
        'since': START, 'tenure': {'Rodriguez': {'start': START, 'end': END, 'giftsFrom': '2008-11-01'}}}
write_json(OUT + '/body.json', body)
print(len(acts), 'actions;', len(skipped), 'skipped;', sum(1 for a in acts if a['roll'].get('Rodriguez') in ('yes', 'no')), 'with a Rodriguez yes/no')
