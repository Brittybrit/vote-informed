"""For each candidate in a year, print the key and the fragment after 'support of / to support / to / for / with' (recipient hint)."""
import json, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mg_review import dedupe, key
from cand import is_candidate
W, Y = sys.argv[1], sys.argv[2]
keys = set(sys.argv[3:])
for v in dedupe(json.load(open(os.path.join(W, 'votes.json')))):
    k = key(v)
    if not k.startswith('mg-' + Y) or (keys and k not in keys): continue
    t = re.sub(r'\s+', ' ', v['title'] or '')
    t = re.sub(r'^.*?FLORIDA,?\s*', '', t)
    t = re.sub(r';?\s*PROVIDING FOR (THE )?(ADOPTION|INSTRUCTIONS).*$', '', t)
    m = re.search(r'(IN SUPPORT OF|TO SUPPORT|DONATE TO|SPONSORSHIP OF|SPONSORSHIP FOR|TO THE|TO [A-Z]|FOR THE|WITH|SUBMITTED BY|APPLICANT,?)\s(.*)', t)
    print(k, '|', (m.group(0) if m else t)[-170:])
