# Rule pass over Broward motions (after bw_classify.py): decide include / unnamed / exclude, then manual overrides
# from bw_overrides.json. usage: python3 -I bw_rules.py <cls.json> <overrides.json> <out decided.json>
import json, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bw_parties import parties
R = json.load(open(sys.argv[1])); O = json.load(open(sys.argv[2])); OUT = sys.argv[3]
U_RX = re.compile(r"(?i)(APPROVE (the )?plat|plat note amendment|non-vehicular access line|modification to plat|modifications? to previously approved (plat )?conditions|Land Use Plan (map|text)? ?amendment|Land Use Plan amendment|Small Scale amendment|REZONING OF PROPERTY|specified service providers|\bProject (Swing|Boost|Starfish|[A-Z][a-z]+)\b for (a|participation)|qualified applicant for participation|vendors listed|firms as listed|up to the \d+ vendors|applicable contractors|tourism-related business partners|Natural Resource Map)")
VAC = re.compile(r"(?i)\b(vacate|release)\b[^.]{0,80}\beasement|vacate a portion of[^.]{0,40}right-of-way")
PRE = re.compile(r"(?i)publish Notice of (a )?Public Hearing|set public hearing|advertise a Public Hearing|final ranking|APPROVE Request for (Proposals|Qualifications)|Request for Qualifications|ACCEPT grant award|accepting (a )?donation|ACCEPT (the )?.{0,40}Annual Report|recommendation of .{0,80} to appoint|co-sponsorships?|sponsorship of")
FUNDER = re.compile(r"(?i)(Areawide Council on Aging|Broward Behavioral Health Coalition|Florida Network of Children.s Advocacy Centers|Children.s Services Council)")
KW = re.compile(r"(?i)\b(agreement|contract|award|amendment|change order|renewal|purchase|lease|license|franchise|grant|funding|settlement|easement|deed|sale|gap financing|loan|sole source|single source|only reasonable source|work authorization|guaranteed maximum price|FGMP|bonds?|certificate of public convenience|concession|permit agreement|participation in|line of credit|subordination|assignment|term sheet|foreign-trade zone|subzone|collective bargaining)\b")
def norm(ns):
    out = []
    for n in ns:
        n = re.sub(r'^(?:Managing General Contractor Agreement with|Agreement Between Broward County and|License Agreement between)\s+', '', n)
        n = re.sub(r',?\s*(?:to provide .*|in substantially the.*|relating.*|subject.*|…|,…|Security Officer Services|and Broward County)$', '', n).strip(' ,')
        if n in ('FP&L', 'FPL', 'Florida Power and Light'): n = 'Florida Power & Light Company'
        if not n.startswith('$') and re.search(r'(?:\bInc|\bCorp|\bCo|P\.A|P\.C|N\.A|\bLtd|L\.L\.C)$', n): n += '.'
        if re.match(r'^(?:\$|Work Authorization|accommodate|ARI$|Sourcewell$)', n) or not n: continue
        if n not in out: out.append(n)
    return out
dec = []
for r in R:
    if r['hard']: continue
    if (not r['vote'] and not re.search(r'(?i)approved|adopted|denied|failed', r['action'] or '')) or (re.search(r'(?i)tabled|deferred|withdrawn|continued', r['action'] or '') and not re.search(r'(?i)approved|adopted|denied|failed', r['action'] or '')): continue
    i = str(r['i']); t = r['text']; o = O.get(i)
    names = parties(t)
    if o is not None:
        if o.get('d') == 'x': continue
        d = o.get('d', 'in'); names = o.get('parties', names)
    elif PRE.search(t): continue
    elif U_RX.search(t) or (VAC.search(t) and not re.search(r'(?i)petitioner', t)): d = 'unnamed'
    elif not names: continue
    elif FUNDER.search(t) and not re.search(r'(?i)provider|subrecipient', t): continue
    elif KW.search(t): d = 'in'
    else: d = 'review'
    names = norm(names)
    dec.append({**r, 'd': d, 'parties': names})
json.dump(dec, open(OUT, 'w'), indent=0, ensure_ascii=False)
import collections
print(collections.Counter(x['d'] for x in dec))
