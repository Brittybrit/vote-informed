"""Some Miami Gardens minutes PDFs hold two meetings. Split txt/<id>.txt at the second 'met in ... session' date:
the first part stays in txt/<id>.txt (full text kept in txt/<id>.full), the second goes to txt/<id>b.txt and a row in
list-extra.tsv (only if no other minutes file covers that date). Usage: python3 mg_split.py <workdir>"""
import re, glob, os, sys, datetime
W = sys.argv[1]
MONTHS = 'January February March April May June July August September October November December'.split()
have = set()
for ln in open(os.path.join(W, 'list.tsv')):
    p = ln.rstrip('\n').split('\t'); m = re.match(r'(\d{1,2})\s*[.\-]\s*(\d{1,2})\s*[.\-]\s*(\d{4})', p[4])
    if m: have.add((int(m.group(3)), int(m.group(1)), int(m.group(2)), p[1]))
extra = []
for f in sorted(glob.glob(os.path.join(W, 'txt', '*.txt'))):
    i = os.path.basename(f)[:-4]
    if i.endswith('b'): continue
    src = f[:-4] + '.full' if os.path.exists(f[:-4] + '.full') else f
    t = open(src, errors='ignore').read()
    ms = [(m.start(), m.group(1)) for m in re.finditer(r'met\s+in\s+(?:a\s+)?(?:regular|special|budget|zoning)?\s*(?:session|meeting)[^.]{0,40}?((?:' + '|'.join(MONTHS) + r')\s+\d{1,2},\s*\d{4})', t, re.I | re.S)]
    if len({re.sub(r'\s+', ' ', d) for _, d in ms}) < 2: continue
    first = re.sub(r'\s+', ' ', ms[0][1])
    pos, d2 = next((p, re.sub(r'\s+', ' ', d)) for p, d in ms if re.sub(r'\s+', ' ', d) != first)
    cut = max(t.rfind('CITY OF MIAMI GARDENS', 0, pos), t.rfind('CITY COUNCIL MINUTES', 0, pos - 300))
    if cut < 0 or pos - cut > 1500: cut = t.rfind('\n', 0, pos - 400)
    if src == f: open(f[:-4] + '.full', 'w').write(t)
    open(f, 'w').write(t[:cut]); open(f[:-4] + 'b.txt', 'w').write(t[cut:])
    dt = datetime.datetime.strptime(d2, '%B %d, %Y')
    dup = [h for h in have if h[:3] == (dt.year, dt.month, dt.day) and h[3] != i]
    print(i, first, '|', d2, 'separate file exists' if dup else 'added')
    if not dup: extra.append(f'{dt.year}\t{i}b\t-2\t0\t{dt:%m.%d.%Y} (second meeting in document {i})')
open(os.path.join(W, 'list-extra.tsv'), 'w').write(''.join(e + '\n' for e in extra))
