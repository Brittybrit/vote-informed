import json,re,sys
d=json.load(open('acts.json')); R=json.load(open('rollidx.json'))
OK=re.compile(r'(?i)(On passage|suspend the rules and pass|agree to the Senate amendment|agree with an amendment to the Senate amendment|agree(ing)? to the conference report|suspend the rules and agree|concur|objections of the President to the contrary notwithstanding|passage, the objections|having voted in the affirmative the bill is passed|asked unanimous consent that the House agree|Pursuant to the provisions of H\. ?Res\. \d+.{0,80}(agreed|considered as agreed|passed))')
BAD=re.compile(r'(?i)recommit|table|instruct|close portions|disagree|previous question|providing for consideration|ordered to be reported|motion to reconsider|POSTPONED PROCEEDINGS|POSITION STATEMENTS|ORDER OF PROCEDURE|DEBATE -|considered under|the Chair put')
out={}
for p,x in d.items():
    hs=sorted([a for a in x['acts'] if a[1].startswith('House') and OK.search(a[2]) and not BAD.search(a[2])],key=lambda a:a[0])
    if not hs: out[p]={'bill':x['bill'],'final':None}; continue
    last=hs[-1]['0'] if False else hs[-1][0]
    same=[a for a in hs if a[0]==last]
    f=next((a for a in same if re.search(r'Roll [Nn]o\.? ?\d+',a[2])),same[-1])
    m=re.search(r'Roll [Nn]o\.? ?(\d+)',f[2])
    hres=re.search(r'H\. ?Res\. ?(\d+)',f[2])
    o={'bill':x['bill'],'final':f[0],'text':f[2][:220],'roll':int(m.group(1)) if m else None,'hres':hres.group(1) if hres else None,
            'method':None if m else ('voice vote' if 'voice' in f[2].lower() else 'unanimous consent' if re.search(r'objection|unanimous',f[2],re.I) else 'rule (H.Res.)' if hres else 'other')}
    if not m:
        earlier=[a for a in hs if re.search(r'Roll [Nn]o\.? ?\d+',a[2])]
        if earlier:
            e=earlier[-1]; o['finalMethod']=o['method']; o['finalDate']=f[0]
            o['roll']=int(re.search(r'Roll [Nn]o\.? ?(\d+)',e[2]).group(1)); o['final']=e[0]; o['text']=e[2][:220]; o['method']=None
            o['note']='The House took its last step on ' + f[0] + ' by ' + o['finalMethod'] + '; this is the earlier recorded House vote on the bill (' + e[0] + ').'
    out[p]=o
json.dump(out,open(sys.argv[1],'w'),indent=1)
import collections
print(collections.Counter('roll' if v.get('roll') else (v.get('method') or 'none') for v in out.values()))
for p,v in sorted(out.items()):
    if not v.get('roll') and v.get('method') not in ('voice vote',): print(p,v['bill'],v.get('final'),v.get('method'),(v.get('text') or '')[:140])
