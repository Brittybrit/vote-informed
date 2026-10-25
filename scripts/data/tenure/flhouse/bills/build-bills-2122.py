"""Builds ../bills-2122.json (same shape as ../bills-2023.json) for the 2021, 2021A, 2021B, 2022 and 2022C sessions,
when only Nixon and Chambliss of the members on the ballot were seated. Not re-screened here: which laws qualify, the
category and the quoted analysis text come from the Senate slice (../../flsenate/bills/stageB.jsonl, readings in its
decisions.json); House roll calls from stageC-2122.jsonl (stageC-2122.py). Donor classes and labels for these laws:
classes-2122.json and labels-2122.json, keyed by chapter / "<bill> · <year>" (2021A laws use 2021).
Every qualifying chapter must have a class, a label and a House roll call; missing ones are listed and the file
records them under "missing" (state-bills.mjs skips laws without a House vote).
Run: python3 -I build-bills-2122.py"""
import json, os
H = os.path.dirname(os.path.abspath(__file__)); P = lambda f: os.path.join(H, f)
S = os.path.join(H, '..', '..', 'flsenate', 'bills')
jl = lambda f: [json.loads(l) for l in open(f) if l.strip()] if os.path.exists(f) else []
E = {e['chapter']: e for e in json.load(open(os.path.join(S, 'enacted.json')))}
B = {r['ch']: r for r in jl(os.path.join(S, 'stageB.jsonl'))}
A = {r['ch']: r for r in jl(os.path.join(S, 'stageA.jsonl'))}
C = {r['ch']: r for r in jl(P('stageC-2122.jsonl'))}
CL = json.load(open(P('classes-2122.json'))); LB = json.load(open(P('labels-2122.json')))
lab_by_ch = {v['chapter']: k for k, v in LB.items()}
out, missing = [], {'screening': [], 'class': [], 'label': [], 'roll': []}
for ch, e in E.items():
    b = B.get(ch)
    if not b: missing['screening'].append(ch); continue
    if not b.get('b'): continue
    rec = {'bill': e['bill'], 'session': e['session'], 'chapter': ch, 'title': e['title'], 'url': e['url'], 'analysisUrl': b.get('au'),
           'benefits': {'category': b.get('cat'), 'named': b.get('named') or [], 'quote': b.get('q')}, 'screen': b.get('ps'), 'note': b.get('note'),
           'screenedBy': 'flsenate', 'votes': {}}
    if ch not in CL: missing['class'].append(ch)
    if ch not in lab_by_ch: missing['label'].append(ch)
    r = C.get(ch)
    if r: rec['votes']['house'] = {'date': r['d'], 'motion': r.get('a') or 'final passage', 'tally': r['t'], 'url': r['u'], 'roll': r['r']}
    else: missing['roll'].append(ch)
    out.append(rec)
J = {'generated': 'scripts/data/tenure/flhouse/bills/build-bills-2122.py', 'extends': 'scripts/data/state/bills/universe.json',
     'rule': 'Laws enacted in the 2021, 2021A, 2021B, 2022 and 2022C sessions whose final staff analysis names a kind of business it helps, as screened by the Senate slice; House floor votes of Nixon and Chambliss.',
     'counts': {'enacted': len(E), 'screened': sum(1 for c in E if c in B), 'qualifying': len(out), 'withHouseVote': sum(1 for x in out if x['votes'])},
     'missing': missing, 'bills': out}
json.dump(J, open(os.path.join(H, '..', 'bills-2122.json'), 'w'), indent=1, ensure_ascii=False)
print(J['counts'], {k: (v if len(v) < 12 else str(len(v)) + ' chapters') for k, v in missing.items()})
