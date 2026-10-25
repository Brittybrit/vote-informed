#!/bin/bash
# Resumable: downloads each LFIR PDF in lfir-list.json to raw/pdf/<fy>_S<form>.pdf, converts to raw/txt/.
cd "$(dirname "$0")/.."
mkdir -p raw/pdf raw/txt
python3 -I -c "import json;[print(x['fy'],x['form'],x['pdf']) for x in json.load(open('lfir-list.json'))]" | while read fy form url; do
  t="raw/txt/${fy}_S${form}.txt"; p="raw/pdf/${fy}_S${form}.pdf"
  [ -s "$t" ] && continue
  for i in 1 2 3 4 5 6; do
    code=$(curl -sS -o "$p" -w '%{http_code}' "$url")
    if [ "$code" = 200 ] && head -c 4 "$p" | grep -q '%PDF'; then pdftotext -layout "$p" "$t"; break; fi
    echo "$fy $form $code retry $i" >&2; sleep $((30*i))
  done
  sleep 5
done
echo DONE
