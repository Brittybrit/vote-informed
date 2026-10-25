"""Filed text of each project bill in raw/pb-<year>.json (HB 2000-4999): flsenate.gov /Session/Bill/<year>/<n>/BillText/Filed/PDF,
converted with pdftotext into raw/pbtext/<year>-<n>.txt. The text gives the project title, the Appropriations Project
Request number, the fiscal-year amount, the fund and the agency. Resumable; newest year first.
Run: python3 scripts/data/tenure/prior-flhouse/bills/pbtext.py"""
import json, os, sys, subprocess, tempfile
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import fl
R = os.path.join(H, '..', 'raw'); O = os.path.join(R, 'pbtext'); os.makedirs(O, exist_ok=True)
for y in (2022, 2021, 2020, 2019, 2018, 2017):
    for b in json.load(open(os.path.join(R, f'pb-{y}.json'))):
        if not 2000 <= b['num'] < 5000: continue
        out = os.path.join(O, f"{y}-{b['num']}.txt")
        if os.path.exists(out): continue
        f = tempfile.mktemp(suffix='.pdf'); u = b['url'] + '/BillText/Filed/PDF'
        if not fl.pdf(u, f): print('FAIL', y, b['num'], flush=True); continue
        t = subprocess.run(['pdftotext', '-layout', f, '-'], capture_output=True, text=True).stdout; os.remove(f)
        open(out, 'w').write(u + '\n' + t); print(y, b['num'], flush=True)
print('DONE')
