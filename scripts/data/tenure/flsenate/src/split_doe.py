# Split verified DOE chunks (raw/doe/c00..c13) into per-account TSVs matching scripts/data/state/donors/*.tsv
import glob, os, re
base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lines = []
for f in sorted(glob.glob(os.path.join(base, 'raw/doe/c*.txt'))):
    lines += open(f).read().rstrip('\n').split('\n')
# candidate column labels as the DOE export prints them (from existing state/cabinet TSVs)
label = {
 'garcia': 'Garcia, Ileana  (REP)(STS)',
 'calatayud': 'Calatayud, Alexis Maria (REP)(STS)',
 'rodriguez': 'Rodriguez, Ana Maria (REP)(STS)',
 'ingoglia': 'Ingoglia, Blaise  (REP)(STS)',
}
out = {}; cur = None; names = {}
for l in lines:
    if l.startswith('##'):
        acct, nm = l[2:].split('|', 1); cur = acct; names[acct] = label.get(acct, nm); out.setdefault(acct, []); continue
    p = l.split('|')
    while len(p) < 8: p.append('')
    out[cur].append('\t'.join([names[cur]] + p[:8]))
os.makedirs(os.path.join(base, 'donors'), exist_ok=True)
for acct, rows in out.items():
    with open(os.path.join(base, 'donors', acct + '.tsv'), 'w') as fh:
        fh.write('\n'.join(rows) + '\n')
    tot = sum(float(r.split('\t')[2]) for r in rows)
    ds = sorted(r.split('\t')[1][6:] + r.split('\t')[1][:5] for r in rows)
    print(acct, len(rows), round(tot, 2), ds[0], ds[-1])
