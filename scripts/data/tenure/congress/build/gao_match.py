import csv, json, re, collections
D = '/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/raw/cpf/gao/'
G = []
def load(f, fycol):
    rows = list(csv.reader(open(D + f, encoding='utf-8-sig', errors='replace')))
    hi = next(i for i, r in enumerate(rows) if 'Agency' in r and any('Requ' in c for c in r))
    h = [c.strip() for c in rows[hi]]
    for r in rows[hi + 1:]:
        if len(r) < len(h): continue
        x = dict(zip(h, r))
        req = x.get('Requesting Member Information') or x.get('Requestor Information') or ''
        fy = x.get('Fiscal Year of Appropriation') or '2024'
        amt = x.get('Amount') or ''
        try: amt = int(float(amt.replace(',', '').strip()))
        except: continue
        G.append({'fy': 'FY' + fy.strip(), 'agency': x['Agency'], 'sub': x.get('Appropriations Subcommittee of Jurisdiction'), 'project': x['Project/Recipient'].strip(), 'amount': amt, 'req': req, 'account': x.get('Account')})
load('2022-2023 Tracking the Funds data.csv', 'Fiscal Year of Appropriation')
load('2024 Tracking the Funds data.csv', None)
NM = {'Diaz-Balart': 'Representative Mario Diaz-Balart', 'Salazar': 'Representative Maria Salazar', 'Gimenez': 'Representative Carlos Gimenez', 'Donalds': 'Representative Byron Donalds', 'Moskowitz': 'Representative Jared Moskowitz'}
mine = [g for g in G if any(v in g['req'] for v in NM.values())]
print(len(G), 'gao rows;', len(mine), 'with our members', collections.Counter(g['fy'] for g in mine))
STOP = set('the of and for a an to in at project projects county city fl florida miami dade department improvements improvement inc phase'.split())
tok = lambda s: {w for w in re.findall(r'[a-z0-9]+', (s or '').lower()) if w not in STOP and len(w) > 2}
reqs = json.load(open('requests-raw.json'))
used = set()
for r in reqs:
    r['funded'] = None
    if r['fy'] == 'FY2025': r['funded'] = 0; continue
    cand = [(i, g) for i, g in enumerate(mine) if g['fy'] == r['fy'] and NM[r['member']] in g['req']]
    a = tok(r['project']) | tok(r['recipient'])
    best = None
    for i, g in cand:
        b = tok(g['project'])
        sc = len(a & b) / max(1, min(len(a), len(b)))
        if best is None or sc > best[0]: best = (sc, i, g)
    if best and best[0] >= 0.5:
        r['funded'] = best[2]['amount']; r['gaoProject'] = best[2]['project']; r['gaoScore'] = round(best[0], 2); r['gaoShared'] = [m for m in NM if NM[m] in best[2]['req'] and m != r['member']]
        used.add(best[1])
    else:
        r['funded'] = 0
json.dump(reqs, open('requests-matched.json', 'w'), indent=1)
for r in reqs:
    if r['fy'] != 'FY2025': print(r['member'], r['fy'], '|', r['project'][:55], '|', r['amount'], '->', r['funded'], '|', (r.get('gaoProject') or '')[:60], r.get('gaoScore'))
print('UNUSED GAO rows:')
for i, g in enumerate(mine):
    if i not in used: print('  ', g['fy'], g['req'][:60], '|', g['project'][:80], g['amount'])
