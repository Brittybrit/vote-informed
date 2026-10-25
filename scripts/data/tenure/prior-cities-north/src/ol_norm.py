"""Normalize ol_parse.py output to build_body.py items (keys as in the review list)."""
import json, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cand import is_candidate
R = json.load(open(sys.argv[1])); out = []; seen = {}
for i, r in enumerate(R):
    k = f"ol-{r['date']}-{r['code']}"
    if is_candidate(r['title'])[0]:
        if k in seen: k += '.b'
        seen[k] = 1
    else: k += '.nc%d' % i
    fid = re.sub(r'\D', '', os.path.basename(r['doc']))
    url = 'https://opalockafl.api.civicclerk.com/v1/Meetings/GetMeetingFileStream(fileId=%s,plainText=false)' % fid
    res = 'passed'
    if r['roll']:
        y = sum(1 for v in r['roll'].values() if v == 'yes'); n = sum(1 for v in r['roll'].values() if v == 'no')
        if n > y: res = 'failed'
    out.append(dict(key=k, date=r['date'], title=r['title'], roll=r['roll'], mover=r['mover'], second=r['second'], result=res,
                    consent=r['src'] == 'next-in-section', url=url, minutes=url, ref=f"Item {r['code']}, {r['date']} {r['typ'].lower()} meeting",
                    meeting=r['typ'].title() + ' Commission Meeting',
                    note='Roll call recorded in the minutes.' if r['roll'] else ''))
json.dump(out, open(sys.argv[2], 'w'), indent=0); print(len(out))
