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
- 2026-10-25 Opa-locka (Bass first term): read every commission minutes Nov 26, 2019 - Nov 12, 2020 from the cities-a download (ol/minold, CivicClerk); parser src/ol_parse.py + ol_norm.py, decisions/ol-2019-2020.txt, build_body.py -> opalocka/actions.json (owners.json from the PA). Gap: Nov 2018 - Oct 2019 minutes not online.
- 2026-10-25 Miami Gardens 2018 decided (79 actions; scans OCR'd). Parser now also reads the 2018 'X made a motion ... the motion approved by' style and lowercase section letters; hand roll calls in src/decisions/rolls-mg.txt. Running total 729 actions 2016-2026. Next: 2015 back to 2008 (OCR of 2008-2012 scans running).
- 2026-10-25 Miami Gardens 2014-2015 decided (minutes file names with spaces/dashes now parsed; merged two-meeting files split by src/mg_split.py; K-items not pulled count as consent for 2008-2018). Owners of record via src/pa_fill.py -> miamigardens/owners.json. Running total 848 actions. Surfside 2020 decided (src/sf_parse.py, decisions/sf-2020.txt, hand-read handwritten votes in decisions/rolls-sf.txt) -> surfside/actions.json. Aventura: Howard Weinberg first appears on roll calls Nov 13, 2012 (careers says 2010; the 2010-2012 records do not list him).
- 2026-10-25 Aventura (Howard Weinberg, Nov 13, 2012 - Nov 13, 2018): every signed resolution and ordinance in the window read (Laserfiche CityHall repo text; src/av_parse.py), decisions/av-2013..2018.txt -> aventura/actions.json (210 actions).
- 2026-10-25 Miami Gardens 2012-2013 decided (2012 has two parallel minutes series; duplicates dropped by text similarity; the two council members named Williams are now told apart: Andre Williams = AWilliams, David Williams Jr. = Williams). Running total 1009 actions.
- 2026-10-25 Surfside Mar 2020 - Mar 2022 (Burkett's second stint) decided: 72 actions from the signed resolutions (OCR plus hand-read vote blocks).
- 2026-10-26 North Miami Beach Dec 2013 to Dec 2015 built: 71 actions (2013: 1, 2014: 28, 2015: 42); 7 address-only items have no resolvable owner of record (counted as unnamed). 2016-2019 next.
- 2026-10-26 North Miami Beach Dec 2013 to Dec 2018 built: 253 actions. Parser fixes: votes taken after amendment motions, Commissioner titles, phone attendance, Forbes/Piper, mixed-case Roll Call Vote, wider vote window. 2019 waits on OCR (docs 252+).
- 2026-10-26 Surfside built: 183 actions (2010: 4, 2020-22: 72, 2024-26: 107). 2010 and many 2024-26 votes and adoption days read by hand from the signed copies (decisions/rolls-sf.txt). Coto is not on the 2010 commission, so his first term ended before 2010 (records 2004-2009 not online).
- 2026-10-26 Biscayne Park built: 59 actions (Jan 2019 to Oct 2022) from 82 OCR'd minutes (src/bp_parse.py, src/bp_hand.py for consent and 2021-22 formats). No minutes online for Nov to Dec 2018.
- 2026-10-26 North Miami Beach 2019 decided (311 actions through 2019). Records show Smith seated through at least Oct 2020 (careers says 2019); 2020 next.
- 2026-10-26 North Miami Beach 2020 decided (Jan 1 to Nov 30, Smith's last meeting): 77 actions; 388 total Dec 2013 to Nov 2020. Hand rolls for R2020-17 (Skylake), ROK change order 6-1 (Smith no), ProKel termination 4-3, Dezer Intracoastal Mall MDA 4-3 (Smith no). build_body now drops reference numbers the parser carried over from an earlier item (NMB only).
