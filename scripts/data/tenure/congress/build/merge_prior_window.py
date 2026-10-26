"""Adds to Diaz-Balart's 108-116 universe the 39 laws (Mar 11, 2014 - Jan 3, 2017) that the prior-congress slice's
full read found qualifying beyond this slice's rule screen, and fixes P.L. 114-255 (21st Century Cures: final House
vote is roll 592 of 2016, not the 2015 voice vote). His vote on each roll is read from clerk.house.gov.
Run from scripts/data/tenure: python3 -I congress/build/merge_prior_window.py"""
import json, re, subprocess, time
UF = 'congress/laws/universe-108-116.json'; FF = 'congress/floor-votes-tenure.json'
u = json.load(open(UF)); U = {x['pl']: x for x in u['laws']}
p = {x['pl']: x for x in json.load(open('prior-congress/laws/universe.json'))['laws']}
pf = json.load(open('prior-congress/floor-votes.json')); ff = json.load(open(FF))
OTHERS = ['Salazar', 'Gimenez', 'Moskowitz', 'Donalds']
V = {'Aye': 'yes', 'Yea': 'yes', 'No': 'no', 'Nay': 'no', 'Not Voting': 'not voting', 'Present': 'present'}
def dbvote(year, roll):
    x = subprocess.run(['curl', '-s', f'https://clerk.house.gov/evs/{year}/roll{int(roll):03d}.xml'], capture_output=True, text=True).stdout
    m = re.search(r'name-id="D000600"[^>]*>[^<]*</legislator>\s*<vote>([^<]+)</vote>', x)
    if not m: raise SystemExit(f'no D000600 vote in {year} roll {roll}')
    time.sleep(1); return V[m.group(1).strip()]
todo = [pl for pl, x in p.items() if x.get('benefits') and not U[pl].get('benefits')] + ['114-255']
cards = {c['law']: c for c in pf['bills']}
have = {c['law'] for c in ff['bills']}
added = 0
for pl in todo:
    src, dst = p[pl], U[pl]
    dst['benefits'] = src['benefits']; dst.pop('why', None)
    dst.setdefault('votes', {'house': {}, 'senate': {'members': {'Moody': 'not seated'}}})
    h = src['votes']['house']
    card = cards.get('P.L. ' + pl)
    if card:
        v = card['votes'][0]; d = dbvote(v.get('rollYear') or v['date'][:4], v['roll'])
        dst['votes']['house'] = {'date': v['date'], 'roll': str(v['roll']), 'tally': v['tally'],
            'url': f"https://clerk.house.gov/evs/{v['date'][:4]}/roll{int(v['roll']):03d}.xml",
            'members': {'Diaz-Balart': d, **{o: 'not seated' for o in OTHERS}}}
        if src['votes']['house'].get('note'): dst['votes']['house']['note'] = src['votes']['house']['note']
        if card['law'] not in have:
            c = json.loads(json.dumps(card))
            for vv in c['votes']: vv.pop('rollYear', None); vv['members'] = {'Diaz-Balart': d}
            ff['bills'].append(c); added += 1
            if c['class'] not in ff['classes']: ff['classes'][c['class']] = pf['classes'][c['class']]
    else:
        dst['votes']['house'] = {k: h[k] for k in h if k != 'members'}; dst['votes']['house']['members'] = None
# Cures card: replace the vote if this slice already had one
for c in ff['bills']:
    if c['law'] == 'P.L. 114-255' and c['votes'][0].get('roll') != 592:
        c['votes'] = [dict(json.loads(json.dumps(cards['P.L. 114-255']['votes'][0])), members={'Diaz-Balart': U['114-255']['votes']['house']['members']['Diaz-Balart']})]
        c['votes'][0].pop('rollYear', None)
u['counts']['qualifying'] = sum(1 for x in u['laws'] if x.get('benefits'))
json.dump(u, open(UF, 'w'), ensure_ascii=False, indent=1)
json.dump(ff, open(FF, 'w'), ensure_ascii=False, indent=1)
print('laws updated', len(todo), 'cards added', added, 'qualifying', u['counts']['qualifying'])
