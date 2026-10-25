import re
def deferred(s6):
  s=re.sub(r'\(\s*deferrals and deletions\s*\)','',s6,flags=re.I)
  s=re.sub(r'(?i)approval of consent agenda and pull list:?','. ',s)
  out=set()
  for h in re.findall(r'([^.]*?(?:defer|withdr|delet|remov)[^.]*\.)',s,re.I):
    if re.search(r'(?i)reconsider',h): continue
    if re.search(r'(?i)will defer at the will',h): continue
    h=re.sub(r'(?i)keep item 13\s*-\s*\d+','',h)
    h=re.sub(r'\b16\s*-?\s*A\s*-?\s*\d+','',h)
    nums=re.findall(r'\b13\s*-\s*(\d{1,2})\b',h)
    # continuation lists like "13-3, 13-4, and 13-5" handled above; bare "and 5" after a 13-x
    for m in re.finditer(r'\b13\s*-\s*\d{1,2}((?:\s*(?:,|and|&)\s*\d{1,2}\b(?!\s*-))+)',h):
      nums+=re.findall(r'\d{1,2}',m.group(1))
    out.update(nums)
  return out
def pulled(s6):
  s=re.sub(r'\(\s*deferrals and deletions\s*\)','',s6,flags=re.I)
  s=re.sub(r'(?i)approval of consent agenda and pull list:?','. ',s)
  out=set()
  for h in re.findall(r'([^.]*?pull[^.]*\.)',s,re.I):
    h=re.sub(r'\b16\s*-?\s*A\s*-?\s*\d+','',h)
    out.update(re.findall(r'\b13\s*-\s*(\d{1,2})\b',h))
    for m in re.finditer(r'\b13\s*-\s*\d{1,2}((?:\s*(?:,|and|&)\s*\d{1,2}\b(?!\s*-))+)',h):
      out.update(re.findall(r'\d{1,2}',m.group(1)))
  return out
