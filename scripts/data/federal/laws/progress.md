# Laws universe progress

Started 2026-10-24.

## Steps
- [ ] 1 public law list -> laws-list.json
- [ ] 2 benefits classification
- [ ] 3 roll calls
- [ ] 4 Moody CDS -> moody-requests.json

## Notes
- laws-list.json done (134 public laws, 119-1..119-134) from api.congress.gov/v3/law/119.
- actions.jsonl: per-law final passage rolls (append). member-votes.jsonl: per roll members (append).
- House member votes via api.congress.gov/v3/house-vote/119/{session}/{roll}/members (clerk.house.gov blocked by permission). Senate via senate.gov vote XML.
- Existing scripts/data/federal/floor-votes.json already has members for 119-2,10,16,27,60 (reuse).
- benefits.jsonl: classification per law (append). CRS text via govinfo bulkdata BILLSUM-119{type}{num}.xml (api.congress.gov DEMO_KEY rate-limits).
- [x] Step 2 done: benefits.jsonl complete, 134 rows, 35 qualifying (2026-10-24). Fields: affected = regulated-not-benefited (not counted).
- Step 3 in progress: actions.jsonl (rolls) — reuse floor-votes.json for 119-2,10,16,27,60.
- 2026-10-24: hit WebFetch hourly rate limit after ~150 fetches. Resume: rolls needed for qualifying laws not yet in actions.jsonl; then member votes for each roll not in member-votes.jsonl; then Moody CDS.
- Source that works for actions: api.congress.gov/v3/bill/119/{type}/{n}/actions?api_key=DEMO_KEY (DEMO_KEY intermittently 4xx); house members: api.congress.gov/v3/house-vote/119/{sess}/{roll}/members; clerk.house.gov/evs/YYYY/rollNNN.xml and senate.gov vote XML work intermittently.
- actions-partial.jsonl: House rolls seen in house-vote list, need tally + Senate roll.
- source BILLSTATUS: govinfo.gov/bulkdata/BILLSTATUS/119/{type}/BILLSTATUS-119{type}{n}.xml works well for rolls
- House member votes complete for qualifying rolls (clerk XML). 2026 roll 89: 3 Miami members NV — spot-check.
- Senate Moody votes complete for qualifying rolls. Next: Moody CDS (step 4).
- [x] Step 3 done: all 35 qualifying laws have final-passage rolls + member votes (or voice/UC).
- [x] Step 4: no Moody CDS found; evidence in moody-requests-note.json. Needs browser confirmation.
- [x] universe.json built by `python3 merge.py` (rerunnable).
