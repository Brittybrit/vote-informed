# merges tr/*.txt (id|es|ht) into ../../../translations.json and titles-en.json for tenure actions
import json, os, glob
SP = os.path.dirname(os.path.abspath(__file__)); CITY = os.path.abspath(os.path.join(SP, '..', '..'))
T = json.load(open(CITY + '/translations.json')); E = json.load(open(CITY + '/titles-en.json'))
U = json.load(open(CITY + '/actions.json')); ids = {a['id']: a for a in U['actions']}
n = 0
for f in sorted(glob.glob(SP + '/*.txt')):
    for l in open(f):
        l = l.rstrip('\n')
        if not l.strip() or l.startswith('#'): continue
        i, es, ht = l.split('|')
        if i not in ids: print('unknown id', i); continue
        T[i] = {'es': es, 'ht': ht}; E[i] = ids[i]['title']; n += 1
json.dump(T, open(CITY + '/translations.json', 'w'), indent=1, ensure_ascii=False)
json.dump(E, open(CITY + '/titles-en.json', 'w'), indent=1, ensure_ascii=False)
miss = [a['id'] for a in U['actions'] if a['parties'] and a['id'] not in T]
print(n, 'merged;', len(miss), 'listed actions still without es/ht', miss[:5])
