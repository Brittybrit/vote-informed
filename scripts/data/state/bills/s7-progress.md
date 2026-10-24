# s7 progress

Slice s7: 2026-121..2026-183 (minus 2026-179). WebFetch only, serial.

Notes:
- enacted.json lists HB 177 for 2026-157; actual bill is CS/HB 477 (Drug Paraphernalia). Rows use HB 477 urls.
- 2026-125 (SB 1602) stage B: AP analysis 2026s01602.ap.PDF client_error x2; revisit.
- Status after 6: A 121-126; B 121-124,126 (125 failed); C 123.
- 2026-129 (HB 565): bill page came back stale (no votes, no chapter, no PDF hrefs); ?Tab=BillHistory client_error. Revisit.
- Status after 13: A 121-128,130-133 (129 pending); B 121-124,126-128,130-133 (125 pending); C 123 (S+H).
- 2026-137 Senate vote PDF SenateVote_h07031__002.PDF client_error (1st try); retry later.
- Status after 19: A through 139 (129 pending); B through 139 (125 pending); C 123 S+H, 137 H (137 S pending).
- 2026-141 (HB 625) stage B: h0625z1.CRM.PDF client_error; retry later.
- Status after 24: A through 144 (129 pending); B through 144 (125, 141 pending); C 123 S+H, 137 H.
- 2026-146 (SB 394) stage B: 2026s00394.rc.PDF client_error; retry later.
- 2026-149 (SB 436) stage B: 2026s00436.rc.PDF client_error; retry later.
- Status after 29: A through 149 (129 pending); B through 149 (125,141,146,149 pending); C 123 S+H, 137 H.
- Status after 34: A through 154 (129 pending); B through 154 (125,141,146,149 pending); C 123 S+H, 137 H, 150 S+H.
- 2026-157 (HB 477) stage B: h0477z2.CRM.PDF client_error; retry later.
- Status after 39: A through 159 (129 pending); B through 159 (125,141,146,149,157 pending); C 123 S+H, 137 H, 150 S+H.
- Status after 43: A through 163 (129 pending); B through 163 (125,141,146,149,157 pending).
- 2026-167 (HB 273) stage B: h0273z1.IAS.PDF client_error; retry later.
- Status after 47: A through 167 (129 pending); B through 166 (125,141,146,149,157,167 pending); C 123 S+H, 137 H, 150 S+H.
- Status after 51: A through 171 (129 pending); B through 170 (125,141,146,149,157,167 pending).
- Status after 55: A through 175 (129 pending); B through 174 (125,141,146,149,157,167 pending).

## Stop 2026-10-24: WebFetch hourly limit hit (at 2026-176 / HB 175 bill page)
- A done (54): 2026-121..128, 130..175. Pending A: 129 (HB 565, stale page + BillHistory error), 176, 177, 178, 180, 181, 182, 183.
- B done (48): pending retries 125 (s01602.ap), 141 (h0625z1.CRM), 146 (s00394.rc), 149 (s00436.rc), 157 (h0477z2.CRM), 167 (h0273z1.IAS); plus 129, 176-183. 182/183 are road designations (title class shortcut after A).
- b:true: 123 (SB 1030 substance abuse providers), 137 (HB 7031 cardrooms/slots/tennis), 150 (SB 1028 private insurers via Citizens depopulation). Borderline b:false flagged in notes: 132, 133, 161 (impact-fee payers).
- C done: 123 S+H, 137 H only (S vote SenateVote_h07031__002.PDF failed), 150 S+H.
- 2026-170 used h1081c.EEC (z1 returned DOCUMENT UNAVAILABLE).
