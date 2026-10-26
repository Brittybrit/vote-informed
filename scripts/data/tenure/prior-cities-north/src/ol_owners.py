"""Owner of record (Miami-Dade Property Appraiser) for Opa-locka decisions marked '@PA'. The place field gives a street
address and/or '(folio XX-XXXX-XXX-XXXX)'; a folio is used directly, else the address is searched in Opa-locka.
Usage: python3 ol_owners.py <items.json> <owners.json> <decision files...>"""
import json, sys, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
os.environ.setdefault('PA_CACHE', os.path.join(HERE, '..', 'opalocka', 'pa_cache.json'))
import pa
from cand import nice
V = {v['key']: v['date'] for v in json.load(open(sys.argv[1]))}
oj = sys.argv[2]; own = json.load(open(oj)) if os.path.exists(oj) else {}
def clean(o):
    nm = re.sub(r'\s*&?\s*C/O\b.*$', '', o); nm = re.sub(r'\s*&\s*(?=&|LLC\b|INC\b|$)', ' ', nm); nm = re.sub(r'\s+', ' ', nm).strip()
    return ' '.join(w.upper() if (w.upper() in ('USA', 'FL', 'II', 'III', 'LLC', 'LP', 'NW') or not re.search(r'[AEIOUY]', w.upper())) and w.isalpha() else w for w in nice(nm).split())
for f in sys.argv[3:]:
    for ln in open(f, encoding='utf8'):
        p = [x.strip() for x in (ln.rstrip('\n').split('|') + [''] * 8)[:8]]
        if p[2] != '@PA' or p[0] in own: continue
        d = V.get(p[0]); place = p[5]
        if not d: print('no date', p[0]); continue
        fol = re.findall(r'\d{2}-\d{4}-\d{3}-\d{4}', place)
        r = None
        if fol:
            o, n = pa.owner_asof(fol[0], d)
            r = dict(folio=fol[0], owner=o, note=n)
        else:
            r = pa.owner(re.sub(r'\s*\(.*\)', '', place), d, muni='Opa-locka')
        print(p[0], place, '->', r.get('owner'), '|', r.get('note'))
        if r and r.get('owner'):
            own[p[0]] = {'folio': r.get('folio'), 'owner': clean(r['owner']),
                         'note': f"Owner of record on {d} per the Miami-Dade Property Appraiser (folio {r.get('folio')}): {r.get('note')}."}
json.dump(own, open(oj, 'w'), indent=1, ensure_ascii=False)
