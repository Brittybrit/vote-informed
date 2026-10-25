# parse South Miami draft minutes (from agenda packets) into items with roll calls
import re,json
import os,sys
D=sys.argv[1] if len(sys.argv)>1 else '/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/sm/'
MIN=json.load(open(D+'minutes.json'))
NAMES={'Fernández':'Fernandez','Fernandez':'Fernandez','Bonich':'Bonich','Calle':'Calle','Corey':'Corey','Liebman':'Liebman','Rodriguez':'Rodriguez','Rodríguez':'Rodriguez'}
def who(s):
    return [NAMES[w] for w in re.findall(r'(Fern[aá]ndez|Bonich|Calle|Corey|Liebman|Rodr[ií]guez)',s)]
def clean(t):
    out=[]
    L=t.split('\n')
    for i,l in enumerate(L):
        if re.match(r'^\s*(SPECIAL )?(REGULAR )?CITY COMMISSION\s+(MINUTES)?\s*\d*\s*$',l): continue
        if re.match(r'^\s*MINUTES\s*$',l): continue
        if re.match(r'^\s*[A-Z][a-z]+ \d{1,2}, \d{4}\s*$',l) and i>3: continue
        if re.match(r'^\s*\d+\s*$',l): continue
        l=re.sub(r'^\s{0,3}\d{1,3}\s{2,}','  ',l)
        if l.strip(): out.append(l.rstrip())
    return out
items=[]
for key in sorted(MIN):
    date,kind=key.split('|')
    if date<'2022-11-15' or date>'2024-12-31': continue
    L=clean(MIN[key]['text'])
    txt='\n'.join(L)
    # attendance
    m=re.search(r'members of the City Commission were present:(.*?)(?:The following members|Also,? in attendance|Also present|C\))',re.sub(r'\s+',' ',txt))
    present=who(m.group(1)) if m else []
    # items: header lines '  N.) ...' (indented) ; collect text until next header
    heads=[i for i,l in enumerate(L) if re.match(r'^\s{4,}(\d{1,2}[a-z]?|[A-Z]\d?[a-z]?)\.?\)\s+\S',l)]
    for hi,h in enumerate(heads):
        end=heads[hi+1] if hi+1<len(heads) else len(L)
        block=L[h:end]
        num=re.match(r'^\s+(\S+?)\.?\)',block[0]).group(1)
        # title = indented block lines until a line starting with less indentation (motion text)
        ti=[];k=0
        for k,l in enumerate(block):
            if k>0 and not re.match(r'^\s{10,}',l): break
            ti.append(l.strip())
        title=re.sub(r'^\S+\.?\)\s+','',' '.join(ti))
        body=' '.join(x.strip() for x in block[k:])
        votes=[]
        for mm in re.finditer(r'((?:[Ii]t was )?[Mm]oved by)\s+(.*?),?\s+(?:and\s+)?seconded by\s+(.*?),\s*(?:the motion to|to)\s+(.*?)(passed|failed)\s+by\s+an?\s+(\d)\s*-\s*(\d)\s+vote:?(.*?)(?=Moved by|It was moved by|$)',body):
            mover=who(mm.group(2))[:1]; second=who(mm.group(3))[:1]
            rest=mm.group(8)
            # keep only the roll-call block: labels, titles and member names
            ALLOW=re.compile(r"^(Yea|Nay|Absent|Recused|Abstain(ed)?|Excused|Out|of|room|Mayor|Vice|Commissioner|Commissioners|None|Javier|Lisa|Steve|Brian|Josh|Danny|Fern[aá]ndez|Bonich|Calle|Corey|Liebman|Rodr[ií]guez|and|:)$")
            toks=re.findall(r"[^\s:,]+|:",rest); keep=[]
            for t in toks:
                if not ALLOW.match(t): break
                keep.append(t)
            rest=' '.join(keep).replace(' :',':').replace('Out of room:','Absent:')
            rest=re.sub(r'\b(Absent|Recused|Excused|Abstained|Abstain)\b(?!:)',r'\1:',rest)
            roll={}
            for lab,val in [('Yea','yes'),('Nay','no'),('Absent','absent'),('Recused','recused'),('Abstain','abstain'),('Abstained','abstain'),('Excused','excused')]:
                r=re.search(lab+r':\s*(.*?)(?=Yea:|Nay:|Absent:|Recused:|Abstain|Excused:|$)',rest)
                if r:
                    for n in who(r.group(1)): roll[n]=val
            y=sum(v=='yes' for v in roll.values()); n=sum(v=='no' for v in roll.values())
            ok=(y,n)==(int(mm.group(6)),int(mm.group(7)))
            votes.append({'mover':mover[0] if mover else None,'second':second[0] if second else None,'motion':mm.group(4)[:400],
                          'passed':mm.group(5)=='passed','tally':[int(mm.group(6)),int(mm.group(7))],'roll':roll,'ok':ok})
        # second format (2024 minutes): "Moved by X, seconded by Y to approve ... The motion (unanimously) carried by the following N-N roll call vote: AYES: ... NAYS: ... ABSENT: ..."
        for mm in re.finditer(r'(Moved by|moved by)\s+(.*?),?\s+(?:and\s+)?seconded by\s+([A-Z][^,]*?(?:Fern[aá]ndez|Bonich|Calle|Corey|Liebman|Rodr[ií]guez)),?\s+(?:the motion\s+)?to\s+(.*?)The motion (?:was )?(?:unanimously )?(carried|failed|passed)(?: by)? (?:the following )?(?:(\d)\s*-\s*(\d) )?roll call vote:\s*AYES:(.*?)(?:NAYS:(.*?))?(?:ABSENT:(.*?))?(?:RECUSED:(.*?))?(?=Moved by|moved by|$)',body):
            if any(v['motion'][:60]==mm.group(4)[:60] for v in votes): continue
            roll={}
            def cut(x):
                return re.split(r'\.\s+[A-Z][a-z]',x or '')[0]
            for grp,val in [(8,'yes'),(9,'no'),(10,'absent'),(11,'recused')]:
                for n in who(cut(mm.group(grp))): roll[n]=val
            y=sum(v=='yes' for v in roll.values()); n=sum(v=='no' for v in roll.values())
            t=[int(mm.group(6)),int(mm.group(7))] if mm.group(6) else [y,n]
            votes.append({'mover':(who(mm.group(2)) or [None])[0],'second':(who(mm.group(3)) or [None])[0],'motion':mm.group(4)[:400],
                          'passed':mm.group(5)!='failed','tally':t,'roll':roll,'ok':(y,n)==tuple(t),'fmt':2})
        other=re.findall(r'((?:deferred|withdrawn|tabled|continued)[^.]{0,120})',body,re.I)[:2]
        items.append({'date':date,'meeting':kind,'packet':MIN[key]['packet'],'num':num,'title':title,'votes':votes,'present':present,'other':other,'body':body[:3000]})
json.dump(items,open(D+'items.json','w'),ensure_ascii=False,indent=0)
import collections
print(len(items), collections.Counter(len(i['votes']) for i in items), sum(1 for i in items for v in i['votes'] if not v['ok']))
for i in items:
    for v in i['votes']:
        if not v['ok']: print('BAD',i['date'],i['num'],v['tally'],v['roll'])
