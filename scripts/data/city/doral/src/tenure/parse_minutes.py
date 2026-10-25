# Parses Doral Granicus final minutes (text saved from MinutesViewer pages) into item rows with their votes.
# Usage: python3 parse_minutes.py <minutes_dir> <meetings.json> > items.json
# Votes are only what the minutes state: "Roll call vote - motion passes unanimously" / "4-0 (X was Absent)" /
# "3-2 (A and B voted "no")" / "By consensus". Consent items take the consent motion and the attendance of the
# session (morning or evening roll call) in which they were heard.
import json, re, sys
D, MJ = sys.argv[1], sys.argv[2]
NAMES = {'Fraga': 'Fraga', 'Porras': 'Porras', 'Cabral': 'Cabral', 'Pineyro': 'Pineyro', 'Puig-Corve': 'PuigCorve', 'Reinoso': 'Reinoso'}
def who(s):
    return [v for k, v in NAMES.items() if k in s]
def attendance(block):
    pres, absn = [], []
    for m in re.finditer(r'^(?:Mayor|Vice Mayor|Councilwoman|Councilman)\s+[A-Za-z]+\s+([A-Za-z-]+)\s*\|?\s*(Present|Absent[^\n]*)', block, re.M):
        k = NAMES.get(m.group(1))
        if k: (pres if m.group(2) == 'Present' else absn).append(k)
    return pres, absn
def vote(line, seated):
    """roll from a motion line; seated = members present for the session"""
    r = {}
    if re.search(r'motion (passes|fails) unanimous', line, re.I) or re.search(r'By consensus', line, re.I):
        for k in seated: r[k] = 'yes'
        return r, 'adopted' if 'fail' not in line.lower() else 'failed'
    m = re.search(r'motion (passes|fails) (\d)-(\d)\.?\s*\(([^)]*)\)', line, re.I)
    if not m: return None, None
    note = m.group(4)
    no = []; ab = []; npres = []; ab_ = []; rec = []
    # each clause ends with its verb; names before the verb belong to it
    for part in re.split(r'[,;]\s*(?:and\s+)?(?=(?:Mayor|Vice|Council))|\s+and\s+(?=(?:Mayor|Vice|Council)[^,;]*?(?:was|were|voted))', note):
        pass
    for seg in re.finditer(r'((?:(?:Mayor|Vice Mayor|Councilwoman|Councilman|Councilmembers?)\s+[A-Za-z-]+(?:,?\s*(?:and\s+)?)?)+)\s*(voted\s*[“"]?no|w(?:as|ere) not present at the time[^,;)]*|w(?:as|ere) (?:Absent|Excused)[^,;)]*|abstained|recused (?:herself|himself))', note, re.I):
        names, verb = who(seg.group(1)), seg.group(2).lower()
        if verb.startswith('voted'): no += names
        elif 'not present' in verb: npres += names
        elif 'abstain' in verb: ab_ += names
        elif 'recused' in verb: rec += names
        else: ab += names
    for k in seated:
        if k in rec: r[k] = 'recused'
        elif k in ab_: r[k] = 'abstain'
        elif k in ab: r[k] = 'absent'
        elif k in npres: r[k] = 'absent'
        elif k in no: r[k] = 'no'
        else: r[k] = 'yes'
    for k in ab:
        r[k] = 'absent'
    y = sum(v == 'yes' for v in r.values()); n = sum(v == 'no' for v in r.values())
    if (y, n) != (int(m.group(2)), int(m.group(3))): return None, 'tally mismatch %s-%s vs %d-%d' % (m.group(2), m.group(3), y, n)
    return r, 'adopted' if m.group(1).lower() == 'passes' else 'failed'
out = []
for mt in json.load(open(MJ)):
    t = open('%s/%s.txt' % (D, mt['clip'])).read()
    # sessions: split at each "Call to Order / Roll Call of Members"
    parts = re.split(r'(?=Call to Order / Roll Call of Members)', t)
    seated = None
    for si, part in enumerate(parts):
        p, a = attendance(part)
        if p or a: seated = (p, a)
        if seated is None: continue
        pres, absn = seated
        if re.search(r'All members were present', part[:400]) and not p:
            pass
        cons = re.search(r'Consent Agenda[^\n]*\n(Motion[^\n]*)', part)
        cons_line = cons.group(1) if cons else None
        cons_items = set(re.findall(r'\b(\d+[A-Z])\b', cons_line.split('made by')[0])) if cons_line else set()
        for m in re.finditer(r'\n\s*(\d+)\)\s*\n', part):
            pass
        # items: " A)\n 23-4950 TITLE"
        for im in re.finditer(r'\n\s*([A-Z]{1,2})\)\s*\n\s*(\d{2}-\d{4})\s+([^\n]+)\n(.*?)(?=\n\s*[A-Z]{1,2}\)\s*\n\s*\d{2}-\d{4}|\n\s*\d+\)\s*\n|\Z)', part, re.S):
            letter, fil, title, body = im.groups()
            fl = body.lstrip('\n').split('\n', 1)[0]
            if re.match(r'\s*AN? (ORDINANCE|RESOLUTION)', fl): title = title.strip() + ' :: ' + fl.strip()
            sec = re.findall(r'\n\s*(\d+)\)\s*\n\s*([^\n]+)', part[:im.start()])
            secno, secname = (sec[-1] if sec else ('', ''))
            code = secno + letter
            lines = body.split('\n')
            mot = [l for l in lines if re.match(r'\s*Motion', l)]
            status = 'none'
            roll = res = None; mv = sd = None; how = ''
            if re.search(r'\(Item was approved on Consent\)', body) and cons_line:
                roll, res = vote(cons_line, pres); how = 'consent'; mline = cons_line
            elif mot:
                mline = [l for l in mot if re.search(r'Motion to (approve|deny|adopt)', l)]
                mline = mline[-1] if mline else mot[-1]
                roll, res = vote(mline, pres); how = 'motion'
            else:
                mline = ''
            mm = re.search(r'made(?: by)? ([A-Za-z -]+?) and seconded by ([A-Za-z -]+?)\.', mline or '')
            if mm: mv, sd = (who(mm.group(1)) or [None])[0], (who(mm.group(2)) or [None])[0]
            flags = [x for x in ('removed from the agenda', 'deferred', 'withdrawn', 'tabled', 'First Reading', 'Second Reading') if x.lower() in body.lower()]
            out.append(dict(date=mt['date'], clip=mt['clip'], url='https:' + mt['minutes'].replace('&amp;', '&'), meeting=mt['name'], item=code,
                            section=secname.strip(), file=fil, title=title.strip(), roll=roll, result=res, how=how, motion=(mline or '')[:300],
                            mover=mv, second=sd, flags=flags, seated=pres, absent=absn))
json.dump(out, sys.stdout, indent=0, ensure_ascii=False)
