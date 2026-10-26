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
- 2026-10-25 FDACS: works via shell curl: www.fdacs.gov/News-Events/Press-Releases/<yyyy>-Press-Releases (year index, Next.js; release pages
  carry publishDate). Pulled all 166 releases for 2023 (91) and 2024 (75) into raw/fdacs-releases-2023-2024.json (text, url, publish date).
- 2026-10-25 Board of Trustees 2019-02-26..2024-12-17: 276 certifications OCR'd (raw/cert-ocr), parsed (src/parse_certs.py), classified (src/classify_bot.py), built cabinet-bot/actions.json (src/build_bot.py): 202 qualifying items, 74 excluded with reasons. Presence checked visually on 2 Notice of Board Action pages per meeting (all present). CFO objected on 4 items (no Moody/Simpson objection anywhere).
- 2026-10-25 moody-oag/actions.json: 74 release actions (47 settlement-type), 1,538 grant rows FY2019-20..2023-24 (727 to private recipients). simpson-fdacs/actions.json: 24 actions (20 qualifying: 19 department-only RFLPP easements + Feeding Florida).
- 2026-10-25 FDEM: works via shell curl: floridadisaster.org/news-media/news/?p=<n> (pages 30-84 = 2018-2021). 539 releases 2019-01-08..2021-04-30 saved (raw/fdem-releases-2019-2021.json); moskowitz-fdem/actions.json: 6 partnerships naming private parties, none with a stated contract or payment.
- 2026-10-25 Cabinet non-BOT items: cabinet.myflorida.com archive (curl works; dms-media PDFs redirect to signed S3 URLs via meta refresh) -> raw/cabinet/<date>_agenda|transcript.(txt|ocr.txt), 37 meetings 2019-01-11..2024-12-17. src/parse_agendas.py -> agenda-items.json (1,008 items); src/build_cabinet_other.py -> cabinet-other/actions.json (770 non-BOT items classed; 25 named-private actions so far, 2020-2024). 2019 transcripts are scans, OCR running.
- 2026-10-25 2019 Cabinet transcripts OCR complete (12 files; 2019-06-04 and 2019-12-03 re-run after a worker race truncated them; page counts now match the PDFs). The archive posts only Cabinet Aides transcripts for 2019-07-25, 2019-09-24 and 2019-10-22, and no transcript for 2019-05-29 and 2019-10-08. Added 2019 named items to src/build_cabinet_other.py: votes read for 2019-02-26 (Suncrest Court, The Palms at Town Center) and 2019-06-04 (Mary Bethune-Cookman High Rise, Parrish Oaks, Pembroke Tower Apartments); aides-only names with result and roll null (AIDES dict) for 2019-07-25 (Daytona Gardens Apartments, Osprey Point, Tampa Electric Company Big Bend siting order) and 2019-09-24 (9 Florida Housing developments). 2019-12-03 Florida Housing items read but name no development. cabinet-other/actions.json now: procedural 489, government 145, private_unnamed 93, private_named 43 (31 with roll call, 12 vote not read).
- 2026-10-25 Done. summary.md was not written (the harness refuses report files from this agent); the summary went to the coordinator in the hand-off report.
