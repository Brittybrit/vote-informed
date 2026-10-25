"""Writes offices.json (PRIOR.md shape) for the Senate service in this slice."""
import json, os, glob
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FS = 'https://www.flsenate.gov/Senators/'
CONST = 'Fla. Const. art. III, s. 15(d): senators\' terms begin upon election'
def files(member, fys, extra):
    fl = [f'requests-{fy}.json' for fy in fys if os.path.exists(os.path.join(H, f'requests-{fy}.json'))]
    return fl + ['bills/rolls.jsonl', 'bills/vote-jobs.jsonl'] + extra
O = [
 {'pid': 'bryan-avila', 'office': 'State Senator', 'body': 'fl-senate', 'district': '39', 'start': '2022-11-08', 'end': '2026-08-25', 'giftsFrom': '2020-11-04',
  'source': {'label': 'Florida Senate, Senators 2022-2024 and 2024-2026 (District 39; "Resigned 8/25/2026"); elected Nov 8, 2022 (' + CONST + ')', 'url': FS + '2024-2026/S39/5459'},
  'fys': ['2023-24', '2024-25', '2025-26', '2026-27'], 'donors': ['donors/avila-sts-2022.tsv', 'donors/avila-sts-2026.tsv', 'donors/pc<acct>-avila.tsv (pending, needs-browser.md 1)']},
 {'pid': 'annette-taddeo', 'office': 'State Senator', 'body': 'fl-senate', 'district': '40', 'start': '2017-09-26', 'end': '2022-11-08', 'giftsFrom': '2016-11-09',
  'source': {'label': 'Florida Senate, Senators 2016-2018 ("Elected 9/26/2017", special election), 2018-2020, 2020-2022 (District 40, no resignation listed); term ended at the Nov 8, 2022 general election', 'url': FS + '2020-2022/S40/5331'},
  'fys': ['2018-19', '2019-20', '2020-21', '2021-22', '2022-23'], 'donors': ['donors/taddeo-sts-*.tsv, donors/pc<acct>-taddeo.tsv (pending, needs-browser.md 2)']},
 {'pid': 'wilton-simpson', 'office': 'State Senator', 'body': 'fl-senate', 'district': '10', 'start': '2016-11-08', 'end': '2022-11-08', 'giftsFrom': '2014-11-05',
  'source': {'label': 'Florida Senate, Senators 2016-2018, 2018-2020, 2020-2022 (District 10; President 2020-2022); elected Nov 8, 2016, term ended at the Nov 8, 2022 general election', 'url': FS + '2020-2022/S10/5104'},
  'fys': ['2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23'], 'donors': ['donors/simpson-sts-*.tsv, donors/pc<acct>-simpson.tsv (pending, needs-browser.md 3)']},
 {'pid': 'wilton-simpson', 'office': 'State Senator', 'body': 'fl-senate', 'district': '18', 'start': '2012-11-06', 'end': '2016-11-08', 'giftsFrom': '2010-11-03',
  'source': {'label': 'Florida Senate, Senators 2012-2014 and 2014-2016 (District 18); elected Nov 6, 2012 (' + CONST + ')', 'url': FS + '2014-2016/S18/5104'},
  'fys': [], 'donors': ['donors/simpson-sts-2012.tsv, donors/simpson-sts-2016.tsv (pending, needs-browser.md 3)'],
  'note': 'No Senate Local Funding Initiative Request data is posted for FY2013-14 through FY2016-17 (flsenate.gov: "not available at this time").'},
 {'pid': 'jose-javier-rodriguez', 'office': 'State Senator', 'body': 'fl-senate', 'district': '37', 'start': '2016-11-08', 'end': '2020-11-03', 'giftsFrom': '2014-11-05',
  'source': {'label': 'Florida Senate, Senators 2016-2018 and 2018-2020 (District 37); elected Nov 8, 2016, term ended at the Nov 3, 2020 general election', 'url': FS + '2018-2020/S37/5202'},
  'fys': ['2017-18', '2018-19', '2019-20', '2020-21'], 'donors': ['donors/jjrodriguez-sts-*.tsv, donors/pc<acct>-jjrodriguez.tsv (pending, needs-browser.md 4)']},
 {'pid': 'daphne-campbell', 'office': 'State Senator', 'body': 'fl-senate', 'district': '38', 'start': '2016-11-08', 'end': '2018-11-06', 'giftsFrom': '2014-11-05',
  'source': {'label': 'Florida Senate, Senators 2016-2018 (District 38); elected Nov 8, 2016, term ended at the Nov 6, 2018 general election', 'url': FS + '2016-2018/S38/5195'},
  'fys': ['2017-18', '2018-19'], 'donors': ['donors/campbell-sts-*.tsv (pending, needs-browser.md 5)']},
]
out = []
for o in O:
    r = {k: v for k, v in o.items() if k not in ('fys', 'donors')}
    r['files'] = files(o['pid'], o['fys'], ['bills/enacted.jsonl', 'bills/stageA.jsonl', 'bills/stageB.jsonl'] + o['donors'])
    out.append(r)
json.dump(out, open(os.path.join(H, 'offices.json'), 'w'), indent=1, ensure_ascii=False)
print(len(out))
