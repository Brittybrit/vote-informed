# Public money to political money (stage 1: inventory and search plan)

The check: an official on the Nov 3, 2026 ballot took an official action that directed or approved public money to an
organization, and that organization (or an organization an official record shows it paid) then gave money to a
political committee or candidate. Stage 1 lists the recipients and says how to search for their political giving.
Nothing here is shown to voters yet.

Motivating case: Ashley Moody (Attorney General 2019-2025, on the ballot for U.S. Senate). The Sept. 27, 2024 Centene
settlement, to which the State was a party "by and through its Attorney General", directed $10M of the State's
recovery to The Hope Florida Foundation, Inc. (manual-actions.json). Press reports say the foundation then sent $5M
each to Secure Florida's Future and Save Our Society From Drugs, which gave to Keep Florida Clean, the committee
against 2024 Amendment 3. Each of those links still needs its own official record (below).

**Never cite the Leon County grand jury presentment on Hope Florida.** The 1st DCA expunged it on Oct 7, 2026.

## The rule (Brit, Oct 27, 2026)

A flag needs both:

- **(a) An official action** by the official that directed or approved public money to recipient R: a yes vote on an
  award, contract, grant, funding item or change order naming R; a budget or earmark request the official filed for R;
  a grant the official's own office made to R; a settlement or agreement the official's office signed that directs
  public money (money the State recovered or holds) to R. The action file must give the official's vote or act from
  the body's own record. `unknown` votes (minutes give none) never make a flag. A budget request counts only for the
  money that made the final budget (`funded`).
- **(b) An official contribution record** showing R, or a recipient R2 that an official record shows R paid (e.g.
  R's IRS Form 990 Schedule I grants list, R2's 990 revenue lines, a DOE or FEC report listing R as the source of a
  transfer), gave money to a political committee or candidate **within 24 months after R received the money**. The
  receipt date is the payment date when a record gives it, otherwise the action date (say which).

Showing it:

- Show the chain link by link, each with its record: action (official, date, amount, record URL), then each payment
  (who, to whom, date, amount, record URL). Nothing in the chain may come from press reports alone; press can point to
  a record, never replace it.
- Never say or suggest the official intended, arranged or knew of the later giving. Say what the records show,
  in order, and stop.
- Never connect two records on a shared name alone. A contribution row is R's only when the name matches **and** the
  contributor address on the row matches an address an official record gives for R (the action record, R's Sunbiz
  principal or mailing address, R's IRS filing address), or the row carries an ID that matches (FEC committee ID,
  DOE account number). A name-only hit is kept as `unconfirmed` and never shown.
- Never understate. When a search was partial (a record not reachable, a row limit hit, a year not online), totals
  say "at least" and the gap is named.
- The money must be public: tax dollars, State or local funds, federal pass-through grants, or money the government
  recovered and directed (a settlement's settlement amount). A private party's own payment that no government
  directed is not public money.

## Files

| File | What |
|---|---|
| `recipients.json` | One row per distinct non-government recipient with every action (official pid, action id, date, kind, vote, amount, record URL). Built by `node scripts/politics-money-recipients.mjs`. |
| `manual-actions.json` | Actions read by hand from the record, with exact quotes: the Centene settlement. Also the Hope Florida chain organizations and their EINs. |
| `doe-search.tsv` | Contributor names for the Florida Division of Elections browser pass, in priority order. |
| `fec-search.tsv` | Contributor names to check in FEC Schedule A (federal committees). |

### recipients.json

Built from the published action lists, so it follows the same standard as the site (scripts/data/tenure/STANDARD.md,
PRIOR.md):

- current seats: `public/data/decisions/<body>.json`, each on-ballot member's own yes votes and budget or earmark
  requests (state requests carry the final-budget status from the General Appropriations Act and veto list);
- earlier seats: `public/data/prior/<pid>.json` (scripts/prior-offices.mjs): council, commission, school board and
  Cabinet votes, the Attorney General's office grants (Division of Victim Services annual reports, FY 2019-20 to
  2023-24, non-government grantees), FDACS's own easement purchases, and earlier legislative budget requests. If
  that folder is empty because a rebuild is running, the script reads the committed copy;
- addresses, only where a record gives one: the action record (tenure action files) and the House CPF tables
  (`scripts/data/federal/requests.json`);
- `manual-actions.json`.

Left out and counted in `counts`: government bodies (cities, counties, school boards, agencies, public universities
and colleges, districts, authorities), names that look like a person (listed in `peopleLeftOut` so a business
misread as a person can be put back), placeholders such as "contractor (not named in minutes)" (`placeholdersLeftOut`),
and the Attorney General's own settlements where a company pays the State (no public money to the company).

`actions[].money` is `paid` when the kind is a payment to the party, `unclear` when it can run either way
(agreement, settlement, lease, land: read the record). `qualifying` counts actions with a yes, request or act and
`money: paid`. Grouping is by name with suffixes stripped; two rows of one key are the same name, not proven the same
entity. Amounts over $5 billion on a local item are flagged `amountSuspect` (a parsing error upstream: e.g. "$6300000
million" in scripts/data/tenure/prior-county/actions.json, county items 110851 and 072312) and left out of ranking.

Counts at this build (Oct 27, 2026; see `counts` in the file for the current numbers):

| Source of the action | Recipients | with a qualifying action |
|---|---|---|
| earlier seat votes (county, cities, school board, Parkland, Broward) | 6,167 | 4,584 |
| current seat votes (County Commission, cities) | 2,910 | 2,092 |
| state budget requests, current seats | 488 | 488 |
| state budget requests, earlier seats | 312 | 312 |
| Attorney General office grants (Moody) | 171 | 171 |
| Cabinet votes (Board of Trustees land and easement purchases) | 141 | 116 |
| federal earmark requests | 37 | 37 |
| statewide office acts (FDACS easements and funding) | 20 | 20 |
| read by hand (Centene settlement) | 1 | 1 |
| **distinct recipients** | **9,191** | **7,001** |

A recipient can come from more than one source, so the rows do not add to the total. 2,087 government party
names, 63 person-like names and 91 placeholders were left out.

## Division of Elections search (state candidates and committees)

dos.elections.myflorida.com answers 403 (Cloudflare) to the shell, WebFetch and curl. Earlier pulls ran in a browser
on the DOE site with a same-origin POST (scripts/data/tenure/doe-browser/README.md, tenure/flhouse/progress.md); the
worker (src/worker.js, `flContribTsv`) posts the same form. Use that method.

**Page:** open `https://dos.elections.myflorida.com/campaign-finance/contributions/` in the browser, then run the
POSTs from that page (same origin; the Cloudflare cookie rides along).

**Request:** `POST https://dos.elections.myflorida.com/cgi-bin/contrib.exe`,
`Content-Type: application/x-www-form-urlencoded`, body (every field sent, in this order, as the worker sends them):

```
election=All
search_on=1
CanFName=
CanLName=
CanNameSrch=2
office=All
cdistrict=
cgroup=
party=All
ComName=
ComNameSrch=2
committee=All
cfname=
clname=<search_term>          contributor last name / organization name
namesearch=2
ccity=
cstate=
czipcode=
coccupation=
cdollar_minimum=
cdollar_maximum=
rowlimit=5000
csort1=DAT
csort2=AMT
cdatefrom=01/01/2016
cdateto=
queryformat=2                  tab-delimited text
Submit=Submit
```

`search_on=1` is the mode in which DOE applies the name filters (flhouse/progress.md: with search_on=2 or 3 it ignored
ComName and returned the whole database, 1.3M rows). `namesearch=2` is the same match mode as `CanNameSrch=2` and
`ComNameSrch=2`, which matched names that contain the term ("Common Sense For Florida" also returned "Common Sense for
Florida's Heartland").

**Check before the batch (the contributor-name fields have not been used in this repo before):**

1. Read the form on the page and write down the labels for `search_on` values and for `namesearch` 1 and 2. If
   contributor-name search needs a different `search_on` value, use it and fix this README.
2. Negative control: `clname=Zzqxv Nonexistent` must return a header and no rows. If it returns thousands of rows, the
   filter was ignored: stop.
3. Positive control: `clname=Secure Florida` should return 2024 rows to Keep Florida Clean (the press-reported gift).
   Keep the TSV: it is the first record for the chain.

**Each name in `doe-search.tsv`:** search `search_term`. When `search_name` has punctuation (apostrophe, `&`, comma),
also search `search_name` as written. If a search returns `rowlimit` rows, split the date range in halves until each
piece fits (as `flContribAll` in src/worker.js does). If the text has `Error in /cgi-bin`, `ODBC` or `Query timeout`,
the search failed: retry later, never record it as zero.

**Save** each response unchanged to `scripts/data/politics-money/doe/<key>.tsv` (key with spaces as `-`, lower case),
and one line per search to `scripts/data/politics-money/doe/searches.jsonl`:
`{"key", "term", "from", "to", "rows", "total", "status": "ok"|"failed", "searched": "YYYY-MM-DD"}`. Row count and cent
total are computed in the page, as in the earlier pulls.

Browser loop (paste on the DOE contributions page; `names` is the `search_term` column):

```js
const body = t => new URLSearchParams({ election: 'All', search_on: '1', CanFName: '', CanLName: '', CanNameSrch: '2', office: 'All',
  cdistrict: '', cgroup: '', party: 'All', ComName: '', ComNameSrch: '2', committee: 'All', cfname: '', clname: t, namesearch: '2',
  ccity: '', cstate: '', czipcode: '', coccupation: '', cdollar_minimum: '', cdollar_maximum: '', rowlimit: '5000',
  csort1: 'DAT', csort2: 'AMT', cdatefrom: '01/01/2016', cdateto: '', queryformat: '2', Submit: 'Submit' });
const out = [];
for (const t of names) {
  const r = await fetch('/cgi-bin/contrib.exe', { method: 'POST', body: body(t) });
  const x = await r.text();
  const bad = !r.ok || /Error in \/cgi-bin|ODBC|Query timeout/i.test(x);
  const rows = x.split(/\r?\n/).slice(1).filter(l => l.split('\t').length > 6);
  out.push({ term: t, status: bad ? 'failed' : 'ok', rows: rows.length, total: rows.reduce((s, l) => s + Math.round(parseFloat(l.split('\t')[2]) * 100), 0) / 100, tsv: x });
  await new Promise(res => setTimeout(res, 2000));   // 2 s between requests, as for every host
}
```

**Order and size:** 9,119 names. Tiers: `chain` (3: Hope Florida Foundation, Secure Florida's Future, Save Our
Society From Drugs), `qualifying` (5,302, largest qualifying dollars first), `qualifying-before-2014` (1,647: the
last qualifying action is before 2014, so a since-2016 search cannot fall inside its 24-month window; run these with
`cdatefrom` set to the action date, or last), `unknown-vote-or-unclear` (2,167: only unknown votes or two-way kinds;
searched last, a hit needs the record read first). At 2 s per search, the first two tiers take about 3 hours.

**Matching a row to a recipient:** DOE rows give the contributor's name, street address and city/state/ZIP. A row is
R's only under the rule above (name and an address from an official record about R). Most recipients have no address
in the action record (169 do): for a DOE hit, look up R on Sunbiz (search.sunbiz.org, document number, principal and
mailing addresses in the filing year) or R's IRS filing, and record that URL with the match. Keep name-only hits as
`unconfirmed`.

DOE covers state and local-to-state filers (statewide, legislative, political committees, parties registered with the
Division). County and city candidates file with the county Supervisor of Elections or city clerk; those are a later
stage (VoterFocus exports, as in scripts/data/city/).

## FEC (federal committees)

`fec-search.tsv` lists 6,954 names. Federal law bars corporate and union treasury gifts to candidates, PACs and
parties, but companies, unions, trade associations and 501(c)(4) groups can give to super PACs (independent
expenditure-only committees) and the non-contribution accounts of hybrid (Carey) PACs, and their own PACs give to candidates. So the list keeps companies
(6,451), associations, chambers and unions (501), and the two 501(c)(4)s in the Hope Florida chain; it leaves out
foundations, churches, schools, museums and other charities (501(c)(3) groups may not give).

How to call FEC:

- Through the site: `POST https://ballot305.org/api/admin/fec-get` with header `Authorization: Bearer <ADMIN_TOKEN>`
  and JSON `{"path": "/schedules/schedule_a/", "params": {"contributor_name": "<name>", "min_date": "2016-01-01",
  "per_page": 100, "sort": "-contribution_receipt_date", "is_individual": false}}`. The worker adds the site's FEC key
  (`FEC_API_KEY`, a Worker secret) and never returns it (src/worker.js `adminFecGet`; allowed paths: candidates,
  committees, schedule_a, schedule_b). One page per call: follow `body.pagination.last_indexes` with `last_index` and
  `last_contribution_receipt_date`. The admin token is entered on /admin in the browser; it is not in this repo or the
  container.
- Direct: `https://api.open.fec.gov/v1/schedules/schedule_a/?contributor_name=<name>&min_date=2016-01-01&per_page=100&api_key=<key>`.
  There is no FEC key in the container; `DEMO_KEY` answered 429 (Oct 27, 2026).
- Match the same way: Schedule A gives contributor street, city, state and ZIP; a row is R's only with an address or ID
  match.

## Centene record status (Oct 27, 2026)

Found and read: the executed Settlement Agreement and Release (DocuSign envelope ED60D886-D68E-4FD0-8D0C-6D6B696BD6EA,
16 pages), signed Sept. 27, 2024. For the State, the Attorney General's Office block is signed by **John Guard, Chief
Deputy Attorney General** (not Moody personally); also Jason Weida (AHCA Secretary), Michael Yaworsky (Insurance
Commissioner), Cassandra Pasley (DOH Chief of Staff); for Centene, Christopher A. Koster. Section B.2: "AHCA directs
that (i) the Centene Entities shall pay Ten Million Dollars ($10,000,000) as a one-time donation to The Hope Florida
Foundation, Inc." Section H.4: "The Attorney General, on behalf of the State, represents and warrants that she is
authorized to enter into and execute this Agreement binding upon all Releasors." Copies saved to the source inbox
(ids 421933d4033f21f0, 5fb93d37eeb6ee1b). Quotes and URLs: manual-actions.json.

Still needed for the chain, each an official record:

1. The $10M reaching the foundation: Hope Florida Foundation IRS Form 990 for the year ending June 30, 2025 (EIN
   93-3379025). Not yet listed by ProPublica (latest: FY ending June 2024).
2. Foundation to Secure Florida's Future (EIN 82-3058657) and Save Our Society From Drugs (EIN 59-3470019): that same
   990's Schedule I, or the recipients' own 990-O (Secure Florida's Future calendar 2024 return is filed; the ProPublica
   PDF download answered 403 from the container).
3. Those two to Keep Florida Clean: DOE contributions to Keep Florida Clean (the positive-control search above).

## Blocked from the container (Oct 27, 2026)

- dos.elections.myflorida.com: 403 (Cloudflare). Browser pass needed.
- apps.irs.gov (TEOS): 403. EINs and addresses come from ProPublica's API copy of the IRS Business Master File;
  confirm on TEOS.
- projects.propublica.org filing PDFs: 403 (the JSON API works).
- api.open.fec.gov with DEMO_KEY: 429. Use the site's admin proxy.

## DOE search results (Oct 27, 2026)

The browser pass searched all 5,262 names in `doe-search.tsv` (45 searches failed and still need a retry). After
dropping interest and refunds, 5,473 rows had a contributor name equal to a recipient's name and fell within 24 months
after one of that recipient's qualifying actions ($43.1M). Most of that is companies paid for work
(Florida Power & Light, Humana, Florida Blue, paving and engineering firms).

`doe-hits-grant-funding.tsv`: the 267 of those rows (47 recipients, $1.6M) where the action in the window is a grant,
funding item, budget or earmark request, or settlement, not a payment for work. Name match only: every row still needs
the address check above before it can be `confirmed`. Nothing here is shown to voters.
