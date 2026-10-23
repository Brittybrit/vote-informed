# Local governance cycle files

One JSON file per body in this folder (county.json, school-board.json, city-<slug>.json). Hand-researched; every date carries the URL it was read from. Unknown = null, never a guess. `node scripts/cycles.mjs` merges them into public/data/cycles.json.

```json
{
  "key": "county",
  "rosterBody": "mdc-commission",
  "name": "Miami-Dade County Commission",
  "jurisdiction": "Miami-Dade County",
  "level": "county",
  "checked": "2026-10-23",
  "links": { "home": "", "calendar": "", "agendas": "", "minutes": "", "video": "", "clerk": "" },
  "meetings": {
    "pattern": "plain words: e.g. first and third Tuesday, 9:30 a.m., Stephen P. Clark Center chambers",
    "agendaLeadDays": 7,
    "schedule": [ { "date": "2026-11-05", "time": "09:30", "kind": "regular | zoning | budget-hearing | workshop | special", "note": "", "source": "url" } ]
  },
  "phases": [
    { "key": "budget-proposal | budget-hearings | fiscal-year-start | qualifying | campaign | election | swearing-in | recess | regular",
      "name": "plain words",
      "start": "2026-07-15", "end": "2026-07-15", "repeats": "yearly | once",
      "decides": "what gets decided in this window, one sentence",
      "source": "url" }
  ],
  "levers": [
    { "key": "public-comment | written-comment | contact | records-request | petition | referendum | recall | qualify | vote | serve-on-board",
      "how": "one or two sentences on the procedure",
      "rules": "time limit, sign-up, where, who may speak",
      "deadline": "plain words, relative to the meeting or phase, or null",
      "url": "where to do it", "source": "url the rule was read from" }
  ],
  "elections": {
    "next": "2026-11-03",
    "qualifying": { "start": null, "end": null, "source": null },
    "terms": "four years, staggered; plain words",
    "source": "url"
  },
  "contacts": [ { "role": "clerk | commission office | mayor", "name": "", "email": "", "phone": "", "url": "", "source": "" } ],
  "notes": "anything a reader of the file needs to know: gaps, where the schedule stops, what was not found"
}
```

Rules:
- Dates are the body's own calendar or code, not news. Charter and code sections for petition, referendum and recall are quoted by section number with the URL.
- Public comment rules come from the body's rules of procedure or the agenda's own notice, not from a news story.
- The schedule covers the rest of 2026 and whatever of 2027 the body has posted. Note where it stops.
- If a city's site posts nothing usable for a field, the field is null and `notes` says what was checked.
