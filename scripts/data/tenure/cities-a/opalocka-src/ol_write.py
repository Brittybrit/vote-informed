import json,re,os,collections
B=json.load(open('built.json'))
PA=json.load(open('pa_out.json'))
ADDR2F={'13050 NW 30th Avenue':'08-2128-002-0020','12805 Le Jeune Road':'08-2129-000-0061','13800 NW 22nd Avenue':'08-2122-011-0260','2950 NW 132nd Terrace':'08-2128-004-0350','14585 NW 22 Avenue':'08-2122-005-0690','12691 NW 42nd Avenue':'08-2129-000-0050','1300 Sesame Street':'08-2121-002-1110','the corner of Sesame Street and Ali Baba Avenue':'08-2121-004-1861','2090 Ali Baba Avenue':'08-2122-003-2100','14301 NW 27 Th Avenue':'08-2122-000-0050','12705 Cairo Lane':'08-2128-003-0530','the corner of NW 17 Th Avenue and Opa-Locka Boulevard':'08-2122-018-0200','the corner of NW 17th Avenue and Opa-Locka Boulevard':'08-2122-018-0200','13600 NW 17th Avenue':'08-2122-018-0200','1700 Service Road':'08-2122-005-2170','NW 148th Street and NW 24th Court':'08-2122-025-0501','2695 NW 141st':'08-2122-000-0120','921 Superior Street':'08-2121-007-1770','211 Ahmad Street':'08-2121-002-2590','13449 NW 42nd Avenue':'08-2129-016-0010'}
FIXADDR={'14301 NW 27 Th Avenue':'14301 NW 27th Avenue','the corner of NW 17 Th Avenue and Opa-Locka Boulevard':'the corner of NW 17th Avenue and Opa-locka Boulevard','the corner of NW 17th Avenue and Opa-Locka Boulevard':'the corner of NW 17th Avenue and Opa-locka Boulevard','2695 NW 141st':'2695 NW 141st Street','14585 NW 22 Avenue':'14585 NW 22nd Avenue'}
def fa(s):
  for k,v in FIXADDR.items(): s=s.replace(k,v)
  return s
from datetime import datetime
def d2(s):
  try: return datetime.strptime(s,'%m/%d/%Y').strftime('%Y-%m-%d')
  except Exception: return None
def oc(s):
  t=s.title()
  for a,b in [(r'\bLlc\b','LLC'),(r'\bLp\b','LP'),(r'\bGpt\b','GPT'),(r'\bNw\b','NW'),(r'\bNe\b','NE'),(r'\bIi\b','II'),(r'\bIii\b','III'),(r'\bDmg\b','DMG'),(r'\bKc\b','KC'),(r'\bSf\b','SF'),(r'\bIdma\b','IDMA'),(r'(\d)(St|Nd|Rd|Th)\b',lambda m:m.group(1)+m.group(2).lower()),(r'\bTrs\b','Trs.')]: t=re.sub(a,b,t)
  return t
acts=[];TR={};owners={}
for a in B['actions']:
  b={k:v for k,v in a.items() if not k.startswith('_')}
  b['id']='opalocka-'+a['id']
  for k in ('title',): b[k]=fa(b[k])
  b['parties']=[fa(p) for p in b['parties']]
  TR[b['id']]={'en':b['title'],'es':fa(a['_es']),'ht':fa(a['_ht'])}
  acts.append(b)
  p0=b['parties'][0]
  m=re.match(r'Owner of (.+) \(not named in minutes\)',p0)
  if m:
    raw=[k for k in ADDR2F if fa(k)==m.group(1)]
    f=ADDR2F.get(raw[0]) if raw else None
    if f and f in PA:
      o=PA[f]; own=(' '.join(o['owner']) if len(o['owner'])<2 or o['owner'][1] in ('ENTERPRISES LLC','C/O PROLOGIS INC') else ' & '.join(o['owner']))
      sales=o['sales']; since=None; prev=None
      for s in sales:
        if (s[3] or '').strip(): since=d2(s[0]); prev=s[2]; break
      note=None
      if since and since>b['date']:
        # owner bought after the vote: name the seller of record instead when the seller owned it on the vote date
        sd=[(d2(s[0]),s[2],s[3]) for s in sales if d2(s[0])]
        held=[x for x in sd if x[0]<=b['date']]
        if held:
          own=held[0][2] or own; note='Current owner bought on %s, after this vote; owner shown is the grantee of the sale before the vote (%s).'%(since,held[0][0])
        else:
          note='Owner of record bought on %s, after this vote.'%since
      owners[b['id']]={'address':m.group(1),'folio':f,'owner':oc(own),'ownerSrc':'https://apps.miamidadepa.gov/PApublicServiceProxy/PaServicesProxy.ashx?Operation=GetPropertySearchByFolio&clientAppName=PropertySearch&folioNumber='+f.replace('-',''),'officers':None,'sunbizSrc':None,'applicant':None,'note':note or 'Owner of record from the Miami-Dade Property Appraiser (checked 2026-10-25); the minutes do not name the applicant.'}
print(len(acts),len(owners))
json.dump(owners,open('owners_tenure.json','w'),indent=1,ensure_ascii=False)
gaps=[
 {'issue':'Bass: her current continuous service began with her appointment on 2021-08-18 (sworn in 2021-09-08) to fill the late Commissioner Alvin Burke\'s seat; she also served Nov 2018 - Nov 2020 (unexpired Pigatt term) but was off the commission Dec 2020 - Aug 2021, so that earlier term is a separate tenure and is not covered.'},
 {'issue':'Ervin: first sat on 2022-12-14 (elected Nov 2022); actions from 2022-12-14 on are hers. The 2022-11-14 meeting still had the old board (Davis, Dominguez).'},
 {'issue':'Minutes not posted for: Regular meetings 2022-06-08 and 2022-07-13 were read from attachments to later agendas (Opa-Locka RCM Minutes); no minutes found for Regular meetings 2023-11-22, 2023-12-27, 2024-06-12, 2024-10-09, 2024-11-27, 2024-12-25 (agenda only or cancelled), Special meetings 2023-08-16 (cancelled), 2023-09-20, 2023-11-29, Workshop 2021-10-20.'},
 {'issue':'2024-06-12 and 2024-10-09 regular meetings: agenda and packet posted but no minutes attached to any later agenda through Jan 2025; their private-party items (e.g. Landshore Phase II canal contract on 2024-10-09, re-heard 2024-10-23) are not listed for those dates.'},
 {'issue':'Votes come from the clerk\'s action summary minutes, which list each member\'s vote. Consent items carry the single consent-agenda roll; pulled items carry their own vote. Where a member is missing from a roll (late arrival, virtual attendance) the vote is "unknown".'},
 {'issue':'Applicants for most site plans, plats, variances, special exceptions and development agreements are not named in the minutes or titles; these carry "Owner of <address> (not named in minutes)" with the owner of record in owners.json.'},
 {'issue':'Older minutes (2021-2022) are scanned PDFs with an OCR text layer; dollar amounts in some titles are garbled and were left out where unreadable.'},
 {'issue':'Excluded under the standard: RFP issuances naming no vendor, budget amendments, code and land development regulation text amendments, interlocal agreements and state/county grants, scholarships, appointments, employment of charter officers, city-hosted events.'},
]
out={'window_from':'2021-08-18','actions':acts,'meetings':B['meetings'],'gaps':gaps,'translations':TR}
dest='/home/claude/vote-informed/scripts/data/city/opalocka/tenure'
os.makedirs(dest,exist_ok=True)
json.dump(out,open(dest+'/actions.json','w'),ensure_ascii=False,indent=1)
print('wrote',len(acts),'meetings',len(B['meetings']))
