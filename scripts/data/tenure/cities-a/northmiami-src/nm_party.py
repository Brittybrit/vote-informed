import re
SUFS={'INC','INCORPORATED','LLC','L.L.C','CORP','CORPORATION','COMPANY','CO','P.A','PA','LLP','PLLC','LTD','LLLP','L.P','LP','P.C','N.A'}
ORGS={'UNIVERSITY','ASSOCIATION','FOUNDATION','CHURCH','MINISTRIES','ACADEMY','BANK','INSTITUTE','COALITION','HEALTHCARE','FORUM','COURAGE','ENTERPRISES','PARTNERS'}
STOP={'TO','WITH','BETWEEN','FROM','AMONGST','ORDER','ORDERS','FOR','BY','ISSUE','W/','OF','THE','A','AN','AND','AGREEMENT','AGREEMENTS','SELECTION','SELECTING','AWARD','AWARDS','AUTHORIZING','EXECUTE','APPROVING','RENEW','AMENDMENT','EXTENSION','CONTRACT','PSA','LEASE','AWARDED','THROUGH','UNDER','PURSUANT','PER','REPLACEMENT','INSTALLATION','EMERGENCY','OWNED','ENTITLED','ARTIST','MATTER','AS','IN','ON','AT','IS','ITS','THAT','THIS','WHICH','UTILIZING','PIGGYBACKING','RATIFYING','EXPENDITURE','FUNDS','CHANGE','PURCHASE','PROVIDER','TERMINATION','UNDERSTANDING','MEMORANDUM','PROVISION','INCLUDE','CERTAIN','REGARDING','RESIDENTIAL','PARCEL','DATED','SECOND','THIRD','FIRST','FOURTH','FIFTH','OPTION'}
KEEPIN={'AND','OF','&','THE'}
BAD=re.compile(r"\b(CITY OF|COUNTY\b(?! POLICE)|STATE OF|DEPARTMENT|UNITED STATES|NATIONAL (JOINT|COOPERATIVE|INSTITUTE OF GOV)|SOURCEWELL|OMNIA|NASPO|GENERAL SERVICES|SHERIFF|SCHOOL BOARD|LEAGUE OF CITIES|INTERNAL IMPROVEMENT|PURCHASING|COMMUNITY REDEVELOPMENT AGENCY|BOARD OF TRUSTEES OF THE FLORIDA|CITY CODE|SEC\.)|^(CITY|TOWN|VILLAGE)\b")
def tc(p):
  if p!=p.upper(): return p
  t=p.title()
  for a,b in [(r'\bLlc\b','LLC'),(r'\bLlp\b','LLP'),(r'\bPllc\b','PLLC'),(r'\bAfl-Cio\b','AFL-CIO'),(r"’S\b","’s"),(r"'S\b","'s"),(r'\bD/B/A\b','d/b/a'),(r'\bOf\b','of'),(r'\bAnd\b','and'),(r'\bLp\b','LP'),(r'\bCdw\b','CDW'),(r'\bAecom\b','AECOM'),(r'\bShi\b','SHI'),(r'\bScg\b','SCG'),(r'\bKsf\b','KSF'),(r'\bMcci\b','MCCI'),(r'\bH20\b','H2O'),(r'\bFaac\b','FAAC'),(r'\bPb\b','PB'),(r'\bEbs\b','EBS'),(r'\bAum\b','AUM'),(r'\bFiu\b','FIU'),(r'\bMoca\b','MOCA'),(r'\bIi\b','II'),(r'\bIii\b','III'),(r'\bUsa\b','USA'),(r'\bPba\b','PBA'),(r'\bRp\b','RP'),(r'\bTv\b','TV'),(r'\bAt&T\b','AT&T'),(r'\bIbm\b','IBM'),(r'\bHvac\b','HVAC'),(r'\bGpe\b','GPE'),(r'\bBsd18\b','BSD18'),(r'\bJl\b','JL'),(r'\bCrom\b','CROM')]: t=re.sub(a,b,t)
  return t
def toks(t): return re.findall(r"[A-Z0-9&][A-Z0-9&.'’!/\-]*|,|;|\(|\)",t)
def parties(t):
  t=re.sub(r'SPECIFICALLY IDENTIFIED (WITH|BY) MIAMI-DADE COUNTY FOLIO[^;]*','',t)
  t=re.sub(r'\s+',' ',t).replace('BETWEEN THE CITY OF NORTH MIAMI AND','WITH').replace('INC.,','INC ,').replace(', INC',' INC').replace(', LLC',' LLC').replace(', P.A',' P.A').replace(', CORP',' CORP')
  T=toks(t); out=[]
  for i,w in enumerate(T):
    base=w.rstrip('.,').upper()
    if base not in SUFS and base not in ORGS: continue
    if base in ORGS and i+1<len(T) and T[i+1].rstrip('.,') in SUFS: continue
    j=i; name=[w]
    while j>0:
      p=T[j-1]
      pu=p.rstrip('.').upper()
      if p in (',',';','(',')'): break
      if pu in STOP and pu not in KEEPIN: break
      if pu=='AND' and (T[j-2].rstrip('.,') in SUFS if j>=2 else True): break
      if pu=='AND' and j>=2 and T[j-2].upper() in ('MIAMI','ADMINISTRATION','COUNTY','TRUSTEES','FLORIDA','SERVICES','AGREEMENT'): break
      if pu in ('OF','THE','AND','&') and j>=2 and (T[j-2].upper() in STOP and T[j-2].upper() not in KEEPIN): break
      name.insert(0,p); j-=1
      if len(name)>12: break
    while name and name[0].upper() in ('OF','THE','AND','&'): name.pop(0)
    s=' '.join(name).strip(' .')
    # d/b/a continuation
    k=i+1
    if k+1<len(T) and T[k].upper() in ('D/B/A',):
      dba=[]; k+=1
      while k<len(T) and T[k] not in (',',';') and T[k].upper() not in ('FOR','TO','AS','IN'): dba.append(T[k]); k+=1
      if dba: s+=' d/b/a '+' '.join(dba)
    if len(s)<4 or BAD.search(s) or len(name)<2: continue
    if s not in out: out.append(s)
  for m in re.finditer(r'(INTERNATIONAL UNION OF POLICE ASSOCIATIONS,? AFL-? ?CIO,? LOCAL \d+|DADE COUNTY POLICE BENEVOLENT ASSOCIATION(?: INC)?|SOUTH FLORIDA POLICE BENEVOLENT ASSOCIATION|AMERICAN FEDERATION OF STATE, COUNTY AND MUNICIPAL EMPLOYEES[^;,]*?(?:LOCAL \d+)?|FRATERNAL ORDER OF POLICE[^;,]*)',t):
    x=m.group(1).replace('AFL- CIO','AFL-CIO').replace('AFL CIO','AFL-CIO')
    out=[o for o in out if not (o in x or x in o or 'ASSOCIATION' in o and 'POLICE' in o)]+[x]
  for m in re.finditer(r'(?:WITH|SELECTING) ([A-Z][A-Z ]{2,30}?) AS THE (?:INSURANCE )?PROVIDER|(?:WITH|SELECTING) (CIGNA HEALTHCARE|AETNA|UNITED HEALTHCARE)',t):
    x=(m.group(1) or m.group(2)).strip()
    if x not in out: out.append(x)
  for m in re.finditer(r'\bARTISTS? ([A-Z][A-Z\.\- ]{3,40}?)(?=[;,]| TO | FOR )',t): out.insert(0,m.group(1))
  for m in re.finditer(r'(?:MATTER OF|SETTLEMENT (?:ON|OF)|CASE,) ([A-Z][A-Z.\'’ \-]{3,60}?)(?:’S|\'S| V\.| VS\.? | V )',t):
    x=m.group(1).strip()
    if not BAD.search(x) and x not in out: out.append(x)
  out=[o for o in out if not any(o!=p and o in p for p in out)]
  return [tc(o) for o in out]
def addresses(t):
  return re.findall(r'(?:LOCATED AT|PROPERTY AT|PROPERTIES LOCATED AT|LOCATED ON) (\d{2,5}(?:[-–]\d+)? (?:N\.?\s?E\.?|N\.?\s?W\.?|NE|NW|NORTHEAST|NORTHWEST|WEST|W\.|EAST|N\.|BISCAYNE|KEYSTONE|BAYSHORE)[A-Z0-9 .]{2,40}?(?:STREET|ST|AVENUE|AVE|COURT|CT|ROAD|RD|DRIVE|DR|BOULEVARD|BLVD|HIGHWAY|HWY|TERRACE|TER|PLACE|PL|WAY|LANE)\b\.?)',t)
