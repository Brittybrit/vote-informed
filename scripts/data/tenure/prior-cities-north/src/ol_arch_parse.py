"""Opa-locka Archive Center minutes (opalocka/minutes, May 2010 - Dec 2012 and Oct 2018 - May 2019) -> items with roll calls.
These minutes number items many ways ('16-1:', '1. (19-1)', '1 ( 13- 3).', 'a)', 'a.', OCR '1,'), so items are cut at every
resolution/ordinance title instead of at a number. The same title can appear twice in one meeting (in the 'request to amend
the agenda' list and again where it was taken up); the copy with its own vote is kept.
Vote for an item: the last roll-call block between its title and the next title. An item with none that sits under a
consent-agenda heading takes the vote on the consent agenda (item 6) unless the minutes list it as pulled; otherwise roll None.
Usage: python3 ol_arch_parse.py <dir with bydate.json from ol_arch_index.py> <from> <to> <out.json>"""
import json, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ol_parse import blocks, ALIAS, MOVED

TITLE = re.compile(r'^[ \t|.;:,]*(?P<pre>[^\n]{0,40}?)\s*(?P<t>AN?\s+(?:RESOLUTION|ORDINANCE)\s+OF\s+THE\s+CITY\s+(?:COMMISSION\s+)?OF\s+(?:THE\s+CITY\s+OF\s+)?OPA)', re.M)
CODE = [re.compile(r'\(\s*(\d{1,2}\s*-\s*\d{1,2}|\d{1,2}\s*[A-Z]\s*\d{0,2})\s*\)'), re.compile(r'(\d{1,2}\s*-\s*\d{1,2})'),
        re.compile(r'^\s*(\d{1,2}|[a-z])\s*[.:,)]'), re.compile(r'^\s*([A-Z]\d{0,2})\s*[.:,)]')]
END = re.compile(r'EFFECTIVE\s+DATE\.?|Sponsored\s+by', re.S)

def code_of(pre):
    for rx in CODE:
        m = rx.search(pre)
        if m: return re.sub(r'\s+', '', m.group(1))
    return '?'

def main():
    B, D0, D1, OUT = sys.argv[1:5]
    M = json.load(open(os.path.join(B, 'bydate.json')))
    rows = []
    for date in sorted(M):
        if not (D0 <= date <= D1): continue
        for path, typ, n, adid in M[date]:
            t = open(path, errors='ignore').read()
            bl = blocks(t)
            ts = list(TITLE.finditer(t))
            # consent vote: first block after the 'APPROVAL OF CONSENT AGENDA' heading, if it comes before the first title taken up
            cm = re.search(r'APPROVAL\s+OF\s+(?:THE\s+)?CONSENT\s+AGENDA', t)
            cvote = None; pulled = set()
            if cm:
                nb = [b for b in bl if b['start'] > cm.end()][:1]
                if nb: cvote = nb[0]
                seg = t[cm.end(): cm.end() + 2500]
                pm = re.search(r'pulled[^\n]{0,40}(?:\n[^\n]*){0,8}', seg)
                if pm: pulled = {re.sub(r'\s+', '', x) for x in re.findall(r'\d{1,2}\s*-\s*\d{1,2}|\d{1,2}[A-Z]\d', pm.group(0))}
            cons = [(m.start(), m.end()) for m in re.finditer(r'^\s*\|?\s*(?:\d{1,2}\.\s*)?CONSENT\s+AGENDA\s*:?\s*$', t, re.M)]
            items = []
            for i, m in enumerate(ts):
                st = m.start('t'); en = ts[i + 1].start('t') if i + 1 < len(ts) else len(t)
                body = t[st:en]
                tm = END.search(body)
                title = re.sub(r'\s+', ' ', body[:tm.end()] if tm and tm.end() < 2500 else body[:900])
                code = code_of(m.group('pre'))
                own = [b for b in bl if st < b['start'] < en]
                b = own[-1] if own else None; src = 'own' if b else None
                incons = any(cs < st and not re.search(r'\n\s*(?:\d{1,2}\.|[A-Z]\.)\s+[A-Z]{4}', t[ce:st].replace('CONSENT', '')) for cs, ce in cons)
                if not b and cvote and incons and code not in pulled and cvote['start'] < st:
                    b = cvote; src = 'consent'
                mv = None
                if b:
                    pre = list(MOVED.finditer(t[max(0, b['start'] - 1500):b['start']]))
                    if pre: mv = pre[-1]
                deferred = bool(re.search(r'\b(?:was|were|be|is)\s+deferred|motion\s+(?:and\s+second\s+)?(?:were|was)\s+withdrawn|withdrawn|deleted|tabled', body[:4000], re.I))
                items.append(dict(date=date, doc=os.path.basename(path), adid=adid, typ=typ, code=code, title=title, roll=b['roll'] if b else None,
                                  src=src, mover=ALIAS.get(mv.group(1), mv.group(1)) if mv else None,
                                  second=ALIAS.get(mv.group(2), mv.group(2)) if mv else None,
                                  what=re.sub(r'\s+', ' ', mv.group(3))[:160] if mv else None, deferred=deferred, pos=st,
                                  text=re.sub(r'\s+', ' ', body)[:3000]))
            # same title twice in a meeting: keep the copy with its own vote (else the later one)
            keep = []
            for it in items:
                k = re.sub(r'[^A-Z]', '', it['title'].upper())[:260]
                dup = [x for x in keep if re.sub(r'[^A-Z]', '', x['title'].upper())[:260] == k]
                if dup:
                    d = dup[0]
                    if (it['src'] == 'own') or not d['src']:
                        if not it['roll'] and d['roll']: continue
                        keep[keep.index(d)] = it
                    continue
                keep.append(it)
            rows += keep
    json.dump(rows, open(OUT, 'w'), indent=0)
    print(len(rows), 'items')

if __name__ == '__main__':
    main()
