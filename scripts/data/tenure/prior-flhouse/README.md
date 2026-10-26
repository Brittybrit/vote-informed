# prior-flhouse: Florida House service of candidates who are not current House members

People: Vicki L. Lopez (HD 113, 2022-2025), Byron Donalds (HD 80, 2016-2020), Bryan Avila (HD 111, 2014-2022),
Blaise Ingoglia (HD 35, 2014-2022), Ana Maria Rodriguez (HD 105, 2018-2020), Javier E. Fernandez (HD 114, 2018-2020),
Jared Moskowitz (HD 97, 2012-2019). Seat dates and sources: offices.json, progress.md. Nothing outside this folder was
changed; the coordinator merges.

| File | Shape copied from | Notes |
|---|---|---|
| offices.json | PRIOR.md | one entry per person and seat: start, end, giftsFrom, roster source, files, pending files (build-offices.py) |
| requests-2017.json .. requests-2022.json | ../flhouse/requests-2022.json | House Appropriations Project bills (HB 2000-4999) filed by the members; ask/agency/APR number from each bill's filed text; budget status from the GAA as printed in the Laws of Florida (struck = vetoed). Request forms (date, recipient, lobbyist) not read yet: formRead false (needs-browser.md PB-FORMS). |
| requests-2023.json .. requests-2026.json | ../flhouse/requests-2023.json | Lopez's Appropriations Project Requests. listPartial true until the browser pass (needs-browser.md APR-LOPEZ). |
| bills-2013.json .. bills-2020.json | ../flhouse/bills-2023.json | every chapter law of the 2013-2020 sessions, screened here (bills/), with House roll calls of the members seated that year |
| bills-2122.json, bills-2023.json, bills-2024.json, bills-2025.json | same | laws already screened by other slices (not re-screened); House roll calls re-read for Avila/Ingoglia (2021-22, 2022D) and Lopez (2022A-2025) |
| bills/classes-by-chapter.json, bills/labels.json | ../flhouse/bills/ files of the same names | donor classes and en/es/ht labels per qualifying 2013-2020 law |
| donors/ | ../flhouse/donors/*.tsv (9-column DOE layout) | not pulled: DOE needs the browser (needs-browser.md DOE-1..7) |

Pipeline (all resumable; flsenate.gov through bills/fl.py, one request at a time, 7 s apart):
- bills/fetch-list.py -> raw/list-*.json; bills/enacted.py -> bills/enacted.json
- bills/stageA.py (bill pages) -> bills/stageA.jsonl; bills/stageB-fetch.py (final analysis, Private Sector section) -> bills/ps/
- bills/judge.json (manual readings; bills/pending.py lists what is left, bills/judge.py adds readings)
- bills/build-bills.py -> bills/stageB.jsonl, bills-2013..2020.json and raw/roll-urls-old.txt; bills/rolls.py raw/roll-urls-old.txt fetches the roll calls; build again
- bills/build-reuse.py -> bills-2122/2023/2024/2025.json (after bills/rolls.py raw/reuse-roll-urls.txt)
- bills/projectbills.py -> raw/pb-<year>.json; bills/pbtext.py -> raw/pbtext/; bills/gaa-struck.py -> raw/gaa/ch<yr>-<n>.txt; build-requests.py -> requests-*.json
