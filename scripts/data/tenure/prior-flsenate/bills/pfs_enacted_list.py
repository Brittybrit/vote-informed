"""Builds bills/enacted.jsonl for the Senate sessions only this slice needs (2013 through 2020, regular and special), from
flsenate.gov bill lists filtered to billLocation=27 ('Became Law'), same source and shape as ../flsenate/bills/enacted.json.
Laws missing from that list (General Appropriations Acts are listed as line-item vetoed) are found as gaps in the chapter
sequence and added from their bill pages by bills/gaps.py. Resumable per session; newest first. (Unique script name so other agents' pkill patterns do not hit it.)"""
import re, json, os, sys, html
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../src')); from net import get
H = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(H, 'enacted.jsonl')
done = {json.loads(l)['session'] for l in open(OUT)} if os.path.exists(OUT) else set()
SES = sys.argv[1:] or ['2020', '2019', '2018', '2017A', '2017', '2016', '2015C', '2015B', '2015A', '2015', '2014A', '2014', '2013']
for ses in SES:
    if ses in done: continue
    rows = []
    for p in range(1, 41):
        b = get(f'https://www.flsenate.gov/Session/Bills/{ses}?chamber=both&billLocation=27&pageNumber={p}', minlen=5000)
        if b is None: raise SystemExit('failed ' + ses)
        h = b.decode('utf8', 'replace')
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
            rows.append({'bill': bill, 'session': ses, 'chapter': ch.group(1) if ch else None, 'title': title,
                         'url': 'https://www.flsenate.gov' + a.group(1).split('?')[0]}); n += 1
        print(ses, p, n, flush=True)
        if n < 50: break
    with open(OUT, 'a') as f:
        for r in rows: f.write(json.dumps(r, ensure_ascii=False) + '\n')
print('DONE')
