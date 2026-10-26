# prior-flsenate: progress

Members (Senate service not on the site's Senate list):
- Avila (bryan-avila), SD 39, 2022-11-08 to 2026-08-25 (flsenate.gov/Senators/2024-2026: "Resigned 8/25/2026").
- Taddeo (annette-taddeo), SD 40, 2017-09-26 to 2022-11-08 (flsenate.gov/Senators/2016-2018: "Elected 9/26/2017"; no resignation listed for 2020-2022, so to the end of that term).
- Simpson (wilton-simpson), SD 18 2012-2016, SD 10 2016-2022 (flsenate.gov/Senators/2012-2014 .. 2020-2022, member 5104).
- JJ Rodriguez (jose-javier-rodriguez), SD 37, 2016-11-08 to 2020-11-03 (flsenate.gov/Senators/2016-2018, 2018-2020, member 5202).
- Campbell (daphne-campbell), SD 38, 2016-11-08 to 2018-11-06 (flsenate.gov/Senators/2016-2018, member 5195).
Senate terms begin upon election (Fla. Const. art. III, s. 15(d)); start/end = general election days.

## Endpoints (shell, 2026-10-25)
- flsenate.gov LFIR lists /Session/Appropriations/FY<fy>/LocalFundingRequests: FY2017-18 .. FY2026-27 have data; FY2013-14 .. FY2016-17 pages say "Local Funding Initiative Request data is not available at this time" (no Senate request system posted for those years).
- flsenate.gov bill lists, bill pages, analysis and vote PDFs: shell curl. All fetches go through src/net.py (one request per 6.5-8 s across this slice's processes, 60 s backoff on 429).
- floridalobbyist.gov lobfirml_<year>.pdf: shell curl (2012-2019 saved in lobbyfirms/).
- flgov.com veto lists 2025 and 2026: shell curl (URLs in scripts/state-nixon.mjs).
- dos.elections.myflorida.com: browser only -> needs-browser.md.

## Log
- 18:30 LFIR lists saved (raw/lfr) -> src/parse_lists.py -> lfir-list.json: 703 forms. Avila 64 (FY23-24), 74 (24-25), 82 (25-26), 66 (26-27); Taddeo 3 (18-19), 11, 8, 5 (21-22), 0 (22-23, none on the list); Simpson 17, 48, 47, 50, 8, 7 (17-18..22-23); JJ Rodriguez 11, 12, 21, 23 (17-18..20-21); Campbell 60, 86.
- 18:35 src/fetch_pdfs.py running (Avila first, newest year first).
- 18:40 bills/vote-jobs.jsonl (src/vote_jobs.py): 187 Senate final-passage sheets for qualifying laws already screened by other slices (2025-26 universe 56, flhouse 2022A-2024 87, flsenate 2021-22 44). src/votes.py running; each sheet text kept in raw/votes/ and parsed for all five members.
- 18:45 bills/pfs_enacted_list.py running: enacted lists 2020 back to 2013 (2020 done: 201 rows).
- lobbyfirms/: build.py -> firms.json + firms-by-year.json for 2012-2019 (2020-2024 in ../flsenate/lobbyfirms, 2025-26 in scripts/data/state/lobbyfirms).
- needs-browser.md written: DOE candidate and committee accounts for all five.
- 19:00-20:40 net.py: request starts spaced 6.5 s across processes, download outside the lock; flsenate.gov returns frequent 429s (shared with the House agent), so effective rate is ~1 request per 10-12 s. Unique script names (pfs_*) after a background job of this slice was killed by another agent's pkill pattern.
- GAA texts: 2017 (SB 2500, ch. 2017-70), 2018 (HB 5001, ch. 2018-9), 2019 (SB 2500, ch. 2019-115), 2020 (HB 5001, ch. 2020-111), 2025 (ch. 2025-198), 2026E (ch. 2026-232) from laws.flrules.org chapter PDFs (shell curl). 2021-2024 reused from ../flsenate/raw/gaa.
- Veto lists: flgov.com 2020, 2025, 2026 (raw/gaa/veto<yr>.txt). 2017 and 2019 (Senate-originated GAAs): Governor's veto message in the Senate Journal (2018 and 2020 bound vol. I) -> src/journal_vetoes.py -> raw/gaa/veto2017.json (58 forms), veto2019.json (161). 2018: no list found (flgov.com 404; House-originated, so not in the Senate Journal) -> FY2018-19 vetoUnknown, needs-browser.md item 6. Tried reading strike-through marks in the Laws of Florida PDF (src/strike_vetoes.py): only 236 of 341 2020 veto-list forms matched, too unreliable; not used.
- DONE Avila requests: requests-2023-24.json (64 forms, 43 in budget, 6 vetoed), requests-2024-25.json (74, 48, 16), requests-2025-26.json (82, 50, 15), requests-2026-27.json (66, 47, 7). build-requests.py.
- DONE Avila roll calls: 143 Senate final-passage sheets (2022A 1, 2023 42, 2023C 2, 2024 42, 2025 35, 2026 19, 2026E 2) in bills/rolls.jsonl: yes 121, no 1, excused 19, not voting 2. 2026D/2026F laws: none qualify. AVILA COMPLETE except donors (needs-browser.md 1).
- 2021-2022 rolls for Taddeo/Simpson: running (44 sheets).
- build-requests.py parser extended for FY2017-18..2020-21 forms ("Date of Submission", "Field: value" colons, "If there is a registered lobbyist" block, "State Agency Contacted?" agency). Also fixes a blank "Firm Name" line picking up the next line ("c. E-mail Address ..."): Avila files rebuilt (FY2025-26 changed only those firm fields). The same bug is in ../flsenate/requests-*.json (107 lobbied entries with firm "c. E-mail Address ...": 3/19/32/53 by FY) - reported, not edited.
- build-requests.py: an itemized GAA line closed by ONE period ("(SF 1423) (HF 1306).   2,000,000") was read as a proviso sentence (amount None, or a wrong sum). Fixed here; Avila files changed for 8 forms (FY23-24 1423, 1674, 3140; FY24-25 1728; FY25-26 2272, 2332, 2802, 3451) and Simpson FY22-23 2164 (7.0M -> 3.5M). ../flsenate/build-requests.py has the same regex (reported, not edited).
- DONE requests-2021-22.json (Taddeo 5, Simpson 8), requests-2022-23.json (Simpson 7; Taddeo filed none for FY2022-23).
- DONE rolls for 2021-2022 qualifying laws (44 sheets): Taddeo yes 17 / no 2 ... (see summary), Simpson (President) yes 18 / not voting 1 on 2021 so far.
- bills/enacted.jsonl DONE: 1844 laws, sessions 2013 (272), 2014 (254 + 2014A 1), 2015 (220 + 2015A 11), 2016 (269), 2017 (229 + 2017A 4 + GAA), 2018 (193), 2019 (189), 2020 (201). 2015B, 2015C: no laws. bills/gaps.py added the chapter numbers the list omits (GAAs and HB 7129 2013) from laws.flrules.org; chapter sequences now have no gaps.
