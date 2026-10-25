"""Stage A (resumable), copied from ../flsenate/bills/stageA.py for this slice's sessions (bills/enacted.jsonl: 2013-2020), newest first.
Fetches go through ../src/net.py (shared 6.5 s gap, 60 s backoff on 429).
For each chapter law: fetch its flsenate.gov bill page, record the analyses list and floor votes (same shape as
scripts/data/state/bills/stageA.jsonl and scripts/data/tenure/flhouse/bills/stageA.jsonl: {ch, an:[[date,url,author]], fv:[{c,d,v,y,n,a,u}]}),
then fetch the final staff analysis PDF and save the text of its Private Sector Impact section to psi.jsonl
({ch, au, ps}) for the stage B reading. Final analysis rule (same as scripts/data/state/bills/progress.md): the House
final bill analysis (h####z / z1) if present, else the latest-dated Senate analysis that is not a pre-meeting (.pre.) one;
House Message Summaries (.hms.) skipped. Throttled to about 1 request per 8 s with 30 s+ backoff on 429."""
import re, json, os, time, subprocess, html, sys, tempfile
H = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(H, '../src')); import net
E = [json.loads(l) for l in open(os.path.join(H, 'enacted.jsonl')) if l.strip()]
E = [e for e in E if e['chapter']]
E.sort(key=lambda e: (-int(e['chapter'][:4]), int(e['chapter'][5:])))
OUT, PSI = os.path.join(H, 'stageA.jsonl'), os.path.join(H, 'psi.jsonl')
done = {json.loads(l)['ch'] for l in open(OUT)} if os.path.exists(OUT) else set()
pdone = {json.loads(l)['ch'] for l in open(PSI)} if os.path.exists(PSI) else set()
def get(u, binary=False):
    return net.get(u, binary=binary, minlen=2000)
clean = lambda s: html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', s))).strip()
def pick(an):
    z = [a for a in an if re.search(r'/h\d{4}[a-z]?z1?\.', a[1], re.I) and '.hms.' not in a[1].lower()]
    if z: return z[-1][1]
    s = [a for a in an if '.pre.' not in a[1].lower() and '.hms.' not in a[1].lower()]
    if not s: s = an
    key = lambda a: tuple(int(x) for x in (a[0].split('/')[2], a[0].split('/')[0], a[0].split('/')[1])) if a[0].count('/') == 2 else (0, 0, 0)
    return sorted(s, key=key)[-1][1] if s else None
def psi_text(pdf):
    with tempfile.NamedTemporaryFile(suffix='.pdf') as f:
        f.write(pdf); f.flush()
        t = subprocess.run(['pdftotext', '-layout', f.name, '-'], capture_output=True, text=True).stdout
    t2 = re.sub(r'[ \t]+', ' ', t)
    m = re.search(r'DIRECT ECONOMIC IMPACT ON (?:THE )?PRIVATE SECTOR:?\s*(.*?)(?=\n\s*D\.\s*FISCAL COMMENTS|\n\s*[IVX]+\.\s|\Z)', t2, re.S | re.I)
    if m: return re.sub(r'\s+', ' ', m.group(1)).strip()[:2500]
    m = re.search(r'\n\s*(?:B\.|2\.)\s*PRIVATE SECTOR(?: IMPACT)?:?\s*(.*?)(?=\n\s*(?:C\.|3\.|D\.)\s*(?:GOVERNMENT SECTOR|FISCAL COMMENTS|Government Sector)|\n\s*(?:VI|VII|III)\.\s|\Z)', t2, re.S | re.I)
    if not m: m = re.search(r'Private Sector Impact:?\s*(.*?)(?=\n\s*C\.\s|\n\s*Government Sector|\Z)', t2, re.S | re.I)
    return re.sub(r'\s+', ' ', m.group(1)).strip()[:2500] if m else None
for e in E:
    ch = e['chapter']
    if ch not in done:
        h = get(e['url'])
        if not h: print('FAIL page', ch, flush=True); continue
        h = h.decode('utf8', 'replace'); an, fv = [], []
        a = h.split('id="tabBodyAnalyses"', 1)
        if len(a) > 1:
            for tr in re.findall(r'<tr>(.*?)</tr>', a[1].split('</table>', 1)[0], re.S):
                td = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.S); u = re.search(r'href="([^"]+)"', tr)
                if len(td) >= 4 and u: an.append([clean(td[3]).split(' ')[0], 'https://www.flsenate.gov' + u.group(1), clean(td[2])])
        v = h.split('id="tabBodyVoteHistory"', 1)
        if len(v) > 1:
            fl = v[1].split('Vote History - Floor', 1)
            if len(fl) > 1:
                for tr in re.findall(r'<tr>(.*?)</tr>', fl[1].split('</table>', 1)[0], re.S):
                    td = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.S); u = re.search(r'href="([^"]+)"', tr)
                    if len(td) >= 4 and u:
                        m = re.search(r'(\d+) Yeas - (\d+) Nays', clean(td[3]))
                        fv.append({'c': 'H' if 'House' in clean(td[2]) else 'S', 'd': clean(td[1]).split(' ')[0], 'v': clean(td[0]),
                                   'y': int(m.group(1)) if m else None, 'n': int(m.group(2)) if m else None, 'a': '',
                                   'u': 'https://www.flsenate.gov' + u.group(1)})
        with open(OUT, 'a') as f: f.write(json.dumps({'ch': ch, 'an': an, 'fv': fv}) + '\n')
        done.add(ch); rec = {'an': an}
    else:
        rec = next(json.loads(l) for l in open(OUT) if json.loads(l)['ch'] == ch)
    if ch in pdone: continue
    au = pick(rec['an'])
    ps = None
    if au:
        pdf = get(au, binary=True)
        ps = psi_text(pdf) if pdf else 'FETCH_FAILED'
    with open(PSI, 'a') as f: f.write(json.dumps({'ch': ch, 'bill': e['bill'], 'title': e['title'], 'au': au, 'ps': ps}) + '\n')
    pdone.add(ch); print(ch, len(rec['an']), 'ok' if ps and ps != 'FETCH_FAILED' else ps, flush=True)
print('DONE')
