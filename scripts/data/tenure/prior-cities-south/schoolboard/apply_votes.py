# Fills member votes in actions.json from the official approved School Board minutes (ImageSilo, project
# "MDCPS BOARD MINUTES"), saved as text in minutes/<yyyy-mm-dd>[-type]-doc<ImageSilo DocID>.txt (text layer, DOCX,
# or OCR of scanned pages; OCR files end in -ocr.txt).
# Each item's section in the minutes ends with its vote line: "Upon motion being made by X and seconded by Y, the
# Board voted N-M to approve this item. [It is noted for the record that ... was away from the dais ...] [This item
# passed under the Consent Agenda.]". Members named as away / absent / not yet arrived / left are "absent", named as
# abstaining are "abstain", named in opposition are "no"; every other seated member is "yes" only when the line gives a
# tally or says unanimously. Where the yes count does not match the tally, the members listed as absent from the
# meeting are applied and, if it still does not match, the roll stays "unknown" and the note says so.
# Manual corrections: overrides.json {"<action id>": {"roll": {...}, "note": "..."}}.
# Usage: python3 apply_votes.py [--report]
import json, os, re, sys, glob
D = os.path.dirname(os.path.abspath(__file__))
A = json.load(open(D + '/actions.json'))
OVR = json.load(open(D + '/overrides.json')) if os.path.exists(D + '/overrides.json') else {}

NAMES = [
    ('BaezGeller', r'Ba[ae]z[\s-]*G[eo]ller|Ms\.\s+Baez\b|Lucia\s+Baez'),
    ('BendrossMindingall', r'B[ae]ndross'),
    ('Hantman', r'Hantman'), ('Gallon', r'Gallon|Galion|Gallan|Gallen|Gal1on'), ('Fraga', r'Fraga'),
    ('Perez', r'P[ée]rez(?!,\s*Chief)'), ('Rojas', r'Rojas'), ('Santos', r'Santos'),
    ('Navarro', r'Navarro'), ('Alonso', r'Alonso'), ('Colucci', r'Colucci'),
    ('Espino', r'Espino'), ('Blanco', r'Blanco'),
]
NUMW = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9}

def names_in(s):
    s = re.sub(r'Raul F\. P[ée]rez|Mr\. P[ée]rez|Mr\. Raul', '', s)
    out = []
    for k, rx in NAMES:
        if re.search(rx, s): out.append(k)
    return out

def norm(t):
    t = t.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"').replace('–', '-').replace('—', '-')
    return t

def load_minutes():
    M = {}
    for f in sorted(glob.glob(D + '/minutes/*.txt')):
        b = os.path.basename(f); date = b[:10]
        t = norm(open(f).read())
        if b.endswith('-ocr.txt'): t = re.sub(r'[\(\{](?=\s*I[tl]\s?is\b)', '[', t)
        M.setdefault(date, []).append((b, t))
    return M

HEAD = re.compile(r'^\s*([A-H]-\d{1,3})\s*\.?\s*(?:\d{3},\d{3}\s*)?$')
HEAD_OCR = re.compile(r'^\s*([A-H]|0(?=[-\u2013]))\s?[-\u2013]?\s?(\d{1,3})\b(?![.,]\d)\.?(.{0,30})$')
def head_ocr(ln):
    m = HEAD_OCR.match(ln)
    if not m: return None
    rest = m.group(3)
    if re.search(r'cont', rest, re.I) or re.search(r'[a-z]{3,}\s+[a-z]{2,}', rest): return None
    if re.match(r'\s*(?:to|and|of|the|for|was|were|in)\b', rest) or re.search(r'Inc\b|LLC|Construction|Corp|Company|Street|Avenue', rest): return None
    return ('D' if m.group(1) == '0' else m.group(1)) + '-' + m.group(2)
def sections(text, ocr=False):
    lines = text.split('\n'); secs = {}; cur = None; buf = []; seenF = False; lastE = 0
    for ln in lines:
        code = head_ocr(ln) if ocr else (HEAD.match(ln).group(1) if HEAD.match(ln) else None)
        if code and ocr:
            L, n = code.split('-'); n = int(n)
            if L == 'E' and ((seenF and n < 100) or (lastE >= 100 and n < 60)): code = 'F-%d' % n; L = 'F'
            elif L == 'E': lastE = max(lastE, n)
            seenF = (L == 'F')
            if L == 'D': lastE = 0
        if code:
            if cur: secs.setdefault(cur, []).append('\n'.join(buf))
            cur = code; buf = []
        else:
            buf.append(ln)
    if cur: secs.setdefault(cur, []).append('\n'.join(buf))
    return secs

def clean_section(s):
    # drop page headers and margin captions (all-caps short lines / resolution numbers)
    out = []
    for ln in s.split('\n'):
        if ln.startswith('=== PAGE') or ln.startswith('Minutes of the '): continue
        if re.match(r"^[A-Z0-9 ,.&/'\-()\"#:;]+$", ln.strip()) and len(ln.strip()) < 40 and not re.search(r'[a-z]', ln): continue
        out.append(ln)
    return ' '.join(x.strip() for x in out)

VOTE = re.compile(r'(Upon (?:a )?motion[^.]*?(?:\.[^.\[]*?)??(?:the )?Board voted[^\[]*?(?:\.|$)(?:\s*\[[^\]]*\])*)', re.I)
VOTE2 = re.compile(r'((?:the )?Board voted[^\[]*?(?:\.|$)(?:\s*\[[^\]]*\])*|Upon vote being taken,[^\[]*?carried[^\[]*?(?:\.|$)(?:\s*\[[^\]]*\])*)', re.I)

ABBR = re.compile(r'(?:\b(?:Mr|Ms|Mrs|Dr|No|Jr|Sr|St|Inc|Co|Corp|vs|Nos|a\.m|p\.m|[A-Z])\.)$')
def find_votes(s):
    out = []
    for m in re.finditer(r'Board voted|carried\s+\d|recommendation carried|motion carried', s, re.I):
        st = s.rfind('Upon', max(0, m.start() - 350), m.start())
        if st < 0:
            st = s.rfind('the Board', max(0, m.start() - 10), m.start() + 1)
            st = m.start() if st < 0 else st
        i = m.end()
        while True:
            j = s.find('.', i)
            if j < 0: j = len(s); break
            if ABBR.search(s[max(0, j - 5):j + 1]) or (j + 1 < len(s) and s[j + 1].isdigit()): i = j + 1; continue
            break
        e = j + 1
        while True:
            mm = re.match(r'\s*\[[^\]\)\}\|\[]*[\]\)\}\|]', s[e:])
            if not mm: break
            e += mm.end()
        v = s[st:e].strip()
        if not out or out[-1] != v: out.append(v)
    return out

def parse_vote(v):
    r = {'line': v.strip()}
    m = re.search(r'(?:voted|carried)\s+(?:to\s+)?(\d+)\s*[-–]\s*(\d+)', v)
    if m: r['yes_n'], r['no_n'] = int(m.group(1)), int(m.group(2))
    elif re.search(r'voted\s+unanimous', v, re.I): r['unan'] = True
    else:
        m = re.search(r'voted\s+(one|two|three|four|five|six|seven|eight|nine)\s*(?:to|-)\s*(zero|one|two|three|four)', v, re.I)
        if m: r['yes_n'] = NUMW[m.group(1).lower()]; r['no_n'] = NUMW.get(m.group(2).lower(), 0)
    mm = re.search(r'motion (?:being )?(?:duly )?made by (.*?)(?:,)? and (?:duly )?seconded by (.*?),\s*(?:the )?Board', v, re.I)
    if mm:
        a, b = names_in(mm.group(1)), names_in(mm.group(2))
        r['mover'] = a[0] if a else None; r['second'] = b[0] if b else None
    # opposition
    no = []
    for m in re.finditer(r'with ([^.\[]*?) (?:in opposition|voting (?:no|nay|against)|dissenting|opposed)', v, re.I): no += names_in(m.group(1))
    for m in re.finditer(r'\[[^\]]*?([^.;\[]*?) (?:voted no|voted against|voted in opposition|cast (?:a|the) (?:no|dissenting))', v, re.I): no += names_in(m.group(1))
    for m in re.finditer(r'(?:a )?nays? (?:vote )?(?:by|from) ([^)\].]*?(?:Dr|Ms|Mr|Mrs)?\.?[^)\].]*)', v, re.I): no += names_in(m.group(1))
    r['no'] = sorted(set(no))
    ab, ub = [], []
    VERB = re.compile(r"abstain|conflict|away|absent|not yet a[a-z]{1,4}ved|not yet arrived|had not arrived|left the|not on the dais|on dais|the dais|not present|excused|departed|stepped|not in the room|was out|voted no|in opposition|voted against", re.I)
    brs = re.findall(r'\[([^\]\)\}\|\[]*)[\]\)\}\|]', v)
    mo = re.search(r'\[([^\]\)\}\|\[]*)$', v)
    if mo: brs.append(mo.group(1))
    for br in brs:
        for cl in br.split(';'):
            verbs = [(m.start(), m.group(0).lower()) for m in VERB.finditer(cl)]
            if not verbs: continue
            for k, rx in NAMES:
                for nm in re.finditer(rx, cl):
                    nxt = [w for pos, w in verbs if pos > nm.start()]
                    if not nxt: continue
                    w = nxt[0]
                    if w.startswith(('abstain', 'conflict')): ab.append(k)
                    elif w.startswith(('voted no', 'in opposition', 'voted against')): r['no'] = sorted(set(r['no'] + [k]))
                    else: ub.append(k)
    r['abstain'] = sorted(set(ab)); r['absent'] = sorted(set(ub) - set(ab))
    r['consent'] = bool(re.search(r'passed under the Consent Agenda|approve the consent agenda', v, re.I))
    return r

def pm_not_present(text, seated):
    # seated members missing from the "PRESENT AT <p.m. time>" roll at the start of the minutes
    head = text[:6000]
    m = re.search(r'PRESENT AT 1:00 P\.?M\.?(.*?)(?=\nABSENT|\n\d{1,2}:\d\d\s*[AP]\.?M\.? ?-|\nThe Chair)', head, re.S)
    if not m: return []
    pres = set(names_in(m.group(1)))
    return [k for k in seated if k not in pres] if len(pres) >= 4 else []

def meeting_absent(text):
    # members listed absent at the start of the regular (afternoon) session; morning-only absences are ignored
    head = text[:6000]; out = []
    blocks = list(re.finditer(r'ABSENT(?: AT ([^\n]*))?:?\n(.*?)(?=\nPRESENT|\n\d{1,2}:\d\d\s*[AP]\.?M|\n[A-Z][A-Z .:\-]{6,}\n|\nThe Chair|\nPublic Hearing)', head, re.S))
    pm = [b for b in blocks if b.group(1) and re.search(r'P\.?M', b.group(1))]
    use = pm or [b for b in blocks if not b.group(1)]
    for b in use: out += names_in(b.group(2))
    return out

def consent_info(text):
    # consent agenda vote line and the items members reserved for separate consideration
    t = clean_section(text)
    m = re.search(r'(?:wished to address|wanted to address|wish to address)(.*?)(?:At this time, the Chair announced those agenda items reserved|called forward those speakers|There being no (?:additional )?speakers)', t, re.S)
    reserved = set(re.findall(r'\b([A-H]-\d{1,3})\b', m.group(1))) if m else None
    v = None
    for x in find_votes(t):
        if re.search(r'to approve the Consent Agenda', x, re.I): v = x; break
    return v, reserved

_abs = {}
def abstentions(t):
    # "<member> abstained from voting on Agenda Item(s) X[, Y]" anywhere in the minutes -> {item: {members}}
    if id(t) in _abs: return _abs[id(t)]
    out = {}
    flat = clean_section(t)
    for cl in re.split(r'(?<!\b(?:Mr|Ms|Dr|No))\.\s+(?=[A-Z\[])|;', flat):
        if not re.search(r'abstain', cl, re.I) or re.search(r'opportunity to announce|their abstention|abstention from voting on any', cl, re.I): continue
        nm = names_in(cl); its = re.findall(r'\b([A-H])\s?-\s?(\d{1,3})\b', cl)
        if len(nm) == 1 and its:
            for L, n in its: out.setdefault('%s-%s' % (L, n), set()).add(nm[0])
    _abs[id(t)] = out
    return out

_lcv = {}
def last_consent_vote(t):
    if id(t) not in _lcv:
        cut = re.search(r'\[This item passed (?:under|on) the', t, re.I)
        vs = [x for x in find_votes(clean_section(t[:cut.start()] if cut else t)) if re.search(r'to approve the (?:revised )?Consent Agenda\b', x, re.I)]
        _lcv[id(t)] = vs[-1] if vs else None
    return _lcv[id(t)]

# OCR heading lines read wrongly in the scans: exact line text -> item code
OCR_FIX = {
    '2022-02-09-doc4088-ocr.txt': {'E-3 121,751': 'F-3'},
    '2022-05-18-doc4093-ocr.txt': {'04g Erie': 'D-65', 'E 121,903': 'F-40'},
    '2022-07-20-doc4098-ocr.txt': {'EA 121,964': 'F-1'},
    '2022-08-15-doc4099-ocr.txt': {'Dos 122221': 'D-65'},
    '2022-11-16-doc4097-ocr.txt': {'pee rine A. S55eueo': 'D-65'},
}

def apply():
    M = load_minutes(); stats = {}; rep = []
    for a in A['actions']:
        key = a['id']; date = a['date']; item = a['item']
        seated = list(a['roll'].keys())
        docs = M.get(date, [])
        if key in OVR:
            o = OVR[key]; a['roll'] = {k: o['roll'].get(k, 'unknown') for k in seated}
            for f in ('tally', 'mover', 'second', 'result'):
                if f in o: a[f] = o[f]
            a['notes'] = o['note']; a['minutesDoc'] = o.get('doc'); stats['override'] = stats.get('override', 0) + 1; continue
        if not docs:
            stats['nominutes'] = stats.get('nominutes', 0) + 1; rep.append((key, 'NO MINUTES'))
            a['roll'] = {k: 'unknown' for k in seated}
            a['notes'] = re.sub(r'^Vote not given in the minutes \(the Board posts only "Excerpts from Unofficial Minutes", which record the action but not member votes\)', 'Vote not given in the minutes: the official minutes of this meeting are not in the School Board\'s ImageSilo minutes archive (searched Oct 26, 2026), and the posted "Excerpts from Unofficial Minutes" record the action but not member votes', a['notes'] or '')
            continue
        found = None
        for b, t in docs:
            tt = t
            for k2, v2 in OCR_FIX.get(b, {}).items(): tt = tt.replace('\n' + k2 + '\n', '\n' + v2 + '\n')
            sec = sections(tt, b.endswith('-ocr.txt')).get(item)
            if sec:
                s = clean_section(' '.join(sec))
                vs = find_votes(s)
                vs = [v for v in vs if not re.search(r'co-?sponsor|to the floor|supplemental list|to amend|to defer|to table|recess', v, re.I) or re.search(r'approve (?:this|the) item|as amended', v, re.I)]
                keep = []
                for v in vs:
                    codes = set(c.replace(' ', '') for c in re.findall(r'\b[A-H]\s?-\s?\d{1,3}\b', v.split('[')[0]))
                    if codes and item not in codes: break
                    keep.append(v)
                vs = keep
                if vs: found = (b, t, vs[-1], s); break
                found = found or (b, t, None, s)
        if not found or not found[2]:
            stats['novote'] = stats.get('novote', 0) + 1
            rep.append((key, 'NO VOTE LINE' if found else 'ITEM NOT FOUND', found[0] if found else [d[0] for d in docs], (found[3][-400:] if found else '')))
            if found: a['minutesDoc'] = found[0]
            a['roll'] = {k: 'unknown' for k in seated}
            continue
        b, t, v, s = found
        pv = parse_vote(v)
        if not pv['consent'] and re.search(r'passed under the Consent Agenda', s, re.I): pv['consent'] = True
        roll = {}
        absent = set(pv['absent']) & set(seated); abst = set(pv['abstain']) & set(seated); no = set(pv['no']) & set(seated)
        for k in seated:
            roll[k] = 'absent' if k in absent else 'abstain' if k in abst else 'no' if k in no else 'yes'
        for k in abstentions(t).get(item, ()):
            if k in roll and roll[k] == 'yes': roll[k] = 'abstain'; pv['line'] += ' [Abstention recorded elsewhere in the minutes: %s on %s.]' % (k, item)
        ny = sum(1 for x in roll.values() if x == 'yes'); nn = sum(1 for x in roll.values() if x == 'no')
        ok = True
        if 'yes_n' in pv:
            if ny != pv['yes_n'] or nn != pv['no_n']:
                ma = set(meeting_absent(t)) & set(seated)
                for k in ma:
                    if roll[k] == 'yes': roll[k] = 'absent'
                ny = sum(1 for x in roll.values() if x == 'yes'); nn = sum(1 for x in roll.values() if x == 'no')
                if ny != pv['yes_n'] or nn != pv['no_n']: ok = False
        elif pv.get('unan'):
            cl = None
            if pv['consent']:
                cl = last_consent_vote(t)
                if cl:
                    pc = parse_vote(cl)
                    for k in set(pc['absent']) & set(seated):
                        if roll[k] == 'yes': roll[k] = 'absent'
            for k in set(meeting_absent(t)) & set(seated):
                if roll[k] == 'yes' and not (cl and 'yes_n' in parse_vote(cl)): roll[k] = 'unknown'
            if cl: pv['line'] += ' [Consent Agenda vote: "%s"]' % cl
        else:
            ok = False
        if not ok:
            stats['mismatch'] = stats.get('mismatch', 0) + 1
            rep.append((key, 'TALLY MISMATCH', b, pv['line'][:600], {k: v for k, v in roll.items() if v != 'yes'}))
            a['roll'] = {k: 'unknown' for k in seated}
            a['notes'] = 'Official minutes (%s): "%s" Vote recorded but the members voting could not be matched to the tally; left unknown.' % (b, pv['line'])
            a['minutesDoc'] = b
            continue
        a['roll'] = roll
        a['tally'] = '%d-%d' % (pv['yes_n'], pv['no_n']) if 'yes_n' in pv else 'unanimous'
        a['mover'] = pv.get('mover'); a['second'] = pv.get('second')
        a['notes'] = 'Official minutes (%s%s): "%s"' % (b, ', OCR of the scanned minutes' if b.endswith('-ocr.txt') else '', pv['line'])
        a['minutesDoc'] = b
        stats['ok'] = stats.get('ok', 0) + 1
    return stats, rep

if __name__ == '__main__':
    stats, rep = apply()
    print(json.dumps(stats))
    if '--report' in sys.argv:
        for r in rep: print(json.dumps(r, ensure_ascii=False)[:1500])
    if '--write' in sys.argv:
        for a in A['actions']:
            a.pop('minutesDoc', None)                      # the note names the minutes file
            if a.get('tally') == 'unanimous': a['tally'] = None   # "voted unanimously": no count printed
        json.dump(A, open(D + '/actions.json', 'w'), indent=1, ensure_ascii=False)
