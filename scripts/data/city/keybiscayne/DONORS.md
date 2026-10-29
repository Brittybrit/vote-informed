keybiscayne donor exports (<acct>.csv), pulled 2026-10-24 from the city's EasyVote API (ecf-api.easyvoteapp.com),
read from the clerk's portal (the API answers only that origin), and written by ../_small/ev-csv.py. Rules as
the worker's evCandidateDonors: reports submitted from 2025 on except qualifying papers and termination
reports; for amended reports the newest filing with itemized rows; a row in both the redacted and original
version counted once. The API gives no address or occupation. A report uploaded as a scan has no rows.

## 2022 campaigns (added 2026-10-29): sardinas_2022.csv, vazquez_2022.csv
Source: the clerk's archive page https://keybiscayne.fl.gov/government/village_clerk/elections/campaign_treasurers_reports_archives.php,
PDFs "Sardiñas, Oscar (2).pdf" (84 pages: G-TR Jun, M7, M8, M8 amended, G-1, G-2, G-3, T-2022) and
"Vazquez, Fernando A..pdf" (58 pages: Jul, Aug, Sep 1-Oct 7, Oct 8-21, Oct 22-Nov 3, T-2022). They are scanned
printouts of typed DS-DE 12/13 forms; the scan's text layer was read and checked against the page images.
- Sardiñas: 26 rows, $5,607.11. Every report's itemized rows match its summary "Cash & Checks" (M8 $1,545, G-1
  $2,555.65, G-2 $1,300, G-3 $206.46). The amended M8 is used (it names Jose Rasco where the original had
  "Jacqueline Chisolm" at the same address, and Oscar Sardinas, realtor at 151 Crandon Blvd, where the original had
  "Pay Pal"). Left out: his own $200 loan (Jun 24) and $87.18 check (T-2022, Feb 1, 2023). Total to date on the
  termination report, $5,894.29, = $5,607.11 + $200 + $87.18. Names as typed (Bernanrdo Lucena, Joanne Sadinas).
- Vazquez: no rows. Every 2022 receipt ($2,644.10 net to date) was his own money: a $1,500 loan/check (Aug 1, less
  an $855.90 repayment), $500 (Sep 19) and $1,500 (Oct 11). The file is kept, empty, to show the reports were read.
- Not loaded: "Sardiñas, Oscar.pdf" on the same page is his 2020 campaign (Aug-Oct 2020 reports, scanned with an
  OCR layer); it falls inside his gift window (from 2020-01-01) but was outside this pass.
