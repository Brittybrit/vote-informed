#!/bin/bash
# OCR the FY2017-18 LFIR forms that are scanned images (pdftotext gives no text): pdftoppm 300 dpi + tesseract --psm 6.
# Keeps the pdftotext output name raw/txt/<fy>_S<form>.txt and writes raw/txt/<fy>_S<form>.ocr marker.
cd "$(dirname "$0")/.."
ocr() { f=$1; b=$(basename $f .txt); [ -f raw/txt/$b.ocr ] && return; d=$(mktemp -d); pdftoppm -r 300 -gray raw/pdf/$b.pdf $d/p >/dev/null 2>&1
  : > $d/out.txt; for i in $d/p*.pgm; do tesseract $i - --psm 6 2>/dev/null >> $d/out.txt; done
  cp $d/out.txt raw/txt/$b.txt; touch raw/txt/$b.ocr; rm -rf $d; echo $b; }
export -f ocr
for f in raw/txt/*.txt; do [ $(wc -c < $f) -lt 200 ] && echo $f; done | xargs -P 4 -I{} bash -c 'ocr {}'
echo OCRDONE
