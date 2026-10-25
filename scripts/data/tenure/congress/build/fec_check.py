import json, glob, datetime, re
OUT = '/home/claude/vote-informed/scripts/data/tenure/congress'
gm = json.load(open(f'{OUT}/gm-tenure.json')); C = json.load(open('cmtes.json'))
P = {m: [c for c, t in v['c'].items() if t in ('P', 'A')] for m, v in C.items()}
ind = []
for f in glob.glob('indiv/indiv*.txt'):
    for l in open(f, encoding='latin-1'):
        r = l.rstrip('\n').split('|')
        if len(r) < 21 or r[18] == 'X': continue
        d = r[13]; d = d[4:8] + '-' + d[0:2] + '-' + d[2:4] if len(d) == 8 else None
        ind.append((r[0], r[7].upper(), r[11], d, float(r[14] or 0)))
rec = json.load(open('fec-receipts-tenure.json')); RC = [dict(zip(rec['cols'], r)) for r in rec['rows']]
rows = []
def near(a, b): return abs((datetime.date.fromisoformat(a) - datetime.date.fromisoformat(b)).days)
for k, gifts in gm.items():
    m = k.split('|')[0]
    for g in gifts:
        reg, kind, lob, contrib, payee, amt, date = g[:7]
        who = contrib if kind == 'org' else lob
        hit = None
        if kind == 'lob' or contrib == 'SELF' and kind == 'lob':
            last = who.split()[-1]; first = who.split()[0]
            for c, n, emp, d, a in ind:
                if c in P[m] and d and n.startswith(last + ',') and first in n and abs(a - amt) < 1 and near(d, date) <= 45:
                    hit = [n, emp, d, a, c, near(d, date)]; break
        else:
            key = re.sub(r'[^A-Z ]', '', (reg if contrib == 'SELF' else contrib).upper()).split()[:2]
            for x in RC:
                if x['member'] == m and x['cmteKind'] in ('P', 'A') and abs(x['amount'] - amt) < 1 and near(x['date'], date) <= 45 and all(w in x['contributor'].upper() for w in key):
                    hit = [x['contributor'], None, x['date'], x['amount'], x['cmte'], near(x['date'], date)]; break
        rows.append([m, who, amt, date, hit])
json.dump({'note': 'LD-203 gifts in gm-tenure.json looked up in FEC bulk data (individual itcont for lobbyists, committee itoth for firm PACs) for the member\'s campaign committees, within 45 days and same amount. [member, contributor, amount, ld203Date, [fecName, fecEmployer, fecDate, fecAmount, committee, dayGap] or null]. Individual receipts checked only for 2019-2024 cycles 2020-2024 bulk files.',
           'rows': rows}, open(f'{OUT}/fec-check-tenure.json', 'w'), indent=1)
print(len(rows), 'checked;', sum(1 for r in rows if r[4]), 'found')
