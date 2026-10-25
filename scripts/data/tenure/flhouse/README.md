# flhouse tenure extension (2023 and 2024 sessions, Florida House members)

Members: Basabe, Gantt, Porras, Chambliss, Nixon (seated Nov 2022; Nixon since Nov 2020), Redondo (seated Dec 5, 2023), Blanco (Nov 2024, already covered by the 2025+ files).
Nothing here edits scripts/data/state/ or public/data; the coordinator merges.

| New file | Extends | Notes |
|---|---|---|
| requests-2023.json | the request lists built from scripts/data/state/nixon.json (state-nixon.mjs) | FY 2023-24 Appropriations Project Requests: 75 forms. Same fields plus member, county and lobbied[] (lobbyist and firm from the form). budget.status / amount / vetoed from the enrolled GAA (SB 2500, Ch. 2023-239) and the Governor's 2023 veto list. |
| requests-2024.json | same | FY 2024-25: 70 forms. GAA HB 5001, Ch. 2024-231, and the FY 2024-25 veto list. |
| bills-2023.json | scripts/data/state/bills/universe.json | Sessions 2022A (Dec 2022), 2022D (May 2022, before seating), 2023B, 2023, 2023C. House roll calls only. |
| bills-2024.json | same | 2024 regular session. |
| bills/stageA.jsonl, stageB.jsonl, stageC.jsonl, enacted.json | scripts/data/state/bills stage files of the same names | Same line shapes. stageB is generated from bills/ps/*.txt (Private Sector Impact extracts) plus bills/judge.json (manual readings). |
| bills/classes-by-chapter.json | scripts/data/state/bills/classes-by-chapter.json | One entry per qualifying chapter. Three reuse an existing 2025 class; the rest carry a "todo" with the category to tag. |
| donors/<member>-pre2025.tsv | scripts/data/state/donors/<member>.tsv | Same 9 columns. DOE candidate-account contributions 2020-11-04 to 2024-12-31. |

Rebuild: `python3 bills/build-bills.py` (after adding readings to judge.json), then `python3 bills/stageC.py` for roll calls, then build again.
Resume fetching: `python3 bills/stageA.py` and `python3 bills/stageB-fetch.py` (both skip work already done; flsenate.gov rate-limits, so they sleep 6-8 s per request and back off on 429).
