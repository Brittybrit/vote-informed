import sys,json,re
sys.path.insert(0,'nmw'); import grid; grid.PSM='7'
REP={'10393_2':'2021-P1','10577_3':'2021-P2','10665_3':'2021-P3','10667_3':'2021-P4','10735_2':'2021-P5','10885_2':'2021-P6','10945_4':'2021-P7','10945_5':'2021-P7','10945_6':'2021-P7'}
out=[]
for k,rep in REP.items():
  xs,ys,rows=grid.table('nmw/rot/r_%s.png'%k)
  for r in rows:
    if len(r)<10 or 'Name' in ' '.join(r[:4]): continue
    out.append({'page':k,'report':rep,'cells':r})
  print(k,len(xs),len(rows),flush=True)
json.dump(out,open('nmw/tim_rows.json','w'),indent=0)
