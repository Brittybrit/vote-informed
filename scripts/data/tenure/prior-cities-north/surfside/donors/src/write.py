"""Write Surfside prior-office donor CSVs (surfside/donors/<acct>_<year>.csv) from the hand transcriptions in this folder
(tx_<acct><year>.txt: report|date|name|address|occupation|type|amount|note). Candidate loans (LOA) and the candidate's own
money (SELF) are left out of the files; in-kind gifts are kept (Amend. code INK). Burkett's 2020 campaign had no outside
gifts (a $10,000 candidate loan and $100 of his own in-kind), so it has no file."""
import csv, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
H = ['report', 'document id', 'item date', 'Cont/Exp', 'name', 'address 1', 'occupation', 'amount', 'Amend. code']
DOC = {'burkett2022': 'charles-burkett.pdf (2022)', 'burkett2024': 'charles-w.-burkett-web.pdf (2024)', 'coto2024': 'ruben-coto-2024.pdf'}
for f in sorted(os.listdir(HERE)):
    m = re.match(r'tx_([a-z]+)(\d{4})\.txt$', f)
    if not m: continue
    acct, year = m.groups(); n = t = 0
    with open(os.path.join(OUT, '%s_%s.csv' % (acct, year)), 'w', newline='') as o:
        w = csv.writer(o); w.writerow(H)
        for l in open(os.path.join(HERE, f)):
            if l.startswith('#') or not l.strip(): continue
            rep, d, nm, ad, occ, typ, amt, note = l.rstrip('\n').split('|')
            if typ in ('LOA', 'SELF'): continue
            w.writerow(['%s %s' % (year, rep), DOC[acct + year], d, 'C', nm, ad, occ, '%.2f' % float(amt), 'INK' if typ == 'INK' else ''])
            n += 1; t += float(amt)
    print(acct, year, n, round(t, 2))
