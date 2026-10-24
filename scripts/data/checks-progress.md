# Checks progress (pronouns / El Portal spotcheck / Medley votes)

Started 2026-10-24. Shell cannot reach city sites; all fetches via WebFetch.

## A. Pronouns
- DONE: pronouns-check.json written (14 people). No mismatches. 6 unknown: Bonich, Calle, Ervin, Sardiñas, Vazquez (no pronoun on any official page found), plus southmiamifl.gov and cutlerbay node pages are robots-blocked to WebFetch. The cutlerbay-fl.gov/town-council/page/... URL works without www.
- To resolve the unknowns: Opa-locka bio PDFs (DocumentCenter View/5085, 5087 failed), South Miami bio pages (blocked).

## Status: all three files written. Medley votes.json has 0 votes (notFound = all 83).

## B. El Portal
- DONE: spotcheck.json written (31 fields, 17 actions, 8 meetings; 22/31 match). The village-meetings page fetch was blocked, but the direct PDFs at elportalvillage.com/wp-content/uploads/2025/01/CouncilMeeting-Minutes-YYYYMMDD.pdf work (special 09-17 is under 2025/09). WebFetch truncates long transcripts, so offset often returns the same section; votes late in 03-25, 04-22 (G4-G10), and 05-27 (G2/G3) are unreadable this way.
- Generator script is in the scratchpad (not in the repo).

## C. Medley
- townofmedley.com council-meetings: agendas only (2 pages each, no minutes attached; minutes item lists prior meeting but not text). Checked 2025-03-03, 05-05, 06-02, 07-07, 09-02, 10-06, 11-03, 2026-03-02, 05-04, 06-01, 07-06 agendas.
- medleydocs.com WebLink (any URL incl. DocView id=208748, ElectronicFile, Browse): cookie error page via WebFetch; Chrome tab shows error page (cannot read).
- Town clerk page: no minutes/video links; points to Laserfiche + clerk phone. town-notices: notices only.
- municodemeetings: permission not granted (blocked). Web search finds no minutes copies.
- Result: 0 new votes. Medley council: Mayor Stefano, VM Jinete, Ayala, Lizelh Rodriguez, Lourdes Rodriguez (town-council page).
