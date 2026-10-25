"""Builds requests-2023.json and requests-2024.json from raw/apr-<year>.txt (Florida House APR forms, read
Oct 25, 2026) plus budget lines found in the enrolled GAA and the governor's veto list. Same request fields as
scripts/data/state/nixon.json "requests", plus member and lobbied (from form item 9).
Run: python3 scripts/data/tenure/flhouse/build-requests.py"""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
KEY = {'Basabe': 'Basabe', 'Gantt': 'Gantt', 'Porras': 'Porras', 'Chambliss': 'Chambliss', 'Redondo': 'Redondo', 'Nixon': 'Nixon'}
BUDGET = {
 2023: {'law': 'SB 2500', 'ch': 'Ch. 2023-239', 'fy': '2023-24', 'url': 'https://www.flsenate.gov/Session/Bill/2023/2500/BillText/er/PDF',
        'vetoUrl': 'https://www.flgov.com/eog/sites/default/files/press/Final-Veto-List-2023.pdf', 'sessionid': 99},
 2024: {'law': 'HB 5001', 'ch': 'Ch. 2024-231', 'fy': '2024-25', 'url': 'https://www.flsenate.gov/Session/Bill/2024/5001/BillText/er/PDF',
        'vetoUrl': 'https://www.flgov.com/eog/sites/default/files/press/FY_2024-25_Veto_List.pdf', 'sessionid': 103},
}
# form -> list of GAA line amounts ("(HF n)" in the enrolled GAA text); proviso items noted
IN = {
 2023: {99: [400000], 100: [400000], 104: [300000, 550000], 110: [750000], 199: [250000], 294: [150000], 295: [500000], 348: [350000],
        428: [350000], 434: [1000000], 437: [100000], 442: [250000], 468: [400000], 826: [1000000], 827: [850000], 828: [1605560],
        829: [1605000], 830: [750000], 831: [1168337], 832: [1344447], 833: [350000, 850000], 917: [1120000], 918: [150000],
        1001: [774000], 1002: [500000], 1061: [400000], 1066: [500000], 1072: [179500], 1076: [202500], 1077: [225000], 1129: [350000],
        1151: [737500], 1229: [350000], 1443: [580000], 1444: [275000], 1445: [830000], 1446: [70000], 1896: [600000],
        1958: [350000, 150000], 2025: [1000000], 2219: [100000], 2222: [250000], 2227: [500000], 2230: [500000]},
 2024: {1987: [387500], 2115: [500000], 2150: [300000], 2257: [250000], 2395: [600000], 2415: [200000, 50000], 2418: [100000],
        2836: [250000], 2840: [600000], 2844: [300000], 2847: [2500000], 2850: [500000], 2851: [1500000], 2943: [286250],
        3096: [200000], 3102: [850000], 3103: [400000], 3109: [750000]},
}
NOTE = {(2023, 832): 'Proviso: $544,770 Grants and Donations Trust Fund + $799,677 Medical Care Trust Fund to Citrus Health Network (psychiatry residency slots).',
        (2023, 918): 'Proviso in Specific Appropriation 1576.', (2023, 2222): 'Proviso in Specific Appropriation 1445.'}
VETO = {
 2023: {99: 400000, 104: 850000, 830: 750000, 917: 1120000, 918: 150000, 1061: 400000, 1896: 600000, 1958: 500000, 2025: 1000000,
        2219: 100000, 2222: 250000, 2230: 500000},
 2024: {1987: 387500, 2115: 500000, 2150: 300000, 2418: 100000, 2836: 250000, 2844: 300000, 2847: 2500000, 2850: 500000, 3096: 200000, 3103: 400000},
}
for fy in (2023, 2024):
    out = []
    for line in open(os.path.join(H, 'raw', f'apr-{fy}.txt')):
        if not line.strip(): continue
        form, doc, sp, date, ask, rec, county, lob, firm, cmte, title = line.rstrip('\n').split('~')
        m, d, y = date.split('/'); f = int(form)
        if f in IN[fy]:
            b = {'status': 'in', 'amount': sum(IN[fy][f]), 'lines': len(IN[fy][f])}
            if f in VETO[fy]: b['vetoed'] = VETO[fy][f]
        else: b = {'status': 'notIn'}
        if (fy, f) in NOTE: b['note'] = NOTE[(fy, f)]
        lobbied = [] if lob in ('None', '') else [{'name': lob, 'firm': None if firm in ('None', '') else firm, 'for': rec, 'src': 'form'}]
        out.append({'fy': fy, 'form': f, 'docId': int(doc), 'date': f'{y}-{m}-{d}', 'member': KEY[sp], 'title': title, 'recipient': rec,
                    'county': county, 'ask': int(ask), 'cmte': cmte, 'lobbied': lobbied, 'budget': b,
                    'record': f"https://www.flhouse.gov/api/document/apr?sessionid={BUDGET[fy]['sessionid']}&id={doc}"})
    meta = {k: v for k, v in BUDGET[fy].items() if k != 'sessionid'}
    J = {'source': f"Florida House Appropriations Project Requests for the {fy} session (flhouse.gov/AppropriationProjectRequests/{fy}), every form filed by the members in this slice, each form read Oct 25, 2026. Budget status: each form number looked up as '(HF n)' in the enrolled GAA ({meta['law']}, {meta['ch']}) and in the governor's {fy} veto list.",
         'budget': meta, 'counts': {'forms': len(out), 'inBudget': sum(1 for r in out if r['budget']['status'] == 'in'),
         'vetoed': sum(1 for r in out if r['budget'].get('vetoed'))}, 'requests': out}
    json.dump(J, open(os.path.join(H, f'requests-{fy}.json'), 'w'), indent=1, ensure_ascii=False)
    print(fy, J['counts'], {k: sum(1 for r in out if r['member'] == k) for k in KEY})
