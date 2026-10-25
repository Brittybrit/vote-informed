import re,sys,glob,json
sys.path.insert(0,'olrep')
from itemize import contrib_pages
DATE=re.compile(r'^\s{0,14}(\d\d)\s*/\s*(\d\d)\s*/\s*(\d\d)\b(.*)$')
AMT=re.compile(r'\$\s?([\d,]+\.\d\d)')
def ex(pdf):
  out=[]
  for p in contrib_pages(pdf):
    L=[l for l in p.splitlines()]
    idx=[i for i,l in enumerate(L) if DATE.match(l)]
    for j,i in enumerate(idx):
      end=idx[j+1] if j+1<len(idx) else len(L)
      seg=L[i:end]
      # stop at footer
      seg=[l for l in seg if 'DS-DE' not in l]
      m=DATE.match(seg[0]); rest=' '*(m.start(4))+m.group(4)
      cols=[rest]+seg[1:]
      left=[]; addr=[]; mid=[]
      for l in cols:
        a=l[:52]; b=l[52:]
        if re.match(r'^\s*\d{1,3}\s*$',a): continue
        if a.strip(): (addr if (re.match(r'^\s*(\d|P\.? ?O\.?\s*Box)',a) or addr) else left).append(a.strip())
        mid.append(b)
      amts=[x for l in seg for x in AMT.findall(l)]
      name=re.sub(r'\s+',' ',' '.join(left)).strip()
      name=re.sub(r'\s*(Individual|Business|Check|Cash|Non-?)\s*$','',name)
      occ=re.sub(r'\s+',' ',' '.join(re.sub(r'\$[\d,.]+|Check|Cash|Individual|Business|Non-|Political|Committee','',x) for x in mid)).strip()
      out.append(['20%s-%s-%s'%(m.group(3),m.group(1),m.group(2)),name,re.sub(r'\s+',' ',' '.join(addr)),occ,amts[0] if amts else ''])
  return out
if __name__=='__main__':
  for r in ex(sys.argv[1]): print(' | '.join(r))
