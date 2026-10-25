import json,re,sys,collections
sys.path.insert(0,'/home/claude/vote-informed/scripts/data/tenure/cities-a/northmiami-src')
import nm_party
U=json.load(open('uniq.json'));R=json.load(open('items.json'))
DROP=re.compile(r'ISSU(E|ANCE|ING) (OF )?(A |THE )?REQUEST FOR (PROPOSALS|QUALIFICATIONS|PRICE)|RE-?ADVERTISE|REJECTING ALL BIDS|BUDGET FOR THE FISCAL|FUNDS BUDGETS?|PROPOSED BUDGET|AMENDING ORDINANCE|LAND DEVELOPMENT REGULATIONS|TERMINATING|FMLA|REASONABLE ACCOMMODATION|DISSOLUTION OF A SAFE|LOAN OF|TITLE VI|RESERVED PARKING|^DIRECTING THE (INTERIM )?CITY MANAGER(?!.{0,120}(PAY|AGREEMENT|CONTRACT|ALLOCATE|FUND|SUPPORT|PURCHASE))|CITY ATTORNEY TO SUBMIT|LEGAL INVOICES|SPECIAL EVENTS LIST|AUTHORIZED REPRESENTATIVE FOR THE AMERICAN RESCUE|SCHOLARSHIP|LIEN AMNESTY|COMMUNITY REDEVELOPMENT AGENCY.S PROPOSED|FILE A LAWSUIT|ACCEPTANCE OF A MATCHING GRANT|ACCEPT(ING)? (A |THE )?GRANT|EMPLOYMENT AGREEMENT|WITH JAMES B\. WRIGHT|CITY MANAGER.S (EMPLOYMENT|CONTRACT)|APPROVING THE (CITY|TOWN) MANAGER|SEPARATION AGREEMENT WITH (THE )?(FORMER )?(CITY|INTERIM)|CERTIFICATE OF APPROPRIATENESS|MOORISH ARTS|FREE PAINT|INTERLOCAL|^(ENTER INTO |EXECUTE )?(AN? )?(INTERLOCAL )?AGREEMENT WITH MIAMI-DADE COUNTY|FLORIDA DEPARTMENT OF|STATE OF FLORIDA (DEPARTMENT|DIVISION)|SCHOOL BOARD|TRAFFIC STUDY|AUDIT COMMITTEE|FINANCIAL (EMERGENCY|OVERSIGHT)|STATE AND LOCAL AGREEMENT|INVESTMENT POLICY|FEE SCHEDULE|NAMING|PROCLAMATION',re.I)
PRIV=re.compile(r'SITE PLAN|PLAT\b|VARIANCE|REZON|SPECIAL EXCEPTION|DEVELOPMENT AGREEMENT|LAND USE|CLOSE, VACATE|ABANDON|SETTLEMENT|EXCHANGE OF THE PROPERTY|SALE OF|PURCHASE OF A TRACT|CONDITIONAL USE')
KINDS=[('settlement',r'SETTLE'),('lease',r'\bLEASE\b(?! PURCHASE|-PURCHASE|ING CORP)'),('sale',r'SALE OF|EXCHANGE OF THE PROPERTY|CLOSE, VACATE|ABANDON|CONVEY'),('zoning',r'SITE PLAN|PLAT\b|VARIANCE|REZON|SPECIAL EXCEPTION|DEVELOPMENT AGREEMENT|LAND USE|CONDITIONAL USE'),('grant',r'^(?!.*(AGREEMENT|CONTRACT|PROPOSAL|PIGGYBACK|PURCHASE)).*(SPONSOR|DONAT|ALLOCATE .{0,60}(FOR|TO)|PARTNERING|FUNDING (TO|FOR)|USE OF CITY RESOURCES)'),('license',r'LICENSE AGREEMENT|RIGHT.OF.WAY USE'),('easement',r'EASEMENT'),('contract',r'.')]
out=[];drop=[]
for o in U:
  c=re.sub(r'\s+',' ',o['core']).upper()
  c=re.sub(r'^AUTHORIZING THE (INTERIM )?CITY MANAGER (OR (HIS |HER )?DESIGNEE )?TO ','',c)
  c=re.sub(r'(\w)- (\w)',r'\1-\2',c)
  if DROP.search(c[:350]) and not PRIV.search(c[:250]): drop.append((o,'drop')); continue
  ps=nm_party.parties(c)
  ps=[p for p in ps if not re.search(r'(?i)^(the )?city|opa-?locka|miami-dade|county|league of cities|state of|department|sourcewell|omnia|gsa|general service|nasp|cooperative',p)]
  if not ps and not PRIV.search(c): drop.append((o,'noparty')); continue
  k=next(k for k,p in KINDS if re.search(p,c))
  o['kind']=k; o['parties']=ps; o['c']=c
  out.append(o)
json.dump(out,open('keep.json','w'),ensure_ascii=False,indent=0)
print(len(out),len(drop),collections.Counter(o['kind'] for o in out))
with open('drop.txt','w') as f:
  for o,w in drop: f.write('%d|%s|%s| %s\n'%(o['i'],o['date'][2:],w,re.sub(r'AUTHORIZING THE (INTERIM )?CITY MANAGER TO ','',o['core'])[:150]))
with open('keep.txt','w') as f:
  for o in out: f.write('%d|%s|%s|%s| %s\n'%(o['i'],o['date'][2:],o['kind'][:4],' ; '.join(o['parties'])[:70],re.sub(r'AUTHORIZING THE (INTERIM )?CITY MANAGER (OR DESIGNEE )?TO ','',o['c'])[:110]))
