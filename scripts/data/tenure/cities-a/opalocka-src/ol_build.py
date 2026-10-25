import json,re,sys,os,collections
sys.path.insert(0,'.'); sys.path.insert(0,'/home/claude/vote-informed/scripts/data/tenure/cities-a/lib')
from titles import title as T
from ol_vote import own
from ol_defer import deferred, pulled
A=json.load(open('auto.json')); R=json.load(open('items.json'))
OV=json.load(open('overrides.json'))
M=json.load(open('meetings.json'))
EV={}
for e in json.load(open('../ol/events_old.json'))+json.load(open('../ol/events_all.json')):
  if e.get('categoryName')=='City Commission': EV.setdefault(e['startDateTime'][:10],[]).append(e)
FILEID=lambda p: re.search(r'(\d+)\.txt',p).group(1)
def murl(fid): return 'https://opalockafl.api.civicclerk.com/v1/Meetings/GetMeetingFileStream(fileId=%s,plainText=false)'%fid
def eurl(d,typ):
  es=EV.get(d,[])
  pick=[e for e in es if typ[:4].lower() in e['eventName'].lower()] or [e for e in es if 'regular' in e['eventName'].lower()] or es
  return ('https://opalockafl.portal.civicclerk.com/event/%s/files'%pick[0]['id']) if pick else None
SEATS=[('Pigatt','2000-01-01','2021-11-16'),('Burke','2000-01-01','2021-08-04'),('Davis','2000-01-01','2022-11-30'),('Dominguez','2022-01-13','2022-11-30'),('Bass','2021-08-19','2099'),('Taylor','2020-11-19','2099'),('Williams','2020-11-19','2024-11-30'),('Ervin','2022-12-01','2099'),('Kelley','2022-12-01','2099'),('Santiago','2024-12-01','2099')]
def seated(d): return [k for k,a,b in SEATS if a<=d<=b]
PRES={}
for m in M:
  t=open('../ol/'+m['file'],errors='ignore').read()
  mm=re.search(r'ROLL CALL:?(.{0,900})',t,re.S)
  s=re.sub(r'\s+',' ',mm.group(1)) if mm else ''
  s=s.split('Also')[0]
  PRES[(m['date'],m['type'])]=s
def norm_roll(roll,d,typ):
  r={k:v for k,v in roll.items() if k in seated(d) or v!='absent'}
  rc=PRES.get((d,typ),'')
  for k in seated(d):
    if k not in r:
      r[k]='unknown' if (not rc or re.search(k,rc)) else 'absent'
  return r
import html as _h
AG={}
def nk(t): 
  t=_h.unescape(re.sub('<[^>]+>','',t)).upper()
  t=re.sub(r'^.*?FLORIDA,?','',t,count=1)
  t=re.sub(r'AUTHORIZING THE (INTERIM )?CITY MANAGER (TO )?','',t)
  return re.sub(r'[^A-Z]','',t)[:50]
def agenda_nums(d):
  if d in AG: return AG[d]
  out={}
  for e in EV.get(d,[]):
    p='../ol/mt/%s.json'%e.get('agendaId')
    if not os.path.exists(p): continue
    try: D=json.load(open(p))
    except Exception: continue
    def walk(xs,top=None,dep=0):
      last=top
      for x in xs:
        o=(x.get('agendaObjectItemOutlineNumber') or '').strip(' .')
        if dep==0 and o: last=o
        t=last if dep==0 else top
        yield x,t
        yield from walk(x.get('childItems') or [],t,dep+1)
    for x,top in walk(D.get('items') or []):
      n=x.get('agendaObjectItemName') or ''
      if 'RESOLUTION' in n.upper() or 'ORDINANCE' in n.upper():
        o=(x.get('agendaObjectItemOutlineNumber') or '').strip(' .')
        out.setdefault(nk(n),(top,o))
  AG[d]=out; return out
FIXP={'W. Lochner H. Inc':'H.W. Lochner, Inc.','H. W.Lochner Inc':'H.W. Lochner, Inc.','H.W. Lochner Inc':'H.W. Lochner, Inc.','Legg & Associates Inc':'Miller, Legg & Associates, Inc.','Avmed Inc':'AvMed, Inc.','Bea Architects Inc':'BEA Architects, Inc.','Eac Consulting Inc':'EAC Consulting, Inc.','Ssn Engineering LLC':'SSN Engineering, LLC','Kci Technologies Inc':'KCI Technologies, Inc.','Psi Roofing Inc':'PSI Roofing, Inc.','Iq Business Group Inc':'IQ Business Group, Inc.','Bld Services LLC':'BLD Services LLC','Cnh Industrial America LLC':'CNH Industrial America LLC','Gpt Nw 42Nd Avenue LLC':'GPT NW 42nd Avenue, LLC','Gpt Nw 42Nd Ave Owner LLC':'GPT NW 42nd Ave Owner, LLC','Rmpk Funding Inc':'RMPK Funding, Inc.','Exp U.S. Services Inc':'EXP U.S. Services, Inc.','Shotspotter Inc':'ShotSpotter, Inc.','Soundthinking Inc':'SoundThinking, Inc.','Civicplus LLC':'CivicPlus, LLC','Hadronex Inc d/b/a Smartcover Systems':'Hadronex, Inc. d/b/a SmartCover Systems','Beefree LLC d/b/a Freebee':'BeeFree, LLC d/b/a Freebee','Artpad Inc':'ArtPad Inc.','Burnadette Norris-Weeks P.A':'Burnadette Norris-Weeks, P.A.','Bryant Miller Olive P.A':'Bryant Miller Olive P.A.','300 Engineering Group P.A':'300 Engineering Group, P.A.','Amdi USA Inc':'AMDI USA, Inc.','Sfse LLC d/b/a South Florida School of Excellence':'SFSE LLC d/b/a South Florida School of Excellence','King’s Wrecker Service Inc':"King's Wrecker Service, Inc.",'Prologis Logistics Services Incorporated':'Prologis Logistics Services Incorporated','Atlantic Environmental Systems Inc':'Atlantic Environmental Systems, Inc.','Wastewater 9 Acquisition LLC d/b/a In-Pipe Technology Inc':'Wastewater Acquisition LLC d/b/a In-Pipe Technology, Inc.','SHI International Corp':'SHI International Corp.','Vsquared Investments LLC':'VSquared Investments, LLC','Strk Properties LLC':'STRK Properties, LLC','Soflo Venues Corp':'SoFlo Venues Corp.','Model 1 Commercial Vehicles F/K/A Creative Bus Sales Inc':'Model 1 Commercial Vehicles (f/k/a Creative Bus Sales, Inc.)','Formerly Shotspotter Inc':None,'Shotspotter Inc':'ShotSpotter, Inc.'}
def pretty(p):
  if p in FIXP: return FIXP[p]
  p=re.sub(r' (Inc|Corp|Ltd)$',r', \1.',p); p=re.sub(r' (LLC|LLP|P\.A)$',r', \1',p)
  return p.replace(', P.A',', P.A.').replace('..','.')
def okey(date,c): return date+'|'+re.sub(r'[^A-Z]','',c.upper())[:90]
acts=[];seen={};meets={};DROPS=[]
dropped=collections.Counter()
for x in A:
  r=R[x['i']]; c=x['c']; d=x['date']
  ov=OV.get(okey(d,c),{})
  if ov.get('drop'): dropped['override']+=1; continue
  v,res=own(r['votes'],r['sec'])
  if not v and ov.get('useVote') is not None:
    v=r['votes'][ov['useVote']]; res='passed'
  roll=None; consent=False; mv=sc=None
  if v:
    roll=v['roll']; mv,sc=(v.get('mv') or [None,None])
  elif r['consent']:
    num=r['num']
    an=agenda_nums(d).get(nk(r['title']))
    if an and an[0]=='13' and an[1]: num=an[1]
    elif r.get('orig'): num=r['orig'].split('-')[-1]
    x['_anum']=num
    if num and num in deferred(r['s6']): dropped['deferred']+=1; continue
    if num and num in pulled(r['s6']):
      dropped['pulled-novote']+=1; DROPS.append(('pulled',x['i'],d,c[:110])); continue
    roll=r['consent']; consent=True; res='passed'; mv,sc=(r.get('cmv') or [None,None])
  if 'result' in ov: res=ov['result']
  if 'roll' in ov: roll=ov['roll']
  if roll is None and not ov.get('keepNoVote'): dropped['novote']+=1; DROPS.append(('novote',x['i'],d,c[:110])); continue
  ps=ov.get('parties',[q for q in (pretty(p) for p in x['parties']) if q]); place=ov.get('place',x['addr']); tpl=ov.get('tpl',x['tpl']); sub=ov.get('sub',x['sub']); kind=ov.get('kind',x['kind']); amt=ov.get('amount',x['amount'])
  if res=='failed':
    tpl={'variance':'variano','specex':'specexno','permit':'permitno','swap':'swapno','buyland':'buylandno','rezone':'rezoneno','landuse':'landuseno','siteplan':'siteplanno','cup':'cupno'}.get(tpl,tpl)
  if not ps:
    if kind in ('zoning','sale','lease','easement') or tpl in ('vacate','plat','specex','specexno','cup','cupno'):
      ps=['Owner of %s (not named in minutes)'%place] if place else []
  if not ps: dropped['noparty']+=1; DROPS.append(('noparty',x['i'],d,c[:110])); continue
  try: en,es,ht=T(tpl,ps[:3] if len(ps)<=3 else ps[:2]+['others'],amt,sub,place)
  except Exception as e: print('tpl err',x['i'],tpl,e); continue
  if 'title' in ov: en,es,ht=ov['title']
  sec=r['sec']; ref=('%s-%s'%(sec,x.get('_anum') or r['num'])) if (x.get('_anum') or r['num']) else str(sec)
  if sec in (15,16) and r.get('sub'): ref='%s-%s-%s'%(sec,r['sub'],r['num'])
  if r.get('orig') and sec==12: ref=r['orig']
  ref=ov.get('ref',ref)
  bid='%s-%s'%(d,ref)
  n=2
  while bid in seen: bid='%s-%s-%d'%(d,ref,n); n+=1
  seen[bid]=1
  fid=FILEID(r['file']); mu=murl(fid); eu=eurl(d,r['type'])
  roll=norm_roll(roll,d,r['type'])
  vs=list(roll.values()); tally=[vs.count('yes'),vs.count('no')]
  notes=[]
  if consent: notes.append('Consent agenda; roll is the consent vote.')
  if ps[0].startswith('Owner of'): notes.append('Applicant not named in the minutes.')
  if ov.get('note'): notes.append(ov['note'])
  rk={'passed':'passed','failed':'failed','tabled':'tabled','first reading':'first reading','second reading':'second reading'}[res]
  a={'id':bid,'date':d,'ref':'Item %s, %s %s meeting'%(ref,d,r['type'].lower()),'title':en,'kind':kind,'parties':ps,'amount':amt,'url':mu,'minutes':mu,'consent':consent,'result':rk,'roll':roll,'tally':tally,'mover':mv,'second':sc,'notes':' '.join(notes),'tenure':True,'_es':es,'_ht':ht}
  if eu: a['agenda']=eu
  acts.append(a)
  meets[(d,r['type'])]={'date':d,'name':r['type'].title()+' Commission Meeting' if r['type'] in ('REGULAR','SPECIAL') else r['type'].title(),'url':eu or mu,'read':True,'minutes':mu}
for m in M:
  if (m['date'],m['type']) not in meets:
    mu=murl(FILEID(m['file'])); meets[(m['date'],m['type'])]={'date':m['date'],'name':m['type'].title(),'url':eurl(m['date'],m['type']) or mu,'read':True,'minutes':mu}
print(len(acts),dropped,collections.Counter(a['date'][:4] for a in acts),collections.Counter(a['result'] for a in acts))
print(sum(1 for a in acts if 'unknown' in a['roll'].values()),'with unknown')
json.dump({'actions':acts,'meetings':sorted(meets.values(),key=lambda m:m['date'])},open('built.json','w'),ensure_ascii=False,indent=1)

for x in DROPS: print(*x)
