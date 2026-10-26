import json,sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from classes import C,SKIP
D='/home/claude/vote-informed/scripts/data/tenure/'
other=set(json.load(open(D+'prior-flsenate/bills/classes-by-chapter.json')))
law={}
for y in range(2013,2021):
  for b in json.load(open(D+f'prior-flhouse/bills-{y}.json'))['bills']:
    if b.get('benefits'): law[b['chapter']]=b
need=[c for c in law if c not in other]
missing=[c for c in need if c not in C and c not in SKIP]
extra=[c for c in C if c not in law]
print('qualifying',len(law),'need',len(need),'classed',len([c for c in need if c in C]),'skip',len([c for c in need if c in SKIP]),'missing',missing,'extra',extra)
key=lambda ch:(int(ch.split('-')[0]),int(ch.split('-')[1]))
cls={};lab={}
for ch in sorted([c for c in need if c in C],key=key):
  K,L=C[ch]; k={"tags":list(K.get("tags",[]))}
  if K.get("re"): k["re"]=K["re"]
  if K.get("not"): k["not"]=K["not"]
  cls[ch]=k
  b=law[ch]; lk=f"{b['bill']} · {ch.split('-')[0]}"
  assert lk not in lab, lk
  lab[lk]={"en":L[0],"es":L[1],"ht":L[2],"chapter":ch}
os.makedirs(D+'prior-flhouse/bills',exist_ok=True)
json.dump(cls,open(D+'prior-flhouse/bills/classes-by-chapter.json','w'),indent=1,ensure_ascii=False)
json.dump(lab,open(D+'prior-flhouse/bills/labels.json','w'),indent=1,ensure_ascii=False)
print('wrote',len(cls),len(lab))
for c in missing: print('MISSING',c,law[c]['bill'],law[c]['title'],'|',law[c]['benefits']['category'],'||',law[c]['benefits']['quote'][:300])
