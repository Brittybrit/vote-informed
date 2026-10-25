"""Print qualifying-action candidates from votes.json for hand review (one line each).
Usage: python3 mg_review.py <workdir> <year> [all]"""
import json, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cand import is_candidate, parties_of, amount

def dedupe(V):
    best = {}
    for v in V:
        k = (v['doc'], re.sub(r'\W', '', (v['title'] or ''))[:200])
        score = (v['roll'] is not None, v['src'] in ('own', 'own-roll'), not v['pulled'])
        if k not in best or score > best[k][0]: best[k] = (score, v)
    keep = {id(b[1]) for b in best.values()}
    out = [v for v in V if id(v) in keep]
    seen = {}
    for v in out:
        k = _key(v); n = seen.get(k, 0); seen[k] = n + 1
        v['_k'] = k if n == 0 else k + '.' + 'bcdefgh'[n - 1]
    return out

def key(v):
    return v.get('_k') or _key(v)

def _key(v):
    sp = 's' if re.search(r'special|budget', v.get('meeting') or '', re.I) else ''
    return f"mg-{v['date']}{sp}-{v['code']}"

if __name__ == '__main__':
    W, Y = sys.argv[1], sys.argv[2]
    ALL = len(sys.argv) > 3
    V = json.load(open(os.path.join(W, 'votes.json')))
    for v in dedupe(V):
        if not v['date'].startswith(Y): continue
        ok, k = is_candidate(v['title'])
        if not ok and not ALL: continue
        t = re.sub(r'^.*?GARDENS,?\s*FLORIDA,?\s*', '', v['title'] or '')
        t = re.sub(r';?\s*PROVIDING FOR (THE )?ADOPTION OF REPRESENTATIONS.*$', '', t)
        t = re.sub(r'\s+', ' ', t)
        vt = 'NOVOTE' if v['roll'] is None else (v['result'] or '') + ('' if not v['tally'] else ' ' + str(v['tally']))
        fl = ('!' + ';'.join(f[:25] for f in v['flags'])) if v['flags'] else ''
        sec = re.sub(r'[^A-Z]', '', (v['section'] or '').upper())[:6]
        print(f"{key(v)}|{k}|{sec}|{vt}{fl}|{t[:300]}")
