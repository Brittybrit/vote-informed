"""Writes bills/vote-jobs.jsonl: the Senate final-passage sheet (last Senate floor vote that is not an amendment vote, same rule as
../flsenate/bills/stageC.py and scripts/data/state/bills/merge.py) for every qualifying law in the sessions this slice needs.
Sources of the qualifying screens (reused, not redone): ../../state/bills/universe.json (2025-2026), ../flhouse/bills/stageB.jsonl
(2022D-2024), ../flsenate/bills/stageB.jsonl (2021-2022), and this slice's bills/stageB.jsonl (2013-2020). Order = priority."""
import json, os, glob, sys
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = os.path.dirname(H)
jl = lambda f: [json.loads(l) for l in open(f) if l.strip()] if os.path.exists(f) else []
jobs = []
def qualifying_2013_2020():
    """[{ch, session, bill, src, rec}] newest year first: prior-flhouse bills-<year>.json where that slice screened the chapter,
    else this slice's stageB.jsonl reading."""
    mine = {x['ch']: x for x in jl(os.path.join(H, 'bills/stageB.jsonl'))}
    E = {e['chapter']: e for e in jl(os.path.join(H, 'bills/enacted.jsonl'))}
    out = []
    for y in range(2020, 2012, -1):
        J = json.load(open(os.path.join(T, 'prior-flhouse', f'bills-{y}.json')))
        for b in J['bills']:
            ch = b['chapter']
            if b.get('screen') is not None or b.get('benefits') or b.get('analysisUrl'):
                if b.get('benefits'): out.append({'ch': ch, 'session': b['session'], 'src': 'prior-flhouse', 'rec': b})
            elif ch in mine and mine[ch].get('b'):
                m = mine[ch]; out.append({'ch': ch, 'session': E[ch]['session'], 'src': 'prior-flsenate', 'rec': dict(b, analysisUrl=m['au'], screen=m['ps'],
                    note=m.get('note'), benefits={'category': m.get('cat'), 'named': m.get('named') or [], 'quote': m.get('q')})})
    return out
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
# 3. 2013-2020: qualifying laws as screened by ../prior-flhouse (bills-<year>.json; its readings win), plus this slice's own
#    2020 screening (bills/stageB.jsonl) for chapters prior-flhouse has not screened. Newest first.
E = {e['chapter']: e for e in jl(os.path.join(H, 'bills/enacted.jsonl'))}
A = {x['ch']: x for x in jl(os.path.join(T, 'prior-flhouse/bills/stageA.jsonl'))}
for x in jl(os.path.join(H, 'bills/stageA.jsonl')): A.setdefault(x['ch'], x)
for q in qualifying_2013_2020():
    v = last_s(A.get(q['ch'], {}).get('fv', []))
    jobs.append({'ch': q['ch'], 'session': q['session'], 'u': v['u'] if v else None, 'd': v['d'] if v else None})
seen, out = set(), []
for j in jobs:
    k = (j['ch'], j['u'])
    if k in seen: continue
    seen.add(k); out.append(j)
with open(os.path.join(H, 'bills/vote-jobs.jsonl'), 'w') as f:
    for j in out: f.write(json.dumps(j) + '\n')
import collections
print(len(out), collections.Counter(j['session'] for j in out), [j['ch'] for j in out if not j['u']])
