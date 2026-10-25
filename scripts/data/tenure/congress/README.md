# Congress: full-tenure extension (Diaz-Balart, Salazar, Gimenez, Donalds, Moskowitz; Moody)

New data only. Nothing in scripts/data/federal/ or public/data/ was edited; the coordinator merges.
Every file here uses the schema of the original file it extends.

| New file | Extends | What it adds |
|---|---|---|
| requests-tenure.json | scripts/data/federal/requests.json | Every Community Project Funding request, FY2022-FY2025 (213 rows). Same keys, plus `funded`, `fundedAs`, `fundedWith`, `fundedNote`, `fundedSource`. FY2022-23 from the House Appropriations Committee's request tables (democrats-appropriations.house.gov/transparency/fiscal-year-2022, -2023); FY2024 from appropriations.house.gov/fy24-submitted-requests; FY2025 from each member's own request page (no committee table is online). Funded amounts from GAO's "Tracking the Funds" datasets (GAO-25-107274, GAO-25-107549). FY2025 funded = 0: the year ran on a full-year CR with no CPF. Earmarks returned in FY2022; there are no requests before that. |
| lda-clients-tenure.json | scripts/data/federal/lda-clients.json | LDA registrations/reports, filing years 2021-2024, for the FY2022-25 recipients. Same row shape plus a filing-years column. |
| gm-tenure.json | scripts/data/federal/gm.json | LD-203 gifts to each member's campaign from firms registered for a client the member asked money for, 2019-2024. Same row shape. Joint fundraising committees left out, as in gm.json. |
| pac-agg-tenure.json | scripts/data/federal/pac-agg.json | Committee (PAC, party, candidate) gifts to each member's principal/authorized campaign committee, from the cycle before tenure (Diaz-Balart 2001, Salazar/Gimenez/Donalds 2019, Moskowitz 2021, Moody 2023) to the Oct 18, 2026 bulk file. Same columns. All contributors kept, not only donor-class matches, so `classGifts()` can match any class. |
| fec-receipts-tenure.json | (new; source for the above) | Every committee gift, one row each, to the candidate committee, leadership PAC and joint fundraising committees (ids in build/cmtes.json). |
| floor-votes-tenure.json | scripts/data/federal/floor-votes.json | `bills` for every qualifying law of the 108th-118th Congresses that had a House roll call (134 cards), with member votes from clerk.house.gov, plus the `classes` they use (new classes and extended donor patterns). Members not yet seated are omitted from a vote's `members`. |
| laws/laws-list-117-118.json, laws/laws-list-108-116.json | scripts/data/federal/laws/laws-list.json | All public laws of those Congresses (636; 3,517). |
| laws/benefits-117-118.jsonl, laws/benefits-108-116.jsonl | scripts/data/federal/laws/benefits.jsonl | Per-law screening result (qualifies or why not). |
| laws/universe-117-118.json, laws/universe-108-116.json | scripts/data/federal/laws/universe.json | Screened universe with House vote per member (including voice/UC laws and "not seated"). |

## Caveats the coordinator should know
- Candidate committees' own Schedule A PAC receipts (line 11C) are not in the FEC bulk itoth file, so those gifts are taken from the giving committee's 24K report (the giver's date, which can differ by days from the campaign's receipt date). Against the existing 2025-26 pac-agg.json, 63 of 102 contributor totals match exactly; differences are timing/splits. Use the FEC API pull for exact receipt dates if needed.
- federal-earmarks.mjs `classGifts()` drops gifts before 2025-01-01 (`last < '2025-01-01'`) and `FY`/`voteUrl` only know FY2026-27 and the 119th Congress; those need widening to use these files. Clerk URLs for rolls above 999 (2007) are clerk.house.gov/Votes/YYYYNNNN, not the evs XML.
- 117th-118th laws were screened by reading every CRS summary hit. 108th-116th laws were screened by rule (see build/rules.py) with manual adds and drops; a closer read may move a few laws in or out.
- Laws passed in the House by voice vote or unanimous consent have no card (no member vote); they are in universe-*.json.
- Card subjects for 108-116 use the law's official title in all three languages (not translated).
- Moody: her Senate tenure starts Jan 21, 2025, already covered by the 119th-Congress files; nothing earlier to add except FEC gifts from 2023 on (in the files above).

Build scripts and inputs: build/ (run from a scratch dir holding the raw downloads listed in progress.md).
