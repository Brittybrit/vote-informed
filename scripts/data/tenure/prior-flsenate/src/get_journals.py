"""Senate bound journals that print the Governor's line-item veto message for each GAA (2017 GAA -> 2018 journal, 2018 -> 2019,
2019 -> 2020, 2020 -> 2021), used as the veto list for FY2017-18..FY2020-21 (the flgov.com lists for those years were not found)."""
import sys, os, subprocess
sys.path.insert(0, os.path.dirname(__file__)); from net import get
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for y in ['2019', '2020', '2021']:
    p = os.path.join(H, 'raw/gaa', f'sj{y}-vI.pdf')
    if os.path.exists(p): continue
    b = get(f'https://www.flsenate.gov/usercontent/session/archive/journals/{y}/{y}-sj-bound-vI.pdf', binary=True)
    if not b: print('FAIL', y); continue
    open(p, 'wb').write(b); subprocess.run(['pdftotext', '-layout', p, p[:-4] + '.txt']); subprocess.run(['pdftotext', p, p[:-4] + '.raw.txt'])
    print(y, len(b), flush=True)
p = os.path.join(H, 'raw/gaa', 'sj2018-vI.pdf'); subprocess.run(['pdftotext', p, p[:-4] + '.raw.txt'])
