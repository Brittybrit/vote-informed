# FL enacted-bills universe — progress

Sessions: 2025 (regular), 2025A (no laws), 2025B (SB 2-B vetoed, no laws), 2025C (2 laws), 2026 (regular), 2026D (1), 2026E (10), 2026F (1).
Enacted list: enacted.json (493 chapter laws: 2025-1..2025-253, 2026-1..2026-240). Built from flsenate.gov session lists (2025) and laws.flrules.org/node (2026).

Pipeline (resumable):
- stageA.jsonl: one line per chapter from the flsenate bill page: analyses list (url,date,type) and floor votes (chamber,date,tally,pdf url).
- stageB.jsonl: one line per chapter: chosen final analysis + private-sector impact reading.
- stageC.jsonl: one line per vote PDF: member votes.
- build.py merges into universe.json.
Rerun: skip chapters already present in each stage file.

## Status 2026-10-24 (first run)
- enacted.json complete: 493 chapter laws (2025: 253 incl. 2025-1/2 from Special Session C, 2025-198 SB 2500 GAA, 2025-208 HB 7031; 2026: 240 incl. D/E/F special-session laws). Chapter numbers 2025-1..253 and 2026-1..240 are contiguous with no gaps.
  2025 list built from flsenate.gov session pages (both chambers, 40 pages); 2025-198 and 2025-208 confirmed on their bill pages. 2026 list from laws.flrules.org/node.
  2025A had no laws; 2025B's only passed bill (SB 2-B) was vetoed.
- Stage A (bill page: analyses + floor votes): 10/493 done.
- Stage B (final analysis private-sector reading): 2/493 (2026-1 none; 2026-179 qualifies, using the COM analysis because the final HAT analysis could not be fetched).
- Stage C (member roll calls): 1 PDF (HB 1389 House concurrence).
- Stopped: WebFetch hourly limit hit after ~110 fetches. flsenate.gov fails on ~30-40% of fetches (client_error); retry with or without ?Tab=BillHistory, or with Chamber= case changed.
- Shell can't reach flsenate.gov, laws.flrules.org, or myfloridahouse.gov (proxy 403), so every page has to go through WebFetch.

## Resume
1. python3 pending.py 20  -> next bills for stage A. Append one JSON line per bill to stageA.jsonl.
2. For each stageA bill: pick the last-dated analysis (House "z"/"z1" final bill analysis, or Senate highest committee/".en" enrolled); read Private Sector Impact; append to stageB.jsonl {ch,au,ps,b,cat,named,q}.
3. For qualifying bills: fetch the last House and Senate floor-vote PDFs (3rd reading or concurrence); append to stageC.jsonl {u,t,r:{member:yes|no|not voting|not seated}}.
4. python3 build.py -> universe.json.
Budget: about 3 fetches per bill (≈1,500 total) means at ~100/hour this needs ~15 hours of fetch quota across runs.

## Status 2026-10-24 ~13:15 ET (browser run)
- Switched to the built-in browser (flsenate.gov tab, same-origin fetch, DOMParser). Bill pages parse well (selectors #tabBodyAnalyses, #tabBodyVoteHistory, #tabBodyBillHistory).
- Stage A: 41/493 bills now in stageA.jsonl (chapters 2025-1 to 2025-40 plus 2026-1, 2026-2, 2026-179). Floor-vote "a" (action) is blank for the browser rows; the last vote per chamber is the final passage.
- Blockers:
  1. Every PDF under flsenate.gov (analyses, vote PDFs, bill text) returned a 4,725-byte server error ("System.Net.WebException ... connection was forcibly closed") even before throttling. flsenate.gov seems to proxy these files from a backend that was down. pdf.js 4.4.168 from cdnjs loads fine in the page.
  2. After ~60 page fetches with 4-6 in parallel, flsenate.gov returned HTTP 429 to every request for 25+ minutes. Next run: go serial, about 1 request every 3-5 s.
  3. flhouse.gov (myfloridahouse.gov redirects there) loaddoc.aspx serves an F5 bot-challenge page to fetch(), not the document. I didn't try to get past it.
- Browser rule for picking the final analysis: House "h####z/z1" final analysis if present, else the latest-dated non-".pre." Senate analysis; skip House Message Summaries (.hms.).

## 2026-10-24 later: resume attempt with Claude in Chrome
- The coordinator reports flsenate.gov PDFs load again.
- Claude in Chrome: tabs_context_mcp returned "Browser extension is not connected" on both tries. The built-in browser tools are disconnected too, so nothing was fetched in this attempt. State is the same as above (stage A 43/493, stage B 2, stage C 1).
