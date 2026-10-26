"""Compact NMB review with titles looked up in the minutes text: python3 nmb_rv2.py <items.json> <nmb dir> <from> <to> [decided-prefix]"""
import json, re, sys, os, glob
IT, D, A, B = sys.argv[1:5]
HERE = os.path.dirname(os.path.abspath(__file__))
dec = set()
for f in glob.glob(os.path.join(HERE, 'decisions', 'nmb-*.txt')):
    for l in open(f, encoding='utf8'):
        if l.strip() and not l.startswith('#'): dec.add(l.split('|')[0])
cache = {}
def text(i):
    if i not in cache: cache[i] = re.sub(r'\s+', ' ', open(os.path.join(D, 'txt', '%d.txt' % i), errors='ignore').read())
    return cache[i]
SKIP = r'^(?:approve the (?:re-?)?appointment|approve the minutes|amend|table|defer|reconsider|add the language|approve the use of the city (?:logo|seal))'
for r in json.load(open(IT)):
    if not (A <= r['date'] <= B) or r['key'] in dec: continue
    what = r['what']; t = r['title'] if (r['title'] or '').startswith('A') and len(r['title']) > 60 else ''
    if not t and r.get('ref'):
        num = r['ref'].split()[-1].lstrip('R')
        T = text(r['doc'])
        for m in re.finditer(r'(?:Resolution|Ordinance)\s*(?:No\.?\s*)?_?R?-?\s*' + re.escape(num) + r'\b', T):
            mm = re.search(r'(AN?\s+(?:RESOLUTION|ORDINANCE)\s+OF\s+THE\s+(?:MAYOR|CITY).{20,800}?)(?:\.\s+[A-Z][a-z]|Motion)', T[m.end():m.end() + 1500])
            if mm: t = mm.group(1); break
    t = re.sub(r'^AN?\s+(?:RESOLUTION|ORDINANCE)\s+OF\s+THE\s+(?:MAYOR\s+AND\s+)?CITY\s+(?:COUNCIL|COMMISSION)\s+OF\s+THE\s+CITY\s+OF\s+NORTH\s+MIAMI\s+BEACH,?\s*(?:FLORIDA,?)?\s*', '', t)
    rl = r['roll'] or {}
    sm = rl.get('Smith', '-')
    ctx = r['ctx'][-2500:]
    reps = re.findall(r'([A-Z][a-z]+(?:\s+[A-Z]\.)?\s+[A-Z][A-Za-z\-]+)(?:,| of [^,]{3,40},)?\s+(?:on behalf of|representing|attorney for)', ctx)
    ap = re.findall(r'(?:applicant|owner)[, ]+([A-Z][a-z]+ [A-Z][a-z]+)', ctx)
    flag = 'SKIP? ' if re.match(SKIP, what, re.I) else ''
    tally = '%d-%d' % tuple(r['tally']) if r['tally'] else 'NOVOTE'
    print('%s|%s|S:%s|%s%s|%s%s' % (r['key'], tally, sm, flag, what[:90], t[:330], (' || reps:' + ';'.join(sorted(set(reps + ap)))) if reps or ap else ''))
