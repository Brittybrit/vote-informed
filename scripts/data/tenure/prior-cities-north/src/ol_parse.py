"""Opa-locka commission minutes (CivicClerk PDFs already text-extracted by the cities-a slice in <scratch>/ol/minold,
listed in <scratch>/ol/bydate.json) -> items with roll calls, Nov 2019 - Nov 2020 (Bass's first term).
Also reads the Archive Center minutes in opalocka/minutes (May 2010 - Dec 2012, Tydus; Oct 2018 - May 2019, Bass):
build a bydate.json there first (src/ol_arch_index.py). Items there are also numbered '1,' (OCR), 'a.' or 'a)'.
Usage: python3 ol_parse.py <scratch>/ol <from> <to> <out.json>
Each item takes the first roll-call block after its title and before the next item; an item with no block of
its own (consent list) takes the next block in the same section."""
import json, re, sys, os
ALIAS = {'Domingues': 'Dominguez', 'Dominquez': 'Dominguez', 'Kelly': 'Kelley', 'Irvin': 'Ervin', 'Pigat': 'Pigatt', 'Burk': 'Burke',
         'Jobnson': 'Johnson', 'Johnsen': 'Johnson', 'Tydns': 'Tydus', 'Tydos': 'Tydus', 'Tyus': 'Tydus', 'Holms': 'Holmes', 'Mi11er': 'Miller'}
# 2019-2020: Pigatt, Davis, Kelley, Burke, Bass (later Taylor, Williams, Dominguez, Ervin, Santiago)
# 2010-2012 (Archive Center): Kelley, Taylor, Tydus, Holmes, Johnson, Miller (from Nov 2010), Santiago (from Nov 2012)
# Oct 2018 - May 2019: Taylor, Kelley, Holmes, Riley, Pigatt (to Nov 14, 2018); Pigatt, Davis, Kelley, Burke, Bass (from Nov 29, 2018)
MEM = {'Bass', 'Kelley', 'Taylor', 'Williams', 'Davis', 'Dominguez', 'Pigatt', 'Santiago', 'Burke', 'Holmes', 'Riley', 'Ervin',
       'Tydus', 'Johnson', 'Miller'}
VOTE = re.compile(r'^\s*(?:Commissioner|Commission|Vice\s*Mayor|Mayor|Conunissioner|Commisioner|Comm\.)\s*(?:Dr\.\s*)?([A-Z][A-Za-z]+)\s*(?:Jr\.?,?)?\s{1,}(?::\s*)?(Yes|No|Not\s+Present|Absent|Abstain(?:ed)?|Recused|Excused|Nay|Aye)\b', re.M)
VAL = {'yes': 'yes', 'aye': 'yes', 'no': 'no', 'nay': 'no', 'not present': 'absent', 'absent': 'absent', 'excused': 'absent', 'abstain': 'abstain', 'abstained': 'abstain', 'recused': 'recused'}
ITEM = re.compile(r'^\s{0,12}(\d{1,2}\s*-\s*\d{1,2}|\d{1,2}|[a-z])\s*[.:,)]\s+(?=AN?\s+(?:RESOLUTION|ORDINANCE))', re.M)
SECT = re.compile(r'^\s{0,9}(\d{1,2})\.\s+(?!AN?\s)([A-Z][A-Z&’\'/ ,()\-]{4,})', re.M)
MOVED = re.compile(r'(?:It\s+was\s+)?moved\s+by\s+(?:Commissioner|Vice\s*Mayor|Mayor)\s+(?:Dr\.\s*)?([A-Z]\w+),?\s+(?:and\s+)?seconded\s+by\s+(?:Commissioner|Vice\s*Mayor|Mayor)\s+(?:Dr\.\s*)?([A-Z]\w+)\s*,?\s*(?:to\s+)?(.{0,160})', re.S)

def blocks(t):
    out = []
    for m in VOTE.finditer(t):
        nm = ALIAS.get(m.group(1), m.group(1))
        if nm not in MEM: continue
        v = VAL[re.sub(r'\s+', ' ', m.group(2).lower())]
        if out and m.start() - out[-1]['end'] < 400 and nm not in out[-1]['roll']:
            out[-1]['roll'][nm] = v; out[-1]['end'] = m.end()
        else: out.append({'start': m.start(), 'end': m.end(), 'roll': {nm: v}})
    return [b for b in out if len(b['roll']) >= 3]

def main():
  B, D0, D1, OUT = sys.argv[1:5]
  M = json.load(open(os.path.join(B, 'bydate.json')))
  rows = []
  for date in sorted(M):
      if not (D0 <= date <= D1): continue
      for path, typ, n, *_ in M[date]:
          if typ in ('WORKSHOP', 'SUNSHINE') or typ.startswith('COMMUNITY'): continue
          t = open(os.path.join(B, path), errors='ignore').read()
          if re.search(r'REDEVELOPMENT AGENCY|CRA BOARD', t[:600].upper()): continue
          bl = blocks(t)
          secs = [(m.start(), m.group(2).strip()) for m in SECT.finditer(t)]
          its = list(ITEM.finditer(t))
          for i, m in enumerate(its):
              st = m.start(); en = its[i + 1].start() if i + 1 < len(its) else len(t)
              sec = ([s for p, s in secs if p < st] or [''])[-1]
              if re.search(r'PULL LIST|APPROVAL OF AGENDA|MINUTES|CALL TO ORDER|ROLL CALL', sec): continue
              nxtsec = min([p for p, s in secs if p > st] or [len(t)])
              body = t[st:en]
              tm = re.search(r'AN?\s+(?:RESOLUTION|ORDINANCE).*?(?:EFFECTIVE\s+DATE|DATE\s*\.)', body, re.S)
              title = re.sub(r'\s+', ' ', tm.group(0)) if tm else re.sub(r'\s+', ' ', body[:900])
              own = [b for b in bl if st < b['start'] < en]
              src = 'own'
              if not own:
                  own = [b for b in bl if en <= b['start'] < nxtsec][:1]; src = 'next-in-section'
              b = own[-1] if own else None
              mv = None
              if b:
                  pre = [mm for mm in MOVED.finditer(t[max(0, b['start'] - 1500):b['start']])]
                  if pre: mv = pre[-1]
              rows.append(dict(date=date, doc=path, typ=typ, code=re.sub(r'\s+', '', m.group(1)), section=sec, title=title,
                               roll=b['roll'] if b else None, src=src if b else None,
                               mover=ALIAS.get(mv.group(1), mv.group(1)) if mv else None, second=ALIAS.get(mv.group(2), mv.group(2)) if mv else None,
                               what=re.sub(r'\s+', ' ', mv.group(3))[:120] if mv else None,
                               text=re.sub(r'\s+', ' ', body)[:2500]))
  json.dump(rows, open(OUT, 'w'), indent=0)
  print(len(rows), 'items')


if __name__ == '__main__':
    main()
