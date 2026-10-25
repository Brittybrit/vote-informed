# flsenate tenure slice: progress

Members: Calatayud (seated Nov 8 2022, SD 38), Rodriguez (Nov 3 2020, SD 39 then SD 40 from Nov 2022), Garcia (Nov 3 2020, SD 37 then SD 36 from Nov 2022), Ingoglia (Nov 8 2022 to Jul 21 2025, SD 11).
Earlier sessions to add: 2021 regular (+2021A May special), 2022 regular (+2022A Apr, 2022B Apr, 2022C? , 2022D Dec), 2023 regular (+2023A Jan? 2023B Feb, 2023C Nov), 2024 regular.
LFIR fiscal years to add: FY2021-22 (2021 session), FY2022-23, FY2023-24, FY2024-25.

## Endpoints (from shell, 2026-10-25)
- works via shell curl: flsenate.gov /Session/Appropriations/FY20XX-YY/LocalFundingRequests (HTML table, 1-2 MB) and LFIR PDFs under /PublishedContent/Session/FiscalYear/...; 429 if faster than ~1 request per 5-10 s; back off 30-60 s.
- laws.flrules.org -> 200 via curl.
- dos.elections.myflorida.com contrib.exe -> Cloudflare challenge (403) from shell; WebFetch -> "error while fetching".

## Log
- 2026-10-25 start. LFIR lists saved in raw/: FY2021-22, FY2022-23, FY2024-25 (FY2023-24 429, retry).
