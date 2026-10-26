"""Check the Town Clerk's register votes against the Town Council minutes (Nov 2013 - Nov 2018) and write
minutes-match.json: for each register item the minutes cover, the meeting date, minutes link, mover and seconder, what
the minutes say about the vote, the roll the minutes give (when they name each member's vote), and whether the register
agrees. build.py reads it.
Usage: python3 minutes_match.py <minutes items json from minutes_parse.py>"""
import json, os, re, sys
SP = os.path.dirname(os.path.abspath(__file__))
KEY = {'MACDOUGALL': 'MacDougall', 'SOCHIN': 'Sochin', 'MIXON': 'Mixon', 'LOYZELLE': 'Loyzelle', 'BELL': 'Bell', 'CORIAT': 'Coriat',
       'CALLAHAN': 'Callahan'}
# The register's vote columns for Oct 19 - Dec 14, 2016 rows still carry the old header (BELL, SOCHIN, MIXON, LOYZELLE,
# CORIAT); from Dec 14, 2016 (Callahan seated, Loyzelle vice mayor) the columns are Bell, Loyzelle, Mixon, Callahan, Coriat,
# as the Jan 2017 header shows and the Dec 14, 2016 minutes confirm (Res. 16-70: register NO in column 2 = Loyzelle).
def reg_roll(x):
    r = {KEY.get(k, k.title()): v for k, v in (x.get('roll') or {}).items() if not k.startswith('_')}
    if '2016-12-01' <= x['date'] <= '2016-12-31' and x.get('hdr', [None, None])[1] == 'SOCHIN':
        r = {{'Sochin': 'Loyzelle', 'Loyzelle': 'Callahan'}.get(k, k): v for k, v in r.items()}
    return r

def main():
    I = json.load(open(sys.argv[1]))
    R = {x['kind'] + x['num']: x for x in json.load(open(os.path.join(SP, 'register.json')))}
    out = {}
    for o in I:
        k = o['reg']
        if not k or o['outcome'] not in ('adopted', 'consent', 'failed', '?') or k in out: continue
        x = R[k]; rr = reg_roll(x); v = o['vote'] or {}
        y = sorted(m for m, s in rr.items() if s == 'yes'); n = sorted(m for m, s in rr.items() if s == 'no')
        rec = dict(date=o['date'], url=o['url'], mover=o['mover'], second=o['second'], outcome=o['outcome'],
                   regDate=x['date'], present=o['present'])
        if v.get('form') == 'list' and (v.get('yes') or v.get('no')):
            roll = {m: 'yes' for m in v['yes']}; roll.update({m: 'no' for m in v.get('no', [])})
            roll.update({m: 'absent' for m in v.get('absent', [])}); roll.update({m: 'recused' for m in v.get('recused', [])})
            rec['roll'] = roll; rec['said'] = 'roll call listed in the minutes'
            rec['agrees'] = sorted(v['yes']) == y and sorted(v.get('no', [])) == n
        elif v.get('count'):
            Y, N = v['count']
            if v.get('verb') == 'failed' and Y < N: Y, N = N, Y
            rec['said'] = '%s %d-%d' % (v.get('verb') or 'passed', Y, N) + (' (%s opposed)' % ', '.join(v['opposed']) if v.get('opposed') else '')
            rec['agrees'] = (Y, N) == (len(y), len(n)) and (not v.get('opposed') or sorted(v['opposed']) == n)
        elif v.get('form') == 'unanimous':
            rec['said'] = 'unanimous'; rec['agrees'] = not n
        else:
            rec['said'] = 'adopted on consent; no separate vote recorded' if o['outcome'] == 'consent' else 'no vote recorded'
            rec['agrees'] = None
        if '2016-12-01' <= x['date'] <= '2016-12-31' and x.get('hdr', [None, None])[1] == 'SOCHIN':
            rec['relabeled'] = True
        out[k] = rec
    json.dump(out, open(os.path.join(SP, 'minutes-match.json'), 'w'), indent=1)
    bad = {k: r for k, r in out.items() if r['agrees'] is False}
    print(len(out), 'register items found in the minutes;', len(bad), 'disagree:', sorted(bad))

if __name__ == '__main__':
    main()
