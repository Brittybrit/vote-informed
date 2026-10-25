# prior-statewide progress (Moody AG 2019-2025, Simpson FDACS 2023-2024, Moskowitz FDEM 2019-2021)

Source notes
- works via shell curl: prodenv.dep.state.fl.us/DslBtlds/public (BTLDS, DEP Board of Trustees Land Document System).
  GET piSearchAgendaLoad (cookie), POST piSearchAgenda with piSearchAgendaCriteriaDTO.agendaDateFrom/To (mm/dd/yyyy),
  then GET piSearchAgendaGrid?rows=1000&page=1. Document PDFs: GET piDownloadDocument?documentManagementID=<id> (no cookie
  needed). Every Board of Trustees item has a BACKUP (item packet) and a CERTIFICATION (Office of Cabinet Affairs
  "Notice of Board Action": action taken + members present/absent, then the certified item text). Scans; OCR with tesseract.
- works via shell curl: floridadep.gov/cab/cab/content/<month>-<d>-<yyyy>-board-trustees-agenda-and-attachments (2025 on
  and a few older pages), dms-media.ccplatform.net transcript PDFs (when the URL is known), facts.fldfs.com (search page loads).
- blocked: www.floridacabinet.gov (proxy CONNECT 502; WebFetch permission not answered). myfloridalegal.com 403 to curl. sbafla.com 403 to curl.

Log
- 2026-10-25 BTLDS index pulled for 2019-2025 (raw/btlds-index-2019-2025.json, 721 rows).
- 2026-10-25 OAG grants: Division of Victim Services annual reports (links on myfloridalegal.com/crime-victims-services/crime-victims-services-resources,
  read via WebFetch; myfloridalegal.com is 403 to shell curl). Saved raw/oag-grants/<fy>-appC.tsv (VOCA by circuit) and <fy>-appD.tsv (Crime
  Stoppers, Urban League) for FY 2019-20, 2020-21, 2021-22, 2022-23, 2023-24; every section checked against its printed total
  (src/check_grants.py). Known printed inconsistencies: 2022-23 Crime Stoppers rows sum $1 above the printed total; 2023-24 Nineteenth
  Circuit rows sum $71,591 above its printed total and the printed grand total is $2,652,355 above the sum of the section totals.
  FY 2018-19 awards were made before Moody took office (not counted). FY 2024-25 report not posted (gap: awards made July 2024-Jan 2025).
- 2026-10-25 OAG press releases: week-in-review index (298 weeks) not pageable from WebFetch (pager ignored); collecting week and release URLs
  through site-restricted WebSearch (raw/oag-week-urls.txt, raw/oag-release-urls.txt).
