# Browser-only requests (prior-congress slice: Moskowitz's Parkland and Broward offices)

Curl gets a Cloudflare block ("Sorry, you have been blocked") and WebFetch permission was not granted. Run these in one
browser pass and save the outputs where named (folder: scripts/data/tenure/prior-congress/parkland/ unless noted).

## 1. [DONE Oct 26, 2026: text saved, dates set; actions not built] Parkland City Commission minutes, March 2006 - Nov 2012 (Moskowitz's seat)
- Portal: https://documents.cityofparkland.org/WebLink/Browse.aspx?id=4 (the city's Laserfiche archive; linked from
  https://www.cityofparkland.org/cc "Agendas & Minutes").
- Open the City Commission > Minutes folders for 2006, 2007, 2008, 2009, 2010, 2011, 2012 (regular, special and workshop
  meetings). Download every minutes PDF dated 2006-03-01 through 2012-12-31.
- Save to parkland/minutes/YYYY-MM-DD_<meeting type>.pdf and list them in parkland/minutes-index.tsv
  (date, meeting type, WebLink document id, URL).
- Also download the adopted Resolutions and Ordinances folders for 2006-2012 if present (signed vote blocks), to
  parkland/resolutions/ and parkland/ordinances/.
- Needed from the same archive: the oath / certification record for Moskowitz's first seating (March 2006 election),
  his November 2010 re-election, and his resignation letter or the minutes accepting it (2012, resign-to-run for
  Florida House District 97; Florida House record starts his House term 2012-11-07). These give the exact
  start and end dates for offices.json.

## 2. [Checked Oct 26, 2026: not online] Parkland candidate campaign treasurer's reports, Moskowitz, 2005-2006 and 2009-2010 campaigns
- Municipal candidates filed with the Parkland City Clerk (Parkland's VoterFocus portal,
  https://www.voterfocus.com/CampaignFinance/candidate_pr.php?c=munparkland, has only the 2026 election).
- Look in the same WebLink archive for "Campaign Treasurer Reports" / "Elections" folders for the March 2006 and
  November 2010 Parkland elections; download every report filed by Jared Moskowitz (and any report filed after the
  election, e.g. termination reports), 2005-01-01 through 2012-12-31.
- Save to parkland/donors/moskowitz_2006_<report>.pdf and moskowitz_2010_<report>.pdf. If the archive does not have
  them, the request is a public records request to the Parkland City Clerk (cityclerk@cityofparkland.org,
  954-753-5040): "all campaign treasurer's reports filed by Jared Moskowitz for the 2006 and 2010 municipal elections".

## 3. [Checked Oct 26, 2026, see progress.md] Broward County Commission meetings not in Legistar (Jan 12 - Nov 29, 2022)
- Legistar (webapi.legistar.com/v1/broward, works via curl) has only the regular meetings. Needed: minutes of any
  special meetings, the September 2022 budget public hearings, and any Jan 2022 meeting before Jan 25.
- Portal: https://www.broward.org/Commission/ (agendas and minutes pages; curl returns 403). Save PDFs to
  broward/extra-minutes/YYYY-MM-DD_<meeting>.pdf.
- Also: the official oath / appointment record for Moskowitz (Governor's appointment Nov 23, 2021; sworn in
  Jan 12, 2022 per Parkland Talk) and the date his successor (Robert McKinzie, District 8) was sworn in (Nov 2022),
  for an official start/end date. Florida Department of State appointment records or the Nov 2022 organization
  meeting minutes on broward.org.

## 4. Broward plat and easement owners (optional, for the 107 unnamed actions in broward/unnamed.json)
- Each plat item's Legistar matter (url in unnamed.json) has backup PDFs naming the applicant/owner. The Broward County
  Property Appraiser (bcpa.net) gives the owner of record as of the vote date. Not attempted; listed for completeness.
