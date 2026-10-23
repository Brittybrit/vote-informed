# Upcoming agendas

One JSON file per posted meeting in this folder: `<body>-<YYYY-MM-DD>.json` (body = the cycle file key: county, schoolboard, city-<slug>). Read from the body's own posted agenda and its backup; every item carries the URL it was read from. `node scripts/upcoming.mjs` merges them into public/data/upcoming.json, matches parties and lobbyists against the ledger, and tags each item.

```json
{
  "body": "county",
  "rosterBody": "mdc-commission",
  "meeting": { "date": "2026-11-17", "time": "09:30", "kind": "regular", "agendaUrl": "", "postedOn": "2026-11-10", "location": "" },
  "checked": "2026-10-23",
  "items": [
    {
      "id": "agenda item number or file number as printed",
      "title": "as printed",
      "kind": "award | contract | zoning | landuse | plat | lease | land | fee | rate | millage | budget | ordinance | resolution | appointment | other",
      "parties": ["private companies, developers, groups or people the item names"],
      "lobbyists": [{ "name": "", "for": "" }],
      "sponsor": "member who sponsored, as printed, or null",
      "fiscal": "the fiscal impact text as printed, or null",
      "amount": 1234.56,
      "location": { "address": "", "district": null, "lat": null, "lng": null },
      "industry": "regulated industry the backup names, or null",
      "topics": ["housing | transit | parks | schools | water | police | fire | libraries | seniors | daycare | nightlife | parking | towing | noise | boating | pets | cycling | business | other"],
      "readings": "first | second | final | null",
      "deferredFrom": "YYYY-MM-DD or null",
      "publicHearing": true,
      "links": [{ "t": "item | backup | memo", "url": "" }]
    }
  ],
  "notes": "items skipped and why; where the agenda stops"
}
```

Rules: parties are only names printed on the item or its backup; no inference from context. The fiscal field is a quote, not a paraphrase. Amount is the single dollar figure in the fiscal statement, else null. Location only when the item prints an address or a district; lat/lng left null for the merge script to fill. Topics from the fixed list only.
