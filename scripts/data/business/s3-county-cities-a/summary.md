# s3-county-cities-a summary (checked 2026-10-24/25)

**Candidates done:** 21 of 21 (County Commission District 5, School Board District 1, Aventura, Coral Gables, Doral, Hialeah, Coronado CDD).

**Interests:** 51 lines in interests.jsonl. 39 name a business and 12 are `business:null`, meaning no filing was reachable or the form lists nothing. Form-based interests came from Form 6 or Form 1 filings opened on EFDMS: Lopez, Wilson, Weinberg, Lago, Castro, Menendez, Sanabria, Gonzalez, Porras and Santacruz. Chavez's Form 1 came from Hialeah's 2025 qualifying papers.

**Ties:** 1, and it is unverified. Lopez's employer is Agape Network Foundation, Inc. A sister corporation, Agape Network, Inc., shares its address and four officers on Sunbiz. That corporation got the FY2025-26 GAA line for Senate LFIR 1778 ($400,000) while Lopez was a State Representative. I opened the LFIR, but I could not get the GAA enrolled text or the House roll-call PDF for the 6/16/2025 conference report, so her vote is not confirmed. No record states that the two corporations are parent and subsidiary.

**No ties found** after checking every action in the repo for each body (county 101, Aventura 69, Coral Gables 251, Doral 349, Hialeah 870) by party, vendor, applicant, owner and address:
- Hotwire (Weinberg)
- BDI Construction and Lago's LLCs. BDI holds Sourcewell GC contract FL-R7-GC-092524-BDI, but no piggyback of it was found.
- M.E.D. Expediters (Castro)
- NEM Law (Menendez)
- Vital Graphics and Santa Fe Family (Gonzalez)
- Porras's law practice

I also ran title searches through the Coral Gables Legistar API (webapi.legistar.com) and opened a sample of Hialeah resolutions.

**Not reachable and why:**
- voterfocus.com and cityofaventura.com block automated fetch (robots-disallowed). That leaves no challenger Form 6 or Form 1 for: Piper, Cothiere, Zaltzberg, Cancio, Holmes, Whiting, Gomes, Espinosa, Garagorry and Sousa.
- The Doral clerk's page gives no usable link to candidate filings.
- Hialeah's 2026 qualifying packets are not posted; only the 2025 ones are.
- Coronado CDD meeting books on coronadocdd.org fail to download (client_error), so CDD votes, vendors and payments were not checked.
- FACTS (facts.fldfs.com) searches by POST only; USAspending and Sunbiz are blocked to curl. Sunbiz works through WebFetch.
- The Miami-Dade Clerk vendor checkbook is a Power BI dashboard and cannot be queried. No city vendor-payment register was available.
- Miami Gardens council votes are not in the repo, so Wilson's council-side ties were not checked.
- The flsenate House vote PDF for SB 2500 (2025) could not be located.
