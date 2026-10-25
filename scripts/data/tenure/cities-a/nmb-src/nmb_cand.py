"""Candidate actions for NMB 2022-11-22 .. 2024-12-31: every heard Resolution/Ordinance with a vote, with the party
guessed from the title (to be checked by hand in overrides). Writes nmb/cand.json."""
import re,json,sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from nmb_parse import load
from nmb_votes import present,parse_vote
GOV=re.compile(r'MIAMI-DADE|MIAMI DADE COUNTY|STATE OF FLORIDA|FLORIDA DEPARTMENT|DEPARTMENT OF|CITY OF (?!NORTH MIAMI BEACH)|SCHOOL BOARD|STATE ATTORNEY|ATTORNEY GENERAL|U\.?S\.? DEPARTMENT|FDOT|FDLE|COMMUNITY REDEVELOPMENT AGENCY|UNIVERSITY|CHILDREN\'S TRUST|TOWN OF|VILLAGE OF',re.I)
SKIP=re.compile(r'MINUTES|APPOINT|PROCLAM|MILLAGE|BUDGET|RENAM|CO-DESIGNAT|SPECIAL ELECTION|ELECTION RESULTS|URGING|SUPPORTING THE|OPPOS|LEGISLATIVE PRIORIT|MERIT INCREASE|SALARY|PENSION|ZONING IN PROGRESS|CODE OF ETHICS|QUORUM',re.I)
PARTY=[re.compile(p,re.I) for p in [
 r'(?:WITH|TO|FROM|AND)\s+([A-Z0-9][A-Z0-9&.,\'/\- ]{2,80}?(?:INC\.?|LLC|L\.L\.C\.|CORP(?:ORATION)?\.?|COMPANY|CO\.|LLP|P\.A\.|P\.L\.|GROUP|PARTNERSHIP|LTD|N\.A\.|USA|ASSOCIATES)(?:\s*,?\s*(?:D/B/A|DBA)\s+[A-Z0-9&.\' ]{2,40})?)\b',
]]
def guess(title):
    ps=[]
    for p in PARTY:
        for m in p.finditer(title):
            s=re.sub(r'^(?:THE|A|AN)\s+','',m.group(1).strip(' ,.'))
            s=re.sub(r'^.*\b(?:WITH|TO|FROM)\s+','',s)
            if not GOV.search(s) and s not in ps: ps.append(s)
    return ps
def money(t):
    m=re.findall(r'\$\s?([\d,]+(?:\.\d\d)?)',t); return ('$'+m[0]) if m else None
if __name__=='__main__':
    S=json.load(open('nmb/seg.json')); out=[]
    for k,v in sorted(S.items(),key=lambda x:x[1]['date']):
        if not ('2022-11-22'<=v['date']<='2024-12-31'): continue
        t=load(k); pres,ab=present(t)
        for o in v['items']:
            if o['status']!='heard': continue
            body=re.sub(r'\s+',' ',o['body'])
            tm=re.search(r'A[N]? (?:RESOLUTION|ORDINANCE) OF THE (?:MAYOR AND )?CITY COMMISSION.{0,1500}?(?:EFFECTIVE DATE|$)',body)
            title=tm.group(0) if tm else ''
            vote=(v['consent_vote'] if o['consent'] else (o['votes'][0] if o['votes'] else ''))
            roll,res,how=parse_vote(vote,pres) if vote else (None,None,'no vote line')
            mot=re.search(r'made by ((?:Vice |Acting )?(?:Mayor|Commissioner) \w+),? (?:and )?seconded by ((?:Vice |Acting )?(?:Mayor|Commissioner) \w+)',(v['consent_vote'] if o['consent'] else ' '.join(o['motions'][:1])))
            first='first reading' in vote.lower()
            out.append({'mid':k,'date':v['date'],'no':o['no'],'head':o['head'],'title':title[:1500],'consent':o['consent'],
                'vote':re.sub(r'\s+',' ',vote)[:300],'roll':roll,'result':('first reading' if first and res=='passed' else res),'how':how,
                'mover':mot.group(1).split()[-1] if mot else None,'second':mot.group(2).split()[-1] if mot else None,
                'present':pres,'skip':bool(SKIP.search(o['head']+' '+title[:300])),'parties':guess(title),'amount':money(title)})
    json.dump(out,open('nmb/cand.json','w'),indent=0)
    import collections
    print(len(out),collections.Counter(c['how'][:20] for c in out))
