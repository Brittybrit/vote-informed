"""Stage C (resumable): Senate member roll calls for qualifying bills.
Input: stageB.jsonl lines with b:true (this slice's sessions), plus any chapters listed in qualify-extra.json (for sessions whose
stage B lives in scripts/data/tenure/flhouse/bills/). Floor votes come from this slice's stageA.jsonl or flhouse's stageA.jsonl.
For each qualifying chapter, every Senate floor vote that is not an amendment vote is read (the last one is final passage).
Output line (same shape as scripts/data/state/bills/stageC.jsonl): {u, c:'S', d, t:[yeas,nays], a, r:{Garcia,Calatayud,Rodriguez,Ingoglia}}.
Codes on the Senate vote sheet: Y=yes, N=no, EX=excused, AV=abstain, blank=not voting; a member not on the sheet = not seated.
"Rodrigues" (Ray Rodrigues) is a different senator from Rodriguez (Ana Maria Rodriguez); names are matched exactly."""
import json, os, re, subprocess, tempfile, time, sys
H = os.path.dirname(os.path.abspath(__file__))
FH = os.path.join(H, '../../flhouse/bills/stageA.jsonl')
OUT = os.path.join(H, 'stageC.jsonl')
MEM = ['Garcia', 'Calatayud', 'Rodriguez', 'Ingoglia']
CODE = {'Y': 'yes', 'N': 'no', 'EX': 'excused', 'AV': 'abstain', '': 'not voting'}
jl = lambda f: [json.loads(l) for l in open(f) if l.strip()] if os.path.exists(f) else []
A = {x['ch']: x for x in jl(FH)} | {x['ch']: x for x in jl(os.path.join(H, 'stageA.jsonl'))}
Q = [x['ch'] for x in jl(os.path.join(H, 'stageB.jsonl')) + jl(os.path.join(H, '../../flhouse/bills/stageB.jsonl')) if x.get('b')]
ex = os.path.join(H, 'qualify-extra.json')
if os.path.exists(ex): Q += [c for c in json.load(open(ex)) if c not in Q]
done = {x['u'] for x in jl(OUT)}

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
    act = 'final passage' if re.search(r'Third Reading|Passage|Concur', hdr, re.I) else ''
    m = re.search(r'(Third Reading|Second Reading|Motion to Concur[^ ]*(?: [A-Za-z]+){0,4}|Final Passage|Passage)', hdr, re.I)
    return tally, r, (m.group(1) if m else act)

def get(u):
    for t in range(8):
        f = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf'); f.close()
        c = subprocess.run(['curl', '-sS', '-m', '90', '-o', f.name, '-w', '%{http_code}', u], capture_output=True, text=True).stdout
        b = open(f.name, 'rb').read()
        if c == '200' and b[:4] == b'%PDF':
            txt = subprocess.run(['pdftotext', '-layout', f.name, '-'], capture_output=True, text=True).stdout; os.unlink(f.name); time.sleep(8); return txt
        os.unlink(f.name)
        if c == '404': return None
        time.sleep(30 * (t + 1))
    return None

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        print(parse(subprocess.run(['pdftotext', '-layout', sys.argv[2], '-'], capture_output=True, text=True).stdout)); sys.exit()
    for ch in Q:
        a = A.get(ch)
        if not a: print('NO STAGE A', ch, flush=True); continue
        fv = [x for x in a['fv'] if x['c'] == 'S' and 'amendment' not in (x.get('v', '') + x.get('a', '')).lower()]
        for x in fv:
            if x['u'] in done: continue
            txt = get(x['u'])
            if txt is None: print('FAIL', ch, x['u'], flush=True); continue
            tally, r, act = parse(txt)
            rec = {'ch': ch, 'u': x['u'], 'c': 'S', 'd': x['d'], 't': tally or [x['y'], x['n']], 'a': act, 'r': r}
            if tally and x['y'] is not None and tally != [x['y'], x['n']]: rec['note'] = f"sheet tally {tally} vs bill page {[x['y'], x['n']]}"
            with open(OUT, 'a') as f: f.write(json.dumps(rec) + '\n')
            done.add(x['u']); print(ch, x['d'], tally, r, flush=True)
    print('DONE')
