"""Pick qualifying NMB actions from nmb/cand.json (one row per item per meeting; the vote that disposed of it).
Qualifies: names a private party (vendor, applicant, grantee, settlement party) or is a quasi-judicial land-use
item (site plan, variance, conditional use, rezoning, plat, alley vacation, development agreement). Writes nmb/keep.json."""
import json,re,collections
C=json.load(open('nmb/cand.json'))
LAND=re.compile(r'Site Plan|Variance|Conditional Use|Rezon|Zoning Map|Development Agreement|Plat\b|Vacation of Alley|Declaration of Restrictions|Land Use Map',re.I)
SETTLE=re.compile(r'Settlement',re.I)
NOISE=re.compile(r'^(?:was |will be |and Resolution|and Ordinance|,|\(Lien)',re.I)
SKIPH=re.compile(r'Minutes|Appoint|Proclam|Millage|Budget(?! .*from)|Renam|Special Election|General Election|Election Results|Urging|Merit Increase|Pension|Zoning in Progress|Quorum|Sergeant|Legislative|Calling for|Homestead|Fee Increase|Sediment|Illicit|Shopping Cart|Property Rights|Active Design|Text Amendment|Administrative Site Plan|Kit of Parts|Candidate Qualifying|Investment Policy|Tree/Landscaping|Comprehensive Plan Text|Hanford',re.I)
GOVONLY=re.compile(r'Grant\b|Interlocal|Miami-Dade County|State Attorney|FDOT|Department of Transportation|Children.s Trust|Attorney General|Florida International University|CDBG|Cybersecurity',re.I)
best={}
for c in C:
    if NOISE.search(c['head'].strip()): continue
    if c['result'] is None: continue
    k=(c['date'],re.sub(r'[^0-9A-Z]','',c['no'].upper().replace('L','1').replace('O','0').replace('S','5')))
    if k in best and best[k]['title'] and not c['title']: continue
    best[k]=c
keep=[];why=collections.Counter()
for k,c in sorted(best.items()):
    h=c['head']
    if SKIPH.search(h): why['skip-head']+=1; continue
    land=bool(LAND.search(h)); settle=bool(SETTLE.search(h))
    if not (c['parties'] or land or settle): why['no party']+=1; continue
    if GOVONLY.search(h) and not c['parties']: why['gov']+=1; continue
    c['land']=land; c['settle']=settle; keep.append(c)
json.dump(keep,open('nmb/keep.json','w'),indent=0)
print(len(best),len(keep),why)
