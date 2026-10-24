# North Miami lobbyist link progress (2026-10-24)

Builder: scratchpad script nm.py (not in repo). Inputs captured here so a rerun resumes.

## Registry
- https://www.northmiamifl.gov/287/Lobbyists IS online now: affidavit listings for 2023-2024 (119), 2024-2025 (113), 2025-2026 (102), 2026-2027 (65 + 14 withdrawals). Full listing text was read via WebFetch (lobbyist | principal | DocumentCenter id).
- Individual affidavit PDFs: server errors / illegible OCR (e.g. View/14512). Dates and issues not read.
- Matched principals to action parties: Botanik Venture (2025-R-60, -61), Redwood CP Dev (2025-R-80, 2026-R-47, 2026-R-110; Devco variant 2025-R-99 flagged), Performance Services (2025-R-161, 2026-R-46), Cigna (2025-R-221, flagged name variant), 12000 Property Owner LLC -> 2025-R-13 (inferred from address; flagged).
- Unmatched registered principals (not parties in actions.json): Alta Bayshore, Alta Developers, Prestige City View, Klaus Haus, Arch Creek Apartments, SV La Belle @ Arch Creek, ISLIP, NoMi Holding Group 2, 1150 Nomi, Oleta Partners, Dezer Museum Properties, MMG Colonial Holdings, TNT Marine, Mariner's Bay, La Maison 123, Water Capital Partners, Magelland Housing, Blue Moon, Cabada, TAUBCO, Keystone 2020, NoMi Village, Red Speed USA, Core & Main, Johnson Controls, Freebee, ProTransportation/Prokel, Sentinel Global Security, PNC Bank, Housing Trust Group, RD Investment Properties, Shady Oaks MHC, Causeway Village, etc.

## Minutes / packets (record basis): NOT DONE
- play.champds.com and playapi.champds.com fetches were refused (permission request timed out). Retry: fetch each meetings[].minutes PDF and the zoning item attachments for applicant + agent names.
- Resolution PDFs on northmiamifl.gov/321/Resolutions have no text layer (2025-R-226, 2026-R-59 tried).

## Meetings done for record basis
(none)
