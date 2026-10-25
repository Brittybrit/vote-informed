"""Writes bills/vote-jobs.jsonl: the Senate final-passage sheet (last Senate floor vote that is not an amendment vote, same rule as
../flsenate/bills/stageC.py and scripts/data/state/bills/merge.py) for every qualifying law in the sessions this slice needs.
Sources of the qualifying screens (reused, not redone): ../../state/bills/universe.json (2025-2026), ../flhouse/bills/stageB.jsonl
(2022D-2024), ../flsenate/bills/stageB.jsonl (2021-2022), and this slice's bills/stageB.jsonl (2013-2020). Order = priority."""
import json, os, glob
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = os.path.dirname(H)
jl = lambda f: [json.loads(l) for l in open(f) if l.strip()] if os.path.exists(f) else []
jobs = []
def last_s(fv):
    s = [x for x in fv if x['c'] == 'S' and x.get('u') and 'amendment' not in (x.get('v', '') + x.get('a', '')).lower()]
    return s[-1] if s else None
# 1. 2025-2026 (Avila)
U = json.load(open(os.path.join(T, '../state/bills/universe.json')))
miss = {m[0]: m[2] for m in U['missing']['C'] if m[1] == 'S'}
for b in U['bills']:
    if not b['benefits']: continue
    s = b.get('votes', {}).get('senate')
    u = s['url'] if s else miss.get(b['chapter'])
    jobs.append({'ch': b['chapter'], 'session': b['session'], 'u': u, 'd': s['date'] if s else None} if u else {'ch': b['chapter'], 'session': b['session'], 'u': None})
# 2. 2022A-2024 (Avila; 2022D also Taddeo/Simpson)
for src in [('flhouse', 'flhouse'), ('flsenate', 'flsenate')]:
    d = os.path.join(T, src[0], 'bills')
    E = {e['chapter']: e for e in json.load(open(os.path.join(d, 'enacted.json')))}
    A = {x['ch']: x for x in jl(os.path.join(d, 'stageA.jsonl'))}
    for x in jl(os.path.join(d, 'stageB.jsonl')):
        if not x.get('b'): continue
        v = last_s(A.get(x['ch'], {}).get('fv', []))
        jobs.append({'ch': x['ch'], 'session': E[x['ch']]['session'], 'u': v['u'] if v else None, 'd': v['d'] if v else None})
# 3. this slice's own sessions
E = {e['chapter']: e for e in jl(os.path.join(H, 'bills/enacted.jsonl'))}
A = {x['ch']: x for x in jl(os.path.join(H, 'bills/stageA.jsonl'))}
for x in jl(os.path.join(H, 'bills/stageB.jsonl')):
    if not x.get('b'): continue
    v = last_s(A.get(x['ch'], {}).get('fv', []))
    jobs.append({'ch': x['ch'], 'session': E[x['ch']]['session'], 'u': v['u'] if v else None, 'd': v['d'] if v else None})
seen, out = set(), []
for j in jobs:
    k = (j['ch'], j['u'])
    if k in seen: continue
    seen.add(k); out.append(j)
with open(os.path.join(H, 'bills/vote-jobs.jsonl'), 'w') as f:
    for j in out: f.write(json.dumps(j) + '\n')
import collections
print(len(out), collections.Counter(j['session'] for j in out), [j['ch'] for j in out if not j['u']])
