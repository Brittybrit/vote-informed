# Merges every stage file (stageA/B/C, s1-s8 and r1-r5 slices) into universe.json for scripts/state-bills.mjs.
# Later files win for the same chapter (retries fix earlier failures). overrides.json sets b:false where review
# found the benefit is not named in the analysis itself. classes-by-chapter.json gives each qualifying law's
# donor industries; they are written to classes.json keyed the way the cards are ("<bill> · <year>").
# Run: python3 scripts/data/state/bills/merge.py
import json, glob, os
H = os.path.dirname(os.path.abspath(__file__))
P = lambda f: os.path.join(H, f)
E = json.load(open(P('enacted.json')))
def rows(pattern_list):
    out = []
    for pat in pattern_list:
        for f in sorted(glob.glob(P(pat))):
            for l in open(f):
                l = l.strip()
                if not l: continue
                try: out.append(json.loads(l))
                except Exception: pass
    return out
order = ['stage{}.jsonl', 's?-{}.jsonl', 'r?-{}.jsonl']
A, B, C = {}, {}, {}
for r in rows([o.format('A') for o in order]):
    if r.get('ch') and (r.get('fv') or r.get('an') or r['ch'] not in A): A[r['ch']] = r
for r in rows([o.format('B') for o in order]):
    if r.get('ch'): B[r['ch']] = r
for r in rows([o.format('C') for o in order]):
    if r.get('u'): C[r['u']] = r
over = json.load(open(P('overrides.json')))['false']
cls = json.load(open(P('classes-by-chapter.json')))
iso = lambda d: (lambda m, d_, y: f'{y}-{int(m):02d}-{int(d_):02d}')(*d.split('/')) if d and d.count('/') == 2 else d
bills, classes, missing = [], {}, {'A': [], 'B': [], 'C': []}
for e in E:
    ch = e['chapter']; a = A.get(ch, {}); b = B.get(ch)
    if not a.get('fv'): missing['A'].append(ch)
    if not b: missing['B'].append(ch)
    q = bool(b and b.get('b')) and ch not in over
    rec = {'bill': e['bill'], 'session': e['session'], 'chapter': ch, 'title': e['title'], 'url': e['url'],
           'analysisUrl': (b or {}).get('au'), 'benefits': None, 'screen': (b or {}).get('ps'), 'note': (b or {}).get('note')}
    if b and b.get('b') and ch in over: rec['reviewNote'] = over[ch]
    if q:
        rec['benefits'] = {'category': b.get('cat'), 'named': b.get('named') or [], 'quote': b.get('q')}
        votes = {}
        for c, key in (('H', 'house'), ('S', 'senate')):
            fv = [x for x in (a.get('fv') or []) if x.get('c') == c and x.get('u')]
            if not fv: continue
            v = fv[-1]; r = C.get(v['u'])
            if not r: missing['C'].append([ch, c, v['u']]); continue
            votes[key] = {'date': iso(r.get('d') or v.get('d')), 'motion': r.get('a') or v.get('a') or 'final passage',
                          'tally': r.get('t') or [v.get('y'), v.get('n')], 'url': v['u'], 'roll': r.get('r') or {}}
        rec['votes'] = votes
        classes[f"{e['bill']} · {str(e['session'])[:4]}"] = cls.get(ch, {})
    bills.append(rec)
U = {'generated': '2026-10-24', 'rule': 'Every law enacted in the 2025 and 2026 sessions (regular and special) whose final staff analysis names a kind of business or company that benefits. Where the final analysis would not load, the latest earlier committee analysis is used and noted.',
     'counts': {'enacted': len(E), 'screened': len(E) - len(missing['B']), 'qualifying': sum(1 for x in bills if x['benefits'])}, 'missing': missing, 'bills': bills}
json.dump(U, open(P('universe.json'), 'w'), indent=1, ensure_ascii=False)
json.dump(classes, open(P('classes.json'), 'w'), indent=1, ensure_ascii=False)
print(U['counts'], {k: len(v) for k, v in missing.items()})
