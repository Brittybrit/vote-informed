# Who gets paid: staffing and contractors

One JSON file per body (county.json, schoolboard.json, city-<slug>.json). From the body's own open data, budget book and payroll disclosures; every row carries the URL it was read from. `node scripts/upcoming.mjs` merges these into public/data/upcoming.json under `payments`.

```json
{
  "body": "county",
  "rosterBody": "mdc-commission",
  "checked": "2026-10-23",
  "datasets": [
    { "name": "Employee salaries", "what": "one row per employee: department, title, base pay, overtime", "url": "", "api": "endpoint if the portal exposes one, else null", "asOf": "YYYY-MM-DD or period", "fields": ["department", "title", "base", "overtime"], "source": "" }
  ],
  "staffing": {
    "fiscalYear": "FY2026-27",
    "positionsTotal": 0,
    "payrollTotal": 0,
    "byDepartment": [ { "department": "", "positions": 0, "payroll": 0, "change": 0, "source": "" } ],
    "highestPaidTitles": [ { "title": "", "department": "", "pay": 0, "source": "" } ],
    "source": ""
  },
  "vendors": {
    "period": "FY2025-26 or calendar 2025",
    "total": 0,
    "top": [ { "vendor": "", "amount": 0, "department": "", "what": "", "source": "" } ],
    "source": ""
  },
  "unionContracts": [ { "union": "", "covers": "", "term": "", "expires": "YYYY-MM-DD or null", "lastAction": "ledger action id or null", "source": "" } ],
  "levers": [
    { "key": "budget-hearing | position-list | records-request | comment-at-award | union-contract-vote | audit | other", "who": "anyone", "how": "", "rules": "", "deadline": "", "url": "", "source": "" }
  ],
  "notes": ""
}
```

Rules: numbers only as printed or as the dataset returns them; say the period. Top vendors: at least 25 where the data allows, with what they are paid for when the record says. No names of individual employees; titles and departments only (pay by title is public, the register is not a directory).
