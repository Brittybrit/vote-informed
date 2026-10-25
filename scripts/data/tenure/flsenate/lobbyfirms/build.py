"""Builds firms.json (same shape as scripts/data/state/lobbyfirms/firms.json: {"firms": {firm: [lobbyist, ...]}}) from the
floridalobbyist.gov Legislative Lobbying Firms directories lobfirml_2020..2024.pdf (downloaded Oct 25, 2026 from
https://www.floridalobbyist.gov/reports/lobfirml_<year>.pdf). Each page has two columns; each column is read separately.
A firm line ends with a phone number; a lobbyist line is "Last, First"; address and WithDrawn lines are skipped.
Also writes firms-by-year.json ({year: {firm: [lobbyist]}}) so a registration can be checked against the action's year."""
import json, os, re, subprocess
H = os.path.dirname(os.path.abspath(__file__))
PHONE = re.compile(r'^(.*?\S)\s{2,}\(\d{3}\)\s*\d{3}-\d{4}\s*$')
by_year = {}
for y in range(2020, 2025):
    pdf = os.path.join(H, f'lobfirml_{y}.pdf')
    n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))
    firms, cur = {}, None
    for p in range(1, n + 1):
        for x in (0, 306):
            t = subprocess.run(['pdftotext', '-layout', '-x', str(x), '-y', '0', '-W', '306', '-H', '792', '-f', str(p), '-l', str(p), pdf, '-'],
                               capture_output=True, text=True).stdout
            for l in t.split('\n'):
                if not l.strip() or 'LOBBYING FIRMS' in l or re.match(r'^\s*\d\d/\d\d/\d\d\s*$', l) or re.match(r'^\s*\d\d:\d\d:\d\d\s*$', l): continue
                m = PHONE.match(l)
                if m:
                    cur = re.sub(r'\s+', ' ', m.group(1)).strip(); firms.setdefault(cur, []); continue
                if cur is None: continue
                ind = len(l) - len(l.lstrip())
                s = l.strip()
                if s.startswith('WithDrawn') or s.startswith('x0'): continue
                # lobbyist lines are indented one space less than address lines and look like "Last, First"
                if re.match(r"^[A-Za-z'\-\. ]+,\s*[A-Za-z].*$", s) and not re.search(r'\d', s) and not re.search(r'\b(FL|Florida|Suite|Ste|Box|Street|St\.|Ave|Avenue|Blvd|Road|Rd|Dr|Drive)\b', s):
                    if s not in firms[cur]: firms[cur].append(s)
    by_year[str(y)] = dict(sorted(firms.items(), key=lambda kv: kv[0].lower()))
    print(y, len(firms), sum(len(v) for v in firms.values()))
merged = {}
for y, F in by_year.items():
    for f, L in F.items():
        m = merged.setdefault(f, [])
        for l in L:
            if l not in m: m.append(l)
json.dump({'_src': 'floridalobbyist.gov lobfirml_2020.pdf .. lobfirml_2024.pdf, read Oct 25, 2026', 'firms': dict(sorted(merged.items(), key=lambda kv: kv[0].lower()))},
          open(os.path.join(H, 'firms.json'), 'w'), indent=1, ensure_ascii=False)
json.dump(by_year, open(os.path.join(H, 'firms-by-year.json'), 'w'), indent=1, ensure_ascii=False)
print('merged', len(merged))
