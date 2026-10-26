# Builds ../../hialeah-groupv/actions.json: Luis Gonzalez, Hialeah City Council Group V (Nov 2005 - Nov 2017).
# Source: the City Clerk's signed resolutions (2007-2017) and ordinances (2008-2017) in the city Document Center; each carries
# the clerk's vote line ("adopted by a 6-0-1 vote with Councilmembers ... voting Yes; ... absent").
# cache/docs.json = one row per signed document (scratchpad tools/hlparse.py + hlroll2.py + hldates.py + hlland.py):
#   num, kind (R/O), url, title, vote (clerk's line as OCR'd), roll, rollstatus, date, dateHow, land (auto land-use row), ents, addr
# decisions-*.txt = hand-read non-land-use items (num|kind|parties|short title|note); roll-overrides.txt = hand-read rolls
# where the OCR'd vote line did not parse (num|Key=vote,Key=vote...); owners-lookup.json = Property Appraiser owner by address.
import json, os, sys, re, glob
SP = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(SP, '..', '..', 'hialeah-groupv')
sys.path.insert(0, os.path.join(SP, '..', '..', 'lib')); from common import *
D = {x['num']: x for x in json.load(open(SP + '/cache/docs.json'))}
OWN = json.load(open(SP + '/owners-lookup.json')) if os.path.exists(SP + '/owners-lookup.json') else {}
OV = {}
if os.path.exists(SP + '/roll-overrides.txt'):
    for l in open(SP + '/roll-overrides.txt'):
        if l.startswith('#') or '|' not in l: continue
        n, r = l.rstrip('\n').split('|', 1)
        OV[n.strip()] = {k: v for k, v in (x.split('=') for x in r.split(',') if '=' in x)}
LAST = {'R': '2017-087', 'O': '2017-070'}   # last items with Gonzalez in the vote line before Zogby took Group V
MEM = {'Gonzalez': ('Luis Gonzalez', 'luis-gonzalez'), 'Caragol': ('Jose F. Caragol', None), 'CasalsMunoz': ('Vivian Casals-Munoz', None),
       'CueFuente': ('Katharine Cue-Fuente', None), 'GarciaMartinez': ('Isis Garcia-Martinez', None), 'Hernandez': ('Paul B. Hernandez', None),
       'Lozano': ('Lourdes Lozano', None)}
dec = {}
for f in sorted(glob.glob(SP + '/decisions-*.txt')):
    for d in read_decisions(f): dec[d['key']] = d
acts, unnamed = [], []
def within(num, kind):
    y = num[:4]
    return y < '2017' or num[:8] <= '2017-' + LAST[kind][5:] if y == '2017' else y < '2017'
for key, x in sorted(D.items()):
    k = key[0]; num = key[1:]
    if num[:4] == '2017' and num[5:] > LAST[k][5:]: continue
    d = dec.get(key)
    land = x.get('land') and not (d and d['kind'] == 'skip')
    if d and d['kind'] == 'skip': continue
    if not d and not land: continue
    if d:
        kind, parties, title, note = d['kind'], d['parties'], d['title'], d['note']
    else:
        ents = x.get('ents') or []; addr = (x.get('addr') or [None])[0]
        if not ents and not addr:
            unnamed.append({'num': key, 'title': x['title'][:200], 'why': 'land-use item with no named party or address in the document'}); continue
        kind = 'zoning'
        parties = ';'.join(ents + (['@' + addr] if addr and not ents else []))
        title = x.get('short') or re.sub(r'^.*?(?=REZON|GRANTING|APPROVING THE FINAL|APPROVING A FINAL|AMENDING THE FUTURE|VACATING|ACCEPTING|REPEALING|OVERRIDING)', '', x['title'], count=1)[:160].capitalize()
        note = ''
    roll = OV.get(key) or dict(x.get('roll') or {})
    notes = ['Vote from the City Clerk\'s vote line on the signed %s' % ('resolution' if k == 'R' else 'ordinance')]
    if key in OV: notes.append('Vote line read by hand from the scan')
    if not roll:
        roll = {m: 'unknown' for m in MEM if m in ('Gonzalez', 'Caragol', 'CasalsMunoz', 'CueFuente', 'GarciaMartinez', 'Hernandez', 'Lozano')}
        notes = ['Vote not given on the document (vote line missing or unreadable)']
    if x.get('dateHow') and x['dateHow'] != 'read':
        notes.append('Adoption date: %s (read from the signature block where legible, otherwise the regular meeting between neighbouring numbers)' % x['dateHow'])
    if note: notes.append(note)
    pl = []
    for p in parties.split(';'):
        p = p.strip()
        if not p: continue
        if p.startswith('@'):
            o = OWN.get(p[1:])
            if o and o.get('owner'):
                pl.append(o['owner']); notes.append('Owner of %s per the Property Appraiser (folio %s): %s' % (p[1:], o.get('folio'), o.get('note') or ''))
            else:
                pl.append('Owner of ' + p[1:])
        else: pl.append(p)
    acts.append({'id': 'hialeah-%s-%s' % ('res' if k == 'R' else 'ord', num), 'date': x.get('date'), 'ref': ('Resolution ' if k == 'R' else 'Ordinance ') + num,
                 'title': title, 'kind': KIND.get(kind, kind), 'parties': pl, 'amount': amount_of(x['title']), 'roll': roll, 'tally': tally(roll),
                 'mover': None, 'second': None, 'result': 'adopted', 'notes': '; '.join(notes), 'url': x['url'], 'prior': True})
acts.sort(key=lambda a: (a['date'] or '', a['ref']))
doc = {'city': 'Hialeah', 'body': 'Hialeah City Council', 'person': 'luis-gonzalez', 'office': 'Council Member, Group V',
       'window': {'from': '2005-11-15', 'to': '2017-11-14', 'covered': 'documents from 2007-01 (resolutions) and 2008-01 (ordinances)'},
       'members': {k: v[0] for k, v in MEM.items()}, 'actions': acts, 'unnamed': unnamed,
       'sources': [{'name': 'City of Hialeah Document Center, City Clerk: Resolutions 2007-2017, Ordinances 2007-2017', 'url': 'https://www.hialeahfl.gov/DocumentCenter'}]}
write_json(OUT + '/actions.json', doc)
print(len(acts), 'actions;', len(unnamed), 'unnamed;', sum(1 for a in acts if a['roll'].get('Gonzalez') in ('yes', 'no')), 'with Gonzalez yes/no')
