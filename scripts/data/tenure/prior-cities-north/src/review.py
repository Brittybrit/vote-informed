"""Review list for build_body items: python3 review.py <items.json> <prefix> <from> <to> [all]
Prints undecided items in the window (candidates only unless 'all')."""
import json, sys, os, re, glob
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from cand import is_candidate
V = json.load(open(sys.argv[1])); pre, a, b = sys.argv[2:5]; allf = len(sys.argv) > 5
dec = set()
for f in glob.glob(os.path.join(HERE, 'decisions', pre + '-*.txt')):
    dec |= {l.split('|')[0].strip() for l in open(f) if l.strip() and not l.startswith('#')}
for v in sorted(V, key=lambda v: (v['date'], v['key'])):
    if not (a <= v['date'][:10] <= b) or v['key'] in dec: continue
    t = v['title'] or ''
    if not allf and not is_candidate(t)[0]: continue
    t = re.sub(r'^A RESOLUTION OF THE (TOWN|CITY|VILLAGE) COMMISSION OF THE (TOWN|CITY|VILLAGE) OF [A-Z\- ]+,? FLORIDA,?\s*', '', t, flags=re.I)
    r = v['roll']; tl = 'NOVOTE' if not r else '%d-%d' % (sum(x == 'yes' for x in r.values()), sum(x == 'no' for x in r.values()))
    print(f"{v['key']}|{v['date']}|{tl}|{t[:230]}")
