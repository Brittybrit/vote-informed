"""Builds stageB.jsonl from ps/<ch>.txt + judge.json, then ../bills-<year>.json (2013 .. 2020, one file per calendar
year of sessions) in the shape of ../../flhouse/bills-2023.json, for the laws of the 2013-2020 sessions.
Screening (same test as scripts/data/state/bills/overrides.json and ../../flhouse/bills/judge.json): a law qualifies only
when the Private Sector Impact section of its final staff analysis itself names a kind of business or company that
benefits. A section that is "None"/"N/A"/indeterminate, or has no benefit wording at all (same automatic rule as
../../flsenate/bills/stageB.py), is b:false automatically; every other section is read by hand into judge.json.
House floor votes: the last House floor vote listed on the bill page (stageA.jsonl), read from the official roll call
(rolls.py) for each member seated that year. Members outside their House tenure on the vote date are "not seated".
Run: python3 build-bills.py   then   python3 rolls.py ../raw/roll-urls-old.txt   then build again."""
import json, os, re, sys
H = os.path.dirname(os.path.abspath(__file__)); P = lambda f: os.path.join(H, f); sys.path.insert(0, H)
import rolls
E = json.load(open(P('enacted.json')))
J = json.load(open(P('judge.json'))) if os.path.exists(P('judge.json')) else {}
jl = lambda f: [json.loads(l) for l in open(f) if l.strip()] if os.path.exists(f) else []
A = {r['ch']: r for r in jl(P('stageA.jsonl'))}
POS = re.compile(r'positive|benefit|sav(e|ing)|reduc|lower(s|ed)? (the )?cost|increase(d|s)? (revenue|profit|business|sales|demand|opportunit|income|access)|exempt|relief|allow(s|ing)? .{0,40}(to|business)|new market|opportunit|incentive|credit|refund|eligible|more (customers|business)|gain|profit|revenue|competit|advantage|flexib|access|expand', re.I)
MEMBERS_BY_YEAR = {'2013': ['Moskowitz'], '2014': ['Moskowitz'], '2015': ['Moskowitz', 'Avila', 'Ingoglia'], '2016': ['Moskowitz', 'Avila', 'Ingoglia'],
                   '2017': ['Moskowitz', 'Avila', 'Ingoglia', 'Donalds'], '2018': ['Moskowitz', 'Avila', 'Ingoglia', 'Donalds', 'Fernandez'],
                   '2019': ['Avila', 'Ingoglia', 'Donalds', 'Rodriguez', 'Fernandez'], '2020': ['Avila', 'Ingoglia', 'Donalds', 'Rodriguez', 'Fernandez']}
def body_of(ch):
    f = P('ps/' + ch + '.txt')
    if not os.path.exists(f): return None, None
    t = open(f).read(); u, _, body = t.partition('\n')
    if body.startswith('FROM prior-flsenate'): body = body.partition('\n')[2]
    return u, body
def strip(body):
    b = body.split('----FISCAL COMMENTS----')[0]
    b = re.sub(r'\s+', ' ', b)
    b = re.sub(r'^\s*([A-D]\.\s*)?(Private Sector Impact:|DIRECT ECONOMIC IMPACT ON (THE )?PRIVATE SECTOR:)\s*', '', b, flags=re.I)
    b = re.sub(r'STORAGE NAME: \S+ PAGE: \d+ (DATE: \S+\s*)?', '', b)
    b = re.sub(r'BILL: \S.*?Page \d+', '', b)
    return b.strip()
def auto_false(body):
    b = strip(body)
    if len(b) < 6 or re.match(r'(None|Not applicable|N/A|No impact)\.?(\s|$)', b, re.I): return 'None.'
    if re.fullmatch(r'\W*(none|n/?a|not applicable|indeterminate|unknown|no impact|the bill has no (fiscal )?impact on the private sector)\W*(\d+)?\W*', b, re.I): return b
    if not POS.search(body): return 'auto: no benefit wording in Private Sector Impact'
    return None
B, unjudged, nosec, noanalysis = {}, [], [], []
for e in E:
    ch = e['chapter']; u, body = body_of(ch)
    if ch in J and J[ch].get('titleClass'):
        B[ch] = {'ch': ch, 'au': u if u not in (None, 'NOANALYSIS') else None, 'ps': J[ch].get('note'), 'b': False, 'cat': None, 'named': [], 'q': None, 'note': J[ch]['note']}; continue
    if u is None: continue
    if e.get('listedAs') and e['title'] in ('General Appropriations Act', 'Appropriations') and ch not in J:
        B[ch] = {'ch': ch, 'au': None, 'ps': 'title class', 'b': False, 'cat': None, 'named': [], 'q': None, 'note': 'General Appropriations Act: conference report only, no private-sector section (as in the other slices)'}; continue
    if re.match(r'Relief( of|\/)', e['title']) and ch not in J:
        # claim bill: relief for a named injured person paid by a government body; judged by title class as in the other slices
        B[ch] = {'ch': ch, 'au': u if u != 'NOANALYSIS' else None, 'ps': 'title class', 'b': False, 'cat': None, 'named': [], 'q': None, 'note': 'claim bill (title class): relief for an individual paid by a public body'}; continue
    if u == 'NOANALYSIS':
        noanalysis.append(ch); B[ch] = {'ch': ch, 'au': None, 'ps': None, 'b': J.get(ch, {}).get('b', False), 'cat': None, 'named': [], 'q': None, 'note': J.get(ch, {}).get('note', 'no staff analysis posted on the bill page')}; continue
    ps = re.sub(r'\s+', ' ', body).strip()[:1500]
    if ch in J:
        j = J[ch]; B[ch] = {'ch': ch, 'au': u, 'ps': ps, 'b': j['b'], 'cat': j.get('cat'), 'named': j.get('named', []), 'q': j.get('q'), 'note': j.get('note')}
    elif body.startswith('NOSECTION') and re.search(r'FISCAL ANALYSIS[ ,&]+ECONOMIC IMPACT STATEMENT', body) and not re.search(
            r'business|compan|industr|private sector|developer|contractor|operator|employer|benefit|vendor|retailer|licensee',
            re.split(r'III\.\s*COMMENTS', re.split(r'FISCAL ANALYSIS[ ,&]+ECONOMIC IMPACT STATEMENT', body, 1)[1], 1)[0], re.I):
        # House local-bill analysis: no private-sector section; its fiscal section names no private party
        B[ch] = {'ch': ch, 'au': u, 'ps': None, 'b': False, 'cat': None, 'named': [], 'q': None, 'note': 'auto: local bill; its fiscal analysis names no private party'}
    elif body.startswith('NOSECTION'):
        nosec.append(ch); B[ch] = {'ch': ch, 'au': u, 'ps': None, 'b': None, 'note': 'Private Sector section not found in the converted text'}
    else:
        a = auto_false(body)
        if a: B[ch] = {'ch': ch, 'au': u, 'ps': ps[:600], 'b': False, 'cat': None, 'named': [], 'q': None, 'note': a if a.startswith('auto') else None}
        else: unjudged.append(ch); B[ch] = {'ch': ch, 'au': u, 'ps': ps, 'b': None, 'note': 'not yet judged'}
with open(P('stageB.jsonl'), 'w') as fo:
    for r in B.values(): fo.write(json.dumps(r, ensure_ascii=False) + '\n')
out, missing, urls = {}, {}, []
for e in E:
    ch = e['chapter']; yr = ch[:4]; out.setdefault(yr, []); missing.setdefault(yr, {'A': [], 'B': [], 'C': []})
    a = A.get(ch); b = B.get(ch)
    if not a: missing[yr]['A'].append(ch)
    if not b or b.get('b') is None: missing[yr]['B'].append(ch)
    rec = {'bill': e['bill'], 'session': e['session'], 'chapter': ch, 'title': e['title'], 'url': e['url'],
           'analysisUrl': (b or {}).get('au'), 'benefits': None, 'screen': (b or {}).get('ps'), 'note': (b or {}).get('note')}
    if b and b.get('b'):
        rec['benefits'] = {'category': b.get('cat'), 'named': b.get('named') or [], 'quote': b.get('q')}
        votes = {}
        fv = [x for x in (a or {}).get('fv', []) if x['c'] == 'H' and x.get('u')]
        if fv:
            v = fv[-1]; urls.append(v['u'])
            r = rolls.read(v['u'], MEMBERS_BY_YEAR[yr])
            if r is not None:
                d, tal, act = rolls.meta(rolls.plain(rolls.text(v['u'])))
                votes['house'] = {'date': d, 'motion': act or 'final passage', 'tally': tal or [v.get('y'), v.get('n')], 'url': v['u'], 'roll': r}
            else: missing[yr]['C'].append([ch, 'H', v['u']])
        else: missing[yr]['C'].append([ch, 'H', None])
        rec['votes'] = votes
    out[yr].append(rec)
open(os.path.join(H, '..', 'raw', 'roll-urls-old.txt'), 'w').write('\n'.join(dict.fromkeys(urls)) + '\n')
for yr, bills in out.items():
    ses = sorted({b['session'] for b in bills})
    U = {'generated': 'scripts/data/tenure/prior-flhouse/bills/build-bills.py', 'extends': 'scripts/data/state/bills/universe.json',
         'rule': 'Every law enacted in sessions ' + ', '.join(ses) + ' whose final staff analysis names a kind of business or company that benefits (same test as universe.json). House floor roll calls of the members seated that year (' + ', '.join(MEMBERS_BY_YEAR[yr]) + '); a member is "not seated" on dates outside their House tenure.',
         'members': {m: {'district': rolls.MEMBERS[m][1], 'start': rolls.MEMBERS[m][2], 'end': rolls.MEMBERS[m][3]} for m in MEMBERS_BY_YEAR[yr]},
         'counts': {'enacted': len(bills), 'screened': sum(1 for b in bills if b['chapter'] in B and B[b['chapter']].get('b') is not None),
                    'qualifying': sum(1 for b in bills if b['benefits']), 'withHouseVote': sum(1 for b in bills if b.get('votes'))},
         'missing': missing[yr], 'bills': bills}
    json.dump(U, open(os.path.join(H, '..', f'bills-{yr}.json'), 'w'), indent=1, ensure_ascii=False)
    print(yr, U['counts'], {k: len(v) for k, v in missing[yr].items()})
print('unjudged', len(unjudged), unjudged[:40]); print('nosection', nosec); print('noanalysis', len(noanalysis))
