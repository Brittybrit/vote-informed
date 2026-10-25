"""Stage C (resumable): for every qualifying chapter in stageB.jsonl (b true), fetch the last House floor-vote PDF
listed in stageA.jsonl, read each member's recorded vote from the official roll call, and append
{u, c, d, t, a, r:{member: yes|no|not voting|not seated}} to stageC.jsonl (same shape as scripts/data/state/bills).
A member counts as "not seated" when the vote date is outside their House tenure; "not voting" when the roll lists
the member with no Y/N mark (EX = excused and AV = abstain are kept as written). Votes are never inferred."""
import re, json, os, time, subprocess, tempfile
H = os.path.dirname(os.path.abspath(__file__))
P = lambda f: os.path.join(H, f)
MEM = {'Basabe': ('2022-11-08', None), 'Gantt': ('2022-11-08', None), 'Chambliss': ('2022-11-08', None),
       'Porras': ('2022-11-08', None), 'Nixon': ('2020-11-03', None), 'Redondo': ('2023-12-05', None),
       'Blanco': ('2024-11-06', None)}
A = {json.loads(l)['ch']: json.loads(l) for l in open(P('stageA.jsonl'))}
B = {}
for l in open(P('stageB.jsonl')):
    if l.strip(): r = json.loads(l); B[r['ch']] = r
done = set()
if os.path.exists(P('stageC.jsonl')):
    done = {json.loads(l)['u'] for l in open(P('stageC.jsonl')) if l.strip()}
iso = lambda d: (lambda m, d_, y: f'{y}-{int(m):02d}-{int(d_):02d}')(*d.split('/'))
def get(u, path):
    for t in range(8):
        r = subprocess.run(['curl', '-sS', '-m', '90', '-o', path, '-w', '%{http_code}', u], capture_output=True, text=True)
        if r.stdout == '200' and open(path, 'rb').read(4) == b'%PDF': return True
        time.sleep(30 * (t + 1))
    return False
def roll(t, date):
    out = {}
    for m, (s, e) in MEM.items():
        if date < s or (e and date > e): out[m] = 'not seated'; continue
        hit = re.search(r'^(.*?)' + m + r'(?:, [A-Z]\.)?-\d+', t, re.M)
        if not hit:
            out[m] = 'not on roll'; continue
        pre = hit.group(1).split()
        code = pre[-1] if pre else ''
        out[m] = {'Y': 'yes', 'N': 'no', 'EX': 'excused', 'AV': 'abstain'}.get(code, 'not voting')
    return out
for ch, b in B.items():
    if not b.get('b'): continue
    fv = [x for x in A.get(ch, {}).get('fv', []) if x['c'] == 'H' and x.get('u')]
    if not fv: print('NOHOUSE', ch, flush=True); continue
    v = fv[-1]
    if v['u'] in done: continue
    f = tempfile.mktemp(suffix='.pdf')
    if not get(v['u'], f): print('FAIL', ch, v['u'], flush=True); continue
    t = subprocess.run(['pdftotext', '-layout', f, '-'], capture_output=True, text=True).stdout; os.remove(f)
    d = re.search(r'Date:\s*(\d\d/\d\d/\d{4})', t)
    date = iso(d.group(1)) if d else iso(v['d'])
    tal = re.search(r'Yeas\s*-\s*(\d+)\s+Nays\s*-\s*(\d+)', t)
    hdr = '\n'.join(t.split('\n')[:8])
    act = 'third reading' if 'Third Reading' in hdr else ('concur' if 'Concur' in hdr else ('passage' if 'Passage' in hdr else ''))
    rec = {'u': v['u'], 'c': 'H', 'd': date, 't': [int(tal.group(1)), int(tal.group(2))] if tal else [v['y'], v['n']],
           'a': act, 'r': roll(t, date)}
    with open(P('stageC.jsonl'), 'a') as fo: fo.write(json.dumps(rec) + '\n')
    done.add(v['u']); print(ch, rec['t'], rec['r'], flush=True)
    time.sleep(6)
print('DONE')
