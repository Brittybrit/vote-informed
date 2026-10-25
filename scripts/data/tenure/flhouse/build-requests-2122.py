"""House project requests for the 2021 and 2022 sessions (FY 2021-22, FY 2022-23) for Angie Nixon and Kevin Chambliss,
who were first seated Nov 4, 2020. In those years the House filed each request as an Appropriations Project bill
(HB 2001 and up) with the member's Appropriations Project Request form attached; the list and each form were read in the
browser (flhouse.gov/Sections/Appropriations/projectbills.aspx?SessionId=90|93) into raw/apb-<year>.txt.
Budget status: each bill number looked up as "(HB n)" in that year's enrolled GAA (SB 2500 Ch. 2021-36; HB 5001
Ch. 2022-156) and in the governor's veto list, using the same readers as ../flsenate/build-requests.py
(raw texts in ../flsenate/raw/gaa/). House project-bill numbers restart each session, so each year is matched only
against its own GAA. Writes requests-2021.json and requests-2022.json in the shape of requests-2023.json.
Run: python3 -I scripts/data/tenure/flhouse/build-requests-2122.py"""
import json, os, re
H = os.path.dirname(os.path.abspath(__file__))
SEN = os.path.join(H, '..', 'flsenate', 'build-requests.py')
ns = {'__file__': os.path.abspath(SEN)}
exec(open(SEN).read().split("L = json.load(open(os.path.join(H, 'lfir-list.json')))")[0], ns)
ns['TAG'] = r'\(HB\s*0*(\d{4})\)'
BUDGET = {
    2021: {'law': 'SB 2500', 'ch': 'Ch. 2021-36', 'fy': '2021-22', 'url': 'https://www.flsenate.gov/Session/Bill/2021/2500/BillText/er/PDF',
           'vetoUrl': 'https://www.flgov.com/eog/sites/default/files/press/2021-Veto-List-Final.pdf'},
    2022: {'law': 'HB 5001', 'ch': 'Ch. 2022-156', 'fy': '2022-23', 'url': 'https://www.flsenate.gov/Session/Bill/2022/5001/BillText/er/PDF',
           'vetoUrl': 'https://www.flgov.com/eog/sites/default/files/press/2022-Veto-List-Final.pdf'},
}
SESSION = {2021: 90, 2022: 93}
NAME = {'Nixon': 'Angela Nixon', 'Chambliss': 'Kevin Chambliss'}
CMTE = {'Department of Health': 'Health Care Appropriations Subcommittee', 'Department of Children and Families': 'Health Care Appropriations Subcommittee',
        'Department of Corrections': 'Justice Appropriations Subcommittee', 'Department of Juvenile Justice': 'Justice Appropriations Subcommittee',
        'Department of Law Enforcement': 'Justice Appropriations Subcommittee', 'Department of Economic Opportunity': 'Transportation & Economic Development Appropriations Subcommittee',
        'Department of Transportation': 'Transportation & Economic Development Appropriations Subcommittee', 'Division of Emergency Management': 'Transportation & Economic Development Appropriations Subcommittee',
        'Department of Environmental Protection': 'Agriculture & Natural Resources Appropriations Subcommittee', 'Department of Agriculture and Consumer Services': 'Agriculture & Natural Resources Appropriations Subcommittee',
        'Department of Education': 'PreK-12 Appropriations Subcommittee'}
num = lambda s: int(s.replace('$', '').replace(',', ''))
none = lambda s: (s or '').strip() in ('', 'None', 'N/A', 'n/a', 'none')
for y, B in BUDGET.items():
    f = os.path.join(H, 'raw', f'apb-{y}.txt')
    if not os.path.exists(f): print(y, 'no raw list yet'); continue
    gi, vi = ns['gaa_index'](y), ns['veto_index'](y)
    out = []
    for l in open(f):
        if l.startswith('#') or not l.strip(): continue
        c = l.rstrip('\n').split('~')
        bill, member, funds, billId, apr, date, sponsor, tot, rec, county, lob, firm, agency, title = c
        if member not in NAME or NAME[member].split()[-1] not in sponsor: raise SystemExit(f'sponsor mismatch {bill}: {member} / {sponsor}')
        n = int(bill.split()[-1])
        if n in gi:
            am = [a for _, a in gi[n]]; b = {'status': 'in', 'lines': len(am)}
            if all(a is not None for a in am): b['amount'] = sum(am)
            if n in vi: b['vetoed'] = vi[n]
        else:
            b = {'status': 'notIn'}
        m, d, yy = date.split('/')
        out.append({'fy': y, 'form': n, 'bill': bill, 'billId': int(billId), 'apr': apr, 'date': f'{yy}-{m}-{d}', 'member': member, 'title': title,
                    'recipient': rec, 'county': county or None, 'agency': agency, 'ask': num(funds), 'cmte': CMTE.get(agency, agency),
                    'lobbied': [] if none(lob) else [{'name': lob, 'firm': None if none(firm) else firm, 'for': rec, 'src': 'form'}],
                    'budget': b, 'record': f'https://www.flhouse.gov/Sections/Bills/billsdetail.aspx?BillId={billId}'})
    J = {'source': f"Florida House Appropriations Projects {y} (flhouse.gov/Sections/Appropriations/projectbills.aspx?SessionId={SESSION[y]}): every project bill filed by Nixon and Chambliss, with the attached Appropriations Project Request form read Oct 25, 2026 (lobbyist, recipient, date). Budget status: the bill number looked up as '(HB n)' in the enrolled GAA ({B['law']}, {B['ch']}) and in the governor's veto list.",
         'budget': B, 'counts': {'forms': len(out), 'inBudget': sum(1 for x in out if x['budget']['status'] == 'in'), 'vetoed': sum(1 for x in out if x['budget'].get('vetoed')), 'lobbied': sum(1 for x in out if x['lobbied'])},
         'requests': out}
    json.dump(J, open(os.path.join(H, f'requests-{y}.json'), 'w'), indent=1, ensure_ascii=False)
    print(y, J['counts'], {k: sum(1 for x in out if x['member'] == k) for k in NAME})
