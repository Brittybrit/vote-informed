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
SEC = re.compile(r'^(?:\(?([A-Z])\)|(\d{1,2})\.)\s+([A-Z][A-Z\s\(\)/&,\-]+.*)$')

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
        if sm and len(s) < 90 and s.upper() == s:
            secname = sm.group(3).strip(); cur = None
            items.append({'code': '__SEC__', 'section': secname, 'lines': [], 'start': i}); continue
        if cur is not None: cur['lines'].append(s)
        elif items: items[-1]['lines'].append(s)
    return items

TITLE_START = re.compile(r'\b(A\s+RESOLUTION|AN\s+ORDINANCE|A\s+JOINT\s+RESOLUTION)\b')
MOTION = re.compile(r'(?:A\s+)?motion\s+(?:was\s+)?(?:made|offered|by)\s*(?:by\s+)?(.*?)(?:,|\s)\s*seconded\s+by\s+(.*?),?\s+to\s+(.*?)(?:,)?\s+(passed|failed|carried|died|was\s+approved|was\s+denied)(.*?)(?:roll\s*call|voice)?\s*vote', re.I | re.S)

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
        if n not in seen and n not in ('Mayor', 'Vice', 'Council', 'Councilman', 'Councilwoman'): seen.append(n)
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
    for ln in open(os.path.join(W, 'list.tsv')):
        y, i, t, p, n = ln.rstrip('\n').split('\t')
        meta[i] = (y, n)
    allrows = []
    for docid, (y, name) in sorted(meta.items(), key=lambda x: x[1]):
        f = os.path.join(W, 'txt', docid + '.txt')
        if not os.path.exists(f): continue
        m = re.match(r'(\d{2})\.(\d{2})\.(\d{4})', name)
        if not m: continue
        date = f'{m.group(3)}-{m.group(1)}-{m.group(2)}'
        if m.group(3) != y:  # file named with the wrong date: use the date in the minutes header
            MON = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
            hd = open(f, encoding='utf8', errors='ignore').read()[:1500].upper()
            mh = re.search(r'(' + '|'.join(MON) + r')\s+(\d{1,2}),\s*(\d{4})', hd)
            if mh: date = f'{mh.group(3)}-{MON.index(mh.group(1)) + 1:02d}-{int(mh.group(2)):02d}'
        kind = 'special' if re.search(r'special|budget', name, re.I) else ('lpa' if 'LPA' in name else 'regular')
        if kind == 'lpa' or 'Community_Redevelopment' in name: continue
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
                            outcome=mm.group(4).lower(), tail=re.sub(r'\s+', ' ', mm.group(5))[:80], pos=mm.start()) for mm in MOTION.finditer(rest)]
            rolls = find_rolls(it['lines'])
            pulled = bool(re.search(r'pulled\s+from\s+the\s+Consent', rest, re.I))
            consent_motion = bool(re.search(r'(?:approve|adopt)\s+(?:of\s+)?the\s+Consent\s+Agenda', rest, re.I))
            allrows.append(dict(start=it['start'], doc=docid, date=date, meeting=name, mtype=kind, code=it['code'], section=it['section'], resno=resno,
                                title=re.sub(r'\s+', ' ', title) if title else None, rest=re.sub(r'\s+', ' ', rest),
                                motions=motions, rolls=[r for _, r in rolls], pulled=pulled, consent_motion=consent_motion, present=present, ptext=ptext, events=evs))
    json.dump(allrows, open(os.path.join(W, 'items.json'), 'w'), indent=0)
    print(len(allrows), 'items')

main()
