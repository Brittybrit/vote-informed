# Vote Informed

A free, nonpartisan voter research tool. Live for Miami-Dade County at
[ballot305.org](https://ballot305.org).

Upload a sample ballot PDF and it becomes a clickable list of every race and
referendum. Tap a candidate to see their top donors and endorsements, with
every claim linked to its source. Judicial candidates get screened for
Federalist Society ties. Referendums show who is financing each side. Fill in
ovals to build a ballot plan, print it, and take it to the polls. Plans are
saved only in the voter's browser; the server never sees anyone's picks.

Built on Cloudflare Workers with the Anthropic API (web search for research,
PDF parsing for ballots) and the free openFEC API for federal donor data.
Research results are cached and shared, so each candidate is researched once,
not once per user.(Cache resets every 7 days)

## Deploy your own

Prerequisites: a Cloudflare account (free tier works), an Anthropic API key
(console.anthropic.com), Node.js.

```bash
npx wrangler login
npx wrangler kv namespace create CACHE
# paste the printed id into wrangler.toml
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put FEC_API_KEY   # free, instant: api.data.gov/signup
npx wrangler deploy
```

Set a monthly spend cap on your Anthropic key before sharing your deployment.

Built-in spend controls (see `GLOBAL_LIMITS` in `src/worker.js`): fresh research, ballot parses and translations are capped per connection (per IPv6 /64) and site-wide per day. Cached results are always served. To stop all new AI work immediately without taking the site down, set a `FRESH_OFF` variable to `1` in the Cloudflare dashboard (Workers > your worker > Settings > Variables and Secrets); delete it to turn new work back on.
Research costs scale with distinct candidates researched per week, not with
traffic. A full county ballot runs a few dollars per week of active use.

## Fork it for your county

Everything county-specific lives in a few places:

1. `public/index.html`, the `ELECTION` config block: election name, date,
   and registration deadline. The countdown and landing page read from it.
2. `public/ballots/`: drop in your county's master sample ballot PDF and
   update `FEATURED_BALLOT_PATH` in index.html. Or delete the one-click
   button; users can always upload their own PDF.
3. The voter links in index.html: registration, voter lookup, and sample
   ballot URLs for your state and county.
4. `src/worker.js`: the parser and research prompts are state-agnostic.
   The Federalist Society screen applies to any judicial race. The FEC
   integration covers federal races anywhere in the US. State and local
   donor data quality depends on your state's disclosure portals and press.

If you deploy a fork, use your own name and domain. Do not present any
deployment as official or affiliated with an elections authority, and keep
the independence disclaimer visible.

## Public data API

Everything the site shows about official actions and donors is open data at
`/api/v1` (docs at [ballot305.org/api](https://ballot305.org/api), OpenAPI at
`/api/v1/openapi.json`). Read-only, no key, CORS on. Data is CC BY 4.0 with
attribution to Ballot305; code is MIT. The API is built from the committed
JSON under `public/data/`, so a deploy is a data release. Each tie between a
gift and an action carries its match kind, basis and timing as fields, so
downstream use keeps the caveats. Tests in `tests/api.test.mjs`.

## Tests

`npm test` runs the checks in `tests/` (no network, no Cloudflare account needed). GitHub runs them on every push. On the live site, /admin.html has a Check data sources button that tests each official source against a known 2026 candidate.

## Limitations

Research is AI-assisted web search. It preserves source hedges, refuses to
invent organization names or URLs, and links every claim, but it is a
research accelerant, not an authority. The source links are the product.
Donor data is strongest for federal races (official FEC filings) and depends
on disclosure portals and news coverage below that.

The public methodology page (`public/methodology.html`, live at
[ballot305.org/methodology](https://ballot305.org/methodology)) explains the
sources, the left/right/nonpartisan labels, and the Federalist Society rubric.
Fixed labels for recurring groups live in `KNOWN_LEANS` in `src/worker.js`.

## License

MIT. See LICENSE.

## Updating records-request status

City data coverage and public records requests live in `public/data/coverage.json`. Change a city's `status` (`official`, `portal`, `pdf`, `requested`, `notfound`), add `reply` (YYYY-MM-DD) and a short `replyNote` when a clerk answers, bump `updated`, and deploy. Candidate pages and the methodology page both read this file.

## Cities with scanned reports

`public/data/city-reports.json` holds donors typed in from cities that post only scanned treasurer's reports (Aventura, Pinecrest, South Miami; North Miami Beach has totals only). Each row is `[date, contributor, type, amount, kind]`: type `I` individual, `B` business, `F` political committee, `S` the candidate; kind `loan` or `in-kind` when it applies. When the clerk posts a new report, add it to the candidate's `reports` with its `period` and `url`, check the rows add up to the report's summary page, bump `updated` (cards refresh when it changes), and deploy.

## We the People 305 (separate Worker)

`wtp/` is a second Cloudflare Worker for wethepeople305.org. It is deployed on its own so nothing in it can affect the voter guide. It serves a holding page at the root and the founder board at admin.wethepeople305.org (behind its own `ADMIN_TOKEN`); the board's chat reads ballot305's public API over HTTPS and has no access to this Worker's storage. First-time setup from `wtp/`: `npx wrangler kv namespace create BOARD` (paste the id into `wtp/wrangler.toml`), `npx wrangler secret put ADMIN_TOKEN`, `npx wrangler secret put ANTHROPIC_API_KEY`, then `npx wrangler deploy`.
