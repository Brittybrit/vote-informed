# r2 progress

Retry slice r2 (retry-slices.json "r2"). Started 2026-10-24.

## Checkpoint 1
- A: reused s4-A rows (already had analysis and vote links) for 2025-194, 2025-205, 2025-226, 2025-238 -> r2-A.jsonl.
- WebFetch hit its hourly limit on the first fetch (HB 393 bill page), so nothing new was fetched.
- Still to do:
  - A (bill page): 2025-173..186, 2025-228.
  - B (analysis): all 19 chapters (2025-226 re-read; s4 marked it unread).
  - C (roll calls): 2025-33 H, 2025-54 S, 2025-160 H, 2026-7 S, 2026-137 S (urls are in retry-slices.json).

## Checkpoint 2 (after limit reset)
- Tip: bill pages often load without PDF hrefs. https://www.flsenate.gov/Session/Bill/<yr>/<n>/ByCategory returns them; fall back to /<n>/?Tab=BillHistory.
- A done: 2025-173, 175, 176, 177, 178, 179, 180, 181. 2025-174 (HB 669) failed 3x (ByCategory https, trailing slash, http); retry later.
- B done: 173, 175 (COM fallback), 176, 177, 178, 179 (hp fallback), 180, 181.
- New b:true: 2025-179 SB 68 (private health care facilities financing); 2025-181 SB 738 (preschools exempt from special assessments; borderline).
- C: 2025-179 H+S; 2025-181 H. 2025-181 Senate (SenateVote_s00738c1002.PDF) failed 2x; retry.

## Checkpoint 3 (slice essentially done)
- Tip: when a PDF fetch fails, adding a query string (e.g. ?r=3) skips WebFetch's cached failure and often works.
- A: 19/19 (2025-173..186, 194, 205, 226, 228, 238). 2025-228 now done.
- B: 19/19. Fallback notes: 2025-175 used the COM analysis (z1.HAT failed 3x); 2025-194 used the cj analysis (fp, acj, pre.fp failed). 2025-226 re-read from z1.IAS (Fiscal: None). 2025-205 used the conference report.
- b:true in r2: 2025-179 SB 68 (private health care facilities financing), 2025-181 SB 738 (preschools; borderline), 2025-182 SB 954 (recovery residences).
- C: given list 5/5 (2025-33 H, 2025-54 S, 2025-160 H, 2026-7 S, 2026-137 S). Final votes: 2025-179 H+S, 2025-182 H+S, 2025-181 H only.
- STILL FAILING: 2025-181 Senate vote https://www.flsenate.gov/Session/Bill/2025/738/Vote/SenateVote_s00738c1002.PDF (6 tries). 2025-175 final z1.HAT analysis (optional re-read).
