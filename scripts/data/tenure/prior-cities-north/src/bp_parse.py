"""Biscayne Park commission minutes (village website PDFs, OCR'd to <bpn>/txt) -> one item per motion, for build_body.py.
Minutes say 'Commissioner X motioned to ... Commissioner Y seconded. Motion passed 3 - 1 (Vice-Mayor Tudor opposed).'
or list a roll call 'Commissioner X - Yes'. A tally-only motion gives member votes only when the members present minus
named dissenters equals the tally; otherwise each member is 'unknown'.
Usage: python3 bp_parse.py <bpn dir> <out.json>"""
import json, re, sys, os, glob
D, OUT = sys.argv[1:3]
MEM = ['Johnson', 'Samaria', 'Tudor', 'Wise', 'Truppman', 'Kennedy', "O'Halpin", 'Ross', 'Gonzalez', 'Hamelburg', 'Anderson', 'Watts', 'Coviello']
FIX = {"O'Haipin": "O'Halpin", 'Saramria': 'Samaria', 'Samari': 'Samaria', 'OHalpin': "O'Halpin", "O’Halpin": "O'Halpin", 'Hamelberg': 'Hamelburg', 'Tudo': 'Tudor', 'Samara': 'Samaria'}
MON = {m: i for i, m in enumerate('january february march april may june july august september october november december'.split(), 1)}
ROLE = r"(?:Commissioner|Commission|Mayor|Vice[- ]?Mayor|Vice[- ]?mayor)"
NAME = r"([A-Z][A-Za-z'’]+)(?:-\s?[A-Z][a-z]+)?"
def nm(s):
    s = s.replace('’', "'"); return FIX.get(s, s)
def names(seg):
    out = []
    for m in re.finditer(r"\b([A-Z][A-Za-z'’]+)\b", seg):
        n = nm(m.group(1))
        if n in MEM and n not in out: out.append(n)
    return out
def fdate(f):
    b = os.path.basename(f)
    m = re.search(r'(\d{1,2})[._](\d{1,2})[._](\d{4})', b)
    if m: return '%s-%02d-%02d' % (m.group(3), int(m.group(1)), int(m.group(2)))
    m = re.search(r'([A-Za-z]+)_(\d{1,2})_(\d{4})', b)
    if m and m.group(1).lower() in MON: return '%s-%02d-%02d' % (m.group(3), MON[m.group(1).lower()], int(m.group(2)))
    m = re.search(r'_(\d{2})_(\d{2})_(\d{4})', b)
    if m: return '%s-%s-%s' % (m.group(3), m.group(1), m.group(2))
    return None
URLS = {}
for ln in open(os.path.join(D, '..', 'bp', 'urls.txt')):
    ln = ln.strip()
    if ln: URLS[os.path.basename(ln).replace('%20', ' ')[:-4]] = 'https://biscayneparkfl.gov' + ln
rows = []
seen = {}
for f in sorted(glob.glob(os.path.join(D, 'txt', '*.txt'))):
    b = os.path.basename(f)
    if 'REVISED' in b.upper(): continue  # the revised copy of 03_03_2020 replaces nothing; keep the first
    date = fdate(f)
    t = open(f, errors='ignore').read().replace('’', "'")
    if not date or 'CANCEL' in b.upper(): continue
    kind = 'special' if re.search(r'special|emergency', b, re.I) else ('budget' if 'udget' in b else 'regular')
    rc = re.search(r'Roll\s+Call(.{0,700}?)(?:\n\s*\n\s*\d|\n\s*\d+\s*\.?\s*[A-Z])', t, re.S | re.I)
    pres_txt = rc.group(1) if rc else ''
    present = [n for n in names(pres_txt) if not re.search(re.escape(n) + r"\s*[-–:]\s*(?:absent|excused|not present)", pres_txt, re.I)]
    P1 = ROLE + r"\s+" + NAME + r"\s+(?:made\s+a\s+)?(?:motion(?:ed)?|moved)\s+(?:to\s+)?(?P<what>.{3,500}?)(?:[.,]\s+|\s+)(?:" + ROLE + r"\s+" + NAME + r"\s+second(?:ed)?|[Ss]econded\s+by\s+" + ROLE + r"\s+" + NAME + r"|[Ss]econd\s+by\s+" + ROLE + r"\s+" + NAME + r")"
    P2 = r"(?:It\s+was\s+moved\s+by\s+|(?<![A-Za-z])" + r")" + ROLE + r"\s+" + NAME + r"\s*,?\s*(?:made\s+a\s+motion|moved|motioned)?\s*,?\s*(?:and\s+)?seconded\s+by\s+" + ROLE + r"\s+" + NAME + r"\s*(?:to\s+)?(?P<what>[^.]{0,300})"
    mm = sorted(list(re.finditer(P1, t, re.S)), key=lambda x: x.start())
    taken = [(x.start(), x.end()) for x in mm]
    for x in re.finditer(P2, t, re.S):
        if not any(a <= x.start() < b or a < x.end() <= b for a, b in taken): mm.append(x)
    mm.sort(key=lambda x: x.start())
    for k, m in enumerate(mm):
        nxt = mm[k + 1].start() if k + 1 < len(mm) else len(t)
        after = t[m.end():nxt]; before = t[max(0, m.start() - 2500):m.start()]
        what = re.sub(r'\s+', ' ', m.group('what'))
        gs = [g for g in m.groups() if g]
        nmz = [nm(g) for g in gs if nm(g) in MEM]
        mover = nmz[0] if nmz else None; second = nmz[1] if len(nmz) > 1 else ''
        roll = {}
        for v in re.finditer(ROLE + r"\s+" + NAME + r"\s*[-–:]+\s*(Yes|No|Aye|Nay|Absent|Abstain\w*|Recused)\b", after[:1500], re.I):
            n = nm(v.group(1))
            if n in MEM: roll[n] = {'aye': 'yes', 'nay': 'no'}.get(v.group(2).lower(), v.group(2).lower())
        tm = re.search(r'(?:Motion|Resolution|Ordinance|Item|Mottion)?[^.]{0,40}?\b(pass(?:ed|es)?|failed|fails|carried|approved|died)\b[^0-9.]{0,40}?(?:vote\s+of\s+)?(\d)\s*[-–]\s*(\d)([^\n]*(?:\n[^\n]+)?)', after[:2500], re.I)
        tally = [int(tm.group(2)), int(tm.group(3))] if tm else None
        res = ('failed' if tm.group(1).lower() in ('failed', 'died', 'fails') else 'passed') if tm else None
        note = None
        if len(roll) >= 3:
            note = 'Roll call recorded in the minutes.'
            y = sum(1 for x in roll.values() if x == 'yes'); n = sum(1 for x in roll.values() if x == 'no')
            if not tally: tally = [y, n]
            if not res: res = 'passed' if y > n else 'failed'
        elif tm:
            tail = tm.group(4)
            om = re.search(r'\(([^)]*?)\s+(?:opposed|dissent\w*|voted no|voting no)', tail, re.I); opp = names(om.group(1)) if om else []
            om2 = re.search(r'\(([^)]*?)\s+(?:absent|recused|abstain\w*|not present|out of the room)', tail, re.I); off = [x for x in (names(om2.group(1)) if om2 else []) if x not in opp]
            yes = [p for p in present if p not in opp and p not in off]
            if present and len(yes) == tally[0] and len(opp) == tally[1]:
                roll = {p: 'yes' for p in yes}; roll.update({p: 'no' for p in opp}); roll.update({p: 'absent' for p in off})
                roll.update({p: 'absent' for p in names(pres_txt) if p not in roll})
                note = 'Vote count in the minutes; members present per the roll call, dissenters as named.'
            else:
                roll = {p: 'unknown' for p in set(present) | set(opp)}
                note = 'Vote %d-%d; the minutes do not show how each member voted.' % tuple(tally)
        else:
            roll = None
        ref = None
        rm = re.search(r'(Resolution|Ordinance)\s*(?:No\.?|#)?\s*(\d{4})\s*[-–]\s*(\d+)', what + ' ' + before[-600:])
        if rm: ref = '%s %s-%s' % (rm.group(1).title(), rm.group(2), rm.group(3))
        key = 'bp-%s-%d' % (date, k + 1)
        if key in seen: key += 'b'
        seen[key] = 1
        rows.append(dict(key=key, date=date, meeting=kind, title=what, what=what, ref=ref, roll=roll or None, tally=tally, mover=mover, second=second,
                         result=res or 'passed', consent='consent' in what.lower(), url=URLS.get(b[:-4]), minutes=URLS.get(b[:-4]), src='minutes', note=note,
                         ctx=re.sub(r'\s+', ' ', before[-1800:]), after=re.sub(r'\s+', ' ', after[:1500]), doc=b))
json.dump(rows, open(OUT, 'w'), indent=0, ensure_ascii=False)
print(len(rows), 'motions;', sum(1 for r in rows if r['roll'] and 'unknown' not in r['roll'].values()), 'with member votes;', sum(1 for r in rows if not r['tally']), 'no tally')
