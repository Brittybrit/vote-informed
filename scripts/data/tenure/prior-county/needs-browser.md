# Requests that need a browser (prior-county slice)

## 1. Florida DOE: political committees tied to Gimenez or Barreiro (Cloudflare 403 from shell and WebFetch)
Find committees whose filed Statement of Solicitation (DS-DE 102) or statement of organization names the candidate as
soliciting for, chairing or controlling them.
- Committee search: https://dos.elections.myflorida.com/committees/ (search "Gimenez", "Barreiro"; open each hit's
  ComDetail.asp?account=<n> and its campaign documents for a DS-DE 102 naming Carlos A. Gimenez / Bruno A. Barreiro).
- For each committee confirmed, export contributions the same way as pc71293.tsv (county/progress.md):
  fetch('/cgi-bin/contrib.exe', POST, queryformat=2) from https://dos.elections.myflorida.com/campaign-finance/contributions/
  with the committee name/account.
  Date ranges: Gimenez 2002-11-01 .. 2020-11-17 (D7 commission and mayor); Barreiro 1996-06-01 .. 2018-03-31.
  Output: scripts/data/tenure/prior-county/donors/pc<account>.tsv, plus a line in offices.json "files".
- Miami-Dade Residents First (county-registered PC, VoterFocus ca=1415, chair Rick Cook, 2015-2019, $4.62M): the Florida
  Bulldog (2015-07) calls it Gimenez's PAC, but its county statement of organization lists the supported candidate as
  "To be determined" and his county candidate files (VoterFocus ca=1454) hold no solicitation form. Its export is saved
  (donors/pc-miami-dade-residents-first.csv) but NOT counted. Check DOE for a DS-DE 102 by Gimenez naming it.

## 2. BCC zoning hearings before July 2017 (results PDFs fail from curl and WebFetch)
The Clerk's online minutes have no BCC zoning-hearing meetings before 2017-07-20. RER's archive lists BCC applications by
year with links to results: https://www.miamidade.gov/zoning/Hearing_Reports/<yyyy>/HEAR_MONTHLY_BOARD.pdf (readable via
WebFetch) -> results https://www.miamidade.gov/business/Results/CC/<yy>/BCC<mmddyy>r.pdf and agendas
https://www.miamidade.gov/business/Boards/CZABCC/<yy>/BCC<mmddyy>a.pdf (both return an error page to curl and WebFetch).
Needed for 1998-06-16 .. 2017-07-19: every BCC zoning results PDF (resolution number, decision, and vote if printed).
Save under scripts/data/tenure/prior-county/zoning-results/<file>.pdf. If the results give no roll call, the coordinator
applies "Vote not given in the minutes" to every member seated that day.

## 3. Two minutes pages that return the county's error page
- commminute.asp?cmbmeetdate=4342 (2019-10-30 CDMP meeting, FINAL OFFICIAL in the list)
- commminute.asp?cmbmeetdate=1317 (2003-05-20 second BCC entry; 1316 for the same day was read)
Try in a browser; save the HTML as scripts/data/tenure/prior-county/minutes-<id>.html.

## 4. Campaign reports not online
Barreiro's 1998 special election (June 2, 1998) and 2000 District 5 campaigns: VoterFocus has no reports before the 2002
cycle. Paper reports are held by Miami-Dade Elections (public records request, not a browser task).
