"""Merge stage files into universe.json. Rerunnable; reads enacted.json + stageA/B/C.jsonl."""
import json
def jl(f): return [json.loads(l) for l in open(f) if l.strip()]
rows=json.load(open('enacted.json'))
A={x['ch']:x for x in jl('stageA.jsonl')}
B={x['ch']:x for x in jl('stageB.jsonl')}
C={x['u']:x for x in jl('stageC.jsonl')}
HOUSE=["Basabe","Gantt","Blanco","Chambliss","Redondo","Porras","Nixon"]
SENATE=["Garcia","Calatayud","Rodriguez","Ingoglia"]
out=[]
for r in rows:
    ch=r['chapter']; b=dict(r)
    a=A.get(ch); s=B.get(ch)
    b['status']='pending-bill-page' if not a else ('pending-analysis' if not s else 'assessed')
    if a: b['analyses']=[u for d,u in a['an']]
    if s:
        b['analysisUrl']=s['au']
        b['benefits']=({"category":s['cat'],"named":s.get('named',[]),"quote":s['q']} if s['b'] else None)
        if s.get('note'): b['note']=s['note']
    if a and s and s['b']:
        v={}
        for chamber,key,mem in (('H','house',HOUSE),('S','senate',SENATE)):
            fv=[x for x in a['fv'] if x['c']==chamber and 'amendment' not in x['a']]
            if not fv: continue
            last=fv[-1]  # final passage vote in that chamber (3rd reading or concurrence)
            c=C.get(last['u'])
            v[key]={"date":last['d'],"action":last['a'],"tally":[last['y'],last['n']],"url":last['u'],
                    "roll":(c['r'] if c else None)}
            if len(fv)>1: v[key]['earlier']=[{"date":x['d'],"action":x['a'],"tally":[x['y'],x['n']],"url":x['u'],"roll":(C[x['u']]['r'] if x['u'] in C else None)} for x in fv[:-1]]
        b['votes']=v
    out.append(b)
U={"generated":"2026-10-24","rule":"Every bill enacted (chapter law) in the 2025 regular session, 2025 special sessions A-C, 2026 regular session and 2026 special sessions D-F whose final staff analysis Private Sector Impact names a business category or company that benefits.",
   "sessions":["2025","2025A","2025B","2025C","2026","2026D","2026E","2026F"],
   "sources":["https://www.flsenate.gov/Session/Bills/2025","https://www.flsenate.gov/Session/Bills/2025C","https://www.flsenate.gov/Session/Bills/2026D","https://www.flsenate.gov/Session/Bills/2026F","http://laws.flrules.org/node"],
   "counts":{"enacted":len(out),"assessed":sum(1 for b in out if b['status']=='assessed'),
             "qualifying":sum(1 for b in out if b.get('benefits')),"pending":sum(1 for b in out if b['status']!='assessed')},
   "bills":out}
json.dump(U,open('universe.json','w'),indent=1,ensure_ascii=False)
print(U['counts'])
