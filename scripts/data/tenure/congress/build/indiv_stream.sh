#!/bin/bash
W=/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/work
IDS="C00376087|C00714261|C00671859|C00702548|C00735985|C00702530|C00733329|C00807628"
mkdir -p $W/indiv
for y in "$@"; do yy=${y:2:2}
  [ -s $W/indiv/indiv$yy.txt ] && continue
  curl -sL --retry 5 https://www.fec.gov/files/bulk-downloads/$y/indiv$yy.zip | funzip | awk -F'|' -v ids="$IDS" 'BEGIN{n=split(ids,a,"|");for(i=1;i<=n;i++)k[a[i]]=1} ($1 in k)' > $W/indiv/indiv$yy.tmp && mv $W/indiv/indiv$yy.tmp $W/indiv/indiv$yy.txt
  echo "indiv$yy $(wc -l < $W/indiv/indiv$yy.txt)"
done
