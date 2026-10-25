# Tenure slice cities-a: North Miami, Aventura, North Miami Beach, Opa-locka

## Tenure starts (verified)
- North Miami: Desulme on council since 2015 (District 4, then mayor from 2022-12-13, continuous; Biscayne Times). Estimé-Irvin 2019-06-04. Timothé 2021-06-01.
- Aventura: Weinberg mayor since Nov 2022 (elected unopposed Aug 2022, took office after Nov general election). His earlier commission terms 2010-2018 are not continuous with the current one (AOL/Miami Herald: "previously elected to the Aventura commission in 2010 and his second term ended in 2018"), so tenure = Nov 2022.
- NMB: Chernoff 2022-11-22 (runoff), Smith 2022-11-08.
- Opa-locka: Ervin first sat 2022-12-14 (elected 2022-11-08; sworn in after certification). Bass: current continuous service from her appointment 2021-08-18 (resolution at the special meeting that day; sworn in 2021-09-08) to fill the late Alvin Burke's seat, then elected Nov 2022. She also served Nov 2018 - Nov 2020 (Pigatt's unexpired term; minutes from Nov 2019 show her seated) but lost in Nov 2020 and was off the commission Dec 2020 - Aug 2021, so that is a separate tenure.

## Method
- Tenure actions live in scripts/data/city/<slug>/tenure/actions.json (source of truth for pre-2025 actions) and are merged into
  scripts/data/city/<slug>/actions.json by `python3 scripts/data/tenure/cities-a/merge_tenure.py <slug>` (idempotent:
  replaces actions/meetings whose ids/dates come from the tenure file, keeps everything else). If actions.json is
  rebuilt by the older builders (_small/src/build.py, northmiami/src/build_nm.py), rerun merge_tenure.py.
- Former members who voted in the earlier years are added to body.json members with former: true.
- Shell curl reaches playapi.champds.com (North Miami), opalockafl.api.civicclerk.com, nmb.novusagenda.com, ecf-api.easyvoteapp.com (with Origin header).

## Log (append one line per meeting / report finished)
- 2026-10-25 North Miami: indexed CHAMP (playapi.champds.com/northmiamifl/event/1..640, City Council board) and city AgendaCenter
  (catID=5, 2017-Apr 2018). Read every council summary minutes 2017-01-10 .. 2024-12-10 (169 meetings; parser copied to
  tenure/cities-a/northmiami-src/: run from a work dir holding nm/ev/*.json and nm/pdf/*.txt, see champ-index.json). Wrote northmiami/tenure/actions.json (505 actions:
  2017 51, 2018 61, 2019 54, 2020 34, 2021 47, 2022 84, 2023 76, 2024 98) and merged with merge_tenure.py (actions.json now 653).
  Gaps: 2015-2016 minutes not online; Apr 24-Jun 12 2018 not found; 2020-04-07/04-14, 2020-10-27, 2024-10-08 minutes not posted.
- 2026-10-25 North Miami donors: desulme_2024.csv written from EasyVote (2024 mayoral campaign Q1 2024 .. TRG Feb 2025; 329 rows, $154,705).
- 2026-10-25 Opa-locka: CivicClerk events before Oct 2022 carry publishedFiles Minutes (GetMeetingFileStream(fileId=N,plainText=false) returns the PDF); downloaded 108 minutes Nov 2019 - Jul 2022 plus 96 attached minutes Sep 2022 - Dec 2024 (scratchpad ol/minold, ol/min). Read every commission meeting 2021-08-18 .. 2024-12-11 (119 meeting minutes; parser in tenure/cities-a/opalocka-src, run from a work dir with ../ol/). Wrote opalocka/tenure/actions.json (202 actions: 2021 21, 2022 64, 2023 42, 2024 75; 11 with an unknown vote) and merged (actions.json now 336, window from 2021-08-18). owners.json created (33 address-only items, Property Appraiser owner of record); lobbyists.json +23 record-named attorneys/agents. body.json + former Williams, Davis, Dominguez, Pigatt. Gaps: no minutes for 2023-11-22, 2023-12-27, 2024-06-12, 2024-10-09, 2024-11-27, 2024-12-25 regular meetings (agenda only/cancelled), 2023-09-20 and 2023-11-29 special meetings.
- 2026-10-25 Opa-locka donors: bass_2022.csv (25 rows, $12,708.69) and ervin_2022.csv (37 rows, $30,933) rewritten from the 2022 report PDFs' itemized pages (olrep/). Bass 2018/2020 reports not online (EasyVote starts 2022; city site has none).
