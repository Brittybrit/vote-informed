"""Merge tenure-era actions (before 2025) into a city's actions.json, translations.json and titles-en.json.
Source of truth: scripts/data/city/<slug>/tenure/actions.json ({"window_from", "actions", "meetings", "gaps", "translations"}).
Idempotent: actions/meetings whose id/date come from the tenure file are replaced; everything else is kept.
Usage: python3 scripts/data/tenure/cities-a/merge_tenure.py <slug>"""
import json, os, sys
slug = sys.argv[1]
base = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'city', slug)
T = json.load(open(os.path.join(base, 'tenure', 'actions.json')))
A = json.load(open(os.path.join(base, 'actions.json')))
tids = {a['id'] for a in T['actions']}
A['actions'] = [a for a in A['actions'] if a['id'] not in tids and not a.get('tenure')] + T['actions']
A['actions'].sort(key=lambda a: (a['date'], str(a['id'])))
tdates = {m['date'] for m in T['meetings']}
A['meetings'] = [m for m in A.get('meetings', []) if not m.get('tenure')] + [dict(m, tenure=True) for m in T['meetings']]
A['meetings'].sort(key=lambda m: m['date'])
w = A.get('window')
if isinstance(w, list): A['window'] = [T['window_from'], w[1]]
elif isinstance(w, dict): A['window'] = dict(w, **{'from': T['window_from']})
gaps = [g for g in A.get('gaps', []) if not (isinstance(g, dict) and g.get('tenure')) and not (isinstance(g, str) and g.startswith('[tenure] '))]
for g in T.get('gaps', []):
    gaps.append(dict(g, tenure=True) if isinstance(g, dict) else '[tenure] ' + g)
A['gaps'] = gaps
json.dump(A, open(os.path.join(base, 'actions.json'), 'w'), ensure_ascii=False, indent=1)
open(os.path.join(base, 'actions.json'), 'a').write('\n')
tr_p = os.path.join(base, 'translations.json'); te_p = os.path.join(base, 'titles-en.json')
TR = json.load(open(tr_p)) if os.path.exists(tr_p) else {}
TE = json.load(open(te_p)) if os.path.exists(te_p) else {}
for k, v in T.get('translations', {}).items():
    TR[k] = {'es': v['es'], 'ht': v['ht']}; TE[k] = v['en']
json.dump(TR, open(tr_p, 'w'), ensure_ascii=False, indent=1); json.dump(TE, open(te_p, 'w'), ensure_ascii=False, indent=1)
print(slug, 'actions', len(A['actions']), 'tenure', len(T['actions']), 'meetings', len(A['meetings']))
