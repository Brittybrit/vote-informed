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
