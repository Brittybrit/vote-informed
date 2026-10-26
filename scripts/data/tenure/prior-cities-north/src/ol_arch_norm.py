"""Normalize ol_arch_parse.py output to build_body.py items (Archive Center minutes; links are Archive.aspx?ADID=<n>).
Keys: ol-<date>-<item code>, with .b, .c ... for repeats on the same day.
A roll that is missing a seated member (OCR dropped the line) is completed only from the minutes' own count: when the
minutes say 'passed by a N-0 vote' and N equals the yes votes read plus the members missing, those members are 'yes'.
Otherwise the missing member is left out and listed in the note.
Usage: python3 ol_arch_norm.py <items.json> <out.json>"""
import json, re, sys, os

# who sat on the commission on each date (from the minutes' roll-call sections)
def seated(date):
    if date < '2010-11-10': return ['Kelley', 'Taylor', 'Tydus', 'Holmes', 'Johnson']
    if date < '2012-11-20': return ['Taylor', 'Tydus', 'Holmes', 'Johnson', 'Miller']
    if date < '2018-01-01': return ['Taylor', 'Kelley', 'Holmes', 'Johnson', 'Santiago']
    if date < '2018-11-29': return ['Taylor', 'Kelley', 'Holmes', 'Riley', 'Pigatt']
    return ['Pigatt', 'Davis', 'Kelley', 'Burke', 'Bass']

R = json.load(open(sys.argv[1])); out = []; seen = set()
for r in R:
    k = f"ol-{r['date']}-{r['code']}"
    if k in seen:
        for s in 'bcdefghij':
            if f'{k}.{s}' not in seen: k = f'{k}.{s}'; break
    seen.add(k)
    url = 'https://www.opalockafl.gov/Archive.aspx?ADID=%s' % r['adid']
    roll = dict(r['roll']) if r['roll'] else None
    note = []
    if roll:
        roll = {m: v for m, v in roll.items() if m in seated(r['date'])}
        miss = [m for m in seated(r['date']) if m not in roll]
        if miss:
            m2 = [r['tally']] if r.get('tally') else []
            y = sum(1 for v in roll.values() if v == 'yes'); n = sum(1 for v in roll.values() if v == 'no')
            fill = None
            if m2:
                Y, N = int(m2[-1][0]), int(m2[-1][1])
                if n == N and y + len(miss) == Y: fill = 'yes'
                elif y == Y and n + len(miss) == N: fill = 'no'
            if fill:
                for m in miss: roll[m] = fill
                note.append('Roll call recorded in the minutes; the vote of %s is not legible in the scan and is taken from the minutes\' count (%s-%s).' % (' and '.join(miss), m2[-1][0], m2[-1][1]))
            else:
                note.append('Roll call recorded in the minutes; no vote is legible for %s in the scan.' % ' and '.join(miss))
        else: note.append('Roll call recorded in the minutes.')
        if r['src'] == 'consent': note[-1] = note[-1].replace('Roll call recorded in the minutes', 'Consent agenda; roll call on the consent agenda recorded in the minutes')
    res = 'passed'
    if roll:
        y = sum(1 for v in roll.values() if v == 'yes'); n = sum(1 for v in roll.values() if v == 'no')
        if n > y: res = 'failed'
    out.append(dict(key=k, date=r['date'], title=r['title'], roll=roll, mover=r['mover'], second=r['second'], result=res,
                    consent=r['src'] == 'consent', url=url, minutes=url, what=r.get('what'), deferred=r.get('deferred'), reading=r.get('reading'),
                    ref=f"Item {r['code']}, {r['date']} {r['typ'].lower()} meeting", meeting=r['typ'].title() + ' Commission Meeting',
                    note=' '.join(note), text=r['text']))
json.dump(out, open(sys.argv[2], 'w'), indent=0); print(len(out))
