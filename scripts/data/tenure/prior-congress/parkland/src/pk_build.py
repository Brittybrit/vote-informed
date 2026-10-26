"""Build parkland/actions.json, titles-en.json and translations.json (same shape as prior-cities-north/sunnyisles).
Pipeline (rerun from scratch):
  python3 pk_minutes.py <scratch>/min.json          # votes from the 225 saved minutes
  python3 pk_items.py <scratch>/min.json <scratch>/items.json
  python3 pk_build.py <scratch>                      # window filter + build_body.py + Parkland-specific fields
Hand decisions: decisions/pk-YYYY.txt (key|template|parties|amount|subject|place|reps|note) and decisions/rolls-pk.txt."""
import json, os, sys, subprocess, collections, re
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE)
SP = sys.argv[1]
W0, W1 = '2006-03-22', '2012-10-17'   # first meeting after the Mar 14, 2006 election; last meeting attended (Oct 17, 2012)
V = json.load(open(os.path.join(SP, 'items.json')))
W = [v for v in V if W0 <= v['date'] <= W1 or v['date'].startswith('?')]
json.dump(W, open(os.path.join(SP, 'items-w.json'), 'w'))
SRC = ('City of Parkland City Clerk records (documents.cityofparkland.org Laserfiche WebLink, repo Parkland): City Commission minutes 2006-2012, '
       'signed resolutions and ordinances, read Oct 26, 2026')
subprocess.run([sys.executable, os.path.join(HERE, 'build_body.py'), os.path.join(SP, 'items-w.json'), 'pk', BASE, 'Parkland', 'City Commission', W0, SRC], check=True)
p = os.path.join(BASE, 'actions.json')
d = json.load(open(p))
# Parkland-specific fixes
FIX_RESULT = {'pk-res-2008-075': 'passed'}   # tabled July 2, 2008; its signed text says adopted July 9, 2008 (no minutes online for that date)
for a in d['actions']:
    if a['id'] in FIX_RESULT: a['result'] = FIX_RESULT[a['id']]
    if a['date'].startswith('?'): raise SystemExit('undated action ' + a['id'])
    if not (W0 <= a['date'] <= W1): raise SystemExit('outside window ' + a['id'] + ' ' + a['date'])
M = json.load(open(os.path.join(SP, 'min.json')))
# votes set by hand (rolls-pk.txt) keep the resolution's own URL as "minutes": point them at that day's minutes document
bydate = collections.defaultdict(list)
for m in M['meetings']:
    if m['kind'] == 'meeting' and 'cancel' not in m['name']: bydate[m['date']].append(m)
for a in d['actions']:
    if a['minutes'] == a['url'] and not a['id'].startswith('pk-m-') and bydate.get(a['date']):
        ms = sorted(bydate[a['date']], key=lambda m: ('Special' in m['name'] or 'Speial' in m['name'], m['name']))
        if a['id'] == 'pk-res-2012-090' or 'second meeting' in ms[0]['name']: ms = [m for m in ms if 'second meeting' in m['name']] or ms
        a['minutes'] = ms[0]['url']
meet = []
for m in M['meetings']:
    if not (W0 <= m['date'] <= W1): continue
    meet.append(dict(date=m['date'], name=m['name'], url=m['url'], read=bool(m['present'])))
meet.sort(key=lambda m: (m['date'], m['name']))
d['window'] = {'from': W0, 'to': W1}
d['sources'] = [SRC]
d['members'] = sorted({n for a in d['actions'] for n in (a['roll'] or {})} | {'Moskowitz'})
d['meetings'] = meet
unread = [m['date'] for m in meet if not m['read'] and 'Workshop' not in m['name'] and 'cancel' not in m['name']]
# items left out because no beneficiary is named, by year (year of the vote, or of the resolution number when undated)
import glob
VK = {v['key']: v for v in W}
un = collections.Counter()
for f in sorted(glob.glob(os.path.join(HERE, 'decisions', 'pk-*.txt'))):
    for ln in open(f, encoding='utf8'):
        p_ = [x.strip() for x in ln.rstrip('\n').split('|')]
        if ln.startswith('#') or len(p_) < 2 or p_[1] != '?' or p_[0] not in VK: continue
        v = VK[p_[0]]
        y = v['date'][:4] if not v['date'].startswith('?') else re.search(r'-(\d{4})-', p_[0]).group(1)
        un[y] += 1
gaps = [f'{y}: {un[y]} qualifying-kind items name no beneficiary (left out)' for y in sorted(un)]
gaps.append('Minutes pages with no readable text (only attachments carry text): ' + ', '.join(unread) + '; votes at these meetings are "not given".')
nul = collections.Counter(a['date'][:4] for a in d['actions'] if a['roll'] is None)
gaps.append('Actions with no roll call (tally only, unreadable or missing minutes): ' + ', '.join(f'{y}: {n}' for y, n in sorted(nul.items())))
d['gaps'] = gaps
json.dump(d, open(p, 'w'), ensure_ascii=False, indent=1)
mk = collections.Counter((a['roll'] or {}).get('Moskowitz', 'unknown' if a['roll'] else 'no roll') for a in d['actions'])
print(len(d['actions']), 'actions;', dict(mk), '; meetings', len(meet))
