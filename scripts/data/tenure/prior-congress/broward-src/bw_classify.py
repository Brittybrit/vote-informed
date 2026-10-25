# First-pass classification of Broward motions (Jan 12 - Nov 29, 2022) under STANDARD.md, then hand review (bw_review.json).
import json, re, sys
M = json.load(open(sys.argv[1])); OUT = sys.argv[2]
SUF = r"(?:Inc\.?|Incorporated|LLC|L\.L\.C\.|Corp\.?|Corporation|Company|Co\.|L\.P\.|LP|LLP|L\.L\.P\.|P\.A\.|P\.L\.|PLLC|Ltd\.?|N\.A\.|Foundation|Association|Trust|Partners|Partnership|Group|Holdings|USA|America|Center|Services|Hospital|Church|Ministries|League|Alliance|Coalition|Society|Institute|University|College|Authority|Agency)"
NAME = r"((?:[A-Z0-9][\w&'’.,/-]*|of|and|the|for|de|del|&|at|in)(?: (?:[A-Z0-9][\w&'’./-]*|of|and|the|for|de|del|&|at|in|d/b/a|dba|a/k/a)){0,10},? " + SUF + r"\b\.?)"
GOV = re.compile(r"(?i)^(the )?(city|town|village|state|school board|florida department|department of|broward (county|sheriff|college|health)|sheriff|united states|u\.s\.|south florida regional|florida inland|housing finance authority|north broward hospital district|south broward hospital district|children's services council|broward metropolitan|south florida water|federal|fdot|county|the county|seminole tribe|miami-dade|palm beach|board of|supervisor of elections|property appraiser|clerk of|florida housing finance|community redevelopment agency|cra|the school board|national league|national association of counties|florida association of counties|broward league of cities|port everglades)")
INC = re.compile(r"(?i)\b(agreement|contract|award|amendment|change order|renewal|renew|purchase|lease|license|franchise|grant|funding|settlement|settle|plat|easement|piggyback|waiv(e|er)|sole source|work authorization|task order|delegation request|site plan|variance|rezoning|land use plan amendment|deed|sale|conveyance|subordination|loan|development agreement|revenue|concession|permit)\b")
EXC = re.compile(r"(?i)^(A\. |B\. |C\. |D\. |E\. )?(MOTION TO (APPOINT|REAPPOINT|APPROVE Board Appointments|FILE|NOTE FOR THE RECORD|ADOPT budget Resolution|APPROVE (the )?minutes|SET public hearing|DIRECT|DISCUSS|RECOGNIZE|AUTHORIZE (the )?County Administrator to (publish|advertise)|APPROVE cancellation of warrants|ADOPT Resolution directing the County Administrator to publish))")
res = []
for m in M:
    if m['date'] < '2022-01-12' or m['date'] > '2022-11-29': continue
    t = m['text'].replace('Arial;Arial; ;;', ' ').strip(); m['text'] = re.sub(r'\s+', ' ', t)
    names = []
    for n in re.findall(NAME, t):
        n = n.strip(' ,'); n = re.sub(r'^(?:and|the|between|to|with|of|for|by)\s+', '', n, flags=re.I)
        if GOV.search(n) or n.lower().startswith(('broward county', 'board of county')): continue
        if len(n) < 6: continue
        names.append(n)
    seen = []; [seen.append(n) for n in names if n not in seen]
    acted = bool(m['action']) and not re.search(r'(?i)withdrawn|deferred|continued|no action|tabled|failed|denied', m['action'] or '') or bool(re.search(r'(?i)approved|adopted|accepted|authorized', m['action'] or ''))
    excl = bool(EXC.search(t))
    inc = bool(INC.search(t)) and bool(seen) and not excl
    res.append({**m, 'names': seen, 'acted': acted, 'cand': inc, 'excl': excl})
json.dump(res, open(OUT, 'w'), indent=0, ensure_ascii=False)
import collections
print(len(res), collections.Counter((r['cand'], r['acted']) for r in res))
