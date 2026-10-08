# Ballot Intel

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

## Limitations

Research is AI-assisted web search. It preserves source hedges, refuses to
invent organization names or URLs, and links every claim, but it is a
research accelerant, not an authority. The source links are the product.
Donor data is strongest for federal races (official FEC filings) and depends
on disclosure portals and news coverage below that.

## License

MIT. See LICENSE.
