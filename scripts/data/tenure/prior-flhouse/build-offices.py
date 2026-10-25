"""Writes offices.json (PRIOR.md): one entry per person and prior Florida House seat, with the files holding that
seat's actions (requests, laws with House votes) and donors. Files that do not exist yet are listed under "pending".
Run: python3 scripts/data/tenure/prior-flhouse/build-offices.py"""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
R = 'https://www.flhouse.gov/Sections/Representatives/representatives.aspx?legislativetermid='
O = [
 ('vicki-l-lopez', 'Lopez', '113', '2022-11-09', '2025-11-18', '2020-11-04', 'Florida House Representatives 2022-2024 (11/09/22 - 11/05/24) and 2024-2026 (11/06/24 - 11/18/25, Resigned)', R + '91',
  [2023, 2024, 2025, 2026], ['2023', '2024', '2025'], ['donors/lopez-house.tsv', 'donors/pc80020-pre2025.tsv', '../../county/donors/pc80020.tsv']),
 ('byron-donalds', 'Donalds', '80', '2016-11-09', '2020-11-03', '2014-11-05', 'Florida House Representatives 2016-2018 (11/09/16 - 11/06/18) and 2018-2020 (11/07/18 - 11/03/20)', R + '88',
  [2017, 2018, 2019, 2020], ['2017', '2018', '2019', '2020'], ['donors/donalds-house.tsv']),
 ('bryan-avila', 'Avila', '111', '2014-11-04', '2022-11-08', '2012-11-07', 'Florida House Representatives 2014-2016 through 2020-2022 (11/04/14 - 11/08/22)', R + '89',
  [2017, 2018, 2019, 2020, 2021, 2022], ['2015', '2016', '2017', '2018', '2019', '2020', '2122', '2023'], ['donors/avila-house.tsv']),
 ('blaise-ingoglia', 'Ingoglia', '35', '2014-11-04', '2022-11-08', '2012-11-07', 'Florida House Representatives 2014-2016 through 2020-2022 (11/04/14 - 11/08/22)', R + '89',
  [2017, 2018, 2019, 2020, 2021, 2022], ['2015', '2016', '2017', '2018', '2019', '2020', '2122', '2023'], ['donors/ingoglia-house.tsv', 'donors/pc70076-pre2020.tsv', '../flsenate/donors/pc70076.tsv']),
 ('ana-maria-rodriguez', 'Rodriguez', '105', '2018-11-07', '2020-11-03', '2016-11-09', 'Florida House Representatives 2018-2020 (11/07/18 - 11/03/20)', R + '88',
  [2019, 2020], ['2019', '2020'], ['donors/rodriguez-house.tsv', 'donors/pc70258-pre2018.tsv', '../flsenate/donors/pc70258.tsv']),
 ('javier-fernandez', 'Fernandez', '114', '2018-05-01', '2020-10-02', '2016-11-09', 'Florida House Representatives 2016-2018 (05/01/18 - 11/06/18, special election) and 2018-2020 (11/07/18 - 10/02/20, Resigned)', R + '88',
  [2019, 2020], ['2019', '2020'], ['donors/fernandez-house.tsv']),
 ('jared-moskowitz', 'Moskowitz', '97', '2012-11-07', '2019-01-11', '2010-11-03', 'Florida House Representatives 2012-2014 through 2018-2020 (11/07/12 - 01/11/19, Resigned)', R + '85',
  [2017, 2018], ['2013', '2014', '2015', '2016', '2017', '2018'], ['donors/moskowitz-house.tsv']),
]
out = []
for pid, key, dist, s, e, g, label, url, req, bills, donors in O:
    files = [f'requests-{y}.json' for y in req] + [f'bills-{b}.json' for b in bills] + donors
    have = [f for f in files if os.path.exists(os.path.join(H, f))]
    out.append({'pid': pid, 'key': key, 'office': 'State Representative', 'body': 'fl-house', 'district': dist, 'start': s, 'end': e, 'giftsFrom': g,
                'source': {'label': label, 'url': url}, 'files': have, 'pending': [f for f in files if f not in have],
                'noRequestSystem': {'Moskowitz': '2013-2014: no House member-request system; 2015-2016: request forms existed but are not posted online (see progress.md)',
                                    'Avila': '2015-2016: request forms existed but are not posted online (see progress.md)',
                                    'Ingoglia': '2015-2016: request forms existed but are not posted online (see progress.md)'}.get(key)})
json.dump(out, open(os.path.join(H, 'offices.json'), 'w'), indent=1)
print(json.dumps([(o['pid'], len(o['files']), o['pending']) for o in out], indent=0))
