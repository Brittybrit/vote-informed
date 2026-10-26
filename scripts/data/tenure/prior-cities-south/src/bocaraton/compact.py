# prints the non-purchase items of one year compactly for hand review
import json, re, sys
I = json.load(open('cache/items.json'))
y = sys.argv[1]
def short(t):
    t = re.sub(r'^(Resolution|Ordinance)\s+(No\.?\s*)?[\d\-]+\s*', '', t)
    t = re.sub(r'An? (resolution|ordinance) of the City (Council )?of Boca Ra\w*\s*,?\s*(Florida,?)?\s*', '', t, flags=re.I)
    t = re.sub(r'providing for (severability|repealer|codification|conflicts?|an effective date)[;:,]?\s*|providing an effective date|;\s*;', '', t)
    t = re.sub(r'authorizing the (City Manager|Mayor)( and (the )?City Clerk)? to execute ', 'AUTH ', t)
    return re.sub(r'\s+', ' ', t).strip(' ;')
for it in I:
    if it['date'][:4] != y or it['purchase']: continue
    v = it['vote']
    vs = 'NOVOTE' if not v else '%s:%s:S=%s' % (v['result'][0], v['status'][:5], v['roll'].get('Singer', '-'))
    hint = ''
    if re.search(r'property|located at|site plan|conditional use|rezoning|plat\b|variance|abandon', it['caption'], re.I) and not re.search(r'\b(Inc|LLC|L\.L\.C|Corp|Company|Ltd|L\.P|LP|P\.A|Association|School|Church|Club|Hospital|University|Foundation)\b', it['caption']):
        hs = [m.group(0) for m in re.finditer(r'[^.]{0,90}(on behalf of|representing|the applicant|agent for|property owner|developer)[^.]{0,90}', it['discussion'])]
        hint = ' || HINT: ' + ' / '.join(hs)[:300] if hs else ' || HINT: none'
    print('%s|%s|%s|%s|%s%s' % (it['key'][5:], it['ref'].replace('Resolution No. ', 'R').replace('Ordinance No. ', 'O'), short(it['caption'])[:int(sys.argv[2]) if len(sys.argv) > 2 else 330], it['via'][:4], vs, hint))
