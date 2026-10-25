"""Builds stageB.jsonl from ps/<ch>.txt + judge.json, then ../bills-2023.json and ../bills-2024.json in the schema of
scripts/data/state/bills/universe.json (one file per calendar year of sessions: 2022A/2022D/2023B/2023/2023C -> 2023
file's year label by chapter year; 2024 -> 2024). Session 2022D (May 2022) is listed for completeness: it was
before the Nov 2022 seating, so its votes are by Nixon only (others 'not seated').
Run: python3 build-bills.py   (then python3 stageC.py fetches roll calls for b:true chapters, then rerun this)."""
import json, os, re
H = os.path.dirname(os.path.abspath(__file__)); P = lambda f: os.path.join(H, f)
E = json.load(open(P('enacted.json')))
J = json.load(open(P('judge.json')))
A = {}
for l in open(P('stageA.jsonl')):
    r = json.loads(l); A[r['ch']] = r
def is_none(body):
    b = re.sub(r'\s+', ' ', body)
    b = re.sub(r'^\s*([BC]\.\s*)?(Private Sector Impact:|DIRECT ECONOMIC IMPACT ON (THE )?PRIVATE SECTOR:)\s*', '', b, flags=re.I)
    b = re.sub(r'^\s*(DIRECT ECONOMIC IMPACT ON (THE )?PRIVATE SECTOR:)\s*', '', b, flags=re.I)
    b = re.sub(r'STORAGE NAME: \S+ PAGE: \d+ (DATE: \S+\s*)?', '', b).strip()
    return bool(re.match(r'(None|Not applicable|N/A)\.?(\s|$)', b, re.I)) or len(b.strip()) < 6
B, unjudged, nosec = {}, [], []
for e in E:
    ch = e['chapter']; f = P('ps/' + ch + '.txt')
    if not os.path.exists(f):
        if ch in J and 'title class' in (J[ch].get('note') or ''):
            B[ch] = {'ch': ch, 'au': None, 'ps': J[ch]['note'], 'b': False, 'cat': None, 'named': [], 'q': None}
        continue
    t = open(f).read(); u, _, body = t.partition('\n')
    if u == 'NOANALYSIS': B[ch] = {'ch': ch, 'au': None, 'ps': None, 'b': False, 'note': 'no staff analysis posted'}; continue
    ps = re.sub(r'\s+', ' ', body).strip()[:1500]
    if ch in J:
        j = J[ch]; B[ch] = {'ch': ch, 'au': u, 'ps': ps, 'b': j['b'], 'cat': j.get('cat'), 'named': j.get('named', []), 'q': j.get('q'), 'note': j.get('note')}
    elif body.startswith('NOSECTION'):
        nosec.append(ch); B[ch] = {'ch': ch, 'au': u, 'ps': None, 'b': None, 'note': 'Private Sector section not found in the converted text'}
    elif is_none(body):
        B[ch] = {'ch': ch, 'au': u, 'ps': 'None.', 'b': False, 'cat': None, 'named': [], 'q': None}
    else:
        unjudged.append(ch); B[ch] = {'ch': ch, 'au': u, 'ps': ps, 'b': None, 'note': 'not yet judged'}
with open(P('stageB.jsonl'), 'w') as fo:
    for r in B.values(): fo.write(json.dumps(r, ensure_ascii=False) + '\n')
C = {}
if os.path.exists(P('stageC.jsonl')):
    for l in open(P('stageC.jsonl')):
        if l.strip(): r = json.loads(l); C[r['u']] = r
iso = lambda d: (lambda m, d_, y: f'{y}-{int(m):02d}-{int(d_):02d}')(*d.split('/')) if d and d.count('/') == 2 else d
out = {'2023': [], '2024': []}; missing = {'2023': {'A': [], 'B': [], 'C': []}, '2024': {'A': [], 'B': [], 'C': []}}
for e in E:
    ch = e['chapter']; yr = '2024' if e['session'] == '2024' else '2023'
    a = A.get(ch, {}); b = B.get(ch)
    if not a: missing[yr]['A'].append(ch)
    if not b or b.get('b') is None: missing[yr]['B'].append(ch)
    rec = {'bill': e['bill'], 'session': e['session'], 'chapter': ch, 'title': e['title'], 'url': e['url'],
           'analysisUrl': (b or {}).get('au'), 'benefits': None, 'screen': (b or {}).get('ps'), 'note': (b or {}).get('note')}
    if b and b.get('b'):
        rec['benefits'] = {'category': b.get('cat'), 'named': b.get('named') or [], 'quote': b.get('q')}
        votes = {}
        fv = [x for x in a.get('fv', []) if x['c'] == 'H' and x.get('u')]
        if fv:
            v = fv[-1]; r = C.get(v['u'])
            if r: votes['house'] = {'date': r['d'], 'motion': r.get('a') or 'final passage', 'tally': r['t'], 'url': v['u'], 'roll': r['r']}
            else: missing[yr]['C'].append([ch, 'H', v['u']])
        rec['votes'] = votes
    out[yr].append(rec)
for yr, bills in out.items():
    ses = sorted({b['session'] for b in bills})
    U = {'generated': '2026-10-25', 'extends': 'scripts/data/state/bills/universe.json',
         'rule': 'Every law enacted in sessions ' + ', '.join(ses) + ' whose final staff analysis names a kind of business or company that benefits (same test as universe.json). House floor roll calls only (the members are House members); a member is "not seated" on dates outside their House tenure.',
         'counts': {'enacted': len(bills), 'screened': sum(1 for b in bills if b['chapter'] in B and B[b['chapter']].get('b') is not None),
                    'qualifying': sum(1 for b in bills if b['benefits'])}, 'missing': missing[yr], 'bills': bills}
    json.dump(U, open(os.path.join(os.path.dirname(H), f'bills-{yr}.json'), 'w'), indent=1, ensure_ascii=False)
    print(yr, U['counts'], {k: len(v) for k, v in missing[yr].items()})
print('unjudged', unjudged); print('nosection', nosec)
