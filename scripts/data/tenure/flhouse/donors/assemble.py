"""Turns the pasted DOE contrib.exe pages (donors/pages/<n>.txt, fields joined by ' ¦ ', '&' shown as '❦') into
gifts TSVs in the same 9-column layout as scripts/data/state/donors/<acct>.tsv, and checks each page's row count
and cent total against the '#PAGE n key rows R cents C' header computed in the browser from the DOE export."""
import os, glob, re, sys
H = os.path.dirname(os.path.abspath(__file__))
CAND = {'Basabe': 'Basabe, Fabian  (REP)(STR)', 'Porras': 'Porras, Juan Carlos (REP)(STR)', 'Chambliss': 'Chambliss, Kevin  (DEM)(STR)',
        'Redondo': 'Redondo, Mike  (REP)(STR)', 'Nixon': 'Nixon, Angie  (DEM)(STR)', 'Gantt': 'Gantt, Ashley  (DEM)(STR)'}
out, ok = {}, True
for f in sorted(glob.glob(os.path.join(H, 'pages', '*.txt')), key=lambda p: int(os.path.basename(p)[:-4])):
    L = [l for l in open(f, encoding='utf8').read().split('\n') if l.strip()]
    m = re.match(r'#PAGE (\d+) (\w+) rows (\d+) cents (\d+)', L[0]); k = m.group(2)
    rows = [l for l in L[1:] if not l.startswith('#END')]
    nrows = sum(1 for l in rows if not l.startswith('@@'))
    cand = CAND[k]
    recs = []
    sticky = None
    for r in rows:
        if r.startswith('@@'): sticky = r[2:].strip(); continue
        c = [x.strip() for x in r.replace('❦', '&').replace('❧', '=').replace('❨', '?').replace(' ¦ ', '¦').split('¦')]
        if c[0].startswith('@'): cand_, c = c[0][1:], c[1:]
        else: cand_ = sticky or cand
        c += [''] * (8 - len(c))
        recs.append([cand_] + c[:8])
    cents = sum(round(float(r[2]) * 100) for r in recs)
    good = len(recs) == int(m.group(3)) and cents == int(m.group(4))
    ok &= good
    print(os.path.basename(f), k, len(recs), m.group(3), cents, m.group(4), 'OK' if good else 'MISMATCH')
    out.setdefault(k, []).extend(recs)
for k, recs in out.items():
    with open(os.path.join(H, f'{k.lower()}-pre2025.tsv'), 'w', encoding='utf8') as w:
        for r in recs: w.write('\t'.join(r) + '\n')
sys.exit(0 if ok else 1)
