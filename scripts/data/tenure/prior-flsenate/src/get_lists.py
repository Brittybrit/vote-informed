import sys, os
sys.path.insert(0, os.path.dirname(__file__)); from net import get
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for fy in sys.argv[1:]:
    p = os.path.join(H, 'raw/lfr', f'lfr-FY{fy}.html')
    if os.path.exists(p) and os.path.getsize(p) > 10000: continue
    b = get(f'https://www.flsenate.gov/Session/Appropriations/FY{fy}/LocalFundingRequests', minlen=5000)
    print(fy, len(b) if b else None, flush=True)
    if b: open(p, 'wb').write(b)
