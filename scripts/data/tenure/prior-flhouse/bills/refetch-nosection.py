"""Re-reads analyses saved as NOSECTION with only the last 3,000 characters (before stageB-fetch.py kept the fiscal
section): fetches the same PDF again and keeps the "FISCAL ANALYSIS" section (6,000 characters) so local bills can be
read from their fiscal section, as the other slices did. Only chapters still unjudged are refetched.
Run: python3 refetch-nosection.py"""
import json, os, sys, subprocess, tempfile, re
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import fl
B = {json.loads(l)['ch']: json.loads(l) for l in open(os.path.join(H, 'stageB.jsonl'))}
for ch, r in B.items():
    if r.get('b') is not None: continue
    p = os.path.join(H, 'ps', ch + '.txt'); t0 = open(p).read()
    u, _, body = t0.partition('\n')
    if not body.startswith('NOSECTION') or 'REFETCHED' in body: continue
    f = tempfile.mktemp(suffix='.pdf')
    if not fl.pdf(u, f): print('FAIL', ch, flush=True); continue
    t = subprocess.run(['pdftotext', '-layout', f, '-'], capture_output=True, text=True).stdout; os.remove(f)
    k = t.find('FISCAL ANALYSIS')
    open(p, 'w').write(u + '\nNOSECTION REFETCHED\n' + (t[k:k + 6000] if k >= 0 else t[:4000] + '\n...\n' + t[-4000:]))
    print(ch, 'ok', flush=True)
print('DONE')
