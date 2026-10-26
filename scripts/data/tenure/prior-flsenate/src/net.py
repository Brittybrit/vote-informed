"""Shared fetch helper for every script in this slice: curl through the proxy. Request STARTS are spaced at least 6.5 s apart
across all of this slice's processes (file lock + timestamp; another agent shares flsenate.gov); the download itself runs
outside the lock. 60 s backoff on 429 (for /Session/ pages: shared by all processes)."""
import subprocess, time, os, tempfile, fcntl
LOCK = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.net.lock')
HOLD = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.net.hold')  # 429 back-off for flsenate.gov /Session/ pages only
def _dynamic(u): return 'flsenate.gov/Session/' in u
def _wait_hold(u):
    if not _dynamic(u): return
    try: until = float(open(HOLD).read().strip() or 0)
    except (OSError, ValueError): until = 0
    if until > time.time(): time.sleep(until - time.time())

def _slot(gap):
    with open(LOCK, 'a+') as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        lk.seek(0); s = lk.read().strip()
        last = float(s) if s else 0.0
        w = gap - (time.time() - last)
        if w > 0: time.sleep(w)
        lk.seek(0); lk.truncate(); lk.write(str(time.time())); lk.flush()
        fcntl.flock(lk, fcntl.LOCK_UN)

def get(u, binary=False, tries=8, gap=6.5, minlen=1000):
    for t in range(tries):
        f = tempfile.NamedTemporaryFile(delete=False); f.close()
        _wait_hold(u); _slot(gap)
        r = subprocess.run(['curl', '-sS', '-L', '-m', '600', '-o', f.name, '-w', '%{http_code}', u.replace(' ', '%20')],
                           capture_output=True, text=True)
        b = open(f.name, 'rb').read(); os.unlink(f.name)
        code = r.stdout.strip()
        if code == '200' and len(b) >= minlen and (not binary or b[:4] == b'%PDF'): return b
        import sys; print(f'net: {code} {len(b)}B try {t} {u}', file=sys.stderr, flush=True)
        if code == '404': return None
        if code == '429':
            # 60 s back-off for every /Session/ request of this slice (the static /PublishedContent/ files have never returned 429)
            open(HOLD, 'w').write(str(time.time() + 60)) if _dynamic(u) else time.sleep(60)
        else:
            time.sleep(20 * (t + 1))
    return None
