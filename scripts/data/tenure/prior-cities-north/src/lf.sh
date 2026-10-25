# usage: lf.sh host repo folderId  -> prints JSON listing
H=$1; R=$2; F=$3; J=${4:-cj}
curl -s -b $J -c $J -m 60 -H 'Content-Type: application/json' -X POST "https://$H/WebLink/FolderListingService.aspx/GetFolderListing2" -d "{\"repoName\":\"$R\",\"folderId\":$F,\"getNewListing\":true,\"start\":0,\"end\":2000,\"sortColumn\":\"\",\"sortAscending\":true}"
