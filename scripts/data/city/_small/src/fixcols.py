import sys
p=sys.argv[1]; out=[]
for l in open(p).read().split('\n'):
    if not l.strip(): continue
    f=l.split('\t')
    while len(f)>8 and f[7]=='' and f[8].isdigit(): f=f[:7]+f[8:]
    out.append('\t'.join(f))
open(p,'w').write('\n'.join(out)+'\n')
