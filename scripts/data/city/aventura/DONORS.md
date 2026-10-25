# Aventura donor files

- `weinberg_2020-2022.csv`: Howard Weinberg's 2022 mayoral campaign (account opened Feb 2020), every itemized
  contribution in the treasurer's reports 2020-M1 .. 2022 Termination Report (Laserfiche City Clerk > Candidate
  Information > "2022 Election - Mayor Seat - Howard Weinberg", folder 306954; document id column = Laserfiche id,
  link https://egov2.cityofaventura.com/Imaging/DocView.aspx?id=<id>&dbid=0&repo=CityHall). The reports are
  handwritten scans; rows were transcribed by hand from the page images (OCR text is unusable). 255 rows, $162,438.
  Left out: the candidate's own $10,000 loan (2020-M2). 2020-M1 was a waiver; the 2020-M2 original and amendment
  carry the same four rows (counted once). Kept as given: 27th State PAC $1,000 (2020-09-23), which the campaign
  refunded on 2021-01-20 (REF row, not loaded). Uncertain readings: Cameron Lloyd's street (2021-M8); the June 2021
  page (2021-M6) is a faint scan: rows 2 (Palm Media LLC?, $1,000), 3 (unreadable, $1,000), 5 (unreadable
  business, $1,000) and 8-9 (two Golden Beach individuals, $1,000 each) could not be read and are NOT in the file
  (about $5,000 missing); Brian Adler $100, Amit Bloom $118 and Rafael Ilishayev $1,000 are in.
- `weinberg_2026.csv`: the 2026 reports already hand-typed in public/data/city-reports.json (Q1-Q3, G1), copied
  here because the pipeline reads hand-typed reports only when no CSV exists for the account. Same rows, no
  occupations or addresses.
- Weinberg was elected unopposed in 2022 (took office Dec 2022), so the 2020-2022 account is both his first
  campaign for the seat and the cycle before his tenure. His 2010-2018 commission campaigns are a separate tenure.
