"""Parse Governor and Cabinet agendas (raw/cabinet/<date>_agenda.txt, from cabinet.myflorida.com archive PDFs) into items by agency.
Writes raw/cabinet/agenda-items.json."""
import json, os, re, glob
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(HERE, 'raw', 'cabinet')
out = []
for f in sorted(glob.glob(os.path.join(D, '*_agenda.txt'))):
    date = os.path.basename(f)[:10]
    if not ('2019-01-08' <= date <= '2025-01-21'): continue
    sec = None; cur = None
    for line in open(f, encoding='utf-8', errors='replace'):
        l = re.sub(r'\s+', ' ', line).strip()
        if not l: continue
        m = re.match(r'^(\d{1,2})\s*[.)]\s*(.+)$', l)
        if m and sec:
            cur = {'date': date, 'agency': sec, 'item': m.group(1), 'title': m.group(2)}; out.append(cur); continue
        up = re.sub(r'[^A-Za-z]', '', l.split(',')[0])
        if up and up.isupper() and len(up) > 8 and not re.match(r'(MEETING|INVOCATION|PLEDGE|RESOLUTION|RECOGNITION|PRESENTATION|UPDATE|SPECIAL)', l.split(',')[0].strip().upper()):
            sec = l.split(',')[0].strip().upper(); cur = None; continue
        if re.match(r'^(INVOCATION|PLEDGE|RESOLUTION|RECOGNITION|PRESENTATION|UPDATE|SPECIAL|CALL TO|APPROVAL OF MINUTES|CONSIDERATION OF APPOINTMENTS)', l.upper()):
            sec = None; cur = None; continue
        if cur and not re.match(r'^(MEETING|Cabinet Meeting Room|[A-Z][a-z]+ \d{1,2}(st|nd|rd|th)?,? \d{4})', l): cur['title'] += ' ' + l
json.dump(out, open(os.path.join(D, 'agenda-items.json'), 'w'), indent=1)
import collections
c = collections.Counter(o['agency'] for o in out); print(len(out)); [print(n, k) for k, n in c.most_common()]
