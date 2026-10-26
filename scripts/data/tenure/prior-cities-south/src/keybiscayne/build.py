# Builds ../../keybiscayne-delacruz/actions.json: Luis F. "Lucho" de la Cruz, Key Biscayne Village Council (Nov 2014 - Nov 2018).
# Source: Village Clerk minutes on Granicus (keybiscayne.granicus.com MinutesViewer, view_id=1), scanned PDFs OCR'd
# (scratchpad tools/kbget.sh, tools/kbparse.py, tools/kbitems.py). The minutes print each resolution/ordinance title and
# "The vote was as follows: Councilmembers ... voting Yes. Councilmember ... voting No." Consent items carry the consent vote.
# cache/items.json = every titled item with the parsed roll; decisions.txt = items naming a private party.
import json, os, sys, re
SP = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(SP, '..', '..', 'keybiscayne-delacruz')
sys.path.insert(0, os.path.join(SP, '..', '..', 'lib')); from common import *
X = json.load(open(SP + '/cache/items.json'))
OWN = json.load(open(SP + '/owners-lookup.json')) if os.path.exists(SP + '/owners-lookup.json') else {}
KEY = {'de la Cruz': 'DeLaCruz', 'Gross': 'Gross', 'McCormick': 'McCormick', 'Moss': 'Moss', 'Petros': 'Petros', 'Caplan': 'Caplan',
       'Lindsay': 'Lindsay', 'Holloway': 'Holloway', 'Kelly': 'Kelly', 'London': 'London', 'Taintor': 'Taintor'}
NAMES = {'DeLaCruz': 'Luis F. de la Cruz', 'Gross': 'Gary R. Gross', 'McCormick': 'Allison McCormick', 'Moss': 'Brett G. Moss',
         'Petros': 'Kathleen Petros', 'Caplan': 'Franklin H. Caplan', 'Lindsay': 'Mayra Pena Lindsay (Mayor)', 'Holloway': 'Theodore Holloway',
         'Kelly': 'Michael Kelly', 'London': 'Edward London', 'Taintor': 'James S. Taintor'}
acts, skipped = [], []
for d in read_decisions(SP + '/decisions.txt'):
    i = int(d['key']); x = X[i]
    roll = {KEY.get(k, k): v for k, v in (x['roll'] or {}).items()}
    notes = ['Vote from the Village Clerk\'s minutes (OCR of the scanned minutes)']
    if x['status'] == 'names-differ-from-tally':
        notes.append('Roll as listed by name in the minutes; the tally the clerk printed does not match the names listed')
    if x['status'] == 'tally-roster':
        notes.append('Minutes give a unanimous tally; members present per the roll call at the start of the meeting')
    if not roll or x['status'] == 'none':
        roll = {KEY.get(k, k): 'unknown' for k in (x['members'] or ['de la Cruz'])}
        notes = ['Vote not given in the minutes (the vote line could not be read from the scan)']
    for k in x.get('absent') or []: roll.setdefault(KEY.get(k, k), 'absent')
    if 'CONSENT' in (x['section'] or '').upper(): notes.append('Consent agenda item; roll is the consent agenda vote')
    pl = []
    for p in d['parties'].split(';'):
        p = p.strip()
        if not p: continue
        if p.startswith('@'):
            o = OWN.get(p[1:])
            if o and o.get('owner'): pl.append(o['owner']); notes.append('Owner of %s per the Property Appraiser (folio %s): %s' % (p[1:], o.get('folio'), o.get('note') or ''))
            else: pl.append('Owner of ' + p[1:])
        else: pl.append(p)
    acts.append({'id': 'keybiscayne-%s-%d' % (x['date'], i), 'date': x['date'], 'ref': x['section'].title() if x['section'] else '', 'title': d['title'],
                 'fullTitle': x['title'][:600], 'kind': KIND.get(d['kind'], d['kind']), 'parties': pl, 'amount': amount_of(x['title']),
                 'roll': roll, 'tally': tally(roll), 'mover': None, 'second': None, 'result': 'failed' if x.get('failed') else 'adopted',
                 'consent': 'CONSENT' in (x['section'] or '').upper(), 'notes': '; '.join(notes), 'url': x['url'], 'prior': True})
acts.sort(key=lambda a: (a['date'], a['id']))
doc = {'city': 'Key Biscayne', 'body': 'Key Biscayne Village Council', 'person': 'luis-f-de-la-cruz', 'office': 'Village Council Member',
       'window': {'from': '2014-11-18', 'to': '2018-10-30', 'note': 'first and last council meetings in the minutes for his term (elected Nov 4, 2014; left after losing the Nov 6, 2018 mayoral race)'}, 'members': NAMES, 'actions': acts,
       'sources': [{'name': 'Village of Key Biscayne, Village Clerk minutes (Granicus)', 'url': 'https://keybiscayne.granicus.com/ViewPublisher.php?view_id=1'}],
       'gaps': [{'issue': 'Items are taken from the resolution and ordinance titles printed in the minutes; a purchase whose title does not name the vendor is not listed.'},
                {'issue': 'Movers and seconders are in the minutes but were not extracted.'}]}
write_json(OUT + '/actions.json', doc)
print(len(acts), 'actions;', sum(1 for a in acts if a['roll'].get('DeLaCruz') in ('yes', 'no')), 'with de la Cruz yes/no')
