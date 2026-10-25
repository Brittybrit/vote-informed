"""Adds manual readings to judge.json. Usage: python3 judge.py '<json object of {ch: {b, cat?, q?, note}}>'"""
import json, os, sys
H = os.path.dirname(os.path.abspath(__file__)); f = os.path.join(H, 'judge.json')
J = json.load(open(f)); new = json.loads(sys.argv[1])
for k, v in new.items():
    if 'b' not in v: raise SystemExit('missing b for ' + k)
    J[k] = v
json.dump(J, open(f, 'w'), indent=1, ensure_ascii=False); print(len(J) - 1, 'readings')
