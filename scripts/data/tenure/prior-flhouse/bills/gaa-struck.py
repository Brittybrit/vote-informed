"""General Appropriations Acts as printed in the Laws of Florida (laws.flrules.org/<year>/<chapter number>), where
"Language stricken has been vetoed by the Governor". Converts each chapter PDF to text with every struck (vetoed)
word wrapped in ~~ ~~, so the veto status of a project line is read from the official chapter law itself.
A word counts as struck when a thin drawn line (height < 1 pt) crosses the middle third of the word and covers at
least half of its width. Writes raw/gaa/ch<year>-<n>.txt (one text line per printed line). Resumable.
Run: python3 scripts/data/tenure/prior-flhouse/bills/gaa-struck.py"""
import os, subprocess, sys
import pdfplumber
H = os.path.dirname(os.path.abspath(__file__)); G = os.path.join(H, '..', 'raw', 'gaa'); os.makedirs(G, exist_ok=True)
CH = sys.argv[1:] or ['2025-198', '2024-231', '2023-239', '2022-156', '2021-36', '2020-111', '2019-115', '2018-9', '2017-70']
for ch in CH:
    y, n = ch.split('-'); out = os.path.join(G, f'ch{ch}.txt'); pdfp = os.path.join(G, f'ch{ch}.pdf')
    if os.path.exists(out): continue
    if not os.path.exists(pdfp):
        r = subprocess.run(['curl', '-sS', '-L', '-m', '300', '-o', pdfp, '-w', '%{http_code}', f'https://laws.flrules.org/{y}/{n}'], capture_output=True, text=True)
        if r.stdout != '200' or open(pdfp, 'rb').read(4) != b'%PDF': print('FAIL', ch, r.stdout); os.remove(pdfp); continue
    lines_out = []; struck_words = 0
    with pdfplumber.open(pdfp) as pdf:
        for pg in pdf.pages:
            strikes = [c for c in pg.curves + pg.lines + pg.rects if (c['bottom'] - c['top']) < 1.0 and (c['x1'] - c['x0']) > 2]
            words = pg.extract_words(keep_blank_chars=False, use_text_flow=False)
            rows = {}
            for w in words:
                h = w['bottom'] - w['top']; lo, hi = w['top'] + h / 3, w['bottom'] - h / 3
                st = False
                for s in strikes:
                    m = (s['top'] + s['bottom']) / 2
                    if lo <= m <= hi:
                        ov = min(s['x1'], w['x1']) - max(s['x0'], w['x0'])
                        if ov >= 0.5 * (w['x1'] - w['x0']): st = True; break
                if st and w['text'].startswith('CODING'): st = False
                struck_words += st
                key = round(w['top'] / 3)
                rows.setdefault(key, []).append((w['x0'], ('~~' + w['text'] + '~~') if st else w['text']))
            for k in sorted(rows):
                t = ' '.join(t for _, t in sorted(rows[k]))
                if 'CODING' in t: t = t.replace('~~', '')
                lines_out.append(t)
            lines_out.append('\f')
    open(out, 'w').write('\n'.join(lines_out)); os.remove(pdfp)  # the text keeps the strike marks; the PDF is at the URL
    print(ch, 'lines', len(lines_out), 'struck words', struck_words, flush=True)
print('DONE')
