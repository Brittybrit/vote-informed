# Stage 1: every final BCC action 1998-06-02..2020-11-17 that names a private party, with roll from the minutes.
import json,sys,re,os,collections
BASE='/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/pc/'
sys.path.insert(0,BASE+'tools')
from classify import *
from sel import *
KEY={'Dorrin D. Rolle':'Rolle','Katy Sorenson':'Sorenson','Dennis C. Moss':'Moss','Sen. Javier D. Souto':'Souto','Betty T. Ferguson':'Ferguson',
 'Jimmy L. Morales':'Morales','Gwen Margolis':'Margolis','Dr. Miriam Alonso':'Alonso','Miguel Diaz de la Portilla':'Diaz de la Portilla',
 'Pedro Reboredo':'Reboredo','Natacha Seijas Millan':'Seijas','Natacha Seijas':'Seijas','Dr. Barbara M. Carey':'Carey-Shuler','Dr. Barbara M. Carey-Shuler':'Carey-Shuler',
 'Dr. Barbara Carey-Shuler':'Carey-Shuler','Bruno A. Barreiro':'Barreiro','Joe A. Martinez':'Martinez','Rebeca Sosa':'Sosa','Jose"Pepe" Cancio, Sr.':'Cancio',
 'Sally A. Heyman':'Heyman','Jose "Pepe" Diaz':'Diaz','Barbara J. Jordan':'Jordan','Carlos A. Gimenez':'Gimenez','Audrey M. Edmonson':'Edmonson',
 'Jean Monestime':'Monestime','Lynda Bell':'Bell','Xavier L. Suarez':'Suarez','Esteban L. Bovo, Jr.':'Bovo','Juan C. Zapata':'Zapata','Daniella Levine Cava':'Levine Cava',
 'Eileen Higgins':'Higgins','Joe A. Martinez':'Martinez'}
TOKKEY={'Millan':'Seijas','Seijas Millan':'Seijas','Carey':'Carey-Shuler','Cava':'Levine Cava','Levine Cava':'Levine Cava','Bovo, Jr.':'Bovo','Cancio, Sr.':'Cancio'}
NAME={v:k for k,v in KEY.items()}
def tokkey(t):
    t=t.strip()
    return TOKKEY.get(t,t)
def splitlist(v):
    s=', '.join(v) if isinstance(v,list) else v
    s=s.replace('Jr.','').replace('Sr.','')
    return [tokkey(x) for x in re.split(r'\s*,\s*',s) if x.strip() and not re.search(r'Vacant|Suspended',x)]
def rows():
    out=[]
    for l in open(BASE+'meetings.tsv'):
        d,i,b,r=(l.rstrip('\n').split('\t')+[''])[:4]
        f=BASE+f'parsed/{i}.json'
        if os.path.exists(f): out.append((d,i,b,r,f))
        else: out.append((d,i,b,r,None))
    return out
unknown_names=collections.Counter()
def main():
    meetings=[];acts={};unnamed=[];mism=[];allfinal=0;vetoes=[]
    for d,i,b,r,f in rows():
        meetings.append({'date':d,'meetId':int(i),'body':'zoning' if b in('ZB','CDMP') else 'bcc','list':b,'status':r,'read':bool(f),'url':f'https://www.miamidade.gov/govaction/commminute.asp?cmbmeetdate={i}&file=false'})
        if not f or not ('1998-06-16'<=d<='2020-11-16'): continue
        p=json.load(open(f))
        seat={}
        for k,v in p['att'].items():
            for n in v:
                if re.search(r'Vacant|Suspended',n): continue
                kk=KEY.get(n)
                if not kk: unknown_names[n]+=1; continue
                seat[kk]=k
        late=[k for k,v in seat.items() if v=='Members Late']
        zon = b in ('ZB','CDMP')
        for it in p['items']:
            if it['type']=='Mayoral Veto' or re.search(r'(?i)veto',it['result'].split('\n')[0]):
                r0=res_parse(it['result'])
                if re.search(r'(?i)overrid|sustain|veto',r0['action']):
                    no=splitlist(r0['no']); ab=splitlist(r0['absent'])+splitlist(r0['ocb']); ex=splitlist(r0['excused']); coi=splitlist(r0['coi'])
                    orl={k:('no' if k in no else 'recused' if k in coi else 'absent' if k in ab else 'excused' if k in ex else 'yes') for k in seat}
                    vetoes.append({'id':it['id'],'date':d,'meetId':int(i),'agendaItem':it['label'],'title':it['title'].replace('\n',' ')[:400],'action':r0['action'],'ref':r0['ref'],'tally':r0['tally'],'roll':orl if r0['tally'] else None,'mover':r0['mover'],'second':r0['second'],'report':it['report'][:1500]})
            rr=candidate(it)
            if not rr: continue
            allfinal+=1
            T=it['title'].upper().replace('\n',' ')
            kind,lab=classify(T)
            if it['type']=='Zoning': kind,lab='zoning','Zoning application'
            if excluded(T,kind): unnamed.append([d,it['id'],T[:120],'excluded']); continue
            ps=parties_for(it,kind)
            if not ps: unnamed.append([d,it['id'],T[:120],'no named private party']); continue
            no=splitlist(rr['no']); ab=splitlist(rr['absent']); ex=splitlist(rr['excused']); ocb=splitlist(rr['ocb']); coi=splitlist(rr['coi'])
            roll={}
            for k in seat:
                roll[k]='no' if k in no else ('recused' if k in coi else ('absent' if (k in ab or k in ocb) else ('excused' if k in ex else 'yes')))
            for k in no+ab+ex+ocb+coi:
                if k not in seat: unknown_names['vote:'+k]+=1
            complete=True; note=None
            if rr['tally']:
                y=sum(1 for v in roll.values() if v=='yes'); n_=sum(1 for v in roll.values() if v=='no')
                if y!=rr['tally'][0] or n_!=rr['tally'][1]:
                    lt=[k for k in late if roll.get(k)=='yes']
                    if n_==rr['tally'][1] and y-rr['tally'][0]==len(lt) and lt:
                        for k in lt: roll[k]='absent'
                        note='late arrival(s) not yet seated: '+', '.join(lt)
                    else:
                        complete=False; mism.append([d,it['id'],rr['tally'],y,n_])
            else:
                for k in roll: roll[k]='unknown'
                complete=False; note='The minutes record the result but not the vote.'
            amt=amount(T)
            dist=district(T)
            title=lab+fmtamt(amt)+(f' (District {dist})' if lab=='Zoning application' and dist else '')
            yf='Y'+('19' if it['id'][:2]>'50' else '20')+it['id'][:2]
            a={'id':it['id'],'date':d,'meeting':'zoning' if (zon or it['type']=='Zoning') else 'bcc','ref':rr['ref'],'agendaItem':it['label'],
               'title':title,'titleFull':it['title'].replace('\n',' '),'type':it['type'],'kind':kind,'parties':ps,'amount':amt,'result':rr['result'],
               'tally':rr['tally'],'roll':roll,'rollComplete':complete,'mover':rr['mover'],'second':rr['second'],'sponsors':it['sponsors'],
               'lobbied':[],'links':[{'t':'matter','url':f'https://www.miamidade.gov/govaction/matter.asp?matter={it["id"]}&file=true&yearFolder={yf}'},
                {'t':'minutes','url':f'https://www.miamidade.gov/govaction/commminute.asp?cmbmeetdate={i}&file=false'}],'universe':True,'meetId':int(i)}
            if note: a['note']=note
            if it['report']: a['report']=it['report'][:4000]
            acts[it['id']]=a   # later final action replaces earlier (reconsideration)
    json.dump({'meetings':meetings,'actions':sorted(acts.values(),key=lambda a:(a['date'],a['id'])),'unnamed':unnamed,'vetoes':vetoes,'mismatch':mism,'allfinal':allfinal},open(BASE+'stage1.json','w'))
    print('meetings',len(meetings),'read',sum(m['read'] for m in meetings),'final',allfinal,'actions',len(acts),'unnamed',len(unnamed),'mismatch',len(mism))
    print('unknown',unknown_names.most_common(30))
if __name__=='__main__': main()
