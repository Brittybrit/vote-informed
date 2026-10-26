"""Normalize decision files to 8 fields: drop surplus empty fields after the subject; move a sentence left in the reps field to the note."""
import glob, re, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); n = 0
for f in glob.glob(os.path.join(HERE, 'decisions', '*.txt')):
    if os.path.basename(f).startswith('rolls-'): continue
    out = []
    for ln in open(f, encoding='utf8').read().split('\n'):
        if not ln.strip() or ln.startswith('#'): out.append(ln); continue
        p = ln.split('|'); o = list(p)
        while len(p) > 8:
            j = next((i for i in range(4, len(p) - 1) if p[i] == ''), None)
            if j is None: break
            del p[j]
        if len(p) == 7 and p[6] and (p[6].endswith('.') or re.search(r'\b(the|of|for|a|an|and|to)\b', p[6])) and len(p[6].split()) > 2:
            p = p[:6] + ['', p[6]]
        if p != o: n += 1; print(os.path.basename(f), p[0])
        out.append('|'.join(p))
    open(f, 'w', encoding='utf8').write('\n'.join(out))
print('fixed', n)
