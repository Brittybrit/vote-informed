"""Builds bills/enacted.json for the sessions in the two Senate members' tenure that the flhouse slice does not cover:
2021, 2021A, 2021B, 2021C, 2022, 2022B, 2022C, 2022E, 2023D (flsenate.gov bill lists, billLocation=27 'Became Law'),
plus the two GAAs (listed as line-item vetoed, not 'Became Law'). Sessions 2022D, 2022A, 2023B, 2023, 2023C, 2024 come from
scripts/data/tenure/flhouse/bills/enacted.json (same source, same shape). Resumable per session."""
import re, json, os, time, subprocess, html
H = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(H, 'enacted.json')
out = json.load(open(OUT)) if os.path.exists(OUT) else []
done = {x['session'] for x in out}
def get(u):
    for t in range(8):
        r = subprocess.run(['curl', '-sS', '-m', '60', '-w', '\n%{http_code}', u], capture_output=True, text=True)
        body, code = r.stdout.rsplit('\n', 1) if '\n' in r.stdout else (r.stdout, '0')
        if code == '200': return body
        time.sleep(30 * (t + 1))
    raise SystemExit('failed ' + u)
for ses in ['2021', '2021A', '2021B', '2021C', '2022', '2022B', '2022C', '2022E', '2023D']:
    if ses in done: continue
    rows_s = []
    for p in range(1, 41):
        h = get(f'https://www.flsenate.gov/Session/Bills/{ses}?chamber=both&billLocation=27&pageNumber={p}')
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
            rows_s.append({'bill': bill, 'session': ses, 'chapter': ch.group(1) if ch else None, 'title': title,
                           'url': 'https://www.flsenate.gov' + a.group(1).split('?')[0]}); n += 1
        print(ses, p, n, flush=True); time.sleep(8)
        if n < 50: break
    if ses == '2021': rows_s.append({'bill': 'SB 2500', 'session': '2021', 'chapter': '2021-36', 'title': 'Appropriations', 'url': 'https://www.flsenate.gov/Session/Bill/2021/2500'})
    if ses == '2022': rows_s.append({'bill': 'HB 5001', 'session': '2022', 'chapter': '2022-156', 'title': 'General Appropriations Act', 'url': 'https://www.flsenate.gov/Session/Bill/2022/5001'})
    out += rows_s
    out.sort(key=lambda x: (int((x['chapter'] or '9999-0')[:4]), int((x['chapter'] or '9999-0')[5:])))
    json.dump(out, open(OUT, 'w'), indent=1, ensure_ascii=False)
print('DONE', len(out), sum(1 for x in out if not x['chapter']))
