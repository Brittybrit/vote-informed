"""Append stage B readings: python3 -I adddec.py '<json object {ch: {...}}>'"""
import json, sys, os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'decisions.json')
D = json.load(open(p)); D.update(json.loads(sys.argv[1]))
json.dump(D, open(p, 'w'), indent=1, ensure_ascii=False); print(len(D))
