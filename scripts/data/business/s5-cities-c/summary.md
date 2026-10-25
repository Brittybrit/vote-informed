# s5-cities-c summary (Cutler Bay, Palmetto Bay, Pinecrest, South Miami)

Checked 2026-10-24/25. All 26 candidates are done. There are 58 interest lines (6 are `business:null` no-filing lines) and 40 tie lines (35 verified, 5 verified:false).

## Sources and method
- **Interests.** The repo's Form 1 reads (`scripts/data/disclosures/city-{cutlerbay,pinecrest,southmiami}.json`) cover the 7 incumbents. For the 19 challengers, I searched EFDMS by name and found no 2025/2026 Form 1 for any of them. None of the cities posts qualifying Form 1s online. Sunbiz officer searches were matched to the candidate's own address on their 2026 campaign treasurer filings: Voterfocus for Cutler Bay, the EasyVote API for Palmetto Bay, and the Village page for Pinecrest. Addresses are used only as the match key and are not recorded.
- **Votes.**
  - Every action in `actions.json` for Cutler Bay, Pinecrest and South Miami, plus `public/data/decisions.json`, was checked by entity name.
  - The full text of every minutes document listed there (44, 22 and 45 docs) was searched for entity names and for recusal, abstention and conflict.
  - Pinecrest and Cutler Bay Legistar Web API matter titles were searched back to 2013.
  - Palmetto Bay has no `actions.json`. I read all 61 Granicus agenda packets from Jan 2025 to Oct 2026; none of its candidates sits on the current council.
- **Money.**
  - Miami-Dade County purchase orders: open-data feature services ADPICS 2008-2021 and INFORMS 2021-2026.
  - Florida FACTS: contracts, grants and purchase orders, by vendor name.
  - USAspending: all award types.
  - City packets and minutes.

## Key ties
- **Ken Fairman (Pinecrest).** Sunbiz lists him as a Director of Friends of Pinecrest Gardens, Inc. He voted yes on four Council resolutions on that nonprofit's board and bylaws (2022-12-13, 2023-04-11, 2024-12-10 and 2026-01-20, the last appointing the Vice Mayor's seat while he was Vice Mayor). The minutes record no recusal from him; in 2022 two other members did recuse. His paving company, Florida Pavement Services, received PPP loans of $94,707 and $145,147. Treemendous Miami received County purchase orders of $10,000 (2008) and $55,000 (2009).
- **BJ Duncan (Cutler Bay).** His employer Zoetic Stage received five Florida Department of State grants ($113,548 in total, all paid), SBA Shuttered Venue grants of $166,348.35 and $83,174.18, and PPP of $37,917. He voted yes on 2026-07-15 to endorse an FIU-prepared study; FIU is his employer.
- **Javier Fernández (South Miami).** He is listed as grantor's counsel (SMGQ Law, his Form 1 suite) on a Key Biscayne easement accepted 2026-06-30. Coral Gables Res. 2025-93 (Ponce Park Residences) lists "Lobbyist: Javier Fernandez" (verified:false on identity). He recused on South Miami's Urban Development Boundary resolution on 2026-03-17; no reason was given and no Form 8B was found.
- **Steve Calle (South Miami).** His employer Floridian First Realty received SBA EIDL/PPP awards ($6,000 grant; loans of $39,162, $94,900 and $24,400.30). No South Miami action names any of his development LLCs, and he made no recusals.
- **Challengers' businesses with federal COVID-era awards.**
  - One-Up Solar (De Melo Gomes): $10,000 grant and $140,000 loan.
  - Barrich LLC (Hawkins): $1,000 and $20,700.
  - Legacy III Insurance (Mourino): $54,293 and $150,000.
  - Brand Poets (Llinas): $4,000, $46,000, $150,000 and $46,000.
  - Raphael A. Sanchez law office (Sanchez): $47,311.93 and $150,000, verified:false because the identity match is name-only.
- **Palmetto Bay fee waivers.** The Palmetto Bay Business Association, where Mourino is Treasurer, received $9,047.50 in facility fee waivers from Feb 2023 to May 2026.

No County purchase-order, FACTS or city award was found for any other listed entity.

## Not reached / limits
- **Form 1s.** No Form 1 was found for the 19 challengers. Pinecrest posts treasurer forms but not Form 1; the Cutler Bay and Palmetto Bay clerks hold qualifying papers offline. Interests for these candidates rest on Sunbiz only.
- **Former officials.** Singer (Palmetto Bay council to about 2020) and Mixon (Cutler Bay council to 2018) filed older Form 1s that are not viewable online, and their past votes were not reviewed.
- **Payment registers.** The Miami-Dade Online Checkbook (Power BI, no export) was not searched, so County *payments* are not covered; only purchase orders are. None of the four cities publishes a vendor payment register that I found. The School Board and FDOE charter funding were not relevant to any entity found.
- **Form 8B.** No Form 8B memoranda are posted by these cities.
- **Shell access.** curl from the shell is blocked for disclosure.floridaethics.gov and search.sunbiz.org, so those were read through WebFetch.
