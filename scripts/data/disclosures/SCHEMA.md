# Disclosures and conflicts of interest

One JSON file per body (county.json, schoolboard.json, city-<slug>.json). From official records only: the official's own financial disclosure (Florida Form 6 or Form 1, filed with the Commission on Ethics), voting-conflict memoranda (Form 8B) and abstentions in the body's minutes, ethics commission opinions and complaints, and corporate records (Sunbiz) where the officer's name and filed address match. `node scripts/disclosures.mjs` merges them into public/data/disclosures.json and matches stated interests against the ledger and upcoming items.

```json
{
  "body": "county",
  "rosterBody": "mdc-commission",
  "checked": "2026-10-23",
  "officials": [
    {
      "person": "vicki-l-lopez",
      "office": "mdc-commission-5",
      "forms": [
        { "type": "Form 6 | Form 1", "year": 2025, "filed": "YYYY-MM-DD", "url": "",
          "netWorth": 0,
          "assets": [ { "name": "", "kind": "real property | business interest | securities | other", "value": 0 } ],
          "incomeSources": [ { "source": "", "kind": "employer | business | rental | other", "amount": 0 } ],
          "liabilities": [ { "creditor": "", "amount": 0 } ],
          "businesses": [ { "name": "", "role": "owner | officer | director | employee", "nature": "" } ],
          "source": "" }
      ],
      "sunbiz": [ { "entity": "", "docNumber": "", "role": "", "status": "", "address": "", "basis": "name and filed address match | name only", "url": "" } ],
      "abstentions": [ { "date": "YYYY-MM-DD", "item": "", "reason": "as stated in the Form 8B or minutes", "url": "" } ],
      "ethicsMatters": [ { "kind": "opinion | complaint | finding", "date": "YYYY-MM-DD", "summary": "", "url": "" } ],
      "relatives": [ { "name": "", "relationship": "", "basis": "the official record that states the relationship", "entity": "employer or business, as that record states", "url": "" } ],
      "notes": ""
    }
  ],
  "rules": { "conflictOrdinance": "section and URL", "abstentionRule": "", "ethicsBody": "" },
  "notes": ""
}
```

Rules that matter more here than anywhere else:
- A relative is listed only when an official record states the relationship (a Form 8B, an ethics opinion or complaint, the official's own disclosure, a sworn statement in minutes). A shared surname on Sunbiz or a news story is not a basis; leave it out entirely.
- Sunbiz rows with basis "name only" are kept but flagged; the merge marks them unconfirmed.
- Figures as filed, with the year. Form 6 net worth is as filed.
- Nothing about the official's health, family members' private lives, or home address beyond what the form itself prints as a business address.
