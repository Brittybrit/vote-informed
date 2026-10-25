# Tenure slice cities-a: North Miami, Aventura, North Miami Beach, Opa-locka

## Tenure starts (verified)
- North Miami: Desulme on council since 2015 (District 4, then mayor from 2022-12-13, continuous; Biscayne Times). Estimé-Irvin 2019-06-04. Timothé 2021-06-01.
- Aventura: Weinberg mayor since Nov 2022 (elected unopposed Aug 2022, took office after Nov general election). His earlier commission terms 2010-2018 are not continuous with the current one (AOL/Miami Herald: "previously elected to the Aventura commission in 2010 and his second term ended in 2018"), so tenure = Nov 2022.
- NMB: Chernoff 2022-11-22 (runoff), Smith 2022-11-08.
- Opa-locka: Ervin, Bass 2022-11-08.

## Method
- Tenure rows live in scripts/data/city/<slug>/tenure/rows.json (source of truth for pre-2025 actions) and are merged into
  scripts/data/city/<slug>/actions.json by `python3 scripts/data/tenure/cities-a/merge_tenure.py <slug>` (idempotent:
  replaces actions/meetings whose ids/dates come from the tenure file, keeps everything else). If actions.json is
  rebuilt by the older builders (_small/src/build.py, northmiami/src/build_nm.py), rerun merge_tenure.py.
- Former members who voted in the earlier years are added to body.json members with former: true.
- Shell curl reaches playapi.champds.com (North Miami), opalockafl.api.civicclerk.com, nmb.novusagenda.com, ecf-api.easyvoteapp.com (with Origin header).

## Log (append one line per meeting / report finished)
- 2026-10-25 North Miami: indexed CHAMP (playapi.champds.com/northmiamifl/event/1..640, City Council board) and city AgendaCenter
  (catID=5, 2017-Apr 2018). Read every council summary minutes 2017-01-10 .. 2024-12-10 (169 meetings; scratch parser
  nm_parse/nm_items/nm_votes/nm_auto/nm_build in the session scratchpad). Wrote northmiami/tenure/actions.json (505 actions:
  2017 51, 2018 61, 2019 54, 2020 34, 2021 47, 2022 84, 2023 76, 2024 98) and merged with merge_tenure.py (actions.json now 653).
  Gaps: 2015-2016 minutes not online; Apr 24-Jun 12 2018 not found; 2020-04-07/04-14, 2020-10-27, 2024-10-08 minutes not posted.
- 2026-10-25 North Miami donors: desulme_2024.csv written from EasyVote (2024 mayoral campaign Q1 2024 .. TRG Feb 2025; 329 rows, $154,705).
