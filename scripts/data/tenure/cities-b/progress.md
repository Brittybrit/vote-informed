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
