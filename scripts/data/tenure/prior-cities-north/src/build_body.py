"""Generic builder for this slice's non-Miami-Gardens bodies.
Input: a normalized items JSON (list of {key, date, title, roll, mover, second, result, consent, url, minutes, ref, src, note})
and hand decisions (decisions/<prefix>-*.txt, same line format as Miami Gardens:
key|template|parties|amount|subject|place|reps|note; '-' not qualifying, '?' no named beneficiary, '1' first reading).
Writes <outdir>/actions.json, translations.json, titles-en.json.
Usage: python3 build_body.py <items.json> <prefix> <outdir> <city> <body> <window_from> <source label> [owners.json]"""
import json, re, sys, os, glob, collections
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from titles_ext import title, KIND
from cand import amount as auto_amount, is_candidate
items, prefix, outdir, city, body, wfrom, srclabel = sys.argv[1:8]
owners = json.load(open(sys.argv[8])) if len(sys.argv) > 8 and os.path.exists(sys.argv[8]) else {}
os.makedirs(outdir, exist_ok=True)
V = json.load(open(items)); byk = {v['key']: v for v in V}
# hand-read votes (decisions/rolls-<prefix>.txt: key|Name=yes,Name=no,...|mover|second|date|note) for scans the OCR could not read
RF = os.path.join(HERE, 'decisions', 'rolls-' + prefix + '.txt')
for ln in (open(RF, encoding='utf8') if os.path.exists(RF) else []):
    if not ln.strip() or ln.startswith('#'): continue
    p = [x.strip() for x in (ln.rstrip('\n').split('|') + [''] * 6)[:6]]
    if p[0] in byk:
        v = byk[p[0]]
        if p[1]: v['roll'] = dict(x.split('=') for x in p[1].split(','))
        if p[2]: v['mover'] = p[2]
        if p[3]: v['second'] = p[3]
        if p[4]: v['date'] = p[4]
        y = sum(1 for x in (v['roll'] or {}).values() if x == 'yes'); n = sum(1 for x in (v['roll'] or {}).values() if x == 'no')
        if p[1] and v['roll']: v['result'] = 'passed' if y > n else 'failed'; v['note'] = p[5] or 'Vote read by hand from the scan of the signed record (the text layer did not carry it).'
        elif p[5]: v['note'] = ((v.get('note') or '') + ' ' + p[5]).strip()
dec = {}
for f in sorted(glob.glob(os.path.join(HERE, 'decisions', prefix + '-*.txt'))):
    for ln in open(f, encoding='utf8'):
        ln = ln.rstrip('\n')
        if not ln.strip() or ln.startswith('#'): continue
        p = [x.strip() for x in (ln.split('|') + [''] * 8)[:8]]
        dec[p[0]] = p
acts, tr, skipped, unnamed, missing, needpa = [], {}, collections.Counter(), collections.Counter(), [], []
for k, d in dec.items():
    v = byk.get(k)
    if not v: missing.append(k); continue
    T = d[1]
    if T in ('-', '1'): skipped[T] += 1; continue
    if T == '?': unnamed[v['date'][:4]] += 1; continue
    parties = [x.strip() for x in d[2].split(';') if x.strip()]
    note = []
    if parties == ['@PA']:
        o = owners.get(k)
        if not o or not o.get('owner'): needpa.append(k); unnamed[v['date'][:4]] += 1; continue
        parties = [o['owner']]; note.append(o.get('note') or 'Owner of record on the vote date per the Miami-Dade Property Appraiser.')
    amt = auto_amount(v['title'] or '') if d[3] == 'a' else (float(d[3].replace(',', '')) if d[3] else None)
    if amt is not None and float(amt).is_integer(): amt = int(amt)
    en, es, ht = title(T, parties, amt, d[4] or 'other', d[5])
    if d[7]: note.insert(0, d[7])
    if v.get('note'): note.append(v['note'])
    if v['roll'] is None: note.append('Vote not given in the minutes.')
    roll = v['roll']
    yes = sum(1 for x in (roll or {}).values() if x == 'yes'); no = sum(1 for x in (roll or {}).values() if x == 'no')
    a = dict(id=k, date=v['date'], ref=v.get('ref') or k, title=en, kind=KIND.get(T, 'contract'), parties=parties, amount=amt,
             url=v.get('url'), roll=roll, tally=[yes, no] if roll and all(x in ('yes', 'no', 'absent', 'recused', 'abstain') for x in roll.values()) else None,
             mover=v.get('mover'), second=v.get('second'), consent=bool(v.get('consent')), result=v.get('result') or 'passed',
             notes=' '.join(note), tenure=True, minutes=v.get('minutes') or v.get('url'))
    if d[6]: a['reps'] = [x.strip() for x in d[6].split(';') if x.strip()]
    if d[5]: a['address'] = d[5]
    acts.append(a); tr[k] = {'en': en, 'es': es, 'ht': ht}
acts.sort(key=lambda a: (a['date'], a['id']))
yrs = sorted({k.split('-')[1] for k in dec if len(k.split('-')) > 1})
mem = sorted({m for a in acts for m in (a['roll'] or {})})
meet = sorted({(v['date'], v.get('meeting') or '', v.get('minutes') or v.get('url') or '') for v in V})
out = dict(city=city, body=body, window={'from': wfrom, 'to': max([a['date'] for a in acts] or [wfrom])}, sources=[srclabel], members=mem,
           meetings=[dict(date=d, name=n, url=u, read=True) for d, n, u in meet], actions=acts,
           gaps=[f'{y}: {unnamed[y]} qualifying-kind items name no beneficiary (left out)' for y in sorted(unnamed)])
json.dump(out, open(os.path.join(outdir, 'actions.json'), 'w'), ensure_ascii=False, indent=1)
json.dump({k: {'es': v['es'], 'ht': v['ht']} for k, v in tr.items()}, open(os.path.join(outdir, 'translations.json'), 'w'), ensure_ascii=False, indent=1)
json.dump({k: v['en'] for k, v in tr.items()}, open(os.path.join(outdir, 'titles-en.json'), 'w'), ensure_ascii=False, indent=1)
und = [v['key'] for v in V if is_candidate(v['title'])[0] and v['key'] not in dec]
print(prefix, 'actions', len(acts), 'skipped', dict(skipped), 'unnamed', sum(unnamed.values()), 'missing', missing[:8], 'need PA', needpa, 'undecided', len(und), und[:10])
