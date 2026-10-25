# s4-cities-b summary (North Miami, North Miami Beach, Opa-locka, Miami Gardens, El Portal, Biscayne Park)

Run 2026-10-24/25. All 41 candidates are marked done in progress.md.

## Counts
- interests.jsonl: 93 lines. 15 are `business:null` (no filing found, with what was searched). By basis: form 40, Sunbiz name+address 20, Sunbiz name only 33.
- ties.jsonl: 3 lines, all verified against records I opened.
  - **Mary Estimé-Irvin / North Miami Foundation for Senior Citizens' Services, Inc.** She is a director on Sunbiz 731483, and the officer address matches her consulting firm's address on her Form 1.
    - Grant: City grant renewal (IWO 25-575, signed 2025-11-10 to 11-12), up to $57,750.00 for FY 2024-25 and $115,000.00 for FY 2025-26, funded under Ord. 1536. The City Manager signed it; it was not a council vote.
    - Vote: Ord. 1536, the FY 2025-26 budget, passed 3-2 on 2025-09-25. She seconded it. Her yes is inferred from the tally (only the no votes are named), and the minutes record no conflict declaration.
  - **Kassandra Timothé, abstention:** she recused on 2025-R-63 (11950 N Bayshore Dr site plan, 2025-02-25). The minutes give no reason, and no Form 8B was found.
- No other contract, payment, grant, lease, zoning item or vote names any disclosed or Sunbiz entity. Checked against all actions in the five city action lists (North Miami 148, NMB 174, Opa-locka 134, El Portal 41, Biscayne Park 67), public/data/decisions.json, scripts/data/procurement and payments (county, school board), North Miami's Contracts-Agreements page, NMCRA reports, and two school board pest-control ITBs (for Samaria's pest firm).

## Leads (not ties)
- **Randolph Aikens (Opa-locka challenger):** his active security LLC's principal address, 13449 NW 42nd Ave, is the site of Opa-locka items 2025-12-10 15-3 (liquor store special exception, 4-0) and 2026-01-14 15-1 (truck parking, withdrawn). The property owner is RND Headquarters LLC, and no applicant is named.
- **Greater North Miami Chamber of Commerce (Timothé, director, name only):** city MOU for up to $37,500 from the FY 2023-24 budget. It is outside the 2025+ window.
- **Foundation for Senior Citizens:** further North Miami agreements are listed but were not opened (2025-26 Subrecipient Agreement dated 12-29-2025, a second Twelfth Renewal dated 12-18-2025, Smart Biz grant 2024-11-12). The page shows no URLs for them.

## Could not reach or check
- Shell access to disclosure.floridaethics.gov, search.sunbiz.org, api.usaspending.gov and facts.fldfs.com is blocked by the egress proxy (403). Everything went through WebFetch.
- **USAspending:** the API failed with client_error. **FACTS and state vendor payments:** form/postback only, so they can't be queried. No federal or state award searches were completed for any interest.
- **County Online Checkbook:** Power BI with no API, so not queried.
- **Miami Gardens:** no actions.json in the repo, and the CivicWeb portal is robots-blocked. Cherry-Prime and Mack votes and contracts were not checked.
- **Challenger Form 1s:** 22 challengers have no EFDMS record. City clerk pages (El Portal, Opa-locka, Miami Gardens, Biscayne Park, North Miami) and Miami-Dade Elections post no qualifying Form 1s. El Portal posts only campaign reports.
- **Missing or unreadable filings:**
  - Anders Urbom's 2025 Form 1 shows "Not Filed" on EFDMS, so his 2024 form was used.
  - Rose Tydus's last Form 1 (2021, filed with the SOE) returns "not authorized".
  - Form 8B memoranda are not online for any of these cities.
- **Sunbiz:** detail pages only load in the http form `inquirytype=DocumentNumber&...&aggregateId=` (other URLs returned a cached unrelated entity). The URLs in interests.jsonl use that form. Very common names were not recorded as name-only hits; those cases are noted in progress.md.

## Housekeeping
Another slice (s3-county-cities-a) wrote 19 interest lines and 5 progress lines into this folder. They were moved, unchanged, to misfiled-from-s3.interests.jsonl and misfiled-from-s3.progress.md for the coordinator to return to s3.
