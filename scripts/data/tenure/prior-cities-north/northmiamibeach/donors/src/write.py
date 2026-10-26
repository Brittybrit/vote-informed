"""Write North Miami Beach prior-office donor CSVs (northmiamibeach/donors/<acct>_<year>.csv) from the hand transcriptions
in this folder. Candidate loans (LOA) and the candidate's own money (SELF) are left out; in-kind gifts are kept (INK)."""
import csv, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
H = ['report', 'document id', 'item date', 'Cont/Exp', 'name', 'address 1', 'occupation', 'amount', 'Amend. code']
def py(f):
    g = {}; exec(open(os.path.join(HERE, f)).read(), g); return g['R']
def txt(f, doc):
    rows = []
    for l in open(os.path.join(HERE, f)):
        if l.startswith('#') or not l.strip(): continue
        rep, d, nm, ad, occ, typ, amt, note = l.rstrip('\n').split('|')
        rows.append((rep, doc, d, nm, ad, occ, typ, float(amt)))
    return rows
def write(fn, rows, year):
    n = t = 0
    with open(os.path.join(OUT, fn), 'w', newline='') as f:
        w = csv.writer(f); w.writerow(H)
        for rep, doc, d, nm, ad, occ, typ, amt in rows:
            if typ in ('LOA', 'SELF'): continue
            w.writerow(['%s %s' % (year, rep), doc, d, 'C', nm, ad, occ, '%.2f' % amt, 'INK' if typ == 'INK' else '']); n += 1; t += amt
    print(fn, n, round(t, 2))
write('smith_2007.csv', py('tx_smith2007.py'), 2007)
write('smith_2009.csv', py('tx_smith2009.py'), 2009)
write('smith_2011.csv', py('tx_smith2011.py'), 2011)
write('smith_2015.csv', txt('tx_smith2015.txt', 912), 2015)
for f in sorted(os.listdir(HERE)):
    m = re.match(r'tx_chernoff(\d{4})\.py$', f)
    if m: write('chernoff_%s.csv' % m.group(1), py(f), m.group(1))
