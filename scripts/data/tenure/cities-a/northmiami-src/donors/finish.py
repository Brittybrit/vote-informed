import json,re,collections,csv
R=json.load(open('nmw/rows2.json'))
# Summary "Cash & Checks" per report read by hand from the OCR'd summary pages above (None = unreadable)
SUM={'3541':8852.30,'3542':4985,'3543':2725,'3544':2875,'3545':2200,'3547':1590.38,'4696':None,
 '10217':2750,'10219':3650,'10397':22250,'10571':15975,'10641':4025,'10664':6000,'10741':650,'10854':6700,'10939':13625,
 '9768':970,'10430':970,
 '3605':13460,'3606':26470,'3608':900,'3609':8595,'3610':8700,'3611':9250,'3612':450,'3613':2050,'3614':6230,'3615':18170,
 '3956':9140,'3957':6891}
DUP={'3541','3542','3543','3544','3545','3546','3547'}  # same Estimé-Irvin 2019 reports re-filed as 4689-4695 (keep the later filing)
DUP|={'9651','9768','10020','10259'}                  # Timothé reports re-filed as 10429-10432 (keep the later filing)
def clean(n):
  n=re.sub(r'\b(CHE|CAS|MON|CHECK)\b.*$','',n)
  n=re.sub(r'\s(?:I|B|E|rE|ne|i|a|T|1)\s.*$','',' '+n+' ').strip()
  n=re.sub(r'^(?:[UI!/|\s]+\s)?(?:Hialeah|Miami|North Miami)[^A-Z]*,? FL \d*\s*','',n)
  return re.sub(r'\s{2,}',' ',n).strip(' ,.-:;|')
out=collections.defaultdict(list); rep=[]
for r in R:
  if r['doc'] in DUP: continue
  if r['ctype'] in ('LOA','Loan','LOAN','REF'): continue
  if r['amount']<=0 or r['amount']>50000: continue
  n=clean(r['name'])
  if len(n)<3: continue
  out[(r['who'],r['cycle'])].append([r['doc'],r['date'],n,r['addr'],r['amount']])
tot=collections.defaultdict(float)
for k,v in out.items():
  for x in v: tot[x[0]]+=x[4]
for d,s in sorted(SUM.items()):
  if d in DUP: continue
  print(d,s,round(tot[d],2), '' if not s else '%.0f%%'%(100*tot[d]/s))
json.dump({'%s|%s'%k:v for k,v in out.items()},open('nmw/final.json','w'))
