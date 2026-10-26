import json,glob,re,sys,os
sys.path.insert(0,os.path.dirname(__file__))
from classes import C,SKIP
R='/home/claude/vote-informed/scripts/data/'
T=R+'tenure/'
TAGS={}
for f in [T+'doe-browser/industry.json',T+'prior-flsenate/donors/industry-pre2025.json',T+'flsenate/donors/industry-pre2025.json',T+'flhouse/donors/industry-pre2025.json',R+'industry/state-donors.json']:
  if os.path.exists(f): TAGS.update(json.load(open(f))['donors'])
rows={}
for f in glob.glob(T+'doe-browser/*.tsv')+glob.glob(T+'prior-flhouse/donors/*.tsv'):
  for l in open(f,encoding='utf-8',errors='replace'):
    c=l.rstrip('\n').split('\t')
    if len(c)<8 or c[0].startswith('Candidate/'): continue
    n=re.sub(r'\s+',' ',c[4]).strip(); rows[(n,c[7].strip())]=rows.get((n,c[7].strip()),0)+1
def tagof(n): return (TAGS.get(n.upper()) or {}).get('tags',[])
def fits(K,n,o):
  tags=set(K.get('tags',[])); r=K.get('re'); nr=K.get('not'); s=n+' | '+o
  if tags and not any(t in tags for t in tagof(n)): return False
  if r and not re.search(r,s,re.I): return False
  if nr and re.search(nr,s,re.I): return False
  return bool(tags or r)
only=sys.argv[1:] 
for ch,(K,L) in C.items():
  if only and ch not in only: continue
  m=[k for k in rows if fits(K,*k)]
  print(f"{ch} [{L[0]}] {len(m)}: "+' ; '.join(f"{n} ({o[:30]})" for n,o in m[:10]))
print(len(C),len(SKIP),len(rows))
