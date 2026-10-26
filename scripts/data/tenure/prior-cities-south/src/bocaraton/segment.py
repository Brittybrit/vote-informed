# Segments the Boca Raton City Council minutes (../../bocaraton/minutes/*.txt, pdftotext -layout of the City Clerk's
# minutes on Granicus view_id=9) into agenda items with the motion(s) and roll call the clerk recorded for each.
# Output: cache/items.json (every item: key, date, section, letter, header, text, motions, roll, vote status).
# Rules applied (STANDARD.md): a consent agenda passed in one motion gives each item that motion's roll; a voice vote
# gives yes to each member present only when the minutes show who was present (roll call, departures); nothing inferred.
import re, os, json, glob, sys
SP = os.path.dirname(os.path.abspath(__file__))
MIN = os.path.join(SP, '..', '..', 'bocaraton', 'minutes')
END = '2026-03-31'   # Scott Singer's last meeting (Organizational Meeting; Andy Thomson sworn in as mayor)

MEM = {  # key -> OCR-tolerant pattern
    'Haynie': r'Hayn[i1l]e', 'Weinroth': r'Weinr[o0]th', 'Mullaugh': r'Mu[l/I1|]{2}augh', 'Rodgers': r'R[o0]dgers',
    'Singer': r'Sing[e]r', "O'Rourke": r"O\W{0,2}\s?R[o0]urke", 'Mayotte': r'Mayott?e', 'Thomson': r'Th[o0]ms[o0]n',
    'Nachlas': r'Nach[l/I1|]as', 'Drucker': r'Drucker', 'Wigder': r'Wigder', 'Grau': r'\bGrau\b', 'Pearlman': r'Pearlman',
    'Sipple': r'Sipple'}
MRE = {k: re.compile(v, re.I) for k, v in MEM.items()}
TITLE = r'(?:Mayor|Deputy Mayor|Council\s*Member|Councilmember|Council Woman|Councilwoman|Councilman)'

SECKW = ('INVOCATION', 'PLEDGE', 'ROLL', 'AMENDMENTS TO', 'MINUTES', 'PROCLAMATION', 'APPOINTMENT', 'RESPONSES', 'CONSENT',
         'QUASI', 'PUBLIC HEARING', 'PUBLIC REQUEST', 'INTRODUCTION', 'RESOLUTIONS', 'OTHER BUSINESS', 'CITY MANAGER',
         'CITY ATTORNEY', 'MAYOR AND COUNCIL', 'ADJOURNMENT', 'CALL TO ORDER', 'CEREMONIAL', 'ORGANIZATIONAL', 'PRESENTATION',
         'BUDGET', 'SETTLEMENT', 'HEARING', 'BUSINESS')

def members_in(s):
    return [k for k, r in MRE.items() if r.search(s)]

def is_section(line):
    t = line.strip()
    if not t or len(t) > 95: return None
    m = re.match(r'^(\d{1,2})?\s*[.,:;]*\s*([A-Z][A-Z0-9 /&,\'().\-]+?)\s*:?\s*$', t)
    if not m: return None
    name = re.sub(r'\s+', ' ', m.group(2)).strip()
    letters = re.sub(r'[^A-Za-z]', '', name)
    if len(letters) < 6 or letters.upper() != letters: return None
    if name.startswith('MINUTES OF') or name.startswith('CITY OF') or name == 'CITY COUNCIL': return None
    if not any(k in name for k in SECKW): return None
    return (m.group(1) or '?', name)

FOOT = re.compile(r'^\s*(Regu\s*l\s*ar|Special|Organizational|Budget|Tentative|Final|Joint|Minutes|Organization|City Council)[A-Za-z /&,\-]*Minutes?.*\d{4}\s*$|^\s*[A-Z][A-Za-z ]*Minutes\s+\d+\s+[A-Z][a-z]+\s*\d', re.I)

def clean(text):
    out = []
    for ln in text.split('\n'):
        if FOOT.match(ln) and len(ln.strip()) < 140 and re.search(r'\d{4}\s*$', ln.strip()): continue
        if '\f' in ln: ln = ln.replace('\f', '')
        out.append(ln.rstrip())
    return out

ITEM = re.compile(r'^(\s{0,30})([A-Z8])(?:[.,]|\.,)?\s{2,}(\S.*)$')
ITEM2 = re.compile(r'^(\s{0,30})([A-Z8])\.\s+(\S.*)$')
SUB = re.compile(r'^\s{2,40}(\d{1,2})\)\s+(\S.*)$')

def norm(s):
    s = re.sub(r'\s+', ' ', s)
    s = s.replace('Mu/laugh', 'Mullaugh').replace('Nach/as', 'Nachlas')
    s = re.sub(r'(\d)\s*-\s*(\d)', r'\1-\2', s)
    s = re.sub(r'\b(\d) (?:to|votes to) [Oo]\b', r'\1 to 0', s)
    return s.strip()

def roll_call(lines):
    """members present / absent from the ROLL CALL block"""
    present, absent, start = [], [], None
    for i, ln in enumerate(lines):
        if re.search(r'ROLL\s+CALL', ln):
            start = i; break
    if start is None: return None, None
    for ln in lines[start + 1:start + 16]:
        if is_section(ln) and 'ROLL' not in ln: break
        ms = members_in(ln)
        if not ms: continue
        for k in ms:
            if re.search(r'absent|excused', ln, re.I): absent.append(k)
            else: present.append(k)
    return present, absent

RESULT = re.compile(r'(Motion|motion|The motion|Resolution|Ordinance)[^.;]{0,40}?\b(carried|passed|failed|was approved|was adopted|died|was denied|was withdrawn)\b', re.I)
MADE = re.compile(r'(?:Motion|A motion) was (?:made|moved) by\s+(?:' + TITLE + r')?\s*([A-Z][\w.\' ]{1,40}?)\s*,\s*(?:and\s+)?seconded by\s+(?:' + TITLE + r')?\s*([A-Z][\w.\' ]{1,40}?)\s*,?\s+(?:to|that)\b', re.I)

def who(name):
    ms = members_in(name or '')
    return ms[0] if ms else None

def parse_votes(s, present):
    """s: normalized text starting at a result phrase. Returns dict(result, roll, status, tally, text)"""
    s2 = re.sub(r'\b([A-Z])\.\s', r'\1 ', s)   # Robert S. Weinroth -> Robert S Weinroth
    m = RESULT.match(s2) or RESULT.search(s2[:80])
    res = (m.group(2) if m else 'carried').lower()
    result = 'failed' if res in ('failed', 'died', 'was denied') else ('withdrawn' if res == 'was withdrawn' else 'passed')
    # cut window: up to next 'Motion was made' / 'Motion ' new sentence, max 700 chars
    w = s2[:700]
    nm = re.search(r'(?<=.)(?:Motion was|A motion was|Motion to|The public|The Mayor|Mayor [A-Z][a-z]+ (?:then|provided)|Discussion|\b[A-Z]\.\s{1,3}(?:Resolution|Ordinance))', w[10:])
    if nm: w = w[:nm.start() + 10]
    # find end: last vote marker
    marks = list(re.finditer(r'voting\s+(yes|no|in favor|against|in opposition)|abstain(?:ed|ing)?|recus\w*|absent|not present|dissenting|opposed', w, re.I))
    tl = re.search(r'(\d)\s*(?:to|votes to|-)\s*(\d)', w[:120])
    tally = [int(tl.group(1)), int(tl.group(2))] if tl else None
    roll, status = {}, None
    if marks:
        end = marks[-1].end()
        # stop at first sentence break after the first mark that is followed by non-vote text: keep simple
        seg_text = w[:end]
        prev = 0
        for mk in marks:
            seg = seg_text[prev:mk.start()]
            # segment begins after last ';' or ':' or 'unanimously' within seg
            cut = max(seg.rfind(';'), seg.rfind(':'), seg.lower().rfind('unanimously'), seg.rfind(' vote.'), seg.rfind('. '))
            if mk is marks[0]:
                c2 = max(seg.rfind(';'), seg.rfind(':'), seg.lower().rfind('unanimously'), seg.find(' vote '), seg.find(' vote.'))
                cut = c2
            names = members_in(seg[cut + 1:] if cut >= 0 else seg)
            word = mk.group(0).lower()
            v = 'yes' if ('yes' in word or 'favor' in word) else 'no' if ('no' in word.split() or word.endswith(' no') or 'against' in word or 'opposition' in word or 'dissent' in word or 'opposed' in word) else \
                'abstain' if 'abstain' in word else 'recused' if 'recus' in word else 'absent'
            for n in names: roll.setdefault(n, v)
            prev = mk.end()
        if roll: status = 'named'
        w = seg_text
    if not roll:
        if re.search(r'unanimous', w[:160], re.I) and re.search(r'voice vote|unanimous', w[:160], re.I):
            if present:
                roll = {k: 'yes' for k in present}; status = 'voice-present'
        elif tally and present and tally[1] == 0 and tally[0] == len(present):
            roll = {k: 'yes' for k in present}; status = 'tally-present'
        else:
            status = 'unparsed'
    return dict(result=result, roll=roll, status=status, tally=tally, text=w[:500])

def segment(path, url):
    date = os.path.basename(path)[:10]
    lines = clean(open(path, errors='replace').read())
    present, absent = roll_call(lines)
    # build units: sections -> items -> subitems
    units, sec, cur, sub = [], ('0', 'PREAMBLE'), None, None
    stream = []  # (unit_index or None, line)
    def new_unit(kind, letter, num, header):
        units.append(dict(date=date, section=sec[1], secno=sec[0], letter=letter, num=num, kind=kind, header=header.strip(), lines=[]))
        return len(units) - 1
    for ln in lines:
        s = is_section(ln)
        if s:
            sec = s; cur = new_unit('section', None, None, s[1]); sub = None
            continue
        m = ITEM.match(ln) or ITEM2.match(ln)
        if m and len(m.group(1)) >= 0 and not re.match(r'^(Motion|The|A |An |Mr|Ms|It |In |On |At |As |If |He |She )', m.group(3)) and sec[1] != 'PREAMBLE' and len(m.group(3)) < 140:
            letter = 'B' if m.group(2) == '8' else m.group(2)
            if not (m.group(3)[:1].isupper() or m.group(3)[:1].isdigit()): pass
            else:
                cur = new_unit('item', letter, None, m.group(3)); sub = None
                stream.append((cur, ln)); continue
        m = SUB.match(ln)
        if m and cur is not None and units[cur]['kind'] in ('item', 'sub'):
            parent = cur if units[cur]['kind'] == 'item' else units[cur]['parent']
            u = new_unit('sub', units[parent]['letter'], int(m.group(1)), m.group(2)); units[u]['parent'] = parent
            cur = u; stream.append((cur, ln)); continue
        if cur is None: cur = new_unit('section', None, None, 'PREAMBLE')
        units[cur]['lines'].append(ln); stream.append((cur, ln))
    for u in units:
        u['text'] = norm('\n'.join(u['lines']))
    # motions: scan each unit text (sub texts belong to parent for motions found inside them)
    left = set(); dais = set()
    full = []
    for i, u in enumerate(units):
        t = norm(u['header'] + ' ' + u['text']) if u['kind'] != 'section' else u['text']
        u['full'] = t
        u['motions'] = []
        pres_now = [k for k in (present or []) if k not in left]
        # presence events within this unit
        for mm in re.finditer(r'((?:' + TITLE + r')\s+[A-Z][\w\'. ]{1,30}?|Ms\. \w+|Mr\. \w+)\s+(left the meeting|left the dais|returned to the dais|returned to the meeting|arrived|joined the meeting)', t):
            ks = members_in(mm.group(1))
            for k in ks:
                ev = mm.group(2)
                if ev == 'left the meeting': left.add(k)
                elif ev == 'left the dais': dais.add(k)
                elif ev.startswith('returned'): dais.discard(k); left.discard(k)
                else:
                    left.discard(k)
                    if present is not None and k not in present: present.append(k)
        # recusals named in this unit
        rec = set()
        for mm in re.finditer(r'([A-Z][\w\'. ]{2,60}?)\s+(?:announced|stated|declared|noted|advised|indicated|disclosed)?[^.]{0,80}?(recus|conflict|abstain)', t):
            pass
        for mm in re.finditer(r'(?:' + TITLE + r')\s+([A-Z][\w\'.]+(?: [A-Z][\w\'.]+){0,3})[^.]{0,160}?\b(recuse|recusing|recused|abstain|conflict)', t):
            rec.update(members_in(mm.group(1)))
        u['recused'] = sorted(rec)
        pos = 0
        made = list(MADE.finditer(t))
        for r in RESULT.finditer(t):
            if r.group(1).lower() in ('resolution', 'ordinance') and r.group(2).lower() not in ('was approved', 'was adopted', 'failed', 'passed'): continue
            if r.group(1).lower() in ('resolution', 'ordinance'): continue
            mk = [x for x in made if x.start() < r.start()]
            mv = mk[-1] if mk else None
            pres = [k for k in pres_now if k not in dais]
            v = parse_votes(t[r.start():], pres)
            if v['status'] in ('voice-present', 'tally-present'):
                for k in rec:
                    if k in v['roll']: v['roll'][k] = 'recused'
                for k in dais:
                    v['roll'][k] = 'recused' if k in rec else 'absent'
            v['mover'] = who(mv.group(1)) if mv else None
            v['second'] = who(mv.group(2)) if mv else None
            v['to'] = norm(t[mv.end():mv.end() + 220]) if mv else ''
            u['motions'].append(v)
        u['present'] = list(pres_now); u['absent_rc'] = list(absent or []) + sorted(left - set(absent or []))
    return dict(date=date, file=os.path.basename(path), url=url, present=present, absent=absent, units=units)

def load_index():
    idx = {}
    for ln in open(os.path.join(MIN, 'index.tsv')):
        p = ln.rstrip('\n').split('\t')
        if p[0] == 'date': continue
        idx[p[3].replace('.pdf', '.txt')] = dict(date=p[0], meeting=p[1], url=p[2])
    return idx

if __name__ == '__main__':
    idx = load_index()
    out = []
    for f in sorted(glob.glob(MIN + '/*.txt')):
        b = os.path.basename(f)
        if b[:10] > END: continue
        ix = idx.get(b, {})
        mt = segment(f, ix.get('url'))
        mt['meeting'] = ix.get('meeting', '')
        for u in mt['units']: u.pop('lines', None)
        out.append(mt)
    os.makedirs(SP + '/cache', exist_ok=True)
    json.dump(out, open(SP + '/cache/meetings.json', 'w'), indent=0)
    nu = sum(len(m['units']) for m in out); nm = sum(len(u['motions']) for m in out for u in m['units'])
    st = {}
    for m in out:
        for u in m['units']:
            for v in u['motions']: st[v['status']] = st.get(v['status'], 0) + 1
    print(len(out), 'meetings', nu, 'units', nm, 'motions', st)
    print('no roll call:', [m['date'] for m in out if m['present'] is None])
