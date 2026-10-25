# Prior county offices: Barreiro (D5) and Gimenez (D7, Mayor)

Slice folder: scripts/data/tenure/prior-county/. Built 2026-10-25 from the Clerk of the Board's online minutes, the
Legistar matter pages, the Clerk's historical lobbyist registrations and Miami-Dade VoterFocus campaign reports. Nothing
here is merged into public/data; the coordinator decides how it counts.

## Files
- actions.json: 7,752 final BCC actions 1998-06-16..2020-11-16 whose title names a private party (same envelope as
  scripts/data/county/actions.json: window, sources, meetings, actions, gaps). Each action has the full roll keyed by the
  Clerk's surname for every member seated that day (members not on the Board that day have no key), plus seated.Barreiro / seated.Gimenez,
  lobbied (Clerk registrations), matter (requester, sponsors, memo From line, RECOMMENDATION text, veto lines),
  veto (Clerk file type "Mayoral Veto", override roll calls) and, in Gimenez's mayoral window, a mayor block of raw facts.
- unnamed.json: 25,940 final actions in the window left out (no named private party, or excluded by rule), with the reason.
- vetoes.json: 28 veto override / veto sustained votes in the minutes, with rolls.
- body.json: every member seated in the window (key, name, first and last meeting seen).
- donors/: VoterFocus exports (same format as county/donors/*-campaign-*.csv), one file per campaign.
- gifts-preview.json: preliminary name matches (party or registered lobbyist = contributor), for the coordinator to check.
- offices.json, progress.md, needs-browser.md.

## Bruno A. Barreiro, County Commission District 5
- Term: elected 1998-06-02 special election; first meeting 1998-06-16; last meeting 2018-03-21; seat vacant 2018-04-04
  (careers.jsonl end 2018-03-31). Nov 2016..Mar 2018 done first, then back to 1998 (all in one pass).
- Covered: 1998-06-16..2018-03-20 (BCC meetings; site-specific zoning hearings only from 2017-07-20).
- Actions while seated: 6,763. His recorded vote: yes 5,048, no 82, absent/excused/recused 1,628,
  vote not given 5. Actions with a registered lobbyist for a party: 928.
- By year: 1998: 263, 1999: 414, 2000: 376, 2001: 425, 2002: 368, 2003: 361, 2004: 380, 2005: 348, 2006: 430, 2007: 373, 2008: 372, 2009: 324, 2010: 297, 2011: 297, 2012: 290, 2013: 242, 2014: 266, 2015: 272, 2016: 301, 2017: 295, 2018: 69.
- Donors: county campaigns 2004, 2008, 2012, 2016 cycles (2,265 contributions, $920,047.78).
  Preliminary matches on actions he voted on: 107 distinct contributions ($44,731.14) tied to 256 actions (gifts-preview.json).
- Gaps: no campaign reports online for the 1998 special and 2000 races; no political committee tied to him by an official
  record found (DOE check in needs-browser.md); zoning hearings 1998-06..2017-07 not online; lobbyist registrations before
  mid-2003 only where the Clerk's per-principal history has them.

## Carlos A. Gimenez, Mayor of Miami-Dade County
- Term: won 2011-06-28 runoff (certificate accepted 2011-07-19); first BCC meeting as mayor 2011-07-07; term ended 2020-11-17
  (last meeting 2020-11-16). Nov 2016..Nov 2020 first, then 2011-2016 (one pass).
- Actions in window: 2,883. Raw facts recorded, not converted into votes:
  a cover memo on the matter page for 2,183 (the rest are commissioner-sponsored items or have no text online); memo from Gimenez on 2,040; title authorizes the Mayor to
  execute on 1,503; title ratifies an action the Mayor already took on 64;
  Clerk file type "Mayoral Veto" on 17. Lobbied: 431.
- By year: 2011: 159, 2012: 290, 2013: 242, 2014: 266, 2015: 272, 2016: 301, 2017: 295, 2018: 331, 2019: 342, 2020: 385.
- Donors: mayoral campaigns 2011 special, 2012, 2016 (9,450 contributions, $4,808,448.11).
  Preliminary matches: 309 distinct contributions ($172,552.96) tied to 423 actions in his mayoral window.
- Gaps: "Recommended by" is taken from the matter page's cover memo (From line and RECOMMENDATION section); the separate
  agenda cover sheet was not read. Contracts he actually signed are not in these records (only the Board's authorization).
  The Clerk's veto record is read from the minutes (file type and override votes); veto messages themselves are PDFs not
  read here. Miami-Dade Residents First (county PC) is saved but not counted: no official record ties it to him.

## Carlos A. Gimenez, County Commission District 7
- Term: elected 2004-11-02; first meeting 2004-11-17; last meeting 2011-04-11; seat vacant 2011-04-13.
- Actions while seated: 2,255. His recorded vote: yes 2,060, no 40, absent/excused/recused 154,
  vote not given 1. Lobbied: 305.
- By year: 2004: 47, 2005: 348, 2006: 430, 2007: 373, 2008: 372, 2009: 324, 2010: 297, 2011: 64.
- Donors: county campaigns 2004 and 2008 (3,320 contributions, $905,164.03).
  Preliminary matches on actions he voted on: 100 distinct contributions ($87,817.64) tied to 206 actions.
- Gaps: zoning hearings not online for his whole commission term; no committee tied to him by an official record found.

## Gaps that apply to all three
- Two minutes pages return the county error page (2003-05-20 second entry, 2019-10-30 CDMP).
- Parties come from titles only (English); about 40 extracted names are title fragments. Bid award packages in early years
  name no vendor in the title. Totals are "at least" for these reasons.
- Lobbyist firms are not in the Clerk's archive; firm and affiliate gifts are not matched here.
