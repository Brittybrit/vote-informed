# s8 progress

Slice s8: 2026-184..2026-240 (57 chapters).

- Done A: 2026-184..188. B: 185-188 (all b:false). 2026-184 B pending: h6507e.JDC.PDF client_error twice (claim bill, likely b:false).
- Done A: 2026-189..197. B: 189-194, 196 (all b:false). B pending (z1 analysis client_error): 2026-184, 195, 197.
- Done A: 2026-198..202. B: 198 b:TRUE (family day care home providers), 199-202 b:false. C: 198 H+S done.
- Done A: 2026-203..207. B: 204, 205, 207 b:false. B pending (z1 client_error): 203, 206.
- Done A: 2026-208..212. B: 208, 210, 212 b:false. B pending (client_error): 209 (z1 and SAC both failed; Lake Wales alcohol vendor exception, possible b:true), 211.
- Done A: 2026-213..216. B: 213, 215 b:false. B pending (z1 client_error): 214, 216.
- Done A: 2026-217..220. B: 218-220 b:false. B pending (z1 client_error): 217 (Uplands Stewardship District, Marion; possible developer benefit).
- Done A: 2026-221..224. B: 221, 222 b:false. B pending (z1 client_error): 223, 224.
- Done A: 2026-225..228. B: 225-228 b:false.
- Done A: 2026-229..233. B: 229-231 b:false; 232 (GAA) and 233 (GAA implementing) b:false "budget act". 232/233 A rows lack PDF urls (WebFetch did not return hrefs).
- Done A: 2026-234..237. B: 234 (no analysis; judged from summary), 235, 237 b:false. B pending: 236 (h5301z1.HCB client_error; Medicaid provider reimbursement, possible b:true). 234 A row empty: bill page showed no votes; re-check.
- Done A: 2026-238..240 (A complete for all 57). B: 239 b:TRUE (tax package: cardroom/slot operators etc.), 240 b:false, 236 b:TRUE (hospitals/nursing homes, from conference report). C: 239, 236 H+S done.

## Status at stop (WebFetch hourly limit hit)
- A: 57/57. Gaps: 2026-232 and 233 rows have no PDF urls (WebFetch gave no hrefs); 2026-234 (HB 5201-E) has an empty row because the page showed no votes and the BillHistory retry failed. 2026-230/231: the 5/29 Senate conference vote url came back the same as the 5/12 one; verify.
- B: 53/57. Missing: 2026-195 (z1, SAC failed; NRD not tried), 217 (z1, SAC failed; Uplands Stewardship District), 223 (z1, SAC failed), 238 (z1 failed; the conference report says deductibles, copays and caps are removed for eligible petroleum-cleanup parties, a possible b:true).
- Several B rows use the next-latest analysis because the final z1 failed (see "note").
- b:true: 2026-198 (HB 4033, family day care home providers), 2026-236 (HB 5301-E, hospitals/nursing homes Medicaid; from the conference report), 2026-239 (HB 7031-E, cardroom/slot operators, mobile home parks, packinghouses, Miami Open).
- C: 6 PDFs (H+S for 198, 236, 239). Done.
- Borderline b:false to review: 190, 199, 207, 208, 209, 212, 222.
