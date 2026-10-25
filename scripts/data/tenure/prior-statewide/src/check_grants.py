"""Check each grant table: rows add up to the printed TOTAL. Usage: python3 -I check_grants.py <tsv>..."""
import re, sys
for f in sys.argv[1:]:
    t, bad = {}, 0
    for l in open(f):
        p = l.rstrip('\n').split('\t')
        if len(p) < 3: continue
        a, b, c = p[0], p[1], p[2]; v = float(re.sub(r'[$, ]', '', c) or 0)
        if b.upper() in ('TOTAL',) or b.startswith('Total'):
            ok = abs(t.get(a, 0) - v) < 1
            bad += not ok
            if not ok: print(f, a, 'rows', round(t.get(a, 0), 2), 'printed', v)
        else: t[a] = t.get(a, 0) + v
    print(f, 'tables', len(t), 'mismatches', bad)
