# Builds <acct>_2022.csv (VoterFocus export columns, read by scripts/lib/city.mjs donorsFor) from the
# hand transcription of the 2022 treasurer's reports, and <acct>_2026.csv carrying the 2026 rows already
# hand-typed in public/data/city-reports.json (donorsFor reads city-reports.json only for a member with no
# CSV gifts, so once a CSV exists those rows must be in a CSV too).
import json, csv, os, re
SP = os.path.dirname(os.path.abspath(__file__)); CITY = os.path.dirname(os.path.dirname(SP))
REPO = os.path.abspath(os.path.join(CITY, '..', '..', '..', '..'))
H = ['rpt code', 'line number', 'item date', 'Cont/Exp', 'name', 'address 1', 'address 2', 'city', 'state', 'zip',
     'cont. type', 'occupation', 'item type', 'description', 'amount', 'Amend. code', 'lastname']
def human(n, t):
    if t in ('I', 'S') and ',' in n:
        last, first = [x.strip() for x in n.split(',', 1)]
        return (first + ' ' + last).strip(), last
    return n, n
rows = {}
def add(acct, rpt, date, name, t, amt, note):
    if t == 'S': return                      # the candidate's own money or in-kind is not a gift
    nm, last = human(name, t)
    item = 'IK' if 'in-kind' in note else 'CH'
    rows.setdefault(acct + '_2022', []).append([rpt, len(rows.get(acct + '_2022', [])) + 1, date, 'C', nm, '', '', '', 'FL', '',
                                               t, '', item, note, '%.2f' % amt, '', last])
F = json.load(open(SP + '/fernandez_2022_m4m5.json'))
for rpt, docrows in (('M4-22 doc 5632', F['m4']), ('M5-22 doc 5688', F['m5'])):
    for d, n, a in docrows:
        t = 'B' if re.search(r'\b(LLC|Inc|P\.A|PA|Group|Vision|Farms|Law|Strategies|Realty|Productions|PC|Union|Tiger Cope|Excellence|Diamond|Ethics|Integrity|Center)\b', n) and ',' not in n.split(' ')[0] else 'I'
        if re.match(r'^[A-Z][A-Za-z\'\-]+( [A-Z][A-Za-z\'\-]+)?, [A-Z]', n) and not re.search(r'LLC|Inc|P\.A', n): t = 'I'
        add('fernandez', rpt, d, n, t, a, '')
for l in open(SP + '/transcribed_2022.txt'):
    if l.startswith('#') or not l.strip(): continue
    acct, rpt, doc, d, n, t, amt, note = l.rstrip('\n').split('|')
    add(acct, '%s-22 doc %s' % (rpt, doc), d, n, t, float(amt), note)
R = json.load(open(REPO + '/public/data/city-reports.json'))
c = [c for c in R['cities'] if c['city'] == 'South Miami'][0]
acct = {'Javier E. Fernández': 'fernandez', 'Steve Calle': 'calle', 'Lisa Bonich': 'bonich'}
for k in c['candidates']:
    a = acct.get(k['name'])
    if not a: continue
    for r in k['reports']:
        for x in r['rows']:
            if x[2] == 'S' or (len(x) > 4 and x[4]) or not x[3] > 0: continue
            last = x[1].split(' ')[-1] if x[2] == 'I' else x[1]
            rows.setdefault(a + '_2026', []).append(['%s %s' % (r['report'], r['url'].rsplit('/', 1)[-1]), len(rows.get(a + '_2026', [])) + 1, x[0], 'C', x[1], '', '', '', 'FL', '', x[2], '', 'CH', 'from public/data/city-reports.json', '%.2f' % x[3], '', last])
for f, rs in rows.items():
    with open(CITY + '/' + f + '.csv', 'w', newline='') as fh:
        w = csv.writer(fh); w.writerow(H); w.writerows(rs)
    print(f, len(rs), round(sum(float(r[14]) for r in rs), 2))
