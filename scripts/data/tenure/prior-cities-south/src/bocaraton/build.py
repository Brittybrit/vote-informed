# Builds ../../bocaraton/actions.json and titles-en.json: Scott Singer, Boca Raton City Council (council member Mar 2014 -
# Apr 27, 2018; mayor Apr 27, 2018 - Mar 31, 2026). Shape of prior-cities-north/sunnyisles/actions.json.
# Source: City Clerk's minutes on Granicus (view_id=9), saved as text in ../../bocaraton/minutes (2016-01-11 .. 2026-03-31).
# Pipeline: segment.py (minutes -> cache/meetings.json) -> candidates.py (-> cache/items.json, one row per agenda item or
# purchase line, with the vote that applies) -> decisions-<year>.txt (hand: which items name a private beneficiary) -> here.
# Purchase lines (sealed bids, piggybacks, sole source, change orders ...) are taken automatically; purchases-exclude.txt
# lists the ones left out. Votes: named roll from the minutes; a consent item gets the consent motion's roll; a voice vote
# gives yes to each member present per the roll call (and departures noted in the minutes); nothing else is inferred.
import json, os, re, sys, glob, collections
SP = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(SP, '..', '..', 'bocaraton')
sys.path.insert(0, os.path.join(SP, '..', '..', 'lib')); from common import write_json, KIND
I = {i['key']: i for i in json.load(open(SP + '/cache/items.json'))}
M = json.load(open(SP + '/cache/meetings-index.json'))   # written by candidates.py (cache/meetings.json from segment.py is regenerable and not kept)
MEET = {m['file']: m for m in M}
KINDS = set(KIND.values()) | {'agreement', 'purchase'}

def read(path):
    rows = []
    if not os.path.exists(path): return rows
    for ln in open(path):
        ln = ln.rstrip('\n')
        if not ln.strip() or ln.startswith('#'): continue
        p = ln.split('|')
        while len(p) < 7: p.append('')
        rows.append(dict(key=p[0].strip(), kind=p[1].strip(), parties=p[2].strip(), title=p[3].strip(), note=p[4].strip(), amount=p[5].strip(), ref=p[6].strip()))
    return rows

def partial_members(mt):
    """members the minutes say attended only part of the meeting (left early / joined virtually for the beginning)"""
    txt = open(os.path.join(SP, '..', '..', 'bocaraton', 'minutes', mt['file']), errors='replace').read()
    txt = re.sub(r'\s+', ' ', txt)
    out = set()
    for m in re.finditer(r'((?:Mayor|Deputy Mayor|Council Member)\s+[A-Z][\w.\' ]{2,30}?)\s*\((?:attended|participated)[^)]{0,80}(?:beginning|left)[^)]*\)', txt):
        out.update(k for k, r in MRE.items() if r.search(m.group(1)))
    for m in re.finditer(r'((?:Mayor|Deputy Mayor|Council Member)\s+[A-Z][\w.\' ]{2,30}?)\s+left the meeting', txt):
        out.update(k for k, r in MRE.items() if r.search(m.group(1)))
    return out
sys.path.insert(0, SP); from segment import MRE

RECUSE = collections.defaultdict(list)
for r in read(SP + '/recusals.txt'): RECUSE[r['key']].append((r['kind'], r['parties']))
VOVR = {r['key']: r for r in read(SP + '/vote-overrides.txt')}   # key | source item key | motion index in its allmotions | note
PURCH_EXCL = {r['key']: r for r in read(SP + '/purchases-exclude.txt')}
PURCH_FIX = {r['key']: r for r in read(SP + '/purchases-fix.txt')}
SUFFIX = r'(?:Inc\.?|LLC\.?|L\.L\.C\.?|Co\.|Corp\.?|Corporation|Company|L\.?P\.?|Ltd\.?|LTD\.?|P\.A\.|P\.C\.|PLLC|LLP|N\.A\.)'
ATTACH = re.compile(r'^(Inc\.?|Inc\b|LLC\.?|L\.?L\.?C\.?|Corp\.?|Corporation|Co\.|Company\b|Ltd\.?|LTD\.?|L\.?P\.?|P\.?A\.?|P\.?C\.?|PLLC|LLP|N\.?A\.?|dba\b|d/b/a|DBA|OBA|formerly|f/k/a|a |an |by use|its )', re.I)
STATE = re.compile(r'^[A-Z]{2}\.?$')
def split_vendors(v):
    out = []
    for chunk in re.split(r';\s*', v):
        chunk = re.sub(r'\s+([,.)])', r'\1', chunk).strip(' ,;')
        chunk = re.sub(r',(?=\S)', ', ', chunk)
        if not chunk: continue
        toks = [t for t in re.split(r',\s+', chunk) if t]
        parts = []
        i = 0
        while i < len(toks):
            t = toks[i]
            if parts and (ATTACH.match(t) or ' ' not in parts[-1].strip() or re.search(r'\b(dba|d/b/a|DBA|and|&)$', parts[-1])):
                parts[-1] += ', ' + t
            elif i + 1 < len(toks) and STATE.match(toks[i + 1]) and parts:
                parts[-1] += ', ' + t + ', ' + toks[i + 1]; i += 1   # "Sebring, FL" belongs to the vendor before it
            else:
                parts.append(t)
            i += 1
        out += [p.strip(' ,') for p in parts if p.strip(' ,') and not re.fullmatch(r'(Requested by )?((Development|Recreation|Municipal|Utility|Fire Rescue|Police|Financial|Human Resources|Information Technology|Library|Golf|Community) Services|City Manager|City Wide|Citywide|Public Works( & Engineering)?)', p.strip(' ,'))]
    return out

GROUPS = [('change order', 'Change Order'), ('sole', 'Sole Source'), ('single', 'Single Source'), ('emergenc', 'Emergency'),
          ('piggy', 'Piggyback'), ('inter', 'Intergovernmental'), ('interq', 'Intergovernmental'), ('cooperative', 'Cooperative'),
          ('sealed', 'Sealed Bid'), ('bid', 'Sealed Bid'), ('renewal', 'Contract Renewal'), ('exempt', 'Exempt'), ('proposal', 'Request for Proposals'),
          ('rfp', 'Request for Proposals'), ('quote', 'Quotes'), ('negotiat', 'Negotiated')]
def group_of(h):
    if re.search(r'Ordinance|Resolution|Minutes', h or ''): return 'Purchasing item'
    h2 = re.sub(r'\s+', '', (h or '')).lower()
    for k, v in GROUPS:
        if k.replace(' ', '') in h2: return v
    return re.sub(r'\s+', ' ', h or 'Purchasing item').strip()

def roll_for(it, mt, partial):
    v = it['vote']; notes = []
    seated = list(dict.fromkeys((mt['present'] or []) + (mt['absent'] or [])))
    if not v or v['status'] in ('unparsed', None, 'novote'):
        keys = seated or ['Singer']
        return {k: 'unknown' for k in keys}, ['Vote not given in the minutes'], None
    roll = dict(v['roll'])
    if v['status'] == 'named':
        named = set(roll)
        seated = list(dict.fromkeys(seated + list(named)))
        missing = [k for k in seated if k not in named]
        for k in missing:
            if k in it['recused']: roll[k] = 'recused'
            elif k in (mt['absent'] or []): roll[k] = 'absent'
            elif k in partial: roll[k] = 'absent'; notes.append('%s not among the members voting; the minutes say %s attended only part of the meeting' % (k, k))
            else: roll[k] = 'unknown'; notes.append('%s not listed among the members voting' % k)
    else:
        notes.append('Voice vote; yes recorded for each member present per the roll call' if v['status'] == 'voice-present' else
                     'Unanimous tally; yes recorded for each member present per the roll call')
        for k in (mt['absent'] or []): roll.setdefault(k, 'absent')
    return dict(sorted(roll.items())), notes, v

def ptitle(it, vendors):
    p = it['purchase']; grp = (I.get(it['key'].rsplit('.', 1)[0]) or {}).get('header', '') or it.get('group', '')
    subj = re.sub(r'\s+([,.)])', r'\1', re.sub(r'\s+', ' ', p['subject'])).strip(' ;,')
    subj = re.sub(r'\(\s+', '(', subj)
    subj = re.sub(r'\s*\((Replacement|New|Replacements)\)', '', subj)
    v = vendors[0] if len(vendors) == 1 else '%s and %d other vendors' % (vendors[0], len(vendors) - 1) if len(vendors) > 2 else ' and '.join(vendors)
    g = group_of(it.get('group')).lower()
    if 'change' in g: t = 'Approved a change order with %s for %s' % (v, subj)
    elif 'sole' in g or 'single' in g: t = 'Approved a sole-source purchase of %s from %s' % (subj, v)
    elif 'emergenc' in g: t = 'Ratified an emergency purchase of %s from %s' % (subj, v)
    elif 'renewal' in g: t = 'Renewed %s with %s' % (subj, v)
    else: t = 'Awarded %s to %s' % (subj, v)
    return t

acts, gaps, titles = [], collections.Counter(), {}
seen_ids = set(); missing_keys = []
dec = []
for f in sorted(glob.glob(SP + '/decisions-*.txt')): dec += read(f)
# purchases
for key, it in I.items():
    if not it['purchase'] or it['date'] > '2026-03-31': continue
    fx = PURCH_FIX.get(key)
    if key in PURCH_EXCL:
        if PURCH_EXCL[key]['kind'] == 'U': gaps[it['date'][:4]] += 1
        continue
    vendors = split_vendors(fx['parties'] if fx and fx['parties'] else it['purchase']['vendors'])
    if not vendors:
        gaps[it['date'][:4]] += 1; continue
    dec.append(dict(key=key, kind='contract', parties='; '.join(vendors), title=(fx['title'] if fx and fx['title'] else ''), note=(fx['note'] if fx else ''), amount=(fx['amount'] if fx else ''), auto=True))
for d in dec:
    if d['kind'] == 'N': continue   # noted only (no decision vote in the minutes)
    if d['kind'] == 'U':
        if d['key'] in I or re.match(r'\d{4}', d['key']): gaps[d['key'][:4]] += 1
        continue
    it = I.get(d['key'])
    if not it: missing_keys.append(d['key']); continue
    mt = MEET[it['file']]
    partial = partial_members(mt)
    if d['key'] in VOVR:
        o = VOVR[d['key']]; src = I[o['kind']]
        it = dict(it); it['vote'] = src['allmotions'][int(o['parties'])]; it['via'] = 'own'
        if o['title']: d = dict(d); d['note'] = (d['note'] + '; ' if d['note'] else '') + o['title']
    roll, notes, v = roll_for(it, mt, partial)
    for mem, why in RECUSE.get(d['key'], []):
        roll[mem] = 'recused'; notes = [n for n in notes if not n.startswith(mem + ' not listed')]; notes.append('%s recused (%s)' % (mem, why))
    if v and re.match(r'\s*(table|continue|postpone|defer)', v.get('to', ''), re.I):
        print('WARN deciding motion is a continuance:', d['key'], v['to'][:80])
    parties = [p.strip() for p in d['parties'].split(';') if p.strip()]
    title = d['title'] or (ptitle(it, parties) if it['purchase'] else '')
    amt = None
    if d['amount']: amt = float(d['amount'])
    elif it['purchase']: amt = it['purchase']['amount']
    else:
        a = sorted(set(re.findall(r'\$\s?([\d,]+(?:\.\d\d)?)', re.sub(r'(\d)\s*([,.])\s*(\d)', r'\1\2\3', it['caption']))))
        if len(a) == 1: amt = float(a[0].replace(',', ''))
    if it['purchase']:
        p = it['purchase']
        if p.get('amtlabel') and re.search(r'Budget|Estimat|Annual|Not to', p['amtlabel'] or '', re.I) and amt: title += ' (up to $%s)' % format(int(amt), ',')
        elif amt: title += ' ($%s)' % format(int(amt), ',') if amt == int(amt) else ' ($%s)' % format(amt, ',.2f')
        notes.insert(0, '%s purchase; requested by %s' % (group_of(it.get('group')), re.sub(r'\s+([,.])', r'\1', p['dept'] or 'n/a')))
    if it['via'] == 'consent': notes.append('Consent agenda item; roll is the consent agenda vote')
    if it['via'] == 'joint-motion': notes.append('Voted in one motion with the related items')
    if it['via'] == 'pulled': notes.append('Pulled from the consent agenda and voted separately')
    if d['note']: notes.insert(0, d['note'])
    sec = it['key'].split('#')[1].split('~')[0]
    lbl = sec.replace('?.', '')
    ref = d.get('ref') or it['ref'] or (('Consent agenda item %s' if 'CONSENT' in it['section'] else 'Agenda item %s') % lbl)
    iid = 'boca-%s-%s' % (it['date'], re.sub(r'[^0-9A-Za-z]', '', sec.replace('.', '-')) if False else sec.replace('.', '').replace('?', 'x'))
    if '~' in it['key']: iid += '-' + it['key'].split('~')[1]
    if iid in seen_ids: print('DUP id', iid); continue
    seen_ids.add(iid)
    kind = KIND.get(d['kind'], d['kind'])
    if kind not in KINDS: print('WARN kind', d['key'], kind)
    a = {'id': iid, 'date': it['date'], 'ref': ref, 'title': title, 'kind': kind, 'parties': parties, 'amount': amt,
         'url': mt['url'], 'roll': roll, 'tally': [sum(x == 'yes' for x in roll.values()), sum(x == 'no' for x in roll.values())] if v else None,
         'mover': v['mover'] if v else None, 'second': v['second'] if v else None, 'consent': it['via'] == 'consent',
         'result': (v['result'] if v else 'unknown'), 'notes': ('; '.join(dict.fromkeys(n for n in notes if n)) + '.') if any(notes) else '', 'tenure': True, 'minutes': mt['url']}
    if a['result'] == 'passed': a['result'] = 'passed'
    acts.append(a); titles[iid] = title
acts.sort(key=lambda a: (a['date'], a['id']))
members = sorted({k for a in acts for k in a['roll']})
meetings = [{'date': m['date'], 'name': m['meeting'], 'url': m['url'], 'read': True} for m in M]
gl = ['%s: %d qualifying-kind items name no beneficiary (left out)' % (y, n) for y, n in sorted(gaps.items())]
gl = ['2014-03 to 2015-12: City Council minutes not online (Granicus view_id=9 starts Jan 11, 2016; the older archive view_id=2 is permission-denied), so Singer\'s first 22 months on the council have no actions listed'] + gl
gl.append('Window ends Mar 31, 2026: Singer\'s last meeting (Organizational Meeting at which Andy Thomson was sworn in as mayor)')
gl.append('Workshops, CRA and Planning and Zoning Board meetings not read; Council actions only')
doc = {'city': 'Boca Raton', 'body': 'City Council', 'window': {'from': '2016-01-11', 'to': '2026-03-31'},
       'sources': ['City of Boca Raton City Clerk minutes of City Council regular, special, budget and organizational meetings (bocaraton.granicus.com MinutesViewer, view_id=9)'],
       'members': members, 'meetings': meetings, 'actions': acts, 'gaps': gl}
write_json(OUT + '/actions.json', doc)
write_json(OUT + '/titles-en.json', titles)
c = collections.Counter(a['roll'].get('Singer', 'not seated') for a in acts)
print(len(acts), 'actions; Singer', dict(c), '; gaps', dict(gaps))
if missing_keys: print('MISSING KEYS', missing_keys)
