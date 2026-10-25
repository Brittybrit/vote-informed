"""North Miami 2015-2021 treasurer's reports: rows from the PDF text layer. Each contribution starts at a date line
(mm dd yyyy, or 2020M10-style report tag on Timothe's typed forms). Name = the line before the date line (if it is not
part of the previous row) plus any non-address text after the date. Amount = first $/decimal amount from the date line
until the next row starts. Rows with no readable amount are dropped and counted."""
import re,json,collections
L={}
for l in open('nmcr/list.txt'):
  p=l.split()
  for i in p[2:]: L[i]=(p[0],p[1])
D=r'[\doOlI]'
DATE=re.compile(r'^\s*[|\[(]?\s*(%s{1,2})\s*[,/ ]?\s*(%s{1,2})\s*[,/ ]\s*((?:20)?[12][\doO])(?=\s|\W|$)(.*)$'%(D,D))
DATE2=re.compile(r'^\s*[|\[(]?\s*(%s{2})\s+(%s{2})\s+((?:20)?[12]\d)\s*[|\]}{/]?\s*(.*)$'%(D,D))
TAG=re.compile(r'^\s*(20[12]\d)\s*M\s*(\d{1,2})\s+(.*)$')
AMT=re.compile(r'(?:\$\s?|\s)(\d{1,3}(?:[,.]\d{3})*(?:[.,]\d\d)|\d{1,5})\s*[|\]]?\s*$')
AMTD=re.compile(r'\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d\d)?)|(\d{1,3}(?:,\d{3})*\.\d\d)\b')
CT=re.compile(r'\b(CHE|CHECK|CAS|CASH|MON|LOA|LOAN|INK|che|Che|ck|ok|Donation|Loan|REF)\b')
ADDR=re.compile(r'^\s*\d{2,6}\b|^\s*P\.?\s?O\.?\s*Box',re.I)
def num(s):
  s=s.replace('o','0').replace('O','0').replace('l','1').replace('I','1')
  return int(s)
def amtof(seg):
  for x in seg:
    m=AMTD.search(x)
    if m and CT.search(x): return (m.group(1) or m.group(2)).replace(',','')
  for x in seg:
    m=AMTD.search(x)
    if m: return (m.group(1) or m.group(2)).replace(',','')
  return None
def parse(b,who,cyc):
  P=open('nmcr/txt/%s.txt'%b,errors='ignore').read().split('=====PAGE=====')
  out=[];lost=0
  for pi,t in enumerate(P):
    if 'ITEMIZED CONTRIBUTION' not in t.upper(): continue
    j=t.find('Amendment'); j=t.find('\n',t.find('Amount',j)) if j>0 else -1
    body=t[j:] if j>0 else t
    k=body.find('DS-DE'); body=body[:k] if k>0 else body
    lines=[l for l in body.split('\n') if l.strip()]
    starts=[]
    for i,l in enumerate(lines):
      m=TAG.match(l)
      if m: starts.append((i,'%s-%02d-01'%(m.group(1),int(m.group(2))),m.group(3),'tag')); continue
      m=DATE.match(l) or DATE2.match(l)
      if m:
        try:
          mo,da,yr=num(m.group(1)),num(m.group(2)),num(m.group(3)); yr=yr if yr>1000 else 2000+yr
          if not(1<=mo<=12 and 1<=da<=31): raise ValueError
          starts.append((i,'%04d-%02d-%02d'%(yr,mo,da),m.group(4),'date'))
        except Exception: pass
    for n,(i,d,rest,kind) in enumerate(starts):
      end=starts[n+1][0]-(0 if starts[n+1][3]=='tag' else 1) if n+1<len(starts) else len(lines)
      seg=lines[i:end]
      a=amtof(seg)
      rest=re.sub(r'^[\s|\]}{/!]+','',rest)
      if kind=='tag': name=re.split(r'\s{2,}|\s(?:I|B|i|E|D)\s',rest)[0]; addr=' '.join(seg[1:3])
      else:
        prev=lines[i-1] if i>0 and (n==0 or starts[n-1][0]<i-1) else ''
        if prev and (AMTD.search(prev) or CT.search(prev)): prev=''
        name=prev.strip()
        if rest and not ADDR.match(rest): name=(name+' '+re.split(r'\s{2,}',rest)[0]).strip(); addr=' '.join(seg[1:3])
        else: addr=' '.join([rest]+seg[1:2])
      name=re.sub(r'[|\]\[{}]','',name).strip(' ,.-:;')
      ct=(CT.search(' '.join(seg)) or re.search('x','x')).group(0)
      if not a or not name: lost+=1; continue
      a=a.replace(',','')
      if re.match(r'^\d+\.\d{3}$',a): a=a.replace('.','')
      out.append({'doc':b,'page':pi+1,'date':d,'name':name,'addr':re.sub(r'\s+',' ',addr)[:120],'amount':float(a),'ctype':ct,'who':who,'cycle':cyc,'seg':' / '.join(seg)[:300]})
  return out,lost
R=[];LOST=collections.Counter()
for b,(w,c) in L.items():
  o,l=parse(b,w,c); R+=o; LOST[b]=l
json.dump(R,open('nmw/rows2.json','w'),indent=0)
print(len(R),collections.Counter((r['who'],r['cycle']) for r in R)); print('lost',sum(LOST.values()),LOST.most_common(12))
