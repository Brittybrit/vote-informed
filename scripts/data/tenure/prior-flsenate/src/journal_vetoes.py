"""Veto lists for the Senate-originated GAAs of 2017 (SB 2500, ch. 2017-70) and 2019 (SB 2500, ch. 2019-115) from the Governor's
line-item veto message as printed in the Senate Journal (2018 bound vol. I, Jan 9, 2018; 2020 bound vol. I). The message text
runs from "hereby withhold my approval of portions of Senate Bill 2500" to "The portions of Senate Bill 2500 which are set forth
herein with my objections are hereby vetoed". Each quoted vetoed item carrying '(Senate Form n)' / '(SF n)' gives the form;
its amount is the dollar figure that closes that item (dot leader + amount right after the tag), or None for a proviso item
(the builder then uses the form's GAA amount, since the whole item is struck). Output raw/gaa/veto<year>.json {form: amount|null}."""
import re, json, os
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAG = r'\((?:Senate\s*Form|SF)\s*0*(\d{3,4})\)'
for year, jf in [(2017, 'sj2018-vI.raw.txt'), (2019, 'sj2020-vI.raw.txt')]:
    t = open(os.path.join(H, 'raw/gaa', jf)).read()
    a = t.index('hereby withhold my approval of portions of Senate Bill 2500')
    b = t.index('The portions of Senate Bill 2500 which are set forth', a)
    s = re.sub(r'\s+', ' ', t[a:b])
    out = {}
    for m in re.finditer(TAG, s):
        f = int(m.group(1)); rest = s[m.end():m.end() + 160]
        cl = re.match(r'(?:\s*\((?:HB|HF|SB|Senate\s*Form|SF)[^)]*\))*', rest); rest = rest[cl.end():]
        am = re.match(r'\s*(?:(?:\.\s*){2,})\s*(\d{1,3}(?:,\d{3})+)', rest)
        v = int(am.group(1).replace(',', '')) if am else None
        out[f] = (out.get(f) or 0) + v if v is not None else out.get(f)
        if f not in out: out[f] = None
    json.dump({str(k): v for k, v in sorted(out.items())}, open(os.path.join(H, 'raw/gaa', f'veto{year}.json'), 'w'), indent=0)
    print(year, len(out), 'forms', sum(1 for v in out.values() if v is None), 'without amount')
