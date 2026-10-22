import json, re, sys
sys.path.insert(0, '/home/claude/vote-informed/scripts/data/cabinet')
from donors import load, find, norm
rows = load()
items = json.load(open('/home/claude/vote-informed/scripts/data/cabinet/bot-agendas.json'))
skip = re.compile(r'FDACS|DEP\b|County|City of|University|Housing Authority|Authority|College|Florida Department|U\.S\. Air', re.I)
GEN = r'\b(RANCH|FARMS?|CATTLE|CITRUS|HOLDINGS|PROPERTIES|ENTERPRISES|LAND|LANDS|PARTNERSHIP|LIMITED|FAMILY|TRUST|ASSOCIATES|ASSOCIATION|RESOURCES|FOREST|TIMBER|TIMBERLANDS|VENTURES|CAPITAL|OWNER|RESORT|CLUB|ET AL|AND|JR|SR|III|II|REGISTERED|AGENT|REP|SIGNATORY|GRANTEE|COST|SHARE|ORIGINAL|SELLER|NAMED|IN|VALUATION|TABLE|HOA|PRESIDENT|REQUESTING|LEASEHOLDER)\b'
def keyterms(p):
    n = re.sub(GEN, ' ', norm(re.sub(r'\(.*?\)', '', p)))
    return [w for w in n.split() if len(w) > 2]
hits = {}
for it in items:
    for p in it['parties']:
        if skip.search(p): continue
        terms = keyterms(p)
        if not terms: continue
        for r in rows:
            words = r['n'].split()
            if all(t in words for t in terms):
                hits.setdefault((it['date'], it['item'], it['title'][:60], p), []).append(r)
for k, v in hits.items():
    print('\n##', *k)
    for r in v: print(f"   {r['to']:9} {r['acct']:8} {r['date']} {r['amount']:>10,.0f} {r['donor']} | {r['addr']} {r['city']} | {r['occ']}")
