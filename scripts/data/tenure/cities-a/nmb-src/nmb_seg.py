"""Segment NMB minutes into Resolution/Ordinance items with the vote that disposed of them.
Consent items take the consent-agenda vote; others take the first vote line after their header.
Items listed after 'not heard' / marked DEFERRED / WITHDRAWN get status accordingly. Writes nmb/seg.json."""
import re,glob,json,os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from nmb_parse import load,mdate
HDR=re.compile(r'^[ \t]*(?:\d{1,2}\.\d{1,2}\.?\s*)?(\((?:DEFERRED|WITHDRAWN|PULLED|MOVED[^)]*)\)\s*)?((?:Resolution|Ordinance)\s+No\.?\s*(R?\s?20\d\d\s*-\s*[\dlOo]{1,3}[A-Za-z]?))([^\n]*(?:\n(?![ \t]*A[N]? (?:RESOLUTION|ORDINANCE))[^\n]*){0,2})',re.I|re.M)
VOTE=re.compile(r'(?:Voice\s*Vote|Voicer Vote|Roll\s*Call\s*Vote|MO[TI]+ON\s+(?:PASSED|FAILED))[^\n]*(?:\n[^\n]{0,140}){0,2}',re.I)
MOT=re.compile(r'Motion[^\n]{0,200}?made by[^\n]*(?:\n[^\n]*)?',re.I)
def norm(n): return re.sub(r'\s','',n).upper().replace('L','1').replace('O','0').replace('R','R')
def seg(t):
    t=t.replace('\r','').replace('\f','\n')
    nh=re.search(r'(?:following items were not heard|items were not heard)',t,re.I)
    nhpos=nh.start() if nh else len(t)
    cons=[m for m in re.finditer(r'(?:^|\n)\s*(?:\d{1,2}\.\s*)?CONSENT AGENDA\s*\n',t)]
    cstart=cons[0].start() if cons else -1
    cmot=re.search(r'Motion to approve the (?:amended )?consent agenda[^\n]*(?:\n[^\n]*){0,4}',t,re.I)
    hs=list(HDR.finditer(t)); out=[]
    for k,m in enumerate(hs):
        end=hs[k+1].start() if k+1<len(hs) else len(t)
        body=t[m.end():end]
        flag=(m.group(1) or '').upper()
        st='heard'
        if m.start()>nhpos: st='not heard'
        if 'DEFERRED' in flag or 'WITHDRAWN' in flag: st='deferred'
        inc= cstart>=0 and m.start()>cstart and (not cmot or m.start()<cmot.start() or (cmot and cmot.start()<cstart))
        vs=[v.group(0) for v in VOTE.finditer(body)]
        ms=[v.group(0) for v in MOT.finditer(body)]
        out.append({'no':re.sub(r'\s','',m.group(3)),'head':re.sub(r'\s+',' ',m.group(4)).strip()[:200],'status':st,'consent':bool(inc and not vs),
                    'body':re.sub(r'[ \t]+',' ',body)[:3000],'votes':vs,'motions':ms,'pos':m.start()})
    return out,(cmot.group(0) if cmot else '')
if __name__=='__main__':
    R={}
    for p in sorted(glob.glob('nmb/txt/*.txt')):
        i=os.path.basename(p).split('.')[0]
        if i in R: continue
        t=load(i); d=mdate(t)
        if not d: continue
        its,c=seg(t); R[i]={'date':d,'consent_vote':c,'items':its,'present':(re.search(r'Present[^\n]*(?:\n[^\n]*){0,6}',t) or re.search('x','x')).group(0)}
    json.dump(R,open('nmb/seg.json','w'),indent=0)
    for i,v in sorted(R.items(),key=lambda x:x[1]['date']): print(v['date'],i,len(v['items']),bool(v['consent_vote']))
