import json,glob,re,html,datetime
M=['January','February','March','April','May','June','July','August','September','October','November','December']
def walk(items):
  for it in items:
    yield it
    yield from walk(it.get('Children',[]))
evs=[];res={}
for f in glob.glob('nm/ev/*.json'):
  try: d=json.load(open(f))
  except Exception: continue
  e=d.get('Event') or {}
  if not e or 'Agenda' not in d or (d.get('Board') or {}).get('BoardName')!='City Council': continue
  evs.append((e['EventDateTimeCustomerLocal'][:10],e['CustomerEventID'],e['EventTitle']))
  for it in walk(d['Agenda']['AgendaItems']):
    desc=re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',it.get('Description') or '')))
    if not re.search(r'MINUTES',desc,re.I): continue
    seg=desc.split('Sponsored')[0]
    dates=[]
    for m in re.finditer(r'([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})',seg):
      if m.group(1).capitalize() in M:
        try: dates.append(datetime.date(int(m.group(3)),M.index(m.group(1).capitalize())+1,int(m.group(2))).isoformat())
        except: pass
    for a in it.get('Attachments',[]):
      for dt in dates: res.setdefault(dt,[]).append(a['MediaFileLocation']+'/'+a['MediaFileName'][:-4])
evs.sort()
json.dump({'events':evs,'minutes':res},open('nm/index.json','w'),indent=0)
miss=[e for e in evs if e[0] not in res and e[0]<'2025-01-01']
print(len(evs),len(res),'missing',len(miss))
for e in miss: print(e)
