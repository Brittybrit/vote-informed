# prior-flsenate: requests for the coordinator's browser pass

All are Florida Division of Elections pulls: dos.elections.myflorida.com/campaign-finance/contributions/ page, in-page
fetch('/cgi-bin/contrib.exe', POST, queryformat=2), same method as tenure/flsenate (raw/doe chunks). Save each
tab-delimited export unchanged (9-column layout: candidate/committee, MM/DD/YYYY, amount, type, name, address,
city-state, occupation, in-kind), one file per account, into scripts/data/tenure/prior-flsenate/donors/<file>.
Verify each file by row count and amount sum against the page. Keep only rows for the office named (the export prints
the office code after the party, e.g. "(REP)(STS)" = State Senator).

Gift window rule (PRIOR.md): one cycle before the Senate term started, to the term's last day.

Committee names marked "news" come from Florida Politics articles, not from DOE; confirm each on the DOE committee
list (https://dos.elections.myflorida.com/committees/, search by name, then check the chair/officers) and record the
account number in the file name. Also run the committee list's officer search for the member's last name and pull any
other committee that names them as chair during the window.

## 1. Bryan Avila, State Senator SD 39 (2022-11-08 to 2026-08-25; gifts from 2020-11-04)

| # | Account | contrib.exe fields | Date range | Output file |
|---|---|---|---|---|
| 1a | Avila, Bryan (REP)(STS), 2022 general election candidate account (SD 39) | search_on=1, CanLName=Avila, CanFName=Bryan, election = 2022 general (or All; keep STS rows) | 11/04/2020 to 12/31/2022 | avila-sts-2022.tsv |
| 1b | Avila, Bryan (REP)(STS), 2026 general election candidate account, if one was opened before he resigned | same, election = 2026 general (keep STS rows) | 01/01/2023 to 08/25/2026 | avila-sts-2026.tsv |
| 1c | Fighting for Florida's Families (political committee; news: floridapolitics.com/archives/474492-avila-114k-october) | ComName="Fighting for Florida's Families", ComNameSrch=2 | 11/04/2020 to 08/25/2026 | pc<acct>-avila.tsv |
| 1d | Any other committee chaired by Avila 2020-2026 (officer search "Avila") | as 1c | 11/04/2020 to 08/25/2026 | pc<acct>.tsv |

His House-era (STR) rows are not part of this office. After 08/25/2026 his money is Lt. Governor ticket money, not this office.

## 2. Annette Taddeo, State Senator SD 40 (2017-09-26 to 2022-11-08; gifts from 2016-11-09)

| # | Account | contrib.exe fields | Date range | Output file |
|---|---|---|---|---|
| 2a | Taddeo, Annette (DEM)(STS), 2017 special election account (SD 40, special general 9/26/2017) | search_on=1, CanLName=Taddeo, election = 2017 special (SD 40) or All; keep STS rows | 11/09/2016 to 12/31/2017 | taddeo-sts-2017.tsv |
| 2b | Taddeo, Annette (DEM)(STS), 2018 general election account (SD 40) | same, election = 2018 general | 09/27/2017 to 12/31/2018 | taddeo-sts-2018.tsv |
| 2c | Any later STS account (2022 cycle) before she ran for Congress | same, election = 2022 general (keep STS rows only) | 01/01/2019 to 11/08/2022 | taddeo-sts-2022.tsv |
| 2d | Fight Back Florida (political committee; news: floridapolitics.com/archives/441319-taddeo-42k-june) | ComName="Fight Back Florida", ComNameSrch=2 | 11/09/2016 to 11/08/2022 | pc<acct>-taddeo.tsv |
| 2e | Any other committee chaired by Taddeo (officer search "Taddeo") | as 2d | 11/09/2016 to 11/08/2022 | pc<acct>.tsv |

Her 2021-22 governor (GOV) account and her 2022 U.S. House (FEC) money are not part of this office.

## 3. Wilton Simpson, State Senator SD 18 then SD 10 (2012-11-06 to 2022-11-08; gifts from 2010-11-03)

Newest first: pull 3a-3d (2016-2022) before 3e-3f.

| # | Account | contrib.exe fields | Date range | Output file |
|---|---|---|---|---|
| 3a | Simpson, Wilton (REP)(STS), 2018 general election account (SD 10), if any | search_on=1, CanLName=Simpson, CanFName=Wilton, election = 2018 general; keep STS rows | 11/09/2016 to 12/31/2018 | simpson-sts-2018.tsv |
| 3b | Simpson, Wilton (REP)(STS), 2016 general election account (SD 10) | same, election = 2016 general | 11/05/2014 to 12/31/2016 | simpson-sts-2016.tsv |
| 3c | Simpson, Wilton (REP)(STS), any 2020/2022 STS account | same, election = 2020 or 2022 general; STS rows only (his 2022 AGR account is requested by prior-statewide) | 01/01/2019 to 11/08/2022 | simpson-sts-2022.tsv |
| 3d | Jobs for Florida (political committee; news: floridapolitics.com/?p=268215 and floridapolitics.com/archives/tag/jobs-for-florida) | ComName="Jobs for Florida", ComNameSrch=2 | 11/03/2010 to 11/08/2022 (pull 2016-2022 first) | pc<acct>-simpson.tsv |
| 3e | Simpson, Wilton (REP)(STS), 2012 general election account (SD 18) | same, election = 2012 general | 11/03/2010 to 12/31/2012 | simpson-sts-2012.tsv |
| 3f | Any other committee chaired by Simpson 2010-2022 (officer search "Simpson") | as 3d | 11/03/2010 to 11/08/2022 | pc<acct>.tsv |

## 4. Jose Javier Rodriguez, State Senator SD 37 (2016-11-08 to 2020-11-03; gifts from 2014-11-05)

| # | Account | contrib.exe fields | Date range | Output file |
|---|---|---|---|---|
| 4a | Rodriguez, Jose Javier (DEM)(STS), 2016 general election account (SD 37) | search_on=1, CanLName=Rodriguez, CanFName=Jose Javier; keep STS rows (his STR House rows are a different office) | 11/05/2014 to 12/31/2016 | jjrodriguez-sts-2016.tsv |
| 4b | Rodriguez, Jose Javier (DEM)(STS), 2020 general election account (SD 37) | same, election = 2020 general | 11/09/2016 to 11/03/2020 | jjrodriguez-sts-2020.tsv |
| 4c | Initiative for Florida's Future (political committee; news: floridapolitics.com/archives/364001-rodriguez-670k-sd-37) | ComName="Initiative for Florida's Future", ComNameSrch=2 | 11/05/2014 to 11/03/2020 | pc<acct>-jjrodriguez.tsv |
| 4d | Any other committee chaired by him (officer search "Rodriguez"; check first name) | as 4c | 11/05/2014 to 11/03/2020 | pc<acct>.tsv |

## 5. Daphne Campbell, State Senator SD 38 (2016-11-08 to 2018-11-06; gifts from 2014-11-05)

| # | Account | contrib.exe fields | Date range | Output file |
|---|---|---|---|---|
| 5a | Campbell, Daphne (DEM)(STS), 2016 general election account (SD 38) | search_on=1, CanLName=Campbell, CanFName=Daphne; keep STS rows | 11/05/2014 to 12/31/2016 | campbell-sts-2016.tsv |
| 5b | Campbell, Daphne (DEM)(STS), 2018 account (SD 38; lost the Aug 28, 2018 primary) | same, election = 2018 general/primary | 11/09/2016 to 11/06/2018 | campbell-sts-2018.tsv |
| 5c | Any political committee chaired by Campbell (officer search "Campbell"; none found in news) | as 1c | 11/05/2014 to 11/06/2018 | pc<acct>.tsv |

## 6. Governor's 2018 line-item veto list (FY 2018-19 GAA, HB 5001, ch. 2018-9)

Not on flgov.com under the paths used for 2020-2026, and the veto message of this House-originated GAA is printed in the
House Journal (myfloridahouse.gov, bot check), not the Senate Journal. Either source works:
- flgov.com (Gov. Rick Scott, March 16, 2018 budget signing press release, attached "Veto List" PDF), or
- the Journal of the House of Representatives that prints the Governor's objections to HB 5001 (2018), e.g. the 2018
  Organization Session or the 2019 Regular Session journal, Vetoed Bills section.
Save as scripts/data/tenure/prior-flsenate/raw/gaa/veto2018.pdf (and .txt via pdftotext -layout). Then in build-requests.py
remove 2018 from VETO_SRC (flgov list layout) or add a journal entry for it, and rerun `python3 -I build-requests.py 2018-19`.
Until then FY2018-19 forms carry budget.vetoUnknown (Simpson 48, Campbell 86, JJ Rodriguez 12, Taddeo 3).

## After the pull
Run nothing else; the donor matching for these accounts is the coordinator's (same as ../flsenate/donors/tag.py).
