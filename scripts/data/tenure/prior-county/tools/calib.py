import json,sys,re,collections
sys.path.insert(0,'/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/pc/tools')
import parse
from sel import *
from classify import *
A=json.load(open('/home/claude/vote-informed/scripts/data/county/actions.json'))
theirs={a['id']:a for a in A['actions']}
un={x[1] for x in json.load(open('/home/claude/vote-informed/scripts/data/tenure/county/unnamed.json'))}
mine={};mine_un=set()
for m in A['meetings']:
    p=parse.parse(str(m['meetId']))
    for it in p['items']:
        r=candidate(it)
        if not r: continue
        T=it['title'].upper()
        kind,lab=classify(T)
        if excluded(T,kind): mine_un.add(it['id']); continue
        ps=parties_for(it,kind)
        if ps: mine[it['id']]=(ps,kind,lab,T[:200])
        else: mine_un.add(it['id'])
both=set(mine)&set(theirs)
print('theirs',len(theirs),'mine',len(mine),'both',len(both),'mine-not-theirs',len(set(mine)-set(theirs)),'theirs-not-mine',len(set(theirs)-set(mine)))
print('mine-not-theirs that are in their unnamed',len((set(mine)-set(theirs))&un))
import random;random.seed(5)
print('--- mine not theirs');[print(i,mine[i][0],mine[i][2],'|',mine[i][3][:160]) for i in random.sample(sorted(set(mine)-set(theirs)),25)]
print('--- theirs not mine');[print(i,theirs[i]['parties'],theirs[i]['title'],'|',theirs[i]['titleFull'][:160]) for i in random.sample(sorted(set(theirs)-set(mine)),min(25,len(set(theirs)-set(mine))))]
agree=sum(1 for i in both if set(x.lower() for x in mine[i][0])==set(x.lower() for x in theirs[i]['parties']))
print('party exact agree',agree,len(both))
