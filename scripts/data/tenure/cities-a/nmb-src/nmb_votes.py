"""Vote for each heard NMB item. Roll-call lines give each member's vote. A voice vote gives a tally plus the members
named opposed / absent / off the dais / abstaining; every other member present that day is 'yes' only when
yes-count == members present minus those named (otherwise the item's roll is left unknown). Writes nmb/votes.json."""
import re,json,sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from nmb_parse import load
NAMES=['DeFillipo','Joseph','Chernoff','Fleurimond','Jean','Smith','Smukler','Piper','Su']
def who(s):
    out=[]
    for n in NAMES:
        if re.search(r'\b'+n[:5],s,re.I) or (n=='Chernoff' and re.search(r'Cherno',s)): out.append(n)
    return out
def present(t):
    m=re.search(r'Present (?:at the meeting )?[^.]*?were (.*?)\.\s',t,re.S)
    p=who(m.group(1)) if m else []
    absent=[]
    for m in re.finditer(r'((?:Mayor|Vice Mayor|Commissioner|Acting Mayor)[^.]{0,80}?)\s(?:was|were) absent',t[:6000]): absent+=who(m.group(1))
    return [x for x in p if x not in absent],absent
def parse_vote(v,pres):
    v=re.sub(r'\s+',' ',v)
    roll={}
    m=re.search(r'Roll\s*Call\s*Vote:?(.*?)(?:MO[TI]+ON|$)',v,re.I)
    if m:
        for nm,val in re.findall(r'([A-Z][A-Za-z]+)\s*-\s*(Yes|No|Abstain\w*)',m.group(1)):
            k=[n for n in NAMES if n.lower()[:5]==nm.lower()[:5] or (n=='Chernoff' and nm.startswith('Cherno'))]
            if k: roll[k[0]]=val.lower()[:7].replace('abstain','abstain')
    t=re.search(r'MO[TI]+ON\s+(PASSED|FAILED|CARRIED)\s*(?:unanimously)?\s*(\d)\s*-\s*(\d)',v,re.I)
    res=None; y=n=None
    if t: res='passed' if t.group(1).upper()!='FAILED' else 'failed'; y,n=int(t.group(2)),int(t.group(3))
    tail=v[t.end():] if t else v
    opp=[];off=[];
    for m in re.finditer(r'with ((?:(?:Acting |Vice )?Mayor|Commissioner|Vice Mayor)[^.]*?)(opposed?|absent|off the dais|abstain\w*|recus\w*|conflict of interest)',tail,re.I):
        names=who(m.group(1)); kind=m.group(2).lower()
        (opp if kind.startswith('oppos') else off).extend(names)
    for m in re.finditer(r'and ((?:(?:Acting |Vice )?Mayor|Commissioner)[^.]*?)(opposed?|absent|off the dais|abstain\w*)',tail,re.I):
        names=who(m.group(1)); kind=m.group(2).lower()
        (opp if kind.startswith('oppos') else off).extend(names)
    if roll:
        if res is None: res='passed' if sum(1 for x in roll.values() if x=='yes')>sum(1 for x in roll.values() if x=='no') else 'failed'
        for k in pres:
            if k not in roll: roll[k]='absent' if k in off else 'unknown'
        return roll,res,'roll call'
    if y is None: return None,None,'no tally'
    full={}
    here=[k for k in pres if k not in off]
    for k in pres:
        if k in off: full[k]='absent'
        elif k in opp: full[k]='no'
    rest=[k for k in here if k not in opp]
    if len(rest)==y and len([k for k in here if k in opp])==n:
        for k in rest: full[k]='yes'
        return full,res,'voice'
    for k in rest: full[k]='unknown'
    return full,res,'voice; tally %d-%d does not match members present (%d)'%(y,n,len(here))
