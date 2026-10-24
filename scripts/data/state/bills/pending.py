import json,sys
rows=json.load(open('enacted.json'))
done={json.loads(l)['ch'] for l in open('stageA.jsonl') if l.strip()}
n=int(sys.argv[1]) if len(sys.argv)>1 else 10
p=[r for r in rows if r['chapter'] not in done]
print(len(p),'pending')
for r in p[:n]: print(r['chapter'],r['url'])
