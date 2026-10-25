"""Stage A (resumable): for each chapter law in ../enacted.json, fetch its flsenate.gov bill page and record the
analyses list and floor votes, one JSON line per chapter in stageA.jsonl (same shape as scripts/data/state/bills
stage files: {ch, an:[[date,url,author]], fv:[{c,d,y,n,a,u}]}). Throttled: flsenate.gov returns 429 when hit fast."""
import re, json, os, time, subprocess, html, sys
H = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(H, 'enacted.json')))
OUT = os.path.join(H, 'stageA.jsonl')
done = {json.loads(l)['ch'] for l in open(OUT)} if os.path.exists(OUT) else set()
def get(u):
    for t in range(8):
        r = subprocess.run(['curl', '-sS', '-m', '60', '-w', '\n%{http_code}', u], capture_output=True, text=True)
        body, _, code = r.stdout.rpartition('\n')
        if code == '200' and len(body) > 2000: return body
        time.sleep(30 * (t + 1))
    return None
clean = lambda s: html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', s))).strip()
for e in E:
    if e['chapter'] in done: continue
    h = get(e['url'])
    if not h: print('FAIL', e['chapter'], flush=True); continue
    an, fv = [], []
    a = h.split('id="tabBodyAnalyses"', 1)
    if len(a) > 1:
        for tr in re.findall(r'<tr>(.*?)</tr>', a[1].split('</table>', 1)[0], re.S):
            td = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.S)
            u = re.search(r'href="([^"]+)"', tr)
            if len(td) >= 4 and u: an.append([clean(td[3]).split(' ')[0], 'https://www.flsenate.gov' + u.group(1), clean(td[2])])
    v = h.split('id="tabBodyVoteHistory"', 1)
    if len(v) > 1:
        fl = v[1].split('Vote History - Floor', 1)
        if len(fl) > 1:
            for tr in re.findall(r'<tr>(.*?)</tr>', fl[1].split('</table>', 1)[0], re.S):
                td = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.S)
                u = re.search(r'href="([^"]+)"', tr)
                if len(td) >= 4 and u:
                    m = re.search(r'(\d+) Yeas - (\d+) Nays', clean(td[3]))
                    fv.append({'c': 'H' if 'House' in clean(td[2]) else 'S', 'd': clean(td[1]).split(' ')[0], 'v': clean(td[0]),
                               'y': int(m.group(1)) if m else None, 'n': int(m.group(2)) if m else None, 'a': '',
                               'u': 'https://www.flsenate.gov' + u.group(1)})
    with open(OUT, 'a') as f: f.write(json.dumps({'ch': e['chapter'], 'an': an, 'fv': fv}) + '\n')
    print(e['chapter'], len(an), len(fv), flush=True)
    time.sleep(6)
print('DONE')
