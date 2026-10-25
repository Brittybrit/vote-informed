import json,re,collections
exec(open('nm_items.py').read().split('rows=[]')[0])  # who(), roster()
R=json.load(open('nm/items.json'))
W=r'(?:Mayor|Vice[- ]Mayor|Council(?:wo)?man|Councilmember|Councilperson)\s+([A-Z][\w\-éÉ]+(?:[\- ][A-Z][\w\-éÉ]+)?)'
def tallies(t):
  out=[]
  for m in re.finditer(r'(?:Council\s+voted|voted|Motion\s+(?:carried|passed|failed)|VOTE\s+PASSED|MOTION\s+PASSED|MOTION\s+FAILED)[^.]{0,40}?(passed|failed|carried)?[;:,]?\s*(?:by roll call[;:,]?\s*)?(?:(passed|failed)\s*)?(\d)\s*[–—\-]+\s*(\d)',t,re.I):
    out.append((m.start(),int(m.group(3)),int(m.group(4)),(m.group(1) or m.group(2) or ('failed' if 'FAIL' in m.group(0).upper() else '')).lower()))
  for m in re.finditer(r'(?:passed|carried)[^.]{0,30}unanim|unanimous(?:ly)?\s+consent|voted\s*;?\s*passed\s+unanimously',t,re.I):
    out.append((m.start(),'U','U','passed'))
  return sorted(out)
def named(t):
  v={}
  for m in re.finditer(W+r'\s*(?:[–—\-:]\s*)?(?:voted|Voted|VOTED)?\s*[:\-]?\s*(Yes|YES|No|NO|Nay|Absent|ABSENT|Abstain\w*|Recus\w*)\b',t):
    w=who(m.group(1)); 
    if w: v[w]=m.group(2).lower()
  for m in re.finditer(W+r'\s+(?:was\s+)?(absent|not present|recused|abstained|left the dais|out of the room)',t,re.I):
    w=who(m.group(1))
    if w and w not in v: v[w]=m.group(2).lower()
  return v
def norm(v):
  return {'yes':'yes','no':'no','nay':'no'}.get(v,'absent' if v.startswith('absent') or 'not present' in v or 'left' in v or 'out of' in v else 'recused' if v.startswith('recus') else 'abstain' if v.startswith('abstain') else v)
# consent votes per meeting, from the whole meeting text
import glob as _g
cons={}
for f in _g.glob('nm/m_*.json'):
  m=json.load(open(f)); full=re.sub(r'\s+',' ',m['pre']+' '+' '.join(m['items']))
  for x in re.finditer(r'(?:approve|adopt)\w*\s+(?:the\s+)?(?:items on the\s+)?consent agenda[^.]*\.(?:[^.]*?(?:seconded|Seconded)[^.]*\.)?[^.]*?(?:voted|carried|passed|Passed|PASSED)[^.]*',full,re.I):
    if tallies(x.group(0)): cons.setdefault(m['date'],('cons',x.group(0)))
    break

for r in R:
  t=r['text']
  m=re.search(r'(?:approve|adopt)[^.]{0,60}consent agenda[^.]*\.[^.]*?(?:Seconded|seconded)[^.]*\.([^.]*(?:voted|carried|Passed|passed)[^.]*\.?)',t,re.I) or re.search(r'consent agenda[^.]{0,200}?(?:Council voted|carried)[^.]*',t,re.I)
  if m and r['date'] not in cons: cons[r['date']]=(r['tab'],m.group(0))
  pass
out=[]
for r in R:
  t=r['text']; pres=list(r['present']); absn=list(r['absent'])
  # strip trailing next-section text after the vote? keep
  T=tallies(t); nv=named(t)
  own=bool(T) or bool(re.search(r'motion',t,re.I))
  rec={'i':R.index(r)}
  # late arrivals in pre-meeting text handled by roster (present list); ignore
  if T:
    pos,y,n,res=T[-1]
    rec['src']='own'
  else:
    c=cons.get(r['date'])
    y=n=None;res=''
    idx=R.index(r)
    if re.match(r'\s*\[?\s*TAB\s+[A-Z]{1,2}\s*\]?\s*[–—\-:]*\s*PASSED',t) or (not c):
      for q in R[idx+1:idx+25]:
        if q['date']!=r['date'] or q['ev']!=r['ev']: break
        tq=tallies(q['text'])
        if tq and re.search(r'consent|PUBLIC HEARINGS|^\s*\[?\s*TAB\s+[A-Z]{1,2}\s*\]?\s*[–—\-:]*\s*PASSED',q['text'],re.I):
          c=(q['tab'],q['text']); break
        if tq: break
    if c:
      tc=tallies(c[1]); 
      if tc: _,y,n,res=tc[-1]
      rec['src']='consent:'+c[0]
    else: rec['src']='none'
  roll={}
  for mbr in pres+absn: roll[mbr]='absent' if mbr in absn else None
  for k,v in nv.items(): roll[k]=norm(v)
  present=[k for k,v in roll.items() if v not in ('absent','recused','abstain')]
  if y=='U':
    for k in present:
      if roll[k] is None: roll[k]='unknown' if k in r.get('late',[]) else 'yes'
  elif y is not None:
    nos=[k for k in present if roll[k]=='no']; yes_named=[k for k in present if roll[k]=='yes']
    und=[k for k in present if roll[k] is None]
    if y+n==len(present) and len(nos)==n: 
      for k in und: roll[k]='yes'
    elif y+n==len(present) and n>0 and len(nos)<n and len(und)==n-len(nos) and len(yes_named)==y:
      for k in und: roll[k]='no'
    elif y+n<len(present) and len(nos)==n and y+n==len(present)-len([k for k in und if False]):
      pass
    if any(v is None for v in roll.values()):
      if not (y+n==len(present) and len(nos)==n):
        for k in roll:
          if roll[k] is None: roll[k]='unknown'
  else:
    for k in roll:
      if roll[k] is None: roll[k]='unknown'
  for k in roll:
    if roll[k] is None: roll[k]='unknown'
  rec.update({'tally':[y,n] if isinstance(y,int) else ('U' if y=='U' else None),'res':res,'roll':roll})
  out.append(rec)
json.dump(out,open('nm/votes.json','w'),ensure_ascii=False)
c=collections.Counter(v for o in out for v in o['roll'].values()); print(c)
print(collections.Counter(o['src'][:7] for o in out))
