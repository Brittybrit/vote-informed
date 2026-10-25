"""House roll-call cache and reader for this slice.
fetch(urls): downloads each House floor-vote PDF from flsenate.gov once (bills/fl.py throttle) and keeps its
pdftotext -layout text in bills/rolls/<name>.txt (first line = URL), so every member's mark is read from the same copy.
read(url, members, date): each member's recorded mark on that roll: yes / no / not voting (listed, no mark) /
excused / abstain / not seated (vote date outside the member's House tenure) / not on roll. Members are matched by
surname AND district ("Avila-111"), so two members with one surname are never confused. Votes are never inferred.
Run as a script: python3 bills/rolls.py <file with one URL per line> (fetch only)."""
import os, re, sys, json, tempfile, subprocess, hashlib, unicodedata
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import fl
R = os.path.join(H, 'rolls'); os.makedirs(R, exist_ok=True)
# key: (surname as printed, district, first day, last day)
MEMBERS = {
    'Lopez': ('Lopez', '113', '2022-11-09', '2025-11-18'),
    'Donalds': ('Donalds', '80', '2016-11-09', '2020-11-03'),
    'Avila': ('Avila', '111', '2014-11-04', '2022-11-08'),
    'Ingoglia': ('Ingoglia', '35', '2014-11-04', '2022-11-08'),
    'Rodriguez': ('Rodriguez', '105', '2018-11-07', '2020-11-03'),
    'Fernandez': ('Fernandez', '114', '2018-05-01', '2020-10-02'),
    'Moskowitz': ('Moskowitz', '97', '2012-11-07', '2019-01-11'),
}
def name(u): return re.sub(r'[^A-Za-z0-9_.-]', '_', u.split('/Session/Bill/')[-1])[:150] + '.txt'
def path(u): return os.path.join(R, name(u))
def fetch(urls):
    n = 0
    for u in urls:
        p = path(u)
        if os.path.exists(p): continue
        f = tempfile.mktemp(suffix='.pdf')
        if not fl.pdf(u, f): print('FAIL', u, flush=True); continue
        t = subprocess.run(['pdftotext', '-layout', f, '-'], capture_output=True, text=True).stdout; os.remove(f)
        open(p, 'w').write(u + '\n' + t); n += 1; print('ok', u, flush=True)
    return n
plain = lambda s: unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
def text(u):
    p = path(u)
    return open(p).read().partition('\n')[2] if os.path.exists(p) else None
def meta(t):
    d = re.search(r'Date:\s*(\d\d)/(\d\d)/(\d{4})', t)
    tal = re.search(r'Yeas\s*-\s*(\d+)\s+Nays\s*-\s*(\d+)', t)
    hdr = '\n'.join(t.split('\n')[:8])
    act = 'third reading' if 'Third Reading' in hdr else ('concur' if 'Concur' in hdr else ('passage' if 'Passage' in hdr else ''))
    return (f'{d.group(3)}-{d.group(1)}-{d.group(2)}' if d else None), ([int(tal.group(1)), int(tal.group(2))] if tal else None), act
def read(u, members, date=None):
    t = text(u)
    if t is None: return None
    t = plain(t)
    d, _, _ = meta(t); date = d or date
    out = {}
    for k in members:
        sur, dist, s, e = MEMBERS[k]
        if date and (date < s or date > e): out[k] = 'not seated'; continue
        hit = re.search(r'^(.*?)(?<![A-Za-z])' + sur + r'(?:, [A-Z]\.(?: ?[A-Z]\.)?)?-' + dist + r'(?!\d)', t, re.M)
        if not hit:
            hit = re.search(r'^(.*?)(?<![A-Za-z])(?:Speaker )?' + sur + r'[^\s-]*(?: [A-Z]\.)*-' + dist + r'(?!\d)', t, re.M)
        if not hit: out[k] = 'not on roll'; continue
        pre = hit.group(1).split(); code = pre[-1] if pre else ''
        if code == 'Speaker': code = pre[-2] if len(pre) > 1 else ''
        out[k] = {'Y': 'yes', 'N': 'no', 'EX': 'excused', 'AV': 'abstain'}.get(code, 'not voting')
    return out
if __name__ == '__main__':
    urls = [l.strip() for l in open(sys.argv[1]) if l.strip().startswith('http')]
    print('fetched', fetch(urls), 'of', len(urls)); print('DONE')
