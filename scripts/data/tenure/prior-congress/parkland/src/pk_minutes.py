"""Parkland City Commission minutes 2006-2012 -> per-item votes.
Input: ../minutes-index.tsv and ../minutes/*.txt (text saved from documents.cityofparkland.org WebLink, Oct 26, 2026).
For every meeting: the date (printed heading wins when it is in the folder's year, else the folder date; see DATEFIX),
who answered the opening roll call, and every agenda item (numbered or lettered header), with the COMMENTS title,
each MOTION (mover, second), the ROLL CALL VOTE block and the result line.
Roll rules (STANDARD.md, never infer a vote):
  1. A ROLL CALL VOTE block naming every member present with Yes/No is used as written.
  2. A block the scan dropped or garbled, or a voice vote, followed by "passed unanimously" / "by those present" /
     "N-0": yes for each member the opening roll shows present, only when the block holds no unattributed No/Absent
     and nothing in the item says a member left; members absent from the opening roll are 'absent'.
  3. Anything else (split vote without names, stray Absent/No, member left the room) -> roll None with the reason.
Output: minutes-items.json (scratch) used by pk_items.py.  Usage: python3 pk_minutes.py <out.json>"""
import re, json, sys, os, csv
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE)
OUT = sys.argv[1]
ROSTER = ['Udine', 'Moskowitz', 'Smith', 'McGilvray', 'Ribotsky', 'Weissman', 'Rosenof', 'Willis']
FIX = {'McGilvra': 'McGilvray', 'McGilvrav': 'McGilvray', 'Mc Gilvray': 'McGilvray', 'Moskowtiz': 'Moskowitz', 'Moskowitz,': 'Moskowitz',
       'Weisman': 'Weissman', 'U dine': 'Udine', 'tTdine': 'Udine', 'Udinc': 'Udine', 'Roscnof': 'Rosenof', 'Rosenoff': 'Rosenof', 'Udinc': 'Udine', 'Ribotski': 'Ribotsky'}
# folder date -> real date where the folder name is wrong (checked against the printed heading and the meeting calendar)
# The folder date is right except for three 2006 documents that are second copies (other text layer) of minutes
# filed under their real dates: 03032006 = May 3, 2006; 03172006 = May 17, 2006; 09082006 = Aug 9, 2006 (printed headings).
# seats as shown by the opening roll calls (first and last meeting listed) -- used only to mark a seated member
# who is missing from a roll call and never named in those minutes as absent
SEATS = {'Udine': ('2006-03-01', '2012-12-31'), 'Moskowitz': ('2006-03-22', '2012-10-17'), 'Smith': ('2006-03-22', '2011-07-06'),
         'Ribotsky': ('2006-03-01', '2006-07-05'), 'McGilvray': ('2006-03-01', '2007-03-07'), 'Weissman': ('2006-11-30', '2012-12-31'),
         'Rosenof': ('2008-02-06', '2012-12-31'), 'Willis': ('2012-03-07', '2012-12-31')}
DUP = {'2006/03032006 CCM Minutes', '2006/03172006 CCM Minutes', '2006/09082006 CCM Minutes'}
MON = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
TIT = r'(?:Commissioner|Commission|Commisioner|Vice\s*Ma[yv]\s?or|Vice\s*Ma\s+or|Ma[yv]\s?or|Ma\s+or|Viyor|Mavor|Comm\.)'
NAMERX = r'(Udine|U\s?dine|tTdine|Udinc|Roscnof|Moskowitz|Smith|McGilvray|McGilvra\w?|Mc\s*Gilvray|Ribotsky|Weissman|Weisman|Rosenof\w?|Willis)'

def nm(s):
    s = re.sub(r'\s+', ' ', s.strip(" .,;:")); return FIX.get(s, s)

def clean(t):
    lines = t.split('\n'); out = []; skip = 0
    for i, ln in enumerate(lines):
        if ln.startswith('#') and i < 4: continue
        if ln.strip() == '<<PG>>': skip = 8; out.append(''); continue
        s = ln.strip()
        if skip > 0:
            if (not s or re.match(r'^(\[OCR\]\s*)?(PARKLAND|CITY OF PARKLAND)\b.*(MINUTES|AGENDA|MEETING|WORKSHOP|HEARING|SESSION)', s, re.I)
                    or re.match(r'^(%s)\s+\d{1,2},?\s*\d{4}$' % '|'.join(MON), s, re.I) or re.match(r'^PAGE\s*\d+', s, re.I)
                    or re.match(r'^(\d{1,2}:\d{2}\s*[AP]\.?M\.?|\d{1,3})$', s, re.I)):
                skip -= 1; continue
            skip = 0
        out.append(ln.replace('[OCR] ', ''))
    return '\n'.join(out)

def present_at_roll(t):
    """Members listed under 'Present:' (or under ROLL CALL when there is no 'Present:' list) at the top of the minutes."""
    head = t[:9000]
    segs = []
    for m in re.finditer(r'Present\s*:', head):
        if re.search(r'Also\s*$', head[max(0, m.start() - 8):m.start()]): continue
        segs.append(m.end())
    i = head.find('ROLL CALL')
    if i >= 0: segs.append(i + 9)
    for st in segs:
        seg = head[st:st + 900]
        j = re.search(r'Also\s+Present|APPROVAL OF|PLEDGE|PRESENTATION|PROCLAMATION|PUBLIC (INPUT|COMMENT)|AGENDA|CALL TO ORDER|^\s*I+\.?\s', seg, re.M)
        seg = seg[:j.start()] if j else seg[:500]
        pres, absn = [], []
        mode = 'p'
        for ln in seg.split('\n'):
            if re.match(r'^\s*(Absent|Excused)\s*:?\s*$', ln, re.I): mode = 'a'; continue
            if re.match(r'^\s*Present\s*:?\s*$', ln, re.I): mode = 'p'; continue
            for m in re.finditer(TIT + r'\s+(?:(?!(?:Udine|Moskowitz|Smith|McGilvray|Ribotsky|Weissman|Rosenof|Willis|Mayor|Vice|Commissioner)\b)[A-Z][a-z]*\.?\s+){0,2}(?:[A-Z]\.\s+)?' + NAMERX, ln):
                n = nm(m.group(1))
                if mode == 'a' or re.search(r'absent|excused|not present', ln, re.I): absn.append(n)
                else: pres.append(n)
        if len(pres) + len(absn) >= 3:
            ii = max(0, st - 200)
            for m in re.finditer(TIT + r'\s+' + NAMERX + r'\s+(?:was|is)\s+(?:absent|excused|not present)', t[ii:ii + 3000]):
                n = nm(m.group(1))
                if n in pres: pres.remove(n)
                if n not in absn: absn.append(n)
            pres = [p for p in dict.fromkeys(pres) if p not in absn]
            return pres, list(dict.fromkeys(absn))
    return None, []

HDR = re.compile(r'^\s*(?:\d{1,2}|[A-Z])\s*[.,:]\s*(?=[A-Z0-9])(.*)$|^\s*(?:[0-9A-Z]{0,3}\s*[.,]?\s*|ADDED\s+(?:AGENDA\s+)?ITEM\s*:?\s*)((?:RESOLUTION|ORDINANCE)S?\s*(?:N[O0o]S?\.?)?\s*\(?\s*\d{4}\s*[-–]\s*\d+.*)$')
NUMS = re.compile(r'(RESOLUTION|ORDINANCE)S?\s*(?:N[O0o]S?\.?|NUMBERS?)?\s*((?:\(?\s*\d{4}\s*[-–]\s*\d{1,3}[A-Z]?\s*\)?(?:\s*(?:,|and|&)\s*)?)+)', re.I)

def nums_in(s):
    out = []
    for m in NUMS.finditer(s):
        if re.search(r'(amending|repealing|rescinding|voiding|replacing|number)\s*(the\s+)?$', s[max(0, m.start() - 22):m.start()], re.I): continue
        for y, q in re.findall(r'(\d{4})\s*[-–]\s*(\d{1,3}[A-Z]?)\b', m.group(2)):
            sq = re.match(r'(\d+)([A-Z]?)', q)
            v = (m.group(1).upper()[0], '%s-%d%s' % (y, int(sq.group(1)), sq.group(2)))
            if v not in out: out.append(v)
    return out
NUM = re.compile(r'(RESOLUTION|ORDINANCE)S?\s*(?:N[O0o]S?\.?|NUMBER)?\s*(\d{4})\s*[-–]\s*(\d{1,3}[A-Z]?)', re.I)
VOTETOK = re.compile(r'\b(Yes|Yea|Aye|No|Nay|Absent|Abstain(?:ed)?|Recused|Excused)\b', re.I)

VMAP = {'not present': 'absent', 'yea': 'yes', 'aye': 'yes', 'nay': 'no', 'abstain': 'recused', 'abstained': 'recused', 'recused': 'recused', 'excused': 'absent'}
NLINE = re.compile(r'^\W{0,3}(?:[|Il1]\s+)?' + TIT + r'\s+(?:(?!(?:Udine|Moskowitz|Smith|McGilvray|Ribotsky|Weissman|Rosenof|Willis|Mayor|Vice|Commissioner)\b)[A-Z][a-z]*\.?\s+){0,2}(?:[A-Z]\.\s+)?' + NAMERX + r'\W{0,3}(?:[-–(]?\s*(Yes|Yea|Aye|Not\s+Present|No|Nay|Absent|Abstain(?:ed)?|Recused|Excused)\)?)?\W{0,3}$', re.I)
VLINE = re.compile(r'^\W{0,3}(?:[|Il1]\s+)?(Yes|Yea|Aye|No|Nay|Absent|Abstain(?:ed)?|Recused|Excused)\W{0,3}$', re.I)

def parse_block(blk):
    """Vote lines between a motion and its result -> ({name: vote}, stray vote tokens).
    Counts only lines that are just 'Title Name [vote]' or just a vote, so names in prose are ignored.
    The text layer sometimes puts names and votes on alternate lines or in two columns; both are paired in order."""
    toks = []
    for ln in blk.split('\n'):
        s = ln.strip()
        if not s: continue
        m = NLINE.match(s)
        if m:
            toks.append(['N', nm(m.group(1)), re.sub(r'\s+', ' ', (m.group(2) or '').lower()) or None]); continue
        m = VLINE.match(s)
        if m: toks.append(['V', None, m.group(1).lower()])
    roll, used = {}, set()
    for i, tk in enumerate(toks):
        if tk[0] == 'N' and tk[2]:
            roll[tk[1]] = VMAP.get(tk[2], tk[2]); used.add(i)
    # runs: k names in a row followed by k votes in a row (two-column layout split into blocks)
    i = 0
    while i < len(toks):
        if toks[i][0] == 'N' and i not in used:
            j = i
            while j < len(toks) and toks[j][0] == 'N' and j not in used and not toks[j][2]: j += 1
            k = j
            while k < len(toks) and toks[k][0] == 'V' and k not in used: k += 1
            if j > i and (k - j) == (j - i):
                for a, b in zip(range(i, j), range(j, k)):
                    roll[toks[a][1]] = VMAP.get(toks[b][2], toks[b][2]); used |= {a, b}
                i = k; continue
        i += 1
    rn = [i for i, tk in enumerate(toks) if tk[0] == 'N' and i not in used]
    rv = [i for i, tk in enumerate(toks) if tk[0] == 'V' and i not in used]
    if rn and len(rn) == len(rv) and max(rn) < min(rv):
        for i, j in zip(rn, rv):
            roll[toks[i][1]] = VMAP.get(toks[j][2], toks[j][2])
        rv = []
    stray = [toks[j][2] for j in rv]
    return roll, stray

MOT = re.compile(r'MOT[I1lT]ON\s+(?:was\s+)?made\s+by\s+' + TIT + r'\s+(?:(?!(?:Udine|Moskowitz|Smith|McGilvray|Ribotsky|Weissman|Rosenof|Willis|Mayor|Vice|Commissioner)\b)[A-Z][a-z]*\.?\s+){0,2}(?:[A-Z]\.\s+)?' + NAMERX + r'((?:(?!MOT[I1lT]ON\s+(?:was\s+)?made)(?!MOT[I1lT]ON\s+passed).){0,900}?)(?:Seconded|Second(?:ed)?)\s+by\s+' + TIT + r'\s+(?:(?!(?:Udine|Moskowitz|Smith|McGilvray|Ribotsky|Weissman|Rosenof|Willis|Mayor|Vice|Commissioner)\b)[A-Z][a-z]*\.?\s+){0,2}(?:[A-Z]\.\s+)?' + NAMERX, re.S | re.I)
RES = re.compile(r'MOT[I1lT]ON\s+(passed|failed|carried|died|was\s+adopted|was\s+approved|was\s+withdrawn|was\s+withheld|approved|adopted)([^\n]*)', re.I)

MOT1 = re.compile(r'MOT[I1lT]ON\s+(?:was\s+)?made\s+by\s+' + TIT + r'\s+(?:(?!(?:Udine|Moskowitz|Smith|McGilvray|Ribotsky|Weissman|Rosenof|Willis|Mayor|Vice|Commissioner)\b)[A-Z][a-z]*\.?\s+){0,2}(?:[A-Z]\.\s+)?' + NAMERX, re.I)

class _M:
    """a motion with no 'Seconded by' clause (the minutes sometimes omit it)"""
    def __init__(self, m, seg):
        self.m = m
        tail = seg[m.end():m.end() + 500]
        e = re.search(r'\n\s*(ROLL CALL|MOTION|Mayor|Vice|Commissioner)|\.\s', tail)
        self.w = tail[:e.start() if e else 300]
    def group(self, i): return {1: self.m.group(1), 2: self.w, 3: None}[i]
    def start(self): return self.m.start()
    def end(self): return self.m.end() + len(self.w)

def motions(seg):
    out = []
    full = list(MOT.finditer(seg))
    starts = {m.start() for m in full}
    allm = full + [_M(m, seg) for m in MOT1.finditer(seg) if m.start() not in starts]
    allm.sort(key=lambda m: m.start())
    for k, m in enumerate(allm):
        rest = seg[m.end():]
        r = RES.search(rest)
        nxt = allm[k + 1].start() - m.end() if k + 1 < len(allm) else None
        if r and nxt is not None and nxt < r.start(): r = None
        blk = rest[:r.start()] if r else rest[:(nxt if nxt is not None else 600)]
        i = blk.find('ROLL CALL')
        roll, stray = parse_block(blk)
        out.append(dict(mover=nm(m.group(1)), second=nm(m.group(3)) if m.group(3) else None, what=re.sub(r'\s+', ' ', m.group(2))[:400],
                        hasblock=i >= 0, roll=roll, stray=stray, result=(r.group(1) + r.group(2)).strip() if r else None,
                        start=m.start(), end=m.end() + (r.end() if r else len(blk)), between=blk))
    return out

EVT = re.compile(TIT + r'\s+' + NAMERX + r'\s+(?:had\s+)?(arrived|joined the meeting|telephonically joined|joined|returned to the (?:meeting|dais|chambers)|left the (?:meeting|dais|chambers|room)|left|departed|stepped out|was excused|excused himself|exited)', re.I)

def at(pos, events, pres, absn):
    """who was present at text position pos, from the opening roll and later arrivals/departures"""
    P, A, gone = list(pres or []), list(absn), set()
    for p, n, kind in events:
        if p >= pos: break
        if kind == 'in':
            if n not in P: P.append(n)
            if n in A: A.remove(n)
            gone.discard(n)
        else:
            gone.add(n)
    return P, A, gone

def decide(mo, pres, absn, ctx, gone=()):
    """-> (roll or None, tally, note)"""
    res = (mo['result'] or '').lower()
    t = re.search(r'(?<![\d-])([0-5])\s*(?:-|–|to|\s)\s*([0-5])(?![\d])', res)
    tally = [int(t.group(1)), int(t.group(2))] if t else None
    if 'died' in res: return None, None, 'Motion died for lack of a second.'
    roll = dict(mo['roll'])
    left = set()
    for m in re.finditer(TIT + r'\s+' + NAMERX + r'\s+(?:had\s+)?(?:left|stepped|was\s+out|exited|departed|recused|abstain|declared|filed a conflict|did not vote|was not present|was absent)', ctx, re.I):
        left.add(nm(m.group(1)))
    left |= set(gone)
    if pres:
        allin = all(p in roll for p in pres)
        if roll and allin and not mo['stray']:
            for a in absn: roll.setdefault(a, 'absent')
            for p in list(roll):
                if p not in ROSTER: roll.pop(p)
            y = sum(v == 'yes' for v in roll.values()); n = sum(v == 'no' for v in roll.values())
            if tally and tally != [y, n] and tally[::-1] != [y, n]:
                return None, tally, f'The minutes give the tally {tally[0]}-{tally[1]} but the roll call lines read {y}-{n}.'
            return roll, [y, n], None
        if re.search(r'out of (the )?chamber|not present|stepped out', mo['between'], re.I):
            # a member was out of the room for this vote; the clerk's asterisk did not survive in the text layer
            if roll and not [x for x in mo['stray'] if x != 'yes']:
                r = {p: roll.get(p, 'unknown') for p in pres}
                for a in absn: r[a] = 'absent'
                y = sum(v == 'yes' for v in r.values()); n = sum(v == 'no' for v in r.values())
                return r, [y, n], 'The minutes mark a member "out of the chamber" for this vote, and the mark did not survive in the text; members without a readable vote are "unknown".'
            return None, tally, 'The minutes mark a member "out of the chamber" for this vote without a readable name.'
        stray_bad = [s for s in mo['stray'] if s not in ('yes', 'yea', 'aye')]
        named_bad = [k for k, v in roll.items() if v != 'yes']
        unan = re.search(r'unanimous|by (all )?(those|all) present|by thosc present|passed\s*\.?$', res) and not (tally and tally[1] > 0)
        if tally and tally[1] == 0 and tally[0] == len(pres): unan = True
        if tally and tally[0] != len(pres) and unan and tally[1] == 0: unan = False
        if 'passed' not in res and 'carried' not in res and 'adopted' not in res and 'approved' not in res: unan = False
        if unan and re.search(r'those present|all present|thosc present', res) and not absn and not mo['roll']:
            return None, tally, 'The minutes say the motion "' + mo['result'].rstrip('. ') + '" but the opening roll call shows every member present and the minutes do not say who was out for this vote.'
        if unan and not stray_bad and not named_bad and not (left & set(pres)):
            r = {p: 'yes' for p in pres}
            for a in absn: r[a] = 'absent'
            why = ('The individual roll call lines are not readable in the minutes text; the minutes record "MOTION ' + mo['result'].rstrip('. ') + '" with these members present (opening roll call and any later arrivals noted in the minutes).')
            return r, [len(pres), 0], why
        if left & set(pres):
            return None, tally, 'The minutes note that %s left or did not vote on this item; the roll call lines are not complete.' % ', '.join(sorted(left & set(pres)))
        if tally:
            return None, tally, f'The minutes give the tally {tally[0]}-{tally[1]} but not who voted which way.'
        return None, None, 'The minutes do not give a readable roll call for this vote (result: %s).' % (mo['result'] or 'not given')
    if roll and not mo['stray']:
        y = sum(v == 'yes' for v in roll.values()); n = sum(v == 'no' for v in roll.values())
        return roll, [y, n], 'The opening roll call is not readable; members as listed in the vote.'
    return None, tally, 'The opening roll call is not readable in the minutes, so the members present are not known.'

def title_after(seg):
    m = re.search(r'COMMENTS?\s*:\s*(.*?)(?:EFFECTIVE\s+DATE\.?|\n\s*\n\s*(?=[A-Z][a-z])|(?=City Manager|Ms\.|Mr\.|Interim|MOTION))', seg, re.S)
    if not m: return None
    s = re.sub(r'\s+', ' ', m.group(1)).strip()
    return s + (' EFFECTIVE DATE.' if 'EFFECTIVE' in m.group(0)[-20:] else '')

def run():
    rows = [r for r in csv.reader(open(os.path.join(BASE, 'minutes-index.tsv')), delimiter='\t') if r and not r[0].startswith('#') and r[0] != 'date']
    meetings, items, mvotes = [], [], []
    parts = []
    for date, hd, name, did, pages, tl, url, f in rows:
        if name in DUP: continue
        t = clean(open(os.path.join(BASE, f), encoding='utf8').read())
        # one document can hold the minutes of two meetings (2012/Minutes/09122012 CCM Special Minutes also holds Sep 19, 2012)
        cuts = [m for m in re.finditer(r'\n\s*MINUTES\s*\n(?:[^\n]*\n){0,3}?\s*(%s)\s+(\d{1,2}),\s*(\d{4})' % '|'.join(MON), t) if m.start() > 200]
        if cuts:
            c = cuts[0]
            d2 = '%s-%02d-%02d' % (c.group(3), MON.index(c.group(1)) + 1, int(c.group(2)))
            if d2 != date:
                parts.append((date, name, did, url, t[:c.start()]))
                parts.append((d2, name + ' (second meeting in this document: ' + d2 + ')', did, url, t[c.start():]))
                continue
        parts.append((date, name, did, url, t))
    for date, name, did, url, t in parts:
        d = date
        pres, absn = present_at_roll(t)
        if pres:
            for n, (a, b) in SEATS.items():
                if a <= d <= b and n not in pres and n not in absn and not re.search(n[:6], t):
                    absn.append(n)   # seated, not at the roll call and never mentioned in the minutes
        kind = 'workshop' if re.search(r'Workshop|Work Session|Orientation', name, re.I) else 'meeting'
        meetings.append(dict(date=d, name=name, url=url, doc=did, present=pres, absent=absn, kind=kind, ocr='[OCR]' in open(os.path.join(BASE, f)).read()))
        # consent block
        cs = re.search(r'^\s*(?:[IVX]+\.?\s+)?CONSENT\s+AGENDA\s*$', t, re.M)
        ce = re.search(r'^\s*(?:[IVX]+\.?\s+)?(REGULAR\s+AGENDA|QUASI|PUBLIC\s+HEARING|OLD\s+BUSINESS|NEW\s+BUSINESS)', t[cs.end():], re.M) if cs else None
        cons = (cs.end(), cs.end() + ce.start()) if cs and ce else ((cs.end(), cs.end() + 6000) if cs else None)
        lines = t.split('\n'); pos = 0; hdrs = []
        for ln in lines:
            m = HDR.match(ln)
            if m:
                s = (m.group(1) or m.group(2) or '')
                if re.match(r'(RESOLUTION|ORDINANCE)', s, re.I) or (len(re.sub(r'[^A-Z]', '', s)) >= 6 and s.upper() == s and not re.match(r'^\d', s)):
                    hdrs.append((pos, s))
                elif re.match(r'^[A-Z][A-Za-z ]{0,4}$', ln.strip()) is None and NUM.match(s or ''):
                    hdrs.append((pos, s))
            pos += len(ln) + 1
        # bare "RESOLUTION NO. 2006-13:" lines preceded by "8." alone (2006 layout)
        allm = motions(t)
        cmot = [m for m in allm if cons and cons[0] <= m['start'] <= cons[1] + 3000 and re.search(r'consent', m['what'], re.I)]
        events = [(m.start(), nm(m.group(1)), 'out' if re.match(r'left|departed|stepped|was excused|excused|exited', m.group(2), re.I) else 'in') for m in EVT.finditer(t)]
        prev = 0
        for mo in allm:
            ns = nums_in(re.split(r'subject to|contingent|conditioned|companion|in conjunction', mo['what'], flags=re.I)[0])
            ctx = t[prev:mo['start']]; prev = mo['end']
            if not ns: continue
            P, A, gone = at(mo['start'], events, pres, absn)
            roll, tally, note = decide(mo, P, A, ctx[-1500:] + mo['between'], gone)
            rs = (mo['result'] or '').lower()
            outcome = 'failed' if 'failed' in rs or 'died' in rs else ('tabled' if re.search(r'\btable|continu|defer|postpone', mo['what'], re.I) else ('passed' if mo['result'] else None))
            if re.search(r'\bamend\b(?! and adopt)', mo['what'], re.I) and not re.search(r'approve|adopt', mo['what'], re.I): outcome = 'amend'
            rd = 'first' if re.search(r'first\s+reading', mo['what'], re.I) else ('second' if re.search(r'second|final', mo['what'], re.I) else None)
            hd = [h for h in hdrs if h[0] <= mo['start']]
            mvotes.append(dict(date=d, meeting=name, minutes=url, doc=did, nums=ns, mover=mo['mover'], second=mo['second'], motion=mo['what'][:300],
                               result=mo['result'], roll=roll, tally=tally, note=note, outcome=outcome, reading=rd, consent=False,
                               hdr=re.sub(r'\s+', ' ', hd[-1][1])[:200] if hd else ''))
        for k, (p, s) in enumerate(hdrs):
            e = hdrs[k + 1][0] if k + 1 < len(hdrs) else len(t)
            seg = t[p:e]
            nums = nums_in(seg[:200])[:1]   # the item's own number; later numbers in the title are ones it amends
            mos = [m for m in allm if p <= m['start'] < e]
            incons = bool(cons and cons[0] <= p < cons[1])
            useconsent = False
            if not mos and incons and cmot:
                mos = [cmot[0]]; useconsent = True
            mo = None
            mos = [m for m in mos if not re.search(r'^\W*(to\s+)?(adjourn|extend the meeting|approve the (revised |amended )?agenda|approve the minutes|recess)', m['what'], re.I)]
            for m in mos:
                if re.search(r'approv|adopt|award|deny|denial|accept|authoriz|consent|ratif|hire|select|grant|rank', m['what'], re.I) and not re.search(r'\btable|continu|defer|postpone|reconsider|reevaluat|amend the motion|amend the (?:resolution|ordinance)|instruct|direct', m['what'], re.I):
                    mo = m
            if mo is None and mos: mo = mos[-1]
            ent = dict(date=d, meeting=name, minutes=url, doc=did, hdr=re.sub(r'\s+', ' ', s)[:200], nums=nums, seg=seg[:5000],
                       title=title_after(seg), consent=useconsent or incons, motions=len(mos))
            first = re.search(r'FIRST\s+READING', seg[:1500], re.I) and not re.search(r'SECOND\s+READING', seg[:1500], re.I)
            ent['reading'] = 'first' if first else ('second' if re.search(r'SECOND\s+READING|FINAL\s+READING', seg[:1500], re.I) else None)
            if mo:
                ctx = seg[:mo['start'] - p] if mo['start'] > p else ''
                P, A, gone = at(mo['start'], events, pres, absn)
                roll, tally, note = decide(mo, P, A, ctx[-1500:] + mo['between'], gone)
                ent.update(mover=mo['mover'], second=mo['second'], motion=mo['what'][:300], result=mo['result'], roll=roll, tally=tally, note=note)
                rs = (mo['result'] or '').lower()
                ent['outcome'] = 'failed' if 'failed' in rs or 'died' in rs else ('tabled' if re.search(r'\btable|continu|defer|postpone', mo['what'], re.I) else ('passed' if mo['result'] else None))
            else:
                ent.update(mover=None, second=None, motion=None, result=None, roll=None, tally=None, note=None, outcome=None)
            items.append(ent)
    json.dump(dict(meetings=meetings, items=items, mvotes=mvotes), open(OUT, 'w'), indent=0)
    import collections
    c = collections.Counter('roll' if i['roll'] else ('nomotion' if not i['motion'] else 'null') for i in items)
    print(len(meetings), 'meetings', len(items), 'items', dict(c))
    print('no present list:', [m['date'] + ' ' + m['name'] for m in meetings if not m['present']])

run()
