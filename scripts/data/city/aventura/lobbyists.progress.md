# Aventura lobbyist links - progress (2026-10-24)

## Registry
- ONLINE: https://www.cityofaventura.com/DocumentCenter/View/4161/Registered-Lobbyists-and-Principals (2026 list updated 5/06/2026) - read in full. Gives lobbyist, firm, principal, month/year registered. No issue column.
- Laserfiche DocView/ElectronicFile links return cookie-error pages to WebFetch (no text).

## Record (minutes in later agenda packets)
- 06/02/2026 packet (_06022026-505) read: May 5, 2026 minutes name Brian S. Adler (Bilzin Sumberg) "on behalf of the applicant" for Aventura 2999 (8C, Res 2026-30) and Medical Offices of Uptown Aventura (8D Res 2026-31, 8E Res 2026-32). May 7 workshop: Marrero + Jeffrey Davis for Aventura Corporate Center (no action).
- 05/05/2026 packet (_05052026-496) read: April 7 minutes - Adler on behalf of Aventura 2999 (TC1 hotel ordinance first reading).
- 06/03/2025 recap: no names.
- Failed (server error / rate limit): agendas _07012025-447, _03042025-423, _03032026-482, _07072026-509, _05062025-434, _07242025-449, _04072026-487. Retry one at a time.

## Status after pass 1 (2026-10-24)
- lobbyists.json written: 24 actions with registry/record links, 3 otherBody-only (2025-62 PBA, 2025-63 and 2026-23 Axon).
- Read OK: _04082025-429 (Mar 4 2025 minutes + Centtral agent Rosenthal), _09082026-516 (July 7/23 2026 minutes), _10082025-466, _02032026-478, _05212026-502, _03192026-485.
- Hit hourly WebFetch limit. To resume: retry the failed packets listed in notFound, one at a time; add record links; rerun build.py logic (scratchpad, not in repo) or edit JSON directly.
