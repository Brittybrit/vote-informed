# From cache/meetings.json (segment.py) builds cache/items.json: one row per agenda item or purchase line with the
# vote that applies to it, and writes review/<year>.txt listing every voted item for the hand decisions files.
import json, os, re, sys
SP = os.path.dirname(os.path.abspath(__file__))
M = json.load(open(SP + '/cache/meetings.json'))
SKIP = ('INVOCATION', 'PLEDGE', 'ROLL', 'MINUTES', 'PROCLAMATION', 'APPOINTMENT', 'RESPONSES', 'PUBLIC REQUEST', 'INTRODUCTION',
        'MAYOR AND COUNCIL', 'ADJOURNMENT', 'CALL TO ORDER', 'CEREMONIAL', 'AMENDMENTS TO', 'PREAMBLE')

def ref_of(t):
    m = re.search(r'(Resolution|Ordinance)\s+(?:No\s*\.?\s*)?(\d{1,4}\s*-\s*\d{4}|\d{4}\b|\d{1,3}\s*-\s*\d{2,4})', t)
    return (m.group(1) + ' No. ' + re.sub(r'\s+', '', m.group(2))) if m else ''

def title_text(u):
    t = u['full']
    # the printed caption ends at 'effective date' (+ application no.) for resolutions/ordinances
    m = re.search(r'effective\s+date(\s*\([A-Z]{2,4}-[\w\- ]+\))?', t)
    if m and m.end() < 1600: return t[:m.end()]
    return t[:500]

DEPT = re.compile(r'Requested\s+by|Services\s*$|Public Works|Engineering\s*$|Fire Rescue|City Manager|Police|Recreation|Utility|Financial|Development Services|City\s*Wide|Citywide|Municipal|Human Resources|Information Technology|Library|Golf|Airport|Communications|Clerk', re.I)
PURCH = re.compile(r'Sealed|Inter\w*governmental|Interqov|Sole|Single|Emergency|Change Order|Piggyback|Cooperative|Bid|Proposal|RFP|Purchase|Contract|Renewal|Quote|Negotiated|Request', re.I)
def purchase(u, parent_header):
    """parse a purchasing line: subject; [Requested by] dept; vendor(s); amount"""
    if not PURCH.search(parent_header or '') and not re.search(r'Requested\s+by', u['full']): return None
    full = re.sub(r'(\d)\s*([,.])\s*(\d)', r'\1\2\3', u['full'])
    am = re.search(r'((?:Budgeted|Budget|Awarded|Estimated|Annual|Not to Exceed|Total)[A-Za-z ]{0,20}:?)?\s*\$\s?([\d,]+(?:\.\d\d)?)', full)
    body = full[:am.start()] if am else full
    body = re.sub(r'\b(Bids?|Bid Tabulation|Backup|Quotes?|Memo)\s*$', '', body.strip())
    rq = re.search(r'Requested\s+by\s+([^;]*?)(?:;|\s(?=[A-Z][\w&.\']+ [A-Z\w&.,\' ]*(?:Inc|LLC|Corp|Company|Co\b)))', body)
    if rq:
        subj = body[:rq.start()].strip(' ;,'); dept = rq.group(1).strip(); vend = body[rq.end():].strip(' ;,')
    else:
        segs = [x.strip(' ;,') for x in re.split(r';', body) if x.strip(' ;,')]
        if len(segs) < 2: return None
        subj, i = segs[0], 1
        dept = ''
        if i < len(segs) and DEPT.search(segs[i]) and not re.search(r'\b(Inc|LLC|Corp|Company|Co\b|L\.?P\b|dba)', segs[i]):
            dept = segs[i]; i += 1
        vend = '; '.join(segs[i:])
    vend = re.sub(r'\s+(Bids?|Quotes?)$', '', vend).strip()
    amt = float(am.group(2).replace(',', '')) if am else None
    tm = re.search(r'\s(\d{1,3}(?:,\d{3})+(?:\.\d\d)?)\s*(?:Bids?|Quotes?)?\s*$', vend)
    if tm:
        if amt is None: amt = float(tm.group(1).replace(',', ''))
        vend = vend[:tm.start()].strip(' ;,')
    return dict(subject=subj, dept=dept, vendors=vend, amount=amt, amtlabel=(am.group(1).strip() if am and am.group(1) else None))

items = []
for mt in M:
    units = mt['units']
    # parent links and section spans
    for i, u in enumerate(units): u['i'] = i
    secs = {}
    cur = None
    for u in units:
        if u['kind'] == 'section': cur = u['i']
        u['sec'] = cur
        secs.setdefault(cur, []).append(u)
    for si, us in secs.items():
        sname = units[si]['section'] if si is not None else 'PREAMBLE'
        if any(k in sname for k in SKIP): continue
        consent = 'CONSENT' in sname
        allm = [(u['i'], k, v) for u in us for k, v in enumerate(u['motions'])]
        cmot = [x for x in allm if re.search(r'consent', x[2].get('to', ''), re.I) or (consent and x[2]['status'] != 'novote')]
        cm = None
        if consent and cmot:
            cm = [x for x in allm if re.search(r'consent', x[2].get('to', ''), re.I)]
            cm = cm[0] if cm else cmot[0]
        pulled_l, pulled_r = set(), set()
        if consent:
            ctext = ' '.join(w['full'] for w in units if 'CONSENT' in (units[w['sec']]['section'] if w['sec'] is not None else '') or 'AMENDMENTS' in (units[w['sec']]['section'] if w['sec'] is not None else ''))
            for mm in re.finditer(r'(?:considered separately|heard separately|pulled|removed from the Consent|separate consideration|separately from the Consent|postpone consideration of item)', ctext, re.I):
                s_ = ctext[max(0, mm.start() - 160):mm.end() + 60]
                for x in re.finditer(r'[Ii]tems?\s+(?:9|1[0O])?\.?\s?([A-Z81])\.?\s?(\d{1,2})?\b', s_):
                    L = {'8': 'B', '1': 'I'}.get(x.group(1), x.group(1))
                    pulled_l.add(L + ('.' + x.group(2) if x.group(2) else ''))
                for x in re.finditer(r'Resolution\s+(?:No\.?\s*)?(\d{1,3}\s?-\s?\d{4})', s_):
                    pulled_r.add(re.sub(r'\s', '', x.group(1)).lstrip('0'))
        if consent and cm:
            ex = re.search(r'(?:without|less|except|excluding|minus|with the exception of)\s+(?:items?\s+)?([0-9A-Z.,;\s&and]{2,60}?)(?:\.\s|\s+Motion|$)', cm[2].get('to', ''))
            if ex:
                pulled_l = set()
                for x in re.finditer(r'(?:(?:9|1[0O])\.\s?)?([A-Z8])\.?(?:\s?(\d{1,2})\b)?', ex.group(1)):
                    if x.group(1) in ('A', 'I') and False: pass
                    L = {'8': 'B'}.get(x.group(1), x.group(1))
                    pulled_l.add(L + ('.' + x.group(2) if x.group(2) else ''))
                pulled_l.discard('a'); pulled_r = set()
                if '0' in ex.group(1).split(): pulled_l.add('O')
        for u in us:
            if u['kind'] not in ('item', 'sub'): continue
            # own motions: the unit's, plus (for an item) its subs', plus (for a sub) its parent's when it has none
            own = list(u['motions'])
            if u['kind'] == 'item':
                for w in us:
                    if w.get('parent') == u['i']: own += w['motions']
            if u['kind'] == 'sub' and not own:
                p = units[u['parent']]
                own = list(p['motions']) + [v for w in us if w.get('parent') == p['i'] for v in w['motions']]
            via = 'own'
            lk = (u['letter'] or '') + ('.%d' % u['num'] if u['num'] else '')
            refnum = re.sub(r'^(Resolution|Ordinance) No\. ', '', ref_of(u['header'] + ' ' + u['full'][:200])).lstrip('0')
            is_pulled = consent and cm and u['i'] < cm[0] and (lk in pulled_l or (u['kind'] == 'sub' and u['letter'] in pulled_l and False) or (refnum and refnum in pulled_r))
            if is_pulled:
                later = [w for w in us if w['i'] > cm[0] and w['kind'] in ('item', 'sub') and ((refnum and refnum in re.sub(r'\s', '', w['header'] + ' ' + w['full'][:150])) or re.match(r'9\.' + re.escape(lk) + r'\.?', w['header']))]
                if later: continue   # the item is listed again after the consent vote; that listing is the action
                mv = [v for w in us if w['i'] > cm[0] for v in w['motions'] if v['status'] != 'novote' and (re.search(re.escape(lk), v.get('to', '')) or (refnum and refnum in v.get('to', '')))]
                own = mv[:1]; via = 'pulled'
                if not own and not re.search(r'without|less|except|excluding|minus|exception', cm[2].get('to', ''), re.I):
                    own = [cm[2]]; via = 'consent'   # asked to be pulled, but the consent motion covered the whole agenda
            elif consent and cm and u['i'] < cm[0] or (consent and cm and u['i'] == cm[0] and not [v for v in own if v is not cm[2]]):
                own = [cm[2]]; via = 'consent'
            elif consent and cm and not own:
                via = 'consent-after'   # item listed after the consent motion with no motion of its own
            ref = ref_of(u['header'] + ' ' + (u['full'][:200] if u['kind'] == 'item' else u['full'][:len(u['header']) + 40]))
            pur = purchase(u, units[u['parent']]['header']) if u['kind'] == 'sub' else None
            if u['kind'] == 'item' and any(w.get('parent') == u['i'] and purchase(w, u['header']) for w in us):
                continue   # purchasing group header (Sealed Bids, Intergovernmental, ...): its lines are the actions
            if u['kind'] == 'sub' and not pur and not ref: continue
            if u['kind'] == 'item' and not ref and re.match(r'(Board Minutes|Board Resignation|Board Appointment|Minutes)', u['header']): continue
            # the deciding motion: last motion with a vote; prefer one 'to approve/adopt/award ...'
            voted = [v for v in own if v['status'] != 'novote']
            dec = None
            main = [v for v in voted if re.match(r'\s*(approve|adopt|award|authoriz|accept|deny|ratif|grant|reject|uphold|reverse|overturn|enter|execute)', v.get('to', ''), re.I)]
            notamend = [v for v in voted if not re.match(r'\s*(amend|extend the meeting|continue|postpone|table|reconsider|recess|move the item)', v.get('to', ''), re.I) and not re.search(r'Motion to amend', v.get('text', ''), re.I)]
            dec = main[-1] if main else (notamend[-1] if notamend else (voted[-1] if voted else None))
            if dec is None and ref:
                num = re.sub(r'^(Resolution|Ordinance) No\. ', '', ref)
                for w in us:
                    for v in w['motions']:
                        if v['status'] != 'novote' and re.search(r'\b0*' + re.escape(num.lstrip('0')) + r'\b', v.get('to', '')):
                            dec = v; via = 'joint-motion'
            key = '%s#%s.%s%s' % (mt['date'], (units[si]['secno'] if si is not None else '0'), u['letter'] or '', ('.%d' % u['num']) if u['num'] else '')
            items.append(dict(key=key, date=mt['date'], meeting=mt['meeting'], url=mt['url'], file=mt['file'], section=sname,
                              letter=u['letter'], num=u['num'], header=u['header'], ref=ref, caption=title_text(u)[:1600],
                              allmotions=own, purchase=pur, via=via, group=(units[u['parent']]['header'] if u['kind'] == 'sub' else ''), nmotions=len(own), vote=dec, recused=u.get('recused', []),
                              present=u.get('present'), absent=u.get('absent_rc'), discussion=u['full'][len(title_text(u)):][:600]))
# dedupe keys
seen = {}
for it in items:
    k = it['key']
    if k in seen:
        seen[k] += 1; it['key'] = k + '~%d' % seen[k]
    else: seen[k] = 0
json.dump(items, open(SP + '/cache/items.json', 'w'), separators=(',', ':'))
json.dump([{k: m[k] for k in ('date', 'file', 'url', 'meeting', 'present', 'absent')} for m in M], open(SP + '/cache/meetings-index.json', 'w'), indent=0)
os.makedirs(SP + '/review', exist_ok=True)
by = {}
for it in items: by.setdefault(it['date'][:4], []).append(it)
for y, L in by.items():
    with open(SP + '/review/%s.txt' % y, 'w') as f:
        for it in L:
            v = it['vote']
            vs = 'NOVOTE' if not v else '%s/%s/%s' % (v['result'], v['status'], ','.join('%s=%s' % (k[:3], x[0]) for k, x in sorted(v['roll'].items())))
            if it['purchase']:
                p = it['purchase']
                f.write('%s | P | %s | %s | %s | %s | %s\n' % (it['key'], p['subject'][:90], p['vendors'][:200], p['amount'], it['via'], vs))
            else:
                f.write('%s | %s | %s | %s | %s | %s\n' % (it['key'], it['section'][:12], it['ref'], re.sub(r'providing for (severability|repealer|codification|an effective date)[;:,]?\s*', '', it['caption'])[:700], it['via'], vs))
print(len(items), 'items;', sum(1 for i in items if i['purchase']), 'purchase lines;', sum(1 for i in items if not i['vote']), 'without a vote')
