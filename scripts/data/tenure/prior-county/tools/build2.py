# Stage 2: merge matter pages (requester, sponsors, Registered Lobbyist, veto lines, Mayor's memo), Clerk lobbyist
# registrations, Gimenez mayoral facts; write the slice files.
import json,sys,re,os,glob,collections,datetime
BASE='/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/pc/'
OUT='/home/claude/vote-informed/scripts/data/tenure/prior-county/'
sys.path.insert(0,BASE+'tools')
from matter import parse_matter
from normlib import norm, core
from build1 import NAME
S=json.load(open(BASE+'stage1.json'))
A=S['actions']
# ---- vetoed files (clerk's file type "Mayoral Veto" in any minutes) ----
vetotype=set()
for f in glob.glob(BASE+'parsed/*.json'):
    for it in json.load(open(f))['items']:
        if it['type']=='Mayoral Veto': vetotype.add(it['id'])
VB={}
for v in S['vetoes']: VB.setdefault(v['id'],[]).append(v)
# ---- lobbyist data ----
LP={}
for f in glob.glob(BASE+'lhp2/*.json'):
    d=json.load(open(f)); LP[norm(d['name'])]=d
PER={}
for f in glob.glob(BASE+'lh/*.json'):
    for r in json.load(open(f)):
        PER.setdefault(core(r['principalName']),[]).append(r)
regyears={}
if os.path.exists(BASE+'lobregs.json'): regyears=json.load(open(BASE+'lobregs.json'))
def lname(s):
    s=re.sub(r'\s+',' ',s.strip())
    if ',' in s:
        l,f=s.split(',',1); s=f.strip()+' '+l.strip()
    return ' '.join(w.capitalize() if not re.match(r'^(II|III|IV|JR\.?|SR\.?)$',w) else w for w in s.split()).replace('Jr','Jr.').replace('..','.')
missing_lp=0
def lobbied_for(a):
    global missing_lp
    out=[]; vd=a['date']; vy=int(vd[:4])
    for p in a['parties']:
        d=LP.get(norm(p))
        if d is None: missing_lp+=1; continue
        for pr in d['principals']:
            exact = norm(pr['principal_Name'])==norm(p)
            ll=d['lobbyists'].get(str(pr['id']),[])
            if ll=='error': continue
            for l in ll:
                de=(l.get('date_Employed') or '')[:10]
                if not de or de>vd or int(de[:4])<vy-1: continue
                ry=regyears.get(str(l['id']))
                out.append({'name':lname(l['lobbyist_Full_Name']),'for':p,'principal':pr['principal_Name'].strip(),'reg':de,'match':'exact' if exact else 'name without corporate suffix',
                            'issue':(l.get('description_Of_Issues') or '')[:160],'annualRegistration':(None if ry is None else (vy in ry))})
    for p in a['parties']:
        for r in PER.get(core(p),[]):
            de=(r.get('dateEmployed') or '')[:10]
            if not de or de>vd or int(de[:4])<vy-1: continue
            ry=regyears.get(str(r['lobbyistId']))
            out.append({'name':lname(r['lobbyistFullName']),'for':p,'principal':r['principalName'].strip(),'reg':de,'match':'exact' if norm(r['principalName'])==norm(p) else 'name without corporate suffix',
                        'issue':(r.get('issueDescription') or '')[:160],'annualRegistration':(None if ry is None else (vy in ry))})
    seen=set(); res=[]
    for o in out:
        k=(o['name'],o['for'])
        if k in seen: continue
        seen.add(k); res.append(o)
    return res
# ---- windows ----
BARR=('1998-06-16','2018-03-21'); GCOM=('2004-11-17','2011-04-11'); GMAY=('2011-07-07','2020-11-16')
EXEC=re.compile(r"(?i)AUTHORIZ\w* (?:THE )?(?:COUNTY )?MAYOR[^;]{0,80}?TO EXECUTE|AUTHORIZING EXECUTION BY THE COUNTY MAYOR|AUTHORIZING (?:THE )?(?:COUNTY )?MAYOR[^;]{0,40}?(?:TO )?(?:ENTER INTO|AWARD|EXERCISE)")
RATIFY=re.compile(r"(?i)RATIFY\w* (?:THE )?(?:ACTION|ACTIONS)? ?(?:OF|BY|TAKEN BY) (?:THE )?(?:COUNTY )?MAYOR|RETROACTIVELY (?:APPROVING|AUTHORIZING) (?:THE )?(?:COUNTY )?MAYOR")
nomatter=0
for a in A:
    mp=BASE+f"matter/{a['id']}.html"
    m=None
    if os.path.exists(mp) and os.path.getsize(mp)>3000:
        try: m=parse_matter(mp)
        except Exception as e: m=None
    if not m: nomatter+=1
    a['matter']=None if not m else {k:m[k] for k in ('fileType','status','reference','requester','sponsors','lobbyists','memoFrom','recommendation','vetoLines')}
    if m and a['ref'] is None and m['reference']: a['ref']=m['reference']
    # lobbyists: Clerk registrations + the item's own "Registered Lobbyist" field
    a['lobbied']=lobbied_for(a)
    if m and m['lobbyists'] and not re.match(r'(?i)none',m['lobbyists']):
        a['lobbiedRecord']=m['lobbyists']
    v={'vetoedFileType':a['id'] in vetotype}
    vl=(m['vetoLines'] if m else []) or []
    v['vetoedPerHistory']=any(l.strip()=='Vetoed' or 'presented a veto' in l.lower() for l in vl)
    if a['id'] in VB: v['overrideVotes']=VB[a['id']]
    if vl: v['matterHistory']=vl
    if v['vetoedFileType'] or v['vetoedPerHistory'] or 'overrideVotes' in v: a['veto']=v
    waiver=sorted({l[:600] for l in vl+re.split(r'\n',a.get('report') or '') if re.search(r'(?i)waiv\w* (of )?the (ten|10).{0,10}day veto|veto (period )?waiver|waive the veto|waive the (ten|10)',l)})
    a['seated']={'Barreiro':BARR[0]<=a['date']<=BARR[1],'Gimenez':GCOM[0]<=a['date']<=GCOM[1]}
    if GMAY[0]<=a['date']<=GMAY[1]:
        T=a['titleFull']
        a['mayor']={'name':'Carlos A. Gimenez',
            'memoFrom':m['memoFrom'] if m else None,
            'recommendation':m['recommendation'] if m else None,
            'mayorMemo':bool(m and m['memoFrom'] and re.search(r'Gim.nez',m['memoFrom'])),
            'requester':m['requester'] if m else None,'sponsors':m['sponsors'] if m else None,
            'titleAuthorizesMayorToExecute':bool(EXEC.search(T)),'titleRatifiesMayorAction':bool(RATIFY.search(T)),
            'vetoed':bool(a.get('veto') and (a['veto']['vetoedFileType'] or a['veto']['vetoedPerHistory'])),
            'vetoPeriodWaiverText':waiver,
            'source':'matter page legislative text (memorandum header and RECOMMENDATION section), item title, Clerk minutes'}
print('actions',len(A),'no matter page',nomatter,'parties without lobbyist lookup',missing_lp)
print('lobbied actions',sum(1 for a in A if a['lobbied']),'pairs',sum(len(a['lobbied']) for a in A),'record field',sum(1 for a in A if a.get('lobbiedRecord')))
json.dump(A,open(BASE+'stage2.json','w'))
