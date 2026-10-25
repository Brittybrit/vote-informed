"""List first-reading decisions ('1') with no later item carrying the same title (second reading not found)."""
import json, re, sys, os, glob
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from mg_review import dedupe, key
W = sys.argv[1]
V = dedupe(json.load(open(os.path.join(W, 'votes.json'))))
def norm(t): return re.sub(r'[^A-Z]', '', re.sub(r'^.*?FLORIDA,?', '', (t or '').upper()))[:90]
byk = {key(v): v for v in V}
for f in sorted(glob.glob(os.path.join(HERE, 'decisions', 'mg-*.txt'))):
    for ln in open(f):
        p = ln.split('|')
        if len(p) > 1 and p[1].strip() == '1':
            v = byk.get(p[0]); n = norm(v['title'])
            later = [key(o) for o in V if o['date'] > v['date'] and norm(o['title'])[:60] == n[:60] and o['date'] < str(int(v['date'][:4]) + 1) + v['date'][4:]]
            if not later: print('NO 2ND:', p[0], v['title'][60:200])
