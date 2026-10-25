import json,re,csv,os
F=json.load(open('nmw/final.json'))
REP={'4689':'2019-P1','4690':'2019-P2','4691':'2019-P3','4692':'2019-P4','4693':'2019-P5','4694':'2019-P6','4695':'2019-P7','4696':'2019-G06',
 '9773':'2020-M11','10123':'2020-M12','10217':'2020-M12 (amended)','10219':'2021-M01','10397':'2021-P1','10571':'2021-P2','10641':'2021-P3','10664':'2021-P4','10741':'2021-P5','10854':'2021-P6','10939':'2021-P7','11498':'2021-P7 (amended)',
 '10429':'2020-M10','10430':'2020-M11','10431':'2020-M12','10432':'2021-M1',
 '3605':'2019-M01','3606':'2018-M10','3607':'2018-M11','3608':'2018-M12','3609':'2019-M02','3610':'2019-P1','3611':'2019-P2','3612':'2019-P4','3613':'2019-P5','3614':'2019-P6','3615':'2019-P7'}
COVER={'4690':('2019-03-01','2019-03-22'),'4692':('2019-04-06','2019-04-12'),'4696':('2019-05-10','2019-05-17'),'10854':('2021-04-20','2021-04-26'),'3615':('2019-04-27','2019-05-09')}
H=['report','document id','item date','Cont/Exp','name','address 1','occupation','amount','Amend. code']
def good(n):
  if re.search(r'\b(?:FL|Fl|NY|CT|NJ|PA)\b\s*\d{0,5}\s*$|^(?:t|U|I|!)\s*/|^partners? of$|^\W',n): return False
  return len(re.findall(r'[A-Za-z]{2,}',n))>=2 and not re.search(r'[°\\{}]',n)
def tidy(n):
  n=re.sub(r'\s+\d+/?\d*\s.*$','',n); n=re.sub(r'\s(?:Political|Unemployed|Be|AL|ited|Consulti.*)$','',n)
  return n.strip(' ,.-')
FN={'estime-irvin|2019':'estimé-irvin_2019.csv','estime-irvin|2021':'estimé-irvin_2021.csv','timothe|2021':'timothe_2021.csv','desulme|2019':'desulme_2019.csv'}
D='/home/claude/vote-informed/scripts/data/city/northmiami/'
stats={}
tim=json.load(open('nmw/tim_rows.json')) if os.path.exists('nmw/tim_rows.json') else []
for k,fn in FN.items():
  rows=[];drop=0
  for doc,date,n,addr,a in F.get(k,[]):
    n=tidy(n)
    if not good(n): drop+=1; continue
    if doc in COVER and not (COVER[doc][0]<=date<=COVER[doc][1]): date=COVER[doc][1]
    if a>=1000 and a-int(a)<0.1: a=float(int(a))
    rows.append([REP.get(doc,doc),doc,date,'C',n,addr,'','%.2f'%a,''])
  if k=='timothe|2021':
    for t in tim:
      c=t['cells']
      if len(c)<14: continue
      nm=(c[2]+' '+c[3]).strip(); am=re.sub(r'[^\d.]','',c[-1].replace(',',''))
      try: am=float(am)
      except: drop+=1; continue
      if not good(nm) or am<=0 or am>5000: drop+=1; continue
      rows.append([t['report'],'tim-'+t['page'],{'2021-P1':'2021-02-28','2021-P2':'2021-03-22','2021-P3':'2021-04-05','2021-P4':'2021-04-12','2021-P5':'2021-04-19','2021-P6':'2021-04-26','2021-P7':'2021-05-06'}[t['report']],'C',nm,', '.join(x for x in c[4:7] if x),c[9],'%.2f'%am,''])
  w=csv.writer(open(D+fn,'w',newline='')); w.writerow(H); w.writerows(rows)
  stats[fn]=(len(rows),round(sum(float(r[7]) for r in rows)),drop)
print(stats)
