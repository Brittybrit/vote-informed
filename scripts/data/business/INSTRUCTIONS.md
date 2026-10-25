# Business interests: every contract and every vote that ties to them

Goal: for every candidate on the Nov 3, 2026 Miami-Dade ballot (judges excluded), find their business
interests from official records, then find every government contract, payment and vote that ties to
those businesses. Every finding must cite an official record you opened yourself. News stories can point
you to a record; they are never the citation.

## Resume first
Your slice folder has `candidates.json`. Before anything, read `progress.md` in your folder if it exists and
skip candidates marked done. After finishing each candidate, append one line to `progress.md`:
`- <pid>: done | interests N | ties N | notes`. Write findings as you go (append, one JSON object per line),
never only at the end. If you are stopped, a rerun must pick up where you left off.

## 1. Business interests (`interests.jsonl`)
Sources, in order:
- Start from what the repo already has: `scripts/data/disclosures/*.json` (Form 6 / Form 1 / federal forms
  already read) and `public/data/roster.json` (person ids).
- Florida Commission on Ethics filings: https://disclosure.floridaethics.gov (Form 6, Form 1, Form 8B).
  Candidates file Form 6 or Form 1 when they qualify, so challengers have them too.
- Federal candidates: House Clerk (disclosures-clerk.house.gov) or Senate (efdsearch.senate.gov) financial
  disclosures, which include spouse interests.
- Sunbiz (search.sunbiz.org) officer/manager/registered-agent listings. Publishable only when the name AND an
  address matching the candidate's own filing match. Name-only matches: record with `"basis":"name only"`.
- A spouse's or dependent's business counts only when the candidate's own disclosure lists it.

One line per interest:
`{"pid","name","business","role":"owner|officer|director|employee|spouse owner|income source|client","nature","record":{"label","url","date"},"basis":"form|sunbiz name+address|sunbiz name only","checked":"YYYY-MM-DD"}`
Include employers and income sources listed on the form (they are business dealings too). Do not record home
addresses, health, or anything about family members beyond what the form states about a business.
If a candidate has no filing you can find, write one line with `"business":null` and say what you searched.

## 2. Ties (`ties.jsonl`)
For each interest, search for:
- **Contracts and payments** from any government body: Miami-Dade County (procurement awards, Board of County
  Commissioners resolutions, vendor payments at https://www.miamidade.gov/global/finance/), the School Board
  (board agenda items, purchasing awards), each city (agenda items, resolutions, contracts on Legistar /
  Granicus / CivicClerk / NovusAgenda / EasyVote), Florida state contracts and payments (FACTS:
  https://facts.fldfs.com), Florida Department of Education charter funding, and federal awards
  (https://www.usaspending.gov). Also grants, leases, permits, zoning approvals and settlements naming the business.
- **Votes**: any vote the candidate cast on an item where the business (or its parent or subsidiary, as an
  official record states) is a party, vendor, applicant or named beneficiary. Check `public/data/decisions.json`
  and `scripts/data/city/*/actions.json` first, then the body's own minutes. For legislators: bills,
  appropriations or budget line items that name the business or an entity it is paid by, with the roll call.
- Votes by the body where the candidate was absent or abstained count too: record the abstention and any Form 8B.

One line per tie:
`{"pid","business","kind":"contract|payment|grant|lease|zoning|settlement|vote|abstention","body","date","title","amount","candidateVote":"yes|no|abstain|absent|n/a","party":"the exact entity name in the record","link":"how the record ties this entity to the interest","record":{"label","url"},"verified":true}`
`verified:true` only when you opened the official record and it names the entity. Otherwise `verified:false`
with what is missing. Amounts and dates exactly as the record states.

## Rules
- Official records only. No aggregators, no news as citations, no inference from shared surnames.
- Never understate: if a payment total is partial, say "at least" and why.
- Don't guess an entity is related to another; the relationship needs a record (Sunbiz, the disclosure, an audit).
- No edits outside your slice folder. No git commits. Don't touch public/ or other scripts.
- WebFetch may rate-limit. If it does, write progress, then keep going on records already open; retry with URL
  variants (http/https, query string removed). If a site blocks you entirely, note it in progress.md and move on.
- Finish with a short summary in `summary.md`: candidates done, interests found, ties found, what could not be
  reached and why.

## Rule set by Brit (Oct 25, 2026)
Loans or grants any eligible business could get by applying (PPP, EIDL, SBA COVID-era grants and loans,
Shuttered Venue grants) are not official acts and are not counted or shown as ties.
