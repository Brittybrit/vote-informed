"""Stage B fetch (resumable): for each chapter in stageA.jsonl pick the final staff analysis (House "z"/"z1" final
bill analysis if present, else the latest-dated non-.pre, non-.hms analysis), download it with curl, convert with
pdftotext, and save the Private Sector Impact section to ps/<chapter>.txt (first line = analysis URL).
The qualifying decision is made by reading these extracts (stageB.jsonl), not by this script."""
import re, json, os, time, subprocess, tempfile
from datetime import datetime
H = os.path.dirname(os.path.abspath(__file__))
PS = os.path.join(H, 'ps'); os.makedirs(PS, exist_ok=True)
def pick(an):
    an = [a for a in an if '.pre.' not in a[1] and '.hms.' not in a[1].lower()]
    if not an: return None
    z = [a for a in an if re.search(r'/h\d+z\d*\.', a[1])]
    if z: return z[-1][1]
    d = lambda a: datetime.strptime(a[0], '%m/%d/%Y') if a[0].count('/') == 2 else datetime.min
    return max(an, key=d)[1]
def get(u, path):
    for t in range(6):
        r = subprocess.run(['curl', '-sS', '-m', '90', '-o', path, '-w', '%{http_code}', u], capture_output=True, text=True)
        if r.stdout == '200' and os.path.getsize(path) > 3000 and open(path, 'rb').read(4) == b'%PDF': return True
        time.sleep(30 * (t + 1))
    return False
def section(t):
    m = re.search(r'(Direct Economic Impact on (the )?Private Sector|Private Sector Impact)', t, re.I)
    if not m: return None
    s = t[m.start():m.start() + 2500]
    e = re.search(r'\n\s*(3\.\s*Fiscal Comments|C\.\s*Government Sector Impact|D\.\s*FISCAL COMMENTS|FISCAL COMMENTS|III\.\s*COMMENTS|VI\.\s*Technical|VII\.\s*Related)', s[40:], re.I)
    return s[:40 + e.start()] if e else s
while True:
    rows = [json.loads(l) for l in open(os.path.join(H, 'stageA.jsonl'))]
    todo = [r for r in rows if not os.path.exists(os.path.join(PS, r['ch'] + '.txt'))]
    if not todo:
        if any('DONE' in l for l in open(os.path.join(H, 'stageA.log'))): break
        time.sleep(120); continue
    for r in todo:
        u = pick(r['an']); out = os.path.join(PS, r['ch'] + '.txt')
        if not u: open(out, 'w').write('NOANALYSIS\n'); print(r['ch'], 'none', flush=True); continue
        f = tempfile.mktemp(suffix='.pdf')
        if not get(u, f): print('FAIL', r['ch'], u, flush=True); time.sleep(8); continue
        t = subprocess.run(['pdftotext', '-layout', f, '-'], capture_output=True, text=True).stdout
        os.remove(f)
        s = section(t)
        open(out, 'w').write(u + '\n' + (s if s else 'NOSECTION\n' + t[-3000:]))
        print(r['ch'], 'ok' if s else 'nosection', flush=True)
        time.sleep(8)
print('DONE')
