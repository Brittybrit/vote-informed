"""Builds requests-<fy>.json for the five senators in this slice (same record shape and rules as ../flsenate/build-requests.py,
whose parsing functions are copied here unchanged except for file locations) from
- lfir-list.json (src/parse_lists.py), raw/txt/<fy>_S<form>.txt (each Local Funding Initiative Request PDF, pdftotext -layout),
- the enrolled GAA text: raw/gaa/gaa<year>.txt here (2017-2020 from laws.flrules.org chapter PDFs; 2025-2026) or ../flsenate/raw/gaa (2021-2024),
- the governor's veto list: flgov.com list text (2021-2026) or, for 2017-2020, the line-item veto message printed in the next
  Senate Journal (raw/gaa/veto<year>.json, built by src/journal_vetoes.py).
Run: python3 -I scripts/data/tenure/prior-flsenate/build-requests.py"""
import json, os, re, collections
H = os.path.dirname(os.path.abspath(__file__))
FS = os.path.join(H, '../flsenate')
FULL = {'Avila': 'Bryan Avila', 'Taddeo': 'Annette Taddeo', 'Simpson': 'Wilton Simpson', 'JJRodriguez': 'Jose Javier Rodriguez', 'Campbell': 'Daphne Campbell'}
SURN = {'Avila': r'avila', 'Taddeo': r'taddeo', 'Simpson': r'simpso', 'JJRodriguez': r'rodr[ií]g', 'Campbell': r'campbe'}  # stems, so OCR'd lines still match
LF = 'https://laws.flrules.org/'
BUDGET = {
 '2017-18': {'year': 2017, 'law': 'SB 2500', 'ch': 'Ch. 2017-70', 'url': LF + '2017/70', 'vetoUrl': 'https://www.flsenate.gov/usercontent/session/archive/journals/2018/2018-sj-bound-vI.pdf', 'vetoNote': 'Line-item veto message of the Governor, Journal of the Senate, January 9, 2018'},
 '2018-19': {'year': 2018, 'law': 'HB 5001', 'ch': 'Ch. 2018-9', 'url': LF + '2018/9', 'vetoUrl': None, 'vetoNote': 'No veto list found: not on flgov.com, and the line-item veto message of this House-originated GAA is printed in the House Journal, not the Senate Journal. Vetoed status of these forms is unknown (needs-browser.md item 6).'},
 '2019-20': {'year': 2019, 'law': 'SB 2500', 'ch': 'Ch. 2019-115', 'url': LF + '2019/115', 'vetoUrl': 'https://www.flsenate.gov/usercontent/session/archive/journals/2020/2020-sj-bound-vI.pdf', 'vetoNote': 'Line-item veto message of the Governor, Journal of the Senate (2020 bound vol. I)'},
 '2020-21': {'year': 2020, 'law': 'HB 5001', 'ch': 'Ch. 2020-111', 'url': LF + '2020/111', 'vetoUrl': 'https://www.flgov.com/eog/sites/default/files/press/2020-Veto-List.pdf'},
 '2021-22': {'year': 2021, 'law': 'SB 2500', 'ch': 'Ch. 2021-36', 'url': 'https://www.flsenate.gov/Session/Bill/2021/2500/BillText/er/PDF', 'vetoUrl': 'https://www.flgov.com/eog/sites/default/files/press/2021-Veto-List-Final.pdf'},
 '2022-23': {'year': 2022, 'law': 'HB 5001', 'ch': 'Ch. 2022-156', 'url': 'https://www.flsenate.gov/Session/Bill/2022/5001/BillText/er/PDF', 'vetoUrl': 'https://www.flgov.com/eog/sites/default/files/press/2022-Veto-List-Final.pdf'},
 '2023-24': {'year': 2023, 'law': 'SB 2500', 'ch': 'Ch. 2023-239', 'url': 'https://www.flsenate.gov/Session/Bill/2023/2500/BillText/er/PDF', 'vetoUrl': 'https://www.flgov.com/eog/sites/default/files/press/Final-Veto-List-2023.pdf'},
 '2024-25': {'year': 2024, 'law': 'HB 5001', 'ch': 'Ch. 2024-231', 'url': 'https://www.flsenate.gov/Session/Bill/2024/5001/BillText/er/PDF', 'vetoUrl': 'https://www.flgov.com/eog/sites/default/files/press/FY_2024-25_Veto_List.pdf'},
 '2025-26': {'year': 2025, 'law': 'SB 2500', 'ch': 'Ch. 2025-198', 'url': 'https://www.flsenate.gov/Session/Bill/2025/2500/BillText/er/PDF', 'vetoUrl': 'https://www.flgov.com/eog/sites/default/files/shared/2025/06/2025%20Final%20Veto%20List.pdf'},
 '2026-27': {'year': 2026, 'law': 'HB 5001E', 'ch': 'Ch. 2026-232', 'url': 'https://www.flsenate.gov/Session/Bill/2026E/5001E/BillText/er/PDF', 'vetoUrl': 'https://www.flgov.com/eog/sites/default/files/shared/2026/06/2026%20Veto%20List.pdf'},
}
VETO_SRC = {2017: 'journal', 2018: 'unknown', 2019: 'journal'}
def gaa_path(year, kind='gaa'):
    for d in (os.path.join(H, 'raw/gaa'), os.path.join(FS, 'raw/gaa')):
        p = os.path.join(d, f'{kind}{year}.txt')
        if os.path.exists(p): return p
    raise FileNotFoundError(f'{kind}{year}.txt')
def txt_path(fy, form):
    for d in (os.path.join(H, 'raw/txt'), os.path.join(FS, 'raw/txt')):
        p = os.path.join(d, f'{fy}_S{form}.txt')
        if os.path.exists(p) and os.path.getsize(p): return p
    return None
PID = {'Avila': 'bryan-avila', 'Taddeo': 'annette-taddeo', 'Simpson': 'wilton-simpson', 'JJRodriguez': 'jose-javier-rodriguez', 'Campbell': 'daphne-campbell'}
TAG = r'\((?:Senate\s*Form|SF)\s*0*(\d{3,4})\)'
num = lambda s: int(s.replace(',', ''))

def gaa_index(year):
    """form -> list of line amounts (None where the GAA names the form without a figure we can tie to it)."""
    t = re.sub(r'\s+', ' ', open(gaa_path(year)).read())
    idx = {}
    for m in re.finditer(TAG, t):
        f = int(m.group(1))
        # skip the rest of a tag cluster, then look for the dot leader + amount that closes an itemized line
        j = m.end()
        cl = re.match(r'(?:\s*\((?:HB|HF|SB|Senate\s*Form|SF)[^)]*\))*', t[j:]); j += cl.end()
        # itemized line: optional dot leader (2+ dots) then a comma-grouped amount ("... 375,000", "(SF n) 100,000");
        # a single period followed by a number is a sentence end + Specific Appropriation number, not an amount.
        a = re.match(r'\s*(?:(?:\.\s*){1,})?\s*(\d{1,3}(?:,\d{3})+)(?![\d,A-Za-z])', t[j:j + 200])  # one period is allowed: '(Senate Form 2164).   3,500,000' (2022 GAA) is an itemized line; Specific Appropriation numbers have no commas
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
    if VETO_SRC.get(year) == 'unknown': return None
    if VETO_SRC.get(year) == 'journal':
        p = os.path.join(H, 'raw/gaa', f'veto{year}.json')
        return {int(k): v for k, v in json.load(open(p)).items()} if os.path.exists(p) else None
    L = open(gaa_path(year, 'veto')).read().split('\n')
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
    date = g(r'^\s*[23]\.\s*Date of (?:Request|Submission):?\s+(\S+)')  # item 2 on FY2017-18 forms
    sponsor = g(r'^\s*[12]\.\s*Senate Sponsor:?\s+(.+)$') or g(r'Senate Sponsor[\s:|,‘]*(\S.*)$')  # second form for OCR text
    rec_blk = re.search(r'Recipient Contact Information(.*?)(?:Lobbyist Contact Information|If there is a registered lobbyist|$)', t, re.S)
    rb = rec_blk.group(1) if rec_blk else ''
    recipient = (re.search(r'a\.\s*Organization:?\s+(.+)', rb) or [None, ''])[1].strip()
    county = (re.search(r'b\.\s*(?:Municipality and County|County):?\s+(.+)', rb) or [None, ''])[1].strip()
    lb = re.search(r'(?:Lobbyist Contact Information|If there is a registered lobbyist)(.*)', t, re.S)  # FY2018-19 forms use the second wording
    lb = lb.group(1) if lb else ''
    lob = (re.search(r'a\.\s*Name:?\s*(.*)', lb) or [None, ''])[1].strip()
    firm = (re.search(r'b\.\s*Firm(?: Name)?:?[ \t]*(.*)', lb) or [None, ''])[1].strip()
    lob = re.split(r'\s{3,}', lob)[0]; firm = re.split(r'\s{3,}', firm)[0]
    agency = g(r'^\s*5\.\s*State Agency to receive requested funds\s*:?\s+(.+)$')
    if not agency:  # FY2017-18/2018-19 forms: '5. State Agency Contacted?' then 'a. If yes, which state agency?' / 'b. If no, ...'
        m5 = re.search(r'5\.\s*State Agency Contacted\?(.*?)\n\s*6\.', t, re.S)
        if m5:
            blk = m5.group(1)
            a1 = re.search(r'If yes, which state agency\?[ \t]*(\S[^\n]*)', blk)
            a2 = re.search(r'requested\?[ \t]*\n?\s*(\S[^\n]*)', blk)
            agency = (a1 or a2).group(1).strip() if (a1 or a2) else ''
    agency = re.split(r'\s{3,}', agency)[0]
    return {'date': date, 'sponsor': sponsor, 'recipient': recipient, 'county': county, 'lobbyist': lob, 'firm': firm, 'agency': agency}


L = json.load(open(os.path.join(H, 'lfir-list.json')))
import sys
FYS = sys.argv[1:] or list(BUDGET)
missing = []
for fy in FYS:
    B = BUDGET[fy]
    rows = [x for x in L if x['fy'] == fy]
    todo = [r for r in rows if not txt_path(fy, r['form'])]
    if todo: print(fy, 'SKIP: form text missing for', len(todo), 'of', len(rows)); missing.append(fy); continue
    gi, vi = gaa_index(B['year']), veto_index(B['year'])
    out = []
    for r in rows:
        f = int(r['form'])
        p = parse_form(txt_path(fy, r['form']))
        # the Senate's own list names the sponsor; the form's sponsor line is checked too (OCR text may garble or drop it)
        spcheck = bool(re.search(SURN[r['sponsor']], p['sponsor'].lower()))
        if not spcheck:
            if not os.path.exists(txt_path(fy, r['form'])[:-4] + '.ocr'):
                raise SystemExit(f'sponsor mismatch {fy} {f}: list {r["sponsor"]} form {p["sponsor"]!r}')
            print('  note: OCR sponsor line unreadable', fy, f, repr(p['sponsor'][:60]))
        if f in gi:
            kinds = [x[0] for x in gi[f]]; am = [x[1] for x in gi[f]]
            if vi and vi.get(f) and all(a is not None for a in am) and vi[f] > sum(am): am = [x[2] if x[0] == 'p' and x[2] else x[1] for x in gi[f]]
            b = {'status': 'in', 'lines': len(am)}
            if all(a is not None for a in am): b['amount'] = sum(am)
            else:
                b['amount'] = sum(a for a in am if a is not None) or None; b['someUnstated'] = True
            if 'p' in kinds: b['proviso'] = True
            if vi and f in vi:
                # journal veto messages give no figure for a struck proviso item: the whole item is vetoed, so its GAA amount is used
                if vi[f] is None: b['vetoed'] = b.get('amount'); b['vetoAmountFrom'] = 'GAA amount (proviso item struck in the veto message)'
                else: b['vetoed'] = vi[f]
        else:
            b = {'status': 'notIn'}
            if vi and f in vi: b['vetoedButNotFound'] = vi[f] if vi[f] is not None else True
        if vi is None: b['vetoUnknown'] = True
        none = lambda s: bool(re.fullmatch(r'(?i)\s*((none|n/?a|not applicable|-+)\s*)*', s or ''))
        inhouse = re.search(r'^(Miami-Dade County|University of Miami)$', p['firm'] or '')
        lobbied = [] if none(p['lobbyist']) else [{'name': p['lobbyist'], 'firm': None if none(p['firm']) or inhouse else p['firm'], **({'employer': p['firm']} if inhouse else {}), 'for': p['recipient'], 'src': 'form'}]
        try:
            m, d, y = p['date'].split('/'); date = f'{y}-{m.zfill(2)}-{d.zfill(2)}'
        except ValueError:
            date = None
        if r['withdrawn']: b['withdrawn'] = r.get('wnote') or True
        if os.path.exists(txt_path(fy, r['form'])[:-4] + '.ocr'):
            cl = lambda v: re.sub(r'^[\s|:;,._\-—]+|[\s|:;,._\-—]+$', '', v or '')
            p = {k: cl(v) for k, v in p.items()}; ocr = True
        else: ocr = False
        out.append({'fy': fy, 'form': f, 'date': date, 'member': r['sponsor'], 'pid': PID[r['sponsor']], 'title': r['title'],
                    'recipient': p['recipient'], 'county': p['county'], 'agency': p['agency'], 'ask': r['ask'], 'cmte': r['cmte'],
                    'lobbied': lobbied, 'budget': b, 'record': r['pdf'].replace('\\', '/'), **({'textFrom': 'OCR of the scanned form (recipient and county may carry OCR noise)'} if ocr else {})})
    meta = {k: v for k, v in B.items() if k != 'year'} | {'fy': fy}
    J = {'source': f"Florida Senate Local Funding Initiative Requests, Fiscal Year {fy} (flsenate.gov/Session/Appropriations/FY{fy}/LocalFundingRequests), every form filed by the members in this slice; each form PDF read Oct 25-26, 2026. Budget status: each form number looked up as '(Senate Form n)' / '(SF n)' in the enacted GAA ({B['law']}, {B['ch']}) and in the governor's veto list.",
         'budget': meta,
         'counts': {'forms': len(out), 'withdrawn': sum(1 for x in out if x['budget'].get('withdrawn')),
                    'inBudget': sum(1 for x in out if x['budget']['status'] == 'in'),
                    'vetoed': sum(1 for x in out if x['budget'].get('vetoed')),
                    'lobbied': sum(1 for x in out if x['lobbied'])},
         'requests': out}
    if fy == '2017-18':
        J['formNote'] = 'FY2017-18 forms (the first year of the Senate system) have no lobbyist item and no state-agency item, so lobbied is empty because the form does not ask, not because no lobbyist worked on the request.'
    if B['year'] == 2017:
        J['budgetNote'] = 'The 2017 GAA tags only some projects with a Senate form number (125 tags); a form not found may still have been funded under an untagged line, so notIn means only that the form number is not in the act.'
    json.dump(J, open(os.path.join(H, f"requests-{fy}.json"), 'w'), indent=1, ensure_ascii=False)
    per = {}
    for x in out:
        k = per.setdefault(x['member'], {'forms': 0, 'in': 0, 'vetoed': 0, 'lobbied': 0, 'ask': 0, 'funded': 0})
        k['forms'] += 1; k['ask'] += x['ask'] or 0; k['lobbied'] += bool(x['lobbied'])
        if x['budget']['status'] == 'in': k['in'] += 1; k['funded'] += x['budget'].get('amount') or 0
        if x['budget'].get('vetoed'): k['vetoed'] += 1
    print(fy, J['counts'], per)
