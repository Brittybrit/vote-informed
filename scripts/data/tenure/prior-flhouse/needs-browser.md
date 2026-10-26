# prior-flhouse: requests that need a browser

Everything here is blocked from the container (flhouse.gov form PDFs: F5 bot check for curl, robots.txt for WebFetch;
dos.elections.myflorida.com: Cloudflare 403). Each item says the URL, what to read, and the file to write in this folder.
After a file is written, rerun the build named in the item; nothing else needs changing.

## DOE-1 .. DOE-7: campaign and political-committee contributions (Florida Division of Elections)

Method that worked for the flhouse and flsenate slices (see ../flhouse/progress.md): in Claude in Chrome open
https://dos.elections.myflorida.com/campaign-finance/contributions/ , then POST in the page to
https://dos.elections.myflorida.com/cgi-bin/contrib.exe with queryformat=2 (tab-delimited), election=All,
search_on=1, and either CanFName/CanLName (candidate) or ComName + ComNameSrch=2 (committee), cdatefrom/cdateto as
below, all other fields blank / All. Keep only rows of the State Representative accounts listed (the candidate
search returns every office the person ran for). Write the rows unchanged in the 9-column layout of
../flhouse/donors/nixon-pre2025.tsv (header: Candidate/Committee, Date, Amount, Typ, Contributor Name, Address,
City State Zip, Occupation, Inkind Desc), check row count and cent total against the page.

Date window = from the day after the general election before the member was first seated (one cycle before) to the
last day in the seat (PRIOR.md).

| id | person | what | cdatefrom | cdateto | write |
|---|---|---|---|---|---|
| DOE-1a | Vicki L. Lopez | candidate: CanLName=Lopez, CanFName=Vicki; keep (REP)(STR) rows (State House District 113, 2022 and 2024 races, and any 2026 House account opened before she left) | 11/04/2020 | 11/18/2025 | donors/lopez-house.tsv |
| DOE-1b | Vicki L. Lopez | committee: ComName="Common Sense Government" (account 80020, chair Vicki L. Lopez per ComDetail.asp?account=80020); 2025-2026 rows are already in ../../county/donors/pc80020.tsv | 11/04/2020 | 12/31/2024 | donors/pc80020-pre2025.tsv |
| DOE-2a | Byron Donalds | candidate: CanLName=Donalds, CanFName=Byron; keep (REP)(STR) rows (District 80, 2016 and 2018) | 11/05/2014 | 11/03/2020 | donors/donalds-house.tsv |
| DOE-2b | Byron Donalds | committees: committee search by officer (Chairperson, last name Donalds) on https://dos.elections.myflorida.com/committees/ ; for each committee he chaired in 2014-2020, the contributions in the window | 11/05/2014 | 11/03/2020 | donors/pc<account>-house.tsv |
| DOE-3a | Bryan Avila | candidate: CanLName=Avila, CanFName=Bryan; keep (REP)(STR) rows (District 111, 2014, 2016, 2018, 2020); leave out his 2022 State Senate account | 11/07/2012 | 11/08/2022 | donors/avila-house.tsv |
| DOE-3b | Bryan Avila | committee "Fighting for Florida's Families" (Florida Politics, 2021: Avila's political committee) plus any other committee found by officer search (Chairperson, Avila) | 11/07/2012 | 11/08/2022 | donors/pc<account>-house.tsv |
| DOE-4a | Blaise Ingoglia | candidate: CanLName=Ingoglia, CanFName=Blaise; keep (REP)(STR) rows (District 35, 2014-2020) | 11/07/2012 | 11/08/2022 | donors/ingoglia-house.tsv |
| DOE-4b | Blaise Ingoglia | committee "Government Gone Wild PAC" (account 70076); rows from 12/12/2020 on are already in ../flsenate/donors/pc70076.tsv, so only the earlier range | 11/07/2012 | 12/11/2020 | donors/pc70076-pre2020.tsv |
| DOE-4c | Blaise Ingoglia | officer search (Chairperson, Ingoglia) for any other committee active 2012-2022 (Friends of Blaise Ingoglia, account 79506, starts 07/2021 and is already in ../flsenate/donors/pc79506.tsv) | 11/07/2012 | 11/08/2022 | donors/pc<account>-house.tsv |
| DOE-5a | Ana Maria Rodriguez | candidate: CanLName=Rodriguez, CanFName=Ana Maria; keep (REP)(STR) rows (District 105, 2018); leave out her State Senate account 83549 (2020 race) | 11/09/2016 | 11/03/2020 | donors/rodriguez-house.tsv |
| DOE-5b | Ana Maria Rodriguez | committee "Ethics and Honesty in Government" (account 70258): rows from 12/04/2018 are in ../flsenate/donors/pc70258.tsv; pull anything earlier | 11/09/2016 | 12/03/2018 | donors/pc70258-pre2018.tsv |
| DOE-6a | Javier E. Fernandez | candidate: CanLName=Fernandez, CanFName=Javier; keep (DEM)(STR) rows (District 114: 2018 special election and 2018 general); leave out his 2020 State Senate account | 11/09/2016 | 10/02/2020 | donors/fernandez-house.tsv |
| DOE-6b | Javier E. Fernandez | officer search (Chairperson, Fernandez) for committees he chaired 2016-2020 | 11/09/2016 | 10/02/2020 | donors/pc<account>-house.tsv |
| DOE-7a | Jared Moskowitz | candidate: CanLName=Moskowitz, CanFName=Jared; keep (DEM)(STR) rows (District 97, 2012, 2014, 2016, 2018) | 11/03/2010 | 01/11/2019 | donors/moskowitz-house.tsv |
| DOE-7b | Jared Moskowitz | officer search (Chairperson, Moskowitz) for committees he chaired 2010-2019 | 11/03/2010 | 01/11/2019 | donors/pc<account>-house.tsv |

Note for DOE-2b/3b/4c/6b/7b: the officer search form is the "Search Committees by Officer" box on
https://dos.elections.myflorida.com/committees/ (Last Name, Officer Type = Chairperson). Record every committee it
returns for that person (name, account, chair, dates) in donors/committees.md even if it has no rows in the window.

## APR-LOPEZ: Vicki Lopez's Appropriations Project Requests, 2023-2026 sessions [DONE Oct 26, 2026: raw/apr-2023..2026.txt]

flhouse.gov/AppropriationProjectRequests/<year> lists every form on one page (the WebFetch copy stops at about form
470 of 2,300-2,850; partial rows in raw/apr-visible-lopez.txt). For each year 2023, 2024, 2025, 2026: every row
with Sponsor "Lopez, Vicki"; then open each form (https://www.flhouse.gov/api/document/apr?sessionid=<99|103|?|?>&id=<doc>,
session ids: 2023=99, 2024=103; read 2025 and 2026 ids from the form links) and read: date submitted, recipient
organization (item 10a), county (10b), lobbyist (9a) and firm (9b), committee, total amount. Same way the flhouse
slice built ../flhouse/raw/apr-2023.txt.
Write raw/apr-<year>.txt, one line per form, layout of ../flhouse/raw/apr-2023.txt:
`form~doc~Lopez~MM/DD/YYYY~ask~recipient~county~lobbyist~firm~committee~title` (withdrawn forms too, with
" (Withdrawn)" kept in the title). Then run `python3 build-requests.py` in this folder.

## PB-FORMS: request forms attached to the House project bills, 2017-2022 sessions [DONE Oct 26, 2026: raw/apb-2017..2022.txt, 324 forms]

Each member's project bills (HB 2000-4999) are already listed from flsenate.gov in raw/pb-<year>.json (bill, title,
sponsor, last action). The attached "Appropriations Project Request" form is only on flhouse.gov: open
https://www.flhouse.gov/Sections/Appropriations/projectbills.aspx?SessionId=<id> (2017=83, 2018=86, 2019=87, 2020=89,
2021=90, 2022=93), find the bill, open its request form and read: date submitted, total project cost, recipient
(10a), county (10b), lobbyist (9a), firm (9b), agency (6). Write raw/apb-<year>.txt in the layout of
../flhouse/raw/apb-2022.txt (`bill~member~funds~billId~APR#~date~sponsor(form)~total~recipient~county~lobbyist~firm~agency~title`).
The bills to read are listed per year in raw/pb-forms-todo.txt (written by build-requests.py). Without the forms,
requests-<year>.json still lists each bill with its title, amount requested and budget status, and says the
lobbyist field was not read.

## ARCHIVE-1516: House member project request forms, 2015 and 2016 sessions [DONE Oct 26, 2026: not archived, see progress.md]

CBS Miami (Apr 1, 2015) reports the House required detailed member request forms that session. flhouse.gov no longer
shows them. In a browser, open web.archive.org captures of http://www.myfloridahouse.gov/Sections/Appropriations/projects.aspx
(and any linked list) from Feb-Jun 2015 and Jan-Apr 2016; if a list of requests by member exists, save the rows for
Moskowitz, Avila and Ingoglia (title, amount, recipient, form link) to raw/apf-2015.txt / raw/apf-2016.txt and note the
capture URL. If no capture has them, write "not archived" in progress.md.
