import json,glob,os,sys,urllib.request,urllib.parse,time
from concurrent.futures import ThreadPoolExecutor
BASE='/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/pc/'
B='https://www2.miamidadeclerk.gov/lobbyhist/api/historicalLobbyistInformation/'
def req(url,data=None):
    for t in range(4):
        try:
            r=urllib.request.Request(url,data=json.dumps(data).encode() if data else None,headers={'Content-Type':'application/json'})
            return json.load(urllib.request.urlopen(r,timeout=120))
        except Exception: time.sleep(3*(t+1))
    return None
fn=BASE+'lobregs.json'
have=json.load(open(fn)) if os.path.exists(fn) else {}
ids=set()
for f in glob.glob(BASE+'lhp2/*.json'):
    for ls in json.load(open(f))['lobbyists'].values():
        if ls=='error': continue
        for l in ls: ids.add(str(l['id']))
for f in glob.glob(BASE+'lh/*.json'):
    for r in json.load(open(f)): ids.add(str(r['lobbyistId']))
todo=[i for i in ids if i not in have]
print(len(ids),len(todo),flush=True)
def one(i):
    e=req(B+'EncryptParams',{'param1':i,'param2':''})
    if not e: return i,None
    r=req(B+'lobbyistIdQuery?queryString='+urllib.parse.quote(e['queryString']))
    return i,(sorted({x['registration_Year'] for x in r}) if r is not None else None)
with ThreadPoolExecutor(4) as ex:
    for n,(i,ys) in enumerate(ex.map(one,todo)):
        if ys is not None: have[i]=ys
        if n%200==0: json.dump(have,open(fn,'w'))
json.dump(have,open(fn,'w')); print('done')
