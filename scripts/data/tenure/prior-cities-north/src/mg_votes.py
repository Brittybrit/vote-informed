"""Resolve each Miami Gardens item's vote from items.json -> votes.json.
Usage: python3 mg_votes.py <workdir>
Rules: an item's own last adopting motion wins; consent items not pulled take the meeting's consent motion.
Roll-call lines give each member's vote. A voice vote gives 'yes' to every member present at that point
(present list at roll call, then arrivals/departures by position) unless the minutes name dissenters; a tally
with 'no' votes whose dissenters are not named gives 'unknown' to everyone present."""
import json, re, sys, os
W = sys.argv[1]
R = json.load(open(os.path.join(W, 'items.json')))
SKIP_SEC = re.compile(r'ORDER OF BUSINESS|APPROVAL OF MINUTES|PRESENTATION|PUBLIC COMMENT|REPORTS|INVOCATION|PLEDGE', re.I)
ADOPT = re.compile(r'\b(approve|adopt|accept|award|authori[sz]e|ratify|grant|deny|move)\b', re.I)
NOTMAIN = re.compile(r'\b(amend|defer|table|continue|reconsider|postpone|withdraw|remand|extend the meeting|suspend)\b', re.I)

def tally(tail):
    t = tail.lower()
    m = re.search(r'(\d)\s*(?:to|-|–)\s*(\d)', t)
    if m: return int(m.group(1)), int(m.group(2))
    if 'unanim' in t: return 'U'
    return None

ROSTER = {}
for it in R:
    for r in it['rolls']:
        for n in r:
            a = ROSTER.setdefault(n, [it['date'], it['date']]); a[0] = min(a[0], it['date']); a[1] = max(a[1], it['date'])
def members(date):
    return [n for n, (a, b) in ROSTER.items() if a <= date <= b]
def present_at(it):
    pt = it.get('ptext') or ''
    pres = [n for n in members(it['date']) if re.search(r'\b' + n + r'\b', pt)]
    for mm in re.finditer(r'(\w+)\s+(?:was|were)\s+(?:absent|excused)', pt):
        if mm.group(1) in pres: pres.remove(mm.group(1))
    for (i, n, what) in it['events']:
        if i > it['start']: continue
        if what in ('arrived', 'returned', 'rejoined'):
            if n not in pres: pres.append(n)
        else:
            if n in pres: pres.remove(n)
    return pres

out = []
bydoc = {}
for it in R: bydoc.setdefault(it['doc'], []).append(it)
for doc, items in bydoc.items():
    consent = [it for it in items if it['consent_motion'] and it['motions']]
    cmot = None
    if consent:
        c = consent[-1]
        mm = [m for m in c['motions'] if re.search(r'consent', m['what'], re.I)] or c['motions']
        cmot = (mm[-1], c['rolls'][-1] if c['rolls'] else None, c)
    if cmot is None:
        for it in items:
            if not re.search(r'CONSENT', it['section'] or '', re.I): continue
            m = re.search(r'consent\s+agenda[^.]{0,80}?(passed|carried|failed)(.{0,60}?)vote', it['rest'], re.I | re.S)
            if m:
                mv = re.search(r'motion\s+(?:was\s+)?(?:made|offered)\s+by\s+([A-Z][\w\s.,]+?),?\s+seconded\s+by\s+([A-Z][\w\s.,]+?),?\s+(?:to\s+)?(?:approve|adopt)', it['rest'][max(0, m.start()-250):m.end()], re.S)
                from mg_parse_names import norm
                cmot = (dict(mover=norm(mv.group(1)) if mv else None, second=norm(mv.group(2)) if mv else None, what='consent agenda', outcome=m.group(1).lower(), tail=m.group(2), dissent=[]), None, it)
                break
    for it in items:
        if not it.get('title'): continue
        if SKIP_SEC.search(it['section'] or '') or it['code'].startswith('ADD'): continue
        flags = []
        main = [m for m in it['motions'] if not re.search(r'consent', m['what'], re.I) and not NOTMAIN.search(m['what'][:40])]
        roll = None; src = None; mot = None
        if main:
            mot = main[-1]; src = 'own'
            if it['rolls']: roll = dict(it['rolls'][-1]); src = 'own-roll'
        elif re.search(r'CONSENT', it['section'] or '', re.I) and not it['pulled']:
            if cmot:
                mot, croll, c = cmot; src = 'consent'
                if croll and c is it: roll = dict(croll); src = 'consent-roll'
            else: flags.append('no consent motion found')
        elif it['motions']:
            mot = it['motions'][-1]; src = 'other-motion'; flags.append('only non-main motion: ' + mot['what'][:60])
        if it['pulled'] and src is None: flags.append('pulled from consent (heard later)')
        res = None; tl = None
        if mot:
            res = 'failed' if mot['outcome'] in ('failed', 'died', 'was denied') else 'passed'
            tl = tally(mot['tail'])
            if roll is None:
                pres = present_at(it)
                if not pres and isinstance(tl, tuple) and len(members(it['date'])) == tl[0] + tl[1]:
                    pres = members(it['date']); flags.append('present list not parsed; tally equals full council')
                if isinstance(tl, tuple) and tl[0] + tl[1] != len(pres):
                    # try the nearest roll call in the same meeting whose present count matches the tally
                    cands = sorted([(abs(o['start'] - it['start']), r) for o in items for r in o['rolls']], key=lambda x: x[0])
                    for _, r in cands:
                        p2 = [n for n, v in r.items() if v not in ('absent',)]
                        if len(p2) == tl[0] + tl[1]: pres = p2; flags.append('present from nearest roll call'); break
                if tl == 'U' or (isinstance(tl, tuple) and tl[1] == 0 and res == 'passed'):
                    roll = {n: 'yes' for n in pres}
                    if isinstance(tl, tuple) and tl[0] != len(pres): roll = {n: 'unknown' for n in pres}; flags.append(f'tally {tl} vs present {len(pres)}')
                elif isinstance(tl, tuple):
                    d = mot.get('dissent') or []
                    if res == 'passed' and len(d) == tl[1]:
                        roll = {n: ('no' if n in d else 'yes') for n in pres}
                        if tl[0] + tl[1] != len(pres): roll = {n: ('no' if n in d else 'unknown') for n in pres}; flags.append(f'tally {tl} vs present {len(pres)}')
                    else:
                        roll = {n: 'unknown' for n in pres}; flags.append(f'tally {tl} dissent {d} not resolved')
                else:
                    roll = {n: 'unknown' for n in pres}; flags.append('no tally: ' + mot['tail'][:40])
        if roll:
            for mm in re.finditer(r'(?:Council\s*(?:wo)?man|Vice\s*Mayor|Mayor|Council\s*Member)\s+(?:[A-Z][a-z]+\s+)?([A-Z][a-zA-Z\-]+)(?:,?\s*Jr\.?)?\s+(?:was|were|is)\s+(?:out\s+of\s+the\s+chambers?|not\s+present|absent|away\s+from\s+the\s+dais|excused|not\s+in\s+the\s+chambers?)', it['rest']):
                n = mm.group(1)
                if n in roll and roll[n] in ('yes', 'unknown'):
                    roll[n] = 'absent'; flags.append(f'{n} noted not present in item text')
                    if isinstance(tl, tuple) and sum(1 for v in roll.values() if v in ('yes', 'no')) != tl[0] + tl[1]: flags.append('count check failed after absence')
        out.append(dict(doc=doc, date=it['date'], meeting=it['meeting'], code=it['code'], section=it['section'], resno=it['resno'],
                        title=it['title'], result=res, src=src, mover=mot['mover'] if mot else None, second=mot['second'] if mot else None,
                        tally=tl, roll=roll, flags=flags, consent=src in ('consent', 'consent-roll'), pulled=it['pulled']))
json.dump(out, open(os.path.join(W, 'votes.json'), 'w'), indent=0)
print(len(out), 'titled items;', sum(1 for o in out if o['roll'] is None), 'without vote;', sum(1 for o in out if o['flags']), 'flagged')
