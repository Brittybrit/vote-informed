import sys,json
# usage: python3 _save.py <id>  (reads JSON lines from stdin, validates, writes <id>.jsonl)
rid=sys.argv[1]; lines=[l.strip() for l in sys.stdin if l.strip()]
objs=[json.loads(l) for l in lines]
assert 'roll' in objs[0]
open(rid+'.jsonl','w').write('\n'.join(json.dumps(o,ensure_ascii=False) for o in objs)+'\n')
print(rid,len(objs)-1)
