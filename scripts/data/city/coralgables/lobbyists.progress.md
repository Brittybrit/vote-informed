# Coral Gables lobbyist linking progress (2026-10-24)
- Offline registry match done: scratchpad work/match.py -> cand-cg.txt (REG + county CTY), addr.py for address-in-issue matches.
- Record source: Legistar MatterTitle carries "Lobbyist: X" lines. Pulled list via webapi.legistar.com/v1/coralgables/matters?$filter=substringof('Lobbyist',MatterTitle) (208 matters since 2024-09-01). Agenda-named lobbyists recorded as basis "record" (src = Legistar matter).
- Next: assemble lobbyists.json.
- DONE 2026-10-24: lobbyists.json written by scratchpad work/build.py (curated links; rerun build.py to regenerate). Remaining gap: re-read agenda/minutes pages not covered (see notFound).
