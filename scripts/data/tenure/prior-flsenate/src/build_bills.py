"""Writes ../bills-<year>.json (2013 .. 2020) in the shape of ../../prior-flhouse/bills-<year>.json, with Senate floor votes:
votes.senate {date, motion, tally, url, roll:{Taddeo, Simpson, JJRodriguez, Campbell, Avila}}.
Screening is not redone here: each law's screen comes from ../../prior-flhouse/bills-<year>.json where that slice has screened it,
else from this slice's bills/stageB.jsonl (2020). Senate vote = the last Senate floor vote on the bill page that is not an
amendment vote (final passage), read from the official vote sheet (bills/rolls.jsonl, sheet text in raw/votes/).
A member is "not seated" when the vote date is outside their Senate term (offices.json). 'Rodriguez' on a sheet is
Jose Javier Rodriguez (JJRodriguez) only before 2020-11-03.
Run: python3 -I src/build_bills.py"""
import json, os, sys
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); T = os.path.dirname(H)
jl = lambda f: [json.loads(l) for l in open(f) if l.strip()] if os.path.exists(f) else []
iso = lambda d: (lambda m, dd, y: f'{y}-{int(m):02d}-{int(dd):02d}')(*d.split('/')) if d and '/' in d else d
TERMS = {'Taddeo': ('40', [('2017-09-26', '2022-11-08')]), 'Simpson': ('18 / 10', [('2012-11-06', '2022-11-08')]),
         'JJRodriguez': ('37', [('2016-11-08', '2020-11-03')]), 'Campbell': ('38', [('2016-11-08', '2018-11-06')]),
         'Avila': ('39', [('2022-11-08', '2026-08-25')])}
SHEET = {'Taddeo': 'Taddeo', 'Simpson': 'Simpson', 'JJRodriguez': 'Rodriguez', 'Campbell': 'Campbell', 'Avila': 'Avila'}
src = open(os.path.join(H, 'src/vote_jobs.py')).read()
ns = {'__file__': os.path.join(H, 'src/vote_jobs.py')}
exec(src.split('# 1. 2025-2026')[0], ns)  # imports, jl, last_s, qualifying_2013_2020
Q = {q['ch']: q for q in ns['qualifying_2013_2020']()}
A = {x['ch']: x for x in jl(os.path.join(T, 'prior-flhouse/bills/stageA.jsonl'))}
for x in jl(os.path.join(H, 'bills/stageA.jsonl')): A.setdefault(x['ch'], x)
R = {r['u']: r for r in jl(os.path.join(H, 'bills/rolls.jsonl'))}
mine = {x['ch']: x for x in jl(os.path.join(H, 'bills/stageB.jsonl'))}
def seated(m, d): return any(a <= d <= b for a, b in TERMS[m][1])
for y in range(2013, 2021):
    F = json.load(open(os.path.join(T, 'prior-flhouse', f'bills-{y}.json')))
    out, missing = [], {'A': [], 'B': [], 'C': []}
    for b in F['bills']:
        ch = b['chapter']; rec = {k: b.get(k) for k in ('bill', 'session', 'chapter', 'title', 'url', 'analysisUrl', 'benefits', 'screen', 'note')}
        screened = b.get('screen') is not None or b.get('benefits') or b.get('analysisUrl')
        if not screened and ch in mine:
            m = mine[ch]; rec.update(analysisUrl=m['au'], screen=m['ps'], note=m.get('note'), screenedBy='prior-flsenate (bills/stageB.jsonl)',
                                     benefits={'category': m.get('cat'), 'named': m.get('named') or [], 'quote': m.get('q')} if m.get('b') else None)
            screened = True
        elif screened: rec['screenedBy'] = 'prior-flhouse (bills-%d.json)' % y
        if not screened: missing['B'].append(ch)
        if ch in Q:
            v = ns['last_s'](A.get(ch, {}).get('fv', []))
            if not v: missing['A'].append(ch)
            else:
                r = R.get(v['u'])
                if not r: missing['C'].append([ch, 'S', v['u']])
                else:
                    d = iso(r.get('d') or v['d'])
                    roll = {}
                    for mk, sk in SHEET.items():
                        roll[mk] = r['r'].get(sk, 'not seated') if seated(mk, d) else 'not seated'
                        if seated(mk, d) and roll[mk] == 'not seated': roll[mk] = 'not on the sheet'
                    rec['votes'] = {'senate': {'date': d, 'motion': r.get('a') or 'final passage', 'tally': r.get('t') or [v.get('y'), v.get('n')], 'url': v['u'], 'roll': roll}}
        out.append(rec)
    members = {m: {'district': TERMS[m][0], 'start': TERMS[m][1][0][0], 'end': TERMS[m][1][-1][1]} for m in ('Taddeo', 'Simpson', 'JJRodriguez', 'Campbell')
               if any(a[:4] <= str(y) <= b[:4] for a, b in TERMS[m][1])}
    J = {'generated': 'scripts/data/tenure/prior-flsenate/src/build_bills.py', 'extends': 'scripts/data/state/bills/universe.json',
         'rule': f"Every law enacted in sessions {', '.join(sorted({b['session'] for b in out}))} whose final staff analysis names a kind of business or company that benefits (screening from ../prior-flhouse, same test as universe.json). Senate floor final-passage roll calls of the members seated that year ({', '.join(members)}); a member is \"not seated\" on dates outside their Senate term.",
         'members': members,
         'counts': {'enacted': len(out), 'screened': len(out) - len(missing['B']), 'qualifying': sum(1 for b in out if b.get('benefits')),
                    'withSenateVote': sum(1 for b in out if b.get('votes', {}).get('senate'))},
         'missing': missing, 'bills': out}
    json.dump(J, open(os.path.join(H, f'bills-{y}.json'), 'w'), indent=1, ensure_ascii=False)
    print(y, J['counts'], {k: len(v) for k, v in missing.items()})
