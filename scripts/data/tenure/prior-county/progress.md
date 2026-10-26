# Prior county offices slice (Barreiro D5 commissioner; Gimenez mayor and D7 commissioner): progress

Universe: every final Miami-Dade BCC action (and zoning/CDMP where online) that names a private party, from Barreiro's first
meeting (1998-06-16) to Gimenez's last day as mayor (2020-11-17). Same rules as scripts/data/tenure/county/progress.md.

## Endpoints used (from shell, 2026-10-25)
- works via shell curl: miamidade.gov/govaction/minutes.asp?Action=Minutes&Oper=DisplayMinute&Minute=CC (BCC list goes back to 1996-06;
  pre-2017 zoning hearings are NOT in it), minutes2.asp ...&Minute=ZB (2017-07 on) and =CDMP (2017-04 on).
- works via shell curl: commminute.asp?cmbmeetdate=<id>&file=false (full minutes, mover/seconder/vote/absent per item, attendance header).
- works via shell curl: matter.asp?matter=<file>&file=true&yearFolder=Y<yyyy> (requester, sponsors, Registered Lobbyist field,
  legislative history incl. mayoral veto lines, legislative text incl. the Mayor's memo and RECOMMENDATION).
- works via shell curl: www2.miamidadeclerk.gov/lobbyhist API. lobbyistByPeriod has almost nothing before mid-2003 (it is keyed on a
  later date field); principalsByNameQuery + lobbyistdetails (by principal id) does return older employment dates (e.g. 2000-08-24).
- works via shell curl: VoterFocus export.php?op=CFINANCE&cand_id=<ca>&dhc=0&county=miamidade (county campaigns 2002 on).
  Barreiro: ca=273 (2004 cycle), 597 (2008), 868 (2012), 1453 (2016). Gimenez: 286 (2004 D7), 572 (2008 D7), 971 (2011 mayor special),
  1049 (2012 mayor), 1454 (2016 mayor). No VoterFocus data for 1998 or 2000 races.
- Zoning hearing archive (RER): miamidade.gov/zoning/Hearing_Reports/<yyyy>/HEAR_MONTHLY_BOARD.pdf reads via WebFetch (applications
  by board, links to results PDFs at miamidade.gov/business/Results/CC/<yy>/BCC<mmddyy>r.pdf), but the results PDFs fail from both
  curl and WebFetch. Listed in needs-browser.md.

## Log
- 2026-10-25 start. Minutes lists pulled: 927 BCC/ZB/CDMP meetings dated 1998-06-02..2020-11-17. Downloading all to scratch.
- 2026-10-25 lobbyist history byPeriod pulled monthly 1996-01..2020-12 (18,429 rows; 2003-06 onward only).
- 2026-10-25 VoterFocus exports pulled for the 9 county campaigns above, plus Miami-Dade Residents First (ca=1415, county PC).
- 2026-10-25 DONE minutes: 925 of 927 meetings 1998-06-02..2020-11-16 downloaded and parsed (1317 and 4342 return the county error
  page). Parser checks: every printed tally reconciles with the attendance-based roll once "Absent, OCB" (absent) and
  "Absent, COI" (recused) lines are read. Calibrated against county/actions.json on the 211 meetings 2020-11..2025-11: 1,807 of
  their 1,914 actions selected the same way (94%); most differences are donations/rescissions/union items they left unnamed.
- 2026-10-25 Dates from the minutes: Barreiro first seated 1998-06-16 (that day's minutes approve the canvassing certificate for
  the 1998-06-02 District 5 special election), last seated 2018-03-21, District 5 shown vacant from 2018-04-04 (special
  election called R-290-18). Gimenez (D7) first seated 2004-11-17, last 2011-04-11, District 7 vacant from 2011-04-13 (special
  election called R-273-11). Gimenez elected mayor in the 2011-06-28 runoff (canvassing certificate 111508 accepted
  2011-07-19); first BCC meeting with him as mayor 2011-07-07; last BCC meeting of his term 2020-11-16. No oath record found
  online for either office.
- 2026-10-25 Stage 1: 7,581 final actions naming a private party (1998-06-16..2020-11-16), 26,172 final actions with no named
  private party or excluded by rule (unnamed.json), 28 veto override/sustain votes (vetoes.json).
- 2026-10-25 Matter pages (matter.asp) being fetched for all 7,581 (requester, sponsors, Registered Lobbyist, memo From and
  RECOMMENDATION, veto lines). Clerk per-matter minutes PDFs (MinMatters) exist only for files from 2005 on.
- 2026-10-25 Lobbyist lookup v1 (search by name without suffix) missed names with '&' and leading THE; redone as lobbypull v2
  (prefix search, then same-name filter).
- 2026-10-25 Exclusion rules narrowed (QNIP contracts, "memorial" hospitals, appointments of named firms, supporting
  resolutions for named companies now kept). Calibration vs county/actions.json: 1,849 of 1,914 (96.6%). Final stage 1:
  7,752 actions, 25,940 left out (16,458 no named private party; 9,482 excluded by rule, 1,277 of them in-kind allocations).
- 2026-10-25 DONE matter pages: 7,752 of 7,752 read. "Registered Lobbyist" field filled on 15 items (1999-2002).
- 2026-10-25 DONE lobbyists: lobbypull v2 over 6,388 party names (0 errors) plus the byPeriod rows; 1,101 actions with at
  least one registered lobbyist (4,981 lobbyist-party pairs). Annual registration years pulled for 4,817 lobbyist ids.
- 2026-10-25 DONE outputs: actions.json, unnamed.json, vetoes.json, body.json, offices.json, donors/, gifts-preview.json,
  summary.md. Scratch scripts (not in repo): parse.py, classify.py, sel.py, build1-3.py, matter.py, lobbypull2.py,
  lobregs.py, gifts.py in the session scratchpad.
- Remaining: needs-browser.md (DOE committees for both men, pre-2017 zoning results PDFs, two minutes pages); coordinator
  to decide how mayoral facts count and to run the official gift match.
- Build scripts copied to tools/ in this folder (they read raw downloads from the session scratchpad path set in BASE; rerun order: parse.py, build1.py, fetchmatter.sh + lobbypull2.py + lobregs.py, build2.py, build3.py, summary.py).
- 2026-10-26 needs-browser #3 (built-in browser): https://www.miamidade.gov/govaction/commminute.asp?cmbmeetdate=4342&file=false (2019-10-30 CDMP) and ...cmbmeetdate=1317&file=false (2003-05-20 second entry) return HTTP 500 (county 'Web Error' page) in a real browser too, also with file=true and without the file parameter; 1316 loads normally. Not online; the gap stands (ask the Clerk of the Board for those two minutes).
- 2026-10-26 needs-browser #1 (built-in browser, dos.elections.myflorida.com/committees): officer search (ComLkupByOfficer.asp, last name containing, Chairperson / Treasurer / Registered Agent) finds no state committee with Gimenez as an officer, and only Transparency In Government PC (74915, chair Bruno Barreiro, active) for Barreiro, whose contributions start after Mar 2018 (see ../doe-browser/README.md), i.e. after his county seat. Committee name searches 'Gimenez', 'Barreiro' and 'Miami-Dade Residents First' return nothing; 'Residents First' returns 71995 (Tampa, chair Todd L. Richardson, closed) and 88766 (Coconut Grove, chair Ed Torgas, active), neither naming Gimenez. A DS-DE 102 statement of solicitation is not searchable by name on the DOE site, and no committee found lists him; so no state committee is added for Gimenez or Barreiro, and Miami-Dade Residents First stays uncounted.
