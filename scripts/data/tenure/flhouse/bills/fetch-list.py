"""Builds bills/enacted.json: every chapter law of 2022D, 2023B, 2023, 2023C and 2024 (flsenate.gov bill lists,
billLocation=27 'Became Law', plus the two GAAs, which are listed as line-item vetoed)."""
import re, json, os, time, subprocess, html
H = os.path.dirname(os.path.abspath(__file__))
def get(u):
    for t in range(6):
        r = subprocess.run(['curl', '-sS', '-m', '60', '-w', '\n%{http_code}', u], capture_output=True, text=True)
        body, code = r.stdout.rsplit('\n', 1) if '\n' in r.stdout else (r.stdout, '0')
        if code == '200': return body
        time.sleep(20 * (t + 1))
    raise SystemExit('failed ' + u)
out = []
for ses in ['2022D', '2023B', '2023', '2023C', '2024']:
    for p in range(1, 41):
        h = get(f'https://www.flsenate.gov/Session/Bills/{ses}?chamber=both&billLocation=27&pageNumber={p}')
        tb = h.split('<tbody', 1)[1].split('</tbody>', 1)[0] if '<tbody' in h else ''
        rows = re.findall(r'<tr.*?</tr>', tb, re.S)
        n = 0
        for r in rows:
            a = re.search(r'<a[^>]*href="(/Session/Bill/[^"]+)"[^>]*>(.*?)</a>', r, re.S)
            if not a: continue
            txt = re.sub(r'<[^>]+>', ' ', r); txt = html.unescape(re.sub(r'\s+', ' ', txt)).strip()
            ch = re.search(r'Chapter No\. (\d{4}-\d+)', txt)
            bill = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', a.group(2))).strip()
            tds = re.findall(r'<td[^>]*>(.*?)</td>', r, re.S)
            title = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', tds[0]))).strip() if tds else ''
            out.append({'bill': bill.replace(' ', ' ', 1), 'session': ses, 'chapter': ch.group(1) if ch else None, 'title': title,
                        'url': 'https://www.flsenate.gov' + a.group(1).split('?')[0]}); n += 1
        print(ses, p, n, flush=True); time.sleep(2)
        if n < 50: break
out += [{'bill': 'SB 2500', 'session': '2023', 'chapter': '2023-239', 'title': 'Appropriations', 'url': 'https://www.flsenate.gov/Session/Bill/2023/2500'},
        {'bill': 'HB 5001', 'session': '2024', 'chapter': '2024-231', 'title': 'General Appropriations Act', 'url': 'https://www.flsenate.gov/Session/Bill/2024/5001'}]
out.sort(key=lambda x: (int(x['chapter'][:4]), int(x['chapter'][5:])))
json.dump(out, open(os.path.join(H, 'enacted.json'), 'w'), indent=1, ensure_ascii=False)
print(len(out), sum(1 for x in out if not x['chapter']))
