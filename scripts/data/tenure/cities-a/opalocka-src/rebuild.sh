python3 -I ol_parse.py && python3 -I ol_cand.py >/dev/null && python3 -I - <<'P'
import json,re,sys
sys.path.insert(0,'.')
from ol_vote import own
C=json.load(open('cand.json'));R=json.load(open('items.json'))
def key(c): return (c['date'],re.sub(r'[^A-Z]','',c['core'].upper())[:90])
g={}
for c in C: g.setdefault(key(c),[]).append(c)
U=[]
for k,cs in g.items():
  def score(c):
    r=R[c['i']]; v,_=own(r['votes'],r['sec'])
    return (0 if v else 1 if r['consent'] else 2, c['sec']==7)
  cs.sort(key=score)
  b=dict(cs[0]); b['dups']=[c['i'] for c in cs[1:]]; U.append(b)
U.sort(key=lambda c:(c['date'],c['i']))
json.dump(U,open('uniq.json','w'),ensure_ascii=False,indent=0)
P
python3 -I ol_keep.py
