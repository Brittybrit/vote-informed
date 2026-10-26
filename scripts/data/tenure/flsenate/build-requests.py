"""Builds requests-<fy>.json (FY 2021-22 .. 2024-25) for the four Senate members in this slice from
- lfir-list.json (flsenate.gov /Session/Appropriations/FY<fy>/LocalFundingRequests list, parsed by src/parse_lists.py),
- raw/txt/<fy>_S<form>.txt (each Local Funding Initiative Request PDF, pdftotext -layout),
- raw/gaa/gaa<year>.txt (enrolled General Appropriations Act text) and raw/gaa/veto<year>.txt (governor's veto list).
Same request fields as scripts/data/tenure/flhouse/requests-<yr>.json (and scripts/data/state/nixon.json "requests"),
with member, lobbied (form item "Lobbyist Contact Information") and budget {status in|notIn|withdrawn, amount, lines, vetoed}.
Run: python3 scripts/data/tenure/flsenate/build-requests.py"""
import json, os, re
H = os.path.dirname(os.path.abspath(__file__))
FULL = {'Rodriguez': 'Ana Maria Rodriguez', 'Garcia': 'Ileana Garcia', 'Calatayud': 'Alexis Calatayud', 'Ingoglia': 'Blaise Ingoglia'}
BUDGET = {
 '2021-22': {'year': 2021, 'law': 'SB 2500', 'ch': 'Ch. 2021-36', 'url': 'https://www.flsenate.gov/Session/Bill/2021/2500/BillText/er/PDF',
             'vetoUrl': 'https://www.flgov.com/eog/sites/default/files/press/2021-Veto-List-Final.pdf'},
 '2022-23': {'year': 2022, 'law': 'HB 5001', 'ch': 'Ch. 2022-156', 'url': 'https://www.flsenate.gov/Session/Bill/2022/5001/BillText/er/PDF',
             'vetoUrl': 'https://www.flgov.com/eog/sites/default/files/press/2022-Veto-List-Final.pdf'},
 '2023-24': {'year': 2023, 'law': 'SB 2500', 'ch': 'Ch. 2023-239', 'url': 'https://www.flsenate.gov/Session/Bill/2023/2500/BillText/er/PDF',
             'vetoUrl': 'https://www.flgov.com/eog/sites/default/files/press/Final-Veto-List-2023.pdf'},
 '2024-25': {'year': 2024, 'law': 'HB 5001', 'ch': 'Ch. 2024-231', 'url': 'https://www.flsenate.gov/Session/Bill/2024/5001/BillText/er/PDF',
             'vetoUrl': 'https://www.flgov.com/eog/sites/default/files/press/FY_2024-25_Veto_List.pdf'},
}
TAG = r'\((?:Senate\s*Form|SF)\s*0*(\d{3,4})\)'
num = lambda s: int(s.replace(',', ''))

def gaa_index(year):
    """form -> list of line amounts (None where the GAA names the form without a figure we can tie to it)."""
    t = re.sub(r'\s+', ' ', open(os.path.join(H, 'raw/gaa', f'gaa{year}.txt')).read())
    idx = {}
    for m in re.finditer(TAG, t):
        f = int(m.group(1))
        # skip the rest of a tag cluster, then look for the dot leader + amount that closes an itemized line
        j = m.end()
        cl = re.match(r'(?:\s*\((?:HB|HF|SB|Senate\s*Form|SF)[^)]*\))*', t[j:]); j += cl.end()
        # itemized line: optional dot leader (2+ dots) then a comma-grouped amount ("... 375,000", "(SF n) 100,000");
        # a single period followed by a number is a sentence end + Specific Appropriation number, not an amount.
        a = re.match(r'\s*(?:(?:\.\s*){1,})?\s*(\d{1,3}(?:,\d{3})+)(?![\d,A-Za-z])', t[j:j + 200])
        amt = num(a.group(1)) if a else None
        if amt is None:
            # proviso sentence: "... $X in nonrecurring funds ... is provided for <title> (SF n)"
            k = max(t.rfind('. ', 0, m.start()), t.rfind('From the funds', 0, m.start()))
            s = t[k:m.start()]
            nr = [num(x) for x in re.findall(r'\$(\d{1,3}(?:,\d{3})+)(?:\s*\([^)]*\))*\s+in\s+nonrecurring', s)]
            ds = [num(x) for x in re.findall(r'\$(\d{1,3}(?:,\d{3})+)', s)]
            # the project's own dollars are the nonrecurring ones; recurring base funding in the same sentence is not the request
            amt = (sum(nr) if nr else (ds[-1] if ds else None))
            idx.setdefault(f, []).append(('p', amt, sum(ds) if ds else None)); continue
        idx.setdefault(f, []).append(('l', amt, amt))
    return idx

def veto_index(year):
    """form -> vetoed total (sum of the Total column of each veto-list record naming the form)."""
    L = open(os.path.join(H, 'raw/gaa', f'veto{year}.txt')).read().split('\n')
    recs, cur = [], None
    for l in L:
        if re.match(r'^\s*\d+\s*[A-Z]?\s+(?:\d+|P|[A-Z])\s{2,}\S', l) and re.search(r'[\d,]{3,}\s*$', l):
            cur = [l]; recs.append(cur)
        elif cur is not None and l.strip() and not re.search(r'Veto List|Line #|^\s*Total', l):
            if re.match(r'^\s{8,}\S', l): cur.append(l)
            else: cur = None
        elif not l.strip(): cur = None
    out = {}
    for r in recs:
        tot = num(re.search(r'([\d,]{3,})\s*$', r[0]).group(1))
        txt = re.sub(r'\s+', ' ', ' '.join(r))
        for f in set(re.findall(TAG, txt)):
            out[int(f)] = out.get(int(f), 0) + tot
    return out

def field(t, label, nxt):
    m = re.search(label + r'\s+(.*?)\s*(?:' + nxt + r')', t, re.S)
    return re.sub(r'\s+', ' ', m.group(1)).strip() if m else ''

def parse_form(path):
    t = open(path).read()
    g = lambda pat: (re.search(pat, t, re.M) or [None, ''])[1].strip()
    date = g(r'^\s*3\.\s*Date of Request\s+(\S+)')
    sponsor = g(r'^\s*2\.\s*Senate Sponsor\s+(.+)$')
    rec_blk = re.search(r'Recipient Contact Information(.*?)(?:Lobbyist Contact Information|$)', t, re.S)
    rb = rec_blk.group(1) if rec_blk else ''
    recipient = (re.search(r'a\.\s*Organization\s+(.+)', rb) or [None, ''])[1].strip()
    county = (re.search(r'b\.\s*Municipality and County\s+(.+)', rb) or [None, ''])[1].strip()
    lb = re.search(r'Lobbyist Contact Information(.*)', t, re.S)
    lb = lb.group(1) if lb else ''
    lob = (re.search(r'a\.\s*Name\s+(.*)', lb) or [None, ''])[1].strip()
    firm = (re.search(r'b\.\s*Firm Name[ \t]*(.*)', lb) or [None, ''])[1].strip()
    lob = re.split(r'\s{3,}', lob)[0]; firm = re.split(r'\s{3,}', firm)[0]
    agency = g(r'^\s*5\.\s*State Agency to receive requested funds\s+(.+)$')
    agency = re.split(r'\s{3,}', agency)[0]
    return {'date': date, 'sponsor': sponsor, 'recipient': recipient, 'county': county, 'lobbyist': lob, 'firm': firm, 'agency': agency}

L = json.load(open(os.path.join(H, 'lfir-list.json')))
report = {}
for fy, B in BUDGET.items():
    gi, vi = gaa_index(B['year']), veto_index(B['year'])
    out = []
    for r in [x for x in L if x['fy'] == fy]:
        f = int(r['form'])
        p = parse_form(os.path.join(H, 'raw/txt', f"{fy}_S{r['form']}.txt"))
        if FULL[r['sponsor']].split()[-1].lower() not in p['sponsor'].lower():
            raise SystemExit(f'sponsor mismatch {fy} {f}: list {r["sponsor"]} form {p["sponsor"]}')
        if f in gi:
            kinds = [x[0] for x in gi[f]]; am = [x[1] for x in gi[f]]
            # the governor's veto list gives the total appropriated for the project: when it is more than the nonrecurring
            # dollars of a proviso sentence, the project's own line includes the recurring dollars of that sentence too
            if f in vi and all(a is not None for a in am) and vi[f] > sum(am): am = [x[2] if x[0] == 'p' and x[2] else x[1] for x in gi[f]]
            b = {'status': 'in', 'lines': len(am)}
            if all(a is not None for a in am): b['amount'] = sum(am)
            else:
                b['amount'] = sum(a for a in am if a is not None) or None; b['someUnstated'] = True
            if 'p' in kinds: b['proviso'] = True
            if f in vi: b['vetoed'] = vi[f]
        else:
            b = {'status': 'notIn'}
            if f in vi: b['vetoedButNotFound'] = vi[f]
        none = lambda s: s in ('', 'None', 'N/A', 'n/a', 'none')
        # a "firm" that is the lobbyist's own government or university employer (in-house lobbyist), not a lobbying firm
        inhouse = re.search(r'^(Miami-Dade County|University of Miami)$', p['firm'] or '')
        lobbied = [] if none(p['lobbyist']) else [{'name': p['lobbyist'], 'firm': None if none(p['firm']) or inhouse else p['firm'], **({'employer': p['firm']} if inhouse else {}), 'for': p['recipient'], 'src': 'form'}]
        m, d, y = p['date'].split('/')
        if r['withdrawn']: b['withdrawn'] = r.get('wnote') or True
        out.append({'fy': fy, 'form': f, 'date': f'{y}-{m.zfill(2)}-{d.zfill(2)}', 'member': r['sponsor'], 'title': r['title'],
                    'recipient': p['recipient'], 'county': p['county'], 'agency': p['agency'], 'ask': r['ask'], 'cmte': r['cmte'],
                    'lobbied': lobbied, 'budget': b, 'record': r['pdf']})
    meta = {k: v for k, v in B.items() if k != 'year'} | {'fy': fy}
    J = {'source': f"Florida Senate Local Funding Initiative Requests, Fiscal Year {fy} (flsenate.gov/Session/Appropriations/FY{fy}/LocalFundingRequests), every form filed by the members in this slice; each form PDF read Oct 25, 2026. Budget status: each form number looked up as '(Senate Form n)' / '(SF n)' in the enrolled GAA ({B['law']}, {B['ch']}) and in the governor's veto list.",
         'budget': meta,
         'counts': {'forms': len(out), 'withdrawn': sum(1 for x in out if x['budget'].get('withdrawn')),
                    'inBudget': sum(1 for x in out if x['budget']['status'] == 'in'),
                    'vetoed': sum(1 for x in out if x['budget'].get('vetoed')),
                    'lobbied': sum(1 for x in out if x['lobbied'])},
         'requests': out}
    json.dump(J, open(os.path.join(H, f"requests-{fy}.json"), 'w'), indent=1, ensure_ascii=False)
    per = {}
    for x in out:
        k = per.setdefault(x['member'], {'forms': 0, 'in': 0, 'vetoed': 0, 'lobbied': 0, 'ask': 0, 'funded': 0})
        k['forms'] += 1; k['ask'] += x['ask'] or 0; k['lobbied'] += bool(x['lobbied'])
        if x['budget']['status'] == 'in': k['in'] += 1; k['funded'] += x['budget'].get('amount') or 0
        if x['budget'].get('vetoed'): k['vetoed'] += 1
    print(fy, J['counts'], per)
