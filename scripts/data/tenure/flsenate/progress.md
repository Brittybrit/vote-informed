# flsenate tenure slice: progress

Members: Calatayud (seated Nov 8 2022, SD 38), Rodriguez (Nov 3 2020, SD 39 then SD 40 from Nov 2022), Garcia (Nov 3 2020, SD 37 then SD 36 from Nov 2022), Ingoglia (Nov 8 2022 to Jul 21 2025, SD 11).
Earlier sessions to add: 2021 regular (+2021A May special), 2022 regular (+2022A Apr, 2022B Apr, 2022C? , 2022D Dec), 2023 regular (+2023A Jan? 2023B Feb, 2023C Nov), 2024 regular.
LFIR fiscal years to add: FY2021-22 (2021 session), FY2022-23, FY2023-24, FY2024-25.

## Endpoints (from shell, 2026-10-25)
- works via shell curl: flsenate.gov /Session/Appropriations/FY20XX-YY/LocalFundingRequests (HTML table, 1-2 MB) and LFIR PDFs under /PublishedContent/Session/FiscalYear/...; 429 if faster than ~1 request per 5-10 s; back off 30-60 s.
- laws.flrules.org -> 200 via curl.
- dos.elections.myflorida.com contrib.exe -> Cloudflare challenge (403) from shell; WebFetch -> "error while fetching".

## Log
- 2026-10-25 start. LFIR lists saved in raw/: FY2021-22, FY2022-23, FY2024-25 (FY2023-24 429, retry).
- DOE contributions: 14 chunks raw/doe/c00-c13 (5744 rows incl. 10 headers) pulled via Chrome contrib.exe (queryformat=2), each verified by sha256 against browser copy. Split by src/split_doe.py into donors/<acct>.tsv (same 9-col layout as scripts/data/state/donors). Ranges: calatayud 2022-05..2024-11 (575), garcia 2020-06..2024-12 (838), rodriguez 2018-11..2024-11 (1550), ingoglia 2021-07..2025-07 (509), pc83741 66, pc74696 319, pc70258 587, pc80728 338, pc79506 408, pc70076 544. Cutoff 12/31/2024 (2025+ already in state files); Ingoglia cand. to 07/31/2025.
- LFIR PDFs: 802/814 downloaded+txt (fetch_pdfs.sh still running for last 12, FY2024-25).
- DONE requests: build-requests.py -> requests-2021-22.json (82 forms: Rodriguez 50, Garcia 32), requests-2022-23.json (144: R 96, G 48), requests-2023-24.json (262: R 88, G 49, Calatayud 82, Ingoglia 43), requests-2024-25.json (326: R 118, Ca 115, G 42, I 51). Budget status from enrolled GAA text ('(Senate Form n)' 2021-22, '(SF n)' 2023-24) + governor veto lists (2023 list reused from ../flhouse/raw/veto-2023.txt, same flgov.com PDF). Proviso-only appropriations flagged proviso:true; ~40 have no stated dollar figure (someUnstated). Lobbyist/firm from form item "Lobbyist Contact Information".
- DONE lobbyfirms/: floridalobbyist.gov lobfirml_2020..2024.pdf (shell curl works) -> firms.json (575 firms merged) + firms-by-year.json, same shape as scripts/data/state/lobbyfirms/firms.json.
- Bills: flhouse slice covers 2022A, 2022D, 2023B, 2023, 2023C, 2024 (its stageA.jsonl records Senate floor votes too). This slice adds 2021, 2021A, 2021B, 2021C, 2022, 2022B, 2022C, 2022E, 2023D: bills/fetch-list.py -> bills/enacted.json (running), then bills/stageA.py (bill pages + final-analysis Private Sector Impact text to psi.jsonl).
- bills/enacted.json DONE: 541 chapters (2021: 275 incl. GAA 2021-36; 2021A 4; 2021B 4; 2022: 265 incl. GAA 2022-156; 2022C 3). 2021C, 2022B, 2022E, 2023D: no laws. Gap: chapter 2022-150 not in the flsenate "Became Law" list (not found; laws.flrules.org unreachable from shell).
- Stage A/psi running (bills/stageA.py, ~1 bill/40-60 s shared rate limit with flhouse). Stage B: bills/stageB.py auto-rejects empty/no-benefit PSI text; manual readings in bills/decisions.json (judgment calls marked in note). Stage C: bills/stageC.py reads Senate sheets for b:true chapters from this slice AND flhouse stageB (2022D/2023B/2023/2023C/2024) -> bills/stageC.jsonl (Garcia/Rodriguez/Calatayud/Ingoglia; 'not seated' if absent from sheet).
- 2021 regular session House "z" analyses: PSI header is "DIRECT ECONOMIC IMPACT ON PRIVATE SECTOR" (parser fixed, affected rows refetched). Conference-report analyses (GAA/implementing/conforming) have no PSI section -> b:false with note.
- STOPPED on coordinator request (~5.5 h). State: bills/stageA.jsonl + psi.jsonl 171/541 chapters (2021-1..2021-171 assessed in stageB.jsonl, 18 qualify). stageC.jsonl: 59 chapters with Senate rolls (15 of 2021 + 44 of flhouse's 2023/2023C qualifying chapters); 2021-154, 2021-160, 2021-166 qualify but rolls not fetched yet.
## RESUME
1. cd scripts/data/tenure/flsenate/bills && python3 -I stageA.py   (skips done chapters; continues at 2021-172; ~370 left incl. all of 2021A/B, 2022, 2022C; ~5 h at the shared flsenate rate limit; run with run_in_background max timeout and relaunch on the 2 h cut).
2. python3 -I stageB.py -> lists pending PSI texts; add readings to decisions.json; rerun until pending 0.
3. python3 -I stageC.py -> Senate rolls for every b:true chapter here and in ../flhouse/bills/stageB.jsonl (rerun after flhouse finishes its 2024 stage B too).
Nothing in this slice needs Chrome anymore: DOE donors are done; all remaining fetches (bill pages, analysis and vote PDFs) work from shell curl.
- 13:54:02 chunk1: stageA to 2022-50 (325/541), stageB through 2022-50 done, stageC run (109 roll sheets incl. 2024 flhouse-qualified).
- 15:35:05 chunk2: stageA to 2022-191 (465/541), stageB through 2022-191 done.
- 16:22:41 stageA DONE 541/541; stageB DONE 541/541. Running stageC.
