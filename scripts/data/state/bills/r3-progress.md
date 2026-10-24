# r3 retry slice progress
Started 2026-10-24. Reuse: 2025-252, 2026-21, 2026-32, 2026-36, 2026-44 from s5-A (copied to r3-A). 2026-48 flagged mapping suspect in s5-A; check laws.flrules.org/2026/48.
- First WebFetch (HB 4045 bill page) returned RATE_LIMIT_EXCEEDED (hourly limit). Stopped. Nothing fetched.
- Remaining A: 2025-239..248, 2026-35, 2026-54, 2026-55, 2026-48 (verify mapping). B: all 19. C: all 5 votes.
- 2026-48 fixed: CS/SB 504 (A row written).
- Run 2: A done 2025-239..248, 2026-48 (CS/SB 504 fix). B done 2025-239..248, 2025-252, 2026-48. b:true: 2025-243 (event center liquor license, Jacksonville), 2025-248 (equestrian facility liquor license, Marion). C done: 2025-243 S, 2025-248 H+S. 2025-243 House vote PDF failed 3x.
- Run 2 continued: A done 2026-35 (HB 1093 confirmed via laws.flrules), 2026-54 (HB 895 confirmed), 2026-55. B done 2026-21, 32, 35, 36, 44, 54, 55 (several use earlier analyses; see notes). C done 2026-179 S.
- Status: A 19/19, B 19/19, C 4 rows. Still failing (vote PDFs client_error repeatedly): 2025-33 S, 2025-81 H, 2025-197 S, 2026-41 H, 2025-243 H (new b:true).
- enacted.json fix needed: 2026-48 is CS/SB 504, not SB 50.
