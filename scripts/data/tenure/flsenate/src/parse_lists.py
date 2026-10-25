"""Parse the Senate LFIR list pages (raw/lfr-FY*.html) into lfir-list.json: one row per form for our four senators."""
import re, json, html, glob, os
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = {'Rodriguez': 'Rodriguez', 'Garcia': 'Garcia', 'Calatayud': 'Calatayud', 'Ingoglia': 'Ingoglia'}
out = []
for f in sorted(glob.glob(os.path.join(H, 'raw', 'lfr-FY*.html'))):
    fy = re.search(r'FY(\d{4}-\d{2})', f).group(1)
    h = open(f, encoding='utf-8').read()
    for r in re.findall(r'<tr>(.*?)</tr>', h, re.S):
        tds = re.findall(r'<td[^>]*>(.*?)</td>', r, re.S)
        if len(tds) < 5: continue
        sp = re.sub(r'<[^>]+>|\s+', ' ', tds[2]).strip()
        if sp not in SP: continue
        a = re.search(r'href="([^"]+)"[^>]*>(.*?)</a>', tds[1], re.S)
        note = re.search(r'<p class="italic">(.*?)</p>', tds[1], re.S)
        amt = re.search(r'display: none">(\d+)<', tds[3])
        out.append({'fy': fy, 'form': re.sub(r'\D', '', tds[0]), 'title': html.unescape(re.sub(r'\s+', ' ', a.group(2))).strip(),
                    'sponsor': SP[sp], 'ask': int(amt.group(1)) if amt else None,
                    'cmte': html.unescape(re.sub(r'<[^>]+>|\s+|&nbsp;', ' ', tds[4])).replace('\xa0', ' ').strip(),
                    'withdrawn': '(withdrawn)' in tds[1], 'wnote': html.unescape(note.group(1).strip()) if note else None,
                    'pdf': 'https://www.flsenate.gov' + a.group(1)})
json.dump(out, open(os.path.join(H, 'lfir-list.json'), 'w'), indent=1, ensure_ascii=False)
import collections
print(collections.Counter((x['fy'], x['sponsor']) for x in out))
print(sum(x['withdrawn'] for x in out), 'withdrawn')
