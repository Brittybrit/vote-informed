"""Surfside signed resolutions (town website PDFs; scans OCR'd to <sf>/rtxt by first pages until the vote block)
-> items for build_body.py. Each signed resolution carries 'Motion By / Second By / FINAL VOTE ON ADOPTION' and one
line per member. Usage: python3 sf_parse.py <sf dir> <out.json>"""
import json, re, sys, os, glob
SF, OUT = sys.argv[1:3]
MON = {m: i for i, m in enumerate('january february march april may june july august september october november december'.split(), 1)}
url = {}
for ln in open(os.path.join(SF, 'res.tsv'), encoding='utf8'):
    p = ln.rstrip('\n').split('\t')
    if len(p) >= 3: url[p[0] + '-' + p[1].split('/')[-1].split('?')[0][:-4]] = (p[1], p[2])
VAL = {'yes': 'yes', 'aye': 'yes', 'no': 'no', 'nay': 'no', 'absent': 'absent', 'excused': 'absent', 'abstain': 'abstain', 'abstained': 'abstain', 'recused': 'recused'}
ROLE = r'(?:Commissioner|Vice\s*-?\s*Mayor|Mayor|Councilmember|Councilman|Councilwoman)'
ROLL = re.compile(r'^\s*' + ROLE + r'\s+((?:[A-Z][\w.\'-]*\s+){0,3}?)([A-Z][\w\'-]+)\s*[:.,_\-]*\s+(Yes|No|Absent|Excused|Abstain(?:ed)?|Recused|Aye|Nay)(?![a-z])', re.M | re.I)
NAMEFIX = {'Gielchinksy': 'Gielchinsky', 'Karukln': 'Karukin', 'Burket': 'Burkett', 'Burkelt': 'Burkett', 'KesI': 'Kesl', 'Kesi': 'Kesl', 'Kes': 'Kesl',
           'Goto': 'Coto', 'Viidostegui': 'Vildostegui', 'Velazquez': 'Velasquez', 'Weingto': 'Weingot', 'Trevani': 'Travani'}
rows = []
for f in sorted(glob.glob(os.path.join(SF, 'rtxt', '*.txt'))):
    b = os.path.basename(f)[:-4]
    t = open(f, errors='ignore').read()
    u, label = url.get(b, (None, b))
    m = re.search(r'no-(\d{4})-(?:z-)?(\d{4})', b) or re.search(r'RESOLUTION\s+NO\.?\s*[:_ ]*(\d{4})\s*[-–_ ]+\s*_?(\d{3,4})', t, re.I)
    resno = f'{m.group(1)}-{m.group(2)}' if m else b
    tm = re.search(r'(A\s+RESOLUTION\s+OF\s+THE\s+TOWN\s+COMMISSION.*?EFFECTIVE\s+DATE\.?)', t, re.S | re.I)
    title = re.sub(r'\s+', ' ', tm.group(1)) if tm and len(tm.group(1)) < 2500 else label
    dm = re.search(r'PASSED\s+AND\s+ADOPTED\s+(?:on\s+)?(?:this\s+)?_*(\d{1,2})\s*\S{0,4}\s*_*\s*(?:day\s*)?of\s*_*([A-Za-z]+)_*\s*[,.]?\s*(\d{4})', t, re.I)
    date = None
    if dm:
        import difflib
        mo = dm.group(2).lower(); mo = mo if mo in MON else (difflib.get_close_matches(mo, list(MON), 1, 0.75) or [None])[0]
        if mo and 0 < int(dm.group(1)) < 32: date = f'{dm.group(3)}-{MON[mo]:02d}-{int(dm.group(1)):02d}'
    vb = re.search(r'FINAL\s+VOTE\s+ON\s+ADOPTION|VOTE\s+ON\s+ADOPTION|SUMMARY\s+OF\s+VOTE|FINAL\s+VOTE', t, re.I)
    roll, mover, second = None, None, None
    if vb:
        seg = t[vb.end():vb.end() + 900]
        r = {}
        for mm in ROLL.finditer(seg):
            n = NAMEFIX.get(mm.group(2), mm.group(2)); r.setdefault(n, VAL[mm.group(3).lower()])
        roll = r if len(r) >= 3 else None
        pre = t[max(0, vb.start() - 400):vb.start()]
        mv = re.search(r'(?:Motion|Moved)\s+(?:By|by)\s*[:;]?\s*' + ROLE + r'?\s*(?:[A-Z][\w.]*\s+)?([A-Z][\w\'-]+)', pre)
        sc = re.search(r'Second(?:ed)?\s+(?:By|by)\s*[:;]?\s*' + ROLE + r'?\s*(?:[A-Z][\w.]*\s+)?([A-Z][\w\'-]+)', pre)
        mover = NAMEFIX.get(mv.group(1), mv.group(1)) if mv else None
        second = NAMEFIX.get(sc.group(1), sc.group(1)) if sc else None
    yes = sum(1 for v in (roll or {}).values() if v == 'yes'); no = sum(1 for v in (roll or {}).values() if v == 'no')
    rows.append(dict(key='sf-' + resno, date=date or (b[:4] + '-??-??'), title=title, label=label, roll=roll, mover=mover, second=second,
                     result=('passed' if yes > no else 'failed') if roll else 'passed', consent=False, url=u, minutes=u, ref='Resolution No. ' + resno,
                     src='signed resolution', note=('Vote from the signed resolution.' + (' Not every member\'s vote was legible in the scan.' if len(roll) < 5 else '')) if roll else None, file=b))
seenk = {}
for r in rows:
    k = r['key']; seenk[k] = seenk.get(k, 0) + 1
    if seenk[k] > 1: r['key'] = k + '.' + 'abcdefgh'[seenk[k] - 1]
json.dump(rows, open(OUT, 'w'), indent=0, ensure_ascii=False)
print(len(rows), 'resolutions;', sum(1 for r in rows if r['roll']), 'with roll;', sum(1 for r in rows if '?' in r['date']), 'no date')
