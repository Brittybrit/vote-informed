import json,re,sys
sys.path.insert(0,'.')
K=json.load(open('keep.json'));R=json.load(open('items.json'))
def tc(p):
  if p!=p.upper() and not re.search(r'[A-Z]{4,}',p): return p
  t=p.title()
  for a,b in [(r'\bLlc\b','LLC'),(r'\bLlp\b','LLP'),(r'\bD/B/A\b','d/b/a'),(r'\bOf\b','of'),(r'\bAnd\b','and'),(r'\bUsa\b','USA'),(r'\bShi\b','SHI'),(r'\bKci\b','KCI'),(r'\bSsn\b','SSN'),(r'\bEac\b','EAC'),(r'\bBea\b','BEA'),(r'\bPsi\b','PSI'),(r'\bCnh\b','CNH'),(r'\bRmpk\b','RMPK'),(r'\bIq\b','IQ'),(r'\bBld\b','BLD'),(r'\bSfse\b','SFSE'),(r'\bAmdi\b','AMDI'),(r'\bStrk\b','STRK'),(r'\bGpt\b','GPT'),(r'\bNw\b','NW'),(r'\bP\.A\b','P.A.'),(r"’S\b","’s"),(r"'S\b","'s"),(r'\bExp\b','EXP'),(r'\b(\d+)(St|Nd|Rd|Th)\b',lambda m:m.group(1)+m.group(2).lower())]: t=re.sub(a,b,t)
  return t
def clean(p):
  for _ in range(2):
    p=re.sub(r'(?i)^(accepting the proposal of|accept the proposal of|fee proposal of|repealing resolution no\. [\d-]+ and accepting the proposal of|rescinding resolution [\d-]+ and accepting the proposal of|re application request of|request of|case of|developer|pay|reflect the correct name|law firm|formerly|amending)\s+','',p)
  p=p.replace('H& R','H&R').replace('R H&','H&R').replace('II& R','H&R')
  return tc(p.strip(' ,.'))
SUBK=[('paving',r'PAVING|RESURFAC|MILLING|DRAINAGE (SYSTEM )?IMPROVEMENT|FRENCH DRAIN|SIDEWALK|ROADWAY'),('fence',r'FENCING'),('canal',r'CANAL'),('pumps',r'PUMP|LIFT STATION|SMARTCOVER|TELEMETRY'),('cityhall',r'HISTORIC CITY HALL'),('policehq',r'POLICE (STATION|DEPARTMENT DEMOLITION|DEPARTMENT TO THE FIRST|DEPARTMENT SECURITY|STATION COMMAND)|FORMER CITY POLICE STATION'),('chambers',r'COMMISSION CHAMBERS'),('demo',r'DEMOLITION OF THE STRUCTURE'),('tanks',r'UNDERGROUND STORAGE TANK'),('erp',r'ENTERPRISE RESOURCE|TYLER'),('gunshot',r'GUNSHOT'),('grants',r'GRANT (WRITING|MANAGEMENT|PREPARATION)|RMPK'),('pr',r'PUBLIC RELATIONS'),('banking',r'BANKING SERVICES'),('bond',r'BOND COUNSEL'),('towing',r'TOWING'),('property',r'FORECLOSED PROPERTY'),('paint',r'PAINTING'),('signage',r'GATEWAY|SIGNAGE'),('benches',r'BUS BENCHES'),('records',r'RECORD MANAGEMENT'),('hr',r'HUMAN RESOURCES'),('swim',r'SWIM'),('office2',r'INTERIOR SYSTEMS'),('cyber',r'HARDWARE AND SOFTWARE|CYBER'),('tuition',r'TUITION'),('urbanforest',r'URBAN FOREST'),('playground',r'PLAYGROUND'),('art2',r'ARTISTIC'),('vactor',r'VACTOR|VACUUM TRUCK'),('audit2',r'AUDIT'),('legal2',r'NORRIS-WEEKS'),('rideshare',r'RIDESHARE'),('lawn2',r'CITYWIDE ALLEYS'),('roof2',r'ROOF'),('hvac2',r'HVAC'),('water2',r'HYDRANT'),('sewer2',r'SEWER|WATER MAIN|WATER DISTRIBUTION|CULVERT|STORMWATER|MS4|LEAD AND COPPER|TAPPING'),('health',r'MEDICAL, DENTAL'),('insurance',r'INSURANCE'),('eng',r'ENGINEERING|ARCHITECT'),('study',r'MASTER PLAN|STUDY|ASSESSMENT|PLAN FOR|RATE STUDY|EVALUATION AND APPRAISAL|SAFE STREETS|RESILIENCY'),('printing',r'COPIER'),('cameras',r'BODY-WORN'),('vehicles',r'VANS|BACKHOE|TRUCKS|BUSES'),('software',r'SUBSCRIPTION|HOSTING'),('constr',r'CONSTRUCTION|BUILDING/INFRASTRUCTURE')]
def amt(t):
  t=re.sub(r'\$\s+','$',t)
  a=[float(x.replace(',','')) for x in re.findall(r'\(\$([\d,]{4,}(?:\.\d\d)?)\)',t)]
  return max(a) if a else None
def addr(c):
  m=re.search(r'(?:LOCATED AT|PROPERTY AT|LOCATED ON|AT APPROXIMATELY|FACILITY AT|COMPANY AT| AT) (\d{2,5}(?:\s*-\s*\d+)?(?: AND \d{3,5} [A-Z0-9 ]+?)? (?:NW |N\.W\. )?[A-Z0-9 .\-]{1,30}?(?:STREET|ST|AVENUE|AVE|COURT|CT|ROAD|RD|DRIVE|DR|BOULEVARD|BLVD|TERRACE|PLACE|LANE|WAY))\b',c)
  if m: return tc(re.sub(r'\s+',' ',m.group(1)))
  m=re.search(r'CORNER OF ([A-Z0-9 ]+? AND [A-Z0-9 \-]+?)(?: AND| IDENTIFIED|,|;)',c)
  return ('the corner of '+tc(m.group(1))) if m else ''
out=[]
for o in K:
  c=re.split(r'SPONSORED BY',o['c'])[0]; r=R[o['i']]
  ps=[clean(p) for p in o['parties']]
  ps=[p for p in ps if not re.search(r'(?i)^(concrete batching|construction equipment rental|elevation of|reduce the|consulting inc$|national bank$|h& inc|r paving inc)',p)]
  ps=list(dict.fromkeys(ps))
  fail=False
  k=o['kind']
  if re.search(r'SETTLE',c[:200]): tp='settle'
  elif re.search(r'CONVEYANCE OF THE (POTABLE|WATER)',c): tp='convey'; k='agreement'
  elif re.search(r'CLOSE, VACATE AND ABANDON',c): tp='vacate'; k='sale'
  elif re.search(r'EXCHANGE OF THE PROPERTY',c): tp='swap'; k='sale'
  elif re.search(r'SALE OF (DECLARED|CITY-OWNED)',c): tp='sale'; k='sale'
  elif re.search(r'PURCHASE OF (THE PROPERTY|A TRACT OF LAND)',c): tp='buyland'; k='sale'
  elif re.search(r'ALCOHOL',c): tp='permit'; k='license'
  elif re.search(r'ESTOPPEL',c): tp='estoppel'; k='agreement'
  elif re.search(r'PAYMENT PLAN',c): tp='payplan'; k='agreement'
  elif re.search(r'SPECIAL EXCEPTION(?! SITE PLAN)',c): tp='specex'; k='zoning'
  elif re.search(r'CONDITIONAL USE',c): tp='cup'; k='zoning'
  elif re.search(r'\bPLAT\b',c): tp='plat'; k='zoning'
  elif re.search(r'FUTURE LAND USE|COMPREHENSIVE PLAN AMENDMENT',c): tp='landuse'; k='zoning'
  elif re.search(r'REZONE',c): tp='rezone'; k='zoning'
  elif re.search(r'VARIANCE',c[:120]): tp='variance'; k='zoning'
  elif re.search(r'SITE PLAN',c[:120]): tp='siteplan'; k='zoning'
  elif re.search(r'DEVELOPMENT AGREEMENT',c[:200]): tp='devagree'; k='zoning'
  elif re.search(r'\bLEASE AGREEMENT\b',c) and not re.search(r'CAPITAL LEASE',c): tp='lease'; k='lease'
  elif re.search(r'CHANGE ORDER',c): tp='change'; k='contract'
  elif re.search(r'RATIFYING.{0,40}(EMERGENCY|EXPENDITURE)|EMERGENCY (AGREEMENT|PURCHASE|FEE PROPOSAL)',c): tp='emerg'; k='contract'
  elif re.search(r'SOLE SOURCE',c): tp='nobid'; k='contract'
  elif re.search(r'PIGGYBACK',c): tp='piggy'; k='contract'
  elif re.search(r'CAPITAL LEASE|LEASE-TO-OWN',c): tp='buy'; k='contract'
  elif re.search(r'^(AMEND|AMENDING|AUTHORIZING AN AMENDMENT|RATIFYING THE CITY MANAGER.S DECISION TO CHANGE THE SCOPE|AUTHORIZING AN EXTENSION)',c): tp='amend'; k='contract'
  elif re.search(r'RENEWAL',c): tp='renew'; k='contract'
  elif re.search(r'^(DIRECTING THE INTERIM CITY MANAGER TO PAY|PAY |ISSUE AN ADDITIONAL PAYMENT)',c): tp='pay'; k='contract'
  elif re.search(r'DONATION|SUPPORT THE|USE OF CITY RESOURCES|SPONSOR',c): tp='grant'; k='grant'
  elif re.search(r'PROPOSAL',c): tp='award'; k='contract'
  elif re.search(r'AGREEMENT WITH|CONTRACT WITH',c): tp='agree'; k='contract'
  elif re.search(r'MEMORANDUM OF UNDERSTANDING',c): tp='agree'; k='agreement'
  else: tp='contract'; k='contract'
  ts=re.sub(r'AUTHORIZING THE (INTERIM )?CITY MANAGER( TO)?|PROVIDING FOR .*','',c)
  sb=next((kk for kk,p in SUBK if re.search(p,ts)),'other')
  out.append(dict(i=o['i'],date=o['date'],tpl=tp,kind=k,sub=sb,parties=ps,addr=addr(c),amount=amt(c),c=c))
json.dump(out,open('auto.json','w'),ensure_ascii=False,indent=0)
import collections;print(len(out),collections.Counter(x['tpl'] for x in out))
with open('auto.txt','w') as f:
  for x in out: f.write('%d|%s|%s|%s|%s|%s|%s| %s\n'%(x['i'],x['date'][2:],x['tpl'],x['sub'],' ; '.join(x['parties']),x['addr'],x['amount'] or '',re.sub(r'^(AUTHORIZING THE (INTERIM )?CITY MANAGER TO |APPROVING (THE |A )?|PROVIDING (FOR )?(THE )?(APPROVAL (OF )?)?(THE )?)','',x['c'])[:90]))
