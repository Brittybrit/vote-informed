"""Re-read the vote for each non-consent NMB item from the explicit 'Motion to approve <Resolution|Ordinance> N' line in the
minutes (the vote lines that follow it), so a vote on an intervening motion is never attached to the item.
verify(mid, no, pres) -> (roll, result, mover, second, raw) or None when no such motion line exists."""
import re,sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from nmb_parse import load
from nmb_votes import parse_vote,who
def numpat(no):
    y,s=re.sub(r'^R','',no).replace('l','1').replace('O','0').split('-')
    s=s.lstrip('0') or '0'
    return r'R?\s?'+y+r'\s?-\s?[O0]?'+''.join('[%s%s]'%(c,{'1':'lI','0':'O'}.get(c,'')) for c in s)+r'\b'
def other_motion(mid,no):
    """A motion to table/defer/withdraw this item at this meeting, or a 'was deferred/pulled/not heard' note."""
    t=re.sub(r'\s+',' ',load(mid).replace('\f','\n'))
    m=re.search(r'Motion to (?:table|defer|withdraw|continue|reconsider)[^.]{0,40}?(?:Resolution|Ordinance)(?: No\.?)? ?_?'+numpat(no)+r'[^.]*\.[^.]*(?:MOTION (?:PASSED|FAILED)[^.]*\.)?',t)
    if m: return m.group(0)
    m=re.search(r'(?:Resolution|Ordinance)(?: No\.?)? ?_?'+numpat(no)+r'[^.]{0,30}? (?:was|will be) (?:deferred|withdrawn|tabled)[^.]*\.',t)
    return m.group(0) if m else None
def pulled(mid,no):
    t=re.sub(r'\s+',' ',load(mid).replace('\f','\n'))
    return bool(re.search(r'(?:Resolution|Ordinance)(?: No\.?)? ?_?'+numpat(no)+r'[^.]{0,80}?(?:pulled|moved (?:from the Consent Agenda )?to Legislation|moved from the Consent)',t) or re.search(r'(?:Resolution|Ordinance)s?(?: No\.?)? ?_?R?\s?20\d\d-\d+ and (?:Resolution|Ordinance)(?: No\.?)? ?_?'+numpat(no)+r'[^.]{0,80}?(?:pulled|moved)',t))
def verify(mid,no,pres):
    t=re.sub(r'[ \t]+',' ',load(mid).replace('\f','\n'))
    NM=r"((?:Acting\s+|Vice\s+)?(?:Mayor|Commissioner)\s+[A-Z][A-Za-z'-]+)"
    rx=r'Motion to (?:approve|adopt) (?:the )?(?:Resolution|Ordinance)(?: No\.?)? ?_?'+numpat(no)+r'(?:(?!Motion to)[\s\S]){0,220}?(?:made\s+)?by\s+'+NM+r'(?:,\s*|\s+and\s+)(?:seconded|made|second(?:ed)?)\s*by\s+'+NM
    ms=list(re.finditer(rx,t))
    if not ms: return None
    m=ms[-1]
    after=t[m.end():m.end()+900]
    v=re.search(r'(?:(?:Voice|Ro\s?l\s?l\s?Call)\s*Vote:?[^\n]*(?:\n[^\n]*){0,2}?)?MO[TI]+ON\s+(?:PASSED|FAILED|CARRIED)[^\n]*(?:\n[^\n]{0,140}){0,2}',after,re.I)
    if not v: return None
    raw=re.sub(r'\s+',' ',v.group(0))
    roll,res,how=parse_vote(raw,pres)
    mv=who(m.group(1)); sc=who(m.group(2))
    return roll,res,(mv[0] if mv else None),(sc[0] if sc else None),raw,how
