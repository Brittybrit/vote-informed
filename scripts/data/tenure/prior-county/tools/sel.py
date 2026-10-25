import re,json,sys
sys.path.insert(0,'/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/pc/tools')
from classify import *
TYPES={'Resolution','Ordinance','Zoning','Change Order','Professional Service Agreement','Resolution of Sympathy','CDMP','Bid Waiver','Supplement'}
def res_parse(r):
    L=r.split('\n'); out={'action':L[0].strip(),'ref':None,'mover':None,'second':None,'tally':None,'no':[],'absent':[],'excused':[],'late':[],'ocb':[],'coi':[],'other':{}}
    for l in L[1:]:
        m=re.match(r'(Resolution|Ordinance|Zoning|CDMP)\s+(\S+)$',l.strip())
        if m and re.search(r'\d',m.group(2)): out['ref']=m.group(2) if m.group(1)!='Zoning' else m.group(2); 
        m=re.match(r'Mover:\s*(.*)',l);  out['mover']=m.group(1).strip() if m else out['mover']
        m=re.match(r'Seconder:\s*(.*)',l); out['second']=m.group(1).strip() if m else out['second']
        m=re.match(r'Vote:\s*(\d+)\s*-\s*(\d+)',l)
        if m: out['tally']=[int(m.group(1)),int(m.group(2))]
        m=re.match(r'(No|Absent|Excused|Late|Absent, OCB|Absent, COI)\s*:\s*(.*)',l)
        if m:
            k={'absent, ocb':'ocb','absent, coi':'coi'}.get(m.group(1).lower(),m.group(1).lower()); v=[x.strip() for x in m.group(2).split(' , ')] if ' , ' in m.group(2) else [m.group(2).strip()]
            if k in out: out[k]=v
            else: out['other'][k]=v
    return out
def candidate(it):
    T=it['title'].upper()
    if it['type'] not in ('Resolution','Ordinance','Zoning','Change Order','Professional Service Agreement','Mayoral Veto'): return None
    r=res_parse(it['result'])
    a=r['action']
    if not re.match(r'^(Adopted|Approved|Denied|Motion to adopt.*(failed|died)|Not adopted|Not approved|Failed|Rejected)',a) or re.search(r'(?i)first reading|1st reading|as to form|Bid Rejection',a): return None
    r['result']='denied' if a.startswith('Denied') else ('failed' if re.search(r'failed|died|Not |Failed|Rejected',a) else ('approved' if a.startswith('Approved') else 'adopted'))
    return r
def parties_for(it,kind):
    T=it['title'].upper().replace('\n',' ')
    T=re.sub(r",?\s*(?:AN?|THE)\s+(?:FLORIDA|DELAWARE|FOREIGN|GEORGIA|NEW YORK|TEXAS)?\s*(?:NOT[- ]FOR[- ]PROFIT|NON-?PROFIT|DOMESTIC|FOREIGN)?\s*(?:LIMITED LIABILITY (?:LIMITED )?(?:COMPANY|PARTNERSHIP)|LIMITED PARTNERSHIP|CORPORATION|GENERAL PARTNERSHIP|LIMITED COMPANY)(?:\s*\([^)]*\))?",' ',T)
    T=re.sub(r'(UNION|ASSOCIATION|AFL-CIO|AFSCME|SEIU|IAFF|TWU)\s*[,(]\s*(LOCAL\s+\d+)\)?',r'\1 \2',T)
    ps=[]
    if kind=='zoning': ps=zoning_party(T)
    if kind=='plat': ps=filedby(T)
    for o in orgs(T):
        if not any(o in p or p in o for p in ps): ps.append(o)
    return [titlecase(p) for p in ps]
def excluded(T,kind):
    if kind in('zoning','plat','landuse'): return False
    if EXCL.search(T): return True
    strong=bool(re.search(SUF+r'\.?(?:\s|,|;|$)',T))
    if SOFT.search(T) and not strong: return True
    if re.match(r'^(RESOLUTION )?DIRECTING THE COUNTY (MAYOR|MANAGER)',T) and not re.search(r'DIRECTING .{0,120}(GRANT|DISBURSE|ALLOCAT|AWARD|EXECUTE|CONVEY|LEASE|NEGOTIATE)',T): return True
    if re.search(r'^(ORDINANCE )?(RELATING|PERTAINING|RELATED) TO\b',T) and not re.search(r'GRANTING|EXEMPTION|APPROVING .*AGREEMENT',T) and not strong: return True
    return False
