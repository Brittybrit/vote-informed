"""Local bills and claim bills: their House analyses (LFS/JDC) have no Private Sector section. Save section II
(FISCAL ANALYSIS & ECONOMIC IMPACT STATEMENT) of the final analysis to ps/<ch>.txt so it can be read the same way."""
import json, os, re, subprocess, time, tempfile, sys
H = os.path.dirname(os.path.abspath(__file__))
chs = sys.argv[1:]
for ch in chs:
    f = os.path.join(H, 'ps', ch + '.txt'); u = open(f).read().split('\n', 1)[0]
    if 'NOSECTION' not in open(f).read(): continue
    p = tempfile.mktemp(suffix='.pdf')
    for t in range(5):
        r = subprocess.run(['curl', '-sS', '-m', '90', '-o', p, '-w', '%{http_code}', u.replace(' ', '%20')], capture_output=True, text=True)
        if r.stdout == '200' and open(p, 'rb').read(4) == b'%PDF': break
        time.sleep(30 * (t + 1))
    else: print('FAIL', ch); continue
    t = subprocess.run(['pdftotext', '-layout', p, '-'], capture_output=True, text=True).stdout; os.remove(p)
    m = re.search(r'II\.\s*FISCAL ANALYSIS', t)
    s = t[m.start():m.start() + 2500] if m else None
    if s:
        e = re.search(r'III\.\s*COMMENTS', s); s = s[:e.start()] if e else s
    open(f, 'w').write(u + '\n' + ('LOCALBILL ' + s if s else 'NOSECTION\n' + t[-2000:]))
    print(ch, 'ok' if s else 'nosection', flush=True); time.sleep(7)
