Pinecrest donor files for Ken Fairman (account "fairman"), read by scripts/lib/city.mjs as fairman_<n>.csv.
- fairman_2022.csv: 2022 Village Council at-large campaign (elected unopposed Nov 8, 2022). Source: Village clerk,
  https://www.pinecrest-fl.gov/files/sharedassets/village/v/1/government/village-clerk/documents/elections/2022-candidates/fairman-tr.pdf
  (M2-M6 and termination reports, read page by page 2026-10-25). Contributions other than the candidate's own loans
  ($1,500 and $30,000 on Feb 18 and 25, 2022, left out): Robert C. and Karen Ross $250 (Feb 23), Su Dixie Belle, LLC $1,000
  (Mar 28), Lori and Robert Welbon $50 in-kind (Jun 6). Report totals: $32,800 to date incl. loans; M1 had no activity.
- fairman_2026.csv: the 2026 reports already hand-typed in public/data/city-reports.json, copied row for row with the same
  filter the pipeline used (no self, loans or refunds). Needed because the pipeline uses the hand-typed reports only when no
  CSV exists for the account; without this file adding the 2022 CSV would have dropped the 2026 gifts.
