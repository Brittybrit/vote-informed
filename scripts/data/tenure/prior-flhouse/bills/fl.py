"""Shared flsenate.gov fetcher for this slice: one request at a time across all of this slice's scripts
(flock on .fl.lock), at least 10 s apart, 60 s+ backoff on 429 / errors (flsenate.gov rate-limits; other slices share it)."""
import fcntl, os, subprocess, time
H = os.path.dirname(os.path.abspath(__file__))
LOCK = os.path.join(H, '.fl.lock')
GAP = 10.0
def _req(args):
    with open(LOCK, 'a+') as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        lk.seek(0); s = lk.read().strip()
        last = float(s) if s else 0.0
        w = last + GAP - time.time()
        if w > 0: time.sleep(w)
        r = subprocess.run(args, capture_output=True, text=True)
        lk.seek(0); lk.truncate(); lk.write(str(time.time())); lk.flush()
        return r
def page(u, tries=7, minlen=2000):
    for t in range(tries):
        r = _req(['curl', '-sS', '-m', '60', '-w', '\n%{http_code}', u.replace(' ', '%20')])
        body, _, code = r.stdout.rpartition('\n')
        if code == '200' and len(body) > minlen: return body
        open(os.path.join(H, 'fl-errors.log'), 'a').write(f'{time.strftime("%H:%M:%S")} {code} {len(body)} {u}\n')
        time.sleep(60 * (t + 1) if code == '429' or 'Too Many' in body else 20 * (t + 1))
    return None
def pdf(u, path, tries=6):
    for t in range(tries):
        r = _req(['curl', '-sS', '-m', '90', '-o', path, '-w', '%{http_code}', u.replace(' ', '%20')])
        if r.stdout == '200' and os.path.exists(path) and os.path.getsize(path) > 1500 and open(path, 'rb').read(4) == b'%PDF': return True
        open(os.path.join(H, 'fl-errors.log'), 'a').write(f'{time.strftime("%H:%M:%S")} {r.stdout} pdf {u}\n')
        time.sleep(60 * (t + 1) if r.stdout == '429' else 20 * (t + 1))
    return False
