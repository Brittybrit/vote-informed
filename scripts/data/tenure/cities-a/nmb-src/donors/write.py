"""Write NMB donor CSVs (city/nmb/<acct>_<cycle>.csv) from the hand transcriptions, and mirror the hand-typed
2025-2026 reports in public/data/city-reports.json (needed once a CSV exists for the account). Loans excluded."""
import csv, json, os, sys
REPO = sys.argv[1]; HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(REPO, 'scripts/data/city/nmb')
H = ['report', 'document id', 'item date', 'Cont/Exp', 'name', 'address 1', 'occupation', 'amount', 'Amend. code']
def load(f):
    g = {}; exec(open(os.path.join(HERE, f)).read(), g); return g['R']
def write(fn, rows):
    with open(os.path.join(D, fn), 'w', newline='') as f:
        w = csv.writer(f); w.writerow(H); n = t = 0
        for rep, doc, d, nm, ad, occ, typ, amt in rows:
            if typ == 'LOA': continue
            w.writerow([('2022 ' if d.startswith('2022') else '2018 ' if d.startswith('2018') else '') + rep, doc, d, 'C', nm, ad, occ, '%.2f' % amt, 'INK' if typ == 'INK' else '']); n += 1; t += amt
    print(fn, n, t)
write('chernoff_2022.csv', load('tx_chernoff2022.py'))
write('chernoff_2018.csv', load('tx_chernoff2018.py'))
write('smith_2022.csv', load('tx_smith2022.py'))
C = json.load(open(os.path.join(REPO, 'public/data/city-reports.json')))['cities']
nmb = [c for c in C if c['city'] == 'North Miami Beach'][0]
for acct, nm in [('chernoff', 'Jay R. Chernoff'), ('smith', 'Phyllis Smith')]:
    cand = [c for c in nmb['candidates'] if c['name'] == nm][0]; rows = []
    for r in cand['reports']:
        doc = r['url'].rstrip('/').split('/')[-1]
        for x in r['rows']:
            if len(x) > 4 and x[4] == 'loan': continue
            rows.append((r['report'], doc, x[0], x[1], '', '', 'CHE', float(x[3])))
    write('%s_2026.csv' % acct, rows)
