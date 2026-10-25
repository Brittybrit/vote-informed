# Extends scripts/data/city/doral/actions.json back to Maureen Porras's first day (seated 2022-12-20;
# first council meeting 2022-12-21). Inputs, all in this folder:
#   cache/items.json   every agenda item of every Council meeting 2022-12-21..2024-12-26 (52 meetings; LPA
#                      and workshops excluded), parsed by parse_minutes.py from the Granicus final minutes
#                      text (MinutesViewer view_id=2), with the roll call the minutes record for that item
#   decisions.txt      hand-read list of qualifying items: idx|kind|parties|short title[|note]
#                      parties ';'-separated; '@<address>' = owner of that address (see ../../owners.json)
# Writes ../../actions.json (pre-2025 actions added before the existing ones; existing entries untouched).
# Rerun is idempotent: actions and meetings with "tenure": true are rebuilt each time.
import json, os, re
SP = os.path.dirname(os.path.abspath(__file__))
CITY = os.path.dirname(os.path.dirname(SP))
I = json.load(open(SP + '/cache/items.json'))
KIND = {'c': 'contract', 'z': 'zoning', 'a': 'agreement', 'o': 'other', 'l': 'lease', 'g': 'grant', 's': 'sale',
        'p': 'license', 'e': 'easement', 't': 'settlement'}
U = json.load(open(CITY + '/actions.json'))
keep = [a for a in U['actions'] if not a.get('tenure')]
have = {a['id'] for a in keep}
new, unnamed, fixes = [], [], []
for line in open(SP + '/decisions.txt'):
    line = line.rstrip('\n')
    if not line.strip() or line.startswith('#'):
        continue
    p = line.split('|')
    idx, k, parties, title = int(p[0]), p[1], p[2], p[3]
    note = p[4] if len(p) > 4 else ''
    it = I[idx]
    pl = []
    for x in parties.split(';'):
        x = x.strip()
        if x and x != '-':
            pl.append('Owner of ' + x[1:] if x.startswith('@') else x)
    roll = dict(it['roll'] or {})
    notes = []
    if idx == 596:   # printed tally contradicts the members named; keep only the votes the minutes name
        roll = {'Fraga': 'no', 'Pineyro': 'no', 'PuigCorve': 'unknown', 'Cabral': 'unknown', 'Porras': 'unknown'}
    # 2023-12-06 (clip 710): the attendance list repeats "Rafael Pineyro" where the Vice Mayor belongs;
    # the same minutes say "All members were present" and Vice Mayor Puig-Corve moved the consent motion.
    if it['clip'] == '710' and 'PuigCorve' not in roll and roll and all(v == 'yes' for v in roll.values()) \
            and 'unanimously' in (it['motion'] or ''):
        roll['PuigCorve'] = 'yes'
        notes.append('Minutes attendance list repeats Pineyro in place of Vice Mayor Puig-Corve; the minutes state all members were present and the vote was unanimous.')
        fixes.append(it['file'])
    y = sum(v == 'yes' for v in roll.values()); n = sum(v == 'no' for v in roll.values())
    m = re.search(r'Ordinance #(\d{4}-\d+)', it['title'])
    ref = it['file'] + (' (Ord. %s)' % m.group(1) if m else '')
    body = it['title'].split(' :: ')[-1]
    amts = sorted(set(re.findall(r'\$\s?([\d,]+(?:\.\d\d)?)', body)))
    amount = float(amts[0].replace(',', '')) if len(amts) == 1 else None
    consent = it['how'] == 'consent'
    if consent: notes.append('Approved on consent agenda; roll is the consent vote')
    fl = it.get('flags') or []
    if 'First Reading' in fl: notes.append('First reading')
    if 'Second Reading' in fl: notes.append('Second reading (final adoption)')
    if note: notes.append(note)
    aid = 'doral-%s-%s' % (it['file'], it['date'])
    if aid in have: aid += '-' + it['item']
    have.add(aid)
    a = {'id': aid, 'date': it['date'], 'ref': ref, 'item': it['item'], 'title': title, 'kind': KIND[k],
         'parties': pl, 'amount': amount, 'url': it['url'], 'roll': roll or None, 'tally': [y, n] if roll and 'unknown' not in roll.values() else None,
         'result': it['result'] if it['result'] in ('adopted', 'failed') else 'adopted', 'consent': consent,
         'mover': it['mover'], 'second': it['second'], 'notes': '; '.join(notes), 'tenure': True}
    new.append(a)
    if not pl: unnamed.append(aid)
new.sort(key=lambda a: (a['date'], a['id']))
mt = {}
for it in I:
    mt.setdefault(it['clip'], {'date': it['date'], 'name': it['meeting'].replace('-', ' ').replace('&quot;', '"').title(),
                               'clip_id': int(it['clip']), 'url': it['url'], 'read': True, 'tenure': True})
oldm = [m for m in U['meetings'] if not m.get('tenure')]
U['meetings'] = sorted(list(mt.values()) + oldm, key=lambda m: (m['date'], m['clip_id']))
U['actions'] = new + keep
U['window']['from'] = '2022-12-20'
U['window']['tenureNote'] = ('Window starts 2022-12-20, when Maureen Porras (and Mayor Fraga and Councilman Pineyro) '
                             'were seated; first Council meeting 2022-12-21.')
if 'PuigCorve' not in U['members']:
    U['formerMembers'] = ['PuigCorve']
G = [g for g in U['gaps'] if not str(g).startswith('Tenure extension')]
G.append('Tenure extension (2022-12-20 to 2024-12-31): every Council, Zoning and Special Council meeting with final minutes '
         'on Granicus (52 meetings, 2022-12-21 to 2024-12-26) was read; Local Planning Agency sessions and workshops were '
         'not counted. Votes come from the minutes text: consent items carry the consent motion vote, other items the '
         'motion recorded for that item, with absences from the minutes. Oscar Puig-Corve (Vice Mayor, seated through '
         '2024-12) appears in these rolls under the key PuigCorve. %d listed actions name no private party.' % len(unnamed))
G.append('Tenure extension: Doral posts only current lobbyist registrations, so no registry links exist for 2022-2024 '
         'items; the minutes name no lobbyist appearing for a party on a listed item.')
G.append('Tenure extension: three motions whose printed tally does not match the members named (for example "4-2" on a '
         'five-member council: 23-5300 budget, 24-5475 ADT/Security 101 negotiation, Ord. 2024-29 boards) carry no parsed roll; '
         'of these only 24-5475 is listed, with the two no votes the minutes name and the other three unknown.')
U['gaps'] = G
json.dump(U, open(CITY + '/actions.json', 'w'), indent=1, ensure_ascii=False)
print(len(new), 'tenure actions;', len(keep), 'kept;', len(unnamed), 'unnamed', unnamed, '; clip 710 fixes', len(fixes))
