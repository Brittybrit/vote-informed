import json, sys, glob, os
OUT = '/home/claude/vote-informed/scripts/data/tenure/congress'
C = json.load(open('classes.json')); C.pop('_affected', None)
bills = []
tags = sys.argv[1:]
for t in tags:
    bills += json.load(open(f'cards-{t}.json'))['cards']
used = {b['class'] for b in bills}
fv = {'source': "Roll calls from the Clerk of the House (clerk.house.gov/evs), read Oct 25, 2026. Quotes from the Congressional Research Service bill summaries (govinfo.gov BILLSTATUS bulk data).",
      'bills': sorted(bills, key=lambda b: b['votes'][0]['date'], reverse=True),
      'classes': {k: v for k, v in C.items() if k in used},
      'universeNote': 'Every public law of the ' + ', '.join(tags) + ' Congresses was screened; those whose CRS summary names a kind of business it helps and that had a House roll call are listed. Laws passed by voice vote or unanimous consent are in laws/universe-*.json but have no card, since no member vote is recorded. Screening: scripts/data/tenure/congress/laws/universe-*.json.'}
json.dump(fv, open(f'{OUT}/floor-votes-tenure.json', 'w'), indent=1, ensure_ascii=False)
open(f'{OUT}/floor-votes-tenure.json', 'a').write('\n')
print(len(bills), 'bills,', len(fv['classes']), 'classes')
