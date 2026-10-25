import json, re, sys, datetime
P = json.load(open(sys.argv[1])); R = json.load(open('rollidx.json')); L = {x['pl']: x for x in json.load(open(sys.argv[2]))}
OKFALL = set(sys.argv[3].split(',')) if len(sys.argv) > 3 else set()
iso = lambda d: datetime.datetime.strptime(d, '%d-%b-%Y').strftime('%Y-%m-%d')
byleg = {}
for k, v in R.items(): byleg.setdefault(v['legis'].replace(' ', '').upper(), []).append((iso(v['date']), k, v))
for pl, o in P.items():
    x = L[pl]; leg = (x['type'] + str(x['number'])).upper()
    d = o.get('finalDate') or o.get('final')
    if o.get('note') and pl not in OKFALL:
        o['roll'] = None; o['method'] = o['finalMethod']; o['final'] = o['finalDate']; o.pop('note'); o['text'] = 'last House step by ' + o['method']
    if not o.get('roll') and d:
        same = [t for t in byleg.get(leg, []) if t[0] == d and re.search(r'(?i)concur|pass|agree to the conference|suspend the rules and agree', t[2]['q'])]
        if same:
            same.sort(key=lambda t: t[2]['roll']); t = same[-1]
            o['roll'] = t[2]['roll']; o['method'] = None; o['note'] = 'Recorded vote found in the Clerk\'s roll calls for ' + leg + ' on ' + d + ' (' + t[2]['q'] + ')' + ('; the House voted on the bill in parts, rolls ' + ', '.join(str(s[2]['roll']) for s in same) if len(same) > 1 else '') + '.'
    if o.get('roll'):
        yr = (o.get('final') or d)[:4]
        k = yr + '-' + str(o['roll'])
        if k not in R: o['rollMissing'] = True
        else:
            v = R[k]
            if v['legis'].replace(' ', '').upper() != leg: o['rollMeasure'] = v['legis']
json.dump(P, open(sys.argv[1], 'w'), indent=1)
for pl, o in sorted(P.items()):
    if o.get('note') or o.get('rollMeasure') or o.get('rollMissing'): print(pl, o.get('roll'), o.get('rollMeasure'), o.get('rollMissing'), (o.get('note') or '')[:160])
