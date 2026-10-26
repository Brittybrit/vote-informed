# Builds ../../palmettobay/actions.json: David M. Singer, Palmetto Bay Village Council Seat 2 (first vote Dec 5, 2016; last Oct 26, 2020).
# Universe: every resolution in the clerk's annual Index of Resolutions (cache/index.json, parsed from the index PDFs, which give
# date, caption and each member's vote) adopted while Singer sat, that names a private party (decisions-res.txt, hand-read),
# plus every attorneys'-fees resolution for Lehtinen Schultz Riedi Catalano Fuente, PLLC.
import json, os, sys, re
SP = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(SP, '..', '..', 'palmettobay')
sys.path.insert(0, os.path.join(SP, '..', '..', 'lib')); from common import *
IDX = {x['num']: x for x in json.load(open(SP + '/cache/index.json'))}
for k in list(IDX):
    m = re.match(r'(\d{4})-(\d+)$', k)
    if m: IDX['%s-%02d' % (m.group(1), int(m.group(2)))] = IDX[k]
URL = json.load(open(SP + '/cache/docurls.json'))
START, END = '2016-12-05', '2020-10-26'
MEM = {'Singer': ('David Singer', 'david-m-singer'), 'Flinn': ('Eugene Flinn', None), 'DuBois': ('John DuBois', None),
       'Cunningham': ('Karyn Cunningham', None), 'SiegelLara': ('Larissa Siegel Lara', None), 'Fiore': ('Patrick Fiore', None),
       'Matson': ('Marsha Matson', None), 'Schaffer': ('Tim Schaffer', None)}
rows = read_decisions(SP + '/decisions-res.txt')
want = {}
for r in rows:
    if r['key'] == 'LEHTINEN': continue
    want[r['key']] = r
for num, x in IDX.items():
    if not re.match(r'\d{4}-\d\d', num) or num in want: continue
    if re.search(r"ATTORNEY.?S.? FEES.*LEHTINEN", x['caption'], re.I):
        amt = re.search(r'\$([\d,]+(?:\.\d\d)?)', x['caption']); per = re.search(r'PERIOD ENDING ([A-Z]+ \d+, \d{4})', x['caption'])
        want[num] = dict(key=num, kind='contract', parties='Lehtinen Schultz Riedi Catalano Fuente, PLLC',
                         title='Attorneys\' fees and costs for Lehtinen Schultz (village attorney)' + (', $' + amt.group(1) if amt else '') + (' for period ending ' + per.group(1).title() if per else ''), note='')
acts = []; missing = []
for num, r in sorted(want.items()):
    x = IDX.get(num)
    if not x: missing.append(num); continue
    if not (START <= x['date'] <= END): continue
    roll = dict(x['roll'] or {})
    notes = ['Vote from the clerk\'s Index of Resolutions']
    if not roll:
        roll = {k: 'unknown' for k in ('Singer', 'Flinn', 'DuBois', 'Cunningham', 'SiegelLara')}; notes = ['Vote not given in the clerk\'s index']
    if r['note']: notes.append(r['note'])
    y = num[:4]
    acts.append({'id': 'palmettobay-res-%s' % num, 'date': x['date'], 'ref': 'Resolution %s' % num, 'title': r['title'],
                 'kind': KIND[r['kind']], 'parties': parties_of(r['parties']), 'amount': amount_of(x['caption']),
                 'roll': roll, 'tally': tally(roll), 'mover': None, 'second': None, 'result': 'adopted',
                 'notes': '; '.join(notes), 'url': URL.get(num) or URL.get('INDEX-' + y), 'caption': x['caption'][:600], 'prior': True})
acts.sort(key=lambda a: (a['date'], a['ref']))
doc = {'city': 'Palmetto Bay', 'body': 'Palmetto Bay Village Council', 'person': 'david-m-singer', 'office': 'Council Member, Seat 2',
       'window': {'from': START, 'to': END},
       'members': {k: v[0] for k, v in MEM.items()},
       'sources': [{'name': 'Village of Palmetto Bay Index of Resolutions 2016-2020 (Document Center, Village Clerk/Resolutions)', 'url': 'https://www.palmettobay-fl.gov/DocumentCenter'},
                   {'name': 'Signed resolutions 2017-2020 (Document Center)', 'url': 'https://www.palmettobay-fl.gov/DocumentCenter'}],
       'actions': acts,
       'gaps': [{'issue': 'Ordinances are not in the resolution index; ordinances naming a private party come from the minutes (see ordinances in this file when added).'},
                {'issue': 'Campaign reports for Singer (2016 race) are not posted online by the village; no donor data.'}]}
write_json(OUT + '/actions.json', doc)
write_json(OUT + '/body.json', {'members': [{'key': k, 'name': v[0], 'person': v[1]} if v[1] else {'key': k, 'name': v[0], 'former': True} for k, v in MEM.items()],
                                'since': START, 'tenure': {'Singer': {'start': '2016-11-08', 'firstVote': START, 'end': END, 'giftsFrom': '2014-11-01'}}})
print(len(acts), 'actions; missing from index:', missing, '; Singer yes/no:', sum(1 for a in acts if a['roll'].get('Singer') in ('yes', 'no')))
