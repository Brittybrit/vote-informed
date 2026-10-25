"""Parse Senate LFIR list pages into lfir-list.json: one row per form for the members in this slice.
FY2017-18..2020-21 and 2025-26..2026-27 pages are in raw/lfr/; FY2021-22..2024-25 pages are reused from ../flsenate/raw/."""
import re, json, html, os, collections
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# fiscal year -> list-page sponsor label -> member key
WHO = {
 '2017-18': {'Simpson': 'Simpson', 'Rodriguez': 'JJRodriguez', 'Campbell': 'Campbell'},
 '2018-19': {'Simpson': 'Simpson', 'Rodriguez': 'JJRodriguez', 'Campbell': 'Campbell', 'Taddeo': 'Taddeo'},
 '2019-20': {'Simpson': 'Simpson', 'Rodriguez': 'JJRodriguez', 'Taddeo': 'Taddeo'},
 '2020-21': {'Simpson': 'Simpson', 'Rodriguez': 'JJRodriguez', 'Taddeo': 'Taddeo'},
 '2021-22': {'Simpson': 'Simpson', 'Taddeo': 'Taddeo'},
 '2022-23': {'Simpson': 'Simpson', 'Taddeo': 'Taddeo'},
 '2023-24': {'Avila': 'Avila'},
 '2024-25': {'Avila': 'Avila'},
 '2025-26': {'Avila': 'Avila'},
 '2026-27': {'Avila': 'Avila'},
}
def page(fy):
    for p in (os.path.join(H, 'raw/lfr', f'lfr-FY{fy}.html'), os.path.join(H, '../flsenate/raw', f'lfr-FY{fy}.html')):
        if os.path.exists(p) and os.path.getsize(p) > 100000: return p
out, allsp = [], {}
for fy, SP in WHO.items():
    h = open(page(fy), encoding='utf-8').read()
    c = collections.Counter()
    for r in re.findall(r'<tr>(.*?)</tr>', h, re.S):
        tds = re.findall(r'<td[^>]*>(.*?)</td>', r, re.S)
        if len(tds) < 5: continue
        sp = re.sub(r'<[^>]+>|\s+', ' ', tds[2]).strip(); c[sp] += 1
        if sp not in SP: continue
        a = re.search(r'href="([^"]+)"[^>]*>(.*?)</a>', tds[1], re.S)
        note = re.search(r'<p class="italic">(.*?)</p>', tds[1], re.S)
        amt = re.search(r'display: none">(\d+)<', tds[3])
        out.append({'fy': fy, 'form': re.sub(r'\D', '', tds[0]), 'title': html.unescape(re.sub(r'\s+', ' ', a.group(2))).strip(),
                    'sponsor': SP[sp], 'ask': int(amt.group(1)) if amt else None,
                    'cmte': html.unescape(re.sub(r'<[^>]+>|\s+|&nbsp;', ' ', tds[4])).replace('\xa0', ' ').strip(),
                    'withdrawn': '(withdrawn)' in tds[1], 'wnote': html.unescape(note.group(1).strip()) if note else None,
                    'pdf': 'https://www.flsenate.gov' + a.group(1)})
    allsp[fy] = sum(c.values())
json.dump(out, open(os.path.join(H, 'lfir-list.json'), 'w'), indent=1, ensure_ascii=False)
print(allsp)
print(sorted(collections.Counter((x['fy'], x['sponsor']) for x in out).items()))
print(sum(x['withdrawn'] for x in out), 'withdrawn', len(out), 'forms')
