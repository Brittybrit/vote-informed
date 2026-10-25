"""Copied from the shared scratchpad tools (prior-slice helper); patched: when the last sale before the vote has no grantee name, the grantor of the first later sale is used.
Owner of record as of a date, Miami-Dade Property Appraiser. usage: import pa; pa.owner('486 E 30 ST','2017-01-24', muni='Hialeah')"""
import json,subprocess,re,datetime,os,urllib.parse
CACHE=os.environ.get('PA_CACHE','pa_cache.json')
_c=json.load(open(CACHE)) if os.path.exists(CACHE) else {}
BASE='https://apps.miamidadepa.gov/PApublicServiceProxy/PaServicesProxy.ashx?'
def _get(q):
    if q in _c: return _c[q]
    o=subprocess.run(['curl','-s','-m','40',BASE+q],capture_output=True,text=True).stdout
    try: d=json.loads(o)
    except Exception: d=None
    _c[q]=d; json.dump(_c,open(CACHE,'w'))
    return d
ORD={'1':'1ST','2':'2ND','3':'3RD'}
def norm(a):
    a=a.upper().replace('.',' ').replace(',',' ')
    a=re.sub(r'(\d+)\s*(ST|ND|RD|TH|™|1H|111|1ih)\b',r'\1',a)
    rep={'STREET':'ST','AVENUE':'AVE','A VENUE':'AVE','COURT':'CT','PLACE':'PL','TERRACE':'TER','ROAD':'RD','DRIVE':'DR','BOULEVARD':'BLVD','LANE':'LN','EAST':'E','WEST':'W','NORTH':'N','SOUTH':'S','HIGHWAY':'HWY','PARKWAY':'PKWY','CIRCLE':'CIR','TRAIL':'TRL'}
    for k,v in rep.items(): a=re.sub(r'\b'+k+r'\b',v,a)
    a=re.sub(r'\s+',' ',a).strip()
    m=re.match(r'(\d+)(?:\s*-\s*\d+)*\s+(.*)',a)
    if m: a=m.group(1)+' '+m.group(2)
    return a
def folios(addr,muni=None):
    a=norm(addr)
    q='Operation=GetAddress&clientAppName=PropertySearch&myUnit=&from=1&to=200&myAddress='+urllib.parse.quote(a)
    d=_get(q)
    if not d or not d.get('MinimumPropertyInfos'): return a,[]
    r=[(x['Strap'],x['Owner1'],x['SiteAddress'],x['Municipality']) for x in d['MinimumPropertyInfos'] if not muni or x['Municipality'].lower()==muni.lower()]
    return a,r
def folio_rec(f):
    return _get('Operation=GetPropertySearchByFolio&clientAppName=PropertySearch&folioNumber='+f.replace('-',''))
def owner_asof(f,date):
    d=folio_rec(f)
    if not d: return None,None
    cur=' & '.join(x['Name'] for x in (d.get('OwnerInfos') or []))
    dt=datetime.datetime.strptime(date[:10],'%Y-%m-%d')
    sales=[]
    for s in d.get('SalesInfos') or []:
        try: sales.append((datetime.datetime.strptime(s['DateOfSale'],'%m/%d/%Y'),(s['GranteeName1']+(' & '+s['GranteeName2'] if s['GranteeName2'] else '')).strip(),s['GrantorName1']))
        except Exception: pass
    sales.sort()
    prior=[s for s in sales if s[0]<=dt]; after=[s for s in sales if s[0]>dt]
    if after:
        if prior and prior[-1][1]: return prior[-1][1], f"Grantee of the last sale before the vote ({prior[-1][0]:%-m/%-d/%Y}); current owner {cur}"
        return after[0][2], f"Grantor of the first sale after the vote ({after[0][0]:%-m/%-d/%Y}); current owner {cur}"
    return cur, ("No sale after the vote; current owner was owner at the vote" + (f" (bought {prior[-1][0]:%-m/%-d/%Y})" if prior else ''))
def owner(addr,date,muni=None):
    a,fs=folios(addr,muni)
    if not fs: return dict(address=addr,query=a,folio=None,owner=None,note='Address not found in the Property Appraiser search')
    if len(fs)>3: return dict(address=addr,query=a,folio=None,owner=None,note=f'{len(fs)} folios match (condominium or multi-unit); owner not resolved')
    f=fs[0][0]; o,n=owner_asof(f,date)
    if len(fs)>1: n=(n or '')+f'; {len(fs)} folios match, first used'
    return dict(address=addr,query=a,folio=f,owner=o,note=n,ownerSrc=BASE+'Operation=GetPropertySearchByFolio&clientAppName=PropertySearch&folioNumber='+f.replace('-',''))
