# Prior offices slice prior-cities-north (started 2026-10-25)

People and offices: Miami Gardens (Gilbert 2008-2020, Wilson 2018-2026), Surfside (Burkett 2006-2010, 2020-2022,
2024-2026; Coto all terms; Weinberg 2006-2010), Biscayne Park (Samaria 2018-2022), Sunny Isles Beach (Goldman 2015-2022,
Svechin 2016-2022), Aventura (Weinberg 2010-2018), North Miami Beach (Smith 2007-2019, Chernoff 2001-2009),
Opa-locka (Bass Nov 2018 - Nov 2020, Tydus 2004-2012).

Order: years since 2016 first, then older years newest first.

## Access notes (works via)
- Miami Gardens minutes: Laserfiche WebLink 11 at edocs.miamigardens-fl.gov, repo "Laserfiche", Minutes folder 86952
  (year subfolders 2003-2026). Works via shell curl: GET /WebLink/ with -L and a cookie jar (CookieCheck sets cookies),
  then POST /WebLink/FolderListingService.aspx/GetFolderListing2 {"repoName":"Laserfiche","folderId":N,...} for listings;
  PDF: POST GeneratePDF10.aspx?key=<id>&PageRange=1%20-%20<pages>&Watermark=0&repo=Laserfiche (body '{}') -> token,
  poll POST DocumentService.aspx/PDFTransition {"Key":token} until finished, GET /WebLink/PDF10/<token>/<id>.
  Minutes carry an OCR text layer. Scripts: src/lf.sh, src/lfpdf.sh.
- Surfside: townofsurfsidefl.gov town-clerk pages list resolutions 2010-2026 and agendas 2010-2024 (PDF links,
  shell curl works). Minutes on townofsurfsidefl.granicus.com ViewPublisher view_id=3.
- NMB: nmb.novusagenda.com DisplayAgendaPDF.ashx?MinutesMeetingID=N works via curl; IDs ~50 = Jan 2014, 300 = Oct 2020
  (scans, OCR needed). Not every ID exists.

## Log (one line per finished meeting batch / report)
- 2026-10-25 Miami Gardens: downloaded council minutes 2008-2026 (Laserfiche, 494 docs incl. special/budget; scratchpad mg/pdf), text layer or OCR
  (2018 and Sep 2020 - Jan 2021 minutes are image-only; OCR'd). Parser src/mg_parse.py -> mg_votes.py (rolls from roll-call lines;
  voice votes = members present; dissenters named in the minutes) -> hand decisions src/decisions/mg-YYYY.txt -> mg_build.py
  writes miamigardens/actions.json. 2016 decided (100 actions, 16 unnamed-beneficiary items left out).
- 2026-10-25 Miami Gardens decided 2016, 2017, 2019-2024 (560 actions so far; 231 unnamed-beneficiary items left out). Next 2025-2026, 2018 (OCR), 2008-2015.
