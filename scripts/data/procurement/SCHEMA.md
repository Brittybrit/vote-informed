# Procurement register

One JSON file per body (county.json, schoolboard.json, city-<slug>.json). Read from the body's own procurement pages, capital plan and contract records; every row carries the URL it was read from. `node scripts/upcoming.mjs` merges these into public/data/upcoming.json under `procurement`.

```json
{
  "body": "county",
  "rosterBody": "mdc-commission",
  "checked": "2026-10-23",
  "links": { "solicitations": "", "vendorRegistration": "", "sbe": "", "capitalPlan": "", "contracts": "", "protests": "", "inspectorGeneral": "" },
  "solicitations": [
    { "id": "solicitation number", "title": "", "department": "", "type": "RFP | ITB | RFQ | ITN | other", "posted": "YYYY-MM-DD", "questionsDue": "YYYY-MM-DD or null", "preBid": "YYYY-MM-DD or null", "due": "YYYY-MM-DD", "estimatedValue": 1234.56, "term": "plain words or null", "setAside": "SBE | micro | none | null", "buyer": { "name": "", "email": "", "phone": "" }, "location": { "address": "", "district": null }, "url": "", "source": "" }
  ],
  "capitalPlan": [
    { "project": "", "department": "", "location": { "address": "", "district": null }, "fundingSource": "", "amounts": { "FY2026-27": 0, "FY2027-28": 0 }, "total": 0, "status": "planned | funded | under design | under construction", "source": "" }
  ],
  "expiring": [
    { "contract": "", "vendor": "", "department": "", "value": 0, "expires": "YYYY-MM-DD", "renewalsLeft": null, "url": "", "source": "" }
  ],
  "levers": [
    { "key": "vendor-register | certify-sbe | solicitation-questions | pre-bid | comment-at-award | records-request | protest | inspector-general | other", "who": "anyone | vendors | certified small businesses", "how": "", "rules": "", "deadline": "", "url": "", "source": "" }
  ],
  "notes": ""
}
```

Rules: numbers only as printed. A solicitation behind a login (BidSync, DemandStar, BidNet) is listed with whatever the public page shows and `url` to that page. Capital plan rows from the adopted capital budget book, not press. Expiring contracts from the body's own contract register or from agenda items that state the term.
