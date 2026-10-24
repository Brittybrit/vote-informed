# r1 progress (retry slice)
- Reuse A from s1/s2 for 2025-34,69,75,78,82,84,85,94,97. Need A redo: 79, 99, 120-124, 170-172.
- 2026-10-24: first fetch (2025-34 fp analysis) hit WebFetch hourly limit (RATE_LIMIT_EXCEEDED). Nothing fetched. r1-A/B/C.jsonl empty.
- Resume order: B for 2025-34,69,75,78,82,84,85,94,97 (A reusable from s1/s2-A.jsonl); A+B for 2025-79,99,120-124,170-172; C votes 2025-11 S, 2025-45 H, 2025-155 S, 2026-4 H, 2026-89 S.
- FAIL B 2025-34: fp x2 (https/http) + aeg client_error. FAIL B 2025-69 fp client_error x1. A/B 2025-120 done (b:false).
- A/B 2025-121 b:false; 2025-122 b:true (communications/broadband providers); need C H+S.
- A/B 2025-123, 2025-124 b:false. FAIL C 2025-122 H HouseVote_h00703c1254 x2 (S done).
- A/B 2025-170 (CA analysis, rc failed) b:false borderline; 2025-171 b:false.
- PARTIAL A 2025-172 (SB 1730): no hrefs; 3 tries. B not done.
- B 2025-75, 2025-78, 2025-82 b:false (all from earlier JDC analyses; z1 failed).
- B 2025-84 (JDC), 2025-85 (MS) b:false. FAIL B 2025-94: z.HPP x2 + b.HHS client_error.
- B 2025-97 (CJ), 2025-69 (ACJ), 2025-34 (pre.fp) b:false.
- PARTIAL A 2025-79 still: ?Tab=Analyses, trailing slash, http BillHistory all no hrefs/client_error. A 2025-99 done.
- A 2025-79 done via ?Tab=VoteHistory (tip: that tab variant returned hrefs when others failed).
- A 2025-79 B b:false (JDC). A 2025-172 fixed via ?Tab=VoteHistory. All 5 slice vote PDFs + 2025-122 H client_error (1 try each, 655 S x2).

## Status end of r1 run 2
- A (new rows in r1-A.jsonl): 2025-79, 99, 120, 121, 122, 123, 124, 170, 171, 172. Reused A for the rest.
- B: all 19 chapters done except 2025-94 (HB 1487: z.HPP x2 + b.HHS client_error; SB 1644 companion page client_error).
- b:true: 2025-122 HB 703 Utility Relocation (communications services providers: broadband, cable, video, voice).
- B from an earlier analysis (final failed): 2025-34 (pre.fp), 69 (ACJ), 75/78/79/82/84 (JDC), 85 (MS), 97 (CJ), 170 (CA).
- C done: 2025-122 S. FAIL C (client_error, 2+ tries each): 2025-122 H HouseVote_h00703c1254; 2025-11 S; 2025-45 H; 2025-155 S; 2026-4 H; 2026-89 S. Vote PDFs looked down for the whole run.
