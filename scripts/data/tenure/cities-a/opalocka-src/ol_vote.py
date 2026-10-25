import re
FOREIGN=re.compile(r'future agenda|minutes|appoint|to the agenda|agenda as amended|approve the agenda|amend the agenda|add (agenda )?item|board appointment|chair of|adjourn|recess|reconsider|extend the meeting|voice vote|to defer the (meeting|vote)|waive the rules',re.I)
AMEND=re.compile(r'\bamendment\b[^.]{0,40}(passed|approved|failed)|motion to amend|friendly amendment|to amend (agenda item|the resolution|the item)',re.I)
def purpose(ctx):
  m=list(re.finditer(r'moved\s+by\s+[^,]{3,60}?,?\s+(?:and\s+)?seconded\s+by\s+(?:Commissioner|Vice\s*Mayor|Mayor)\s+(?:Dr\.\s*)?\w+\s*,?\s*(?:to\s+)?([^.]{0,120})',ctx))
  return m[-1].group(1) if m else ''
def own(votes,sec=None):
  keep=[]
  for v in votes:
    s=v['ctx']
    tail=s[s.rfind('There being'):] if 'There being' in s else s[-160:]
    p=purpose(s)
    itemish=re.search(r'resolution|ordinance|agenda item|item \d|amend|as amended|first reading|second reading|proposed',tail,re.I) or re.search(r'^(approve|discuss|pass|adopt|defer|accept|deny|table)',p.strip(),re.I) or (not p and len(keep)==0)
    ft=FOREIGN.search(tail)
    if ft and ft.group(0).lower()=='minutes' and sec in (12,13,14,15,16) and not re.search(r'minutes (of|from) the|minutes .{0,40}20\d\d',s[-400:],re.I): ft=None
    if ft or (FOREIGN.search(p) and not re.search(r'approve|discuss',p[:12],re.I)) or not itemish: break
    keep.append((v,tail+' '+p))
  if not keep: return None,None
  main=[x for x in keep if not AMEND.search(x[1])]
  v,tail=(main or keep)[-1]
  res='passed'
  if re.search(r'\bfailed\b',tail,re.I): res='failed'
  elif re.search(r'\bdefer',tail,re.I): res='tabled'
  elif re.search(r'first reading',tail,re.I): res='first reading'
  elif re.search(r'second reading',tail,re.I): res='second reading'
  return v,res
