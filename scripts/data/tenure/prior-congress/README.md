# Prior offices: David Jolly (FL-13), Gwen Graham (FL-2), Jared Moskowitz (Broward County, Parkland)

New data only. Nothing outside this folder was edited; the coordinator merges. Each file uses the schema of the file
it mirrors. Read offices.json first (one row per person and office, with dates, giftsFrom and file list).

| File | Mirrors | What it holds |
|---|---|---|
| laws/laws-list.json | congress/laws/laws-list-108-116.json | All 538 public laws enacted 2014-03-11 to 2017-01-03 (113th from Jolly's start, all of the 114th). |
| laws/benefits.jsonl | congress/laws/benefits-108-116.jsonl | Screening result per law. `screen` says whether the law came from the congress slice's rule screen or this folder's full read. |
| laws/universe.json | congress/laws/universe-108-116.json | Screened universe; per law `inTerm` for each member and the House vote with Jolly's and Graham's votes ("not seated" when the House vote came before they took office; "voice/UC" when no recorded vote). |
| floor-votes.json | congress/floor-votes-tenure.json | 29 cards (qualifying laws with a House roll call), member keys `Jolly` and `Graham`, plus the `classes` they use (12 new classes in build/classes-extra.json). |
| requests.json, requests-note.json | congress/requests-tenure.json | Empty: no earmark requests existed 2011-2021 (CRS R46722). |
| pac-agg.json | congress/pac-agg-tenure.json | Committee gifts to the principal campaign committees, one row per contributor (744 rows). |
| fec-receipts.json | congress/fec-receipts-tenure.json | Every committee gift (1,609), incl. Jolly's leadership PAC (Seagrass PAC). |
| indiv-receipts.json | (new) | Itemized individual receipts from FEC bulk itcont (8,243 rows; memo rows flagged). |
| broward/actions.json, body.json | scripts/data/city/<slug>/actions.json, body.json | Broward County Commission, Jan 12 - Nov 29, 2022: 321 qualifying actions with named parties and the full roll from the clerk's VOTE lines. |
| broward/unnamed.json | (new) | 107 qualifying actions whose beneficiary the motion does not name (plats, land use, etc.), left out and counted. |
| needs-browser.md | | Parkland minutes and campaign reports 2006-2012, Broward special/budget meetings, official oath dates. |
| summary.md | | Per office: term, coverage, counts, gaps. |

## How the laws were screened
The congress slice screened 108th-116th laws by rule (build/rules.py there). For this window every law was read instead,
as the congress slice did for the 117th-118th: all 171 laws whose final CRS summary has a business keyword were read
sentence by sentence, and the other 367 (ceremonial or no keyword) were scanned by title and summary. Result: the
congress slice's 20 qualifying laws plus 39 more (build/adds.py lists each with its quoted sentence), 59 in all. The
same test applies: the CRS summary itself must say a kind of business benefits (payments, tax breaks, regulatory relief,
liability shields, license or deadline extensions, conveyances, multiyear procurement); a business only regulated or
burdened does not count. Borderline laws left out: VA Choice (113-146, 114-41: care purchased from providers),
114-60 (PACE Act), 114-61 (American Samoa minimum wage), 114-74 (Bipartisan Budget Act 2015: crop-insurer return cap and
outpatient site-neutral cut are burdens), 114-159 (miscellaneous tariff process), 114-182 (TSCA), 114-201 (HOTMA).

Vote picks: build/rolls.py + pick2.py + pick3.py (copied from the congress slice) on the BILLSTATUS actions, with three
fixes in build/overrides.json:
- 114-255 (21st Century Cures): the final House vote is roll 592 (2016-11-30, 392-26). pick2 missed it because the action
  text is truncated, so the congress slice's universe shows this law as a voice vote for Diaz-Balart too. **Coordinator:
  the same fix applies to scripts/data/tenure/congress/laws/universe-108-116.json (Diaz-Balart voted on roll 592).**
- 114-187 (PROMESA): S. 2328 was deemed passed under H.Res. 770 right after the House passed the same text as H.R. 5278
  (roll 288); that roll is used, with `rollMeasure`.
- 114-190 (FAA extension, fractional-aircraft ticket-tax exemption): the House agreed to the final text under H.Res. 818
  without a recorded vote. pick2 had chosen roll 82 of Feb 2015, which was on the bill's original unrelated text.

**Coordinator: the 39 added laws are 113th-114th laws that Diaz-Balart also voted on.** His universe-108-116.json does not
include them (rule screen). To keep one test for every member, either add these 39 (with his votes from the clerk XML)
or treat this folder's list as the 2014-2016 universe for all three.

Rolls above 999: none in 2013-2016. `rollYear` is set on each card vote so voteUrl() can build clerk.house.gov/Votes/YYYYNNN.

## FEC
Committees from the cm/ccl masters (see offices.json). Same method as congress/build/fec_build.py: candidate committees'
PAC receipts are taken from the giver's 24K report (bulk itoth has no 11C lines), leadership PAC/JFC receipts from their
own 18K. Window: one cycle before the term to the term's last day (Jolly 2011-01-01 to 2017-01-03; Graham 2013-01-01
to 2017-01-03). Jolly's committee also carried his 2016 U.S. Senate run (July 2015 to June 2016) before he returned to the House
race; those receipts are inside his House term and are kept. JFC-multi rows are shared committees (not all for him).
federal-earmarks.mjs `classGifts()` drops gifts before `TENURE[member].giftsFrom`; set giftsFrom from offices.json.

## Broward
Legistar API (webapi.legistar.com/v1/broward) works via curl. Each event item's minutes note holds the clerk's ACTION
and VOTE lines ("VOTE: 8-0. Commissioner Ryan was not present."). Members not named voted yes; abstained is stored as
`recused` (the city files use yes/no/absent/recused/unknown). Every tally was checked against the parsed roll (all 321
match after seating 8 members from Sep 8, 2022, when Commissioner Alston had left). Build: broward-src/bw_parse.py ->
bw_classify.py -> bw_rules.py (with the hand-reviewed bw_overrides.json) -> bw_build.py; inputs in the scratch folder
listed in progress.md.

Broward donors: none. Moskowitz was appointed and never filed for a county race. A lead outside the standard (his
federal campaign, not the county office): GrayRobinson P.A. PAC gave $2,000 to Moskowitz for Congress (Mar and Jun 2022,
congress/fec-receipts-tenure.json); on Jun 14, 2022 he voted yes to appoint GrayRobinson, P.A. as county bond counsel
(BW-2022-06-14-64).
