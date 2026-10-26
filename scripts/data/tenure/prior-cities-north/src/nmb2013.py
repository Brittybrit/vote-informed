"""North Miami Beach 2013 minutes (NovusAgenda MinutesMeetingID 40-47), which use the older wording
'MOTION by X, seconded by Y, to ... (Approved 6-1, Name - No)' and 'ROLL CALL: Name - Yes, ...'.
Writes items in the same shape as nmb_parse.py. Usage: python3 nmb2013.py <nmb dir> <first id> <last id> <out.json>"""
import json, re, sys, os
D, A, B, OUT = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
MEM = ['Vallejo', 'Pierre', 'DeFillipo', 'Kramer', 'Martell', 'Smith', 'Spiegel', 'Derose']
FIX = {'DeFilltpo': 'DeFillipo', 'DeRose': 'Derose', 'DefFillipo': 'DeFillipo', 'DeFilippo': 'DeFillipo', 'Defilippo': 'DeFillipo', 'Spiege': 'Spiegel'}
MON = {m: i for i, m in enumerate('january february march april may june july august september october november december'.split(), 1)}
URL = 'https://nmb.novusagenda.com/agendapublic/DisplayAgendaPDF.ashx?MinutesMeetingID=%d'
def nm(s):
    for w in re.findall(r'[A-Z][a-zA-Z]+', s or ''):
        w = FIX.get(w, w)
        if w in MEM: return w
    return None
out = []
for i in range(A, B + 1):
    f = os.path.join(D, 'txt', '%d.txt' % i)
    if not os.path.exists(f): continue
    T = open(f, errors='ignore').read()
    dm = re.search(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})', T)
    if not dm: continue
    date = '%s-%02d-%02d' % (dm.group(3), MON[dm.group(1).lower()], int(dm.group(2)))
    kind = 'special' if re.search(r'Special Meeting', T[:400]) else 'regular'
    T = re.sub(r'City Council Meeting \w+ \d+, \d{4} Page \d+', ' ', T)
    S = re.sub(r'[ \t]+', ' ', T)
    pm = re.search(r'(?:Present at the meeting were|Present were|following members were present:?)(.*?)(?:Also,? present|Absent|INVOCATION|$)', re.sub(r'\s+', ' ', S))
    present = []
    for w in re.findall(r'[A-Z][a-zA-Z]+', pm.group(1) if pm else ''):
        w = FIX.get(w, w)
        if w in MEM and w not in present: present.append(w)
    flat = re.sub(r'\s+', ' ', S)
    flat = flat.replace('—', '-').replace('–', '-')
    mots = list(re.finditer(r'(?:A )?MOTION by ([^,]+?),? seconded by ([^,]+?),? to (.*?)(?=(?:A )?MOTION by |ROLL CALL|\(Approved|\(Failed|\(Passed|\Z)', flat))
    n = 0
    for k, m in enumerate(mots):
        n += 1
        what = m.group(3).strip()
        what = re.split(r'(?<=\.)\s+(?=[A-Z][a-z]+ [A-Z][a-z]+ (?:gave|opened|discussed)|Mayor|City|Public|The |There|Representing)', what)[0][:400]
        tail = flat[m.end():m.end() + 900]
        nxt = mots[k + 1].start() - m.end() if k + 1 < len(mots) else 900
        tail = tail[:max(0, nxt)]
        roll, tally, result, src = None, None, None, None
        rc = re.search(r'ROLL CALL(?: VOTE)?:\s*(.*?)\((Approved|Failed|Passed)\s*(\d)\s*-\s*(\d)', tail)
        vt = re.search(r'\((Approved|Failed|Passed)\s*(\d)\s*-\s*(\d)([^)]*)\)', tail)
        if rc:
            roll = {}
            for part in re.split(r',', rc.group(1)):
                mm = re.search(r'([A-Z][a-zA-Z]+)\s*-\s*(Yes|No|Absent|Abstain)', part)
                if mm:
                    w = FIX.get(mm.group(1), mm.group(1))
                    if w in MEM: roll[w] = mm.group(2).lower()
            tally = [int(rc.group(3)), int(rc.group(4))]; result = 'failed' if rc.group(2) == 'Failed' else 'passed'; src = 'roll'
        elif vt:
            tally = [int(vt.group(2)), int(vt.group(3))]; result = 'failed' if vt.group(1) == 'Failed' else 'passed'
            nos = [FIX.get(x, x) for x in re.findall(r'([A-Z][a-zA-Z]+)\s*-\s*No', vt.group(4))]
            if len(present) == tally[0] + tally[1]:
                roll = {p: ('no' if p in nos else 'yes') for p in present}; src = 'voice'
            else:
                roll = {p: ('no' if p in nos else 'unknown') for p in present}; src = 'voice?'
        # title: the agenda item text just before the motion
        before = flat[max(0, m.start() - 2500):m.start()]
        hd = list(re.finditer(r'(\d{1,2}\.\d{1,2})\s+(Resolution No\.?\s*(R?\d{4}-\d+)|Ordinance No\.?\s*(\d{4}-\d+))', before))
        ref, title = None, what
        if hd:
            h = hd[-1]; ref = ('Resolution ' + h.group(3)) if h.group(3) else ('Ordinance ' + h.group(4))
            title = before[h.start():][:1200]
        consent = bool(re.search(r'consent agenda', what, re.I))
        base = dict(date=date, meeting=kind, what=what, roll=roll, tally=tally, mover=nm(m.group(1)), second=nm(m.group(2)),
                    result=result, url=URL % i, minutes=URL % i, src='minutes', doc=str(i), ctx=flat[max(0, m.start() - 300):m.start()],
                    note=('Roll call recorded in the minutes.' if src == 'roll' else 'Voice vote; members present per the roll call, dissenters as named in the minutes.' if src == 'voice' else 'Vote total from the minutes; the minutes do not show how each member voted.' if src else 'Vote not given in the minutes.'))
        if consent:
            cs = re.search(r'CONSENT AGENDA(.*?)$', before, re.S)
            seg = flat[flat.rfind('CONSENT AGENDA', 0, m.start()):m.start()]
            items = list(re.finditer(r'(\d{1,2}\.\d{1,2})\.?,?\s+(Resolution No[\.,]?\s*(R?\d{4}-\s?\d+))', seg))
            only = re.findall(r'(\d\.\d)', what)
            for j, it in enumerate(items):
                if only and it.group(1) not in only: continue
                end = items[j + 1].start() if j + 1 < len(items) else len(seg)
                out.append(dict(base, key='nmb-%s-%d-%d-%s' % (date, i, n, (it.group(3) if it.group(3).startswith('R') else 'R' + it.group(3)).replace(' ', '')),
                                ref='Resolution ' + it.group(3).replace(' ', ''), title=seg[it.start():end][:1200], consent=True))
            if not items: out.append(dict(base, key='nmb-%s-%d-%d' % (date, i, n), ref=None, title=what, consent=True))
        else:
            out.append(dict(base, key='nmb-%s-%d-%d' % (date, i, n), ref=ref, title=title, consent=False))
json.dump(out, open(OUT, 'w'), indent=0)
print(len(out), 'items')
