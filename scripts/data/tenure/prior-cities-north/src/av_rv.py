"""Aventura review list: python3 av_rv.py <items.json> <from> <to> [member]"""
import json, re, sys, glob, os
HERE = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(sys.argv[1])); a, b = sys.argv[2:4]; mem = sys.argv[4] if len(sys.argv) > 4 else 'Howard Weinberg'
dec = set()
for f in glob.glob(os.path.join(HERE, 'decisions', 'av-*.txt')):
    dec |= {l.split('|')[0].strip() for l in open(f) if l.strip() and not l.startswith('#')}
seen = set()
for r in sorted(R, key=lambda r: (r['date'], r['key'])):
    if r['key'] in seen or r['key'] in dec: continue
    if ('?' in r['date'] and not (a[:4] <= r['date'][:4] <= b[:4])) or ('?' not in r['date'] and not (a <= r['date'] <= b)): continue
    if '?' in r['date'] and mem not in (r['roll'] or {}): continue
    seen.add(r['key'])
    t = re.sub(r'^AN? (RESOLUTION|ORDINANCE) OF THE CITY (COMMISSION OF THE CITY )?OF AVENTURA,? FLORIDA,?\s*', '', r['title'], flags=re.I)
    t = re.sub(r'AUTHORIZING THE CITY MANAGER (ON BEHALF OF THE CITY )?TO EXECUTE (AND OTHERWISE ENTER INTO )?', 'ACM ', t)
    t = re.sub(r';?\s*AUTHORIZING THE CITY MANAGER TO DO ALL THINGS NECESSARY.*', '', t)
    rl = r['roll']; tl = 'NOVOTE' if not rl else '%d-%d%s' % (sum(v == 'yes' for v in rl.values()), sum(v == 'no' for v in rl.values()), '' if mem in rl else ' noHW')
    print(r['key'], r['date'], tl, (('[' + r['applicant'][:50] + '] ') if r.get('applicant') else '') + t[:180], sep='|')
