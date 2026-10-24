#!/usr/bin/env python3
"""Merge laws-list.json + benefits.jsonl + actions.jsonl + member-votes.jsonl
(+ existing ../floor-votes.json member data, + moody-requests.json) into universe.json.
Rerunnable: later lines in a .jsonl override earlier ones for the same key."""
import json, os
D = os.path.dirname(os.path.abspath(__file__))
P = lambda f: os.path.join(D, f)

def jl(f):
    out = []
    if os.path.exists(P(f)):
        for line in open(P(f)):
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out

laws = json.load(open(P('laws-list.json')))
ben = {x['pl']: x for x in jl('benefits.jsonl')}
act = {x['pl']: x for x in jl('actions.jsonl')}
mv = {}
for x in jl('member-votes.jsonl'):
    mv[(x['chamber'], x['year'], x['roll'])] = x['members']

# reuse member votes already verified in floor-votes.json
fv = json.load(open(os.path.join(D, '..', 'floor-votes.json')))
NV = {'nv': 'not voting'}
for b in fv['bills']:
    for v in b['votes']:
        yr = int(v['date'][:4])
        mv.setdefault((v['chamber'], yr, v['roll']),
                      {k: NV.get(s, s) for k, s in v['members'].items()})
        pl = b['law'].replace('P.L. ', '')
        a = act.setdefault(pl, {'pl': pl})
        a.setdefault(v['chamber'], {'date': v['date'], 'roll': v['roll'], 'tally': v['tally']})

HOUSE = ['Diaz-Balart', 'Salazar', 'Gimenez', 'Moskowitz', 'Donalds']
MOODY_SEATED = '2025-01-21'

def vote_block(ch, a):
    if not a:
        return None
    o = {'date': a.get('date')}
    if a.get('voice') or a.get('uc'):
        o['method'] = 'voice vote' if a.get('voice') else 'unanimous consent'
        o['roll'] = None
        o['members'] = None
        return o
    roll, yr = a['roll'], int(a['date'][:4])
    o['roll'] = str(roll)
    o['tally'] = a.get('tally')
    if ch == 'house':
        o['url'] = f'https://clerk.house.gov/evs/{yr}/roll{roll:03d}.xml'
    else:
        sess = 1 if yr == 2025 else 2
        o['url'] = (f'https://www.senate.gov/legislative/LIS/roll_call_votes/vote119{sess}/'
                    f'vote_119_{sess}_{roll:05d}.xml')
    m = mv.get((ch, yr, roll))
    if ch == 'senate' and a['date'] < MOODY_SEATED:
        m = {'Moody': 'not seated'}
    o['members'] = m  # None = not yet fetched
    return o

out = []
for l in laws:
    b = ben.get(l['pl'], {})
    rec = {k: l[k] for k in ('pl', 'bill', 'title', 'date', 'url')}
    rec['analysisUrl'] = b.get('analysisUrl') or (
        f"https://www.congress.gov/bill/119th-congress/{l['url'].split('/119th-congress/')[1]}"
        + ('/summary' if b.get('src') in ('crs',) else ''))
    rec['analysisSource'] = b.get('src')
    rec['benefits'] = b.get('benefits')
    for k in ('why', 'flag', 'affected', 'note'):
        if b.get(k):
            rec[k] = b[k]
    if rec['benefits']:
        a = act.get(l['pl'], {})
        rec['votes'] = {'house': vote_block('house', a.get('house')),
                        'senate': vote_block('senate', a.get('senate'))}
    out.append(rec)

moody = json.load(open(P('moody-requests.json'))) if os.path.exists(P('moody-requests.json')) else []

# per-member counts over qualifying laws
counts = {n: {'yes': 0, 'no': 0, 'not voting': 0, 'not seated': 0, 'voice/UC': 0, 'missing': 0}
          for n in HOUSE + ['Moody']}
for r in out:
    if not r['benefits']:
        continue
    for ch, names in (('house', HOUSE), ('senate', ['Moody'])):
        v = (r.get('votes') or {}).get(ch)
        for n in names:
            if not v:
                counts[n]['missing'] += 1
            elif v.get('method'):
                counts[n]['voice/UC'] += 1
            elif not v.get('members') or n not in v['members']:
                counts[n]['missing'] += 1
            else:
                s = v['members'][n]
                counts[n][s if s in counts[n] else 'missing'] += 1

universe = {
    'sources': [
        'Public laws list: api.congress.gov/v3/law/119 (Library of Congress), read 2026-10-24',
        'CRS bill summaries: api.congress.gov /summaries and govinfo.gov/bulkdata/BILLSUM/119',
        'CRA overturned rules: federalregister.gov documents (linked per law)',
        'CBO cost estimates: cbo.gov (linked per law where used)',
        'Floor actions: api.congress.gov /actions (recordedVotes)',
        'House roll calls: clerk.house.gov/evs and api.congress.gov/v3/house-vote',
        'Senate roll calls: senate.gov LIS roll_call_votes XML',
        'Prior verified votes: scripts/data/federal/floor-votes.json',
    ],
    'rule': 'Universe = every public law of the 119th Congress (from 2025-01-03) whose CRS summary, CBO estimate, or (for CRA resolutions) the overturned rule names a kind of business that benefits. "affected" lists businesses regulated but not benefited; those are not counted.',
    'counts': {'laws': len(out), 'qualifying': sum(1 for r in out if r['benefits']), 'members': counts},
    'laws': out,
    'moodyRequests': moody,
    'moodyRequestsNote': json.load(open(P('moody-requests-note.json'))) if os.path.exists(P('moody-requests-note.json')) else None,
}
json.dump(universe, open(P('universe.json'), 'w'), indent=1, ensure_ascii=False)
print(json.dumps(universe['counts'], indent=1))
missing = [r['pl'] for r in out if r['benefits'] and (
    not r['votes']['house'] or not r['votes']['senate'] or
    any(v and not v.get('method') and v.get('members') is None for v in r['votes'].values()))]
print('qualifying laws with missing vote data:', missing)
