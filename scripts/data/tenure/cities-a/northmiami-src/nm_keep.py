import json,re
C=json.load(open('nm/cand.json'))
DROP={'CONTINUED','REMOVED','DEFERRED','PULLED','WITHDRAWN','DELETED','MOVE TO THE NEXT AGENDA'}
SUF=r"(?:INC|INCORPORATED|LLC|L\.L\.C|CORP|CORPORATION|COMPANY|CO|P\.A|PA|LLP|PLLC|LTD|LLLP|L\.P|LP|P\.C|N\.A)"
ORGW=r"(?:BOARD OF TRUSTEES OF THE MUSEUM OF CONTEMPORARY ART|DEPARTMENT DESIGN OFFICE|BLUE COURAGE|ENTERPRISES|PARTNERS|GROUP|SERVICES|SYSTEMS|SOLUTIONS|TECHNOLOGIES|CONSTRUCTION|CONTRACTORS|ENGINEERING|CONSULTANTS|CONSULTING|ARCHITECTS|DEVELOPERS|HOLDINGS|REALTY|INVESTMENTS|UNIVERSITY|ASSOCIATION|FOUNDATION|CHURCH|MINISTRIES|ACADEMY|BANK|INSTITUTE|ALLIANCE|SOCIETY|CLUB|COALITION|CENTER|MUSEUM|PROJECT)"
CODE=re.compile(r'^\W*(PROPOSED )?(ORDINANCE.{0,60})?(AMENDING (CHAPTER|ARTICLE|SECTION|THE CITY OF NORTH MIAMI CODE|VOLUME|THE CODE)|PROVIDING FOR (A )?TEXT AMENDMENT|ADOPTING AMENDMENTS TO VOLUME|REPEALING|ESTABLISHING (THE|A) (SALARY|COMPENSATION)|ADOPTING (A|THE) (REVISED )?CLASSIFICATION|AUTHORIZING THE ISSUANCE.{0,40}(BOND|INDEBTEDNESS)|RATIFYING THE .DECLARATION|ADOPTING (AND APPROVING )?(THE )?BUDGET|ADOPTING FISCAL YEAR|APPROVING (THE )?FISCAL YEAR|ESTABLISHING THE .{0,40}CONTROLLED|ADOPTING RULES)',re.I)
GOVP=re.compile(r'\b(MIAMI-DADE|MIAMI- DADE|(?<!DADE )COUNTY(?! POLICE)|STATE OF|FLORIDA DEPARTMENT|FLORIDA DIVISION|UNITED STATES|SCHOOL BOARD|VILLAGE OF|TOWN OF|CITY OF|COMMUNITY REDEVELOPMENT AGENCY|NMCRA|FDOT|BOARD OF TRUSTEES OF THE INTERNAL|INTERLOCAL|TRANSPORTATION PLANNING|SOUTH FLORIDA WATER|FLORIDA HOUSING FINANCE|FLORIDA INTERNATIONAL UNIVERSITY BOARD|SHERIFF|PINELLAS|BROWARD)\b')
PRIVKW=re.compile(r'SITE PLAN|CONDITIONAL USE|TENTATIVE PLAT|FINAL PLAT|WAIVER OF PLAT|VARIANCE|REZON|ZONING MAP|LAND USE PLAN AMENDMENT|FUTURE LAND USE MAP|DEVELOPMENT AGREEMENT|MASTER (CAMPUS )?DEVELOPMENT PLAN|SPECIAL EXCEPTION|SETTLE|SHORT TERM RENTAL|CDBG\) FUNDS TO NOT|HOME (REPAIR|REHABILITATION)|REHABILITATION AGREEMENT|GRANT AGREEMENT|SPONSORSHIP')
ENT=re.compile(r"([A-Z0-9][A-Z0-9&.,'’!\"“”\-/ ]{1,90}?,? (?:"+SUF+r")\b\.?(?: D/B/A [A-Z0-9&.,'’\- ]{2,60}?(?=[,;]| FOR | TO | IN | AS ))?|(?:THE )?[A-Z][A-Z&.'’\- ]{2,70}? "+ORGW+r"\b(?: OF (?:FLORIDA|MIAMI|SOUTH FLORIDA|NORTH MIAMI|AMERICA|GREATER MIAMI|THE [A-Z]+)\b)?)")
LEAD=re.compile(r"^.*\b(?:BETWEEN|AMONGST|WITH|TO|FROM|OF|AND|SELECTING|SELECT|SELECTION|AUTH|ORDERS?|BY|FOR|CONTRACT|AGREEMENT|AWARDS?|RENEW)\s+(?=\S)")
STOPP=re.compile(r"^(THE )?(CITY|TOWN|VILLAGE)\b|CITY OF|(?<!DADE )COUNTY(?! POLICE)|STATE OF|DEPARTMENT|UNITED STATES|NATIONAL (JOINT POWERS|COOPERATIVE|INSTITUTE)|COOPERATIVE|SOURCEWELL|OMNIA|NASPO|GENERAL SERVICES|SHERIFF|SCHOOL BOARD|FLORIDA LEAGUE|BOARD OF TRUSTEES OF THE INTERNAL|PURCHASING|ASSOCIATION OF COUNTIES|^(AN?|ITS|SAID|THE SELECTED|SELECTED|ALL|EACH|SUCH|SAME) |CONTRACT NO|BID NO|REQUEST FOR|INVITATION|^SERVICES|^AGREEMENT|^ENGINEERING COMPANY$|RECOVERY|HOUSING ASSISTANCE|MIAMI-DADE|FDOT|FLORIDA INTERNATIONAL UNIVERSITY BOARD")
def parties(t):
  extra=[m.group(1).title() for m in re.finditer(r'\bARTISTS? ([A-Z][A-Z\.\- ]{3,40}?)(?=[;,]| TO | FOR )',t)]
  t=re.sub(r'SPECIFICALLY IDENTIFIED (WITH|BY) MIAMI-DADE COUNTY FOLIO.*?(;|$)',' ',t)
  out=[]
  for m in ENT.finditer(t):
    p=m.group(1).strip(' ,.;')
    for _ in range(3):
      q=LEAD.sub('',p)
      if q==p: break
      p=q
    p=re.sub(r'^(THE|AN?|AND|WITH|TO|OF|ISSUE|PURCHASE)\s+','',p).strip(' ,.;')
    if len(p)<4 or STOPP.search(p): continue
    if p.upper()==p: p=p.title().replace("'S","'s").replace('’S','’s').replace(' Llc',' LLC').replace(' Inc',' Inc').replace(' P.A',' P.A').replace(' Pa',' P.A.')
    if p not in out: out.append(p)
  for m in re.finditer(r'(INTERNATIONAL UNION OF POLICE ASSOCIATIONS,? AFL-? ?CIO,? LOCAL \d+|DADE COUNTY POLICE BENEVOLENT ASSOCIATION(?:, INC)?|SOUTH FLORIDA POLICE BENEVOLENT ASSOCIATION|AMERICAN FEDERATION OF STATE[^;,]*?LOCAL \d+|FRATERNAL ORDER OF POLICE[^;,]*)',t):
    extra.append(m.group(1).title().replace('Afl-Cio','AFL-CIO').replace('Afl- Cio','AFL-CIO'))
  for m in re.finditer(r'(?:WITH|SELECTING) ([A-Z][A-Z ]{2,30}?) AS THE (?:INSURANCE )?PROVIDER|(?:WITH|SELECTING) (CIGNA HEALTHCARE|AETNA|UNITED HEALTHCARE)',t):
    extra.append((m.group(1) or m.group(2)).title())
  out=[o for o in out if not re.search(r'Benevolent Association|Union Of Police',o,re.I) or o in extra]
  return list(dict.fromkeys(extra+[o for o in out if o not in extra]))
keep=[];gone=[]
for c in C:
  if c['status'] in DROP: c['why']='status'; gone.append(c); continue
  t=c['title']
  t0=re.sub(r'SPECIFICALLY IDENTIFIED (WITH|BY) MIAMI-DADE COUNTY FOLIO[^;]*','',t)
  if CODE.search(t0[:220]) and not re.search(r'ZONING MAP|LAND USE PLAN AMENDMENT|FUTURE LAND USE MAP',t0[:400]): c['why']='code'; gone.append(c); continue
  ps=parties(t0)
  c['parties']=ps
  if not ps and not PRIVKW.search(t0): c['why']='noparty'; gone.append(c); continue
  keep.append(c)
json.dump(keep,open('nm/keep.json','w'),ensure_ascii=False)
json.dump(gone,open('nm/gone.json','w'),ensure_ascii=False)
print(len(keep),len(gone))
with open('nm/k.txt','w') as f:
  for c in keep: f.write('%d|%s|%s|%s| %s || %s\n'%(c['i'],c['date'][2:],(c['num'] or c['tab']).replace('-R-','R'),c['kind'][:3],' ; '.join(c['parties']),re.sub(r'^.{0,60}?FLORIDA,? ','',c['title'])[:110]))
with open('nm/g.txt','w') as f:
  for c in gone:
    if c['why']=='noparty': f.write('%d|%s|%s| %s\n'%(c['i'],c['date'][2:],(c['num'] or c['tab']),re.sub(r'^.{0,60}?FLORIDA,? ','',c['title'])[:170]))
