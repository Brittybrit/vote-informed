"""Cutler Bay Town Council minutes (eSCRIBE text, ../../cutlerbay-mixon/minutes/*.txt, Nov 2013 - Nov 2018) -> items.
Each resolution/ordinance title in the minutes becomes an item with what the minutes say happened to it: the motion,
the outcome (adopted/failed/deferred/withdrawn/first reading), the vote as written (Yes/No/Absent lists, 'passed 4-1 with
Council Member X in opposition', 'unanimous (5-0)', adopted on consent), the enactment number when printed, and the
members the roll call shows present. Each item is then matched to the Town Clerk's register (register.json) by meeting
date and title, so the register vote can be checked against the minutes.
Usage: python3 minutes_parse.py <out.json>"""
import json, os, re, sys, difflib, datetime
SP = os.path.dirname(os.path.abspath(__file__)); MD = os.path.join(SP, '..', '..', 'cutlerbay-mixon', 'minutes')
MEM = {'MacDougall': 'MACDOUGALL', 'Sochin': 'SOCHIN', 'Mixon': 'MIXON', 'Loyzelle': 'LOYZELLE', 'Bell': 'BELL', 'Coriat': 'CORIAT',
       'Callahan': 'CALLAHAN', 'Meerbott': 'MEERBOTT', 'Duncan': 'DUNCAN'}
NAMES = '|'.join(MEM)
TITLE = re.compile(r'(?m)^[ \t]*(?:([A-Z]{1,2}|\d{1,2})\.[ \t]+)?(?:A[N]?[ \t]+)?(?=(?:RESOLUTION|ORDINANCE)\s+OF\s+THE\s+(?:MAYOR|TOWN))')
SECTION = re.compile(r'(?m)^[ \t]*\d{1,2}[A-Z]?\.[ \t]+[A-Z][A-Z ,&\'’()/-]{6,}$')

def clean(t):
    t = re.sub(r'<<PG>>', '\n', t)
    t = re.sub(r'(?m)^.*Page \d+\s*Town of Cutler Bay\s*Printed on.*$', '', t)
    t = re.sub(r'(?m)^\s*\w+ \d{1,2}, \d{4}\s*(?:Town Council|Local Planning Agency|Special Town Council)?.*Minutes\s*$', '', t)
    return t

def names_in(s):
    return [n for n in MEM if re.search(r'\b' + n + r'\b', s)]

def roll_present(t):
    """Members listed before 'Present:' in the roll call, minus 'Absent:' names, plus late arrivals (noted)."""
    m = re.search(r'Present:\s*\d', t)
    pres = names_in(t[max(0, m.start() - 400):m.start()]) if m else []
    hd = t[:m.end() + 600] if m else t[:3000]
    ab = re.search(r'Absent:\s*([^\n]*(?:\n[^\n]*)?)', hd)
    absent = names_in(ab.group(1)) if ab else []
    late = names_in(' '.join(re.findall(r'(?:Council Member|Vice Mayor|Mayor)\s+\w+\s+arrived', t[:4000])))
    return [p for p in pres if p not in absent], absent, late

def vote_of(body):
    """What the minutes say about the vote that decided the item."""
    v = {}
    y = re.search(r'Yes:\s*(.*?)\s*\d\s*-', body, re.S)
    if y and not names_in(y.group(1)):
        # 2014 layout: the names come before 'Yes: 5 -' ('... (5-0) Council Member Bell, ... and Mayor MacDougall Yes: 5 -')
        pre = body[:y.start()]; cut = max(pre.rfind(')'), pre.rfind('.'))
        v['yes'] = names_in(pre[cut + 1:]); v['no'] = []; v['absent'] = []; v['recused'] = []; v['form'] = 'list'
        for lab in ('No', 'Absent', 'Excused'):
            z = re.search(r'([^:]*?)\b' + lab + r':\s*\d\s*-', body[y.end():y.end() + 400])
            if z: v['no' if lab == 'No' else 'absent'] += names_in(z.group(1))
        y = None
    if y:
        v['yes'] = names_in(y.group(1))
        n = re.search(r'No:\s*(.*?)\s*\d\s*-', body[y.end():], re.S); v['no'] = names_in(n.group(1)) if n else []
        a = re.search(r'(?:Absent|Excused):\s*(.*?)\s*\d\s*-', body[y.end():], re.S); v['absent'] = names_in(a.group(1)) if a else []
        r = re.search(r'Recused:\s*(.*?)\s*\d\s*-', body[y.end():], re.S); v['recused'] = names_in(r.group(1)) if r else []
        v['form'] = 'list'
    m = list(re.finditer(r'(passed|carried|failed|adopted)[^.]{0,60}?\(?(\d)\s*[-–]\s*(\d)\)?', body, re.I))
    if m:
        x = m[-1]; v['count'] = [int(x.group(2)), int(x.group(3))]; v['verb'] = x.group(1).lower()
        tail = body[x.end():x.end() + 260]
        op = re.search(r'with\s+((?:(?:Council\s+Members?|Vice\s+Mayor|Mayor)\s+)?[^.]*?)\s+(?:in\s+opposition|voting\s+(?:in\s+opposition|no|against)|dissenting|opposed)', tail)
        if op: v['opposed'] = names_in(op.group(1))
        ab = re.search(r'with\s+([^.]*?)\s+(?:absent|not\s+present|out\s+of\s+the\s+room|abstaining|recused)', tail)
        if ab: v['out'] = names_in(ab.group(1))
        v.setdefault('form', 'count')
    if re.search(r'unanimous|all\s+were\s+in\s+favor', body, re.I) and 'form' not in v: v['form'] = 'unanimous'
    return v

def outcome(body):
    b = body
    if re.search(r'adopted on Consent', b, re.I): return 'consent'
    if re.search(r'\bwithdrawn\b|\bwithdrew\b', b, re.I) and not re.search(r'be adopted|be approved|passed on (?:first|second)', b, re.I): return 'withdrawn'
    if re.search(r'to defer|be deferred|was deferred|deferred to', b, re.I) and not re.search(r'that this (?:Resolution|Ordinance) be (?:adopted|approved)|passed on (?:first|second)|to (?:adopt|approve)', b, re.I): return 'deferred'
    if re.search(r'first reading', b, re.I) and not re.search(r'second reading', b[:300], re.I): return 'first'
    if re.search(r'\bfailed\b', b, re.I): return 'failed'
    if re.search(r'passed|carried|adopted|approved', b, re.I): return 'adopted'
    return '?'

def main():
    R = json.load(open(os.path.join(SP, 'register.json')))
    bydate = {}
    for x in R: bydate.setdefault(x['date'], []).append(x)
    rows = [l.rstrip('\n').split('\t') for l in open(os.path.join(MD, 'index.tsv'))][1:]
    out = []
    for date, meeting, url, f, pages in rows:
        t = clean(open(os.path.join(MD, f), errors='ignore').read())
        present, absent, late = roll_present(t)
        # consent vote: the motion in the consent agenda section
        cm = None
        for c in re.finditer(r'(?m)^[ \t]*\d{1,2}\.[ \t]+CONSENT AGENDA[ \t]*$(.*?)(?=\n[ \t]*\d{1,2}[A-Z]?\.[ \t]+[A-Z]{4})', t, re.S): cm = c
        cvote = None
        if cm:
            cs = cm.group(1)
            mm = list(re.finditer(r'(?:A\s+motion\s+was\s+made|made\s+a\s+motion)[^.]*?(?:\bconsent\b|approve\s+items|adopt\s+items)[^\n]*(?:\n[^\n]*){0,6}', cs, re.I))
            if mm: cvote = vote_of(mm[-1].group(0)); cvote['text'] = re.sub(r'\s+', ' ', mm[-1].group(0))[:300]
        ts = list(TITLE.finditer(t))
        for i, m in enumerate(ts):
            st = m.end(); en = ts[i + 1].start() if i + 1 < len(ts) else len(t)
            hd = SECTION.search(t, st + 50, en)
            if hd: en = hd.start()
            body = t[st:en]
            te = re.search(r'EFFECTIVE\s+DATE\.?(?:\s*\([^)]*\))?', body)
            title = re.sub(r'\s+', ' ', body[:te.end()] if te else body[:800]).strip()
            rest = body[te.end():] if te else body[800:]
            oc = outcome(rest)
            v = cvote if oc == 'consent' else vote_of(rest)
            enact = re.search(r'Enactment No:\s*(RES|ORD)\s*(\d{2}-\d{1,3})', rest)
            mvs = list(re.finditer(r'motion\s+was\s+made\s+by\s+(?:Council\s+Member|Vice\s+Mayor|Mayor)\s+(\w+),?\s+(?:and\s+)?seconded\s+by\s+(?:Council\s+Member|Vice\s+Mayor|Mayor)\s+(\w+)', rest))
            mvs = [x for x in mvs if re.search(r'(?:this\s+(?:Resolution|Ordinance)|to\s+(?:adopt|approve|deny))', rest[x.end():x.end() + 120], re.I)]
            mv = mvs[-1] if mvs else None  # the last motion to adopt, approve or deny this item
            kind = 'O' if title.startswith('ORDINANCE') or re.match(r'ORDINANCE', title) else 'R'
            if re.match(r'(?:AN\s+)?ORDINANCE', t[m.end():m.end() + 20]): kind = 'O'
            # register candidates (matched one-to-one below): same kind, within 75 days (the register's adoption dates are
            # sometimes off by days or weeks); the 'Enactment No' printed in the 2014 minutes does not follow the register's
            # numbering, so items are matched by title
            T = re.sub(r'[^A-Z0-9]', '', title.upper())
            T = T[T.find('FLORIDA') + 7:][:600] if 'FLORIDA' in T else T[:600]
            d0 = datetime.date.fromisoformat(date); cands = []
            for x in R:
                if x['kind'] != kind or abs((datetime.date.fromisoformat(x['date']) - d0).days) > 75: continue
                X = re.sub(r'[^A-Z0-9]', '', x['title'].upper())
                X = X[X.find('FLORIDA') + 7:][:600] if 'FLORIDA' in X else X[:600]
                sc = difflib.SequenceMatcher(None, X, T).ratio() + (0.05 if x['date'] == date else 0)
                if sc >= 0.75: cands.append((round(sc, 3), x['kind'] + x['num']))
            reg = None; score = 0
            out.append(dict(date=date, meeting=meeting, url=url, file=f, code=m.group(1) or '-', kind=kind, title=title, outcome=oc, vote=v,
                            mover=mv.group(1) if mv else None, second=mv.group(2) if mv else None,
                            enact=(enact.group(1) + ' ' + enact.group(2)) if enact else None,
                            reg=None, regscore=0, cands=sorted(cands, reverse=True)[:5],
                            present=present, absent=absent, late=late, text=re.sub(r'\s+', ' ', rest)[:1500]))
    # one-to-one: adopted items first, best score first; an item the minutes show as deferred, withdrawn or read only on
    # first reading never takes a register entry
    pairs = []
    for i, o in enumerate(out):
        if o['outcome'] in ('deferred', 'withdrawn', 'first'): continue
        pen = 0.1 if o['outcome'] == 'failed' else 0
        for sc, k in o['cands']: pairs.append((sc - pen, i, k))
    used = set()
    # read by hand: the register text for these rows sits on a neighbouring row in register.json (16-33, 17-08, 17-09),
    # or the minutes' title words differ from the register's (15-39, O16-06); 18-44 is the parking-spaces variance the
    # minutes record 3-2 (the register repeats the title of item E, which the minutes show was withdrawn)
    MANUAL = {('2015-05-20', 'F', 'R'): 'R15-39', ('2016-07-20', 'A', 'O'): 'O16-06', ('2016-06-15', 'A', 'R'): 'R16-33',
              ('2017-02-15', 'C', 'R'): 'R17-08', ('2017-02-15', 'D', 'R'): 'R17-09', ('2018-06-20', 'F', 'R'): 'R18-44'}
    for i, o in enumerate(out):
        k = MANUAL.get((o['date'], o['code'], o['kind']))
        if k and not o['reg']: o['reg'] = k; o['regscore'] = 'hand'; used.add(k)
    for sc, i, k in sorted(pairs, reverse=True):
        if out[i]['reg'] or k in used: continue
        out[i]['reg'] = k; out[i]['regscore'] = round(sc, 3); used.add(k)
    json.dump(out, open(sys.argv[1], 'w'), indent=0)
    print(len(out), 'items;', sum(1 for o in out if o['reg']), 'matched to the register')

if __name__ == '__main__':
    main()
