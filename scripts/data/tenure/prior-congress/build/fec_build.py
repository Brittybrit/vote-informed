# Committee-to-committee gifts to Jolly's and Graham's committees (FEC bulk itoth, cycles 2012-2018),
# same method and schema as scripts/data/tenure/congress/build/fec_build.py, limited to each member's window.
# usage: python3 -I fec_build.py <dir with oth12.txt..oth18.txt> <dir with cm*/cm.txt> <outdir>
import json, glob, collections, os, sys
OTH, CMX, OUT = sys.argv[1:4]
C = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cmtes.json')))
ours = {c: (m, t) for m, v in C.items() for c, t in v['c'].items()}
cm = {}
for f in sorted(glob.glob(CMX + '/cm*/cm.txt')):
    for l in open(f, encoding='latin-1'):
        r = l.rstrip('\n').split('|'); cm[r[0]] = {'name': r[1], 'dsgn': r[8], 'tp': r[9], 'org': r[13]}
def ent(cid):
    t = (cm.get(cid) or {}).get('tp', '')
    return 'CCM' if t in ('H', 'S', 'P') else 'PTY' if t in ('X', 'Y', 'Z') else 'PAC' if t else 'ORG'
def d8(s): return s[4:8] + '-' + s[0:2] + '-' + s[2:4] if len(s) == 8 else None
rows = {}; seen = set()
GIVE = {'24K', '24Z'}; RECV = {'18K', '18Z'}
for f in sorted(glob.glob(OTH + '/oth*.txt')):
    cyc = 2000 + int(f[-6:-4])
    for l in open(f, encoding='latin-1'):
        r = l.rstrip('\n').split('|')
        if len(r) < 21 or r[18] == 'X': continue
        tp = r[5]; date = d8(r[13]); amt = float(r[14] or 0)
        if r[15] in ours and r[0] not in ours and tp in GIVE and ours[r[15]][1] in ('P', 'A'):
            giver, recip, side = r[0], r[15], 'giver'
        elif r[0] in ours and tp in RECV and ours[r[0]][1] not in ('P', 'A'):
            giver, recip, side = (r[15] or ('NAME:' + r[7])), r[0], 'recipient'
        else: continue
        m, kind = ours[recip]
        if not date or date < C[m]['from'] or date > C[m]['to']: continue
        k = (giver, recip, date, round(amt, 2))
        if k in seen: continue
        seen.add(k)
        gname = cm[giver]['name'] if giver in cm else r[7]
        rows[r[20]] = {'member': m, 'cmte': recip, 'cmteKind': kind, 'cmteName': (cm.get(recip) or {}).get('name'),
                       'contributor': gname, 'contributorId': giver if not giver.startswith('NAME:') else None,
                       'entity': ent(giver) if not giver.startswith('NAME:') else r[6], 'amount': amt, 'date': date,
                       'tp': tp, 'reportedBy': side, 'cycle': cyc, 'image': r[4], 'subId': r[20]}
rec = sorted(rows.values(), key=lambda x: (x['member'], x['date'], x['contributor']))
json.dump({'source': 'FEC bulk data, committee-to-committee transactions (itoth), cycles 2012-2018, downloaded Oct 25, 2026 from fec.gov/files/bulk-downloads. A gift is kept from the giving committee\'s report (24K/24Z) for candidate committees, or the receiving committee\'s report (18K/18Z) for the leadership PAC and joint fundraising committees; duplicates on giver, recipient, date and amount are dropped. Memo entries left out. Window: Jolly 2011-01-01 to 2017-01-03, Graham 2013-01-01 to 2017-01-03. cmteKind JFC-multi = a joint fundraising committee shared with other members (its receipts are not all for this member). Individuals are in indiv-receipts.json.',
           'cols': list(rec[0].keys()), 'rows': [list(x.values()) for x in rec]}, open(OUT + '/fec-receipts.json', 'w'))
def agg(filter_):
    a = {}
    for x in rec:
        if not filter_(x): continue
        k = (x['member'], x['contributor'])
        g = a.setdefault(k, [x['member'], x['contributor'], x['entity'], 0, 0, x['date'], x['date']])
        g[3] += x['amount']; g[4] += 1; g[5] = min(g[5], x['date']); g[6] = max(g[6], x['date'])
    out = sorted(a.values(), key=lambda g: (g[0], g[1]))
    for g in out: g[3] = round(g[3], 2) if g[3] % 1 else int(g[3])
    return out
pc = agg(lambda x: x['cmteKind'] in ('P', 'A'))
json.dump({'source': 'FEC bulk committee-to-committee transactions (see fec-receipts.json) to each member\'s principal campaign committee (Friends of David Jolly C00551572; Graham for Congress C00543249), one cycle before the term through the term\'s last day (Jolly 2011-01-01 to 2017-01-03; Graham 2013-01-01 to 2017-01-03). Same schema as scripts/data/federal/pac-agg.json. Non-individual contributors only; memo entries left out. All contributors kept.',
           'cols': ['member', 'contributor', 'entity', 'total', 'n', 'first', 'last'], 'rows': pc}, open(OUT + '/pac-agg.json', 'w'))
oth = agg(lambda x: x['cmteKind'] not in ('P', 'A'))
print(len(rec), 'gifts;', len(pc), 'pc agg rows;', len(oth), 'leadership/JFC agg rows')
c = collections.Counter((x['member'], x['cmteKind'], x['cycle']) for x in rec)
s = collections.defaultdict(float)
for x in rec: s[(x['member'], x['cmteKind'])] += x['amount']
for k in sorted(c): print(k, c[k])
for k in sorted(s): print(k, round(s[k]))
