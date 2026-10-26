"""Fills the chapter-sequence gaps in enacted.jsonl (laws the flsenate 'Became Law' list prints without a chapter number or
omits: the General Appropriations Acts, listed as line-item vetoed, and HB 7129 (2013)). Chapter numbers checked on the
Laws of Florida chapter PDFs at laws.flrules.org/<year>/<n> (first page names the bill). Idempotent."""
import json, os
H = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(H, 'enacted.jsonl')
E = [json.loads(l) for l in open(P) if l.strip()]
SET = {('2020', 'HB 5001'): '2020-111', ('2018', 'HB 5001'): '2018-9', ('2016', 'HB 5001'): '2016-66', ('2014', 'HB 5001'): '2014-51', ('2013', 'HB 7129'): '2013-219'}
ADD = [{'bill': 'SB 2500', 'session': '2019', 'chapter': '2019-115', 'title': 'Appropriations', 'url': 'https://www.flsenate.gov/Session/Bill/2019/2500'},
       {'bill': 'SB 2500', 'session': '2017', 'chapter': '2017-70', 'title': 'Appropriations', 'url': 'https://www.flsenate.gov/Session/Bill/2017/2500'},
       {'bill': 'SB 1500', 'session': '2013', 'chapter': '2013-40', 'title': 'General Appropriations Act', 'url': 'https://www.flsenate.gov/Session/Bill/2013/1500'}]
for e in E:
    k = (e['session'], e['bill'])
    if not e['chapter'] and k in SET: e['chapter'] = SET[k]; e['chapterSource'] = 'laws.flrules.org/' + SET[k].replace('-', '/')
have = {e['chapter'] for e in E}
for a in ADD:
    if a['chapter'] not in have: E.append(dict(a, chapterSource='laws.flrules.org/' + a['chapter'].replace('-', '/')))
with open(P, 'w') as f:
    for e in E: f.write(json.dumps(e, ensure_ascii=False) + '\n')
print(len(E), sum(1 for e in E if not e['chapter']))
