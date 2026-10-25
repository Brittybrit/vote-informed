"""House roll calls for Nixon and Chambliss on the 2021-2022 laws (sessions 2021, 2021A, 2021B, 2022, 2022C), resumable.
Which laws qualify is NOT re-screened here: it is read from the Senate slice's screening
(../../flsenate/bills/stageB.jsonl, b true; readings in ../../flsenate/bills/decisions.json), and the House floor-vote
links from its stageA.jsonl. For each qualifying chapter, fetch the last House floor-vote PDF and read Nixon's and
Chambliss's recorded votes (same reading as stageC.py) into stageC-2122.jsonl {ch, u, c, d, t, a, r}.
Shares the flsenate.gov rate limit with the Senate slice: waits while its stageA/stageC fetcher runs, one request
every 8 s, backs off on errors.
Run: python3 -I stageC-2122.py"""
import re, json, os, time, subprocess, tempfile
H = os.path.dirname(os.path.abspath(__file__))
S = os.path.join(H, '..', '..', 'flsenate', 'bills')
OUT = os.path.join(H, 'stageC-2122.jsonl')
MEM = {'Nixon': ('2020-11-03', None), 'Chambliss': ('2020-11-03', None)}
jl = lambda f: [json.loads(l) for l in open(f) if l.strip()] if os.path.exists(f) else []
A = {r['ch']: r for r in jl(os.path.join(S, 'stageA.jsonl'))}
B = {r['ch']: r for r in jl(os.path.join(S, 'stageB.jsonl'))}
done = {r['u'] for r in jl(OUT)}
iso = lambda d: (lambda m, d_, y: f'{y}-{int(m):02d}-{int(d_):02d}')(*d.split('/'))
def senate_busy():
    r = subprocess.run(['pgrep', '-f', 'flsenate/bills.*stage[AC]|python3 -I stage[AC].py'], capture_output=True, text=True)
    return any(l.strip() and str(os.getpid()) != l.strip() for l in r.stdout.split('\n'))
def get(u, path):
    for t in range(6):
        while senate_busy(): time.sleep(20)
        r = subprocess.run(['curl', '-sS', '-m', '90', '-o', path, '-w', '%{http_code}', u], capture_output=True, text=True)
        if r.stdout == '200' and open(path, 'rb').read(4) == b'%PDF': return True
        time.sleep(30 * (t + 1))
    return False
def roll(t, date):
    out = {}
    for m, (s, e) in MEM.items():
        if date < s or (e and date > e): out[m] = 'not seated'; continue
        hit = re.search(r'^(.*?)' + m + r'(?:, [A-Z]\.)?-\d+', t, re.M)
        if not hit: out[m] = 'not on roll'; continue
        pre = hit.group(1).split(); code = pre[-1] if pre else ''
        out[m] = {'Y': 'yes', 'N': 'no', 'EX': 'excused', 'AV': 'abstain'}.get(code, 'not voting')
    return out
n = 0
for ch, b in B.items():
    if not b.get('b') or not ch.startswith(('2021-', '2022-')): continue
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
    rec = {'ch': ch, 'u': v['u'], 'c': 'H', 'd': date, 't': [int(tal.group(1)), int(tal.group(2))] if tal else [v['y'], v['n']], 'a': act, 'r': roll(t, date)}
    with open(OUT, 'a') as fo: fo.write(json.dumps(rec) + '\n')
    done.add(v['u']); n += 1; print(ch, rec['t'], rec['r'], flush=True)
    time.sleep(8)
print('DONE', n)
