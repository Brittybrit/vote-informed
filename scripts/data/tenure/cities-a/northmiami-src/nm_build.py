import json,re,sys
sys.path.insert(0,'.'); sys.path.insert(0,'/home/claude/vote-informed/scripts/data/tenure/cities-a/lib')
from titles import title as T
exec(open('nm_items.py').read().split('rows=[]')[0])  # who()
R=json.load(open('nm/items.json')); V=json.load(open('nm/votes.json')); A=json.load(open('nm/auto.json'))
OV=json.load(open('nm/overrides.json')) if __import__('os').path.exists('nm/overrides.json') else {}
W=r'(?:Mayor|Vice[- ]Mayor|Council(?:wo)?man|Councilmember|Councilperson|Vice Councilman)\s+([A-Z][\w\-éÉ]+(?:[\- ][A-Z][\w\-éÉ]+)?)'
def mover(t):
  m=re.search(r'(?:Motion (?:was )?made by|motion (?:was )?made by|A motion was made by)\s+'+W,t) or re.search(W+r'\s+(?:made a motion|motioned|moved)',t)
  s=re.search(r'[Ss]econded by\s+(?:the\s+)?'+W,t) or re.search(r'[Ss]econded by\s+([A-Z][\w\-é]+(?: [A-Z][\w\-é]+)?)',t)
  return (who(m.group(1)) if m else None),(who(s.group(1)) if s else None)
def loc(t,addr):
  if addr: return addr
  m=re.search(r'(?:LOCATED|GENERALLY LOCATED)\s+(?:AT|IN|ON|APPROXIMATELY AT)?\s*:?\s*(?:THE\s+)?([^;]{5,90}?)(?=,? AND SPECIFICALLY|,? SPECIFICALLY|;|, IDENTIFIED| – FOLIO| - FOLIO|, FOLIO|, IN ACCORDANCE|$)',t)
  if m: return re.sub(r'\s+',' ',m.group(1)).strip(' ,').title().replace('Ne ','NE ').replace('Nw ','NW ').replace('N.E.','NE').replace('N.W.','NW')
  f=re.search(r'FOLIO (?:NUMBER|NO\.?)S?:?\s*([\d\- ]{12,20})',t)
  return ('folio '+f.group(1).strip()) if f else ''
TEXTAMEND=re.compile(r'TEXT AMENDMENT|GOALS, OBJECTIVES AND POLICIES[^;]{0,80}(OBJECTIVE|POLICY)|ANNEXATION AREA|BOUNDARY OF THE (NORTH MIAMI TRANSIT|SPECIAL DEVELOPMENT|CITY)|ORDINANCE CHANGE')
def tcase(p):
  if p!=p.upper(): return p
  import nm_party; return nm_party.tc(p)
def fixp(ps):
  out=[]
  for p in ps:
    p=re.sub(r'^(Landlord and|Previously Approved|Member of The|Join The|Funds To|A Purchase Order To|A Change Order To)\s+','',p,flags=re.I).strip()
    if re.match(r'(?i)d/b/a ',p) and out: out[-1]=out[-1]+' '+p; continue
    if re.fullmatch(r'(?i)(National (Institute|Association)|Florida Limited Liability Corporation|Management LLC|Services LLC|Youth (Corp|Inc)|Engineering Company LLC|Company|North Miami LLC|Florida LLC|Florida Inc)',p): continue
    if re.match(r'(?i)add ',p): continue
    p=tcase(p)
    if any(re.sub(r'\W','',p).lower()==re.sub(r'\W','',q).lower() for q in out): continue
    out.append(p)
  return out
seen=set(); acts=[]; meets={}
for r in A:
  ov=OV.get('%s|%s'%(r['date'],r['tab']),{})
  if ov.get('drop'): continue
  it=R[r['i']]; v=V[r['i']]; t=r['title']
  if r['kind']=='zoning' and TEXTAMEND.search(t) and not r['addr'] and not ov: continue
  key=(r['date'],r['num'] or t[:120])
  if key in seen: continue
  seen.add(key)
  ps=ov.get('parties',fixp(r['parties']))
  place=ov.get('place',loc(t,r['addr']))
  kind=ov.get('kind',r['kind']); tpl=ov.get('tpl',r['tpl']); sub=ov.get('sub',r['sub'])
  if not ps:
    if kind in ('zoning','sale','lease','easement') or tpl in ('str','abandon'):
      ps=['Owner of %s (not named in minutes)'%place] if place else []
    if not ps: continue
  amt=ov.get('amount',r['amount'])
  try: en,es,ht=T(tpl,ps[:3] if len(ps)<=3 else ps[:2]+['others'],amt,sub,place)
  except Exception as e: print('tpl err',r['i'],tpl,e); continue
  if 'title' in ov: en,es,ht=ov['title']
  roll=dict(v['roll']); tally=v['tally'] if isinstance(v['tally'],list) else None
  vt=it['text']; mv,sc=mover(vt)
  if v['src'].startswith('consent'):
    c=next((x for x in R if x['date']==it['date'] and x['tab']==v['src'].split(':')[1]),None)
    if c: mv,sc=mover(c['text'])
  res='passed'
  if r['status']=='TABLED' or re.search(r'motion to table',vt[-600:],re.I): res='tabled'
  if r['status']=='FAILED' or (tally and tally[1]>tally[0]): res='failed'
  if re.search(r'\(FIRST READING\)|FIRST READING',t[:200]) or re.search(r'FIRST READING',vt[:250]): res='first reading'
  if re.search(r'\(SECOND READING\)',vt[:250]) and res=='passed': res='second reading'
  if 'result' in ov: res=ov['result']
  if 'roll' in ov: roll=ov['roll']; tally=None
  if r['date']=='2024-10-22' and r['num']=='2024-R-158': tally=[2,2]  # minutes say 3-1 but name 2 yes/2 no; see card-notes.json
  num=r['num']
  if num and num.startswith('Ord-'): bid='%s-ord%s'%(r['date'],num[4:])
  elif num: y,n=num.split('-R-'); bid='%s-R-%d'%(y,int(n))
  else: bid='%s-tab%s'%(r['date'],r['tab'])
  if any(a['id']==bid for a in acts): bid=bid+'-'+r['date']
  if it['kind']=='ac':
    murl='https://www.northmiamifl.gov/AgendaCenter/ViewFile/Minutes/%s'%it['file']; agenda=None
  else:
    murl='https://play.champds.com/ATT/northmiamifl/%s.pdf'%it['file']; agenda=('https://play.champds.com/northmiamifl/event/%s'%it['ev'])
  ref=('Tab %s, %s council meeting'%(r['tab'],r['date']))+((' (CHAMP event %s)'%it['ev']) if agenda else '')
  if num and not num.startswith('Ord-'): ref='Resolution No. %s; '%bid+ref
  elif num: ref='Ordinance No. %s; '%num[4:]+ref
  notes=[]
  if v['src'].startswith('consent'): notes.append('Consent agenda; roll is the consent vote.')
  if any(x=='unknown' for x in roll.values()): notes.append('Minutes give a tally that does not say how each member voted.' if tally else 'Minutes give no tally for this item.')
  if ps and ps[0].startswith('Owner of'): notes.append('Applicant not named in the minutes.')
  if ov.get('note'): notes.append(ov['note'])
  a={'id':bid,'date':r['date'],'ref':ref,'title':en,'kind':kind,'parties':ps,'amount':amt,'url':murl,'minutes':murl,'consent':v['src'].startswith('consent'),'result':res,'roll':roll,'tally':tally,'mover':mv,'second':sc,'notes':' '.join(notes),'tenure':True,'_i':r['i'],'_es':es,'_ht':ht}
  if agenda: a['agenda']=agenda
  acts.append(a)
  meets[(r['date'],it['ev'])]={'date':r['date'],'url':agenda or murl,'read':True,'minutes':murl}
json.dump({'actions':acts,'meetings':list(meets.values())},open('nm/built.json','w'),ensure_ascii=False,indent=1)
import collections
print(len(acts),collections.Counter(a['date'][:4] for a in acts))
print(collections.Counter(a['result'] for a in acts))
print(sum(1 for a in acts if any(v=='unknown' for v in a['roll'].values())),'with unknown votes')

# ---- write the tenure file
def fixcase(s):
  s=re.sub(r'(\d)(St|Nd|Rd|Th)\b',lambda m:m.group(1)+m.group(2).lower(),s)
  s=re.sub(r'\b(Ne|Nw|Se|Sw)\b',lambda m:m.group(1).upper(),s)
  s=re.sub(r'\bN\.E\.?\s?','NE ',s); s=re.sub(r'\bN\.W\.?\s?','NW ',s)
  return re.sub(r'\s+',' ',s).strip()
import os
out=[];TR={}
for a in acts:
  b={k:v for k,v in a.items() if not k.startswith('_')}
  b['title']=fixcase(b['title']); b['parties']=[fixcase(p) for p in b['parties']]
  TR[b['id']]={'en':b['title'],'es':fixcase(a['_es']),'ht':fixcase(a['_ht'])}
  out.append(b)
dest='/home/claude/vote-informed/scripts/data/city/northmiami/tenure'
os.makedirs(dest,exist_ok=True)
gaps=['North Miami council minutes for 2015-2016 are not online (the city AgendaCenter category "City Council (Prior to July 10, 2018)" lists only 2017 and Jan-Apr 2018), so Desulme\'s first council years (District 4 from 2015) are not covered.',
 'No minutes found for Apr 24 - Jun 12, 2018 meetings (AgendaCenter list stops at Apr 10, 2018; CHAMP minutes start Jun 26, 2018).',
 'Minutes not posted for: 2020-04-07 and 2020-04-14 emergency meetings, 2020-10-27 (the attachment is the agenda), 2024-10-08 regular meeting, and the budget hearings of 2018-09-17, 2019-09-09, 2019-09-17, 2020-09-10, 2020-09-24, 2023-09-19 (budget hearings hold no private-party actions).',
 'Applicants for most site plans, conditional use permits, plats and rezonings are not named in the minutes; those carry "Owner of <address> (not named in minutes)".',
 'Votes come from summary minutes: named no votes and absences; members not named are recorded yes when the tally matches those present. Where the tally does not match, or a member arrived late and a unanimous vote is recorded, the vote is "unknown".',
 'Built automatically from the minutes text and checked by hand; party names follow the minutes (OCR-free text PDFs).']
json.dump({'window_from':'2017-01-01','actions':out,'meetings':list(meets.values()),'gaps':gaps,'translations':TR},open(dest+'/actions.json','w'),ensure_ascii=False,indent=1)
print('wrote',len(out))
