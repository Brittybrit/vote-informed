"""Senate roll calls (resumable). Jobs: bills/vote-jobs.jsonl {ch, session, u, d} (one Senate final-passage sheet per qualifying law).
Each sheet PDF is saved as text in raw/votes/<file>.txt (so it can be re-read for any member without refetching) and parsed
into bills/rolls.jsonl {ch, u, c:'S', d, t:[yeas,nays], a, r:{Avila,Taddeo,Simpson,Rodriguez,Campbell}}.
Codes on the Senate vote sheet: Y=yes, N=no, EX=excused, AV=abstain, blank=not voting; a member not on the sheet = not seated.
'Rodriguez' on a 2017-2020 sheet is Jose Javier Rodriguez (only senator of that name then); 2021+ it is Ana Maria Rodriguez,
whose votes are in ../flsenate, so it is recorded here only for sheets dated before 2020-11-03. 'Rodrigues' (Ray) is a different senator."""
import json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__)); from net import get
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEM = ['Avila', 'Taddeo', 'Simpson', 'Rodriguez', 'Campbell']
CODE = {'Y': 'yes', 'N': 'no', 'EX': 'excused', 'AV': 'abstain', '': 'not voting'}
jl = lambda f: [json.loads(l) for l in open(f) if l.strip()] if os.path.exists(f) else []
OUT = os.path.join(H, 'bills/rolls.jsonl')

def parse(txt):
    t = re.search(r'Yeas\s*-\s*(\d+)\s+Nays\s*-\s*(\d+)', txt)
    tally = [int(t.group(1)), int(t.group(2))] if t else None
    body = txt.split('Presiding', 1)[-1].split('Y=Yea', 1)[0]
    r = {}
    for m in re.finditer(r'(?:(?<![A-Za-z])(Y|N|EX|AV)\s+)?((?:President\s+)?[A-Z][A-Za-z\'\.]+(?: [A-Z][A-Za-z\'\.]+)?)-(\d{1,2})\b', body):
        name = m.group(2).replace('President ', '').strip()
        if name in MEM: r[name] = CODE[m.group(1) or '']
    for k in MEM: r.setdefault(k, 'not seated')
    hdr = re.sub(r'\s+', ' ', txt.split('Yeas', 1)[0])
    m = re.search(r'(Third Reading|Second Reading|Motion to Concur[^ ]*(?: [A-Za-z]+){0,4}|Final Passage|Passage)', hdr, re.I)
    return tally, r, (m.group(1) if m else 'final passage')

def text(u):
    p = os.path.join(H, 'raw/votes', u.rsplit('/', 1)[1].rsplit('.', 1)[0] + '.txt')
    if os.path.exists(p) and os.path.getsize(p) > 0: return open(p).read()
    b = get(u, binary=True)
    if not b: return None
    pdf = p[:-4] + '.pdf'; open(pdf, 'wb').write(b)
    subprocess.run(['pdftotext', '-layout', pdf, p]); os.unlink(pdf)
    return open(p).read()

if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'test':
        print(parse(open(sys.argv[2]).read())); sys.exit()
    done = {x['u'] for x in jl(OUT)}
    for j in jl(os.path.join(H, 'bills/vote-jobs.jsonl')):
        if j['u'] in done: continue
        txt = text(j['u'])
        if txt is None: print('FAIL', j['ch'], j['u'], flush=True); continue
        tally, r, act = parse(txt)
        rec = {'ch': j['ch'], 'session': j.get('session'), 'u': j['u'], 'c': 'S', 'd': j.get('d'), 't': tally, 'a': act, 'r': r}
        with open(OUT, 'a') as f: f.write(json.dumps(rec) + '\n')
        done.add(j['u']); print(j['ch'], j.get('d'), tally, {k: v for k, v in r.items() if v != 'not seated'}, flush=True)
    print('DONE')
