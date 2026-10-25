# Summary: prior offices (Jolly, Graham, Moskowitz local)

Built Oct 25, 2026. Nothing committed; nothing outside scripts/data/tenure/prior-congress/ edited.

## David Jolly — U.S. House, FL-13 (pid david-jolly, key `Jolly`)
- Term: 2014-03-11 to 2017-01-03 (history.house.gov; first recorded vote roll 126, 2014-03-13).
- Range covered: every public law enacted 2014-03-11 to 2017-01-03 (538 laws); House rolls 2013-2016.
- Qualifying laws (CRS summary names a kind of business that benefits): 59. His House vote: yes 22, no 2
  (113-291 NDAA FY2015 concurrence, 114-10 MACRA), not voting 3 (114-255 Cures, 114-315, 114-323), House vote before
  he was seated 3 (113-90, 113-109, 113-167), passed without a recorded vote (voice, UC or rule) 29.
- Roll calls: 29 floor-vote cards (floor-votes.json); 24 with a yes or no from him.
- Earmark requests: none possible (House moratorium 2011-2021; requests-note.json).
- Gifts (one cycle before the term, from 2011-01-01, to 2017-01-03): committee gifts to Friends of David Jolly
  $1,417,882 (747 gifts, 368 contributors in pac-agg.json); Seagrass PAC (leadership) $70,000 from committees;
  itemized individuals $2,229,305 to the campaign (2,298 rows), $25,500 to Seagrass PAC, $166,250 to JFCs.
- Gaps: none in the official records used. The campaign committee also carried his 2015-2016 U.S. Senate run; those
  receipts are kept (inside his House term). Two JFCs are shared with other members (marked JFC-multi).

## Gwen Graham — U.S. House, FL-2 (pid gwen-graham, key `Graham`)
- Term: 2015-01-03 to 2017-01-03.
- Range covered: the 328 public laws of the 114th Congress (all enacted in her term); House rolls 2015-2016.
- Qualifying laws: 35. Her House vote: yes 20, no 1 (114-125 Trade Facilitation conference report), not voting 0,
  passed without a recorded vote 14.
- Roll calls: 21 cards with her yes or no.
- Earmark requests: none possible (moratorium).
- Gifts (from 2013-01-01 to 2017-01-03): committee gifts to Graham for Congress $1,385,573 (842 gifts, 376
  contributors); itemized individuals $3,718,795 (5,852 rows); Murphy Graham Victory for Florida JFC $16,460 itemized.
  No leadership PAC found.
- Gaps: none in the records used.

## Method notes for both (details in README.md)
- The 108th-116th universe in scripts/data/tenure/congress was rule-screened; this window was read in full, adding 39
  laws to its 20. Diaz-Balart voted on the same laws, so his 2014-2016 universe should get the same 39 (coordinator call).
- Found and fixed a vote-pick error that also affects the congress slice: P.L. 114-255 (21st Century Cures) had a House
  roll call (592, 2016-11-30), not a voice vote.

## Jared Moskowitz — Broward County Commission, District 8 (appointed)
- Term: 2022-01-12 (sworn in; Parkland Talk) to 2022-11-29 (elected board seated). Official oath record not read
  (needs-browser.md).
- Range covered: all 17 regular meetings with business, Jan 25 - Nov 15, 2022 (Legistar minutes; Nov 29 seated the new
  board).
- Actions found: 321 qualifying actions naming the private party (contracts 168, easements 42, licenses/franchises 31,
  grants/financing 27, leases 23, settlements 14, other agreements incl. union contracts and conduit bonds 10, sales 6).
  107 more benefit a party the motion text does not name (plats, land use amendments, etc.) and are left out
  (broward/unnamed.json).
- Roll calls: 321, every one from the clerk's VOTE line, tallies checked. Moskowitz: yes 248, absent 72, recused 1
  (abstained on the Jun 14, 2022 Lennar Homes, LLC easement), no 0.
- Gifts: none. He was appointed and never filed for a county race, so there are no county donors and no share line.
  (Lead outside the standard: GrayRobinson P.A. PAC gave $2,000 to his 2022 congressional campaign; he voted yes on
  Jun 14, 2022 to name GrayRobinson, P.A. as county bond counsel.)
- Gaps: special meetings, the September 2022 budget hearings and workshops are not in Legistar (broward.org returns
  403 to curl; needs-browser.md). Owners of record for the 107 unnamed actions not looked up.

## Jared Moskowitz — Parkland City Commission (2006-2012)
- Term: year only, 2006 to 2012 (elected March 2006, Vice Mayor 2006-2008, re-elected Nov 2010, resigned 2012 to run for
  the Florida House).
- Range covered: none. Actions found: 0. Roll calls: 0. Gifts: 0.
- Gap: the whole tenure. Parkland's minutes archive (documents.cityofparkland.org Laserfiche WebLink) blocks curl with
  Cloudflare and WebFetch was not approved; Parkland's VoterFocus page has only 2026; 2006 and 2010 campaign reports
  were filed with the City Clerk. Exact requests are in needs-browser.md.
