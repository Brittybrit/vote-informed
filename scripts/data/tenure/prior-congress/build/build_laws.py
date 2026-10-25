# Laws universe, benefits and floor-vote cards for Jolly (FL-13) and Graham (FL-2): every public law enacted
# 2014-03-11 to 2017-01-03 (113th from Jolly's start, all of the 114th). Same schemas as
# scripts/data/tenure/congress/laws/* and floor-votes-tenure.json.
# usage: python3 -I build_laws.py <scratch prior-congress dir> <congress work dir> <outdir>
import json, re, sys, os, datetime
SC, WK, OUT = sys.argv[1:4]
B = os.path.dirname(os.path.abspath(__file__))
L = [x for x in json.load(open(WK + '/laws108-116.json')) if x['pl'] in set(json.load(open(SC + '/window.json')))]
S = {x['pl']: x for x in json.load(open(WK + '/screen108-116.json'))}
D = json.load(open(SC + '/decide-base.json')); P = json.load(open(SC + '/picked.json'))
R = json.load(open(SC + '/rollidx.json')); O = json.load(open(B + '/overrides.json'))
CL = json.load(open(WK + '/classes.json')); CL.update(json.load(open(B + '/classes-extra.json')))
CL['mining'] = {'label': CL['mining']['label'], 'donors': [['^FREEPORT', 'Freeport-McMoRan', {'en': 'mining company', 'es': 'empresa minera', 'ht': 'konpayi min'}]]}
H = json.load(open(B + '/helps.json'))
SEAT = {'Jolly': ('2014-03-11', '2017-01-03'), 'Graham': ('2015-01-03', '2017-01-03')}
HOUSE = ['Jolly', 'Graham']
BT = {'hr': ('H.R.', 'house-bill'), 's': ('S.', 'senate-bill'), 'hjres': ('H.J.Res.', 'house-joint-resolution'), 'sjres': ('S.J.Res.', 'senate-joint-resolution')}
ORD = lambda c: str(c) + ('th' if 11 <= c % 100 <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(c % 10, 'th'))
VMAP = {'Yea': 'yes', 'Aye': 'yes', 'Nay': 'no', 'No': 'no', 'Not Voting': 'nv', 'Present': 'present'}
SRC = ('The Congressional Research Service summary', 'El resumen del Servicio de Investigación del Congreso', 'Rezime Sèvis Rechèch Kongrè a')
iso = lambda d: datetime.datetime.strptime(d, '%d-%b-%Y').strftime('%Y-%m-%d')
inoffice = lambda m, d: SEAT[m][0] <= d <= SEAT[m][1]
def motion(q):
    q = q.lower()
    if 'conference report' in q or 'with an amendment' in q: return 'passageHouseAmdt'
    if 'concur' in q or 'senate amendment' in q: return 'concurHouse'
    return 'passage'
for pl, c in O['cls'].items(): D[pl]['cls'] = c
for pl, q in O['quote'].items(): D[pl]['quote'] = q
lst, ben, univ, cards = [], [], [], []
for x in L:
    pl = x['pl']; bt, path = BT[x['type']]
    url = f"https://www.congress.gov/bill/{ORD(x['congress'])}-congress/{path}/{x['number']}"
    rec = {'pl': pl, 'bill': f"{bt} {x['number']}", 'title': x['title'], 'date': x['enacted'], 'url': url,
           'api': f"https://www.govinfo.gov/bulkdata/BILLSTATUS/{x['congress']}/{x['type']}/BILLSTATUS-{x['congress']}{x['type']}{x['number']}.xml"}
    lst.append(rec)
    s = S[pl]; d = D.get(pl)
    b = {'pl': pl, 'src': 'crs'}
    if d:
        b['benefits'] = {'category': d['category'], 'named': d['named'], 'quote': d['quote']}
        b['screen'] = 'rule-based screen (scripts/data/tenure/congress)' if d.get('rule', '').startswith(('rule', 'NDAA', 'CRA')) or d.get('rule') is None else 'read in full (this folder)'
    else:
        b['benefits'] = None
        if s['cer']: b['src'] = 'bulk'; b['why'] = 'commemorative/naming/ceremonial or personnel'
        elif not s['nhits']: b['why'] = 'CRS summary names no business'
        else: b['why'] = 'CRS summary mentions a kind of business only as regulated, as a program or agency name, or in passing; it does not say a kind of business benefits'
    ben.append(b)
    u = {k: rec[k] for k in ('pl', 'bill', 'title', 'date', 'url')}
    u['analysisUrl'] = url + '/summary'; u['analysisSource'] = b['src']
    u['benefits'] = b['benefits']
    u['inTerm'] = {m: inoffice(m, x['enacted']) for m in HOUSE}
    if b.get('why'): u['why'] = b['why']
    if d:
        p = dict(P[pl]); ov = O['vote'].get(pl)
        if ov:
            p.update(ov); key = ov['roll']
        else:
            key = (str((p.get('final') or '')[:4]) + '-' + str(p['roll'])) if p.get('roll') else None
        if not key:
            hv = {'date': p.get('date') or p.get('final'), 'method': p.get('method') or 'voice vote', 'roll': None,
                  'members': {m: ('not seated' if not inoffice(m, p.get('date') or p.get('final')) else 'voice/UC') for m in HOUSE}}
            if p.get('note'): hv['note'] = p['note']
            u['votes'] = {'house': hv}
        else:
            r = R[key]; dt = iso(r['date'])
            mem = {}
            for m in HOUSE:
                if not inoffice(m, dt): mem[m] = 'not seated'; continue
                raw = r['m'].get(m)
                mem[m] = {'yes': 'yes', 'no': 'no', 'nv': 'not voting', 'present': 'present'}[VMAP[raw]] if raw in VMAP else 'missing'
            mo = (ov or {}).get('motion') or motion(r['q'])
            hv = {'date': dt, 'roll': str(r['roll']), 'question': r['q'], 'tally': [int(r['yea']), int(r['nay'])],
                  'url': f"https://clerk.house.gov/evs/{r['y']}/roll{r['roll']:03d}.xml", 'members': mem}
            if p.get('rollMeasure') or (r['legis'].replace(' ', '').upper() != (x['type'] + str(x['number'])).upper()): hv['rollMeasure'] = r['legis']
            if p.get('note'): hv['note'] = p['note']
            u['votes'] = {'house': hv}
            cls = d['cls']; helps = H[pl]
            subj = [x['title']] * 3
            q = d['quote']
            quote = {'t': 'crs', 'url': url + '/summary', 'src': dict(zip(('en', 'es', 'ht'), SRC)), 'inline': True,
                     'pre': {'en': 'It helps ' + helps[0] + ', which the analysis describes this way:', 'es': 'Beneficia a ' + helps[1] + ', que el análisis describe así:', 'ht': 'Li ede ' + helps[2] + ', analiz la dekri yo konsa:'},
                     'en': q, 'es': q, 'ht': q}
            if p.get('note'): quote['post'] = {'en': p['note'], 'es': p['note'], 'ht': p['note']}
            cards.append({'key': x['type'] + str(x['number']) + 'c' + str(x['congress']), 'ref': f"{bt} {x['number']} · {x['enacted'][:4]}", 'law': 'P.L. ' + pl,
                          'bill': url, 'subject': dict(zip(('en', 'es', 'ht'), subj)), 'class': cls, 'universe': True, 'quote': quote,
                          'votes': [{'chamber': 'house', 'roll': r['roll'], 'rollYear': r['y'], 'date': dt, 'tally': [int(r['yea']), int(r['nay'])], 'notVoting': int(r['nv'] or 0),
                                     'present': int(r['present'] or 0), 'motion': mo,
                                     'members': {m: VMAP[r['m'][m]] for m in HOUSE if inoffice(m, dt) and r['m'].get(m) in VMAP}}]})
    univ.append(u)
counts = {m: {'laws in term': 0, 'qualifying in term': 0, 'yes': 0, 'no': 0, 'not voting': 0, 'present': 0, 'not seated at House vote': 0, 'voice/UC': 0, 'missing': 0} for m in HOUSE}
for u in univ:
    for m in HOUSE:
        if not u['inTerm'][m]: continue
        counts[m]['laws in term'] += 1
        if not u['benefits']: continue
        counts[m]['qualifying in term'] += 1
        v = u['votes']['house']['members'][m]
        counts[m]['not seated at House vote' if v == 'not seated' else v] += 1
os.makedirs(OUT + '/laws', exist_ok=True)
json.dump(lst, open(f'{OUT}/laws/laws-list.json', 'w'), indent=1, ensure_ascii=False)
with open(f'{OUT}/laws/benefits.jsonl', 'w') as f:
    for b in ben: f.write(json.dumps(b, ensure_ascii=False) + '\n')
json.dump({'sources': ['Public laws, CRS summaries and floor actions: govinfo.gov/bulkdata/BILLSTATUS/113 and /114 (bulk zips read Oct 25, 2026)',
                       'House roll calls: clerk.house.gov/evs/YYYY/rollNNN.xml, 2013-2016 (read Oct 25, 2026)'],
           'rule': 'Universe = every public law enacted from 2014-03-11 (Jolly took his seat; Graham from 2015-01-03) to 2017-01-03 whose CRS summary names a kind of business that benefits (same rule as scripts/data/federal/laws/universe.json; regulatory relief, payments, tax breaks, liability shields, license or deadline extensions and conveyances to a kind of business count; a business only regulated or burdened does not). inTerm says whether the law was enacted during each member\'s term. A member shows "not seated" when the House vote came before they took office (the law was still enacted in their term), and "voice/UC" when the House passed it without a recorded vote.',
           'counts': {'laws': len(univ), 'qualifying': sum(1 for u in univ if u['benefits']), 'members': counts}, 'laws': univ},
          open(f'{OUT}/laws/universe.json', 'w'), indent=1, ensure_ascii=False)
used = {c['class'] for c in cards}
fv = {'source': 'Roll calls from the Clerk of the House (clerk.house.gov/evs), read Oct 25, 2026. Quotes from the Congressional Research Service bill summaries (govinfo.gov BILLSTATUS bulk data).',
      'bills': sorted(cards, key=lambda b: b['votes'][0]['date'], reverse=True),
      'classes': {k: v for k, v in CL.items() if k in used},
      'universeNote': 'Every public law enacted 2014-03-11 to 2017-01-03 was screened (laws/universe.json); those whose CRS summary names a kind of business it helps and that had a House roll call are listed here, with Jolly\'s and Graham\'s votes. Laws the House passed by voice vote, unanimous consent or a rule without a recorded vote have no card. Member keys: Jolly (David Jolly, FL-13, Mar 2014-Jan 2017), Graham (Gwen Graham, FL-2, Jan 2015-Jan 2017).'}
json.dump(fv, open(f'{OUT}/floor-votes.json', 'w'), indent=1, ensure_ascii=False)
open(f'{OUT}/floor-votes.json', 'a').write('\n')
print(len(lst), 'laws;', sum(1 for u in univ if u['benefits']), 'qualifying;', len(cards), 'cards; classes', sorted(used))
print(json.dumps(counts, indent=0))
