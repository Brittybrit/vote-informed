"""Donor index for the three Cabinet officers (FL DOE contrib.exe exports, 2025-2026).
Usage: python3 -I donors.py "Siboney" "Tomeu" ...  -> every gift whose donor name or address matches.
Import: from donors import load, find
"""
import csv, glob, os, re, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ACCT = {  # file -> (officer key, account key, display)
    'uthmeier': ('Uthmeier', 'uthmeier', 'James Uthmeier campaign'),
    'pc89007': ('Uthmeier', 'pc89007', 'Friends of James Uthmeier (political committee)'),
    'ingoglia': ('Ingoglia', 'ingoglia', 'Blaise Ingoglia campaign'),
    'pc79506': ('Ingoglia', 'pc79506', 'Friends of Blaise Ingoglia (political committee)'),
    'pc70076': ('Ingoglia', 'pc70076', 'Government Gone Wild (political committee)'),
    'simpson': ('Simpson', 'simpson', 'Wilton Simpson campaign'),
    'pc79644': ('Simpson', 'pc79644', 'Friends of Wilton Simpson (political committee)'),
}

def norm(s):
    s = s.upper().replace('&', ' AND ')
    s = re.sub(r"[.,'\"()-]", ' ', s)
    s = re.sub(r'\b(INC|LLC|LLLP|LLP|LP|LTD|CORP|CORPORATION|CO|COMPANY|PA|PC|PLLC|THE|OF|FLORIDA|FL)\b', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

def load():
    rows = []
    for f in sorted(glob.glob(os.path.join(HERE, '*.tsv'))):
        key = os.path.basename(f)[:-4]
        if key not in ACCT: continue
        to, acct, _ = ACCT[key]
        for line in open(f, encoding='utf-8'):
            c = line.rstrip('\n').split('\t')
            if len(c) < 8: continue
            mm, dd, yy = c[1].split('/')
            rows.append({'to': to, 'acct': acct, 'date': f'{yy}-{mm}-{dd}', 'amount': float(c[2]), 'typ': c[3],
                         'donor': c[4].strip(), 'addr': c[5].strip(), 'city': c[6].strip(), 'occ': c[7].strip(),
                         'desc': c[8].strip() if len(c) > 8 else '', 'n': norm(c[4]), 'na': norm(c[5])})
    return rows

def find(rows, *terms, addr=False):
    out = []
    for t in terms:
        nt = norm(t)
        if not nt: continue
        for r in rows:
            if nt in r['n'] or (addr and nt in r['na']):
                out.append(r)
    seen, uniq = set(), []
    for r in out:
        k = (r['acct'], r['date'], r['donor'], r['amount'])
        if k not in seen: seen.add(k); uniq.append(r)
    return sorted(uniq, key=lambda r: (r['to'], r['date']))

if __name__ == '__main__':
    rows = load()
    addr = '--addr' in sys.argv
    terms = [a for a in sys.argv[1:] if a != '--addr']
    for r in find(rows, *terms, addr=addr):
        print(f"{r['to']:9} {r['acct']:9} {r['date']} {r['amount']:>10,.0f} {r['typ']} {r['donor']} | {r['addr']} {r['city']} | {r['occ']}")
