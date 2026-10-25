# Itemized individual (and other itcont) receipts of Jolly's and Graham's committees from FEC bulk itcont,
# limited to each member's window. usage: python3 -I indiv_build.py <dir with indiv14.txt..> <outdir>
import json, glob, os, sys, collections
IN, OUT = sys.argv[1:3]
C = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cmtes.json')))
ours = {c: (m, t) for m, v in C.items() for c, t in v['c'].items()}
def d8(s): return s[4:8] + '-' + s[0:2] + '-' + s[2:4] if len(s) == 8 else None
rows = []; seen = set()
for f in sorted(glob.glob(IN + '/indiv*.txt')):
    cyc = 2000 + int(f[-6:-4])
    for l in open(f, encoding='latin-1'):
        r = l.rstrip('\n').split('|')
        if len(r) < 21 or r[0] not in ours: continue
        m, kind = ours[r[0]]; date = d8(r[13])
        if not date or date < C[m]['from'] or date > C[m]['to']: continue
        if r[20] in seen: continue
        seen.add(r[20])
        rows.append([m, r[0], kind, r[7], r[8], r[9], r[11], r[12], r[6], float(r[14] or 0), date, r[5], r[18], cyc, r[4], r[20]])
rows.sort(key=lambda x: (x[0], x[10], x[3]))
json.dump({'source': 'FEC bulk itemized receipts (itcont / indiv14, indiv16, indiv18 zips, downloaded Oct 25, 2026 from fec.gov/files/bulk-downloads), rows filed by Friends of David Jolly (C00551572), Seagrass PAC (C00563338, Jolly leadership PAC), The Jolly Victory Committee (C00565028, JFC), Graham for Congress (C00543249) and Murphy Graham Victory for Florida (C00566273, JFC). Window: Jolly 2011-01-01 to 2017-01-03, Graham 2013-01-01 to 2017-01-03. memo = X marks memo entries (for example earmarked through a conduit or JFC transfers itemized for information); do not add them to totals. Itemized only: gifts of $200 or less in a cycle need not be itemized and are not here.',
           'cols': ['member', 'cmte', 'cmteKind', 'name', 'city', 'state', 'employer', 'occupation', 'entity', 'amount', 'date', 'tp', 'memo', 'cycle', 'image', 'subId'],
           'rows': rows}, open(OUT + '/indiv-receipts.json', 'w'), ensure_ascii=False)
s = collections.defaultdict(lambda: [0, 0.0])
for x in rows:
    if x[12] == 'X': continue
    k = (x[0], x[2], x[13]); s[k][0] += 1; s[k][1] += x[9]
for k in sorted(s): print(k, s[k][0], round(s[k][1]))
print(len(rows))
