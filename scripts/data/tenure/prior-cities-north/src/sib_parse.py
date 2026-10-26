"""Sunny Isles Beach (docucenter.sibfl.net Laserfiche WebLink, repo SIBFL), read in the built-in browser Oct 26, 2026.
Inputs (scratch exports): res.json = every resolution in City Clerk > Resolutions > Regular|Zoning, 2015-2022
(metadata: number, date, description; text of page 1 and of the adoption/vote block), min.json = full text of every
City Commission minutes document 2015-2021 (City Clerk > City Commission Minutes).
Votes come from the summary minutes ('Resolution No. X was adopted by a voice/roll call vote of A-B in favor',
absences in the clerk's brackets, 'Vote:' lists for roll calls). Where the minutes for the date are not online
the roll is left null (the signed resolution's handwritten Yes/No marks are not legible in the text layer).
Output: items JSON for build_body.py. Usage: python3 sib_parse.py res.json min.json out.json"""
import json, re, sys, collections
RES, MIN, OUT = sys.argv[1:4]
R = json.load(open(RES)); M = json.load(open(MIN))
TIT = r'(?:Commissioner|Vice\s*Mayor|Mayor)'
NAMEFIX = {'Goldmann': 'Goldman', 'Svechen': 'Svechin', 'Aelian': 'Aelion', 'Edelcap': 'Edelcup', 'Scholi': 'Scholl', 'Viscara': 'Viscarra', 'Action': 'Aelion'}
def nm(s): s = s.strip(" .,*'\"`"); return NAMEFIX.get(s, s)
MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
ROSTER = ['Scholl', 'Gatto', 'Aelion', 'Goldman', 'Levin', 'Svechin', 'Lama', 'Viscarra']
WB = 'http://docucenter.sibfl.net/WebLink/DocView.aspx?id={}&dbid=0&repo=SIBFL'
def mdate(name):
    m = re.match(r'(\d{4})-(\d{2})(\d{2})', name.strip()); return m and f'{m.group(1)}-{m.group(2)}-{m.group(3)}'
meetings = {}
for v in M.values():
    d = mdate(v['name'])
    if not d or 'Historic' in v['name'] or 'LPA' in v['name']: continue
    t = re.sub(r'(?:\n\s*\d{1,2}\s*)?\n<<PG>>\n[^\n]*Minutes[^\n]*\n(?:\s*\d{1,2}\s*\n)?', '\n', v['text'])
    t = t.replace('AeIion', 'Aelion').replace('Aelian', 'Aelion').replace('Isaac Action', 'Isaac Aelion')
    hm = re.search(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*[,.;]\s*(\d{4})', t[:600])
    if hm:
        hd = f"{hm.group(3)}-{MONTHS.index(hm.group(1)) + 1:02d}-{int(hm.group(2)):02d}"
        if hd != d: d = hd   # the folder name is wrong for a few documents; the minutes' own heading wins
    head = t[:t.find('2. PLEDGE')] if '2. PLEDGE' in t[:4000] else t[:2500]
    i0 = head.find('ROLL CALL'); rc = head[i0:] if i0 >= 0 else head
    present = [s for s in ROSTER if re.search(r'\b' + s + r'\b', rc)]
    gone = [nm(x) for x in re.findall(r'([A-Z][a-z]+)\s+(?:was|were)\s+(?:absent|excused)', rc)]
    present = [p for p in present if p not in gone]
    meetings.setdefault(d, []).append(dict(name=v['name'], id=v['id'], text=t, present=present))
votes = {}
NUMRX = r'\d{2,4}\s*-\s*(?:Z\s*-\s*)?\d{2,4}'
VR = re.compile(r"Resolution\W{0,2}\s*Nos?\W{0,2}\s*((?:" + NUMRX + r"|\(\w{1,4}\)|and|,|\s|['’;:.])+?)\W*(?:was|were|[NnV]vas|vvas)\W*(?:adopted|approved)\W+(?:by\W*(?:a|h)?\W*)?(voice|roll\s*call)?\W*(?:vote)?\W*(?:of\W*)?(\d)\s*[-=–]\s*\n?\s*(\d)(?:\s*-\s*(\d))?(?=(.{0,400}))", re.S | re.I)
for d, docs in meetings.items():
    for doc in docs:
        t = doc['text']
        for m in VR.finditer(t):
            nums = [re.sub(r'\s', '', x) for x in re.findall(NUMRX, m.group(1))]
            a, b = int(m.group(3)), int(m.group(4)); tail = m.group(6)
            tail = re.split(r'\n\s*\d{1,2}[A-Z]\.\s|\n\s*\d{1,2}\.\s+[A-Z]', tail)[0]
            pre = t[max(0, m.start() - 500):m.start()]
            mv = list(re.finditer(TIT + r'\s+(?:[A-Z][\w.]*\s+)?([A-Z][a-z]+)\s+moved,?\s+and\s+' + TIT + r'\s+(?:[A-Z][\w.]*\s+)?([A-Z][a-z]+)\s+seconded', pre))
            absent = [nm(x) for x in re.findall(TIT + r'\s+([A-Z][a-z]+)\s+(?:was\s+)?(?:absent|not\s+present|out\s+of\s+the\s+room|stepped\s+out|left)', tail)]
            absent += [nm(x) for x in re.findall(TIT + r'\s+([A-Z][a-z]+)\s+(?:was\s+)?absent', tail)]
            noes = [nm(x) for x in re.findall(TIT + r'\s+([A-Z][a-z]+)\s+(?:voted\s+|voting\s+|vote\s+)?(?:no\b|against|in\s+opposition|opposed|dissent)', tail[:200], re.I)]
            rec = [nm(x) for x in re.findall(TIT + r'\s+([A-Z][a-z]+)\s+(?:abstained|recused|declared\s+a\s+conflict|did\s+not\s+vote)', tail, re.I)]
            vl = re.search(r'Vote:\s*((?:\s*' + TIT + r'\s+[A-Z][a-z]+\s+(?:yes|ves|no|absent)\s*)+)', tail, re.I | re.S)
            roll = None
            if vl:
                roll = {nm(x): {'ves': 'yes'}.get(y.lower(), y.lower()) for x, y in re.findall(TIT + r'\s+([A-Z][a-z]+)\s+(yes|ves|no|absent)', vl.group(1), re.I)}
                for p in doc['present']:
                    if p in absent: roll.setdefault(p, 'absent')
                miss = [p for p in doc['present'] if p not in roll]
                ny = sum(1 for v in roll.values() if v == 'yes'); nn = sum(1 for v in roll.values() if v == 'no')
                if miss and len(miss) == (a - ny) + (b - nn) and b == nn:
                    for p in miss: roll[p] = 'yes'   # the clerk's tally accounts for them
                elif miss:
                    roll = None
            pres = [p for p in doc['present'] if p not in absent and p not in rec]
            if roll is None:
                if a + b == len(pres) and len(noes) == b:
                    roll = {p: ('no' if p in noes else 'yes') for p in pres}
                    for p in absent: roll[p] = 'absent'
                    for p in rec: roll[p] = 'recused'
                elif b == 0 and a == len(pres):
                    roll = {p: 'yes' for p in pres}
            note = None
            if roll is None: note = f'The minutes give the tally {a}-{b} but not who voted which way.'
            for n in nums:
                votes.setdefault(n, []).append(dict(date=d, roll=roll, tally=[a, b], mover=mv[-1].group(1) if mv else None, second=mv[-1].group(2) if mv else None,
                                                     minutes=WB.format(doc['id']), note=note, kind=(m.group(2) or 'voice').lower(), meeting=doc['name']))
def seq(n):
    n = re.sub(r'\s', '', n or '')
    m = re.search(r'Z-?(\d{2,4})$', n)
    if m: return 'Z' + str(int(m.group(1)))
    m = re.search(r'(\d{3,4})$', n)
    return m.group(1) if m else n
BYSEQ = {}
for n, lst in votes.items():
    BYSEQ.setdefault(seq(n), []).extend(lst)
items = []; stats = collections.Counter()
for v in R.values():
    f = v['f']; num = (f.get('Resolution Number') or '').strip()
    md = f.get('Date (mm/dd/yyyy)') or ''
    try: date = f'{md[6:10]}-{md[0:2]}-{md[3:5]}' if len(md) == 10 else '????-??-??'
    except Exception: date = '????-??-??'
    t1 = v['p1']
    tm = re.search(r'(A\s+RESOLUTION\s+OF\s+THE\s+CITY\s+COMMISSION.*?EFFECTIVE\s+DATE\.?)', t1, re.S | re.I)
    title = re.sub(r'\s+', ' ', tm.group(1)) if tm else (f.get('Description') or v['name'])
    vs = BYSEQ.get(seq(num), [])
    import datetime as _dt
    def _dd(x):
        try: return abs((_dt.date.fromisoformat(x['date']) - _dt.date.fromisoformat(date)).days)
        except Exception: return 999
    vs = sorted([x for x in vs if _dd(x) <= 120 or len(seq(num)) >= 4], key=_dd)
    vt = vs[0] if vs else None
    stats['with minutes vote' if vt and vt['roll'] else ('tally only' if vt else 'no minutes vote')] += 1
    if not vt:
        if date in meetings: nonote = 'The summary minutes for this meeting do not record this resolution\'s vote.'
        else: nonote = 'No minutes for this meeting are online (the clerk\'s Laserfiche minutes folder has none for this date, and the next agenda attaches only a cover memo); the signed resolution\'s handwritten Yes/No marks are not legible in its text layer.'
    items.append(dict(key='sib-' + (num or v['name']), date=date, title=title, what=f.get('Description'), roll=vt['roll'] if vt else None,
                      mover=vt['mover'] if vt else None, second=vt['second'] if vt else None, result='passed', consent=False,
                      url=WB.format(v['id']), minutes=vt['minutes'] if vt else WB.format(v['id']), ref='Resolution No. ' + (num or v['name']),
                      src=v['k'], note=(vt['note'] if vt else nonote), meeting=vt['meeting'] if vt else '', folder=v['k'], pages=v['pc']))
seen = collections.Counter()
for it in items:
    seen[it['key']] += 1
    if seen[it['key']] > 1: it['key'] += '.' + 'abcdefgh'[seen[it['key']] - 1]
json.dump(items, open(OUT, 'w'), ensure_ascii=False, indent=0)
print(len(items), dict(stats), 'minute votes', len(votes))
mins = {d: [x['present'] for x in docs] for d, docs in sorted(meetings.items())}
json.dump(mins, open(OUT.replace('.json', '-meetings.json'), 'w'), indent=0)
