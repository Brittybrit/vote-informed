# Prefilter: pick the final CRS summary per law, flag sentences that name a kind of business.
import json, re, sys
rows = json.load(open(sys.argv[1])); out = sys.argv[2]
BIZ = r"\b(compan(y|ies)|corporations?|businesses|business concerns?|small business(es)?|manufactur\w+|producers?|industr(y|ies)|firms?|lenders?|banks?|banking organizations?|credit unions?|insurers?|insurance (companies|issuers)|carriers?|airlines?|air carriers?|railroads?|operators?|lessees?|contractors?|vendors?|retailers?|dealers?|distributors?|pharmac(y|ies)|hospitals|providers?|suppliers?|developers?|brokers?|exchanges?|issuers?|employers?|farmers?|ranchers?|growers?|fishermen|fisheries|vessel owners?|shippers?|utilit(y|ies)|broadcasters?|platforms?|private sector|for-profit|enterprises?|restaurants?|venues?|financial institutions?|investment (advisers|companies|firms)|mining|oil|gas|coal|timber|pipelines?)\b"
CERE = re.compile(r"(?i)^(to designate|designat|to rename|to award|a joint resolution (designating|recognizing|providing for the appointment)|to provide for the appointment|to authorize the use of the capitol|a bill to name)")
res = []
for r in rows:
    s = r['summaries']
    pick = None
    for x in s:
        if re.search(r'(?i)public law|enrolled', x['desc'] or ''): pick = x
    if not pick: pick = s[-1] if s else None
    text = re.sub(r'\s+', ' ', pick['text']).strip() if pick else ''
    sents = re.split(r'(?<=[.;])\s+', text)
    hits = [x for x in sents if re.search(BIZ, x, re.I)]
    title = r['title'] or ''
    cer = bool(re.search(r'(?i)(designate the facility of the united states postal service|post office|to designate|to rename|commemorat|gold medal|to name the|memorial|coin)', title))
    res.append({'pl': r['pl'], 'title': title, 'sumDesc': pick['desc'] if pick else None, 'sumDate': pick['date'] if pick else None,
                'cer': cer, 'nhits': len(hits), 'hits': hits[:12], 'len': len(text), 'text': text if len(text) < 1500 else text[:1500]})
json.dump(res, open(out, 'w'))
import collections
print(len(res), 'cer', sum(r['cer'] for r in res), 'nohit', sum(1 for r in res if not r['nhits']), 'hit&notcer', sum(1 for r in res if r['nhits'] and not r['cer']))
