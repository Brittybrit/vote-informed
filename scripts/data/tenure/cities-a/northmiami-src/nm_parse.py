import json,re,datetime
I=json.load(open('nm/index.json'))
HDR=re.compile(r'^\s*(City of North Miami.*|776 NE 125.*|North Miami, FL 33161.*|City Hall \|.*|\s*Summary Minutes\s*|\s*(Tuesday|Monday|Wednesday|Thursday|Friday),?\s+\w+\s*\d+,?\s*\d{4}\s*|\s*Page \| \d+\s*|\s*[A-Z]\s*)$')
MON=['january','february','march','april','may','june','july','august','september','october','november','december']
def pdate(s):
  m=re.search(r'([A-Za-z]+)\s*(\d{1,2})\s*,\s*(\d{4})',s)
  if m and m.group(1).lower() in MON: 
    try: return datetime.date(int(m.group(3)),MON.index(m.group(1).lower())+1,int(m.group(2))).isoformat()
    except: return None
EVD=set(e[0] for e in I['events'])
def pages_for(t,d,p=None):
  if p and len([x for x in I.get('fileDates',{}).get(p,[]) if x in EVD])<2: return t
  pages=t.split('\f')
  dates=[]
  for pg in pages:
    m=re.search(r'North Miami, FL 33161\s+(?:(?:Mon|Tues|Wednes|Thurs|Fri)day,?)?\s*([A-Za-z]+\s*\d{1,2}\s*,\s*\d{4})',pg)
    if not m: m=re.search(r'Summary Minutes\s*\n?\s*(?:(?:Mon|Tues|Wednes|Thurs|Fri)day,?)?\s*([A-Za-z]+\s*\d{1,2}\s*,\s*\d{4})',pg)
    dates.append(pdate(m.group(1)) if m else None)
  ds=set(x for x in dates if x)
  if len(ds)<=1: return t
  # carry forward
  out=[];cur=dates[0]
  for pg,dd in zip(pages,dates):
    if dd: cur=dd
    if cur==d: out.append(pg)
  return '\f'.join(out)
meet=[]
def emit(d,ev,src,t,kind):
  lines=[l for l in t.split('\n') if not HDR.match(l)]
  body='\n'.join(lines)
  items=re.split(r'\n\s*\[?(?=TAB\s+[A-Z]{1,2}(?:\s*[–—\-:]|\s*\]\s*\S|\s*\]?\s*\n))',body)
  json.dump({'date':d,'ev':ev,'file':src,'kind':kind,'pre':items[0],'items':items[1:]},open('nm/m_%s_%s.json'%(d,ev),'w'))
  meet.append((d,ev,src,kind,len(items)-1))
for d,f in I.get('ac',{}).items():
  emit(d,'ac',f,open('nm/ac/%s.txt'%f).read(),'ac')
for d,ev,title in I['events']:
  if d>='2025-01-01': continue
  ps=list(dict.fromkeys(I['minutes'].get(d,[])))
  if not ps: continue
  best=None;bt=None
  for p in ps:
    t=pages_for(open('nm/pdf/'+p.replace('/','_')+'.txt').read(),d,p)
    if re.search(r'Summary Minutes',t) and (pdate(t[:600])==d or len(ps)==1 or d in I.get('fileDates',{}).get(p,[])):
      if bt is None or len(t)>len(bt): best,bt=p,t
  if not best: print('none',d,ev,ps); continue
  emit(d,ev,best,bt,'champ')
json.dump(meet,open('nm/meetings.json','w'))
print(len(meet))
for m in meet: 
  if m[4]==0: print('noitems',m)
