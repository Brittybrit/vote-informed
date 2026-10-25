opalocka donor exports (<acct>.csv), pulled 2026-10-24 from the city's EasyVote API (ecf-api.easyvoteapp.com),
read from the clerk's portal (the API answers only that origin), and written by ../_small/ev-csv.py. Rules as
the worker's evCandidateDonors: reports submitted from 2025 on except qualifying papers and termination
reports; for amended reports the newest filing with itemized rows; a row in both the redacted and original
version counted once. The API gives no address or occupation. A report uploaded as a scan has no rows.

Tenure extension (2026-10-25, scripts/data/tenure/cities-a): bass_2022.csv and ervin_2022.csv hold the 2022
campaign (the race that started each one's current term: Bass appointed Aug 2021 and elected Nov 2022; Ervin
elected Nov 2022). The 2022 reports were filed as PDFs; the API returns rows for only some of them, so the
itemized-contribution pages (DS-DE 13) of every 2022 report were read from the PDF text layer
(ecf-api.easyvoteapp.com/documents/<id>/viewfinalredactedpdf) by tenure/cities-a/olrep extract.py, newest
filing per report. Address and occupation come from the PDF. Candidate loans and in-kind items are kept as
the report lists them.
- Bass 2022: M5 and M6 waivers (no activity); M7, M8, G1, G2, G3 itemized; TR (and TR amendment, 01/30-02/09/2023)
  list no new contributions. 25 rows, $12,708.69.
- Ervin 2022: M7 waiver; August, Sept14, G3 (10/03), G2 (10/24-11/03) itemized; TR and TR amendment no new
  contributions. 37 rows, $30,933.
Not available: Bass's 2018 and 2020 campaigns (her earlier, separate term). The city's EasyVote portal starts with
2022 filings and the city site posts no older reports; the 2020 cycle (one cycle before her Aug 2021 start) is
therefore not covered.
