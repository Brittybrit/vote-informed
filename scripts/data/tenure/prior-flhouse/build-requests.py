"""Florida House budget requests filed by this slice's members, one file per session year: requests-<year>.json in the
shape of ../flhouse/requests-2022.json (2017-2022, project bills) and ../flhouse/requests-2023.json (2023-2026, APR forms).

2017-2022: the House filed each member request as an Appropriations Project bill (HB 2000-4999). The member's bills are
listed from flsenate.gov House bill lists filtered by "Filed By" (raw/pb-<year>.json; first name in the sponsor list =
sponsor, later names = co-introducers), and each bill's filed text (raw/pbtext/<year>-<n>.txt) gives the project title,
the Appropriations Project Request number, the amount and the agency. Date, recipient, county and lobbyist are on the
attached request form on flhouse.gov (browser only, needs-browser.md PB-FORMS); when raw/apb-<year>.txt exists they are
filled from it, otherwise left null with formRead false.
2023-2026: Appropriations Project Request forms (Lopez). raw/apr-<year>.txt (full list + forms, read in the browser,
needs-browser.md APR-LOPEZ) when present; otherwise the rows seen through WebFetch in raw/apr-visible-lopez.txt, marked
listPartial (the WebFetch copy of the list stops at about the 470th form).
Budget status: each bill / form number looked up as "(HB n)" (2017-2022) or "(HF n)" (2023-2026) in that year's General
Appropriations Act as printed in the Laws of Florida, where vetoed language is struck through (raw/gaa/, bills/gaa.py).
Run: python3 scripts/data/tenure/prior-flhouse/build-requests.py"""
import json, os, re, sys
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(H, 'bills'))
import gaa
R = lambda *p: os.path.join(H, 'raw', *p)
PID = {'Lopez': 'vicki-l-lopez', 'Donalds': 'byron-donalds', 'Avila': 'bryan-avila', 'Ingoglia': 'blaise-ingoglia',
       'Rodriguez': 'ana-maria-rodriguez', 'Fernandez': 'javier-fernandez', 'Moskowitz': 'jared-moskowitz'}
GAA = {2017: ('HB 5001', '2017-70', '2017-18'), 2018: ('HB 5001', '2018-9', '2018-19'), 2019: ('SB 2500', '2019-115', '2019-20'),
       2020: ('HB 5001', '2020-111', '2020-21'), 2021: ('SB 2500', '2021-36', '2021-22'), 2022: ('HB 5001', '2022-156', '2022-23'),
       2023: ('SB 2500', '2023-239', '2023-24'), 2024: ('HB 5001', '2024-231', '2024-25'), 2025: ('SB 2500', '2025-198', '2025-26'),
       2026: ('HB 5001-E', '2026-232', '2026-27')}
SESSION = {2017: 83, 2018: 86, 2019: 87, 2020: 89, 2021: 90, 2022: 93}
APRSES = {2023: 99, 2024: 103}
none = lambda s: (s or '').strip() in ('', 'None', 'N/A', 'n/a', 'none')
num = lambda s: int(re.sub(r'[^\d]', '', s))
def budget_meta(y):
    law, ch, fy = GAA[y]
    return {'law': law, 'ch': 'Ch. ' + ch, 'fy': fy, 'url': f'https://laws.flrules.org/{ch.replace("-", "/")}',
            'vetoSource': f'Laws of Florida, ch. {ch}, struck-through (vetoed) language', 'vetoUrl': f'https://laws.flrules.org/{ch.replace("-", "/")}'}
def status(idx, n):
    if n not in idx: return {'status': 'notIn'}
    hits = idx[n]; am = [h['amount'] for h in hits]
    b = {'status': 'in', 'lines': len(hits)}
    if all(a is not None for a in am): b['amount'] = sum(am)
    else: b['someUnstated'] = True; b['amount'] = sum(a for a in am if a) or None
    v = [h for h in hits if h['vetoed']]
    if v:
        b['vetoed'] = sum(h['amount'] or 0 for h in v) or True
        if len(v) == len(hits) and b.get('amount') and b['vetoed'] == b['amount']: b['allVetoed'] = True
    if any(h['kind'] == 'proviso' for h in hits): b['proviso'] = True
    if b.get('amount') is None: b.pop('amount')
    return b
def pbtext(y, n):
    f = R('pbtext', f'{y}-{n}.txt')
    if not os.path.exists(f): return None
    t = open(f).read().split('\n', 1)[1]
    t = re.sub(r'^\s*\d+\s', ' ', t, flags=re.M)
    t = re.sub(r'\s+', ' ', t)
    title = re.search(r'Appropriations Project titled (.*?); providing', t)
    apr = re.search(r'Appropriations Project Request (\d+)', t)
    sums = [num(x) for x in re.findall(r'sum of \$([\d,]+)', t)]
    ag = re.search(r'appropriated to the (.+?) (?:to fund|for the|to provide)', t)
    fund = re.findall(r'from the ([A-Z][A-Za-z ]+? (?:Fund|Trust Fund))', t)
    return {'title': title.group(1).strip() if title else None, 'apr': apr.group(1) if apr else None, 'ask': sum(sums) if sums else None,
            'agency': ag.group(1).strip() if ag else None, 'funds': sorted(set(fund))}
def forms(y):
    f = R(f'apb-{y}.txt'); out = {}
    if not os.path.exists(f): return out
    for l in open(f):
        if l.startswith('#') or not l.strip(): continue
        c = l.rstrip('\n').split('~')
        out[(c[0], c[1])] = c
    return out
todo = []
for y in (2017, 2018, 2019, 2020, 2021, 2022):
    if not os.path.exists(R(f'pb-{y}.json')): continue
    law, ch, fy = GAA[y]
    idx = gaa.index(ch, r'\(HB\s*0*(\d{4})\)') if os.path.exists(R('gaa', f'ch{ch}.txt')) else None
    F = forms(y); out = []
    for b in json.load(open(R(f'pb-{y}.json'))):
        if not 2000 <= b['num'] < 5000: continue
        names = [s.strip() for s in b['filer'].split(',')]
        role = 'sponsor' if names and names[0] == b['member'] else 'cosponsor'
        t = pbtext(y, b['num']) or {}
        c = F.get((b['bill'], b['member']))
        rec = {'fy': y, 'form': b['num'], 'bill': b['bill'], 'apr': t.get('apr'), 'member': b['member'], 'pid': PID[b['member']], 'role': role,
               'sponsors': b['filer'], 'title': t.get('title') or b['title'], 'ask': t.get('ask'), 'agency': t.get('agency'), 'fund': t.get('funds'),
               'date': None, 'recipient': None, 'county': None, 'lobbied': [], 'formRead': False,
               'budget': status(idx, b['num']) if idx is not None else {'status': 'unknown', 'note': 'GAA text not converted yet'},
               'lastAction': b['lastAction'].replace('Last Action: ', ''),
               'record': b['url'], 'textUrl': b['url'] + '/BillText/Filed/PDF',
               'formList': f'https://www.flhouse.gov/Sections/Appropriations/projectbills.aspx?SessionId={SESSION[y]}'}
        if not t: rec['textRead'] = False
        if c:
            bill, member, funds, billId, apr, date, sponsor, tot, recp, county, lob, firm, agency, title = c
            m, d, yy = date.split('/')
            rec.update({'billId': int(billId), 'date': f'{yy}-{m}-{d}', 'recipient': recp, 'county': county or None, 'formRead': True,
                        'lobbied': [] if none(lob) else [{'name': lob, 'firm': None if none(firm) else firm, 'for': recp, 'src': 'form'}],
                        'record': f'https://www.flhouse.gov/Sections/Bills/billsdetail.aspx?BillId={billId}'})
        else: todo.append(f"{y}~{b['bill']}~{b['member']}~{rec['title']}")
        out.append(rec)
    out.sort(key=lambda r: (r['member'], r['form']))
    J = {'source': f"Florida House Appropriations Project bills for the {y} session (FY {fy}) filed by {', '.join(sorted({r['member'] for r in out}))}: listed from flsenate.gov House bill lists filtered by Filed By (co-introducers included, role 'cosponsor'), amount/agency/APR number from each bill's filed text. Request forms (date, recipient, lobbyist) are on flhouse.gov ({rec['formList'] if out else ''}); formRead says whether one was read. Budget status: the bill number looked up as '(HB n)' in the {law} General Appropriations Act as printed in the Laws of Florida (ch. {ch}), where vetoed language is struck through.",
         'budget': budget_meta(y),
         'counts': {'bills': len(out), 'sponsor': sum(1 for r in out if r['role'] == 'sponsor'), 'inBudget': sum(1 for r in out if r['budget']['status'] == 'in'),
                    'vetoed': sum(1 for r in out if r['budget'].get('vetoed')), 'formsRead': sum(1 for r in out if r['formRead']),
                    'lobbied': sum(1 for r in out if r['lobbied']), 'byMember': {m: sum(1 for r in out if r['member'] == m) for m in sorted({r['member'] for r in out})}},
         'requests': out}
    json.dump(J, open(os.path.join(H, f'requests-{y}.json'), 'w'), indent=1, ensure_ascii=False)
    print(y, J['counts'])
open(R('pb-forms-todo.txt'), 'w').write('# year~bill~member~title: project bills whose request form is not read yet (needs-browser.md PB-FORMS)\n' + '\n'.join(todo) + '\n')

# ---- 2023-2026: Lopez APR forms ----------------------------------------------------------------------------------
vis = {}
for l in open(R('apr-visible-lopez.txt')):
    if l.startswith('#') or not l.strip(): continue
    y, f, title, cmte, ask = l.rstrip('\n').split('~'); vis.setdefault(int(y), []).append((int(f), title, cmte, int(ask)))
for y in (2023, 2024, 2025, 2026):
    law, ch, fy = GAA[y]
    idx = gaa.index(ch, r'\(HF\s*0*(\d{3,4})\)') if os.path.exists(R('gaa', f'ch{ch}.txt')) else None
    full = R(f'apr-{y}.txt'); out = []
    if os.path.exists(full):
        for line in open(full):
            if not line.strip() or line.startswith('#'): continue
            form, doc, sp, date, ask, rec, county, lob, firm, cmte, title = line.rstrip('\n').split('~')
            m, d, yy = date.split('/'); f = int(form)
            out.append({'fy': y, 'form': f, 'docId': int(doc), 'date': f'{yy}-{m}-{d}', 'member': 'Lopez', 'pid': PID['Lopez'], 'title': title,
                        'recipient': rec, 'county': county, 'ask': int(ask), 'cmte': cmte, 'formRead': True,
                        'lobbied': [] if none(lob) else [{'name': lob, 'firm': None if none(firm) else firm, 'for': rec, 'src': 'form'}],
                        'withdrawn': '(Withdrawn)' in title,
                        'budget': status(idx, f) if idx is not None else {'status': 'unknown'},
                        'record': f"https://www.flhouse.gov/api/document/apr?sessionid={APRSES.get(y, '')}&id={doc}"})
        partial = False
    else:
        for f, title, cmte, ask in vis.get(y, []):
            out.append({'fy': y, 'form': f, 'docId': None, 'date': None, 'member': 'Lopez', 'pid': PID['Lopez'], 'title': title, 'recipient': None,
                        'county': None, 'ask': ask, 'cmte': cmte or None, 'formRead': False, 'lobbied': [], 'withdrawn': '(Withdrawn)' in title,
                        'budget': status(idx, f) if idx is not None else {'status': 'unknown'},
                        'record': f'https://www.flhouse.gov/AppropriationProjectRequests/{y}'})
        partial = True
    J = {'source': f"Florida House Appropriations Project Requests for the {y} session (flhouse.gov/AppropriationProjectRequests/{y}) filed by Vicki Lopez. " +
         ("Every form, read in the browser." if not partial else "PARTIAL: only the rows visible in the WebFetch copy of the list (it stops at about the 470th form); the full list and each form's date, recipient and lobbyist need the browser (needs-browser.md APR-LOPEZ). Counts are 'at least'.") +
         f" Budget status: the form number looked up as '(HF n)' in the {law} General Appropriations Act as printed in the Laws of Florida (ch. {ch}), where vetoed language is struck through.",
         'listPartial': partial, 'budget': budget_meta(y),
         'counts': {'forms': len(out), 'withdrawn': sum(1 for r in out if r['withdrawn']), 'inBudget': sum(1 for r in out if r['budget']['status'] == 'in'),
                    'vetoed': sum(1 for r in out if r['budget'].get('vetoed')), 'lobbied': sum(1 for r in out if r['lobbied'])},
         'requests': out}
    if y == 2026:
        J['note'] = 'Lopez resigned from the House on Nov 18, 2025, before the 2026 session; forms she filed for it are listed as filed.'
    json.dump(J, open(os.path.join(H, f'requests-{y}.json'), 'w'), indent=1, ensure_ascii=False)
    print(y, 'partial' if partial else 'full', J['counts'])
