# r5 progress
- A reused from s7/s8 rows: 2026-141,146,149,157,167,195,217,223,238. A needed: 176,177,178,180,181,182,183.
- B title class (road designations, no fetch): 2026-182, 2026-183. A still needed for both.
## Stop 2026-10-24: WebFetch hourly limit hit on the first fetch (h0625z1.CRM.PDF for 2026-141). Nothing else fetched.
- Remaining: A 176,177,178,180,181,182,183; B all except 182,183; C all 4 votes (2025-41 S, 2025-119 S, 2025-233 H, 2026-83 S).
- 2026-146: B b:TRUE (reinsurance intermediary managers, AEG analysis; .rc failed). C Senate done; House HouseVote_s00394__801 failed https+http, retry at end
- 2026-141 B (JDC fallback), 2026-149 B (ACJ fallback), 2026-157 B b:TRUE (drug-testing equipment makers, JDC fallback) + C H,S done
- 2026-167 B (SAC fallback). 2026-176 A,B b:TRUE borderline (stablecoin issuers), C H,S done. Next: 2026-177
- 2026-177 A,B b:false. 2026-178 A,B b:false (kiosk businesses bear costs). Next: 2026-180
- 2026-180 A,B b:false (trust fund revival; Senate 3/13 vote url ambiguous, see note). 2026-181 A done. Next: 181 B
- 2026-181 B b:false. 2026-182, 183 A done (au filled in B). Next: B 195, 217, 223, 238, then C
- 2026-195: B failed again (z1.IAS, e.SAC, c.NRD all client_error)
- 2026-217 B b:false flagged (WMC fallback; Uplands Stewardship District landowner-developer mechanics but no stated beneficiary)
- 2026-223: B failed again (z1.IAS https+http, c.SAC client_error)
- 2026-238 B b:false flagged (conference report fallback; 'eligible parties' only). Next: C votes
- C: 2025-41 S failed https+http; 2025-119 S done
- C: 2025-233 H, 2026-83 S failed; 2025-41 S failed (3 tries); 2026-146 H HouseVote_s00394__801 failed (3 tries)
## End of r5 pass 2 (2026-10-24)
- A: 7/7 new rows written (176,177,178,180,181,182,183); other 9 reused from s7/s8.
- B: 14/16 (missing 2026-195, 2026-223: every analysis failed).
- C: 6 PDFs written (2026-146 S; 2026-157 H,S; 2026-176 H,S; 2025-119 S). Still failing: 2025-41 S, 2025-233 H, 2026-83 S, 2026-146 H.
- New b:true: 2026-146 reinsurance intermediary managers; 2026-157 drug-testing equipment makers/sellers; 2026-176 stablecoin issuers (borderline).
- Review flags: 2026-217 (Uplands Stewardship District, landowner developer), 2026-238 ("eligible parties"; z1 unread), 2026-180 Senate 3/13 vote url duplicated __011.
