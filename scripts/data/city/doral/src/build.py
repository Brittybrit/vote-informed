import json, re, os, sys
from collections import Counter
SP=os.path.dirname(os.path.abspath(__file__))
REPO=os.path.abspath(os.path.join(SP,'..','..','..','..','..'))
M=['Fraga','Porras','Cabral','Pineyro','Reinoso']
meet=json.load(open(SP+'/meetings.json'))
mon={m:i+1 for i,m in enumerate(['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'])}
mdate={}; meetings=[]
for cid,name,dl,url in meet:
    m=re.search(r'([A-Z]+) (\d+), (\d{4})',dl); d='%s-%02d-%02d'%(m.group(3),mon[m.group(1)],int(m.group(2)))
    mdate[cid]=d; meetings.append({'date':d,'name':name.title(),'clip_id':int(cid),'url':url,'read':True})
meetings.sort(key=lambda x:(x['date'],x['clip_id']))
prior=[b for b in json.load(open(REPO+'/public/data/decisions.json'))['bodies'] if b['key']=='doral'][0]['actions']
pmap={}
for a in prior:
    for r in [s.strip() for s in a['ref'].split(',')]:
        pmap.setdefault((a['date'],r),a)
used=set(); actions=[]; issues=[]
for line in open(SP+'/doral_rows.txt'):
    if line.startswith('#') or not line.strip(): continue
    c,item,f,kind,amt,parties,title,roll,mover,second,result,rd,ordn,note=line.rstrip('\n').split('|')
    date=mdate[c]
    rollD={n:{'Y':'yes','N':'no','A':'absent'}[roll[i]] for i,n in enumerate(M)}
    y=sum(v=='yes' for v in rollD.values()); n_=sum(v=='no' for v in rollD.values())
    p=pmap.get((date,f)); aid=None
    if p and p['id'] not in used:
        aid=p['id']; used.add(aid)
        if p.get('roll') and p['roll']!=rollD: issues.append((aid,p['roll'],rollD))
    if not aid: aid='doral-%s-%s'%(f,date)
    ref=f + (' (Ord. %s)'%ordn if ordn else '')
    notes=[]
    consent = result=='consent'
    if consent: notes.append('Approved on consent agenda; roll is the consent vote')
    if rd=='1': notes.append('First reading')
    if rd=='2': notes.append('Second reading (final adoption)')
    if note: notes.append(note)
    actions.append({'id':aid,'date':date,'ref':ref,'item':item,'title':title,'kind':kind,'parties':[s.strip() for s in parties.split(';') if s.strip()],
      'amount':float(amt) if amt else None,'url':[x['url'] for x in meetings if x['clip_id']==int(c)][0],
      'roll':rollD,'tally':[y,n_],'result':'failed' if result=='failed' else 'adopted','consent':consent,
      'mover':mover or None,'second':second or None,'notes':'; '.join(notes)})
dupids=[k for k,v in Counter(a['id'] for a in actions).items() if v>1]
for i,a in enumerate(actions):
    if a['id'] in dupids: a['id']+='-'+a['item']
missing=[a['id'] for a in prior if a['id'] not in used]
gaps=[
 'Oct 7, 2026 council meeting (clip 853): agenda and video posted, minutes not yet posted; not read. The AgendaViewer page would not load from this environment, so its items are not included.',
 'Granicus blocks automated fetching (robots); minutes were read through a browser session. Votes and attendance come only from the minutes text.',
 'Votes are as the minutes record them. Consent items carry the consent motion vote with attendance from the roll call at the start of the meeting session (morning or evening) in which the item was heard.',
 'Some parties are not named in the minutes (cooperative-contract IT resellers, contractor pools under RFQ 2025-06/2025-07, public art artists, the applicant on 26-6681); these are flagged in parties.',
 'Amounts are taken from item titles; many items say only "not to exceed budgeted funds" and have amount null. Grant totals are summed from the listed awards.',
 'Excluded by rule: proclamations, presentations, board nominations, budget/millage ordinances, job descriptions and pay plans, the city manager, police chief and inspector general employment items, generic code text amendments without a named applicant, interlocal/mutual aid/MOU items with only government parties, budget transfers with no named vendor, and items withdrawn, deferred or tabled without a final vote.',
 'Local Planning Agency sessions (transmittal recommendations only) were read but not counted as Council actions; the same items appear as Council first/second reading votes.',
 'Item 25-6177 (city attorney retainer increase) appears approved on consent at both the May 14 and June 4, 2025 meetings; both are listed.',
 'Item 25-6320 (Pereyra-Diaz settlement) failed 2-3 and is listed with result failed.',
]
if missing: gaps.append('Prior-build ids not matched to a row here: '+', '.join(missing))
out={'city':'Doral','body':'doral','window':{'from':'2025-01-01','to':meetings[-1]['date'],'lastPostedMinutes':meetings[-1]['date']},
 'members':M,
 'sources':['https://cityofdoral.granicus.com/ViewPublisher.php?view_id=2','Doral City Council final minutes, Granicus MinutesViewer view_id=2 (one URL per meeting below)'],
 'meetings':meetings,'actions':actions,'gaps':gaps}
os.makedirs(REPO+'/scripts/data/city/doral',exist_ok=True)
json.dump(out,open(REPO+'/scripts/data/city/doral/actions.json','w'),indent=1,ensure_ascii=False)
print(len(meetings),'meetings',len(actions),'actions')
print(Counter(a['kind'] for a in actions))
print('consent',sum(a['consent'] for a in actions),'split',sum(a['tally'][1]>0 for a in actions))
print('prior matched',len(used),'missing',missing)
for i in issues: print('ROLL DIFF',i)
