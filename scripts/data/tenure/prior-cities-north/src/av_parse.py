"""Aventura signed resolutions and ordinances (Laserfiche CityHall repo; text of pages 1, 2 and the last 3 pages
saved by the fetch script to <av2>/res/*.json) -> items for build_body.py.
Each signed record says 'offered by <member>, who moved its adoption [on second reading]. The motion was seconded by
<member> ... the vote was as follows:' then one line per member. Ordinances use the second-reading vote and date.
Members are keyed by full name (two Weinbergs sat together: Howard Weinberg and Luz Urbaez Weinberg).
Usage: python3 av_parse.py <av2 dir> <out.json>"""
import json, re, sys, os, glob
AV, OUT = sys.argv[1:3]
MON = {m: i for i, m in enumerate('january february march april may june july august september october november december'.split(), 1)}
VAL = {'yes': 'yes', 'aye': 'yes', 'no': 'no', 'nay': 'no', 'absent': 'absent', 'excused': 'absent', 'abstain': 'abstain', 'abstained': 'abstain', 'recused': 'recused', 'recusal': 'recused'}
ROLE = r'(?:Commissioner|Vice\s+Mayor|Mayor)'
LINE = re.compile(r'^\s*' + ROLE + r'\s+([A-Z][\w.\'-]*(?:\s+[A-Z][\w.\'-]*){0,3}?)\s+(yes|no|absent|abstain(?:ed)?|recused|excused|aye|nay)\b', re.M | re.I)
FIX = {'Luz Urbaez-Weinberg': 'Luz Urbaez Weinberg', 'Luz Urbaez- Weinberg': 'Luz Urbaez Weinberg', 'Urbaez Weinberg': 'Luz Urbaez Weinberg', 'Robert Shelly': 'Robert Shelley', 'Mayor Teri Holzberg': 'Teri Holzberg', 'Enbar Cohen': 'Enbar Cohen', 'Dr. Linda Marks': 'Linda Marks', 'Robert Shelley': 'Robert Shelley'}
def nm(s):
    s = re.sub(r'\s+', ' ', s.strip()); return FIX.get(s, s)
DV = 'https://egov2.cityofaventura.com/Imaging/DocView.aspx?id=%s&dbid=0&repo=CityHall'
rows = []
for f in sorted(glob.glob(os.path.join(AV, 'res', '*.json'))):
    d = json.load(open(f)); kind = os.path.basename(f)[0]
    tx = d['text'] if isinstance(d['text'], str) else '\n'.join(d['text'][k] for k in sorted(d['text'], key=int))
    t = tx.replace('\t', '  ').replace('\r', '')
    m = re.search(r'(\d{4})-(\d{1,3})', d['name']) or re.search(r'(?:RESOLUTION|ORDINANCE)\s+NO\.?\s*(\d{4})\s*-\s*(\d{1,3})', t, re.I)
    no = f'{m.group(1)}-{int(m.group(2)):02d}' if m else str(d['id'])
    tm = re.search(r'(AN?\s+(?:RESOLUTION|ORDINANCE)\s+OF\s+THE\s+CITY\s+(?:COMMISSION|OF\s+AVENTURA).*?EFFECTIVE\s+DATE\.?)', t, re.S | re.I)
    title = re.sub(r'\s+', ' ', tm.group(1)) if tm and len(tm.group(1)) < 3000 else d['name']
    blocks = []; fuzzy = False
    am = re.search(r'(?:the\s+)?(?:applicant|owner)s?,?\s+([A-Z0-9][\w&.,\'\- ]{2,90}?),?\s+(?:through|has\s+applied|is\s+requesting|by\s+and\s+through|submitted|requests)', re.sub(r'\s+', ' ', t))
    applicant = am.group(1).strip(' ,') if am else None
    for bm in re.finditer(r'offered\s+by\s+' + ROLE + r'\s+([A-Z][\w.\'-]*(?:\s+[A-Z][\w.\'-]*){0,2}?),?\s+who\s+mov\w*\s+its\s+(?:\S{1,3}\s+)?adoption(.{0,40}?)\.\s*(?:The|This)\s+motion\s+was\s+seconded\s+by\s+' + ROLE + r'\s+([A-Z][\w.\'-]*(?:\s+[A-Z][\w.\'-]*){0,2}?)\s*(?:,|and\b|who\b)', t, re.S):
        seg = t[bm.end():bm.end() + 900]
        seg = re.split(r'offered\s+by|PASSED', seg)[0]
        r = {}
        for lm in LINE.finditer(seg): r.setdefault(nm(lm.group(1)), VAL[lm.group(2).lower()])
        if len(r) < 3:   # two-column layout read as a list of names followed by a list of votes
            nms = [nm(x) for x in re.findall(r'^\s*' + ROLE + r'\s+([A-Z][\w.\'-]*(?:\s+[A-Z][\w.\'-]*){0,3}?)\s*$', seg, re.M)]
            vts = re.findall(r'^\s*(yes|no|absent|abstain(?:ed)?|recused|excused)\s*$', seg, re.M | re.I)
            if len(nms) >= 3 and len(nms) == len(vts): r = {n: VAL[v.lower()] for n, v in zip(nms, vts)}
        blocks.append(dict(mover=nm(bm.group(1)), second=nm(bm.group(3)), reading=re.sub(r'\s+', ' ', bm.group(2)).strip(), roll=r if len(r) >= 3 else None))
    b = None
    if blocks:
        sec = [x for x in blocks if 'second' in x['reading'].lower()]
        b = (sec or blocks)[-1]
    dm = None
    for dmm in re.finditer(r'PASSED\s+(?:AND\s+ADOPTED\s+)?(?:on\s+(first|second)\s+reading\s+)?(?:on\s+)?this\s+(\d{1,2})\s*\w{0,4}\s+day\s+of\s+([A-Za-z]+)\s*,?\s*(\d{4})', t, re.I):
        if dmm.group(3).lower() in MON and (dm is None or (dmm.group(1) or '').lower() == 'second'): dm = dmm
    date = f'{dm.group(4)}-{MON[dm.group(3).lower()]:02d}-{int(dm.group(2)):02d}' if dm else None
    if date:
        try:
            import datetime as _d; _d.date(int(date[:4]), int(date[5:7]), int(date[8:10]))
        except ValueError: date = None
    lm = re.search(r'(' + '|'.join(m.title() for m in MON) + r')\s+(\d{1,2}),?\s+(\d{4})\s*$', d['name'])
    if not date and lm: date = f'{lm.group(3)}-{MON[lm.group(1).lower()]:02d}-{int(lm.group(2)):02d}'
    def _ok(ds):
        try:
            import datetime as _d; _d.date(int(ds[:4]), int(ds[5:7]), int(ds[8:10])); return True
        except Exception: return False
    if not date:   # OCR-damaged date line: day and a fuzzy month; the year is the record's own number year
        import difflib
        fm = list(re.finditer(r'(?:ADOPTED|reading)[^\n]{0,40}?(\d{1,2})\s*\w{0,3}\s+day\s+of\s*([A-Za-z \-]{2,14})', t, re.I))
        if fm:
            fm = fm[-1]; mon = difflib.get_close_matches(re.sub(r'[^a-z]', '', fm.group(2).lower()), list(MON), n=1, cutoff=0.6)
            if mon and _ok(f'{no[:4]}-{MON[mon[0]]:02d}-{int(fm.group(1)):02d}'): date = f'{no[:4]}-{MON[mon[0]]:02d}-{int(fm.group(1)):02d}'; fuzzy = True
    roll = b['roll'] if b else None
    yes = sum(1 for v in (roll or {}).values() if v == 'yes'); no_ = sum(1 for v in (roll or {}).values() if v == 'no')
    rows.append(dict(key=f'av-{"r" if kind == "R" else "o"}{no}', date=date or (no[:4] + '-??-??'), title=title, label=d['name'], roll=roll,
                     mover=b['mover'] if b else None, second=b['second'] if b else None, result=('passed' if yes > no_ else 'failed') if roll else 'passed',
                     consent=False, url=DV % d['id'], minutes=DV % d['id'], ref=('Resolution No. ' if kind == 'R' else 'Ordinance No. ') + no,
                     src='signed record', note=('Vote from the signed ' + ('resolution.' if kind == 'R' else 'ordinance (second reading).')) if roll else None,
                     nblocks=len(blocks), id=d['id'], pages=d['pages'], fuzzy=fuzzy, applicant=applicant))
# still undated: take the date shared by the nearest lower- and higher-numbered records of the same kind and year
def num(r):
    m = re.match(r'av-([ro])(\d{4})-(\d+)$', r['key']); return (m.group(1), m.group(2), int(m.group(3))) if m else None
dated = {}
for r in rows:
    n = num(r)
    if n and '?' not in r['date']: dated.setdefault(n[:2], []).append((n[2], r['date']))
for r in rows:
    n = num(r)
    if not n or '?' not in r['date']: continue
    L = sorted(dated.get(n[:2], []))
    lo = [d for k, d in L if k < n[2]][-1:]; hi = [d for k, d in L if k > n[2]][:1]
    if lo and hi and lo[0] == hi[0]:
        r['date'] = lo[0]; r['note'] = (r['note'] or '') + ' Adoption date not legible in the scan; taken from the neighboring numbered records adopted the same day.'
json.dump(rows, open(OUT, 'w'), indent=0, ensure_ascii=False)
print(len(rows), 'records;', sum(1 for r in rows if r['roll']), 'with roll;', sum(1 for r in rows if '?' in r['date']), 'no date')
