# County (Miami-Dade BCC) tenure slice: progress

Goal: county action list (decisions.json body "county") back to Gilbert's start, 2020-11-17. Lopez seated 2025-11-18 (already full).
Existing list: 2025-11-18 .. 2026-10-06, 101 actions (built by hand into public/data/decisions.json; no per-body source file in scripts/data).

## Endpoints (from shell, 2026-10-25)
- works via shell curl: miamidade.gov/govaction/commminute.asp?cmbmeetdate=<id>&file=false (full minutes, with mover/seconder/vote/absent per item).
  Meeting id lists: minutes.asp?Action=Minutes&Oper=DisplayMinute&Minute=CC (BCC), =CDMZ (zoning 2024-09+); minutes2.asp ...&Minute=ZB and =CDMP (zoning/CDMP 2020-2024).
- works via shell curl: www2.miamidadeclerk.gov/lobbyhist (historical lobbyist registrations, through Oct 1, 2024).
  POST api/historicalLobbyistInformation/EncryptParams {param1,param2} -> queryString; GET lobbyistByPeriod?queryString= (500-row cap; split by day), principalsByNameQuery, lobbyistdetails (by principal id).
- works via shell curl: miamidade.gocivix.com api/ExploreClients/SearchClients (registrations Oct 2024 on, filing years 2023-2026; 8,548 client rows).
- works via shell curl: VoterFocus export.php?op=CFINANCE&cand_id=<ca>&dhc=0&county=miamidade. Gilbert county campaigns: ca=2220 (2020 cycle, rows from 2019-01-27), ca=2742 (2024 cycle).
- dos.elections.myflorida.com: Cloudflare 403 from shell and WebFetch; works via Claude in Chrome with fetch('/cgi-bin/contrib.exe', POST, queryformat=2) from the contributions page.
  Gilbert's political committee: Common Voices, account 71293 (chair Willie E. Miller; press calls it Gilbert's committee). 887 rows 2018-08-21 .. 2026-09-25.

## Log
- 2026-10-25 start. Downloaded 211 minutes pages (BCC + zoning/CDMP) 2020-11-19 .. 2025-11-04 to scratch; parser works.
- 2026-10-25 DONE donors. scripts/data/county/donors/:
  gilbert-campaign-2020.csv (VoterFocus ca=2220, same export format as lopez-campaign.csv; 779 contributions 2019-01-27..2020-08-20, $571,236.57)
  gilbert-campaign-2024.csv (VoterFocus ca=2742; 102 contributions 2024-02-08..2024-06-14, $98,550)
  pc71293.tsv (DOE contrib.exe export of Common Voices, same format as pc80020.tsv; 887 rows 2018-08-21..2026-09-25, $4,073,231.47; copied from the browser in 8 blocks, each verified by row count, amount sum and a character checksum computed in the page)
  gilbert-fec.json unchanged (FEC committee started 2026).
  NOTE for coordinator: scripts/county-firm-gifts.mjs reads only gilbert-fec.json for Gilbert and drops gifts before 2025-01-01; the new files need accounts added to the county body and the reader extended (scripts not edited by this slice).
- 2026-10-25 DONE lobbyist registrations: lobbyhist monthly 2019-01..2024-09 (raw, 2022-01/2022-08/2023-01 re-pulled by day past the 500 cap); GoCivix client index 2023-2026 (8,548 rows).
- 2026-10-25 Parsed all 211 meetings (BCC + CDMP/zoning) 2020-11-19..2025-11-04. Clerk list mislabels cmbmeetdate=5205 as 10/9/2025; it is the 1/30/2025 CDMP & Zoning meeting (matter 242085 Legislative History).
  Universe rule (same as the existing list, measured against its 101 hand-built actions): final actions (Adopted/Approved/Denied/failed; not first readings, deferrals, withdrawals) on resolutions, ordinances and zoning items whose title names a private party; excluded CBO/district allocations, directives, urging, codesignations, appointments, interlocal/government-only, budgets, special taxing districts, code text amendments.
  Rolls: from each item's Vote line; every member seated that day (attendance header) is yes unless listed No/Absent/Excused/OCB/COI; late arrivals not yet seated are absent when the printed tally requires it. All 1,918 printed tallies reconcile. One item (231948, 10/19/2023 CDMP denial) has no vote line: rolled as unknown.
  Report-text fixes: 242296 Gilbert recused (2/4/2025 reconsideration; the 1/22/2025 vote superseded and dropped); 230770 Gonzalez recused (10/19/2023, left the chambers on County Attorney advice).
