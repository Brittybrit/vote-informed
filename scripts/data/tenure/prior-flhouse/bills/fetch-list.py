"""Builds bills/enacted.json: every chapter law of the 2013 through 2020 sessions (regular and special), from the
flsenate.gov session bill lists (both chambers, billLocation=27 'Became Law'), plus each year's General
Appropriations Act (listed there as line-item vetoed). Resumable per session (raw/list-<ses>.json).
Run: python3 scripts/data/tenure/prior-flhouse/bills/fetch-list.py"""
import re, json, os, sys, html
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import fl
RAW = os.path.join(H, '..', 'raw'); os.makedirs(RAW, exist_ok=True)
SES = ['2013', '2014', '2014A', '2015', '2015A', '2015B', '2015C', '2016', '2017', '2017A', '2018', '2019', '2020']
OTHER = os.path.join(H, '..', '..', 'prior-flsenate', 'bills', 'enacted.jsonl')  # same lists, fetched by the Senate slice (newest first)
for ses in SES:
    f = os.path.join(RAW, f'list-{ses}.json')
    if os.path.exists(f): continue
    if os.path.exists(OTHER):
        theirs = [json.loads(l) for l in open(OTHER) if l.strip()]
        if any(r['session'] == ses for r in theirs):
            json.dump([r for r in theirs if r['session'] == ses], open(f, 'w'), indent=0); print(ses, 'copied from prior-flsenate', flush=True); continue
    out = []
    for p in range(1, 41):
        h = fl.page(f'https://www.flsenate.gov/Session/Bills/{ses}?chamber=both&billLocation=27&pageNumber={p}', minlen=500)
        if h is None: raise SystemExit('failed ' + ses + ' ' + str(p))
        tb = h.split('<tbody', 1)[1].split('</tbody>', 1)[0] if '<tbody' in h else ''
        n = 0
        for r in re.findall(r'<tr.*?</tr>', tb, re.S):
            a = re.search(r'<a[^>]*href="(/Session/Bill/[^"]+)"[^>]*>(.*?)</a>', r, re.S)
            if not a: continue
            txt = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', r))).strip()
            ch = re.search(r'Chapter No\. (\d{4}-\d+)', txt)
            bill = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', a.group(2))).strip()
            tds = re.findall(r'<td[^>]*>(.*?)</td>', r, re.S)
            title = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', tds[0]))).strip() if tds else ''
            out.append({'bill': bill, 'session': ses, 'chapter': ch.group(1) if ch else None, 'title': title,
                        'url': 'https://www.flsenate.gov' + a.group(1).split('?')[0]}); n += 1
        print(ses, p, n, flush=True)
        if n < 50: break
    json.dump(out, open(f, 'w'), indent=0)
print('DONE lists')
