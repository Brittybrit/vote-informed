"""opalocka/minutes/index.tsv -> <out>/bydate.json for ol_parse.py ({date: [[abs txt path, TYPE, chars]]}).
The Jan 23, 2019 minutes are posted twice (ADID 604 and 646, same text); only the first is used.
Usage: python3 ol_arch_index.py <out dir>"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); MD = os.path.join(HERE, '..', 'opalocka', 'minutes')
out, seen = {}, set()
for ln in open(os.path.join(MD, 'index.tsv')):
    if ln.startswith('#') or ln.startswith('date\t'): continue
    p = ln.rstrip('\n').split('\t')
    date, typ, adid, f = p[0], p[1], p[2], p[7]
    if (date, typ) in seen: continue
    seen.add((date, typ))
    out.setdefault(date, []).append([os.path.abspath(os.path.join(MD, f[:-4] + '.txt')), typ.upper(), int(p[5]), adid])
os.makedirs(sys.argv[1], exist_ok=True)
json.dump(out, open(os.path.join(sys.argv[1], 'bydate.json'), 'w'), indent=0)
print(len(out), 'dates', sum(len(v) for v in out.values()), 'docs')
