"""Build scripts/data/tenure/prior-cities-north/miamigardens/{actions,translations,titles-en}.json from the parsed
minutes (<work>/votes.json, mg_votes.py) and the hand decisions in src/decisions/mg-YYYY.txt.
Decision line: key|template|party; party|amount ('a' = from the title)|subject key|place|record-named reps|note
template '-' = not a qualifying action, '?' = qualifying kind but no named beneficiary, '1' = first reading (final vote kept).
Usage: python3 mg_build.py <workdir>"""
import json, re, sys, os, glob, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from titles_ext import title, KIND
from cand import amount as auto_amount, is_candidate
from mg_review import dedupe, key as vkey
W = sys.argv[1]
OUT = os.path.join(HERE, '..', 'miamigardens')
os.makedirs(OUT, exist_ok=True)
V = dedupe(json.load(open(os.path.join(W, 'votes.json'))))
byk = {vkey(v): v for v in V}
# hand-read roll calls where the parser could not (decisions/rolls-mg.txt: key|Name=yes,Name=no,...|mover|second)
for ln in open(os.path.join(HERE, 'decisions', 'rolls-mg.txt'), encoding='utf8') if os.path.exists(os.path.join(HERE, 'decisions', 'rolls-mg.txt')) else []:
    if not ln.strip() or ln.startswith('#'): continue
    p = [x.strip() for x in (ln.rstrip('\n').split('|') + ['', '', ''])[:4]]
    if p[0] in byk:
        v = dict(byk[p[0]]); v['roll'] = dict(x.split('=') for x in p[1].split(',')); v['src'] = 'hand'; v['flags'] = []
        if p[2]: v['mover'] = p[2]
        if p[3]: v['second'] = p[3]
        byk[p[0]] = v
DV = 'https://edocs.miamigardens-fl.gov/WebLink/DocView.aspx?id=%s&dbid=0&repo=Laserfiche'

def mkey(n, date):
    if n == 'Ighodaro' and date >= '2020-11-01': return 'SIghodaro'
    if n == 'Campbell' and date < '2016-01-01': return 'ACampbell'
    if n == 'Williams' and date < '2012-11-01': return 'AWilliams'
    return n

roster = {}
for v in V:
    for n in (v['roll'] or {}):
        k = mkey(n, v['date']); a = roster.setdefault(k, [v['date'], v['date']]); a[0] = min(a[0], v['date']); a[1] = max(a[1], v['date'])

dec = {}
for f in sorted(glob.glob(os.path.join(HERE, 'decisions', 'mg-*.txt'))):
    for ln in open(f, encoding='utf8'):
        ln = ln.rstrip('\n')
        if not ln.strip() or ln.startswith('#'): continue
        p = ln.split('|') + [''] * 8
        dec[p[0].strip()] = [x.strip() for x in p[:8]]

actions, skipped, tr, missing = [], collections.Counter(), {}, []
OWN = json.load(open(os.path.join(OUT, 'owners.json'))) if os.path.exists(os.path.join(OUT, 'owners.json')) else {}
NEEDPA = []
unnamed = collections.Counter()
for k, d in dec.items():
    T = d[1]
    if k not in byk: missing.append(k); continue
    v = byk[k]
    if T in ('-', '1'): skipped[T] += 1; continue
    if T == '?': unnamed[v['date'][:4]] += 1; continue
    parties = [x.strip() for x in d[2].split(';') if x.strip()]
    pa_note = None
    if parties == ['@PA']:
        o = OWN.get(k) or {}
        if not o.get('owner'): unnamed[v['date'][:4]] += 1; NEEDPA.append(k); continue
        parties = [o['owner']]; pa_note = o.get('note') or 'Owner of record on the vote date per the Miami-Dade Property Appraiser.'
    amt = auto_amount(v['title'] or '') if d[3] == 'a' else (float(d[3].replace(',', '')) if d[3] else None)
    if amt is not None and float(amt).is_integer(): amt = int(amt)
    en, es, ht = title(T, parties, amt, d[4] or 'other', d[5])
    roll = None
    if v['roll'] is not None:
        roll = {mkey(n, v['date']): val for n, val in v['roll'].items()}
        for m, (a, b) in roster.items():
            if a <= v['date'] <= b and m not in roll: roll[m] = 'absent'
    note = []
    if v['resno']: note.append('Resolution/Ordinance No. ' + v['resno'] + '.')
    if d[7]: note.append(d[7])
    if pa_note: note.append(pa_note)
    if v['src'] in ('own-roll', 'consent-roll'): note.append('Roll call recorded in the minutes.')
    elif v['src'] == 'hand': note.append('Votes as stated in the minutes text (read by hand; a member marked unknown was not individually recorded).')
    elif v['src'] == 'consent': note.append('Adopted with the consent agenda by voice vote; members present per the minutes.')
    elif v['src'] == 'own': note.append('Voice vote; members present per the minutes.')
    if v['roll'] is None: note.append('Vote not given in the minutes.')
    if any('nearest roll call' in f for f in v['flags']): note.append('Members present taken from the nearest roll call in the same meeting.')
    if any('noted not present' in f for f in v['flags']): note.append('A member the minutes say was out of the room is shown absent.')
    yes = sum(1 for x in (roll or {}).values() if x == 'yes'); no = sum(1 for x in (roll or {}).values() if x == 'no')
    a = dict(id=k, date=v['date'], ref=('Resolution No. ' + v['resno']) if v['resno'] else f"Item {v['code']}, {v['meeting']}",
             title=en, kind=KIND.get(T, 'contract'), parties=parties, amount=amt, url=DV % v['doc'].rstrip('b'), roll=roll,
             tally=[yes, no] if roll and all(x in ('yes', 'no', 'absent') for x in roll.values()) else None,
             mover=mkey(v['mover'], v['date']) if v['mover'] else None, second=mkey(v['second'], v['date']) if v['second'] else None,
             consent=bool(v['consent']), result=v['result'] or 'passed', notes=' '.join(note), tenure=True, minutes=DV % v['doc'].rstrip('b'))
    if d[6]: a['reps'] = [x.strip() for x in d[6].split(';') if x.strip()]
    if d[5]: a['address'] = d[5]
    actions.append(a); tr[k] = {'en': en, 'es': es, 'ht': ht}
actions.sort(key=lambda a: (a['date'], a['id']))
meetings = sorted({(v['date'], v['meeting'], v['doc']) for v in V})
reviewed_years = sorted({k[3:7] for k in dec})
out = dict(city='Miami Gardens', body='Miami Gardens City Council', window={'from': '2008-01-01', 'to': max(a['date'] for a in actions) if actions else None},
           sources=['https://edocs.miamigardens-fl.gov/WebLink/Browse.aspx?id=86952&dbid=0&repo=Laserfiche (City Clerk > Minutes, 2003-2026)'],
           members=sorted(roster), meetings=[dict(date=d, name=n, url=DV % i.rstrip('b'), read=True) for d, n, i in meetings if d[:4] in reviewed_years],
           actions=actions,
           gaps=[f'{y}: {unnamed[y]} qualifying-kind items name no beneficiary (left out)' for y in sorted(unnamed)])
json.dump(out, open(os.path.join(OUT, 'actions.json'), 'w'), ensure_ascii=False, indent=1)
json.dump({k: {'es': v['es'], 'ht': v['ht']} for k, v in tr.items()}, open(os.path.join(OUT, 'translations.json'), 'w'), ensure_ascii=False, indent=1)
json.dump({k: v['en'] for k, v in tr.items()}, open(os.path.join(OUT, 'titles-en.json'), 'w'), ensure_ascii=False, indent=1)
print('actions', len(actions), 'needPA', NEEDPA, 'skipped', dict(skipped), 'unnamed', sum(unnamed.values()), 'missing keys', missing[:10])
# candidates not decided
und = [k for k, v in byk.items() if k[3:7] in reviewed_years and is_candidate(v['title'])[0] and k not in dec]
print('undecided candidates in reviewed years:', len(und), und[:15])
