import re,json,sys
KNOWN=['COSGROVE','SOCHIN','VROOMAN','MEERBOTT','BELL','MACDOUGALL','MIXON','LOYZELLE','CORIAT','CALLAHAN','DUNCAN','LORD','RAMIREZ']
VT=r'(YES|NO|ABSENT|ABSTAIN\w*|RECUSED|EXCUSED)'
def parse(path,kind):
    L=open(path,errors='ignore').read().split('\n')
    hdr=None; out=[]; starts=[]
    for i,l in enumerate(L):
        l0=re.sub(r'\b(Adopted|Number|Passed|Date|Vote|&)\b',lambda m_:' '*len(m_.group()),l)
        w=l0.split()
        if w and all(re.match(r'^[A-Z]+$',x) for x in w) and sum(1 for x in w if any(k.startswith(x) and len(x)>=2 for k in KNOWN))>=4 and len(w)<=6:
            full=[next((k for k in KNOWN if k.startswith(x)),x) for x in w]
            pos=[m_.start()+len(m_.group())/2 for m_ in re.finditer(r'[A-Z]+',l0)]
            hdr=full; hpos=pos; continue
        m=re.match(r'^\s*(?:Ordinance\s+|Ord\.\s*)?(\d{2}-\d+[A-Z]?)\s+(\d{1,2}/\d{1,2}/\d{2,4})(.*)$',l)
        if m:
            rest=m.group(3); votes=re.findall(VT,rest[-60:])
            mm=re.search(r'((?:\s+'+VT+r')+)\s*$',rest)
            votes=re.findall(VT,mm.group(1)) if mm else []
            txt=rest[:mm.start()] if mm else rest
            vpos=[]
            if mm:
                off=len(l)-len(rest)+mm.start(1)
                vpos=[off+v.start()+len(v.group())/2 for v in re.finditer(VT,mm.group(1))]
            roll=None
            if hdr:
                if len(votes)==len(hdr): roll={h:v.lower() for h,v in zip(hdr,votes)}
                elif votes:
                    roll={}
                    for v,p_ in zip(votes,vpos):
                        k=min(range(len(hdr)),key=lambda j:abs(hpos[j]-p_)); roll[hdr[k]]=v.lower()
                    roll['_aligned']=True
            out.append(dict(num=m.group(1),date=m.group(2),hdr=list(hdr) if hdr else None,votes=votes,line=i,first=txt.strip(),roll=roll))
    # titles: from the 'A RESOLUTION'/'AN ORDINANCE' line before or at entry line to the next one
    begin=[i for i,l in enumerate(L) if re.search(r'\b(A RESOLUTION|AN ORDINANCE|A JOINT RESOLUTION)\b',l)]
    import bisect
    for e in out:
        j=bisect.bisect_right(begin,e['line'])-1
        b=begin[j] if j>=0 else e['line']; nb=begin[j+1] if j+1<len(begin) else len(L)
        seg=[]
        for l in L[b:nb]:
            if re.search(r'Page \d+ of \d+|Resolutions Register|Ordinances Register|Date Passed|Descriptive Title|^\s*Adopted\s*$|^\s*Number',l): continue
            if any(k in l for k in ('COSGROVE   ','MACDOUGALL   ','MEERBOTT   ','BELL   SOCHIN','BELL   LOYZELLE')) and 'RESOLUTION' not in l: continue
            l=re.sub(r'^\s*(?:Ordinance\s+)?\d{2}-\d+[A-Z]?\s+\d{1,2}/\d{1,2}/\d{2,4}','',l)
            l=re.sub(r'(\s+'+VT+r')+\s*$','',l)
            seg.append(l.strip())
        e['title']=re.sub(r'\s+',' ',' '.join(seg)).strip()
        mo,d,y=e['date'].split('/'); y=y if len(y)==4 else '20'+y; e['date']='%s-%02d-%02d'%(y,int(mo),int(d))
        e['kind']=kind
    return out
if __name__=='__main__':
    r=parse('cb/resolutions_register.txt','R')+parse('cb/ordinances_register.txt','O')
    json.dump(r,open('cb/register.json','w'),indent=0)
    import collections
    print(len(r),collections.Counter((x['kind'],x['date'][:4],x['roll'] is not None) for x in r if '2010'<=x['date'][:4]<='2018'))
