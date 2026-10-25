"""Parse itemized contributions (DS-DE 13) pages from EasyVote PDF text (pdftotext -layout). Prints rows to review."""
import re,sys,subprocess,json
def pages(pdf):
  t=subprocess.run(['pdftotext','-layout',pdf,'-'],capture_output=True,text=True).stdout
  return t.split('\f')
def contrib_pages(pdf):
  return [p for p in pages(pdf) if 'ITEMIZED CONTRIBUTIONS' in p]
DATE=re.compile(r'^\s{0,14}(\d\d)\s*/\s*(\d\d)\s*/\s*(\d\d)\s+(\S.*)$')
AMT=re.compile(r'\$\s?([\d,]+\.\d\d)')
def rows(pdf):
  out=[]
  for p in contrib_pages(pdf):
    L=p.splitlines()
    starts=[i for i,l in enumerate(L) if DATE.match(l)]
    for j,i in enumerate(starts):
      end=starts[j+1] if j+1<len(starts) else len(L)
      blk=L[max(0,i-3):end]
      own=L[i:end]
      m=DATE.match(L[i])
      amts=[a for l in own for a in AMT.findall(l)]
      # name: text of date line up to the first wide gap, plus continuation lines in the same column before the address line
      head=L[i][m.start(4):]
      name=re.split(r'\s{3,}',head.strip())[0]
      pre=[l for l in L[max(0,i-3):i] if l.strip() and not re.search(r'Number|Sequence|Amount|Description|Code|\(\d+\)',l)]
      out.append({'date':'20%s-%s-%s'%(m.group(3),m.group(1),m.group(2)),'name':name,'amounts':amts,'block':'\n'.join(own)[:600],'pre':'\n'.join(pre)})
  return out
if __name__=='__main__':
  for r in rows(sys.argv[1]): print(r['date'],'|',r['name'],'|',r['amounts'])
