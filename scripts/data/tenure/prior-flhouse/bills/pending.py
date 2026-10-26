"""Prints the extracts still to judge (stageB.jsonl b null), with bill and title, for a manual reading into judge.json.
Run: python3 build-bills.py >/dev/null; python3 pending.py [max]"""
import json, os, sys, re
H = os.path.dirname(os.path.abspath(__file__))
E = {e['chapter']: e for e in json.load(open(os.path.join(H, 'enacted.json')))}
n = int(sys.argv[1]) if len(sys.argv) > 1 else 30
k = 0
for l in open(os.path.join(H, 'stageB.jsonl')):
    r = json.loads(l)
    if r.get('b') is not None: continue
    e = E[r['ch']]; t = open(os.path.join(H, 'ps', r['ch'] + '.txt')).read().split('\n', 1)[1]
    t = re.sub(r'\s+', ' ', t)[:900]
    print(f"## {r['ch']} {e['bill']} | {e['title'][:80]}\n{t}\n"); k += 1
    if k >= n: break
