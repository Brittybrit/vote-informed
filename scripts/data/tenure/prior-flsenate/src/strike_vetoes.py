"""Vetoed Senate-form items from the Laws of Florida GAA chapter PDF (laws.flrules.org), where vetoed language is printed
struck through ("CODING: Language stricken has been vetoed by the Governor"). A '(Senate Form n)' / '(SF n)' tag counts as
vetoed when a horizontal stroke crosses the middle of the tag's words. Output raw/gaa/strike<year>.json {form: true}.
Used for FY2018-19 (no veto list found on flgov.com and the House-originated GAA's veto message is not in the Senate Journal);
checked against the flgov.com 2020 list and the 2017 Senate Journal message (see progress.md)."""
import pdfplumber, re, json, sys, os
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def run(year):
    pdf = pdfplumber.open(os.path.join(H, 'raw/gaa', f'gaa{year}.pdf'))
    out = {}
    for pg in pdf.pages:
        segs = [(l['x0'], l['x1'], (l['top'] + l['bottom']) / 2) for l in pg.lines if abs(l['top'] - l['bottom']) < 1.5]
        segs += [(r['x0'], r['x1'], (r['top'] + r['bottom']) / 2) for r in pg.rects if r['height'] < 1.5 and r['width'] > 3]
        segs += [(c['x0'], c['x1'], (c['top'] + c['bottom']) / 2) for c in pg.curves if c['bottom'] - c['top'] < 1.5 and c['x1'] - c['x0'] > 3]
        if not segs: continue
        ws = pg.extract_words()
        for i, w in enumerate(ws):
            m = re.match(r'^(\d{3,4})\)', w['text'])
            if not m or i == 0: continue
            prev = ws[i - 1]['text']; prev2 = ws[i - 2]['text'] if i > 1 else ''
            if not (prev in ('(SF', 'Form') and (prev == '(SF' or prev2 == '(Senate')): continue
            mid = (w['top'] + w['bottom']) / 2; h = w['bottom'] - w['top']
            struck = any(x0 <= w['x0'] + 2 and x1 >= w['x0'] + 14 and abs(y - mid) < h * 0.35 for x0, x1, y in segs)  # stroke over the form number
            f = int(m.group(1))
            out[f] = out.get(f, False) or struck
    return out
if __name__ == '__main__':
    for y in sys.argv[1:]:
        r = run(y)
        json.dump({str(k): v for k, v in sorted(r.items())}, open(os.path.join(H, 'raw/gaa', f'strike{y}.json'), 'w'))
        print(y, len(r), 'tags', sum(r.values()), 'struck')
