# Congress tenure progress (Diaz-Balart, Salazar, Gimenez, Donalds, Moskowitz; Moody Senate)

Started 2026-10-25. Append a line after each finished unit. Rerun: skip anything marked done.

## Sources that work from the shell (curl through proxy)
- clerk.house.gov/evs/YYYY/rollNNN.xml (200)
- govinfo.gov/bulkdata/BILLSTATUS and BILLSUM (200)
- api.congress.gov/v3 with DEMO_KEY (rate limited)
- FEC bulk files www.fec.gov/files/bulk-downloads/YYYY/*.zip (302 to S3, works)
- api.open.fec.gov DEMO_KEY: only 10 requests/hour, avoid
- lda.gov/api/v1 works but throttles (1 req/s or slower)
- congress.gov and cbo.gov: 403 from shell (use WebFetch)

## Log
- 2026-10-25: raw inputs pulled to scratch: govinfo BILLSTATUS bulk zips 108-118 (all hr/s/hjres/sjres); FEC bulk cm/cn/ccl/oth/pas2 2002-2026; clerk.house.gov roll XML 2003-2024 (missing rolls return an "Error sanitizing" stub, skip those); House Approps CPF request tables FY22 (democrats-appropriations.house.gov/transparency/fiscal-year-2022 xlsx), FY23 (fiscal-year-2023 xlsx), FY24 (appropriations.house.gov/fy24-submitted-requests xlsx); GAO-25-107274/107549 "Tracking the Funds" (enacted FY22-24 CPF with requesting member). FY25: no committee table online; member pages used.
- FEC committees (from cm/ccl masters): Diaz-Balart P C00376087, leadership C00565630 (MAINTAINING ALL REPUBLICANS IN OFFICE PAC), JFCs C00450932 C00439760 C00460501 C00452359 C00572131 C00858290. Salazar P C00714261, A C00671859 C00702548, leadership C00769695 (FREEDOM FORCE PAC), JFC C00769711 C00791657 C00822387. Gimenez P C00735985, A C00702530, leadership C00737270 (LIBERTAD / RESIDENTS FIRST PAC), JFC C00739409 C00772251 C00791657 C00822387. Donalds P C00733329, leadership C00755728 C00894147 (PROVEN CONSERVATIVES PAC), JFC C00760108 C00797886 C00819615. Moskowitz P C00807628, leadership C00831362 (THE MPIRE STRIKES PAC), JFC C00824243 C00831693 C00943605. Moody P C00895763, A C00895508, leadership C00896092 (FLORIDA LEADS), JFC C00896332 C00948547 C00953471. (C00808808 MARIO PAC is a Wisconsin committee, not his.)
- FEC bulk note: candidate committees' own Schedule A PAC receipts (line 11C) are NOT in the bulk itoth file; they are taken from the giving PAC's 24K report (date = giver's date, can differ a few days from the campaign's receipt date). Leadership PACs/JFCs: taken from their own 18K. Cross-check vs scripts/data/federal/pac-agg.json for 2025-26: 63 of 102 contributor totals equal; the rest differ by the 24K-vs-11C dating/split and PACs that file monthly late. Treat as close, not exact.
- [x] FEC gifts built: fec-receipts-tenure.json (all committee gifts) and pac-agg-tenure.json (pac-agg schema) — 2026-10-25
- [x] 117th-118th laws screened (636 public laws, 43 qualify; 31 with House roll calls -> 30 cards (117-14 UC has no card)), laws/laws-list-117-118.json, laws/benefits-117-118.jsonl, laws/universe-117-118.json, floor-votes-tenure.json — 2026-10-25. Screening: keyword prefilter on the final CRS summary, then each hit read; omnibus/CR bills qualify via hospital extenders (low-volume / Medicare-dependent hospitals, DSH) as 119-4 did.
