"""Resumable: download each LFIR PDF in lfir-list.json (member priority order, newest year first) to raw/pdf/<fy>_S<form>.pdf
and convert to raw/txt/. Reuses ../flsenate/raw/txt when that slice already has the same form."""
import json, os, sys, subprocess, shutil
sys.path.insert(0, os.path.dirname(__file__)); from net import get
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = ['Avila', 'Taddeo', 'Simpson', 'JJRodriguez', 'Campbell']
L = json.load(open(os.path.join(H, 'lfir-list.json')))
L.sort(key=lambda x: (ORDER.index(x['sponsor']), [-int(c) for c in x['fy'].split('-')]))
for x in L:
    t = os.path.join(H, 'raw/txt', f"{x['fy']}_S{x['form']}.txt"); p = os.path.join(H, 'raw/pdf', f"{x['fy']}_S{x['form']}.pdf")
    if os.path.exists(t) and os.path.getsize(t) > 0: continue
    o = os.path.join(H, '../flsenate/raw/txt', f"{x['fy']}_S{x['form']}.txt")
    if os.path.exists(o) and os.path.getsize(o) > 0: shutil.copy(o, t); continue
    b = get(x['pdf'].replace('\\', '/'), binary=True)
    if not b: print('FAIL', x['fy'], x['form'], flush=True); continue
    open(p, 'wb').write(b); subprocess.run(['pdftotext', '-layout', p, t])
    print(x['sponsor'], x['fy'], x['form'], flush=True)
print('DONE')
