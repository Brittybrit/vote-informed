# Office contacts

One JSON file per body in this folder (county.json, school-board.json, city-<slug>.json). Hand-researched from the body's own site; every row carries the URL it was read from. Unknown = null. `node scripts/contacts.mjs` merges them into public/data/contacts.json, keyed by roster office id.

```json
{
  "rosterBody": "mdc-commission",
  "checked": "2026-10-23",
  "offices": [
    {
      "office": "mdc-commission-5",
      "holder": "Vicki L. Lopez",
      "email": "district5@miamidade.gov",
      "phone": "305-375-5924",
      "officeAddress": "Stephen P. Clark Center, 111 NW 1st St, Suite 220, Miami, FL 33128",
      "districtOffice": { "address": "", "phone": "", "hours": "" },
      "contactUrl": "https://www.miamidade.gov/global/government/commission/district05/home.page",
      "staff": [ { "role": "chief of staff", "name": "", "email": "" } ],
      "source": "url the row was read from"
    }
  ],
  "body": {
    "clerkEmail": "", "clerkPhone": "", "clerkUrl": "",
    "commentEmail": "address written comment goes to, if any",
    "recordsRequestUrl": "",
    "source": ""
  },
  "notes": "what was not found and where it was looked for"
}
```

Rules: office ids are the roster's (public/data/roster.json, offices[].id). Emails and phones only from the body's own pages, never guessed from a pattern unless the page states the pattern. Staff rows only when the page lists them.
