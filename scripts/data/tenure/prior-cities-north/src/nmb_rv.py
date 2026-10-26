"""NMB review list: python3 nmb_rv.py <items.json> <from> <to>"""
import json, re, sys, os, glob
HERE = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(sys.argv[1])); a, b = sys.argv[2:4]
dec = set()
for f in glob.glob(os.path.join(HERE, 'decisions', 'nmb-*.txt')):
    dec |= {l.split('|')[0].strip() for l in open(f) if l.strip() and not l.startswith('#')}
KW = re.compile(r'agreement|contract|license|award|bid|purchase|lease|settle|plat|variance|rezon|site plan|extension of hours|conditional use|grant|sponsor|donat|waive|sale|convey|easement|piggyback|RFP|RFQ|ITB|vendor|firm|LLC|Inc\b|Corp', re.I)
for r in sorted(R, key=lambda r: r['key']):
    if r['key'] in dec or not (a <= r['date'] <= b): continue
    txt = (r['title'] or '') + ' ' + r['what']
    if not r['ref'] and not KW.search(txt): continue
    if re.match(r'consent agenda', r['what'], re.I) is None and re.search(r'^(?:approve|adopt) the consent agenda', r['what'], re.I) and not r['ref']: continue
    t = re.sub(r'^AN? (RESOLUTION|ORDINANCE) OF THE MAYOR AND CITY COUNCIL OF THE CITY OF NORTH MIAMI BEACH,? FLORIDA,?\s*', '', r['title'] or '', flags=re.I)
    sm = (r['roll'] or {}).get('Smith', '-')
    tl = '%s-%s' % tuple(r['tally']) if r['tally'] else 'NOVOTE'
    c = r.get('ctx') or ''
    ex = []
    m = re.search(r'A/K/A\s+([0-9][^,;]{4,60})', c)
    if m: ex.append('@' + m.group(1).strip())
    for m in re.finditer(r'([A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,3})\s*\(?(?:,\s*)?(?:representing|attorney for|on behalf of|\(applicant|\(attorney)', c): ex.append('rep:' + m.group(1))
    for m in re.finditer(r'applicant,?\s+([A-Z][\w.&\' ]{3,50}?)(?:,|\s+spoke|\s+made|\s+\()', c): ex.append('appl:' + m.group(1))
    print(r['key'], r['ref'] or '', tl, 'S:' + sm, ' '.join(ex)[:120], (t if t != r['what'] else '')[:200] + ' || ' + r['what'][:100], sep='|')
