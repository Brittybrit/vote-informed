# Tenure slice cities-c: progress (append a line after each meeting / report finished)
Slice: Hialeah (Gonzalez), Cutler Bay (Duncan, Lord, Ramirez), Pinecrest (Fairman), Key Biscayne (Vazquez, Sardinas),
Sunny Isles (Svechin), Medley (Ayala, L. Rodriguez), El Portal, Biscayne Park, Virginia Gardens.
Endpoints: VoterFocus candidate_pr.php and export.php work via shell curl (WebFetch is robots-blocked there).
Hialeah AgendaCenter minutes work via WebFetch.

## Hialeah
- 2026-10-25 Gonzalez tenure start: appointed Acting Council Member, Group II, Res. 2026-023, item 9A, Jan 27, 2026
  (minutes _01272026-1314; listed present at roll call, no recorded vote on his own appointment; first vote item 10A).
  Earlier service 2005-2017 (per city bio / news) is a separate, non-continuous tenure. Existing actions.json already
  starts 2025-01-14, so his whole tenure (2026-01-27 to 2026-10-13) is covered. No actions added.
- 2026-10-25 Gonzalez donors: VoterFocus lists only G2 ($45,840) and G3 ($26,000) for this campaign; both already in
  gonzalez_g2.csv / gonzalez_g3.csv and the sums match. No earlier campaign for this seat (appointed). Nothing added.
- HIALEAH DONE.

## Cutler Bay
- Tenure starts: Duncan Seat 1, elected Nov 2018 (town bio cutlerbay-fl.gov/node/1691; reelected unopposed 2022, sworn Nov 28, 2022).
  Lord Seat 2, won Dec 1, 2020 runoff (2020-12-01 runoff sample ballot); reelected 2024. Ramirez Seat 3, unopposed 2022,
  sworn Nov 28, 2022 (inaugural flyer cutlerbay-fl.gov/node/10135). Coriat held Seat 3 before Ramirez.
- eSCRIBE calendar API (POST MeetingsCalendarView.aspx/GetCalendarMeetings) and Meeting.aspx?...&Agenda=PostMinutes HTML work via
  shell curl. FileStream.ashx PDFs (all 2018-2020 minutes) return a browser check: NOT readable. WebFetch fails too.
- 2026-10-25 read all 54 HTML minutes 2021-01-20 .. 2024-12-04 (council, special, budget, LPA meetings with minutes; workshops
  skipped, they take no votes). Added 178 actions (2021: 30, 2022: 49, 2023: 47, 2024: 52) to _small/src/cutlerbay_rows.tsv,
  54 meetings to cutlerbay_meetings.tsv, titles-en/translations, Coriat column; rebuilt actions.json (274 actions).
- Votes: 166 of 178 with member-by-member votes from the eSCRIBE vote table; 12 with mover/seconder and "Passed" only
  (2023-01-18 11.b, 2023-03-22 x6, 2023-06-21 x2, plus consent items those days).
- Missing: Nov 2018 - Dec 2020 minutes (31 council meetings listed in cfg gaps). Duncan's first two years and Lord's first
  meeting month are not covered.
- Donors: added duncan_2018.csv, duncan_2022.csv, lord_2020.csv, lord_2024.csv, ramirez_2022.csv (VoterFocus export-all).
- Owners: plat/site items name the applicant in the resolution; PA lookups for 20701 Allapattah Rd (BH Electra Southland Part 2
  LLC), 20505 S Dixie Hwy (BH South Dixie SL Mall LLC), 19525 S Dixie Hwy (Trikon Cutler Bay LLC) found, not yet written to
  owners.json (see below).
- Lobbyists: minutes 2021-2024 name only the town's own lobbyists (Converge, Anfield, Thorn Run). Town registry online is the
  2025 list only (no dates), so no registration in force can be shown for 2021-2024 votes. None added.
- 2026-10-25 owners.json written (18 actions: Catalyst/Trikon, Chabad/Golowinski, Baptist/Publix, Southplace West/East-mall owners). Not found listed in its notFound. CUTLER BAY DONE (except 2018-2020 offline).

## Pinecrest
- Fairman tenure start: elected unopposed Nov 8, 2022, sworn in that day (Dec 13, 2022 minutes). First meeting Dec 2, 2022.
- Legistar API (webapi.legistar.com/v1/pinecrest/events, eventitems?Attachments=1) and legistar1.granicus.com minutes PDFs
  work via shell curl. Read every minutes PDF Dec 2, 2022 .. Dec 10, 2024 (23 meetings with actions, plus workshops/specials).
- Added 111 actions (2022: 4, 2023: 58, 2024: 49) to _small/src/pinecrest_rows.tsv, 23 meetings, titles/translations,
  Abbott and Hochkammer columns (former members), cfg window 2022-11-08. All 111 have member votes from the minutes.
- Donors: fairman_2022.csv (3 gifts, $1,300) from the 2022 treasurer reports PDF; fairman_2026.csv carries the 2026
  hand-typed rows over. 2020 cycle: Fairman did not run before 2022, nothing earlier.
- Not added: owners/lobbyists for 2022-2024 (hearing items name owner and applicant in the minutes; parties include both).
- PINECREST DONE.

## Key Biscayne
- Vazquez and Sardinas: elected Nov 8, 2022, installed Nov 17, 2022 (Granicus "Installation Ceremony" Nov 17, 2022).
- Granicus ViewPublisher, MinutesViewer and CloudFront PDFs work via shell curl. Read all 30 minutes Nov 29, 2022 .. Dec 17, 2024
  (2022 ones are scans; OCR with tesseract). Agenda-only (no minutes posted): 2023-01-17, 2023-02-15 regular, 2023-03-14,
  2023-09-12, 2023-09-26 x2, 2024-06-25, 2024-09-10, 2024-09-24, 2024-10-22, 2024-10-23.
- Added 99 actions (80 with member votes from minutes, 19 agenda-only) to _small/src/kb_rows.py, 25 meetings, McCormick and
  Moss columns; rebuilt actions.json (191). Owners from Property Appraiser written into parties for variance items.
- Donors: EasyVote (villageofkeybiscaynefl.easyvotecampaignfinance.com) answers only its own origin (see DONORS.md); the 2022
  campaign reports could not be pulled. Gap: no 2022 donor data for Vazquez or Sardinas.
- KEY BISCAYNE DONE (actions); donors 2022 NOT available.

## Sunny Isles Beach
- Svechin: elected commissioner Nov 8, 2016; mayor Sep 1-Nov 3, 2021 (acting) and elected mayor Dec 6, 2022 runoff
  (sibfl.gov Mayor page). Continuous service on the commission since Nov 2016, so tenure starts Nov 2016.
- Granicus ViewPublisher view_id=2 lists 2009-2026 meetings, but 2016-2024 rows carry agenda + video only, no minutes.
  Summary minutes are not attached to later agendas either (the clerk memo has no link). The city's records archive is
  Laserfiche WebLink at http://docucenter.sibfl.net/WebLink/ : host does not resolve from this sandbox and the WebFetch
  permission request timed out. RESULT: no 2016-11 .. 2024-12 roll calls available. Months missing: all of Nov 2016 - Dec 2024.
- Donors: EasyVote API answers only its own origin (403 to curl); 2016, 2018, 2020 and 2022 Svechin reports not pulled.
- 2026-10-25: SUNNY ISLES NOT EXTENDED (pending agenda-only pass if time allows).
