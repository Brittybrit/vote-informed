"""Parkland resolutions and ordinances 2006-2012 joined to the minutes votes (pk_minutes.py output).
Each resolution/ordinance in ../resolutions-index.tsv and ../ordinances-index.tsv becomes one item:
  title  = the "A RESOLUTION OF ..." paragraph of its own text layer, else the COMMENTS title printed in the minutes,
           else the Laserfiche document name (for the 420 resolutions and 62 ordinances with no text layer);
  date   = the meeting whose minutes record the adopting vote, else the "PASSED AND ADOPTED this .. day of" line;
  roll   = from that meeting's minutes (pk_minutes.py rules); None with the reason otherwise.
Ordinances: the vote is the second (final) reading; a first reading alone is not an adoption.
Agenda items with no resolution or ordinance number (motions in the minutes) are added as pk-m-<date>-<n>.
Output: items JSON for build_body.py.  Usage: python3 pk_items.py <min.json> <out.json>"""
import re, json, sys, os, csv, collections, datetime as dt
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE)
MIN, OUT = sys.argv[1:3]
D = json.load(open(MIN))
W0, W1 = '2006-03-22', '2012-10-17'
MON = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
meet_by_date = collections.defaultdict(list)
for m in D['meetings']: meet_by_date[m['date']].append(m)
UNREAD = {m['date'] for m in D['meetings'] if m['present'] is None and m['kind'] == 'meeting' and 'cancelled' not in m['name']}

def rows(f):
    return [r for r in csv.DictReader(open(os.path.join(BASE, f)), delimiter='\t')]

def own_text(f):
    p = os.path.join(BASE, f)
    t = open(p, encoding='utf8').read()
    if 'NO TEXT LAYER' in t[:800]: return None
    t = '\n'.join(re.sub(r'^\s*\d{1,3}\s', ' ', ln) for ln in t.split('\n') if not ln.startswith('#'))
    return t

def own_title(t, kind):
    m = re.search(r'(AN?\s+(?:RESOLUTION|ORDINANCE)\s+OF\s+THE\s+CITY.*?(?:EFFECTIVE\s+DATE|EFFECTIVE\s+DA\s*TE)\.?)', t, re.S | re.I)
    if not m: return None
    s = re.sub(r'\s+', ' ', m.group(1))
    return s if len(s) < 3000 else s[:3000]

def adopted(t):
    m = re.search(r'PASSED\s+AND\s+ADOPTED\s+(?:THIS|this)\s+(\d{1,2})\w*\s+(?:DAY|day)\s+OF\s+([A-Za-z]+)\s*,?\s*(\d{4})', t, re.I)
    if not m: return None
    mo = [i for i, x in enumerate(MON) if x.startswith(m.group(2).upper()[:3])]
    if not mo: return None
    try: return dt.date(int(m.group(3)), mo[0] + 1, int(m.group(1))).isoformat()
    except ValueError: return None

def numof(name):
    m = re.match(r'(\d{4})/(\d{4})-(\d{1,3})([A-Za-z]?)(?:-(\d))?\s*(.*)$', name.strip())
    if not m: return None
    return m.group(2), int(m.group(3)), m.group(4).upper(), m.group(5), m.group(6).strip()

SUF = r'(?:Inc|LLC|L\.L\.C|Corp|Corporation|Company|Co|P\.A|PA|Associates|Group|Construction|Engineering|Services|Enterprises|Ltd|L\.P|LP|LLP|Communities|Partners|Development|Foundation|Association|Club|League|Bank|Nurseries|Nursery|Builders|Homes|Contractors|Consultants|Consulting|Systems|Industries|Holdings|Trust|Church|Academy|School|Council|Society|Camp|Scouts|Ministries|Realty|Properties|Investments|Venture|Ventures|Paving|Asphalt|Landscaping|Electric|Communications|Wireless|Towers|Center|Hospital|Studios|Productions|Solutions|Technologies|Supply|Motors|Ford|Chevrolet)'
ENT = re.compile(r"((?:[A-Z][A-Za-z&'.\-]*\.?,?\s+){0,6}" + SUF + r")\b\.?")
def ents(txt):
    out = []
    for m in ENT.finditer(txt or ''):
        e = re.sub(r'\s+', ' ', m.group(1)).strip(' ,')
        e = re.sub(r'^(?:THE|The|AND|And|WITH|With|TO|To|FROM|From|BY|By|OF|Of|FOR|For|AUTHORIZING|APPROVING|BETWEEN)\s+', '', e)
        if len(e) > 6 and e not in out and not re.match(r'^(CITY|City|Broward|BROWARD|County|COUNTY)\b', e): out.append(e)
    return out
votes = collections.defaultdict(list)
hdr_reading = {}
for it in D['items']:
    for typ, n in it['nums']:
        hdr_reading[(it['date'], typ, n)] = it['reading']
mv_keys = set()
for it in D['mvotes']:
    it['src'] = 'motion'
    for typ, n in it['nums']:
        if it['reading'] is None: it['reading'] = hdr_reading.get((it['date'], typ, n))
        votes[(typ, n)].append(it); mv_keys.add((it['date'], typ, n))
for it in D['items']:
    it['src'] = 'header'
    for typ, n in it['nums']:
        if (it['date'], typ, n) not in mv_keys and it['motion']:
            votes[(typ, n)].append(it)

def pick(cands, typ):
    if not cands: return None
    c = [x for x in cands if x['motion'] and x['outcome'] != 'amend']
    if typ == 'O':
        c2 = [x for x in c if x['reading'] != 'first']
        c = c2
    ok = [x for x in c if x['outcome'] == 'passed' and not re.search(r'\btable|reconsider|reevaluat|instruct|direct staff|to add|adjourn', x['motion'] or '', re.I)]
    okm = [x for x in ok if x.get('src') == 'motion']   # a motion that names the number beats a header match
    if okm: return okm[-1]
    if ok: return ok[-1]
    fl = [x for x in c if x['outcome'] == 'failed']
    if fl: return fl[-1]
    return c[-1] if c else None

items = []
stats = collections.Counter()
for typ, f in (('R', 'resolutions-index.tsv'), ('O', 'ordinances-index.tsv')):
    for r in rows(f):
        n = numof(r['name'])
        if not n: stats['no number ' + typ] += 1; continue
        yr, sq, suf, sub, label = n
        num = '%s-%d%s' % (yr, sq, suf)
        t = own_text(r['file'])
        ttl = own_title(t, typ) if t else None
        ad = adopted(t) if t else None
        cands = votes.get((typ, num), [])
        v = pick(cands, typ)
        first = [x for x in cands if x['reading'] == 'first']
        date = v['date'] if v else ad
        mt = (v or (cands[-1] if cands else {})).get('title')
        title = ttl or mt or label
        src = 'own text' if ttl else ('minutes' if mt else 'document name')
        key = 'pk-%s-%s-%03d%s%s' % ('res' if typ == 'R' else 'ord', yr, sq, suf, ('-' + sub) if sub else '')
        ref = ('Resolution No. ' if typ == 'R' else 'Ordinance No. ') + num + (('-' + sub) if sub else '')
        note = None
        roll = mover = second = None; consent = False; result = 'passed'; minutes = None; meeting = ''
        if v and v['outcome'] == 'tabled' and ad and ad > v['date']:
            v = None; date = ad   # tabled at this meeting; its own text gives the later adoption date
        if v:
            roll, mover, second, consent, minutes, meeting = v['roll'], v['mover'], v['second'], v['consent'], v['minutes'], v['meeting']
            note = v['note']
            result = {'failed': 'failed', 'tabled': 'tabled'}.get(v['outcome'], 'passed')
        elif date:
            if date in UNREAD:
                note = 'The minutes for this meeting are online but their pages hold no readable text (scanned without a text layer; only attachments carry text), so the vote could not be read.'
            elif date in meet_by_date:
                note = 'The minutes for this meeting do not record this item\'s vote in a readable form.'
            else:
                note = 'No minutes for this meeting are online in the City Clerk\'s Laserfiche minutes folder.'
        segs = ' '.join(x.get('seg', '') for x in cands if x.get('seg'))
        segs += ' '.join(x.get('seg', '') for x in D['items'] if x['date'] == (v or {}).get('date') and [typ, num] in x['nums'])
        ctx = ents((t or '')[:6000]) + [e for e in ents(segs) if e not in ents((t or '')[:6000])]
        items.append(dict(key=key, ctx=ctx[:12], date=date or '????-??-??', title=title, what=label, titlesrc=src, roll=roll, mover=mover, second=second,
                          result=result, consent=bool(consent), url=r['url'], minutes=minutes or r['url'], ref=ref, note=note, meeting=meeting,
                          textlayer=r['text_layer'], firstreading=[x['date'] for x in first], typ=typ, votedate=v['date'] if v else None, adopted=ad))
        stats[('dated' if date else 'undated') + ' ' + typ] += 1
# agenda items with no number but a motion
seen = collections.Counter()
for it in D['items']:
    if it['nums'] or not it['motion']: continue
    slug = re.sub(r'[^a-z0-9]+', '-', re.sub(r'^(discussion|consideration|presentation|update)\s*:?\s*', '', it['hdr'].lower())).strip('-')[:40].strip('-')
    k = 'pk-m-%s-%s' % (it['date'], slug)
    seen[k] += 1
    if seen[k] > 1: k += '-%d' % seen[k]
    items.append(dict(key=k, date=it['date'], title=(it['hdr'] + ((' -- ' + it['title']) if it['title'] else '') + ' || MOTION: ' + (it['motion'] or '')), what=it['hdr'],
                      titlesrc='minutes', roll=it['roll'], mover=it['mover'], second=it['second'], result={'failed': 'failed', 'tabled': 'tabled'}.get(it['outcome'], 'passed'),
                      consent=bool(it['consent']), url=it['minutes'], minutes=it['minutes'], ref=None, note=it['note'], meeting=it['meeting'], typ='M'))
# one resolution can be filed as several Laserfiche documents (resolution, agreement, amendment): merge them under one key
merged, order = {}, []
for x in items:
    k = x['key']
    if k not in merged:
        merged[k] = x; order.append(k); continue
    m = merged[k]
    if x.get('what') and x['what'] not in m['what']: m['what'] += ' / ' + x['what']
    if m.get('textlayer') != 'yes' and x.get('textlayer') == 'yes':
        for f in ('title', 'titlesrc', 'url', 'textlayer'): m[f] = x[f]
    m['ctx'] = (m.get('ctx') or []) + [e for e in (x.get('ctx') or []) if e not in (m.get('ctx') or [])]
items = [merged[k] for k in order]
inw = [x for x in items if W0 <= x['date'] <= W1]
json.dump(items, open(OUT, 'w'), ensure_ascii=False, indent=0)
print(dict(stats), 'items', len(items), 'in window', len(inw))
c = collections.Counter((x['typ'], 'roll' if x['roll'] else 'null') for x in inw); print(c)
und = [x['key'] for x in items if x['date'].startswith('?')]
print('undated', len(und), und[:60])
