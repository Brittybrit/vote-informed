"""Reads the struck-text GAA chapters (raw/gaa/ch<year>-<n>.txt from gaa-struck.py) and indexes every project tag.
index(chapter, tag_re) -> {number: [{'amount': int|None, 'vetoed': bool, 'kind': 'line'|'proviso', 'text': str}]}
A tag is vetoed when the tag itself is printed struck through ("Language stricken has been vetoed by the Governor").
Amount: the comma-grouped figure after the tag's dot leader (an itemized line), else the nonrecurring dollar figure
in the proviso sentence that names it (same reading as ../../flsenate/build-requests.py gaa_index)."""
import os, re
H = os.path.dirname(os.path.abspath(__file__)); G = os.path.join(H, '..', 'raw', 'gaa')
num = lambda s: int(s.replace(',', ''))
def load(ch):
    text, starts, flags = '', [], []
    for line in open(os.path.join(G, f'ch{ch}.txt')).read().split('\n'):
        toks = line.split()
        for i, t in enumerate(toks):
            st = t.startswith('~~') and t.endswith('~~') and len(t) > 4
            starts.append(len(text)); flags.append(st)
            text += (t[2:-2] if st else t) + (' ' if i < len(toks) - 1 else '')
        text += '\n'
    return text, starts, flags
def struck_at(starts, flags, pos):
    import bisect
    i = bisect.bisect_right(starts, pos) - 1
    return flags[i] if i >= 0 else False
def index(ch, tag_re):
    t, starts, flags = load(ch)
    idx = {}
    for m in re.finditer(tag_re, t):
        f = int(m.group(1)); j = m.end()
        cl = re.match(r'(?:\s*\((?:HB|HF|SB|Senate\s*Form|SF)[^)]*\))*', t[j:]); j += cl.end()
        a = re.match(r'\s*(?:(?:\.\s*){2,})?\s*(\d{1,3}(?:,\d{3})+)(?![\d,A-Za-z])', t[j:j + 200])
        if not a:  # a short dot leader on a full printed line: "(HB 3069). 2,000,000" with the amount ending the line
            a = re.match(r'\.[ ]*(\d{1,3}(?:,\d{3})+)[ ]*\n', t[j:j + 60])
        v = struck_at(starts, flags, m.start() + 1)
        if a:
            amt = num(a.group(1)); va = struck_at(starts, flags, j + a.start(1))
            idx.setdefault(f, []).append({'amount': amt, 'vetoed': v or va, 'kind': 'line', 'text': t[max(0, m.start() - 160):j + a.end()].strip()})
        else:
            k = max(t.rfind('. ', 0, m.start()), t.rfind('From the funds', 0, m.start()))
            s = t[k:m.start()]
            nr = [num(x) for x in re.findall(r'\$(\d{1,3}(?:,\d{3})+)(?:\s*\([^)]*\))*\s+in\s+nonrecurring', s)]
            ds = [num(x) for x in re.findall(r'\$(\d{1,3}(?:,\d{3})+)', s)]
            amt = sum(nr) if nr else (ds[-1] if ds else None)
            idx.setdefault(f, []).append({'amount': amt, 'vetoed': v, 'kind': 'proviso', 'text': t[max(0, k):m.end()].strip()[-400:]})
    return idx
