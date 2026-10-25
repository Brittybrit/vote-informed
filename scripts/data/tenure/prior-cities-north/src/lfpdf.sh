# usage: lfpdf.sh host repo docid pages out.pdf [jar]
H=$1; R=$2; D=$3; P=$4; O=$5; J=${6:-cj}
T=$(curl -s -b $J -c $J -m 120 -X POST -H 'Content-Type: application/json' -d '{}' "https://$H/WebLink/GeneratePDF10.aspx?key=$D&PageRange=1%20-%20$P&Watermark=0&repo=$R" | head -1 | tr -d '\r')
for i in $(seq 1 90); do
  S=$(curl -s -b $J -c $J -m 60 -X POST -H 'Content-Type: application/json' -d "{\"Key\":\"$T\"}" "https://$H/WebLink/DocumentService.aspx/PDFTransition")
  echo "$S" | grep -q '"finished":true' && break; sleep 1
done
curl -s -b $J -c $J -m 180 "https://$H/WebLink/PDF10/$T/$D" -o "$O"
