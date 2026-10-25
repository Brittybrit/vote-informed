# Preliminary gift matching (the coordinator's county scripts do the official match): a contribution to the
# member's county campaign whose contributor name equals an action party (ignoring punctuation and corporate suffix) or a
# lobbyist registered for that party, given on or before the vote date, for actions where the member voted yes or no
# (Gimenez as mayor: every action in his mayoral window; counted separately, never as votes).
import csv,json,sys,re,collections
BASE='/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/pc/'
D='/home/claude/vote-informed/scripts/data/tenure/prior-county/donors/'
sys.path.insert(0,BASE+'tools'); from normlib import norm,core
def load(files):
    R=[]
    for f in files:
        for r in csv.DictReader(open(D+f,encoding='latin-1')):
            if r['Cont/Exp']!='C': continue
            R.append({'file':f,'date':r['item date'],'name':re.sub(r'\s+',' ',r['name']).strip(),'amount':float(r['amount'] or 0),'occupation':r['occupation'].replace('<br>',' '),'type':r['cont. type'],'addr':r['address 1'],'city':r['city']})
    return R
def pn(s):  # person-name key: first + last tokens
    t=re.sub(r'[^A-Z ]',' ',s.upper()).split(); t=[x for x in t if x not in('JR','SR','II','III','IV','ESQ','MR','MS','DR')]
    return (t[0],t[-1]) if len(t)>=2 else None
def match(A,R,who,mode):
    byc=collections.defaultdict(list); byp=collections.defaultdict(list)
    for r in R:
        byc[core(r['name'])].append(r)
        k=pn(r['name'])
        if k and r['type']=='I': byp[k].append(r)
    out=[]
    for a in A:
        if mode=='vote':
            v=a['roll'].get(who)
            if v not in('yes','no'): continue
        hits=[]
        for p in a['parties']:
            for r in byc.get(core(p),[]):
                if r['date']<=a['date']: hits.append(dict(r,why='party',party=p))
        for l in a.get('lobbied',[]):
            k=pn(l['name'])
            for r in byp.get(k,[]):
                if r['date']<=a['date']: hits.append(dict(r,why='lobbyist',lobbyist=l['name'],party=l['for']))
        if hits:
            out.append({'id':a['id'],'date':a['date'],'title':a['title'],'parties':a['parties'],'vote':a['roll'].get(who) if mode=='vote' else None,'gifts':hits})
    return out
