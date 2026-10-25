# usage: fetchmatter.sh idsfile   (lines: id yearFolder)
cd /tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/pc
cat "$1" | xargs -P 4 -n 2 sh -c 'f=matter/$0.html; [ -s $f ] && exit 0; for t in 1 2 3; do curl -sS -m 120 "https://www.miamidade.gov/govaction/matter.asp?matter=$0&file=true&yearFolder=$1" -o $f && [ -s $f ] && break; sleep 3; done'
echo done
