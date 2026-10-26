# Records that need a browser (prior-cities-south)

Each request: what to open, what to save, and where the result goes. Nothing here has been fetched.

## 1. [DONE Oct 26, 2026, see progress.md] Miami-Dade School Board official minutes (Lucia Baez-Geller, District 3, Nov 17, 2020 - Nov 19, 2024)
- Why: the Board posts only "Excerpts from Unofficial Minutes" (pdfs.dadeschools.net/Bdarch/<yyyy>/Bd<mmddyy>/lastbda.pdf),
  which record each action but no member votes. Every item in schoolboard/actions.json therefore has
  "Vote not given in the minutes". The official (approved) minutes, which record dissents and abstentions, are in ImageSilo.
- Open: https://login.imagesilo.com/PVE.aspx?hRemote=true&txtEntityID=3337&txtUser=public&txtPassword=public&ProjID=2
  (public read-only login is in the URL; JavaScript viewer).
- Search: document type "Board Minutes" (or the minutes project), meeting dates 2020-11-17 through 2024-11-19
  (the meeting list is in schoolboard/actions.json, field date; about 60 regular meetings plus special meetings).
- Save: one PDF per meeting as scripts/data/tenure/prior-cities-south/schoolboard/minutes/<yyyy-mm-dd>.pdf.
- Then: for each action, record any member shown voting no, abstaining (conflict form 8B) or absent; all others yes
  only if the minutes say the item passed unanimously or list the votes.
- Alternative source with the same content: the meeting video (eduvision.tv, "School Board Meetings") - not needed if the
  ImageSilo minutes open.

## 2. [DONE Oct 26, 2026: all 109 eSCRIBE minutes Nov 2013 - Nov 2018; Nov 2010 - Oct 2013 not online] Cutler Bay Town Council minutes and agenda packets (Mary Ann Mixon, Seat 1, Nov 2010 - Nov 2018)
- Why: votes come from the Town Clerk's Resolutions and Ordinances Registers (already used, cutlerbay-mixon/actions.json).
  Movers, seconders, the applicant's representatives (lobbyists named in the record) and any item not titled with the
  vendor's name are only in the minutes and packets, which sit in eSCRIBE behind a Cloudflare browser check.
- Open: https://pub-cutlerbay-fl.escribemeetings.com/ (meeting list API already works:
  POST /MeetingsCalendarView.aspx/GetCalendarMeetings {"calendarStartDate":"2010-11-01","calendarEndDate":"2018-11-30"}).
- Save: each "Minutes (PDF)" (FileStream.ashx?DocumentId=<id>) for Town Council meetings 2010-11-17 .. 2018-11-05 as
  scripts/data/tenure/prior-cities-south/cutlerbay-mixon/minutes/<yyyy-mm-dd>.pdf.

## 3. [DONE Oct 26, 2026 for 2016-2026; 2014-2015 not online] Boca Raton City Council minutes (Scott Singer: council 2014 - Apr 2018, mayor Apr 27, 2018 - present)
- Why: the council's Granicus archive (https://bocaraton.granicus.com/ViewPublisher.php?view_id=2) returns
  "Permission denied" to scripts; the city's AgendaCenter and DocumentCenter list no council minutes. No actions could
  be built for Boca Raton.
- Open the Granicus view above (or the City Clerk page https://www.myboca.us/607/City-Clerk -> Agendas) in a browser.
- Save: the minutes PDF of every regular and special City Council meeting from March 2014 (first meeting after the
  March 11, 2014 election) through the latest posted meeting, as
  scripts/data/tenure/prior-cities-south/bocaraton/minutes/<yyyy-mm-dd>.pdf, plus the consent-agenda resolution lists.
- Also needed: confirm Singer's oath dates (council seat, March 2014; mayor, April 27, 2018 after the Governor suspended
  Mayor Haynie; elected mayor March 2020 and re-elected 2023/2026) from the City Clerk's election certifications.

## 4. [Checked Oct 26, 2026: not online] Boca Raton campaign finance (Scott Singer)
- Why: Boca Raton municipal candidates file with the City Clerk, not the Palm Beach County SOE. Only his political
  committee "Friends of Scott Singer" is on VoterFocus (saved: bocaraton/friends-of-scott-singer_committee_contributions.csv,
  64 contributions, $48,827, May 2022 - Aug 2023).
- Open: the City Clerk's campaign finance page (myboca.us -> City Clerk -> Elections -> Campaign Treasurer's Reports).
- Save: every report for Singer's 2014 and 2017 council campaigns and 2020, 2023 and 2026 mayoral campaigns as CSV or PDF
  in scripts/data/tenure/prior-cities-south/bocaraton/donors/.

## 5. [Checked Oct 26, 2026: not online] Municipal campaign reports not on VoterFocus
- Cutler Bay, Mary Ann Mixon 2010 and 2014 (Seat 1): the town's VoterFocus portal starts in 2018.
  Open the Town Clerk's elections page (https://www.cutlerbay-fl.gov/townclerk) or request copies; save to cutlerbay-mixon/donors/.
- Palmetto Bay, David M. Singer 2016 (Seat 2): no online portal. Village Clerk (palmettobay-fl.gov -> Village Clerk ->
  Elections). Save to palmettobay/donors/.
- Key Biscayne, Luis F. de la Cruz 2014 (council) and 2018 (mayor): the village's EasyVote/VoterFocus pages could not be
  read. Village Clerk elections page (keybiscayne.fl.gov -> Village Clerk -> Elections). Save to keybiscayne-delacruz/donors/.
- Medley, Ivan Pacheco 2016 and 2020: no online portal. Town Clerk. Save to medley-pacheco/donors/.
- Doral, Ana Maria Rodriguez 2010 (the city's VoterFocus portal starts in 2012; her 2014 race is saved as doral/rodriguez_2014.csv).
- Hialeah, Luis Gonzalez 2005, 2009, 2013 (Group V): the city's VoterFocus portal has 2026 only. City Clerk.

## 6. [DONE Oct 26, 2026] Medley minutes of July 6, 2021 (Regular Council Meeting)
- Laserfiche document 167289 (Town Clerk > Minutes > 2021) has no text layer and its PDF export fails for scripts.
- Open https://www.medleydocs.com/WebLink/DocView.aspx?id=167289&dbid=0&repo=LFMedley, save as
  medley-pacheco/minutes/2021-07-06.pdf. Seven agenda items of that date (medley-pacheco/actions.json, "unmatched") need its votes.
