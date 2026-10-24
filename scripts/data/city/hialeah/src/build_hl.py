import json,glob,os,re,collections
import os
HL=os.path.join(os.path.dirname(os.path.abspath(__file__)),'hl')+'/'
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','actions.json')
MN=lambda i:'https://www.hialeahfl.gov/AgendaCenter/ViewFile/Minutes/_'+i
AG=lambda i:'https://www.hialeahfl.gov/AgendaCenter/ViewFile/Agenda/_'+i
def norm(n): return 'M. Perez' if n=='Perez' else n
LEG={('2026-10-13','17E'):'hialeah-2026-10-13-E13',('2026-10-13','17D'):'hialeah-2026-10-13-E8',('2026-09-22','11A'):'hialeah-2026-09-22-LENNAR',
('2026-09-22','10Q'):'hialeah-2026-09-22-SFM',('2026-09-08','17D'):'hialeah-2026-09-08-1033',('2026-09-08','16A'):'hialeah-2026-09-08-OKEE2',('2026-09-08','17C'):'hialeah-2026-09-08-OKEE2',
('2026-09-08','10M'):'hialeah-2026-09-08-WW',('2026-08-25','16B'):'hialeah-2026-08-25-OKEE1',('2026-08-25','17F'):'hialeah-2026-08-25-OKEE1',
('2026-08-11','10D'):'hialeah-2026-08-11-SRS',('2026-05-12','10L'):'hialeah-2026-05-12-L',('2026-04-28','15A'):'hialeah-2026-04-28-E17',('2026-04-28','16E'):'hialeah-2026-04-28-E17',
('2026-04-28','10M'):'hialeah-2026-04-28-VZ',('2026-04-14','15A'):'hialeah-2026-04-14-E17',('2026-04-14','16I'):'hialeah-2026-04-14-E17',('2026-03-10','W12'):'hialeah-2026-03-10-W12',
('2026-03-10','16A'):'hialeah-2026-03-10-W60',('2026-03-10','17A'):'hialeah-2026-03-10-W60',('2026-02-24','17B'):'hialeah-2026-02-24-W56',('2026-01-27','17A'):'hialeah-2026-01-27-E19',('2026-01-27','18A'):'hialeah-2026-01-27-E19'}
AE_DATE='2026-08-11'
meetings=[];actions=[];ids=collections.Counter();mism=[]
files=sorted(glob.glob(HL+'[0-9]*.jsonl'),key=lambda f:(os.path.basename(f)[4:8],os.path.basename(f)[:4],f))
for f in files:
    fid=os.path.basename(f)[:-6]; d=f'{fid[4:8]}-{fid[0:2]}-{fid[2:4]}'
    L=[json.loads(l) for l in open(f) if l.strip()]
    hd=L[0]; roll=hd['roll']
    pres=[norm(x) for x in roll['present']]; absn=[norm(x) for x in roll['absent']]
    seated=pres+[x for x in absn if x not in pres]
    m={'date':d,'url':AG(fid),'minutes':MN(fid),'read':True,'present':pres,'absent':absn}
    if hd.get('note'): m['note']=hd['note']
    meetings.append(m)
    for o in L[1:]:
        n=str(o['n']); ab=[norm(x) for x in o.get('ab',[])]; no=[norm(x) for x in o.get('no',[])]; abst=[norm(x) for x in o.get('abst',[])]
        t=o.get('t'); tally=[int(x) for x in re.findall(r'\d+',t)] if t else None
        r={}
        if o['r']=='postponed' and not tally:
            r=None
        else:
            for mem in seated:
                if mem in abst: r[mem]='abstain'
                elif mem in ab: r[mem]='absent'
                elif mem in no: r[mem]='no'
                elif mem in absn: r[mem]='absent'
                else: r[mem]='yes'
        notes=[]
        if o.get('note'): notes.append(o['note'])
        if o.get('lobbyist'): notes.append('Registered lobbyist named in minutes: '+o['lobbyist']+'.')
        if r and tally:
            y=sum(v=='yes' for v in r.values()); nn=sum(v=='no' for v in r.values())
            if (y,nn)!=(tally[0],tally[1] if len(tally)>1 else 0):
                notes.append(f'Recorded tally {t} does not match the roll computed from attendance (yes {y}, no {nn}); who missed the vote is not stated.')
                mism.append((d,n,t,y,nn))
                r={k:('unknown' if v=='yes' else v) for k,v in r.items()}
        if o['r']=='first reading': notes.append('First reading; final vote at second reading.')
        ref=o.get('ref')
        mref=re.match(r'(Res|Ord)\. (\d{4}-\d{3})$',ref or '')
        aid=(f'hialeah-{mref.group(1).lower()}-{mref.group(2)}' if mref else f'hialeah-{d}-{n}')
        ids[aid]+=1
        if ids[aid]>1: aid+=f'-{ids[aid]}'
        amt=o.get('amt')
        if isinstance(amt,str):
            mm=re.search(r'[\d,]+(\.\d+)?',amt); amt=float(mm.group(0).replace(',','')) if mm else None
        if amt==0: amt=None
        if isinstance(amt,float) and amt.is_integer(): amt=int(amt)
        a={'id':aid,'date':d,'ref':(ref+', ' if ref else '')+f'item {n}, {d} council meeting','title':o['s'],'kind':o['k'],
           'parties':o['p'],'amount':amt,'url':MN(fid),'agenda':AG(fid),'consent':bool(o.get('c')),'result':o['r'],
           'roll':r,'tally':tally,'mover':norm(o['mv']) if o.get('mv') else None,'second':norm(o['sc']) if o.get('sc') else None,'notes':' '.join(notes)}
        lg=LEG.get((d,n))
        if not lg and d==AE_DATE and 'RFQ 2024-25-046' in o['s']: lg='hialeah-2026-08-11-AE'
        if lg: a['legacyId']=lg
        actions.append(a)
legs=['hialeah-2026-10-13-E13','hialeah-2026-10-13-E8','hialeah-2026-09-22-LENNAR','hialeah-2026-09-22-SFM','hialeah-2026-09-08-1033','hialeah-2026-09-08-OKEE2','hialeah-2026-09-08-WW','hialeah-2026-08-25-OKEE1','hialeah-2026-08-11-AE','hialeah-2026-08-11-SRS','hialeah-2026-05-12-L','hialeah-2026-04-28-E17','hialeah-2026-04-28-VZ','hialeah-2026-04-14-E17','hialeah-2026-03-10-W12','hialeah-2026-03-10-W60','hialeah-2026-02-24-W56','hialeah-2026-01-27-E19']
found={a.get('legacyId') for a in actions}; missing=[x for x in legs if x not in found]
gaps=['Jan 13, 2026 regular meeting: the minutes link on AgendaCenter opens the Jan 27, 2026 minutes, so that meeting was not read.',
 'Oct 27, 2026 meeting: no minutes posted yet.',
 'Oct 28, 2025 meeting: no quorum, no business; items moved to Nov 18, 2025.',
 'Workshops and town halls (Aug 13-14, Sep 14-15, 2026) are non-voting and were not read.',
 'Minutes were read through WebFetch summaries of the minutes PDFs, not a verbatim transcription; refs, amounts and spellings should be spot-checked against the signed resolutions/ordinances before publishing.',
 'Rolls are computed from the meeting roll call plus members the minutes name as absent, no or abstaining for each item; where the recorded tally disagrees with that, the action notes say so.',
 'Oct 13, 2026 consent agenda (6-0-1): the summary names Rodriguez absent for some items and Gonzalez for others; check the signed minutes.',
 'Applicant/owner names come from the minutes item captions; beneficial owners of LLCs were not traced.',
 '2025 council seat changes (Garcia-Roves gone after Apr 2025, Junco not listed from Nov 2025) are taken from each meeting roll; rolls include only members listed at that meeting.']
if missing: gaps.append('Legacy actions not matched: '+', '.join(missing))
D={'city':'Hialeah','body':'hialeah','window':['2025-01-01','2026-10-13'],
 'sources':['Hialeah AgendaCenter minutes and agendas: https://www.hialeahfl.gov/AgendaCenter (ViewFile/Minutes/_<id>, ViewFile/Agenda/_<id>)','public/data/decisions.json body "hialeah" (legacy ids kept as legacyId)'],
 'method':'Every posted City Council regular and special meeting from 2025-01-14 to 2026-10-13 was read from its minutes. Kept voted items that name or benefit a private party: contracts, purchase orders and increases, bid waivers, piggybacks, zoning/land use/variances/special use permits/plats, leases, grants and subrecipient agreements, union contracts, agreements, alley vacations, special event and fireworks permits. Excluded proclamations, appointments, minutes, budgets/millage, internal staffing, generic code changes and government-only items. Each reading of an ordinance is a separate action. Donors were not consulted. "Perez" in 2025 minutes is Monica Perez (M. Perez).',
 'meetings':meetings,'actions':actions,'gaps':gaps}
# Corrections from the check against the minutes (spotcheck.json, 2026-10-24) and Sunbiz
for a in actions:
    # At these three meetings the minutes number the consent agenda as section 10, not 12
    if a['date'] in ('2025-06-24','2025-09-23','2025-10-14'):
        a['ref']=re.sub(r'item 12([A-Z]+)', r'item 10\1', a['ref'])
    # Sunbiz: COMPASS OFFICE SOLUTIONS LLC (M06000000058); the minutes reverse the words
    if a['id']=='hialeah-2025-08-12-10FF':
        a['title']=a['title'].replace('Office Compass Solutions','Compass Office Solutions')
        a['notes']=(a['notes']+' ' if a['notes'] else '')+'The minutes name the vendor "Office Compass Solutions"; the registered company is Compass Office Solutions LLC (Sunbiz M06000000058).'
    # Sunbiz: MAXVALE HOLDINGS, LLC (L13000077172); the minutes also print "Maxuale"
    a['parties']=['Maxvale Holdings, LLC' if x in ('Maxuale Holdings LLC','Maxvale Holdings LLC') else x for x in a['parties']]
    # The minutes print "APPROVED 5-1" with five members present, all voting yes: a typo, not a dissent
    if a['id']=='hialeah-2025-12-09-10L':
        a['tally']=[5,0]; a['roll']={k:'yes' for k in a['roll']}
        a['notes']='The minutes print "APPROVED 5-1", but list five members present and all five voting yes; shown as 5-0.'
json.dump(D,open(OUT,'w'),ensure_ascii=False,indent=1)
print(len(meetings),len(actions),collections.Counter(a['kind'] for a in actions),collections.Counter(a['result'] for a in actions))
print('missing legacy',missing); print('mismatch',len(mism)); [print(x) for x in mism]
