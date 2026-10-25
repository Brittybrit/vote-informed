# Build broward/actions.json and body.json (shape of scripts/data/city/<slug>/) for Moskowitz's Broward County
# Commission tenure, Jan 12 - Nov 29, 2022. usage: python3 -I bw_build.py <decided.json> <events.json> <cls.json> <outdir>
import json, re, sys, os, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bw_votes import roll
DEC, EV, CLS, OUT = sys.argv[1:5]
D = json.load(open(DEC)); E = {e['EventId']: e for e in json.load(open(EV))}; C = json.load(open(CLS))
ALL = ['Alston', 'Bogen', 'Fisher', 'Furr', 'Geller', 'Moskowitz', 'Rich', 'Ryan', 'Udine']
def seated(d): return [m for m in ALL if not (m == 'Alston' and d > '2022-08-25')]
def kind(t):
    t2 = t.lower()
    if 'settlement' in t2: return 'settlement'
    if re.search(r'\beasement|vacate|right-of-way|warranty deed|quit claim deed', t2) and 'lease' not in t2: return 'easement'
    if re.search(r'purchase and sale|conveyance|\bsale of\b|term sheet', t2): return 'sale'
    if re.search(r'\blease\b', t2): return 'lease'
    if re.search(r'franchise|certificate of public convenience|license|permit agreement|change in majority ownership', t2): return 'license'
    if re.search(r'gap financing|grant|funding|line of credit|loan|subordination|incentive|participation in the broward municipal', t2): return 'grant'
    if re.search(r'collective bargaining|bonds?\b|revenue note|indenture', t2): return 'agreement'
    return 'contract'
def amount(t):
    m = re.search(r'\$([\d,]+(?:\.\d+)?)( million)?', t)
    if not m: return None
    v = float(m.group(1).replace(',', '')); v = v * 1e6 if m.group(2) else v
    return int(v) if v == int(v) else v
def title(t):
    t = re.sub(r'^[A-Z]\. ', '', t); t = re.sub(r'^MOTION TO (?:RETROACTIVELY )?', '', t)
    t = re.sub(r'(?i);? ?(?:and )?(?:to )?authoriz(?:e|ing) (?:the )?(?:Mayor|County Administrator|Director|Chief|Office)[^;.]*', '', t)
    t = t[:1] + t[1:].split(' ', 1)[0].lower() + (' ' + t.split(' ', 1)[1] if ' ' in t else '')
    t = t.split(' (Commission District')[0].split(' (Commissioner ')[0]
    return (t[:237] + '…') if len(t) > 240 else t
acts, unnamed = [], []
for x in D:
    ev = E[x['event']]; d = x['date']
    s = seated(d)
    if x['vote']:
        r, tally, flags = roll(x['vote'], s)
        r = {k: ('recused' if v == 'abstained' else v) for k, v in r.items()}
    else:
        r, tally, flags = {m: 'unknown' for m in s}, None, []
    res = 'passed'
    if re.search(r'(?i)\bfailed|denied', x['action'] or ''): res = 'failed'
    reso = re.search(r'Resolution No\. (\d{4}-\d+)', x['action'] or '')
    ref = 'File ' + (x['file'] or '?') + (' item ' + x['item'] + (x['sub'] or '')) + (', Resolution No. ' + reso.group(1) if reso else '')
    rec = {'id': 'BW-' + d + '-' + x['item'].rstrip('.') + (x['sub'] or ''), 'date': d, 'ref': ref, 'title': title(x['text']), 'kind': kind(x['text']),
           'parties': x['parties'], 'amount': amount(x['text']), 'url': x['url'], 'roll': r, 'tally': tally, 'mover': None, 'second': None,
           'consent': 'consent' in (x['type'] or '').lower(), 'result': res,
           'notes': 'Motion text and the clerk\'s ACTION/VOTE lines from the Legistar minutes record: ' + (x['action'] or '')[:300] + (' VOTE: ' + x['vote'] if x['vote'] else ' (no vote line; vote not given in the minutes)'),
           'tenure': True, 'minutes': x['minutes']}
    if x['d'] == 'unnamed': unnamed.append({k: rec[k] for k in ('id', 'date', 'ref', 'title', 'url')}); continue
    if flags: rec['notes'] += ' [vote parse: ' + '; '.join(flags) + ']'
    acts.append(rec)
acts.sort(key=lambda a: (a['date'], a['id']))
meet = sorted({x['date'] for x in C if '2022-01-12' <= x['date'] <= '2022-11-29'})
meetings = [{'date': d, 'name': 'Regular Meeting', 'url': next(e['EventInSiteURL'] for e in E.values() if e['EventDate'][:10] == d and e['EventBodyId'] == 138),
             'minutes': next(e['EventMinutesFile'] for e in E.values() if e['EventDate'][:10] == d and e['EventBodyId'] == 138), 'read': True, 'tenure': True} for d in meet if d != '2022-11-29']
mos = collections.Counter(a['roll'].get('Moskowitz') for a in acts)
out = {'city': 'Broward County', 'body': 'Broward County Board of County Commissioners', 'window': {'from': '2022-01-12', 'to': '2022-11-29'},
       'sources': ['https://webapi.legistar.com/v1/broward/events (County Commission body 138) and /events/{id}/eventitems?MinutesNote=1 (motion text with the clerk\'s ACTION and VOTE lines), read Oct 25, 2026',
                   'https://broward.legistar.com/Calendar.aspx (meeting pages, action agendas)'],
       'members': ALL, 'meetings': meetings, 'actions': acts,
       'gaps': ['Legistar lists only the regular County Commission meetings (Jan 25 - Nov 15, 2022 for this window). Special meetings, budget public hearings (September 2022) and workshops are not in Legistar; their actions are not covered.',
                'Commissioner Moskowitz was appointed Jan 2022 (welcomed at the Jan 25, 2022 meeting); no regular meeting was held between his swearing-in and Jan 25. The Nov 29, 2022 meeting seated the newly elected board (Commissioner McKinzie in District 8), so his last regular meeting was Nov 15, 2022.',
                'Commissioner Alston left the board after Aug 25, 2022 (appointed to the School Board); from Sep 8, 2022 eight members were seated.',
                'Votes are from the clerk\'s VOTE line for each motion: members not named voted yes; named members voted no, abstained (shown as recused), or were not present / out of the room / inaudible (shown as absent).',
                '%d actions benefit a party the motion text does not name (plats, plat note and access-line amendments, land use plan amendments, rezonings, easement vacations without a named petitioner, HFA bond items naming only a project, \'specified service providers\', confidential QTI/job-incentive projects such as Project Swing, Boost and Starfish). They are left out and listed in unnamed.json; owner of record from the Broward County Property Appraiser was not looked up.' % len(unnamed)],
       'counts': {'actions': len(acts), 'unnamedLeftOut': len(unnamed), 'moskowitz': dict(mos)}}
os.makedirs(OUT, exist_ok=True)
json.dump(out, open(OUT + '/actions.json', 'w'), indent=1, ensure_ascii=False)
json.dump({'note': 'Qualifying Broward County Commission actions (Jan 12 - Nov 29, 2022) whose beneficiary the motion text does not name; left out of actions.json and counted.', 'actions': unnamed}, open(OUT + '/unnamed.json', 'w'), indent=1, ensure_ascii=False)
body = {'coverageNote': {'en': 'Broward County Commission actions while Jared Moskowitz served (appointed District 8 commissioner, Jan 12 to Nov 29, 2022), from the regular-meeting minutes in Legistar. Special meetings and budget hearings are not covered. He was appointed, not elected, so he had no county campaign and there are no county campaign donors to match.',
                        'es': 'Acciones de la Comisión del Condado de Broward mientras Jared Moskowitz sirvió (comisionado designado del Distrito 8, del 12 de enero al 29 de noviembre de 2022), según las actas de las reuniones ordinarias en Legistar. No se cubren reuniones especiales ni audiencias de presupuesto. Fue designado, no electo, así que no tuvo campaña para el condado ni donantes de campaña del condado que comparar.',
                        'ht': 'Aksyon Komisyon Konte Broward pandan Jared Moskowitz te sèvi (komisyonè Distri 8 yo te nonmen, 12 janvye rive 29 novanm 2022), dapre pwosè-vèbal reyinyon regilye yo nan Legistar. Reyinyon espesyal ak odyans bidjè pa ladan. Yo te nonmen l, li pa t eli, kidonk li pa t gen kanpay pou konte a ni donatè kanpay konte pou konpare.'},
        'members': [{'key': m, 'name': n, 'person': p, 'former': True} for m, n, p in [('Alston', 'Torey Alston', 'torey-alston'), ('Bogen', 'Mark D. Bogen', 'mark-bogen'), ('Fisher', 'Lamar P. Fisher', 'lamar-fisher'), ('Furr', 'Beam Furr', 'beam-furr'), ('Geller', 'Steve Geller', 'steve-geller'), ('Moskowitz', 'Jared Moskowitz', 'jared-moskowitz'), ('Rich', 'Nan H. Rich', 'nan-rich'), ('Ryan', 'Tim Ryan', 'tim-ryan'), ('Udine', 'Michael Udine', 'michael-udine')]],
        'tenure': {'Moskowitz': {'start': '2022-01-12', 'end': '2022-11-29', 'giftsFrom': None, 'how': 'appointed by the Governor (no county campaign)'}}}
json.dump(body, open(OUT + '/body.json', 'w'), indent=1, ensure_ascii=False)
print(len(acts), 'actions;', len(unnamed), 'unnamed;', dict(mos), collections.Counter(a['kind'] for a in acts))
