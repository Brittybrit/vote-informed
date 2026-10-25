# Split Broward County Commission Legistar event items (webapi.legistar.com/v1/broward/events/{id}/eventitems?MinutesNote=1)
# into single motions with the clerk's ACTION and VOTE lines. usage: python3 -I bw_parse.py <dir with ei*.json> <events.json> <out motions.json>
import json, glob, re, sys, os
D, EV, OUT = sys.argv[1:4]
EVS = {e['EventId']: e for e in json.load(open(EV))}
def rtf(s):
    if not s: return ''
    s = re.sub(r'\\par[d]?\b', '\n', s); s = re.sub(r"\\'([0-9a-f]{2})", lambda m: bytes([int(m.group(1), 16)]).decode('cp1252'), s)
    s = re.sub(r'\\[a-z]+-?\d* ?', '', s); s = re.sub(r'[{}]', '', s)
    return re.sub(r'[ \t]+', ' ', s).strip()
out = []
for f in sorted(glob.glob(D + '/ei*.json')):
    for e in json.load(open(f)):
        if not e['EventItemMatterId']: continue
        ev = EVS[e['EventItemEventId']]; date = ev['EventDate'][:10]
        t = (e['EventItemTitle'] or '').replace('\r\n', '\n')
        note = rtf(e['EventItemMinutesNote'])
        # sub-motions "A. MOTION TO ..." each followed by its own ACTION/VOTE
        parts = re.split(r'\n\s*(?=[A-Z]\. (?:MOTION|A PROPOSED|PUBLIC HEARING|MOTION))', '\n' + t)
        parts = [p.strip() for p in parts if p.strip()]
        if len(parts) == 1 and 'ACTION:' not in parts[0] and note:
            parts = [parts[0] + '\n\n' + note]
        for i, p in enumerate(parts):
            m = re.search(r'ACTION:\s*(.*?)(?=\n\s*VOTE:|\Z)', p, re.S)
            v = re.search(r'VOTE:\s*(.*?)(?=\n\s*\n|\Z)', p, re.S)
            body = re.split(r'\n\s*ACTION:', p)[0].strip()
            sub = re.match(r'([A-Z])\. ', body)
            out.append({'event': e['EventItemEventId'], 'date': date, 'item': (e['EventItemAgendaNumber'] or '').strip(),
                        'sub': sub.group(1) if sub and len(parts) > 1 else None, 'file': e['EventItemMatterFile'], 'matterId': e['EventItemMatterId'],
                        'type': e['EventItemMatterType'], 'text': re.sub(r'\s+', ' ', body), 'action': re.sub(r'\s+', ' ', m.group(1)).strip() if m else None,
                        'vote': re.sub(r'\s+', ' ', v.group(1)).strip() if v else None,
                        'url': 'https://broward.legistar.com/LegislationDetail.aspx?ID=' + str(e['EventItemMatterId']) + '&GUID=' + e['EventItemMatterGuid'],
                        'meeting': ev['EventInSiteURL'], 'minutes': ev['EventMinutesFile']})
json.dump(out, open(OUT, 'w'), indent=0, ensure_ascii=False)
print(len(out), sum(1 for x in out if x['vote']), sum(1 for x in out if not x['vote']))
