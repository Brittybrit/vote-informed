"""Show NMB motion context: python3 nmb_show.py <items.json> key [key...]"""
import json, sys, re
R = {r['key']: r for r in json.load(open(sys.argv[1]))}
for k in sys.argv[2:]:
    r = R.get(k)
    if not r: print('##', k, 'missing'); continue
    print('##', k, r['ref'], r['tally'], r['roll'])
    print('CTX:', re.sub(r'\s+', ' ', r['ctx'])[-900:])
    print('WHAT:', r['what'][:300])
