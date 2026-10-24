# r4 progress

Retry slice r4 (19 chapters, 4 votes).

## Status (stopped at first fetch)
- WebFetch hourly limit was already used up: the first fetch (h0803z1.IPA.PDF for 2026-63) returned RATE_LIMIT_EXCEEDED. Nothing fetched, nothing written to r4-A/B/C.jsonl.
- Reusable A rows already exist elsewhere for 2026-63, 2026-101 and 2026-125 (analyses + floor-vote links), so the next run needs only B for those three.
- B finals to read next run: 2026-63 h0803z1.IPA.PDF; 2026-101 2026s01246.fp.PDF (skip .hms.); 2026-125 2026s01602.ap.PDF (skip .hms.).
- Shortcuts for next run (OGSR exemption reenactments, b:false "title class"): 2026-117 (SB 7002), 118 (SB 7008), 119 (SB 7012), 120 (SB 7024). Confirm on the bill page that they are reenactments.
- Still need A and B: 2026-56, 57, 58, 109-116, 129.
- C pending (all 4 House PDFs): 2025-38 h00429c2170, 2025-116 h00733c1103, 2025-204 s02514__438, 2026-83 s00578c1803.

## Resume run (after limit reset)
- A: 16 new rows (2026-56,57,58,109-120,129). 2026-63/101/125 reuse existing A rows. A done for all 19.
- B: 19/19 done. b:TRUE: 2026-63 (HB 803, contractors/homeowners: permit exemptions, lower fees), 2026-125 (SB 1602, landlords in the veteran housing pilot).
  Fallback analyses (final failed): 101 (pre.fp), 110 (h0867e.HHS), 113 (h1031e.SAC), 125 (pre.ap), 129 (h0565c.HHS).
  OGSR title class: 117-120. Borderline b:false: 111 (private-vendor prisons trust fund), 115 (cyber procurement).
- Mapping checks: 2026-116 = CS/HB 1407 and 2026-129 = CS/HB 565, both confirmed on laws.flrules.org. Neither needed a fix. The 565 page first showed no chapter or votes; the ?Tab=VoteHistory view (http) worked.
- C done: SenateVote_h00803e1018 (63 S), SenateVote_s01602c2021 (125 S).
- C still failing: every House vote PDF returns client_error (2-3 tries each, both http and https). These are HouseVote_h00803e1841 (63 H), HouseVote_s01602c2779 (125 H), and the 4 slice votes: h00429c2170 (2025-38), h00733c1103 (2025-116), s02514__438 (2025-204), s00578c1803 (2026-83). Senate PDFs load fine, so the problem looks like the House vote backend.
