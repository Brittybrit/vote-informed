"""Stage B fetch (resumable): for each chapter in stageA.jsonl pick the final staff analysis (House "z"/"z1" final bill
analysis if present, else the latest-dated analysis that is not a .pre / House message summary / conference report),
download it from flsenate.gov (fl.py throttle), convert with pdftotext and save the Private Sector Impact section to
ps/<chapter>.txt (first line = analysis URL). Same picking and section rules as ../../flhouse/bills/stageB-fetch.py.
If the prior-flsenate slice already extracted the section for that chapter (its bills/psi.jsonl, shape of
../../flsenate/bills/psi.jsonl), that text is used instead of fetching again (ps file then says "from prior-flsenate").
The qualifying decision is made by reading these extracts (judge.json), not here.
Run: python3 stageB-fetch.py   (waits for stage A to add rows; stops when stage A logged DONE and nothing is left)"""
import re, json, os, sys, time, subprocess, tempfile
from datetime import datetime
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import fl
PS = os.path.join(H, 'ps'); os.makedirs(PS, exist_ok=True)
OTHER = os.path.join(H, '..', '..', 'prior-flsenate', 'bills', 'psi.jsonl')
jl = lambda f: [json.loads(l) for l in open(f) if l.strip()] if os.path.exists(f) else []
def pick(an):
    an = [a for a in an if '.pre.' not in a[1] and '.hms.' not in a[1].lower() and 'Conference Report' not in a[1]]
    if not an: return None
    z = [a for a in an if re.search(r'/h\d+z\d*\.', a[1])]
    if z: return z[-1][1]
    d = lambda a: datetime.strptime(a[0], '%m/%d/%Y') if a[0].count('/') == 2 else datetime.min
    return max(an, key=d)[1]
def section(t):
    m = None
    for pat in (r'[A-D]\.\s*DIRECT ECONOMIC IMPACT ON (THE )?PRIVATE SECTOR:', r'Private Sector Impact:',
                r'(Direct Economic Impact on (the )?Private Sector|Private Sector Impact)'):
        ms = list(re.finditer(pat, t, re.I))
        if ms: m = ms[-1] if pat.startswith('[A-D]') else ms[0]; break
    if not m:
        m = re.search(r'(FISCAL OR ECONOMIC IMPACT|Fiscal or Economic Impact)\s*:', t)
        if not m: return None
    s = t[m.start():m.start() + 2500]
    e = re.search(r'\n\s*(3\.\s*Fiscal Comments|C\.\s*Government Sector Impact|D\.\s*FISCAL COMMENTS|FISCAL COMMENTS|III\.\s*COMMENTS|VI\.\s*Technical|VII\.\s*Related)', s[40:], re.I)
    return s[:40 + e.start()] if e else s
def fiscal_comments(t):
    m = list(re.finditer(r'(D\.\s*FISCAL COMMENTS:|FISCAL COMMENTS:|Fiscal Comments:)', t))
    if not m: return ''
    s = t[m[-1].start():m[-1].start() + 1800]
    e = re.search(r'\n\s*(III\.\s*COMMENTS|VI\.\s*Technical|VII\.\s*Related|IV\.\s*Constitutional)', s[30:], re.I)
    return s[:30 + e.start()] if e else s
while True:
    rows = jl(os.path.join(H, 'stageA.jsonl'))
    todo = [r for r in rows if not os.path.exists(os.path.join(PS, r['ch'] + '.txt'))]
    if not todo:
        if os.path.exists(os.path.join(H, 'stageA.log')) and any('DONE' in l for l in open(os.path.join(H, 'stageA.log'))): break
        time.sleep(120); continue
    other = {p['ch']: p for p in jl(OTHER)}
    for r in todo:
        out = os.path.join(PS, r['ch'] + '.txt'); o = other.get(r['ch'])
        if o and o.get('ps') not in (None, 'FETCH_FAILED'):
            open(out, 'w').write(o['au'] + '\n' + 'FROM prior-flsenate psi.jsonl\n' + o['ps']); print(r['ch'], 'copied', flush=True); continue
        u = pick(r['an'])
        if not u: open(out, 'w').write('NOANALYSIS\n'); print(r['ch'], 'none', flush=True); continue
        # if the chosen analysis is posted as "DOCUMENT UNAVAILABLE", fall back to the next latest analysis
        cands = [u] + [a[1] for a in sorted(r['an'], key=lambda a: a[0][-4:] + a[0][:5], reverse=True)
                       if a[1] != u and '.pre.' not in a[1] and 'Conference Report' not in a[1] and '.hms.' not in a[1].lower()]
        t = None
        for u in cands:
            f = tempfile.mktemp(suffix='.pdf')
            if not fl.pdf(u, f): t = None; break
            t = subprocess.run(['pdftotext', '-layout', f, '-'], capture_output=True, text=True).stdout
            os.remove(f)
            if 'DOCUMENT UNAVAILABLE' not in t[:3000]: break
        if t is None: print('FAIL', r['ch'], u, flush=True); continue
        s = section(t)
        body = (s if s else 'NOSECTION\n' + t[-3000:])
        fc = fiscal_comments(t) if s and re.search(r'see fiscal comments|indeterminate', s, re.I) else ''
        open(out, 'w').write(u + '\n' + body + (('\n----FISCAL COMMENTS----\n' + fc) if fc else ''))
        print(r['ch'], 'ok' if s else 'nosection', flush=True)
print('DONE')
