# split each packet text into minutes documents keyed by meeting date + type
import re,os,json,sys
from datetime import datetime
D='/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/sm/'
out={}
for f in sorted(os.listdir(D+'pk')):
    if not f.endswith('.txt'): continue
    L=open(D+'pk/'+f,errors='replace').read().split('\n')
    i=0
    while i<len(L)-4:
        if re.match(r'^\s*\d*\s+City of South Miami\s*$',L[i]) and re.search(r'Commission.*Minutes|Minutes',L[i+1]):
            kind=L[i+1].strip(); kind=re.sub(r'^\d+\s+','',kind)
            m=re.search(r'([A-Z][a-z]+ \d{1,2}, ?\d{4})',L[i+2])
            if not m: i+=1; continue
            try: d=datetime.strptime(m.group(1).replace(', ',', ').replace(',2',', 2'),'%B %d, %Y').strftime('%Y-%m-%d')
            except: i+=1; continue
            j=i+3
            while j<len(L) and not re.match(r'^\s*(Item Type:|Agenda Item No)',L[j]) and not (re.match(r'^\s*\d*\s+City of South Miami\s*$',L[j]) and 'Minutes' in L[j+1]): j+=1
            key=d+'|'+kind
            txt='\n'.join(L[i:j])
            if key not in out or len(txt)>len(out[key]['text']):
                out[key]={'packet':f[:-4],'text':txt}
            i=j
        else: i+=1
json.dump(out,open(D+'minutes.json','w'))
for k in sorted(out): print(k,out[k]['packet'],len(out[k]['text']))
