# Build tenure law files (same schemas as scripts/data/federal/laws/* and floor-votes.json) for a set of Congresses.
# usage: build_laws.py <laws.json> <screen.json> <decide.json> <text.json> <outdir> <tag> <members-seated-json>
import json, re, sys, os, datetime
laws_f, screen_f, dec_f, text_f, OUT, TAG, seated_f = sys.argv[1:8]
L = json.load(open(laws_f)); S = {x['pl']: x for x in json.load(open(screen_f))}
D = json.load(open(dec_f)); T = json.load(open(text_f)) if os.path.exists(text_f) else {}
R = json.load(open('rollidx.json')); SEAT = json.load(open(seated_f)); CL = json.load(open('classes.json'))
HOUSE = ['Diaz-Balart', 'Salazar', 'Gimenez', 'Moskowitz', 'Donalds']
BT = {'hr': ('H.R.', 'house-bill'), 's': ('S.', 'senate-bill'), 'hjres': ('H.J.Res.', 'house-joint-resolution'), 'sjres': ('S.J.Res.', 'senate-joint-resolution')}
ORD = lambda c: str(c) + ('th' if 11 <= c % 100 <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(c % 10, 'th'))
VMAP = {'Yea': 'yes', 'Aye': 'yes', 'Nay': 'no', 'No': 'no', 'Not Voting': 'nv', 'Present': 'present'}
SRC = {'crs': ('The Congressional Research Service summary', 'El resumen del Servicio de Investigación del Congreso', 'Rezime Sèvis Rechèch Kongrè a')}
def iso(d): return datetime.datetime.strptime(d, '%d-%b-%Y').strftime('%Y-%m-%d')
def seated(m, date):
    a, b = SEAT[m]; return a <= date and (b is None or date <= b)
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
        for k in ('affected', 'note'):
            if d.get(k): b[k] = d[k]
    else:
        b['benefits'] = None
        if s['cer']: b['src'] = 'bulk'; b['why'] = 'commemorative/naming/ceremonial or personnel'
        elif not s['nhits']: b['why'] = 'CRS summary names no business'
        else: b['why'] = 'CRS summary mentions a kind of business only as regulated, as a program or agency name, or in passing; it does not say a kind of business benefits'
        if pl in CL.get('_affected', {}): b['affected'] = CL['_affected'][pl]
    ben.append(b)
    u = {k: rec[k] for k in ('pl', 'bill', 'title', 'date', 'url')}
    u['analysisUrl'] = url + '/summary'; u['analysisSource'] = b['src'] if b['src'] != 'bulk' else 'bulk'
    u['benefits'] = b['benefits']
    for k in ('why', 'affected', 'note'):
        if b.get(k): u[k] = b[k]
    if d:
        v = d['vote']
        if v in ('voice', 'uc'):
            hv = {'date': d.get('date'), 'method': d['method'], 'roll': None, 'members': None}
            u['votes'] = {'house': hv, 'senate': {'members': {'Moody': 'not seated'}}}
        else:
            r = R[v]; dt = iso(r['date'])
            mem = {}
            for m in HOUSE:
                if not seated(m, dt): mem[m] = 'not seated'; continue
                raw = r['m'].get(m)
                mem[m] = {'yes': 'yes', 'no': 'no', 'nv': 'not voting', 'present': 'present'}[VMAP[raw]] if raw else 'missing'
            hv = {'date': dt, 'roll': str(r['roll']), 'tally': [int(r['yea']), int(r['nay'])],
                  'url': f"https://clerk.house.gov/evs/{r['y']}/roll{r['roll']:03d}.xml", 'members': mem}
            if r['legis'] and not r['legis'].replace(' ', '').upper().startswith(x['type'].upper() + str(x['number'])) and not r['legis'].replace(' ', '').upper() == (x['type'].upper() + str(x['number'])):
                hv['rollMeasure'] = r['legis']
            u['votes'] = {'house': hv, 'senate': {'members': {'Moody': 'not seated'}}}
            # card for floor-votes
            t = T.get(pl)
            if not t and d['cls'] in CL:
                lb = CL[d['cls']]['label']; nm = x['title']
                t = [[nm, nm, nm], [lb['en'], lb['es'], lb['ht']]]
            if t:
                subj, helps = t
                q = d['quote']
                post = None
                if d.get('note'): post = {'en': d['note'], 'es': d['note'], 'ht': d['note']}
                quote = {'t': 'crs', 'url': url + '/summary', 'src': dict(zip(('en', 'es', 'ht'), SRC['crs'])), 'inline': True,
                         'pre': {'en': 'It helps ' + helps[0] + ', which the analysis describes this way:', 'es': 'Beneficia a ' + helps[1] + ', que el análisis describe así:', 'ht': 'Li ede ' + helps[2] + ', analiz la dekri yo konsa:'},
                         'en': q, 'es': q, 'ht': q}
                if post: quote['post'] = post
                cards.append({'key': x['type'] + str(x['number']) + 'c' + str(x['congress']), 'ref': f"{bt} {x['number']} · {x['enacted'][:4]}", 'law': 'P.L. ' + pl,
                              'bill': url, 'subject': dict(zip(('en', 'es', 'ht'), subj)), 'class': d['cls'], 'universe': True, 'quote': quote,
                              'votes': [{'chamber': 'house', 'roll': r['roll'], 'date': dt, 'tally': [int(r['yea']), int(r['nay'])], 'notVoting': int(r['nv'] or 0),
                                         'present': int(r['present'] or 0), 'motion': d['motion'] if d['motion'] in ('passage', 'passageHouseAmdt', 'concurHouse') else 'passage',
                                         'members': {m: VMAP[r['m'][m]] for m in HOUSE if seated(m, dt) and r['m'].get(m)}}]})
    univ.append(u)
counts = {m: {'yes': 0, 'no': 0, 'not voting': 0, 'not seated': 0, 'voice/UC': 0, 'missing': 0, 'present': 0} for m in HOUSE}
for u in univ:
    if not u['benefits']: continue
    hv = u['votes']['house']
    for m in HOUSE:
        if hv.get('method'): counts[m]['voice/UC'] += 1
        else: counts[m][hv['members'][m]] += 1
os.makedirs(OUT + '/laws', exist_ok=True)
json.dump(lst, open(f'{OUT}/laws/laws-list-{TAG}.json', 'w'), indent=1, ensure_ascii=False)
with open(f'{OUT}/laws/benefits-{TAG}.jsonl', 'w') as f:
    for b in ben: f.write(json.dumps(b, ensure_ascii=False) + '\n')
congs = sorted({x['congress'] for x in L})
json.dump({'sources': [f'Public laws, CRS summaries, CBO estimate links and floor actions: govinfo.gov/bulkdata/BILLSTATUS/{c}' for c in congs] +
                      ['House roll calls: clerk.house.gov/evs/YYYY/rollNNN.xml (read Oct 25, 2026)'],
           'rule': f'Universe = every public law of the {", ".join(ORD(c) for c in congs)} Congress(es) whose CRS summary names a kind of business that benefits (same rule as scripts/data/federal/laws/universe.json). "affected" lists businesses regulated but not benefited; those are not counted. A member shows "not seated" for votes before taking office.',
           'counts': {'laws': len(univ), 'qualifying': sum(1 for u in univ if u['benefits']), 'members': counts}, 'laws': univ},
          open(f'{OUT}/laws/universe-{TAG}.json', 'w'), indent=1, ensure_ascii=False)
json.dump({'cards': cards}, open(f'cards-{TAG}.json', 'w'), ensure_ascii=False)
print(TAG, len(lst), 'laws;', sum(1 for u in univ if u['benefits']), 'qualifying;', len(cards), 'cards'); print(json.dumps(counts))
