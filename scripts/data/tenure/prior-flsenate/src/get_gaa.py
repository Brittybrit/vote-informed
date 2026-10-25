"""Fetch the enrolled General Appropriations Acts (and their flsenate bill pages, for the chapter number and veto history)
for the fiscal years this slice needs that ../flsenate/raw/gaa does not have, plus the 2025 and 2026 veto lists."""
import sys, os, subprocess
sys.path.insert(0, os.path.dirname(__file__)); from net import get
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
G = {2017: '2017/5001', 2018: '2018/5001', 2019: '2019/2500', 2020: '2020/5001', 2025: '2025/2500', 2026: '2026E/5001E'}
for y, b in G.items():
    pg = os.path.join(H, 'raw/gaa', f'bp-{y}.html')
    if not os.path.exists(pg):
        h = get(f'https://www.flsenate.gov/Session/Bill/{b.split("/")[0]}/{b.split("/")[1].rstrip("E") if y==2026 else b.split("/")[1]}', minlen=5000)
        open(pg, 'wb').write(h or b'')
    p = os.path.join(H, 'raw/gaa', f'gaa{y}.pdf')
    if not os.path.exists(p):
        pdf = get(f'https://www.flsenate.gov/Session/Bill/{b}/BillText/er/PDF', binary=True)
        if not pdf: print('FAIL', y); continue
        open(p, 'wb').write(pdf)
        subprocess.run(['pdftotext', '-layout', p, p[:-4] + '.txt'])
    print(y, os.path.getsize(p), flush=True)
for y, u in {2025: 'https://www.flgov.com/eog/sites/default/files/shared/2025/06/2025%20Final%20Veto%20List.pdf',
             2026: 'https://www.flgov.com/eog/sites/default/files/shared/2026/06/2026%20Veto%20List.pdf'}.items():
    p = os.path.join(H, 'raw/gaa', f'veto{y}.pdf')
    if not os.path.exists(p):
        r = subprocess.run(['curl', '-sS', '-m', '120', '-o', p, u]); subprocess.run(['pdftotext', '-layout', p, p[:-4] + '.txt'])
    print('veto', y, os.path.getsize(p))
