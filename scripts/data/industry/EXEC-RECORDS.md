# Executive donors: official records of a stake (Brit, Oct 27, 2026)

A donor counts as "the business a law helps" only when the law affects that donor's own money. An owner title
(OWNER, PRESIDENT, CEO, FOUNDER, PARTNER, MANAGING MEMBER, SELF-EMPLOYED) next to the business counts on its own
(INSTRUCTIONS.md rule 2). An executive title without ownership (EXECUTIVE, EXEC, CFO, COO, VP, VICE PRESIDENT, CHAIRMAN,
DIRECTOR, MANAGING DIRECTOR, GENERAL MANAGER, PRINCIPAL, CHIEF ... OFFICER) next to the business counts only when an
official record shows the person's stake in a company of the class the law helps:

- (a) Florida Sunbiz lists them as an officer, director, manager/managing member, or registered agent who is also an
  officer of that company. The name must match and the company must be in the class; when Sunbiz gives an address for
  the person, it must match an address on the gift reports.
- (b) An SEC filing (DEF 14A proxy, 10-K Item 10, Form 3 or 4) names them an executive officer, director or 10% owner
  of that company.

Employees with no such record stay out. Never tie on a guess; never infer from a shared surname.

Code: `scripts/lib/donor-class.mjs` rule 5 (`execRecord`, `execPending`, `recordFor`). Tests: `tests/donor-class.test.mjs`.

## Files

| File | What it is | Built by |
|---|---|---|
| `exec-candidates.json` | Every individual gift the rule leaves out today only because the occupation is executive-type, on a card that otherwise counts (contested floor vote, member voted yes; current Florida House and Senate lists and earlier legislative seats). Donor, occupation(s), address, amount, date, candidate, cards and class. `resolved: true` once the donor has a record. | `node scripts/exec-candidates.mjs` |
| `exec-records.json` | The records: `{records: {DONOR KEY: {company, role, source, business, businessUrl, recordUrl, quote, address, also, checked}}}`. Filled by hand from the record itself. | by hand (SEC now, Sunbiz pass later) |
| `exec-sunbiz-search.tsv` | The Sunbiz worklist: one row per candidate donor without a record (search name, employer as reported, occupations, address, city, gifts, dollars, candidates, what the SEC search found). | `node scripts/exec-sunbiz-list.mjs` |

Budget requests and an officer's own office actions do not use the donor class, so nothing there waits on a record.

## The donor key

The donor's name as the report gives it, upper case, periods/commas/quotes dropped, single spaces: `MILLER STUART A`.
A record is per key; a different report spelling (`BAUER CLIFF`, `BAUER CLIFFORD J`) is its own key and needs its own
record after the same check.

## When a record counts for a law

All of these, checked by `execRecord` on every build:
1. The gift's reported occupation (or another occupation the donor reported in the same reports) has an executive title
   and names the business the law's class names (`HEALTHCARE EXECUTIVE`, `CONSTRUCTION COMPANY EXECUTIVE`).
2. The record has `company`, `recordUrl` and `quote`.
3. The record's company is in the class: its name, or its `business` as an official record states it (the SEC industry
   code from `data.sec.gov/submissions/CIK##########.json`, or the company's own 10-K line), matches the class phrases;
   or the occupation names that company.

By hand, before adding a record:
- The record's name is the donor's (first, last, and middle initial when both give one).
- The address on the record matches an address on the gift reports whenever the record gives the person's own address
  (Sunbiz officer address; SEC Form 3/4 reporting-owner address). Company-address-only records need the gift address to
  be that company's address, or a second record tying the person to it.
- The record covers the gift's years (a role that began after the gifts, or a company that was gone before them, does
  not count).
- The company's business is the business the law helps, not a holding company, a blank-check company, a fund or a
  landlord whose name happens to contain the class word.

## SEC pass (done Oct 27, 2026)

Full-text search, one query per name variant ("First Last", "First M. Last"), forms DEF 14A, 10-K, 3, 4:

```
curl -A "Ballot305 research press@ballot305.org" \
  'https://efts.sec.gov/LATEST/search-index?q="Stuart A. Miller"&forms=DEF%2014A,10-K,3,4'
```

Then the person's own filer page (`https://data.sec.gov/submissions/CIK##########.json`, mailing address and filing
list), the company's (`sic`, `sicDescription`, business address), and the filing itself
(`https://www.sec.gov/Archives/edgar/data/<cik>/<accession without dashes>/<document>`): for a Form 4 read
`rptOwnerName`, `rptOwnerStreet1`, `rptOwnerCity`, `rptOwnerZipCode`, `isDirector`, `isOfficer`, `isTenPercentOwner`,
`officerTitle`, `issuerName`. Node needs `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` to reach
sec.gov through the agent proxy; curl works as is.

Result: 2 donors tied (Stuart A. Miller, Lennar; George Feldenkreis, Perry Ellis), both with the person's own Form 4
address equal to the gift address. Eight other names had SEC filings that did not tie; the reason is in the
`sec_note` column of `exec-sunbiz-search.tsv`.

## Sunbiz pass (browser, same origin)

Result (Oct 27, 2026): all 39 donors on the worklist searched; 0 tied. Most Sunbiz entries list the person only at a
company address, or at the gift address only for a nonprofit or a company whose business the record does not state. The
reason for each is in the `sunbiz_note` column of `exec-sunbiz-search.tsv`.


search.sunbiz.org sits behind a Cloudflare challenge, so it is read in a browser tab (Claude in Chrome or the built-in
browser), with `fetch` from a page already on search.sunbiz.org.

1. Open `https://search.sunbiz.org/Inquiry/CorporationSearch/ByOfficerOrRegisteredAgent` once (passes the challenge).
2. For each row of `exec-sunbiz-search.tsv`, fetch the results list (the name is LAST FIRST, as in `search_name`):
   `https://search.sunbiz.org/Inquiry/CorporationSearch/SearchResults?inquiryType=OfficerRegisteredAgentName&searchTerm=<LAST%20FIRST>`
   If that returns the search form instead of a list, submit the form on the page (field `SearchTerm`, button
   "Search Now") and use the results page's own URL and paging links ("Next List").
3. Results table columns: Officer/Registered Agent Name, Entity Name, Document Number, Status. Keep rows whose name is
   the donor's (same first name; middle initial equal when both give one). Open each kept row's link
   (`/Inquiry/CorporationSearch/SearchResultDetail?inquirytype=OfficerRegisteredAgentName&...&aggregateId=...`).
4. From each detail page read:
   - Entity name; Filing Information: Document Number, FEI/EIN Number, Date Filed, State, Status, Last Event.
   - Principal Address and Mailing Address.
   - Registered Agent Name & Address.
   - Officer/Director Detail: every `Title` (P, VP, CEO, CFO, D, MGR, MGRM, AMBR, AP, T, S ...), name and address.
   - Annual Reports (years filed) and the Document Images list (the annual report for the gift's year is the record
     to cite; its URL is under Document Images).
5. A match is: the donor's name under Officer/Director Detail with a title, or as Registered Agent when the same
   person is also an officer; the officer address (or principal address, when the person is listed with it) equals an
   address on the gift reports; the company's business is the class (its name, or the business the occupation names
   with the same employer). Write the record:
   `{company, role: "<Title as Sunbiz gives it> (<what it means>)", source: "Sunbiz", business, recordUrl: <annual
   report image or detail URL>, quote: "<the Officer/Director Detail line exactly>", address, checked}`.
6. No match, several possible people, or no address to compare: no record. Note it in the TSV row instead.

Then rebuild (below). The candidates file marks resolved donors; the cards pick up the gifts with the record attached
(`gift.record: {company, role, url}`).

## Rebuild order

```
node scripts/exec-candidates.mjs && node scripts/exec-sunbiz-list.mjs
node scripts/federal-earmarks.mjs && node scripts/state-bills.mjs && node scripts/state-firm-gifts.mjs && node scripts/leads.mjs && node scripts/money-summary.mjs
node scripts/business.mjs && node scripts/prior-offices.mjs && node scripts/gaps.mjs && node scripts/research-index.mjs && node scripts/you-files.mjs
npm test
```
