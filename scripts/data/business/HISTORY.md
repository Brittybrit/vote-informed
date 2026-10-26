# Business interests by year, back to each official's first official action

Brit, Oct 26, 2026: read the financial disclosures as far back as the official actions go (budget requests,
contracts and procurements, laws, grants, zoning), so every action can be checked against the business
interests the official held at that time. This extends scripts/data/business/INSTRUCTIONS.md (read it first;
its rules on sources, privacy and citations all apply). Output goes in your own slice folder under
scripts/data/business/history-<n>/ (given in your task).

## Which years
For each official, every year from the first year of their earliest office listed (public/data/prior/<pid>.json
`offices[].start`, and the current seat in public/data/money-summary.json `giftsFrom`/`since`) through the
latest form on file. One disclosure per year per office held. If they held two offices in a year, one form is
enough when it covers that year.

## Sources
- Florida Commission on Ethics: https://disclosure.floridaethics.gov (electronic filings, about 2019 on;
  Report/PrintForm/?filingId=N works by curl). Older forms: https://ethics.state.fl.us/FinancialDisclosure/
  (search by name; many are scanned PDFs). Form 6 (full: legislators, county, mayors of large cities, School
  Board, Cabinet), Form 1 (most city officials), Form 6F/1F (final), Form 8B (voting conflict memos: record
  every one you find, with the item and date).
- Federal: disclosures-clerk.house.gov (House, candidates and members), efdsearch.senate.gov (Senate).
- Sunbiz (search.sunbiz.org or the Division of Corporations document images) for officer/manager histories of
  each business a form names: the dates someone was added and removed as an officer, dissolution dates.
  Use these only for start/end dates of an interest already on a form, or for a business the record shows they
  ran (name AND matching address).
- Scanned forms with no text: OCR locally (tesseract / ocrmypdf; pip or apt install if missing). If a form is
  illegible, record the year as `"legible": false`.

## Output (append as you go; one JSON object per line)
`history.jsonl` in your folder:
- an interest: `{"pid","year":2016,"form":"Form 6 (2015, filed 2016-06-30)","business":"…","role":"owner|officer|director|employee|spouse owner|income source|client|partner|creditor","nature":"what the form says, short","industry":["tags from scripts/data/industry/state-donors.json vocabulary"],"record":{"label","url"},"basis":"form|sunbiz name+address"}`
  `year` = the calendar year the interest was held per the form (a Form 6 filed in 2016 covers Dec 31, 2015 →
  year 2015; a Form 1 covers the prior calendar year). Repeat the line for every year the form lists it.
- a year with no form found: `{"pid","year","missing":true,"searched":"what and where"}`
- an illegible form: `{"pid","year","legible":false,"record":{"label","url"}}`
- a Sunbiz date: `{"pid","business","sunbiz":"doc number","officerFrom":"YYYY-MM-DD"|null,"officerTo":"YYYY-MM-DD"|null,"dissolved":"YYYY-MM-DD"|null,"record":{"label","url"}}`
- a Form 8B: `{"pid","form8b":true,"date","body","item","interest","record":{"label","url"}}`
Also write progress.md (one line per official when done: years found / missing / illegible) and summary.md.

`industry`: one to three tags from the existing donor-tag vocabulary that describe what the business does
(a law firm → law-firm; a hospital system → hospitals; a realtors' association → realestate-dev or trade-association).
Government employers (a county department, a public university, a school district) get the tag `government`.

## Rules
- Official records only. Record what the form says; never infer an interest the form does not state.
- The rules Brit approved (Oct 26) are applied later by the matching step, not by you: just record every year.
- Keep home addresses, health and family details out (INSTRUCTIONS.md).
- No edits outside your folder. No commits. No browser tools (another job may need the browser; write needed
  pages to needs-browser.md in your folder instead).
