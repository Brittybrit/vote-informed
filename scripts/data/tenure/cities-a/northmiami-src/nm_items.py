import json,glob,re
NAMES=[('Estimé-Irvin','Estimé-Irvin'),('Estime-Irvin','Estimé-Irvin'),('Estime Irvin','Estimé-Irvin'),('Estimé Irvin','Estimé-Irvin'),('Estime','Estimé-Irvin'),('Estimé','Estimé-Irvin'),('Irvin','Estimé-Irvin'),('Bien-Aime','Bien-Aime'),('Bien Aime','Bien-Aime'),('Bien-Aimé','Bien-Aime'),('Galvin','Galvin'),('Gavin','Galvin'),('Keys','Keys'),('Desulme','Desulme'),('Timothe','Timothe'),('Timothé','Timothe'),('Charles','Charles'),('Burns','Burns'),('Joseph','Joseph'),('Smith','Joseph')]
def who(s):
  s=s.strip()
  for k,v in NAMES:
    if re.search(r'\b'+re.escape(k),s,re.I): return v
  return None
def roster(pre):
  if re.search(r'there is a quorum',pre,re.I): pre=pre[re.search(r'there is a quorum',pre,re.I).end():].replace('Present at','PRESENT_LATE',1) and 'ROLL CALL\n'+pre[re.search(r'there is a quorum',pre,re.I).end():]
  i=pre.upper().find('ROLL CALL'); seg=pre[i:i+1200] if i>=0 else pre[:1500]
  seg=re.split(r'PLEDGE|INVOCATION',seg)[0]
  global LATE
  LATE=[]
  pres=[];absn=[]; mode='p'; last=None
  for l in seg.split('\n'):
    l=l.strip()
    if not l: continue
    if re.match(r'.*ABSENT\s*:',l,re.I): mode='a'
    if re.match(r'.*PRESENT\s*:',l,re.I): mode='p'
    m=re.search(r'(Mayor|Council\w*|Vice[- ]Mayor)\s+(.+)',l)
    w=who(m.group(2)) if m else None
    if w:
      (absn if mode=='a' else pres).append(w); last=w
      if re.search(r'absent|not present|excused',l,re.I) and not re.search(r'present at',l,re.I) and mode=='p': pres.remove(w); absn.append(w)
      if re.search(r'present at|arrived',l,re.I): LATE.append(w)
      continue
    if last and re.search(r'not present|absent|excused',l,re.I) and not re.search(r'ABSENT\s*:',l):
      if last in pres: pres.remove(last); absn.append(last)
  for m in re.finditer(r'(?:Mayor|Council\w*|Vice Mayor)\s+([\w\-é]+(?: [\w\-é]+)?)\s+(?:arrived|was present at|joined)',pre): 
    w=who(m.group(1))
    if w: LATE.append(w)
  return list(dict.fromkeys(pres)),list(dict.fromkeys(absn))
rows=[]
for f in sorted(glob.glob('nm/m_*.json')):
  m=json.load(open(f))
  pres,absn=roster(m['pre'])
  for it in m['items']:
    flat=re.sub(r'\s+',' ',it)
    flat=re.split(r"\b(?:CITIZENS[’']? ?FORUM|COUNCIL REPORTS|ADJOURNMENT|REQUESTS ?[-–] ?PETITIONS)",flat)[0]
    hd=re.match(r'\s*\[?\s*TAB\s+([A-Z]{1,2})',flat)
    tab=hd.group(1) if hd else '?'
    rn=re.search(r'Resolution\s*no\.?\s*(?:(\d{4})\s*[–—\-]+\s*R\s*[–—\-]+\s*)?(\d+)',flat[:400],re.I)
    num=None
    if rn: num='%s-R-%s'%(rn.group(1) or m['date'][:4],rn.group(2))
    on=re.search(r'Ordinance\s*no\.?\s*(\d{3,4})',flat[:300],re.I)
    if not num and on: num='Ord-'+on.group(1)
    rows.append({'date':m['date'],'ev':m['ev'],'file':m['file'],'kind':m['kind'],'tab':tab,'num':num,'text':flat[:4000],'present':pres,'absent':absn,'late':list(LATE)})
json.dump(rows,open('nm/items.json','w'),ensure_ascii=False)
print(len(rows))
import collections
c=collections.Counter((r['date'],tuple(sorted(r['present'])),tuple(r['absent'])) for r in rows)
bad=[k for k in c if len(k[1])+len(k[2])!=5]
for k in sorted(bad): print(k)
