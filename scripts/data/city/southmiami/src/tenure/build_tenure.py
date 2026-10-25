# Extends scripts/data/city/southmiami/actions.json back to 2022-11-08, when Mayor Javier Fernandez and
# Commissioners Lisa Bonich and Steve Calle were elected (first regular meeting seated: 2022-11-15).
# Granicus has no posted minutes or after-action summaries for most 2022-2024 meetings, so the record used
# here is the clerk's minutes as attached for approval to the NEXT meeting's agenda packet (cloudfront PDF
# linked from the Granicus archive). Pipeline (all in this folder):
#   cache/packets.tsv     meeting date, clip id, agenda-packet PDF url (packets downloaded and run through
#                         pdftotext -layout; split_minutes.py cuts each packet into its minutes documents)
#   parse_minutes.py      parses each minutes document into items with mover, second and Yea/Nay roll
#   cache/items.json      parsed items (index = idx below)
#   decisions.txt         hand-read list of qualifying items: idx|kind|parties|title[|note]
# Rerun is idempotent: actions and meetings with "tenure": true are rebuilt each time.
import json, os, re
SP = os.path.dirname(os.path.abspath(__file__))
CITY = os.path.dirname(os.path.dirname(SP))
I = json.load(open(SP + '/cache/items.json'))
PK = {}
for line in open(SP + '/cache/packets.tsv'):
    d, c, u = line.rstrip('\n').split('\t')
    PK[c] = (d, u)
KIND = {'c': 'contract', 'z': 'zoning', 'a': 'agreement', 'o': 'other', 'l': 'lease', 'g': 'grant', 's': 'sale',
        'p': 'license', 'e': 'easement', 't': 'settlement'}
U = json.load(open(CITY + '/actions.json'))
keep = [a for a in U['actions'] if not a.get('tenure')]
have = {a['id'] for a in keep}
new, unnamed = [], []
for line in open(SP + '/decisions.txt'):
    line = line.rstrip('\n')
    if not line.strip() or line.startswith('#'):
        continue
    p = line.split('|')
    idx, k, parties, title = int(p[0]), p[1], p[2], p[3]
    note = p[4] if len(p) > 4 else ''
    it = I[idx]
    # the deciding vote: the last approve/adopt motion on the item (earlier motions amend or add items)
    vs = [v for v in it['votes'] if re.match(r'\s*approve', v['motion'], re.I)] or it['votes']
    v = vs[-1]
    roll = dict(v['roll'])
    # seated members the vote lines do not name: absent if the opening roll call did not list them, else unknown
    seated = ['Fernandez', 'Bonich', 'Calle', 'Corey'] + (['Liebman'] if it['date'] < '2024-11-18' else ['Rodriguez'])
    for mbr in seated:
        if mbr not in roll:
            roll[mbr] = 'absent' if it['present'] and mbr not in it['present'] else 'unknown'
    pl = []
    for x in parties.split(';'):
        x = x.strip()
        if x and x != '-':
            pl.append('Owner of ' + x[1:] if x.startswith('@') else x)
    m = re.search(r'(RESOLUTION|ORDINANCE|Resolution|Ordinance) NO\.?\s*([\d-]+)', v['motion'], re.I)
    ref = m.group(2) if m else 'Item %s' % it['num']
    body = re.sub(r'PROVIDING FOR.*$', '', it['title'])
    amts = sorted(set(re.findall(r'\$\s?([\d,]+(?:\.\d\d)?)', body)))
    amount = float(amts[0].replace(',', '')) if len(amts) == 1 else None
    notes = []
    if note: notes.append(note)
    if not v['ok']: notes.append('Printed tally %d-%d differs from the names listed; roll is as listed' % tuple(v['tally']))
    pdate, purl = PK[it['packet']]
    notes.append('Vote from the clerk\'s minutes attached to the %s agenda packet' % pdate)
    n = 1
    aid = 'southmiami-%s-%s' % (it['date'], it['num'])
    while aid in have:
        n += 1; aid = 'southmiami-%s-%s-%d' % (it['date'], it['num'], n)
    have.add(aid)
    a = {'id': aid, 'date': it['date'], 'ref': ref, 'title': title, 'kind': KIND[k], 'parties': pl,
         'amount': amount, 'url': purl, 'roll': roll, 'tally': '%d-%d' % tuple(v['tally']),
         'mover': v['mover'], 'second': v['second'], 'notes': '; '.join(notes), 'tenure': True}
    if not v['passed']: a['result'] = 'failed'
    new.append(a)
    if not pl: unnamed.append(aid)
new.sort(key=lambda a: (a['date'], a['id']))
meet = {}
for it in I:
    pdate, purl = PK[it['packet']]
    meet.setdefault((it['date'], it['meeting']), {'date': it['date'], 'name': it['meeting'].replace(' Minutes', ''),
                    'url': purl, 'read': True, 'tenure': True,
                    'note': 'Minutes read from the %s agenda packet' % pdate})
oldm = [m for m in U['meetings'] if not m.get('tenure')]
U['meetings'] = sorted(list(meet.values()) + oldm, key=lambda m: m['date'])
U['actions'] = new + keep
U['window']['from'] = '2022-11-08'
U['window']['tenureNote'] = ('Window starts 2022-11-08, when Mayor Javier Fernandez and Commissioners Lisa Bonich and '
                             'Steve Calle were elected; first regular meeting 2022-11-15.')
G = [g for g in U['gaps'] if not str(g.get('issue', '') if isinstance(g, dict) else g).startswith('Tenure extension')]
G.append({'issue': 'Tenure extension (2022-11-15 to 2024-12-10): Granicus has no minutes or after-action summaries for '
          'most of these meetings, so votes come from the clerk\'s minutes attached for approval to the next meeting\'s '
          'agenda packet (the packet PDF is the link). Every regular and special City Commission meeting in the window '
          'was read except where noted below. Former Commissioner Josh Liebman (seated through 2024-11) appears in these '
          'rolls under the key Liebman. %d listed actions name no private party.' % len(unnamed)})
G.append({'issue': 'Tenure extension: minutes of the special meetings of 2022-12-20, 2023-01-31 and 2023-03-15 were not found in '
          'any later agenda packet, so those meetings are not covered; budget-hearing minutes were read and hold no '
          'qualifying items; workshops were not counted.'})
G.append({'issue': 'Tenure extension: quasi-judicial land-use items often name only an address; the applicant is given '
          'only when the minutes or a companion item name it.'})
U['gaps'] = G
json.dump(U, open(CITY + '/actions.json', 'w'), indent=1, ensure_ascii=False)
print(len(new), 'tenure actions;', len(keep), 'kept;', len(unnamed), 'unnamed', unnamed)
