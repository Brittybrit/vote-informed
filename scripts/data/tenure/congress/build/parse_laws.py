# Extract every enacted public law from BILLSTATUS bulk zips: title, CRS summaries, CBO links, recorded votes.
import zipfile, sys, json, re, os
import xml.etree.ElementTree as ET
RAW = sys.argv[1]; OUT = sys.argv[2]; congs = sys.argv[3].split(',')
def tx(e, p):
    x = e.find(p); return x.text.strip() if x is not None and x.text else None
rows = []
for c in congs:
    for t in ['hr', 's', 'hjres', 'sjres']:
        z = zipfile.ZipFile(os.path.join(RAW, f'{c}-{t}.zip'))
        for n in z.namelist():
            root = ET.fromstring(z.read(n)); b = root.find('bill')
            laws = [tx(i, 'number') for i in b.findall('laws/item') if (tx(i, 'type') or '').startswith('Public')]
            if not laws: continue
            title = tx(b, 'title')
            sums = []
            for s in b.findall('summaries/summary') + b.findall('summaries/billSummaries/item'):
                sums.append({'date': tx(s, 'actionDate'), 'desc': tx(s, 'actionDesc'), 'text': re.sub(r'<[^>]+>', ' ', tx(s, 'text') or tx(s, 'cdata/text') or '')})
            cbo = [{'date': tx(i, 'pubDate'), 'title': tx(i, 'title'), 'url': tx(i, 'url')} for i in b.findall('cboCostEstimates/item')]
            votes = []
            for a in b.findall('actions/item'):
                for rv in a.findall('recordedVotes/recordedVote'):
                    votes.append({'chamber': tx(rv, 'chamber'), 'roll': tx(rv, 'rollNumber'), 'date': (tx(rv, 'date') or '')[:10], 'session': tx(rv, 'sessionNumber'), 'url': tx(rv, 'url'), 'text': tx(a, 'text')})
            # dedupe votes
            seen = set(); vv = []
            for v in votes:
                k = (v['chamber'], v['roll'], v['date'])
                if k in seen: continue
                seen.add(k); vv.append(v)
            enacted = None
            for a in b.findall('actions/item'):
                if re.match(r'Became Public Law', tx(a, 'text') or '') or tx(a, 'type') == 'BecameLaw': enacted = enacted or tx(a, 'actionDate')
            if not enacted:
                for a in b.findall('actions/item'):
                    if re.match(r'Signed by President', tx(a, 'text') or ''): enacted = tx(a, 'actionDate'); break
            pl = next((l for l in laws if l.split('-')[0] == c), None)
            if not pl: continue
            rows.append({'pl': pl, 'congress': int(c), 'type': t, 'number': int(tx(b, 'number')), 'title': title, 'enacted': enacted,
                         'summaries': sums, 'cbo': cbo, 'votes': vv})
rows.sort(key=lambda r: (r['congress'], int(r['pl'].split('-')[1])))
json.dump(rows, open(OUT, 'w'))
print(len(rows), 'laws')
