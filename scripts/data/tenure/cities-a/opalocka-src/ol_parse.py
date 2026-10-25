import json,re,sys,os
B='/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/ol/'
M=json.load(open(B+'bydate.json'))
ALIAS={'Domingues':'Dominguez','Dominquez':'Dominguez','Kelly':'Kelley','Irvin':'Ervin','Ervine':'Ervin'}
MEM={'Bass','Ervin','Kelley','Taylor','Williams','Davis','Dominguez','Pigatt','Santiago','Burke'}
VOTE=re.compile(r'^\s*(?:Commissioner|Commission|Vice\s*Mayor|Mayor|Conunissioner|Commisioner|Comm\.)\s*(?:Dr\.\s*)?([A-Z][A-Za-z]+)\s*(?:Jr\.?,?)?\s{1,}(Yes|No|Not\s+Present|Absent|Abstain(?:ed)?|Recused|Excused|Nay|Aye)\b\s*$',re.M)
VAL={'yes':'yes','aye':'yes','no':'no','nay':'no','not present':'absent','absent':'absent','excused':'absent','abstain':'abstain','abstained':'abstain','recused':'recused'}
TIT=re.compile(r'\b(AN?)\s+(RESOLUTION|ORDINANCE)\s+OF\s+(?:THE\s+|THF,?\s+)?(?:[\d\- ]{0,6}\s*)?(?:MAYOR\s+AND\s+)?CITY\b',re.S)
MV=re.compile(r'moved\s+by\s+(?:Commissioner|Vice\s*Mayor|Mayor)\s+(?:Dr\.\s*)?([A-Z]\w+),?\s+(?:and\s+)?seconded\s+by\s+(?:Commissioner|Vice\s*Mayor|Mayor)\s+(?:Dr\.\s*)?([A-Z]\w+)')
SEC=re.compile(r'^\s{0,9}(\d{1,2})\.\s+(?!AN? (?:RESOLUTION|ORDINANCE))([A-Z][A-Z&’\'/ ,()\-]{4,})',re.M)
def blocks(t):
  out=[]
  for m in VOTE.finditer(t):
    nm=ALIAS.get(m.group(1),m.group(1))
    if nm not in MEM: continue
    v=VAL[re.sub(r'\s+',' ',m.group(2).lower())]
    if out and m.start()-out[-1]['end']<300 and nm not in out[-1]['roll']:
      out[-1]['roll'][nm]=v; out[-1]['end']=m.end()
    else: out.append({'start':m.start(),'end':m.end(),'roll':{nm:v}})
  return [b for b in out if len(b['roll'])>=3]
def pick(files):
  # one file per meeting type; prefer the one with most vote blocks
  by={}
  for p,typ,n in files:
    t=open(B+p,errors='ignore').read()
    h=re.sub(r'\s+',' ',t[:500].upper())
    if typ=='?' or typ.startswith('COMMUNITY') or 'REDEVELOPMENT AGENCY' in h or 'ZONING APPEALS BOARD' in h or 'CRA BOARD' in h: continue
    k=typ
    nb=len(blocks(t))
    if k not in by or nb>by[k][1]: by[k]=(p,nb,t)
  return by
res=[];meet=[]
for d in sorted(M):
  if d<'2021-08-18' or d>'2024-12-31': continue
  for typ,(p,nb,t) in pick(M[d]).items():
    t=t.replace('\f','\n')
    t=re.sub(r'\n[^\n]{0,40}(?:Commission|Budget Hearing|Workshop)[^\n]{0,30}Minutes\s*[–—-][^\n]*\d{4}[^\n]*\n',"\n",t)
    meet.append({'date':d,'type':typ,'file':p,'blocks':nb})
    vb=blocks(t); secs=[(m.start(),int(m.group(1)),m.group(2)) for m in SEC.finditer(t) if int(m.group(1))<=25]
    def sec_at(pos):
      s=[x for x in secs if x[0]<pos]; return (s[-1][1],s[-1][2].strip()) if s else (None,'')
    # consent vote
    # keep a monotonic run of section numbers
    mono=[];last=0
    for x in secs:
      if last<x[1]<=last+3: mono.append(x); last=x[1]
    secs=mono
    cons=None
    cb=[v for v in vb if re.search(r'approv\w* (of )?the\s+Consent\s+Agenda|Consent Agenda\s*\(\s*agenda items',re.sub(r'\s+',' ',t[max(0,v['start']-500):v['start']]),re.I) and not re.search(r'reconsider',t[max(0,v['start']-250):v['start']],re.I)]
    if cb:
      cons=cb[-1]
      mm=list(MV.finditer(re.sub(r'\s+',' ',t[max(0,cons['start']-900):cons['start']])))
      cons['mv']=[mm[-1].group(1),mm[-1].group(2)] if mm else None
    s6=[x for x in secs if 'CONSENT' in x[2]]
    if s6:
      a=s6[0][0]; nxt=[x[0] for x in secs if x[0]>a]; b=nxt[0] if nxt else len(t)
      s6text=re.sub(r'\s+',' ',t[a:b])
    else: s6text=''
    tits=list(TIT.finditer(t))
    for j,m in enumerate(tits):
      end=tits[j+1].start() if j+1<len(tits) else len(t)
      nxs=[x[0] for x in secs if m.start()<x[0]<end]
      if nxs: end=min(end,nxs[0])
      seg=t[m.start():end]
      sp=re.search(r'Sponsored\s+by[^\n]*(?:\n[^\n]{0,80}(?:Cosponsored|Commissioner|Mayor|Manager|Attorney|Clerk)[^\n]*)?',seg[:2500])
      tl=sp.end() if sp else min(len(seg),1500)
      title=re.sub(r'\s+',' ',seg[:tl])
      pre=t[max(0,m.start()-160):m.start()]
      r1=re.search(r'\[\s*(1[3-6])\s*-?\s*(?:[A-C]\s*-\s*)?\n?\s*(\d{1,2})\s*[\]1l|)]?[^\[]*$',pre)
      r2=re.findall(r'(?:^|\n)\s*(\d{1,2})\s*\.\s',pre)
      sec,secname=sec_at(m.start())
      ss=[x for x in secs if x[0]<m.start()]
      sa=ss[-1][0] if ss else 0
      subs=list(re.finditer(r'\n\s{0,16}([A-C])\.\s+[A-Z(]',t[sa:m.start()]))
      sub=subs[-1].group(1) if subs else None
      votes=[v for v in vb if m.start()+tl<=v['start']<end]
      vv=[]
      for v in votes:
        c=re.sub(r'\s+',' ',t[max(m.start()+tl,v['start']-450):v['start']])[-320:]
        mm=list(MV.finditer(re.sub(r'\s+',' ',t[m.start()+tl:v['start']])))
        vv.append({'roll':v['roll'],'ctx':c,'mv':[mm[-1].group(1),mm[-1].group(2)] if mm else None})
      res.append({'date':d,'type':typ,'file':p,'sec':sec,'secname':secname,'num':r2[-1] if r2 else None,'sub':sub,'orig':('%s-%s'%r1.groups()) if r1 else None,'title':title,'votes':vv,'body':re.sub(r'\s+',' ',seg[tl:])[:2500],'consent':cons['roll'] if (cons and sec==13) else None,'cmv':cons.get('mv') if (cons and sec==13) else None,'s6':s6text[:4000] if sec==13 else ''})
json.dump(res,open(B+'../olw/items.json','w'),ensure_ascii=False,indent=0)
json.dump(meet,open(B+'../olw/meetings.json','w'),indent=0)
print(len(res),len(meet))
import collections
print(collections.Counter(r['sec'] for r in res))
print(sum(1 for r in res if r['sec']==13 and not r['consent']),'consent w/o roll')
print(sum(1 for r in res if r['sec']!=13 and not r['votes']),'non-consent w/o votes')
