import json, sys
I = {i['key']: i for i in json.load(open('cache/items.json'))}
for k in sys.argv[1:]:
    it = I[k]; print('==', k, it['ref'], it['via'], 'present', it['present'], 'absent', it['absent'], 'recused', it['recused'])
    print('CAPTION', it['caption'][:600]); v = it['vote']
    if v: print('VOTE', v['status'], v['roll'], v['tally'], 'mover', v['mover'], v['second'], '| to:', v['to'][:200], '| text:', v['text'][:300])
    print('DISC', it['discussion'][:int(sys.argv[0] and 900)])
