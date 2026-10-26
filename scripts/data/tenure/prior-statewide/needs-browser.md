# prior-statewide: requests for the coordinator's browser pass

All DOE pulls: dos.elections.myflorida.com/campaign-finance/contributions/ page, in-page
fetch('/cgi-bin/contrib.exe', POST, queryformat=2), same method as tenure/flsenate (raw/doe chunks) and tenure/flhouse
(donors/pages). Save the tab-delimited export unchanged (9-column layout: candidate/committee, MM/DD/YYYY, amount, type,
name, address, city-state, occupation, in-kind), one file per account, into
scripts/data/tenure/prior-statewide/donors/<file>. Verify each file by row count and amount sum against the page.

## 1. Ashley Moody, Attorney General (term 2019-01-08 to 2025-01-21; gifts from 2016-11-09)

| # | Account | contrib.exe fields | Date range | Output file |
|---|---|---|---|---|
| 1a | Moody, Ashley (REP)(ATG), 2018 general election candidate account | search_on=1 (candidate), CanLName=Moody, CanFName=Ashley, election = 2018 general (or All, keep ATG rows), cdatefrom=11/09/2016, cdateto=12/31/2018 | 11/09/2016 to 12/31/2018 | moody-atg-2018.tsv |
| 1b | Moody, Ashley (REP)(ATG), 2022 general election candidate account | same, election = 2022 general (or All, keep ATG rows) | 01/01/2019 to 12/31/2022 | moody-atg-2022.tsv |
| 1c | Friends of Ashley Moody (political committee; name per the Florida Phoenix, Oct 10, 2019). Look up the account number on the DOE committee list first and record it here | search_on=1 with ComName="Friends of Ashley Moody", ComNameSrch=2, cdatefrom=11/09/2016, cdateto=01/21/2025; keep exact-name rows only | 11/09/2016 to 01/21/2025 | pc<acct>-moody.tsv |
| 1d | Any other committee Moody chaired 2017-2025 (DOE committee list, chair/treasurer search "Moody") | as 1c | 11/09/2016 to 01/21/2025 | pc<acct>.tsv |

Moody's U.S. Senate (FEC) money is not part of this office.

## 2. Wilton Simpson, Commissioner of Agriculture (term 2023-01-03 on; this slice covers to 2024-12-31; gifts from 2020-11-04)

The repo already has his 2025-2026 rows (scripts/data/cabinet/simpson.tsv: 2026 only; pc79644.tsv: 2025-2026). Missing:

| # | Account | contrib.exe fields | Date range | Output file |
|---|---|---|---|---|
| 2a | Simpson, Wilton (REP)(AGR), 2022 general election candidate account | search_on=1, CanLName=Simpson, CanFName=Wilton, election = 2022 general (keep AGR rows) | 11/04/2020 to 12/31/2022 (the account closes after the election) | simpson-agr-2022.tsv |
| 2b | Simpson, Wilton (REP)(AGR), 2026 general election candidate account, rows before 2025 if any | same, election = 2026 general | 01/01/2023 to 12/31/2024 | simpson-agr-2026-pre2025.tsv |
| 2c | Friends of Wilton Simpson (pc79644) | ComName="Friends of Wilton Simpson", ComNameSrch=2 | 11/04/2020 to 12/31/2024 | pc79644-pre2025.tsv |
| 2d | Any other committee Simpson chaired 2020-2024 (DOE committee list, chair search "Simpson"); keep only if the list names him as chair | as 2c | 11/04/2020 to 12/31/2024 | pc<acct>.tsv |

## 3. FACTS (facts.fldfs.com) contracts, grants and purchase orders

The search page loads from shell, but the search postback returns "No results" outside a browser. In a browser, on
https://facts.fldfs.com/Search/ContractSearch.aspx run each search below and use the results page's export (or copy the
grid with Contract ID, Vendor, Type, Amount, Begin, End, Method of Procurement, Agency Contract ID). Save CSVs to
scripts/data/tenure/prior-statewide/facts/<file>.

| # | Agency | Criteria | Output |
|---|---|---|---|
| 3a | DEPARTMENT OF LEGAL AFFAIRS (410000) | Search option: Contracts; Begin Date 01/08/2019; End Date blank (then also any contract with begin date before 01/08/2019 amended after it, if the Advanced Search allows "executed/amended date") | oag-contracts.csv |
| 3b | DEPARTMENT OF LEGAL AFFAIRS (410000) | Search option: Grant Awards; Begin Date 01/08/2019 | oag-grants.csv |
| 3c | DEPARTMENT OF LEGAL AFFAIRS (410000) | Search option: Purchase Orders; Begin Date 01/08/2019, End 01/21/2025 | oag-pos.csv |
| 3d | DEPARTMENT OF AGRICULTURE AND CONSUMER SERVICES (420000) | Contracts; Begin Date 01/03/2023, through 12/31/2024 | fdacs-contracts.csv |
| 3e | DEPARTMENT OF AGRICULTURE AND CONSUMER SERVICES (420000) | Grant Awards; Begin Date 01/03/2023, through 12/31/2024 | fdacs-grants.csv |
| 3f | DEPARTMENT OF AGRICULTURE AND CONSUMER SERVICES (420000) | Purchase Orders; 01/03/2023 to 12/31/2024 | fdacs-pos.csv |
| 3g | EXECUTIVE OFFICE OF THE GOVERNOR (310000; the Division of Emergency Management files under it) | Contracts; Begin Date 01/01/2019 to 01/31/2021; keep rows whose org is Emergency Management | fdem-contracts.csv |
| 3h | EXECUTIVE OFFICE OF THE GOVERNOR (310000) | Purchase Orders; 01/01/2019 to 01/31/2021; Emergency Management rows | fdem-pos.csv |
| 3i | EXECUTIVE OFFICE OF THE GOVERNOR (310000) | Grant Awards; 01/01/2019 to 01/31/2021; Emergency Management rows | fdem-grants.csv |

## 4. Other blocked pages (read as text, save under raw/)

- Cabinet agendas and transcripts are now in raw/cabinet (from www.cabinet.myflorida.com archive, which works from shell).
  Still needed: the agency backup that names private parties the agendas and transcripts do not name (class private_unnamed in
  cabinet-other/actions.json, 93 items), plus the State Board of Administration minutes (or meeting video) for 2019-07-25,
  2019-09-24 and 2019-10-22, where the archive has only a Cabinet Aides transcript, so the 12 named items in cabinet-other with
  roll null get a recorded vote: State Board of Administration Florida Housing fiscal determinations (development and
  owner entity), Division of Bond Finance reports of award (winning bidder per sale), FDLE and DHSMV "Contracts, Agreements and
  Purchases over $100,000" lists, FLWAC community development district petitions (petitioner/landowner), Bond Finance municipal
  advisor selection (Sept 18, 2023) and the DFS equipment-financing line of credit (June 15, 2021). Source: the agency backup
  packets for each meeting date in cabinet-other/actions.json items (sbafla.com, myfloridacfo.com Bond Finance, fdle.state.fl.us,
  flhsmv.gov; floridajobs.org / Governor's Office for FLWAC). Save per meeting as raw/cabinet/backup/<date>_<agency>.pdf.
- www.myfloridalegal.com/newsreleases (403 from shell; WebFetch shows page 1 only): the full Attorney General release index
  2019-01-08 to 2025-01-21 (title, date, URL), saved as raw/oag-press-index.json. The site has 1,699 releases in all; this slice read
  78 found by search. Also the "Week in Review" index (298 weeks, all Moody's).
- myfloridalegal.com Department of Legal Affairs annual report for FY 2024-25 (grant awards made July 2024 to Jan 2025), if posted.
- Releases that WebFetch refused (raw/oag-blocked.txt): read each and add a line to raw/oag-releases.tsv.
