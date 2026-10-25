# North Miami Beach donor files (tenure extension, 2026-10-25)

Source: City Clerk filings in the city DocumentCenter (Elections folders: 2022 Chernoff folder 792, Smith folder 808;
2018 Group 2 folder 523). All reports are handwritten DS-DE 13 forms; every itemized-contribution page was read from the
page images and checked against the report summary. Candidate loans are excluded; in-kind gifts are kept (Amend. code INK).
Transcriptions: scripts/data/tenure/cities-a/nmb-src/donors/tx_*.py; writer: donors/write.py.

- `chernoff_2022.csv`: 170 rows, $76,448 (M6-G7 and Run Off, Jun 30 - Nov 17, 2022). Each report's itemized total matches
  its summary, except M8 ($5,469, matches) and Run Off, where the summary says $36,360 cash but the 78 itemized non-loan rows
  total $35,249 (sequence 36 is missing from the form). Amendments re-list earlier gifts under new periods; they were not
  loaded twice. G2: Merle Saffenstein is $50 (per the amendment). Soccer Development Group $600 appears in the G5 amendment
  and again in G7 (G7 only adds up with it); both kept. Two Run Off rows are duplicated on the form (Keith Meyers $75,
  NMB Commerce Center $250) and kept as filed.
- `chernoff_2018.csv`: 61 rows, $25,118 (his 2018 Group 2 run: M8-G6 and R1; the cycle before the seat). Totals match every
  summary except G6 ($1,000 on the summary, $850 itemized, after the $150 cash refund to Prestige Towing on 11/13/2018).
  The TR report has no contributions.
- `smith_2022.csv`: 109 rows, $47,059 (G1-G7, Aug 19 - Nov 3, 2022). Totals match every summary except G1 ($3,900 on the
  summary, $3,700 itemized; a C and S Global $500 row was struck and moved to G2). Smith did not run in 2020 (her seat's
  previous election), so there is no earlier cycle to load; the M8 report was a waiver.
- `chernoff_2026.csv` (53 rows, $35,261.22) and `smith_2026.csv` (44 rows, $25,503.53): copies of the 2025-2026 reports
  hand-typed in public/data/city-reports.json, written because a CSV now exists for each account (the hand-typed reports
  are used only when no CSV exists).
