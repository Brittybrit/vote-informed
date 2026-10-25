# prior-flsenate: progress

Members (Senate service not on the site's Senate list):
- Avila (bryan-avila), SD 39, 2022-11-08 to 2026-08-25 (flsenate.gov/Senators/2024-2026: "Resigned 8/25/2026").
- Taddeo (annette-taddeo), SD 40, 2017-09-26 to 2022-11-08 (flsenate.gov/Senators/2016-2018: "Elected 9/26/2017"; no resignation listed for 2020-2022, so to the end of that term).
- Simpson (wilton-simpson), SD 18 2012-2016, SD 10 2016-2022 (flsenate.gov/Senators/2012-2014 .. 2020-2022, member 5104).
- JJ Rodriguez (jose-javier-rodriguez), SD 37, 2016-11-08 to 2020-11-03 (flsenate.gov/Senators/2016-2018, 2018-2020, member 5202).
- Campbell (daphne-campbell), SD 38, 2016-11-08 to 2018-11-06 (flsenate.gov/Senators/2016-2018, member 5195).
Senate terms begin upon election (Fla. Const. art. III, s. 15(d)); start/end = general election days.

## Endpoints (shell, 2026-10-25)
- flsenate.gov LFIR lists /Session/Appropriations/FY<fy>/LocalFundingRequests: FY2017-18 .. FY2026-27 have data; FY2013-14 .. FY2016-17 pages say "Local Funding Initiative Request data is not available at this time" (no Senate request system posted for those years).
- flsenate.gov bill lists, bill pages, analysis and vote PDFs: shell curl. All fetches go through src/net.py (one request per 6.5-8 s across this slice's processes, 60 s backoff on 429).
- floridalobbyist.gov lobfirml_<year>.pdf: shell curl (2012-2019 saved in lobbyfirms/).
- flgov.com veto lists 2025 and 2026: shell curl (URLs in scripts/state-nixon.mjs).
- dos.elections.myflorida.com: browser only -> needs-browser.md.

## Log
- 18:30 LFIR lists saved (raw/lfr) -> src/parse_lists.py -> lfir-list.json: 703 forms. Avila 64 (FY23-24), 74 (24-25), 82 (25-26), 66 (26-27); Taddeo 3 (18-19), 11, 8, 5 (21-22), 0 (22-23, none on the list); Simpson 17, 48, 47, 50, 8, 7 (17-18..22-23); JJ Rodriguez 11, 12, 21, 23 (17-18..20-21); Campbell 60, 86.
- 18:35 src/fetch_pdfs.py running (Avila first, newest year first).
- 18:40 bills/vote-jobs.jsonl (src/vote_jobs.py): 187 Senate final-passage sheets for qualifying laws already screened by other slices (2025-26 universe 56, flhouse 2022A-2024 87, flsenate 2021-22 44). src/votes.py running; each sheet text kept in raw/votes/ and parsed for all five members.
- 18:45 bills/pfs_enacted_list.py running: enacted lists 2020 back to 2013 (2020 done: 201 rows).
- lobbyfirms/: build.py -> firms.json + firms-by-year.json for 2012-2019 (2020-2024 in ../flsenate/lobbyfirms, 2025-26 in scripts/data/state/lobbyfirms).
- needs-browser.md written: DOE candidate and committee accounts for all five.
