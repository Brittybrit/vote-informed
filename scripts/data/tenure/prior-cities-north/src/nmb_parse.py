"""North Miami Beach council minutes (NovusAgenda DisplayAgendaPDF.ashx?MinutesMeetingID=N, scans OCR'd to <nmb>/txt/N.txt)
-> one item per final motion, for build_body.py.
Minutes say 'Motion to approve ... made by X, seconded by Y.' then 'MOTION PASSED 7-0' (voice vote, dissenters named:
'with A and B opposed', 'with X off the dais') or 'ROLL CALL VOTE: Name - Yes, ...'.
Members present come from the roll-call paragraph. A voice vote gives yes to members present not named as opposed or
off the dais, but only when that count equals the stated tally; otherwise each member is 'unknown'.
Usage: python3 nmb_parse.py <nmb dir> <first id> <last id> <out.json>"""
import json, re, sys, os, datetime
D, A, B, OUT = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
MEM = ['Vallejo', 'Pierre', 'DeFillipo', 'Kramer', 'Martell', 'Smith', 'Spiegel', 'Derose', 'DeRose', 'Rosner', 'Joseph', 'Fleurimond',
       'Villard', 'Smukler', 'Jean', 'Bencomo', 'Ferrer', 'Lee', 'Wolfe', 'Paul']
FIX = {'DefFillipo': 'DeFillipo', 'DeFilippo': 'DeFillipo', 'Defilippo': 'DeFillipo', 'DeRose': 'Derose', 'Defillipo': 'DeFillipo', 'DeFilipo': 'DeFillipo', 'Spiege': 'Spiegel', 'Kramar': 'Kramer', 'Marte': 'Martell'}
MON = {m: i for i, m in enumerate('january february march april may june july august september october november december'.split(), 1)}
URL = 'https://nmb.novusagenda.com/agendapublic/DisplayAgendaPDF.ashx?MinutesMeetingID=%d'
def names(seg):
    out = []
    seg = re.sub(r'(?:City\s+Attorney|Attorney)\s+(?:Jose\s+)?Smith', '', seg)
    for m in re.finditer(r'\b([A-Z][a-zA-Z]+)\b', seg):
        n = FIX.get(m.group(1), m.group(1))
        if n in MEM and n not in out: out.append(n)
    return out
rows = []
for i in range(A, B + 1):
    f = os.path.join(D, 'txt', '%d.txt' % i)
    if not os.path.exists(f): continue
    t = open(f, errors='ignore').read()
    dm = re.search(r'(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),?\s+([A-Z][a-z]+)\s+(\d{1,2})\S{0,3},?\s*(\d{4})', t[:1500])
    if not dm or dm.group(1).lower() not in MON: continue
    date = f'{dm.group(3)}-{MON[dm.group(1).lower()]:02d}-{int(dm.group(2)):02d}'
    kind = 'special' if re.search(r'Special', t[:400]) else ('workshop' if re.search(r'Workshop', t[:400]) else 'regular')
    if kind == 'workshop': continue
    rc = re.search(r'ROLL CALL OF THE CITY OFFICIALS(.{0,900}?)(?:were also present|INVOCATION|PLEDGE)', t, re.S)
    pres_txt = rc.group(1) if rc else ''
    pres_txt = re.sub(r'City (?:Attorney|Manager|Clerk)\s+[A-Z][\w.]*(?:\s+[A-Z][\w.]*){0,3}', '', pres_txt)
    absent = []
    for am in re.finditer(r'((?:Mayor|Vice Mayor|Council(?:wo)?man|Council Members?)\s+[A-Z][\w.]*(?:\s+[A-Z][\w.]*){0,3})\s+(?:was|were)\s+(?:absent|not present|excused)', pres_txt):
        absent += names(am.group(1))
    present = [n for n in names(pres_txt) if n not in absent]
    mm = list(re.finditer(r'Motion\s+to\s+(?P<what>.{3,400}?)\s*,?\s+(?:was\s+)?made\s+by\s+(?P<mover>[^,.(]{3,60}?),?\s+(?:and\s+)?seconded\s+by\s+(?P<second>[^.(]{3,60}?)\s*(?:\.|(?=\())', t, re.S | re.I))
    prev_end = 0
    for k, m in enumerate(mm):
        nxt = mm[k + 1].start() if k + 1 < len(mm) else len(t)
        after = t[m.end():nxt]
        rm = re.search(r'(?:MOTION\s+)?(PASSED|FAILED|CARRIED|DIED|PASSES|FAILS|ADOPTED|APPROVED)(?:\s+as\s+amended)?\s*(\d+)\s*[-–—]\s*(\d+)?([^\n]*(?:\n[^\n]+){0,3})', after[:6000], re.I)
        ctx = t[prev_end:m.start()]; prev_end = m.end()
        what = re.sub(r'\s+', ' ', m.group('what'))
        if re.match(r'(?:defer|table|amend|adjourn|approve the agenda|approve the minutes|excuse|reconsider|extend the meeting|continue|appeal|appoint|recess|go into|open|close|approve (?:the )?(?:conditional )?use of the city (?:seal|logo)|approve the request for use of the city)', what, re.I) and not re.search(r'Resolution|Ordinance|agreement|contract|license', what, re.I): continue
        hdr = None
        for h in re.finditer(r'(?:Resolution\s+(?:No\.\s*)?R?\s*(\d{4})\s*[-–]\s*(\d+)|Ordinance\s+(?:No\.\s*)?(\d{4})\s*[-–]\s*(\d+))', ctx + ' ' + what):
            hdr = h
        ref = None
        if hdr: ref = ('Resolution R%s-%s' % (hdr.group(1), hdr.group(2))) if hdr.group(1) else ('Ordinance %s-%s' % (hdr.group(3), hdr.group(4)))
        tm = None
        for tmm in re.finditer(r'(AN?\s+(?:RESOLUTION|ORDINANCE)\s+OF\s+THE\s+MAYOR\s+AND\s+CITY\s+COUNCIL.*?(?:EFFECTIVE\s+DATE|\.\s*$))', ctx, re.S | re.M): tm = tmm
        title = re.sub(r'\s+', ' ', tm.group(1)) if tm else None
        roll, res, tally, note = None, None, None, None
        if rm:
            res = 'failed' if rm.group(1).upper() in ('FAILED', 'DIED', 'FAILS') else 'passed'
            y = int(rm.group(2)); nn = int(rm.group(3)) if rm.group(3) else 0; tally = [y, nn]
            tail = re.sub(r'\s+', ' ', rm.group(4))
            rcv = re.search(r'ROLL\s+CALL\s+VOTE:?(.{0,400})', after[max(0, rm.start() - 500):rm.start() + 600], re.S)
            if rcv:
                r = {}
                for v in re.finditer(r'([A-Z][A-Za-z]+)\s*[-–—:]\s*(Yes|No(?![a-z])|Not\s+Present|Absent|Abstain(?:ed)?|Recused)', rcv.group(1)):
                    n = FIX.get(v.group(1), v.group(1)); w = re.sub(r'\s+', ' ', v.group(2).lower())
                    if n in MEM: r[n] = {'not present': 'absent', 'abstained': 'abstain'}.get(w, w)
                if len(r) >= 3: roll = r; note = 'Roll call vote recorded in the minutes.'
            if roll is None:
                om = re.search(r'(?:with|\()\s*([^()]*?)\s+(?:opposed|dissenting|voting no)', tail); opp = names(om.group(1)) if om else []
                fm = re.search(r'(?:with|\()\s*([^()]*?)\s+(?:off the dais|absent|not present|out of the room|recused|abstaining|away from the dais)', tail); off = names(fm.group(1)) if fm else []
                for xm in re.finditer(r'((?:Mayor|Vice Mayor|Council(?:wo)?man)\s+[A-Z][\w.]*(?:\s+[A-Z][\w.]*){0,2})\s+(?:was\s+|were\s+)?(?:not present|absent|off the dais|away from the dais|out of the room|recused|stepped out|left)', tail):
                    off += [n for n in names(xm.group(1)) if n not in off]
                yes = [p for p in present if p not in opp and p not in off]
                if len(yes) == y and len(opp) == nn:
                    roll = {p: 'yes' for p in yes}; roll.update({p: 'no' for p in opp}); roll.update({p: 'absent' for p in off})
                    roll.update({a: 'absent' for a in absent})
                    note = 'Voice vote; members present per the roll call, dissenters as named in the minutes.'
                else:
                    roll = {p: 'unknown' for p in set(present) | set(opp) | set(off)}
                    note = 'Voice vote %d-%d; the minutes do not show how each member voted.' % (y, nn)
        hdrs = list(re.finditer(r'(?:Resolution\s+(?:No\.\s*)?R?\s*(\d{4})\s*[-–]\s*(\d+)|Ordinance\s+(?:No\.\s*)?(\d{4})\s*[-–]\s*(\d+))', ctx))
        if 'consent' in what.lower() and len(hdrs) > 1:
            for j, h in enumerate(hdrs):
                seg = ctx[h.start(): hdrs[j + 1].start() if j + 1 < len(hdrs) else len(ctx)]
                tt = re.search(r'(AN?\s+(?:RESOLUTION|ORDINANCE)\s+OF\s+THE\s+MAYOR.*?)(?:\n\s*\n[A-Z][a-z]|$)', seg, re.S)
                rf = ('Resolution R%s-%s' % (h.group(1), h.group(2))) if h.group(1) else ('Ordinance %s-%s' % (h.group(3), h.group(4)))
                rows.append(dict(key='nmb-%s-%d-%d-%s' % (date, i, k + 1, rf.split()[-1]), date=date, meeting=kind, title=re.sub(r'\s+', ' ', tt.group(1)) if tt else rf, what='consent agenda: ' + what, ref=rf, roll=roll, tally=tally,
                                 mover=(names(m.group('mover')) or [None])[0], second=(names(m.group('second')) or [None])[0], result=res or 'passed',
                                 consent=True, url=URL % i, minutes=URL % i, src='minutes', note=note, ctx=re.sub(r'\s+', ' ', seg[:700]), doc=i))
            continue
        jm = re.search(r'Smith\s*[-–—:]\s*((?:No\s+)?Contact[^\n]*)', after[:2500])
        jen = re.sub(r'\s+', ' ', jm.group(1)).strip() if jm and 'Jennings' in after[:2500].replace('JENNINGS', 'Jennings') else None
        if jen and not jen.lower().startswith('no contact'):
            note = (note or '') + ' Jennings disclosure by Councilwoman Smith: "' + jen[:160] + '".'
        rows.append(dict(key='nmb-%s-%d-%d' % (date, i, k + 1), date=date, meeting=kind, title=title or what, what=what, ref=ref, roll=roll, tally=tally,
                         mover=(names(m.group('mover')) or [None])[0], second=(names(m.group('second')) or [None])[0], result=res or 'passed',
                         consent='consent agenda' in what.lower(), url=URL % i, minutes=URL % i, src='minutes', note=note,
                         ctx=re.sub(r'\s+', ' ', ctx[-4000:]), doc=i))
seenk = {}
for r in rows:
    kk = r['key']; seenk[kk] = seenk.get(kk, 0) + 1
    if seenk[kk] > 1: r['key'] = kk + '.' + 'abcdefgh'[seenk[kk] - 1]
json.dump(rows, open(OUT, 'w'), indent=0, ensure_ascii=False)
print(len(rows), 'motions;', sum(1 for r in rows if r['roll'] and 'unknown' not in r['roll'].values()), 'with member votes')
