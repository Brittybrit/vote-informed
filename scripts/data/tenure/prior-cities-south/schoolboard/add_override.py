# helper: add consent-agenda overrides for scanned meetings whose minutes record only the Consent Agenda vote
import json, sys, os
D = os.path.dirname(os.path.abspath(__file__))
A = json.load(open(D + '/actions.json')); O = json.load(open(D + '/overrides.json'))
def add(date, items, doc, line, tally, absent=(), abstain=None, mover=None, second=None, extra='', unknown=()):
    abstain = abstain or {}
    for a in A['actions']:
        if a['date'] != date or a['item'] not in items: continue
        roll = {}
        for k in a['roll']:
            roll[k] = 'unknown' if k in unknown else 'absent' if k in absent else 'abstain' if k in abstain.get(a['item'], ()) else 'yes'
        O[a['id']] = {'roll': roll, 'tally': tally, 'mover': mover, 'second': second, 'doc': doc,
                      'note': 'Official minutes (%s, OCR of scanned pages): "%s"%s' % (doc, line, (' ' + extra) if extra else '')}
if __name__ == '__main__':
    exec(open(sys.argv[1]).read())
    json.dump(O, open(D + '/overrides.json', 'w'), indent=1, ensure_ascii=False)
