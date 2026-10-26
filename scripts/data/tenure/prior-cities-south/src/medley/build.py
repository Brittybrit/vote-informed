# Builds ../../medley-pacheco/actions.json: Ivan Pacheco, Medley Town Council (Nov 8, 2016 - Nov 2024).
# Universe: the agenda items in scripts/data/city/medley/actions.json (built from the posted agendas, every item naming a
# private party) dated inside Pacheco's tenure. Votes: the Town Clerk's minutes in the Medley Laserfiche library
# (medleydocs.com, Town Clerk > Minutes > <year>), text layer or OCR (scratchpad tools/mdocr.sh, tools/mdseg.py).
# cache/segments.json = per minutes document: date, Laserfiche id, members present, item segments (heading, motion sentences).
# match-overrides.txt = hand matches (action id|eid|segment index|roll override "Key=vote,...") where the automatic match failed.
import json, os, sys, re, difflib
SP = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(SP, '..', '..', 'medley-pacheco')
sys.path.insert(0, os.path.join(SP, '..', '..', 'lib')); from common import *
CITY = json.load(open(os.path.join(SP, '..', '..', '..', '..', 'city', 'medley', 'actions.json')))
SEG = json.load(open(SP + '/cache/segments.json'))
START, END = '2016-11-08', '2024-11-05'
NAMES = {'IPacheco': 'Ivan Pacheco', 'Martell': 'Roberto Martell', 'EAyala': 'Edgar Ayala', 'LRodriguez': 'Lizelh Rodriguez (Ayala)',
         'KPacheco': 'Karina Pacheco', 'Digiacomo': 'Griselia Digiacomo', 'Morrow': 'Jack Morrow', 'Guasch': 'Susana Guasch'}
OV = {}
if os.path.exists(SP + '/match-overrides.txt'):
    for l in open(SP + '/match-overrides.txt'):
        if l.startswith('#') or not l.strip(): continue
        p = l.rstrip('\n').split('|'); OV[p[0]] = p[1:]
def toks(s): return set(w for w in re.findall(r'[a-z0-9]{3,}', (s or '').lower()) if w not in {'the','and','for','town','medley','florida','resolution','ordinance','providing','approving','effective','date','with','that','this','from'})
def score(agenda, parties, seg):
    a = toks(agenda); h = toks(seg['head'] + ' ' + seg['text'][:800])
    s = len(a & h) / (len(a) or 1)
    for p in parties:
        core = re.sub(r'(?i),?\s*(inc|llc|corp|co|ltd|l\.l\.c)\.?$', '', p).strip().lower()
        if core and core[:25] in seg['text'][:1500].lower(): s += 0.6
    return s
FULL = {'Martell': r'roberto\s+martell|mayor\s+martell', 'IPacheco': r'ivan\s+pacheco', 'KPacheco': r'karina\s+pacheco', 'EAyala': r'edgar\s+ayala',
        'LRodriguez': r'lizelh\s+(?:ayala|rodriguez)', 'Digiacomo': r'griselia\s+digiacomo|council\w*\s+digiacomo', 'Morrow': r'jack\s+morrow|(?:vice[- ]?mayor|council\w*)\s+morrow',
        'Guasch': r'susana\s+guasch|council\w*\s+guasch'}
def rollcall(text):
    m = re.search(r'(?i)(?:votes? (?:were|was) cast\w*\s*(?:as\s*)?follows|roll call(?: vote)?(?: was taken)?[,:]?(?: as follows)?)[,:]?(.{0,420})', text)
    if not m: return None
    r = {}
    for k, rx in FULL.items():
        mm = re.search('(?i)(?:' + rx + r')[\W_]{0,8}(yes|no|absent|abstain\w*)', m.group(1))
        if mm: r[k] = mm.group(1).lower()[:7].replace('abstain', 'abstain')
    return r or None
def vote_of(seg, present, follow=(), doc=None):
    num = re.search(r'\b([CO])\s?-\s?(\d{3,4})\b', seg['head'])
    if doc and num:
        n = num.group(2)
        for s2 in doc['segs']:
            for v in s2['votes']:
                if re.search(r'C\s?-\s?' + n + r'\b', v):
                    vi = s2['text'].find(v[:60])
                    rc = rollcall(s2['text'][vi:] if vi >= 0 else v)
                    if rc: return rc, None
                    if re.search(r'(?i)\btable|defer|continu', v[:200]): return None, 'tabled: ' + v[:200]
                    if re.search(r'unanim', v.lower()): return {k.rstrip('*'): 'yes' for k in present}, None
    if re.search(r'(?i)\bitem was tabled|was tabled|was deferred|was withdrawn', seg['text']) and not seg['votes']:
        return None, 'tabled or deferred at this meeting; no vote on the item'
    region = [seg] + list(follow)
    for s in region:
        rc = rollcall(s['text'])
        if rc: return rc, None
        if s['votes']:
            v = s['votes'][-1]; low = v.lower()
            if re.search(r'unanim', low) and not re.search(r'(?i)\btable|defer|continu', v[:200]):
                return {k.rstrip('*'): 'yes' for k in present}, None
            return None, 'motion not resolved automatically: ' + v[:300]
    return None, 'no motion recorded in this part of the minutes'
acts, unmatched = [], []
docs_by_date = {}
for d in SEG:
    if not d.get('empty'): docs_by_date.setdefault(d['date'], []).append(d)
for x in CITY['actions']:
    if not (START <= x['date'] <= END): continue
    agenda = (x.get('notes') or '').split('Agenda text:', 1)[-1]
    cands = []
    for d in docs_by_date.get(x['date'], []):
        for i, s in enumerate(d['segs']):
            cands.append((score(agenda, x['parties'], s), d, i, s))
    roll, why, src = None, None, None
    if x['id'] in OV:
        eid, si, rov = (OV[x['id']] + ['', '', ''])[:3]
        d = next((d for d in SEG if d['eid'] == eid), None)
        if d and si.isdigit():
            s = d['segs'][int(si)]; roll, why = vote_of(s, d['present'], d['segs'][int(si) + 1:int(si) + 3], d); src = (d, s)
        if rov:
            roll = {k: v for k, v in (z.split('=') for z in rov.split(','))}; why = None
    elif cands:
        cands.sort(key=lambda c: -c[0])
        sc, d, i, s = cands[0]
        if sc >= 0.45:
            fol = []
            for s2 in d['segs'][i + 1:i + 4]:
                if re.match(r'(?i)\W*(?:resolution|ordinance|item\s|discussion|approval)', s2['head']): break
                fol.append(s2)
            roll, why = vote_of(s, d['present'], fol, d); src = (d, s)
        else:
            why = 'item not found in the minutes of that date (best match %.2f)' % sc
    else:
        why = 'no minutes found for this meeting date in the Laserfiche library'
    notes = []
    if src:
        d, s = src
        notes.append('Vote from the Town Clerk\'s minutes (%s, Laserfiche doc %s%s)' % (d['name'], d['eid'], ', OCR of the scan' if d['src'] == 'ocr' else ''))
        if roll: notes.append('Roll call as recorded in the minutes' if len(set(roll.values())) > 1 or 'votes were cast' in s['text'] else 'Minutes say the motion carried unanimously; members present per the minutes header')
    if not roll:
        seated = (src[0]['present'] if src else []) or []
        roll = {k.rstrip('*'): 'unknown' for k in seated} or {'IPacheco': 'unknown'}
        notes.append('Vote not given in the minutes' + (' (%s)' % why if why else ''))
        unmatched.append({'id': x['id'], 'date': x['date'], 'why': why})
    a = dict(x); a['id'] = x['id'].replace('medley-', 'medley-pacheco-'); a['roll'] = roll; a['tally'] = tally(roll)
    a['notes'] = '; '.join(notes) + ('; Agenda: ' + agenda.strip()[:400] if agenda else '')
    a['title'] = re.sub(r'\s*\(agenda\)$', '', x['title']); a['prior'] = True
    if src: a['minutesUrl'] = 'https://www.medleydocs.com/WebLink/DocView.aspx?id=%s&dbid=0&repo=LFMedley' % src[0]['eid']
    acts.append(a)
acts.sort(key=lambda a: (a['date'], a['ref']))
doc = {'city': 'Medley', 'body': 'Medley Town Council', 'person': 'ivan-pacheco', 'office': 'Council Member (Vice Mayor part of term)',
       'window': {'from': START, 'to': END}, 'members': NAMES, 'actions': acts, 'unmatched': unmatched,
       'sources': [{'name': 'Town of Medley agendas (universe, from scripts/data/city/medley)', 'url': 'https://www.townofmedley.com/council-meetings'},
                   {'name': 'Medley Laserfiche WebLink, Town Clerk minutes', 'url': 'https://www.medleydocs.com/WebLink/Welcome.aspx?dbid=0&repo=LFMedley'}]}
write_json(OUT + '/actions.json', doc)
print(len(acts), 'actions;', sum(1 for a in acts if a['roll'].get('IPacheco') in ('yes', 'no')), 'with Pacheco yes/no;', len(unmatched), 'without a vote')
