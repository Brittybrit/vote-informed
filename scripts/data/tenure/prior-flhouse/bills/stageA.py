"""Stage A (resumable): for each chapter law in enacted.json (oldest first, see below), fetch its flsenate.gov bill page
and record the analyses list and floor votes, one JSON line per chapter in stageA.jsonl (same shape as
../../flhouse/bills/stageA.jsonl: {ch, an:[[date,url,author]], fv:[{c,d,v,y,n,a,u}]}).
A chapter already fetched by the prior-flsenate slice (../../prior-flsenate/bills/stageA.jsonl, same bill pages) is
copied from there instead of fetched again (marked "from").
Run: python3 scripts/data/tenure/prior-flhouse/bills/stageA.py"""
import re, json, os, sys, html
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import fl
E = json.load(open(os.path.join(H, 'enacted.json')))
OUT = os.path.join(H, 'stageA.jsonl')
OTHER = os.path.join(H, '..', '..', 'prior-flsenate', 'bills', 'stageA.jsonl')
jl = lambda f: [json.loads(l) for l in open(f) if l.strip()] if os.path.exists(f) else []
done = {r['ch'] for r in jl(OUT)}
clean = lambda s: html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', s))).strip()
def parse(h):
    an, fv = [], []
    a = h.split('id="tabBodyAnalyses"', 1)
    if len(a) > 1:
        for tr in re.findall(r'<tr>(.*?)</tr>', a[1].split('</table>', 1)[0], re.S):
            td = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.S)
            u = re.search(r'href="([^"]+)"', tr)
            if len(td) >= 4 and u: an.append([clean(td[3]).split(' ')[0], 'https://www.flsenate.gov' + u.group(1), clean(td[2])])
    v = h.split('id="tabBodyVoteHistory"', 1)
    if len(v) > 1:
        flr = v[1].split('Vote History - Floor', 1)
        if len(flr) > 1:
            for tr in re.findall(r'<tr>(.*?)</tr>', flr[1].split('</table>', 1)[0], re.S):
                td = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.S)
                u = re.search(r'href="([^"]+)"', tr)
                if len(td) >= 4 and u:
                    m = re.search(r'(\d+) Yeas - (\d+) Nays', clean(td[3]))
                    fv.append({'c': 'H' if 'House' in clean(td[2]) else 'S', 'd': clean(td[1]).split(' ')[0], 'v': clean(td[0]),
                               'y': int(m.group(1)) if m else None, 'n': int(m.group(2)) if m else None, 'a': '',
                               'u': 'https://www.flsenate.gov' + u.group(1)})
    return an, fv
# oldest first: the prior-flsenate slice fetches the same bill pages newest first, and rows it has are copied, not refetched
order = sorted(E, key=lambda e: (int(e['chapter'][:4]), int(e['chapter'][5:])))
for e in order:
    ch = e['chapter']
    if ch in done: continue
    other = {r['ch']: r for r in jl(OTHER)}
    if ch in other and (other[ch].get('an') or other[ch].get('fv')):
        r = dict(other[ch]); r['from'] = 'prior-flsenate'
        with open(OUT, 'a') as f: f.write(json.dumps({k: r[k] for k in ('ch', 'an', 'fv', 'from') if k in r}) + '\n')
        done.add(ch); print(ch, 'copied', flush=True); continue
    h = fl.page(e['url'])
    if not h: print('FAIL', ch, flush=True); continue
    an, fv = parse(h)
    with open(OUT, 'a') as f: f.write(json.dumps({'ch': ch, 'an': an, 'fv': fv}) + '\n')
    done.add(ch); print(ch, len(an), len(fv), flush=True)
print('DONE')
