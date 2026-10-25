"""Split NMB commission minutes (novusagenda MinutesMeetingID text, pdftotext -layout or OCR) into agenda items
with their vote line. Usage (from a work dir holding nmb/txt/<id>.txt or <id>.ocr.txt):
  python3 nmb_parse.py  -> writes nmb/items.json"""
import re,glob,json,os
from datetime import datetime
MEM=['DeFillipo','Joseph','Chernoff','Fleurimond','Jean','Smith','Smukler','Su']
def load(i):
    p='nmb/txt/%s.txt'%i
    t=open(p,errors='ignore').read()
    if len(t)<500 and os.path.exists('nmb/txt/%s.ocr.txt'%i): t=open('nmb/txt/%s.ocr.txt'%i,errors='ignore').read()
    return t
def mdate(t):
    m=re.search(r'(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Z][a-z]+)\s+(\d{1,2}),?\s+(20\d\d)',t[:4000])
    if not m: return None
    try: return datetime.strptime('%s %s %s'%m.groups(),'%B %d %Y').strftime('%Y-%m-%d')
    except Exception: return None
ITEM=re.compile(r'^\s*(\d{1,2}\.\d{1,2})\.?\s+(.*)$')
VOTE=re.compile(r'(MO[TI]+ON\s+(?:PASSED|FAILED|CARRIED)[^\n]*(?:\n[^\n]{0,120})?)',re.I)
ROLL=re.compile(r'Roll\s*Call\s*Vote:?([^\n]*(?:\n[^\n]*)?)',re.I)
def items(t):
    lines=[re.sub(r'\s+',' ',l).strip() for l in t.split('\n')]
    out=[];cur=None;sec=None
    for l in lines:
        if not l: continue
        ms=re.match(r'^(\d{1,2})\.\s+([A-Z][A-Z \-/&]{3,})$',l)
        if ms: sec=ms.group(2).strip(); 
        m=ITEM.match(l)
        if m and int(m.group(1).split('.')[0])<25:
            cur={'num':m.group(1),'head':m.group(2),'sec':sec,'text':[]}; out.append(cur); continue
        if ms: cur=None; out.append({'num':'S'+ms.group(1),'head':ms.group(2),'sec':sec,'text':[]}); cur=out[-1]; continue
        if cur is not None: cur['text'].append(l)
    for o in out: o['text']='\n'.join(o['text'])
    return out
if __name__=='__main__':
    res={}
    for p in sorted(glob.glob('nmb/txt/*.txt')):
        i=os.path.basename(p).split('.')[0]
        if i in res: continue
        t=load(i); d=mdate(t)
        if not d: continue
        its=items(t)
        for o in its:
            o['votes']=[v.replace('\n',' ') for v in VOTE.findall(o['text'])]
            o['roll']=[v.replace('\n',' ') for v in ROLL.findall(o['text'])]
        res[i]={'date':d,'present':re.search(r'Present[^\n]*(?:\n[^\n]*){0,6}',t).group(0) if re.search(r'Present',t) else '','items':its}
    json.dump(res,open('nmb/items.json','w'),indent=0)
    print(len(res),sorted((v['date'],k) for k,v in res.items()))
