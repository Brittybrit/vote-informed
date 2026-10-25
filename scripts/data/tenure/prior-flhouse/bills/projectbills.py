"""House Appropriations Project bills (2017-2022 sessions) filed by this slice's members, from flsenate.gov House bill
lists filtered by "Filed By" (the member's flsenate member id, read from that year's list form). Keeps HB 2000-4999
(the project-bill range). Writes ../raw/pb-<year>.json [{bill, title, member, url, lastAction}]. Resumable.
Run: python3 scripts/data/tenure/prior-flhouse/bills/projectbills.py"""
import re, json, os, sys, html
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import fl
RAW = os.path.join(H, '..', 'raw')
SEATED = {2022: ['Avila', 'Ingoglia'], 2021: ['Avila', 'Ingoglia'],
          2020: ['Donalds', 'Avila', 'Ingoglia', 'Rodriguez', 'Fernandez'], 2019: ['Donalds', 'Avila', 'Ingoglia', 'Rodriguez', 'Fernandez'],
          2018: ['Donalds', 'Avila', 'Ingoglia', 'Moskowitz'], 2017: ['Donalds', 'Avila', 'Ingoglia', 'Moskowitz']}
FULL = {'Avila': 'Bryan Avila', 'Ingoglia': 'Blaise Ingoglia', 'Donalds': 'Byron Donalds', 'Rodriguez': 'Ana Maria Rodriguez',
        'Fernandez': 'Javier E. Fernandez', 'Moskowitz': 'Jared Evan Moskowitz'}
clean = lambda s: html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', s))).strip()
for y, mem in SEATED.items():
    out = os.path.join(RAW, f'pb-{y}.json')
    if os.path.exists(out): continue
    h = fl.page(f'https://www.flsenate.gov/Session/Bills/{y}?chamber=house')
    s = h.split('id="filed-by"', 1)[1].split('</select>', 1)[0]
    opts = {clean(t): v for v, t in re.findall(r'<option[^>]*value="([^"]*)"[^>]*>(.*?)</option>', s, re.S)}
    rows = []
    for m in mem:
        ids = [v for t, v in opts.items() if t.replace('Representative ', '').startswith(FULL[m].split(' ')[0]) and FULL[m].split(' ')[-1] in t
               and not t.endswith('Barquin')]
        if len(ids) != 1: raise SystemExit(f'{y} {m}: filed-by ids {ids}')
        for p in range(1, 10):
            h = fl.page(f'https://www.flsenate.gov/Session/Bills/{y}?chamber=house&FiledBy={ids[0]}&pageNumber={p}', minlen=500)
            tb = h.split('<tbody', 1)[1].split('</tbody>', 1)[0] if '<tbody' in h else ''
            n = 0
            for r in re.findall(r'<tr.*?</tr>', tb, re.S):
                a = re.search(r'<a[^>]*href="(/Session/Bill/[^"]+)"[^>]*>(.*?)</a>', r, re.S)
                if not a: continue
                tds = [clean(x) for x in re.findall(r'<td[^>]*>(.*?)</td>', r, re.S)]
                bill = clean(a.group(2)); n += 1
                num = int(re.sub(r'\D', '', bill.split()[-1]) or 0)
                rows.append({'bill': bill, 'num': num, 'title': tds[0] if tds else '', 'filer': tds[1] if len(tds) > 1 else '',
                             'lastAction': tds[2] if len(tds) > 2 else '', 'member': m, 'filedById': ids[0],
                             'url': 'https://www.flsenate.gov' + a.group(1).split('?')[0]})
            print(y, m, p, n, flush=True)
            if n < 50: break
    json.dump(rows, open(out, 'w'), indent=0)
    print(y, {m: sum(1 for r in rows if r['member'] == m and 2000 <= r['num'] < 5000) for m in mem}, flush=True)
print('DONE')
