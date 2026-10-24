import sys,json
# prefix single-letter item ids with a section prefix
rid,pre=sys.argv[1],sys.argv[2]
L=[json.loads(l) for l in open(rid+'.jsonl')]
for o in L:
    if 'n' in o and o['n'] and o['n'][0].isalpha() and o['n'].isupper(): o['n']=pre+o['n']
open(rid+'.jsonl','w').write('\n'.join(json.dumps(o,ensure_ascii=False) for o in L)+'\n')
