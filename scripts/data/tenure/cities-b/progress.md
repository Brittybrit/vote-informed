# Tenure slice cities-b: Coral Gables, Doral, South Miami (started 2026-10-25)

Resume notes: one line per finished meeting batch / report. Source scripts kept in each city's src/ folder.

## Tenure starts (from official records)
- Vince Lago (Coral Gables): on the City Commission continuously since 2013-04-13 (Legistar office records, person 724: Commissioner 2013-04-13 to 2017-04-14, Vice Mayor 2017-04-28 to 2021-04-16, Mayor 2021-04-30 on). Tenure start 2013-04-13; first meeting seated 2013-04-23 (investiture 2013-04-12).
- Melissa Castro (Coral Gables): Commissioner from 2023-05-02 per Legistar office record (person 1206); roster says 2023-04-25 (runoff). First regular meeting 2023-05-09 or later.
- Maureen Porras (Doral): seated 2022-12-20 (roster).
- Javier Fernandez, Lisa Bonich, Steve Calle (South Miami): elected 2022-11-08 (roster).

## Access notes
- curl works (no WebFetch needed) for webapi.legistar.com/v1/coralgables, cityofdoral.granicus.com MinutesViewer, southmiami.granicus.com ViewPublisher, voterfocus.com.
- Coral Gables VoterFocus elections: e=2 (2021, Lago ca=5), e=6 (2023, Lago ca=21, Castro ca=27), e=7 (2025, Lago ca=28), e=8 (2026, Lago ca=39, Castro ca=41). Nothing before 2021 on VoterFocus.

## Log
- 2026-10-25: Coral Gables 2013-2016 decisions transcribed (src/decisions/2013.txt-2016.txt) from Legistar items cached in src/legistar-items.json.
- 2026-10-25: Coral Gables 2017-2018 decisions transcribed.
- 2026-10-25: Coral Gables 2019-2021 decisions transcribed.
- 2026-10-25: Coral Gables 2022 decisions transcribed.
- 2026-10-25: Coral Gables 2023 decisions transcribed.
- 2026-10-25: Coral Gables 2024 decisions transcribed. All CG years 2013-04 to 2024-12 transcribed; next: build script to merge into actions.json.
- 2026-10-25: Coral Gables owners.json: 160 pre-2025 address-only actions given owner of record on the action date (PA sales history); 52 unresolved (multi-parcel/condo/not found) listed under tenureUnresolved.
- 2026-10-25: Doral 2022-12-21..2024-12-26 transcribed: 52 meetings parsed (src/tenure/parse_minutes.py -> src/tenure/cache/items.json), 324 qualifying items in src/tenure/decisions.txt, merged by src/tenure/build_tenure.py into actions.json (tenure:true). owners.json created (5 address-only actions). No lobbyist registry for 2022-2024; minutes name none for listed items. Translations for new titles NOT added.
- 2026-10-25: South Miami 2022-11-15..2024-12-10: minutes read from the next meeting's agenda packet (Granicus has none posted); 51 meetings (all regular + most special); src/tenure/{split_minutes,parse_minutes,build_tenure}.py, decisions.txt (249 actions) merged into actions.json (tenure:true). Special meetings 2022-12-20, 2023-01-31, 2023-03-15 not found in any packet.
- 2026-10-25: South Miami 2022 treasurer reports transcribed (src/donors/transcribed_2022.txt + fernandez_2022_m4m5.json), every report reconciled to its summary Cash & Checks except Fernandez M5 (itemized 23,150 vs summary 23,200) and M9 (net 4,535 vs 4,435). CSVs fernandez/calle/bonich_2022.csv plus _2026.csv carrying the hand-typed 2026 rows from public/data/city-reports.json (donorsFor ignores city-reports.json once a CSV exists). 2024 Fernandez TR has only a candidate loan.
- NEXT: es/ht translations for tenure titles (CG 1114, Doral 317, SM 245) into each translations.json.
- 2026-10-25: South Miami es/ht translations done (src/tenure/tr/*.txt, merge.py).
- 2026-10-25: Doral es/ht translations done (src/tenure/tr/*.txt, merge.py).
