"""Miami Gardens council minutes -> items with votes.
Usage: python3 mg_parse.py <workdir>   (workdir holds list.tsv and txt/<docid>.txt from pdftotext -layout)
Writes <workdir>/items.json: one row per agenda item with title, resolution number, motion, roll, flags."""
import json, re, sys, os
W = sys.argv[1]

TITLES = r'(?:Mayor|Vice\s*Mayor|Vite\s*Mayor|Council\s*(?:wo)?man|Council\s*Member|Councilmember|Chair|Vice\s*Chair)'
# surname normalisation (OCR variants)
ALIAS = {'Giblert': 'Gilbert', 'Gilbcrt': 'Gilbert', 'Willims': 'Williams', 'Ighodora': 'Ighodaro', 'Ighordaro': 'Ighodaro',
         'Odum': 'Odom', 'Bratten': 'Bratton', 'Pritchet': 'Pritchett', 'Stephen': 'Stephens', 'Julian': 'Julien', 'Odon': 'Odom', 'Odorn': 'Odom', 'Harri': 'Harris'}
NAMEWORD = r"(?!Council|Vice|Mayor|Also)[A-Z][a-zA-Z'\-]+(?:,?\s*Jr\.?)?"

def norm_name(n):
    n = re.sub(r',?\s*Jr\.?$', '', n.strip()).strip(' ,.:')
    n = n.split()[-1] if n.split() else n
    n = n.strip(' ,.:')
    if n.lower() in ('was', 'were', 'replied', 'stated', 'said', 'is', 'also', 'arrived', 'left', 'and', 'the'): return ''
    if n.islower(): n = n.capitalize()
    return ALIAS.get(n, n)

def clean(t):
    out = []
    for ln in t.split('\n'):
        s = ln.strip()
        if not s: continue
        if re.match(r'^(DocuSign|Docusign) Envelope ID', s): continue
        if re.match(r'^Page \d+ of \d+$', s): continue
        if re.match(r'^(CITY COUNCIL\s+MINUTES|City Council Minutes)\s*[-–]?\s*\w+ \d', s, re.I): continue
        if re.match(r'^\w+ \d{1,2}, ?\d{4}\s+(Regular )?(Special )?City Council\s+Meeting$', s, re.I): continue
        if re.match(r'^(Regular|Special) City Council Meeting$', s, re.I): continue
        if re.match(r'^\w+ \d{1,2}, \d{4}$', s) and out and re.match(r'^Page|^\d+$', out[-1]): continue
        if re.match(r'^\d{1,2}$', s): continue
        if len(s) < 100 and re.search(r'minutes', s, re.I) and re.search(r'\bpage\s*\d+|\b(19|20)\d\d\b', s, re.I) and not re.search(r'approv|motion|draft', s, re.I): continue
        if re.match(r'^Page \d+$', s, re.I): continue
        out.append(re.sub(r'\s+', ' ', s))
    return out

HDR = re.compile(r'^(?:\(?([A-Z])\s*[-–—]\s*(\d{1,2})\s*[\).]|([A-Z])(\d{1,2})\)|(\d{1,2})\.\s?(\d{1,2})(?:\.\s?\d{1,2})?\.?(?=\s)|ADD[- ]?ON ITEM\s*#?\s*(\d+))\s*(.*)$')
SEC = re.compile(r'^(?:\(?([A-Za-z])[A-Za-z]?\)|(\d{1,2})\.)\s+([A-Z][A-Z\s\(\)/&,\-]+.*)$')

def parse_doc(lines):
    items = []; cur = None; section = ''; secname = ''
    for i, s in enumerate(lines):
        m = HDR.match(s)
        if m:
            if m.group(7):
                code = 'ADD' + m.group(7)
            elif m.group(1): code = f'{m.group(1)}-{int(m.group(2))}'
            elif m.group(3): code = f'{m.group(3)}-{int(m.group(4))}'
            else: code = f'{int(m.group(5))}.{int(m.group(6))}'
            cur = {'code': code, 'section': secname, 'lines': [m.group(8)], 'start': i}
            items.append(cur); continue
        sm = SEC.match(s)
        if sm and len(s) < 90 and (s.upper() == s or re.search(r'CONSENT|RESOLUTION|ORDINANCE|QUASI|REPORTS|MINUTES|ORDER OF BUSINESS|PRESENTATION|ADJOURN', s)):
            secname = sm.group(3).strip(); cur = None
            items.append({'code': '__SEC__', 'section': secname, 'lines': [], 'start': i}); continue
        if cur is not None: cur['lines'].append(s)
        elif items: items[-1]['lines'].append(s)
    return items

TITLE_START = re.compile(r'\b(A\s+RESOLUTION|AN\s+ORDINANCE|A\s+JOINT\s+RESOLUTION)\b')
MOTION = re.compile(r'(?:A\s+)?(?:motion(?:ed)?|moved)\s+(?:was\s+)?(?:made|offered|by)\s*(?:by\s+)?(.*?)(?:,|\s)\s*seconded\s+by\s+(.*?),?\s+to\s+(.*?)(?:,)?\s+(passed|failed|carried|died|was\s+approved|was\s+denied|was\s+adopted)(.*?)(?:roll\s*call|voice)?\s*vote', re.I | re.S)

# 2018 style: "Councilwoman X made a motion, seconded by Y, to approve ... There being no discussion, the motion approved by a 7-0 voice vote"
MOTION2 = re.compile(r'((?:Council\s*(?:wo)?man|Vice\s+Mayor|Mayor)\s+[A-Z][\w.]*(?:\s+[A-Z][\w.]*,?){0,2})\s+made\s+a\s+motion,?\s+seconded\s+by\s+(.*?),?\s+to\s+(.*?)\.\s+(?:(?!made\s+a\s+motion).){0,300}?the\s+(?:motion|item)\s+(?:to\s+[^.]{0,80}?)?(approved|passed|failed|carried|died)(.{0,60}?)(?:roll\s*call|voice)?\s*vote', re.I | re.S)

def split_title(text):
    """title = from A RESOLUTION/AN ORDINANCE up to 'EFFECTIVE DATE' (+ sponsor parenthetical)."""
    m = TITLE_START.search(text)
    if not m: return None, text
    st = m.start()
    e = re.search(r'E\s*F\s*F\s*E\s*C\s*T\s*\S{0,2}\s*\S?\s*V?\s*E\s*D\s*A\s*T\s*E\s*\.?(\s*\(\s*SPONSORED[^)]*\))?', text[st:], re.I)
    stop = re.search(r'\b(?:A\s+motion|Motion\s+(?:was\s+)?(?:offered|made|by)|There\s+being|This\s+item\s+was|Item\s+\S+\s+was|Council\s*(?:wo)?man\s+[A-Z][a-z]+\s+(?:pulled|asked|inquired|requested|spoke|stated|moved))', text[st:])
    if e and (not stop or e.start() < stop.start()): en = st + e.end()
    elif stop: en = st + stop.start()
    else:
        e2 = re.search(r'\.\s+(?=[A-Z][a-z])', text[st:])
        en = st + (e2.end() if e2 else len(text) - st)
    return text[st:en].strip(), text[:st] + ' ' + text[en:]

ROLL_LINE = re.compile(r'^' + TITLES + r'\s+(' + NAMEWORD + r'(?:\s+' + NAMEWORD + r')?)\s*(?:,\s*D\.O\.,?\s*MPH)?\s*:?\s*(Yes|No|Absent|Abstain(?:ed)?|Recused|Excused|Not\s+Present|Yea|Nay)\b', re.I)

def find_rolls(lines):
    """return list of (line_index, {name: vote}) for consecutive roll lines."""
    res = []; i = 0
    while i < len(lines):
        m = ROLL_LINE.match(lines[i])
        if m:
            r = {}; j = i
            while j < len(lines):
                m2 = ROLL_LINE.match(lines[j])
                if not m2:
                    # tolerate a page header in between
                    if j + 1 < len(lines) and ROLL_LINE.match(lines[j + 1]) and len(r) < 7: j += 1; continue
                    break
                v = m2.group(2).lower()
                v = {'yea': 'yes', 'nay': 'no', 'abstained': 'abstain', 'excused': 'absent', 'not present': 'absent'}.get(v, v)
                r[norm_name(m2.group(1))] = v; j += 1
            res.append((i, r)); i = j
        else: i += 1
    return res

def present_list(text):
    m = re.search(r'were\s+present\s*:?(.*?)(?:Also\s+(?:in\s+)?(?:attendance|present)|\.\s+[A-Z][a-z]+\s+(?:Mayor|Council)|$)', text, re.S)
    if not m: return []
    seg = m.group(1)
    names = re.findall(TITLES + r's?\s*:?\s*((?:' + NAMEWORD + r'\s*){1,3})', seg)
    out = []
    for n in names:
        for part in re.split(r',|\band\b', n):
            if part.strip(): out.append(norm_name(part)); break
    # plain list after 'Council members:'
    m2 = re.search(r'Council\s*(?:wo)?(?:men|members|Members)\s*:?\s*(.*)', seg, re.S)
    if m2:
        for part in re.split(r',|\band\b', m2.group(1)):
            part = re.sub(TITLES, '', part).strip(' .\n')
            if re.match(r"^[A-Z][a-zA-Z\.']+(\s+[A-Z][a-zA-Z\.']+){0,3}(,?\s*Jr\.?)?$", part): out.append(norm_name(part))
    seen = []
    for n in out:
        if n and n not in seen and n not in ('Mayor', 'Vice', 'Council', 'Councilman', 'Councilwoman'): seen.append(n)
    return seen

def dissent(t):
    m = re.search(r'^(.{0,250}?)\b(?:cast|casting|provided|providing)\s+the\s+dissenting\s+votes?', t, re.S)
    out = []
    if m:
        seg = m.group(1); seg = re.split(r'vote\.|vote of the City Council\.', seg)[-1]
        out = [norm_name(x) for x in re.findall(TITLES + r's?\s+((?:' + NAMEWORD + r'\s*){1,2})', seg)]
    m = re.search(r'^.{0,120}?(?:with|,)\s+((?:' + TITLES + r'\s+' + NAMEWORD + r'(?:,\s*|\s+and\s+)?)+)\s+(?:voting\s+no|voting\s+against|dissenting)', t, re.S)
    if m and not out:
        out = [norm_name(x) for x in re.findall(TITLES + r's?\s+(' + NAMEWORD + r')', m.group(1))]
    return out

def events(lines):
    ev = []
    for i, s in enumerate(lines):
        for mm in re.finditer(TITLES + r'\s+(?:' + NAMEWORD + r'\s+)?(' + NAMEWORD + r')\s+(arrived|left|returned|rejoined|departed|stepped out|excused himself|excused herself)', s):
            ev.append((i, norm_name(mm.group(1)), mm.group(2)))
    return ev

def main():
    meta = {}
    for ln in list(open(os.path.join(W, 'list.tsv'))) + (list(open(os.path.join(W, 'list-extra.tsv'))) if os.path.exists(os.path.join(W, 'list-extra.tsv')) else []):
        y, i, t, p, n = ln.rstrip('\n').split('\t')
        meta[i] = (y, n)
    allrows = []
    global DONE, DUPS
    DONE, DUPS = set(), []
    global SUSPECT
    SUSPECT = []
    MON = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
    MONRX = '(' + '|'.join(MON) + r')\s+(\d{1,2}),\s*(?:1(?=20\d\d))?(\d{4})'
    docs = []
    for docid, (y, name) in sorted(meta.items(), key=lambda x: x[1]):
        f = os.path.join(W, 'txt', docid + '.txt')
        if not os.path.exists(f): continue
        m = re.match(r'(\d{1,2})\s*[.\-]\s*(\d{1,2})\s*[.\-]\s*(\d{4})', name)
        mn = re.match(r'([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})', name)
        if m: date = f'{m.group(3)}-{int(m.group(1)):02d}-{int(m.group(2)):02d}'
        elif mn and mn.group(1).upper() in MON: date = f'{mn.group(3)}-{MON.index(mn.group(1).upper()) + 1:02d}-{int(mn.group(2)):02d}'
        else: continue
        if y.isdigit() and date[:4] != y: date = y + date[4:]   # the year folder wins over a mistyped year in the file name
        kind = 'special' if re.search(r'special|budget|zoning', name, re.I) else ('lpa' if 'LPA' in name else 'regular')
        if kind == 'lpa' or 'Community_Redevelopment' in name: continue
        hd = re.sub(r'\s+', ' ', open(f, encoding='utf8', errors='ignore').read()[:2500].upper())
        # header date: the "met in ... session, <weekday>, <date>" sentence, else the title line in the first 300 characters
        m2 = re.search(r'MET[^.]{0,60}?(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY),?\s*' + MONRX, hd)
        m1 = re.search(MONRX, hd[:300])
        dd = lambda mh: f'{mh.group(3)}-{MON.index(mh.group(1)) + 1:02d}-{int(mh.group(2)):02d}'
        over = False
        import datetime as _dt
        wd = re.search(r'(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY),?\s*' + MONRX, hd)
        wd_ok = bool(wd) and _dt.date(int(wd.group(4)), MON.index(wd.group(2)) + 1, int(wd.group(3))).strftime('%A').upper() == wd.group(1)
        if m1 and m2 and dd(m1) == dd(m2) and dd(m1) != date and wd_ok:   # both header dates disagree with the file name and the stated weekday fits
            date, over = dd(m1), True
        elif (m1 and dd(m1) != date) or (m2 and dd(m2) != date):
            SUSPECT.append((docid, name, dd(m1) if m1 else None, dd(m2) if m2 else None))
        docs.append((docid, y, name, f, date, kind, over))
    real = {(d[4], d[5]) for d in docs if not d[6]}
    for docid, y, name, f, date, kind, over in docs:
        if over and (date, kind) in real:
            DUPS.append((docid, name, date)); continue
        raw = open(f, encoding='utf8', errors='ignore').read()
        lines = clean(raw)
        full = ' '.join(lines)
        present = present_list(full[:3000])
        mp = re.search(r'(?:were|was)\s+present\s*:?(.{0,600})', full[:4000], re.S)
        ptext = re.split(r'Also,?\s+(?:in\s+)?(?:attendance|present)|\bINVOCATION\b', mp.group(1))[0] if mp else ''
        items = parse_doc(lines)
        evs = events(lines)
        # consent motion(s)
        for it in items:
            if it['code'] == '__SEC__': continue
            body = ' '.join(it['lines'])
            title, rest = split_title(body)
            resno = None
            mres = re.findall(r'(?:RESOLUTION|ORDINANCE)\s+NO\.?\s*([0-9]{4}\s*[-–]\s*[0-9]{1,4}\s*[-–]\s*[0-9]{2,5}|[0-9]{4}\s*[-–]\s*[0-9]{1,4})', body, re.I)
            if mres: resno = re.sub(r'\s+', '', mres[0])
            motions = [dict(dissent=dissent(rest[mm.end():mm.end()+400]), mover=norm_name(mm.group(1)) if mm.group(1) else None, second=norm_name(mm.group(2)), what=re.sub(r'\s+', ' ', mm.group(3))[:120],
                            outcome=mm.group(4).lower(), tail=re.sub(r'\s+', ' ', mm.group(5))[:80], pos=mm.start()) for mm in list(MOTION.finditer(rest)) + list(MOTION2.finditer(rest))]
            motions.sort(key=lambda m: m['pos'])
            rolls = find_rolls(it['lines'])
            pulled = bool(re.search(r'pulled\s+from\s+the\s+Consent', rest, re.I))
            consent_motion = bool(re.search(r'(?:approve|adopt)\s+(?:of\s+)?the\s+Consent\s+Agenda', rest, re.I))
            allrows.append(dict(start=it['start'], doc=docid, date=date, meeting=name, mtype=kind, code=it['code'], section=it['section'], resno=resno,
                                title=re.sub(r'\s+', ' ', title) if title else None, rest=re.sub(r'\s+', ' ', rest),
                                motions=motions, rolls=[r for _, r in rolls], pulled=pulled, consent_motion=consent_motion, present=present, ptext=ptext, events=evs))
    json.dump(allrows, open(os.path.join(W, 'items.json'), 'w'), indent=0)
    json.dump(DUPS, open(os.path.join(W, 'dups.json'), 'w'))
    print('duplicate/misnamed files skipped:', DUPS)
    print('header date differs (file name kept):', SUSPECT)
    json.dump(SUSPECT, open(os.path.join(W, 'suspect.json'), 'w'))
    print(len(allrows), 'items')

main()
