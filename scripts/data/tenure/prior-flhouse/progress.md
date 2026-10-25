# prior-flhouse slice: progress

Florida House service by candidates who are not current House members (PRIOR.md). Order of work: Lopez, Donalds,
Avila, Ingoglia, Ana Maria Rodriguez, Javier Fernandez, Moskowitz; newest years first.

## Seat dates (flhouse.gov representatives.aspx, read Oct 25, 2026 via WebFetch)
| pid | district | roster rows | start | end |
|---|---|---|---|---|
| vicki-l-lopez | 113 | term 90 (2022-24): 11/09/22 - 11/05/24; term 91 (2024-26): 11/06/24 - 11/18/25 (Resigned) | 2022-11-09 | 2025-11-18 |
| byron-donalds | 80 | term 87: 11/09/16 - 11/06/18; term 88: 11/07/18 - 11/03/20 | 2016-11-09 | 2020-11-03 |
| bryan-avila | 111 | term 86: 11/04/14 - 11/08/16; 87: 11/09/16 - 11/06/18; 88: 11/07/18 - 11/03/20; 89: 11/04/20 - 11/08/22 | 2014-11-04 | 2022-11-08 |
| blaise-ingoglia | 35 | same four terms as Avila | 2014-11-04 | 2022-11-08 |
| ana-maria-rodriguez | 105 | term 88: 11/07/18 - 11/03/20 | 2018-11-07 | 2020-11-03 |
| javier-fernandez | 114 | term 87: 05/01/18 - 11/06/18 (special election); term 88: 11/07/18 - 10/02/20 (Resigned) | 2018-05-01 | 2020-10-02 |
| jared-moskowitz | 97 | term 85 (2012-14): 11/07/12 - 11/03/14; 86: 11/04/14 - 11/08/16; 87: 11/09/16 - 11/06/18; 88: 11/07/18 - 01/11/19 (Resigned) | 2012-11-07 | 2019-01-11 |

careers.jsonl differs only for Donalds (2016-11-08 there; roster says 11/09/16).

## Sessions per member (laws universe)
- Lopez: 2022A, 2023B, 2023, 2023C, 2024 (flhouse slice bills-2023/2024.json), 2025 + 2025A/B/C (scripts/data/state/bills/universe.json). 2026 sessions are after her resignation.
- Avila, Ingoglia: 2015, 2015A, 2015B, 2015C, 2016, 2017, 2017A, 2018, 2019, 2020, 2021-22 (bills-2122.json, Senate screening), 2022D (flhouse bills-2023.json).
- Donalds: 2017, 2017A, 2018, 2019, 2020. Rodriguez, Fernandez: 2019, 2020. Moskowitz: 2013, 2014, 2014A, 2015 .. 2018 (2019 session began after his resignation).

## Endpoints (Oct 25, 2026)
- flsenate.gov: shell curl works (bill lists, bill pages, analyses, House vote PDFs back to 2013); 429 when fast. bills/fl.py serializes all of this slice's requests, 7 s apart.
- flhouse.gov: shell curl gets the F5 reject page (244 bytes). WebFetch works for representatives.aspx and the APR list page (AppropriationProjectRequests/<year>), but the list text is cut at ~106K chars (forms 1001-1474 of 2,772 for 2024). APR form PDFs (api/document/apr) are robots-blocked for WebFetch -> browser.
- dos.elections.myflorida.com: 403 Cloudflare from shell -> browser (needs-browser.md).
- House project bills 2017-2022 (HB 2xxx-4xxx) are on flsenate.gov's House bill lists with sponsor, so each member's request list for those years can be read there; the attached request form (lobbyist, recipient) is on flhouse.gov -> browser.

## Log
- 2026-10-25 start. Folder created; bills/fetch-list.py running (2013-2020 session lists).
- 2026-10-25 18:38 INCIDENT: a `pkill -f "bills/fetch-list.py"` meant for this slice's list fetch also matched and stopped the prior-flsenate slice's `python3 -I bills/fetch-list.py` (its log ends "2020 5 1"; its 2020 rows were already written to its enacted.jsonl). Not restarted from here (two copies would append duplicate sessions); that slice's own resume will pick it up. From now on only exact PIDs are killed.
- The prior-flsenate slice is building the same 2013-2020 law universe (newest first). To avoid fetching the same flsenate.gov pages twice, this slice's fetch-list.py and stageA.py copy any session/chapter that slice already has (marked "from": "prior-flsenate") and otherwise work oldest first, so the two slices meet in the middle.
