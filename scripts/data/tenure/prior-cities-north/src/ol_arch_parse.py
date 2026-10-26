"""Opa-locka Archive Center minutes (opalocka/minutes, May 2010 - Dec 2012 and Oct 2018 - May 2019) -> items with roll calls.
These minutes number items many ways ('16-1:', '1. (19-1)', '1 ( 13- 3).', 'a)', 'a.', OCR '1,'), so items are cut at every
resolution/ordinance title instead of at a number. The same title can appear twice in one meeting (in the 'request to amend
the agenda' list and again where it was taken up); the copy with its own vote is kept.
Vote for an item: the last roll-call block between its title and the next title or agenda section heading. Consent
resolutions are read together and voted once after the last of them ('pass the consent agenda resolutions'): an item with
no vote of its own takes the first vote after it in the same section when the motion names the consent resolutions;
otherwise roll None.
Usage: python3 ol_arch_parse.py <dir with bydate.json from ol_arch_index.py> <from> <to> <out.json>"""
import json, re, sys, os, difflib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ol_parse import blocks, ALIAS, MOVED

TITLE = re.compile(r'^[ \t|.;:,]*(?P<pre>[^\n]{0,40}?)\s*(?P<t>AN?\s+(?:RESOLUTION|ORDINANCE)\s+OF\s+THE\s+CITY\s+(?:COMMISSION\s+)?OF\s+(?:THE\s+CITY\s+OF\s+)?OPA)', re.M)
CODE = [re.compile(r'\(\s*(\d{1,2}\s*-\s*\d{1,2}|\d{1,2}\s*[A-Z]\s*\d{0,2})\s*\)'), re.compile(r'(\d{1,2}\s*-\s*\d{1,2})'),
        re.compile(r'^\s*(\d{1,2}|[a-z])\s*[.:,)]'), re.compile(r'^\s*([A-Z]\d{0,2})\s*[.:,)]')]
SECTION = re.compile(r"^[ \t\f|.]*(?:\d{1,2}|[A-Z])[.,:]\s+(?!AN?\s+(?:RESOLUTION|ORDINANCE))[A-Z][A-Z\u2019'&/ ,()\-]{5,}[ \t|:.]*$", re.M)
END = re.compile(r'EFFECTIVE\s+DATE\.?|Sponsored\s+by', re.S)

FOOT = re.compile(r'(?:Minutes|Agenda|Hearing)[^\n]{0,6}?[-\u2014~]*\s*(\d{1,2})\s?/\s?(\d{1,2})\s?/\s?(\d{4})')

def own_pages(t, date):
    """The Mar 20, 2012 PDF carries pages 9-20 of the Mar 14, 2012 minutes after its own six pages: drop pages whose
    footer names another meeting when there are at least three of them."""
    fs = [(m.start(), m.end(), '%s-%02d-%02d' % (m.group(3), int(m.group(1)), int(m.group(2)))) for m in FOOT.finditer(t)]
    other = [f for f in fs if f[2] != date]
    if len(other) < 3: return t
    own = [f for f in fs if f[2] == date and f[0] < other[0][0]]
    return t[:own[-1][1]] if own else t

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
            t = own_pages(t, date)
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
                hd = SECTION.search(t, st + 200, en)  # a new agenda section (e.g. 'A. CITY MANAGER'S REPORT:') ends the item
                if hd: en = hd.start()
                body = t[st:en]
                tm = END.search(body)
                title = re.sub(r'\s+', ' ', body[:tm.end()] if tm and tm.end() < 2500 else body[:900])
                code = code_of(m.group('pre'))
                own = [b for b in bl if st < b['start'] < en]
                b = own[-1] if own else None; src = 'own' if b else None
                incons = any(cs < st and not re.search(r'\n\s*(?:\d{1,2}\.|[A-Z]\.)\s+[A-Z]{4}', t[ce:st].replace('CONSENT', '')) for cs, ce in cons)
                if not b:  # consent items are read together and voted once, after the last of them, in the same section
                    hd2 = SECTION.search(t, en)
                    nxt = [x for x in bl if en <= x['start'] < (hd2.start() if hd2 else len(t))][:1]
                    if nxt and re.search(r'consent|resolutions|items?\s+[\d, and]+of the consent', t[max(0, nxt[0]['start'] - 700):nxt[0]['start']], re.I):
                        b = nxt[0]; src = 'consent'
                mv = None
                if b:  # last motion before the vote: inside the item for its own vote, else just before the consent vote
                    pre = list(MOVED.finditer(t[st:b['start']] if src == 'own' else t[max(0, b['start'] - 1500):b['start']]))
                    if pre: mv = pre[-1]
                hs = [h for h in SECTION.finditer(t, 0, st)]
                hd_prev = hs[-1].group(0) if hs else ''
                reading = 1 if re.search(r'FIRST\s+READING', hd_prev) else 2 if re.search(r'SECOND\s+READING', hd_prev) else None
                tl = re.findall(r'(passed|failed|carried)\s+(?:by\s+)?(?:a\s+)?(\d)\s*[-–]\s*(\d)\s+vote', t[max(0, b['start'] - 700):b['start']], re.I) if b else []
                deferred = bool(re.search(r'\b(?:was|were|be|is)\s+deferred|motion\s+(?:and\s+second\s+)?(?:were|was)\s+withdrawn|withdrawn|deleted|tabled', body[:4000], re.I))
                items.append(dict(date=date, doc=os.path.basename(path), adid=adid, typ=typ, code=code, title=title, roll=b['roll'] if b else None,
                                  src=src, mover=ALIAS.get(mv.group(1), mv.group(1)) if mv else None,
                                  second=ALIAS.get(mv.group(2), mv.group(2)) if mv else None,
                                  what=re.sub(r'\s+', ' ', mv.group(3))[:160] if mv else None, deferred=deferred, pos=st, tally=([tl[-1][2], tl[-1][1]] if tl[-1][0].lower() == 'failed' else [tl[-1][1], tl[-1][2]]) if tl else None, reading=reading,
                                  text=re.sub(r'\s+', ' ', body)[:3000]))
            # same title twice in a meeting (OCR differs slightly): keep the copy with its own vote, else the later one
            keep = []
            for it in items:
                k = re.sub(r'[^A-Z]', '', it['title'].upper())[:300]
                dig = re.findall(r'\d', it['title'])
                dup = [x for x in keep if re.findall(r'\d', x['title']) == dig and
                       difflib.SequenceMatcher(None, re.sub(r'[^A-Z]', '', x['title'].upper())[:300], k).ratio() > 0.95]
                if dup:
                    d = dup[-1]
                    if it['src'] == 'own' or not d['src']:
                        keep[keep.index(d)] = it
                    continue
                keep.append(it)
            rows += keep
    json.dump(rows, open(OUT, 'w'), indent=0)
    print(len(rows), 'items')

if __name__ == '__main__':
    main()
