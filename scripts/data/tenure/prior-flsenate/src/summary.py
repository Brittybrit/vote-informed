"""Builds summary.md from this slice's files (rerun after any stage finishes)."""
import json, os, collections, glob, datetime
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = os.path.dirname(H)
jl = lambda f: [json.loads(l) for l in open(f) if l.strip()] if os.path.exists(f) else []
iso = lambda d: (lambda m, dd, y: f'{y}-{int(m):02d}-{int(dd):02d}')(*d.split('/')) if d and '/' in d else d
rd = lambda r: iso(r.get('d')) or (r['session'][:4] + '-03-01')  # a sheet with no date on its job (2025-26 laws missing from universe.json votes) falls in its session
MEM = [('bryan-avila', 'Bryan Avila', 'Avila', 'Avila', '2022-11-08', '2026-08-25', 'SD 39'),
       ('annette-taddeo', 'Annette Taddeo', 'Taddeo', 'Taddeo', '2017-09-26', '2022-11-08', 'SD 40'),
       ('wilton-simpson', 'Wilton Simpson', 'Simpson', 'Simpson', '2016-11-08', '2022-11-08', 'SD 10'),
       ('wilton-simpson', 'Wilton Simpson', 'Simpson', 'Simpson', '2012-11-06', '2016-11-08', 'SD 18'),
       ('jose-javier-rodriguez', 'Jose Javier Rodriguez', 'JJRodriguez', 'Rodriguez', '2016-11-08', '2020-11-03', 'SD 37'),
       ('daphne-campbell', 'Daphne Campbell', 'Campbell', 'Campbell', '2016-11-08', '2018-11-06', 'SD 38')]
SES = {('bryan-avila', 'SD 39'): [], ('annette-taddeo', 'SD 40'): ['2018', '2019', '2020'],
       ('wilton-simpson', 'SD 10'): ['2017', '2017A', '2018', '2019', '2020'], ('wilton-simpson', 'SD 18'): ['2013', '2014', '2014A', '2015', '2015A', '2016'],
       ('jose-javier-rodriguez', 'SD 37'): ['2017', '2017A', '2018', '2019', '2020'], ('daphne-campbell', 'SD 38'): ['2017', '2017A', '2018']}
# sessions and their screening status
E = jl(os.path.join(H, 'bills/enacted.jsonl'))
B = {x['ch']: x for x in jl(os.path.join(H, 'bills/stageB.jsonl'))}
ses_tot = collections.Counter(e['session'] for e in E)
ses_scr = collections.Counter(e['session'] for e in E if e['chapter'] in B)
ses_q = collections.Counter(e['session'] for e in E if B.get(e['chapter'], {}).get('b'))
R = jl(os.path.join(H, 'bills/rolls.jsonl'))
J = {(j['ch'], j['u']) for j in jl(os.path.join(H, 'bills/vote-jobs.jsonl'))}
req = {}
for f in sorted(glob.glob(os.path.join(H, 'requests-*.json'))):
    for r in json.load(open(f))['requests']: req.setdefault(r['member'], []).append(r)
L = []
w = L.append
w('# prior-flsenate summary\n')
w(f'Generated {datetime.date.today()} by src/summary.py. Florida Senate service of five candidates who are not on the site\'s Senate list. '
  'Universe rules: STANDARD.md / PRIOR.md (every Local Funding Initiative Request the member filed; every enacted law whose own final staff analysis names a kind of business that benefits, with the member\'s Senate final-passage vote).\n')
w('## Laws screened, by session\n')
w('| Session | Enacted laws | Screened (stage B) | Qualify | Source of screen |')
w('|---|---|---|---|---|')
for s in sorted(ses_tot, reverse=True):
    w(f'| {s} | {ses_tot[s]} | {ses_scr[s]} | {ses_q[s]} | this slice (bills/stageB.jsonl) |')
w('| 2021, 2021A/B/C, 2022, 2022B/C/E | | | 44 | ../flsenate/bills/stageB.jsonl (reused) |')
w('| 2022A, 2022D, 2023B, 2023, 2023C, 2024 | | | 87 | ../flhouse/bills/stageB.jsonl (reused) |')
w('| 2025, 2025A/B/C, 2026, 2026D/E/F | | | 56 | scripts/data/state/bills/universe.json (reused) |\n')
for pid, name, rk, vk, a, b, dist in MEM:
    w(f'## {name} ({pid}), State Senator {dist}, {a} to {b}\n')
    rs = [r for r in req.get(rk, []) if True]
    if dist == 'SD 18':
        rs = []
        w('- Requests: none to list. flsenate.gov posts no Local Funding Initiative Request data for FY2013-14 through FY2016-17 ("Local Funding Initiative Request data is not available at this time"); the Senate request system starts with FY2017-18.')
    elif rs:
        by = collections.defaultdict(list)
        for r in rs: by[r['fy']].append(r)
        for fy in sorted(by):
            x = by[fy]
            inb = [r for r in x if r['budget']['status'] == 'in']
            vet = [r for r in x if r['budget'].get('vetoed')]
            unk = any(r['budget'].get('vetoUnknown') for r in x)
            fund = sum(r['budget'].get('amount') or 0 for r in inb)
            w(f'- Requests FY{fy}: {len(x)} forms, asked ${sum(r["ask"] or 0 for r in x):,}; {len(inb)} in the enacted budget (${fund:,}{" at least; some lines state no figure" if any(r["budget"].get("someUnstated") for r in inb) else ""}); '
              + (f'veto status unknown (no 2018 veto list)' if unk else f'{len(vet)} vetoed') + f'; {sum(1 for r in x if r["lobbied"])} name a lobbyist; {sum(1 for r in x if r["budget"].get("withdrawn"))} withdrawn. (requests-{fy}.json)')
    elif rk == 'Taddeo':
        pass
    if rk == 'Taddeo': w('- Requests FY2022-23: none filed (her name is not on the FY2022-23 list).')
    # rolls in tenure
    mine = [r for r in R if a <= rd(r) <= b and r['r'].get(vk) not in (None, 'not seated')] if True else []
    if vk == 'Rodriguez': mine = [r for r in mine if rd(r) < '2020-11-03']
    c = collections.Counter(r['r'][vk] for r in mine)
    ses = collections.Counter(r['session'] for r in mine)
    w(f'- Laws (qualifying, Senate final passage while seated): {len(mine)} roll calls read; ' + (', '.join(f'{k} {v}' for k, v in c.most_common()) or 'none yet') + '. By session: ' + (', '.join(f'{k} {v}' for k, v in sorted(ses.items())) or 'none yet') + '. (bills/rolls.jsonl)')
    nsr = [r for r in R if a <= rd(r) <= b and r['r'].get(vk) == 'not seated']
    if nsr and vk != 'Rodriguez': w(f'  - Check: {len(nsr)} sheets in the term window do not list {vk} (see rolls.jsonl).')
    for ss in SES.get((pid, dist), []):
        if ss in ses_tot and ses_scr[ss] < ses_tot[ss]:
            w(f'  - GAP: session {ss}: {ses_scr[ss]} of {ses_tot[ss]} enacted laws screened so far ({ses_q[ss]} qualify among them); the rest are not yet read (resume: progress.md). Roll calls above cover only screened laws, so the law count is "at least".')
    w('- Gifts: 0 so far. DOE contributions need the browser (needs-browser.md); no list or share line until they are in.\n')
open(os.path.join(H, 'summary.md'), 'w').write('\n'.join(L) + '\n')
print('\n'.join(L))
G = '''
## Gaps and notes (all members)

- Laws not yet screened: 2019 chapters after 2019-61 (128 laws), all of 2018, 2017A, 2017 (Taddeo, Simpson, JJ Rodriguez,
  Campbell) and all of 2013-2016 (Simpson SD 18). Every one is listed in bills/enacted.jsonl (1,844 laws, no chapter gaps).
  Reason: flsenate.gov answers about half of /Session/ page requests with 429 while the House agent shares it, so stage A ran at
  about one law per 1-2 minutes; the background job reached its 2-hour limit and was not restarted. Resume steps in progress.md.
- Donors: none pulled. Every DOE candidate and committee account is a browser request in needs-browser.md (items 1-5). No tie,
  list or share line can be made until they are in.
- FY2018-19 vetoes unknown for every form (no 2018 veto list; needs-browser.md item 6). Forms "in" the budget may have been vetoed.
- FY2017-18: the 2017 GAA tags only 125 projects with a Senate form number, so "notIn" there means only that the form number is
  not in the act; 79 of 88 forms are scans read by OCR (textFrom on each record); these forms have no lobbyist item.
- FY2017-18 and FY2019-20 vetoes come from the Governor's veto message in the Senate Journal; a struck proviso item with no
  figure uses the form's GAA amount (vetoAmountFrom on the record).
- Taddeo filed no Senate request for FY2022-23.
- Simpson was Senate President 2020-2022; "not voting" on 6 sheets is from the sheet (the President often does not vote).
- 'Rodriguez' on a Senate sheet is read as Jose Javier Rodriguez only for sheets dated before 2020-11-03.
- Found in another slice (not edited): ../flsenate/build-requests.py (1) takes the next line ("c. E-mail Address ...") as the
  firm when a form's Firm Name is blank (107 lobbied entries across its four request files), and (2) reads an itemized GAA line
  closed by one period ("(SF 1423) (HF 1306).   2,000,000") as a proviso sentence. Both are fixed in this slice's copy.
- House service of Avila (2014-2022), JJ Rodriguez (2012-2016) and Campbell (2010-2016) is not in this slice.
'''
open(os.path.join(H, 'summary.md'), 'a').write(G)
