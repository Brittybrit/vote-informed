# Writes requests-tenure.json, lda-clients-tenure.json, gm-tenure.json, fec-check-tenure.json (same schemas as scripts/data/federal/*)
import json, glob, os, re, collections, datetime
OUT = '/home/claude/vote-informed/scripts/data/tenure/congress'
R = json.load(open('requests-matched.json')); Q = json.load(open('lda_queries.json'))
# 1) LDA client key per recipient: the most frequent client name among cached filings whose name contains a query and passes a sanity filter
cache = {}
for f in glob.glob('lda_cache/*'):
    n = os.path.basename(f).split('|')[1]; cache.setdefault(n, []).extend(json.load(open(f)))
EXCL = re.compile(r'(?i)(BOSTON|MINNESOTA|INDUSTRY|OHIO|U\.?S\.?A|UNITED STATES OF AMERICA|NORTH MIAMI|MIAMI BEACH|MIAMI GARDENS|PUBLIC SCHOOLS|SCHOOL BOARD|FAIR AND EXPOSITION|TRANSPORTATION PLANNING|HOMESTEADERS|CARNEGIE|OUR CHILDREN|MONROE COUNTY HOSPITAL|MONROE COUNTY WATER|NATIONAL FISH|PUBLIC HEALTH TRUST)')
def norm(c):
    c = c.upper()
    c = re.sub(r'^(THE CORMAC GROUP, LLC|CORMAC GROUP|BECKER & POLIAKOFF P\.A\.|ALCALDE & FAY) (ON BEHALF OF|\()\s*', '', c).rstrip(')')
    c = re.sub(r'^THE ', '', c); c = re.sub(r'[,]? ?(FLORIDA|FL)$', '', c).strip(' ,')
    c = c.replace('MIAMI DADE COUNTY', 'MIAMI-DADE COUNTY').replace('CITY OF HOMESTEAD FLORIDA', 'CITY OF HOMESTEAD').replace('BROWARD COUNTY FLORIDA', 'BROWARD COUNTY')
    c = re.sub(r'BOARD OF TRUSTEES$', '', c).replace('FLORIDA INTERNATIONAL UNIVERSITY ', 'FLORIDA INTERNATIONAL UNIVERSITY').strip()
    c = re.sub(r', INC\.?$', '', c); c = c.replace('MICCOSUKEE TRIBE OF INDIANS OF', 'MICCOSUKEE TRIBE').replace('MICCOSUKEE TRIBE OF INDIANS', 'MICCOSUKEE TRIBE').strip()
    c = c.replace('MUSEUM OF SCIENCE', 'MUSEUM OF SCIENCE (FROST SCIENCE)') if c == 'MUSEUM OF SCIENCE' else c
    return c
filings = collections.defaultdict(list)  # client key -> filings
qkey = {}
for n, rows in cache.items():
    for r in rows:
        if EXCL.search(r['client']): continue
        k = norm(r['client']); filings[k].append(r)
        qkey.setdefault(n, collections.Counter())[k] += 1
def client_of(rec):
    best = collections.Counter()
    for n in Q.get(rec, []):
        best.update(qkey.get(n, {}))
    return best.most_common(1)[0][0] if best else None
for r in R:
    c = client_of(r['recipient'])
    # recipient department of a county maps to the county; sheriff/police/agency recipients stay as the agency's own client only if found
    r['client'] = c
# 2) lda-clients-tenure: client -> [[registrant, lobbyists, first posted, uuid, n periods]] for 2021-2024
lda = {}
for k, rows in filings.items():
    by = collections.defaultdict(list)
    for r in rows: by[r['registrant']].append(r)
    out = []
    for reg, rs in by.items():
        rs.sort(key=lambda r: r['posted']); lobs = sorted({l for r in rs for l in r['lobbyists']})
        periods = {(r['year'], r['type']) for r in rs if re.match(r'Q[1-4]|MM|YY|RR|[1-4]', r['type'] or '')}
        out.append([reg, lobs, rs[0]['posted'], rs[0]['uuid'], len(periods), sorted({r['year'] for r in rs})])
    lda[k] = sorted(out, key=lambda x: x[2])
used = {r['client'] for r in R if r['client']}
lda = {k: v for k, v in lda.items() if k in used}
json.dump({'note': 'LDA (lda.gov API /filings, client_name search) registrations and quarterly reports, filing years 2021-2024, for FY2022-FY2025 earmark recipients. client -> [[registrant, lobbyists named for this client (any report), first report posted, a filing uuid, number of report periods, filing years]]. Filing URL: https://lda.gov/filings/public/filing/<uuid>/print/. Read Oct 25, 2026. Same shape as scripts/data/federal/lda-clients.json plus the years column.',
           'clients': lda}, open(f'{OUT}/lda-clients-tenure.json', 'w'), indent=1)
# 3) requests-tenure (same keys as requests.json + funded fields)
outR = []
for r in R:
    o = {k: r.get(k) for k in ('member', 'fy', 'subcommittee', 'recipient', 'project', 'address', 'amount', 'source', 'memberUrl', 'client')}
    if r.get('amountText'): o['amountText'] = r['amountText']
    o['funded'] = r.get('funded'); o['fundedSource'] = ('https://files.gao.gov/multimedia/gao-25-107549/interactive/2024_Tracking_the_Funds_data_with_map.zip' if r['fy'] != 'FY2025' else None)
    if r.get('gaoProject'): o['fundedAs'] = r['gaoProject']
    if r.get('gaoShared'): o['fundedWith'] = r['gaoShared']
    if r.get('fundedNote'): o['fundedNote'] = r['fundedNote']
    if r['fy'] == 'FY2025': o['fundedNote'] = 'FY2025 was funded by a full-year continuing resolution (P.L. 119-4) with no Community Project Funding, so no FY2025 request was funded.'
    outR.append(o)
json.dump(outR, open(f'{OUT}/requests-tenure.json', 'w'), indent=1)
# 4) gm-tenure: LD-203 gifts from firms/lobbyists registered for a client the member asked money for
lob_of = {}
for k, regs in lda.items():
    for reg, lobs, *_ in regs: lob_of.setdefault(k, []).append((reg, set(lobs)))
gm = collections.defaultdict(list); fecrows = []
MEMBER_RE = {'Diaz-Balart': 'DIAZ-BALART', 'Salazar': 'SALAZAR', 'Gimenez': 'GIMENEZ', 'Donalds': 'DONALDS', 'Moskowitz': 'MOSKOWITZ'}
def norm_reg(s): return re.sub(r'[^A-Z0-9]', '', (s or '').upper().replace('LLC', '').replace('LLP', '').replace('INC', '').replace('P.A.', '').replace('PA', ''))[:18]
for f in glob.glob('ld203_cache/*'):
    m = os.path.basename(f).split('|')[0]
    for rep in json.load(open(f)):
        for it in rep['items']:
            hon = ((it.get('honoree_name') or '') + ' ' + (it.get('payee_name') or '')).upper()
            if MEMBER_RE[m] not in hon: continue
            if 'VICTORY' in hon or 'JOINT' in hon: continue   # JFCs left out as in gm.json
            for c in {r['client'] for r in R if r['member'] == m and r['client']}:
                for reg, lobs in lob_of.get(c, []):
                    same_firm = norm_reg(rep['registrant']) == norm_reg(reg)
                    kind = 'org' if rep['filerType'] == 'organization' else 'lob'
                    if not same_firm: continue
                    if kind == 'lob' and rep['lobbyist'] and lobs and rep['lobbyist'] not in lobs:
                        # lobbyist of the firm but not named for this client still counts (firm rule)
                        pass
                    gm[m + '|' + c].append([reg, kind, rep['lobbyist'] if kind == 'lob' else None, (it.get('contributor_name') or 'SELF').upper() if kind == 'org' else ('SELF' if not it.get('contributor_name') or rep['lobbyist'] in (it.get('contributor_name') or '').upper() else it['contributor_name'].upper()),
                                            it.get('payee_name'), float(it['amount']), it['date'], rep['uuid'], rep['posted'], 1])
for k in gm: gm[k] = sorted({json.dumps(x): x for x in gm[k]}.values(), key=lambda x: x[6])
json.dump(gm, open(f'{OUT}/gm-tenure.json', 'w'), indent=1)
print(len(outR), 'requests;', sum(1 for r in outR if r['client']), 'with client;', len(lda), 'clients;', sum(len(v) for v in gm.values()), 'LD-203 gifts')
print(collections.Counter((r['member'], bool(r['client'])) for r in outR))
print(sorted({(r['recipient'], r['client']) for r in outR}, key=lambda x: str(x)))
