# flsenate full-tenure data (Calatayud, Rodriguez, Garcia, Ingoglia), pre-2025

All files here extend the 2025-2026 state data; nothing under scripts/data/state/ or public/data was changed.

| File here | Extends | Notes |
|---|---|---|
| `requests-2021-22.json`, `requests-2022-23.json`, `requests-2023-24.json`, `requests-2024-25.json` | the Senate request cards in `public/data/decisions.json` (flsenate `kind:'request'`, built from LFIR forms like `scripts/data/cabinet/lfir/ingoglia-lfir-2025.json` + `.meta.json`) | Same record shape as `scripts/data/tenure/flhouse/requests-<yr>.json`: fy, form, date, member, title, recipient, county, agency, ask, cmte, lobbied[{name,firm,for,src:'form'}], budget{status in/notIn/withdrawn, amount, lines, vetoed, proviso, someUnstated}, record (form PDF). Card id style for merge: `S<yy>-<form>` with ref `LFIR <form> · FY <fy>`. Built by `build-requests.py`. |
| `donors/<acct>.tsv` | `scripts/data/state/donors/<acct>.tsv` (garcia, calatayud, rodriguez, pc83741, pc74696, pc70258, pc80728) and `scripts/data/cabinet/<acct>.tsv` (ingoglia, pc79506, pc70076) | Same 9-column DOE contrib.exe layout (candidate/committee, MM/DD/YYYY, amount, type, name, address, city-state, occupation, in-kind). Dates up to 12/31/2024 only (2025+ already in the originals), so rows can be appended without duplicates. Ingoglia's candidate account runs to 07/31/2025 (his Senate account; the cabinet file is his CFO account). Built by `src/split_doe.py` from verified chunks `raw/doe/c00-c13.txt`. |
| `lobbyfirms/firms.json`, `lobbyfirms/firms-by-year.json` | `scripts/data/state/lobbyfirms/firms.json` | floridalobbyist.gov Legislative Lobbying Firms directories 2020-2024. `firms.json` is the merged map (same shape); `firms-by-year.json` lets a registration be checked for the action's year. |
| `bills/enacted.json`, `bills/stageA.jsonl`, `bills/psi.jsonl`, `bills/stageB.jsonl`, `bills/stageC.jsonl` | `scripts/data/state/bills/enacted.json`, `stageA/B/C.jsonl` | Sessions 2021, 2021A, 2021B, 2021C, 2022, 2022B, 2022C, 2022E, 2023D (Rodriguez and Garcia only were seated). Sessions 2022A, 2022D, 2023B, 2023, 2023C, 2024 are in `scripts/data/tenure/flhouse/bills/` (same bill pages, both chambers' floor votes); this slice adds Senate member rolls for those in `bills/stageC.jsonl` where done. `psi.jsonl` is the extracted Private Sector Impact text of the final analysis, input to stage B. |

Raw sources: `raw/lfr-FY*.html` (Senate LFIR lists), `raw/pdf`, `raw/txt` (814 form PDFs + text), `raw/gaa/gaa<yr>.txt` (enrolled GAAs: 2021 SB 2500 ch. 2021-36, 2022 HB 5001 ch. 2022-156, 2023 SB 2500 ch. 2023-239, 2024 HB 5001 ch. 2024-231), `raw/gaa/veto<yr>.txt` (governor's veto lists), `raw/doe/` (DOE exports).

Member keys match build.py SENATE: Garcia, Calatayud, Rodriguez, Ingoglia. "Rodrigues" (Ray Rodrigues, a different senator) is excluded everywhere.
See `progress.md` for the run log and gaps.
