# s2 progress (2025-63..2025-124)

Started 2026-10-24. Method per progress.md, WebFetch serial.

## Progress
- Done A 2025-63..2025-119 (2025-79, 2025-99 partial). B missing: 2025-69, 75, 78, 79, 82, 84, 85, 94, 97, 99. C: 2025-66, 2025-81 (S only), 2025-103, 2025-112, 2025-115, 2025-116 (S only), 2025-119 (H only).
- FAIL B 2025-69 (SB 612): 2025s00612.fp.PDF client_error x3; no B line written, retry later.
- FAIL B 2025-75 (HB 113): h0113z1.CRM.PDF client_error x2; retry later.
- FAIL B 2025-78 (HB 437): h0437z1.CRM.PDF client_error; retry later.
- PARTIAL A 2025-79 (HB 693): page lacked analyses/vote tabs (tallies from history only), ?Tab=BillHistory client_error. B not done.
- FAIL C 2025-81 (HB 903): House vote PDF HouseVote_h00903c2129.PDF client_error x2; Senate done.
- FAIL B 2025-82 (HB 915): h0915z1.CIV.PDF server_error x2; retry later.
- FAIL B 2025-84 (HB 1451): h1451z1.CRM.PDF client_error; retry later.
- FAIL B 2025-85 (SB 348): 2025s00348.rc.PDF client_error; retry later.
- FAIL B 2025-94 (HB 1487): h1487z.HPP.PDF client_error; retry later.
- FAIL B 2025-97 (SB 1546): 2025s01546.rc.PDF client_error; retry later.
- PARTIAL A 2025-99 (HB 757): no PDF hrefs returned; BillHistory retry client_error. B not done.
- FAIL C 2025-116 (HB 733): House vote PDF HouseVote_h00733c1103.PDF client_error x2; Senate done.
- STOPPED: WebFetch hourly limit hit while fetching Senate vote for 2025-119 (SenateVote_h00867c1005.PDF).

## Resume
- Not started: 2025-120..2025-124.
- C to do: 2025-119 Senate (SenateVote_h00867c1005.PDF), 2025-81 House (HouseVote_h00903c2129.PDF), 2025-116 House (HouseVote_h00733c1103.PDF).
- B retries (final analysis URLs are in s2-A.jsonl): 69 (2025s00612.fp), 75 (h0113z1.CRM), 78 (h0437z1.CRM), 82 (h0915z1.CIV), 84 (h1451z1.CRM), 85 (2025s00348.rc), 94 (h1487z.HPP), 97 (2025s01546.rc).
- A redo: 2025-79 (HB 693) and 2025-99 (HB 757): page came back without PDF hrefs; fix the A line and then do B.
- Notes for review (written as b:false, flagged in "note"): 2025-96 (eased licensure for health care providers), 2025-98 (hospitals/medical debt buyers), 2025-100 (gold/silver coin sales tax exemption, coin custodians), 2025-111 (civil immunity for group homes). 2025-119 is b:true based on the bill body: the fiscal section says None, but the bill names FECR and Brightline as indemnified.
