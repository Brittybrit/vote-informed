import json
BASE='/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/pc/'
OUT='/home/claude/vote-informed/scripts/data/tenure/prior-county/'
s=json.load(open(BASE+'stats.json'))
b=s['barreiro']; gc=s['gimenezCommissioner']; gm=s['gimenezMayor']; g=s['gifts']; d=s['donorRows']
def yrs(k): return ', '.join(f'{y}: {n}' for y,n in s['byYear'][k].items())
md=f"""# Prior county offices: Barreiro (D5) and Gimenez (D7, Mayor)

Slice folder: scripts/data/tenure/prior-county/. Built 2026-10-25 from the Clerk of the Board's online minutes, the
Legistar matter pages, the Clerk's historical lobbyist registrations and Miami-Dade VoterFocus campaign reports. Nothing
here is merged into public/data; the coordinator decides how it counts.

## Files
- actions.json: {s['allActions']:,} final BCC actions 1998-06-16..2020-11-16 whose title names a private party (same envelope as
  scripts/data/county/actions.json: window, sources, meetings, actions, gaps). Each action has the full roll keyed by the
  Clerk's surname for every member seated that day (members not on the Board that day have no key), plus seated.Barreiro / seated.Gimenez,
  lobbied (Clerk registrations), matter (requester, sponsors, memo From line, RECOMMENDATION text, veto lines),
  veto (Clerk file type "Mayoral Veto", override roll calls) and, in Gimenez's mayoral window, a mayor block of raw facts.
- unnamed.json: {s['unnamed']:,} final actions in the window left out (no named private party, or excluded by rule), with the reason.
- vetoes.json: {s['vetoItems']} veto override / veto sustained votes in the minutes, with rolls.
- body.json: every member seated in the window (key, name, first and last meeting seen).
- donors/: VoterFocus exports (same format as county/donors/*-campaign-*.csv), one file per campaign.
- gifts-preview.json: preliminary name matches (party or registered lobbyist = contributor), for the coordinator to check.
- offices.json, progress.md, needs-browser.md.

## Bruno A. Barreiro, County Commission District 5
- Term: elected 1998-06-02 special election; first meeting 1998-06-16; last meeting 2018-03-21; seat vacant 2018-04-04
  (careers.jsonl end 2018-03-31). Nov 2016..Mar 2018 done first, then back to 1998 (all in one pass).
- Covered: {b['first']}..{b['last']} (BCC meetings; site-specific zoning hearings only from 2017-07-20).
- Actions while seated: {b['actions']:,}. His recorded vote: yes {b['yes']:,}, no {b['no']}, absent/excused/recused {b['absentEtc']:,},
  vote not given {b['unknown']}. Actions with a registered lobbyist for a party: {b['lobbied']:,}.
- By year: {yrs('barreiro')}.
- Donors: county campaigns 2004, 2008, 2012, 2016 cycles ({d['barreiro'][0]:,} contributions, ${d['barreiro'][1]:,.2f}).
  Preliminary matches on actions he voted on: {g['barreiro'][1]} distinct contributions (${g['barreiro'][2]:,.2f}) tied to {g['barreiro'][0]} actions (gifts-preview.json).
- Gaps: no campaign reports online for the 1998 special and 2000 races; no political committee tied to him by an official
  record found (DOE check in needs-browser.md); zoning hearings 1998-06..2017-07 not online; lobbyist registrations before
  mid-2003 only where the Clerk's per-principal history has them.

## Carlos A. Gimenez, Mayor of Miami-Dade County
- Term: won 2011-06-28 runoff (certificate accepted 2011-07-19); first BCC meeting as mayor 2011-07-07; term ended 2020-11-17
  (last meeting 2020-11-16). Nov 2016..Nov 2020 first, then 2011-2016 (one pass).
- Actions in window: {gm['actions']:,}. Raw facts recorded, not converted into votes:
  a cover memo on the matter page for {gm['withMatterText']:,} (the rest are commissioner-sponsored items or have no text online); memo from Gimenez on {gm['memoFromGimenez']:,}; title authorizes the Mayor to
  execute on {gm['titleAuthorizesMayorToExecute']:,}; title ratifies an action the Mayor already took on {gm['titleRatifiesMayorAction']:,};
  Clerk file type "Mayoral Veto" on {gm['vetoed']}. Lobbied: {gm['lobbied']:,}.
- By year: {yrs('gimenezMayor')}.
- Donors: mayoral campaigns 2011 special, 2012, 2016 ({d['gimenezMayor'][0]:,} contributions, ${d['gimenezMayor'][1]:,.2f}).
  Preliminary matches: {g['gimenezMayor'][1]} distinct contributions (${g['gimenezMayor'][2]:,.2f}) tied to {g['gimenezMayor'][0]} actions in his mayoral window.
- Gaps: "Recommended by" is taken from the matter page's cover memo (From line and RECOMMENDATION section); the separate
  agenda cover sheet was not read. Contracts he actually signed are not in these records (only the Board's authorization).
  The Clerk's veto record is read from the minutes (file type and override votes); veto messages themselves are PDFs not
  read here. Miami-Dade Residents First (county PC) is saved but not counted: no official record ties it to him.

## Carlos A. Gimenez, County Commission District 7
- Term: elected 2004-11-02; first meeting 2004-11-17; last meeting 2011-04-11; seat vacant 2011-04-13.
- Actions while seated: {gc['actions']:,}. His recorded vote: yes {gc['yes']:,}, no {gc['no']}, absent/excused/recused {gc['absentEtc']:,},
  vote not given {gc['unknown']}. Lobbied: {gc['lobbied']:,}.
- By year: {yrs('gimenezCommissioner')}.
- Donors: county campaigns 2004 and 2008 ({d['gimenezCommissioner'][0]:,} contributions, ${d['gimenezCommissioner'][1]:,.2f}).
  Preliminary matches on actions he voted on: {g['gimenezCommissioner'][1]} distinct contributions (${g['gimenezCommissioner'][2]:,.2f}) tied to {g['gimenezCommissioner'][0]} actions.
- Gaps: zoning hearings not online for his whole commission term; no committee tied to him by an official record found.

## Gaps that apply to all three
- Two minutes pages return the county error page (2003-05-20 second entry, 2019-10-30 CDMP).
- Parties come from titles only (English); about 40 extracted names are title fragments. Bid award packages in early years
  name no vendor in the title. Totals are "at least" for these reasons.
- Lobbyist firms are not in the Clerk's archive; firm and affiliate gifts are not matched here.
"""
open(OUT+'summary.md','w').write(md); print(md)
