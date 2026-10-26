"""Owner of record (Miami-Dade Property Appraiser) for decisions marked '@PA' with an address in the place field.
Usage: python3 pa_fill.py <decision prefix> <votes-or-items json> <owners.json> <municipality>"""
import json, sys, os, glob
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import pa
pre, vj, oj, muni = sys.argv[1:5]
V = json.load(open(vj)); dates = {}
for v in V:
    k = v.get('key')
    if not k:
        from mg_review import key as vkey; k = vkey(v)
    dates[k] = v['date']
own = json.load(open(oj)) if os.path.exists(oj) else {}
for f in glob.glob(os.path.join(HERE, 'decisions', pre + '-*.txt')):
    for ln in open(f, encoding='utf8'):
        p = [x.strip() for x in (ln.rstrip('\n').split('|') + [''] * 8)[:8]]
        if p[2] != '@PA' or p[0] in own or not p[5]: continue
        d = dates.get(p[0])
        if not d: print('no date', p[0]); continue
        r = None
        for a in p[5].split(' and '):
            r = pa.owner(a.strip(), d, muni=muni)
            if r and r.get('owner'): break
        print(p[0], p[5], r)
        if r and r.get('owner'):
            from cand import nice
            import re
            import re as _re
            nm = _re.sub(r'\s*&?\s*C/O\b.*$', '', r['owner']); nm = _re.sub(r'\s*&\s*(?=&|LLC\b|INC\b|$)', ' ', nm); nm = _re.sub(r'\s+', ' ', nm).strip()
            own[p[0]] = {'folio': r.get('folio'), 'owner': ' '.join(w.upper() if (w.upper() in ('USA', 'FL', 'SF', 'VP', 'MG', 'SC', 'JAG', 'FD', 'NE', 'NW', 'II', 'III') or not re.search(r'[AEIOUY]', w.upper())) and w.isalpha() else w for w in nice(nm).split()), 'note': f"Owner of record on {d} per the Miami-Dade Property Appraiser (folio {r.get('folio')}): {r.get('note')}."}
json.dump(own, open(oj, 'w'), indent=1, ensure_ascii=False)
