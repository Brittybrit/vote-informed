import csv,glob,json,collections,re,sys
D=collections.defaultdict(lambda:{"total":0,"n":0,"occs":collections.Counter(),"types":collections.Counter(),"files":set()})
for f in sorted(glob.glob('/root/vote-informed/scripts/data/state/donors/*.tsv')):
    for row in csv.reader(open(f,encoding='utf-8',errors='replace'),delimiter='\t'):
        if len(row)<8: continue
        t=row[3].strip()
        if t in('INT','REF'): continue
        nm=row[4].strip().upper()
        try:a=float(row[2])
        except:continue
        d=D[nm];d["total"]+=a;d["n"]+=1;d["occs"][row[7].strip()]+=1;d["types"][t]+=1;d["files"].add(f.split('/')[-1][:-4])
out={k:{"total":round(v["total"],2),"n":v["n"],"occ":v["occs"].most_common(1)[0][0],"occs":list(v["occs"]),"types":list(v["types"]),"files":sorted(v["files"])} for k,v in D.items()}
json.dump(out,open('agg.json','w'),indent=0)
print(len(out))
