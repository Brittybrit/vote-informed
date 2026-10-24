import sys,json,re
# usage: _norm.py <id> <prefix-for-letter-only-n> ; stdin = raw JSON lines from WebFetch
rid,pre=sys.argv[1],sys.argv[2]
objs=[json.loads(l) for l in sys.stdin if l.strip()]
roll=objs[0]['roll']; out=[{"roll":roll}]
for o in objs[1:]:
    n=str(o['n']); 
    if re.fullmatch(r'[A-Z]{1,2}',n): n=pre+n
    o['n']=n
    a=o.get('amt')
    if isinstance(a,str):
        m=re.search(r'[\d,]+(\.\d+)?',a); o['amt']=float(m.group(0).replace(',','')) if m else None
    if o.get('amt')==0: o['amt']=None
    ref=o.get('ref') or ''
    m=re.search(r'(Res(?:olution)?\.?|Ord(?:inance)?\.?)\s*(\d{4}-\d{3})',ref)
    if m: o['ref']=('Res. ' if m.group(1).startswith('R') else 'Ord. ')+m.group(2)
    elif re.fullmatch(r'\d{4}-\d{3}',ref):
        o['ref']=('Ord. ' if int(ref[5:])<100 else 'Res. ')+ref
    else: o['ref']=None if not re.search(r'\d{4}-\d{3}',ref) else ref
    o.setdefault('abst',[])
    out.append(o)
open(rid+'.jsonl','w').write('\n'.join(json.dumps(x,ensure_ascii=False) for x in out)+'\n'); print(rid,len(out)-1)
