"""Stage B helper (resumable), copied from ../flsenate/bills/stageB.py for this slice's sessions. Reads psi.jsonl (Private Sector Impact text of each chapter's final analysis) and:
- auto-writes {b:false} to stageB.jsonl when the section is empty/"None"/indeterminate-only with no positive or benefit wording
  (rule from scripts/data/tenure/STANDARD.md: a law qualifies only when its analysis names a kind of business that benefits);
- prints every other pending chapter for a manual reading; decisions for those are recorded in decisions.json
  ({ch: {b, cat, q, note?}}) and copied to stageB.jsonl here. Output shape = scripts/data/state/bills/stageB.jsonl {ch,au,ps,b,cat,named,q}.
Run: python3 stageB.py            (writes auto + decided, lists pending)"""
import json, os, re
H = os.path.dirname(os.path.abspath(__file__))
jl = lambda f: [json.loads(l) for l in open(f) if l.strip()] if os.path.exists(f) else []
P = jl(os.path.join(H, 'psi.jsonl'))
OUT = os.path.join(H, 'stageB.jsonl')
done = {x['ch'] for x in jl(OUT)}
DEC = json.load(open(os.path.join(H, 'decisions.json'))) if os.path.exists(os.path.join(H, 'decisions.json')) else {}
POS = re.compile(r'positive|benefit|sav(e|ing)|reduc|lower(s|ed)? (the )?cost|increase(d|s)? (revenue|profit|business|sales|demand|opportunit)|exempt|relief|allow(s|ing)? .{0,40}(to|business)|new market|opportunit|incentive|credit|refund|eligible|more (customers|business)', re.I)
pend = []
with open(OUT, 'a') as f:
    for p in P:
        ch = p['ch']
        if ch in done: continue
        ps = p['ps']
        if ch in DEC:
            d = DEC[ch]
            rec = {'ch': ch, 'au': p['au'], 'ps': ps, 'b': d['b'], 'cat': d.get('cat'), 'named': d.get('named', []), 'q': d.get('q')}
            if d.get('note'): rec['note'] = d['note']
        elif ps in (None, 'FETCH_FAILED'):
            pend.append(p); continue
        elif re.fullmatch(r'\W*(none|n/?a|not applicable|indeterminate|unknown|no impact|the bill has no (fiscal )?impact on the private sector)\W*(\d+)?\W*', ps.strip(), re.I) or not POS.search(ps):
            rec = {'ch': ch, 'au': p['au'], 'ps': ps[:600], 'b': False, 'cat': None, 'named': [], 'q': None, 'note': 'auto: no benefit wording in Private Sector Impact'}
        else:
            pend.append(p); continue
        f.write(json.dumps(rec, ensure_ascii=False) + '\n'); done.add(ch)
for p in pend:
    print('##', p['ch'], p['bill'], '|', p['title'][:70], '|', p['au'])
    print('   ', (p['ps'] or 'NONE')[:900])
print('pending', len(pend), 'done', len(done), 'of psi', len(P))
