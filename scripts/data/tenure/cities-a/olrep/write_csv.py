import csv,json,re,sys,glob
sys.path.insert(0,'olrep')
from extract import ex
F=json.load(open('ev/ol_filers.json'))
FIX={'Burnadette Weeks Norris-':'Burnadette Norris-Weeks','South Florida Venue Management and Marketing, LL':'South Florida Venue Management and Marketing, LLC','DFabrication & D Welding & , LLC':'D & D Welding & Fabrication, LLC','Kevin Montez and Jacqueline':'Kevin and Jacqueline Montez','Dozier Construction Academy Corp-William Dozier Busin':'Dozier Construction Academy Corp (William Dozier)','Micheal Clark O Individual n':'Micheal Clark','Sailboat Development LLC- Ben, David Jeremy Esq':'Sailboat Development LLC (David Jeremy Ben, Esq.)','Redwood Mosaic Dev LLC- Ben, David Jeremy Esq':'Redwood Mosaic Dev LLC (David Jeremy Ben, Esq.)','Atlantic Hosiery Building Partnership-Daniel Whitebook':'Atlantic Hosiery Building Partnership (Daniel Whitebook)','Sailboat Th Development LLC':'Sailboat Development LLC','Redwood Mosiac Development, LLC':'Redwood Mosaic Development, LLC','ILA 1416 L Business S':'ILA Local 1416','FLORIDA INDUSTRIAL PROPERTIES SIX, LLC Busines':'FLORIDA INDUSTRIAL PROPERTIES SIX, LLC','ALFONSO J ERVIN Individ':'ALFONSO J ERVIN','NATASHA ERVIN Individua':'NATASHA ERVIN','AFSCME Council 79 Political Committee':'AFSCME Council 79 Political Committee'}
def clean_addr(a): return re.sub(r'\s*(/\s*)+$','',re.sub(r'^\d{1,3}\s+','',a)).strip()
for last,acct in (('Bass','bass'),('Ervin','ervin')):
  f=[x for x in F if x.get('lastname','').upper()==last.upper()][0]
  docs=[d for d in f['documents'] if d['datesubmitted'][-2:] in ('22','23')]
  rows=[]
  groups={}
  for d in docs: groups.setdefault(re.sub(r'(?i)\s*amend(ment|ed)?\s*','',d['documentname']).strip().lower(),[]).append(d)
  for g in groups.values():
    g.sort(key=lambda d:(d['datesubmitted'][-2:],d['datesubmitted']),reverse=True)
    for d in g:
      p=glob.glob('evpdf/%s*.pdf'%d['documentid'][:8])
      if not p: print('missing pdf',d['documentname']); continue
      R=ex(p[0])
      if R:
        for r in R:
          date,name,addr,occ,amt=r
          if not name and addr: m=re.match(r'(.+?(?:LLC|Inc\.?|Corp\.?))\s+\d',addr); name,addr=(m.group(1),addr[m.end()-1:]) if m else (name,addr)
          name=FIX.get(name,name)
          rows.append([d['documentname'].strip(),d['documentid'],date,'C',name,clean_addr(addr),re.sub(r'\s+',' ',occ),amt.replace(',',''),''])
        break
  rows.sort(key=lambda r:(r[2],r[4]))
  out='/home/claude/vote-informed/scripts/data/city/opalocka/%s_2022.csv'%acct
  with open(out,'w',newline='') as fh:
    w=csv.writer(fh); w.writerow(['report','document id','item date','Cont/Exp','name','address 1','occupation','amount','Amend. code']); w.writerows(rows)
  print(acct,len(rows),sum(float(r[7]) for r in rows))
  for r in rows: print('   ',r[0],r[2],r[4],'|',r[5][:40],'|',r[7])
