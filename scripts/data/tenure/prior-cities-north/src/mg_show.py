"""Show the full title and the motion text for given keys. Usage: python3 mg_show.py <workdir> key [key...]"""
import json, sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mg_review import dedupe, key
W = sys.argv[1]; R = json.load(open(os.path.join(W, 'items.json')))
V = {key(v): v for v in dedupe(json.load(open(os.path.join(W, 'votes.json'))))}
for k in sys.argv[2:]:
    v = V.get(k)
    if not v: print('##', k, 'not found'); continue
    for it in R:
        if it['doc'] == v['doc'] and it['code'] == v['code'] and it['title'] == v['title']:
            print('##', k, it['section'], it['resno'], v['src'], v['tally'], v['flags']); print('T:', it['title']); print('R:', it['rest'][-900:]); print()
