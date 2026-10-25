import sys, os, re, html
sys.path.insert(0, os.path.dirname(__file__)); from net import get
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for term in ['2024-2026', '2022-2024', '2020-2022', '2018-2020', '2016-2018', '2014-2016', '2012-2014']:
    p = os.path.join(H, 'raw/seats', f'senators-{term}.html')
    if not os.path.exists(p):
        b = get(f'https://www.flsenate.gov/Senators/{term}', minlen=5000); open(p, 'wb').write(b or b'')
    h = open(p, encoding='utf8', errors='replace').read()
    for m in re.finditer(r'href="(/Senators/%s/S\d+/\d+)"[^>]*>(.*?)</a>' % term, h, re.S):
        n = html.unescape(re.sub(r'<[^>]+>|\s+', ' ', m.group(2))).strip()
        if re.search(r'Avila|Taddeo|Simpson|Rodr[ií]guez|Campbell', n): print(term, m.group(1), n)
    t = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', h)))
    for m in re.finditer(r'[^.]{0,120}(Avila|Taddeo|Simpson|Rodr[ií]guez|Campbell)[^.]{0,160}', t):
        if re.search(r'elect|resign|sworn|special|vacan|\d{1,2}/\d{1,2}/\d{4}', m.group(0), re.I): print('  ', m.group(0).strip())
