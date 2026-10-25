# v2: search the Clerk's historical principals by the first word(s) of the party name (the API matches prefixes and
# does not equate '&' with AND), keep principals whose name equals the party ignoring punctuation, '&'/AND and corporate
# suffix, then pull each kept principal's lobbyists (lobbyistdetails).
import json,urllib.request,urllib.parse,os,re,time,sys
sys.path.insert(0,os.path.dirname(__file__)); from normlib import norm,core
B='https://www2.miamidadeclerk.gov/lobbyhist/api/historicalLobbyistInformation/'
OUT='/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/pc/lhp2/'
os.makedirs(OUT,exist_ok=True)
def req(url,data=None):
    for t in range(4):
        try:
            r=urllib.request.Request(url,data=json.dumps(data).encode() if data else None,headers={'Content-Type':'application/json'})
            return json.load(urllib.request.urlopen(r,timeout=30))
        except Exception: time.sleep(3*(t+1))
    return None
def q(ep,p1):
    e=req(B+'EncryptParams',{'param1':p1,'param2':''})
    if not e: return None
    return req(B+ep+'?queryString='+urllib.parse.quote(e['queryString']))
cache={}
def search(s):
    if s not in cache: cache[s]=q('principalsByNameQuery',s)
    return cache[s]
def run(names):
    for n in names:
        key=re.sub(r'[^A-Z0-9]+','_',norm(n))[:120]; fn=OUT+key+'.json'
        if os.path.exists(fn): continue
        c=core(n)
        raw=re.sub(r"[^A-Z0-9& \-']",' ',n.upper()); raw=re.sub(r'^THE ','',re.sub(r'\s+',' ',raw).strip())
        w=raw.split()
        qs=[]
        if len(w)>=2: qs.append(' '.join(w[:2]))
        if w and (len(w[0])>=4 or len(w)==1): qs.append(w[0])
        ps=[];err=False;used=None
        for s in qs:
            r=search(s)
            if r is None: err=True; continue
            used=s; ps=r
            if r: break
        keep=[p for p in ps if core(p['principal_Name'])==c and c]
        if not keep and w:
            r=search('THE '+' '.join(w[:2]))
            if r: 
                k2=[p for p in r if core(p['principal_Name'])==c and c]
                if k2: keep=k2; used='THE '+' '.join(w[:2]); ps=r
        lob={}
        for p in keep:
            r=q('lobbyistdetails',str(p['id'])); lob[str(p['id'])]=r if r is not None else 'error'
        json.dump({'name':n,'core':c,'query':used,'searched':len(ps),'error':err,'principals':keep,'lobbyists':lob},open(fn,'w'))
if __name__=='__main__':
    names=json.load(open(sys.argv[1])); k=int(sys.argv[2]); m=int(sys.argv[3])
    run(names[k::m]); print('done')
