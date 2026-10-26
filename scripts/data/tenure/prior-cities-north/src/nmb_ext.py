"""Extract address / entities / reps from NMB motion context: python3 nmb_ext.py <items.json> key [key...]"""
import json, re, sys
R = {r['key']: r for r in json.load(open(sys.argv[1]))}
for k in sys.argv[2:]:
    r = R.get(k); c = r['ctx'] if r else ''
    hdr = None
    if r and r['ref']:
        num = r['ref'].split()[-1].replace('R', '')
        i = c.rfind(num)
        if i >= 0: c = c[i:]
    a = re.findall(r'(?:A/K/A|LOCATED AT|located at|AT|address of)\s+([0-9]{3,6}[^,;]{4,40})', c)
    ap = re.findall(r'([A-Z][\w&.\' ]{2,60}?,?\s(?:LLC|L\.L\.C\.|Inc\.?|INC\.?|Corp\.?|CORP|LTD|Ltd\.?|L\.P\.|LP|LLLP)\b)', c)
    reps = re.findall(r'([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,2}),?\s*\(?(?:representing|attorney for|on behalf of|applicant\)|attorney\)|representative)', c)
    t = re.search(r'(AN?\s+(?:RESOLUTION|ORDINANCE)\s+OF\s+THE\s+MAYOR.{0,700})', c)
    print('##', k, '| addr:', a[:2], '| ent:', sorted(set(x.strip() for x in ap))[:5], '| reps:', reps[:3])
    print('   T:', (t.group(1)[60:520] if t else c[:300]))
