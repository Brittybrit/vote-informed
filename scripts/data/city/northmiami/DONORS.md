North Miami donor exports (estimé-irvin.csv, timothe.csv, desulme.csv), pulled 2026-10-24 from the city's
EasyVote API (ecf-api.easyvoteapp.com, customer 01C43AD2-766F-46FF-BA86-42000C4740FF), which answers only
when called from the clerk's portal (northmiamifl.easyvotecampaignfinance.com). Same rules as the worker's
evCandidateDonors: every report the filer posted except qualifying papers; for amended reports the newest
filing with itemized rows; a row in both the redacted and original version is counted once (same date,
amount and name). The API gives no address or occupation. Only the 2026 campaign's reports are kept (Desulme's 2024 reports and 2025 termination report are left out), to match the other cities' files.

## Tenure extension (2026-10-25): earlier campaigns, from the clerk's scanned treasurer's reports
Files: estimé-irvin_2019.csv, estimé-irvin_2021.csv, timothe_2021.csv, desulme_2019.csv (desulme_2024.csv was
already here). Source: the city clerk's scanned DS-DE 12/13 reports (doc ids in
scripts/data/tenure/cities-a/northmiami-src/donors/report-docs.txt). Rows were read from the PDF text layer
(or, for Timothé's 2021 P1-P7 spreadsheet pages, by OCR of each table cell); scripts in
tenure/cities-a/northmiami-src/donors/. The scans are poor, so these files are INCOMPLETE and some names carry
OCR noise; candidate loans and refunds are left out. Coverage against each report's summary "cash & checks":
- Estimé-Irvin 2019 (first council campaign, P1 Feb 2019 .. G06 May 2019): 75 rows, $12,655. Re-filed copies
  (3541-3547 = 4689-4695) counted once. Summary totals for P1-P7 ~ $25,000, so roughly half read.
- Estimé-Irvin 2021 (re-election, M11 2020 .. P7 May 2021): 90 rows, $44,926, against ~$80,000 in the summaries
  (P1 22,250; P2 15,975; P7 13,625 ...). 2020-M11 summary unreadable.
- Timothé 2021 (first council campaign, M10 2020 .. P7 May 2021): 248 rows, $37,324. M10-M1 reports were
  re-filed (9651/9768/10020/10259 = 10429-10432; later copy kept).
- Desulme 2019 (council re-election, M10 2018 .. P7 May 2019): 218 rows, $72,505, against ~$94,000 in the summaries.
- Desulme 2015 (first council campaign, 3955-3960): NOT loaded. The handwritten itemized pages give only a
  handful of readable amounts (~$2,000 of ~$16,000 reported); left out rather than published as a partial list.
  Desulme 2017 (council re-election, if any) reports were not found on the clerk's portal.
- Not found online: any reports before 2015.
