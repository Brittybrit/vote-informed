"""Builds bills/enacted.json (every chapter law of the 2013-2020 sessions) from raw/list-<session>.json (flsenate.gov
'Became Law' lists) plus the chapters those lists leave out, found as gaps in each year's chapter numbering and
identified from the chapter law itself on laws.flrules.org (first page: chapter number and bill). Run: python3 enacted.py"""
import json, glob, os
H = os.path.dirname(os.path.abspath(__file__))
rows = []
for f in sorted(glob.glob(os.path.join(H, '..', 'raw', 'list-*.json'))): rows += json.load(open(f))
GAP = {  # chapter: (bill, session, title)  -- laws.flrules.org/<year>/<n>, read Oct 25, 2026
    '2013-40': ('SB 1500', '2013', 'General Appropriations Act'), '2013-219': ('HB 7129', '2013', 'Residential Services for Children'),
    '2014-51': ('HB 5001', '2014', 'General Appropriations Act'), '2016-66': ('HB 5001', '2016', 'General Appropriations Act'),
    '2017-70': ('HB 5001', '2017', 'General Appropriations Act'), '2018-9': ('HB 5001', '2018', 'General Appropriations Act'),
    '2019-115': ('SB 2500', '2019', 'Appropriations'), '2020-111': ('HB 5001', '2020', 'General Appropriations Act')}
out = [r for r in rows if r['chapter']]
have = {r['chapter'] for r in out}
for ch, (bill, ses, title) in GAP.items():
    if ch in have: continue
    n = bill.split()[-1]
    out.append({'bill': bill, 'session': ses, 'chapter': ch, 'title': title, 'url': f'https://www.flsenate.gov/Session/Bill/{ses}/{n}',
                'listedAs': 'not in the Became Law list (line-item vetoed or listed without a chapter); chapter read from laws.flrules.org'})
out.sort(key=lambda x: (int(x['chapter'][:4]), int(x['chapter'][5:])))
json.dump(out, open(os.path.join(H, 'enacted.json'), 'w'), indent=1, ensure_ascii=False)
import collections; print(len(out), collections.Counter(x['session'] for x in out))
