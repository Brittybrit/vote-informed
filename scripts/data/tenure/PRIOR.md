# Prior offices: every official action from every office a candidate held before their current seat

Source capture rule: save every document you read (raw file, text, sidecar) to scripts/data/sources/inbox/ as described in scripts/data/SOURCES.md, and check the catalog before fetching.

Brit, Oct 25, 2026: "all of the candidates that have held offices have a record of official actions. this
should be exhaustive." Current seats are already covered back to the start of each tenure (INSTRUCTIONS.md).
This round covers the OTHER elected offices in scripts/data/tenure/careers/careers.jsonl: a seat the candidate
held before, or holds now on a body the site has no list for yet. Order: years since 2016 first (plus Ashley
Moody's years as Attorney General), then older years, newest first.

Everything in STANDARD.md applies unchanged: the same qualifying actions, roll calls from the body's own
records, a tie needs a yes or no vote the member cast, lobbyist and owner rules, and laws that qualify only
when their own analysis names a kind of business that benefits. The universe for each prior office is every
qualifying action of that body (or office) from the member's first day in that seat to their last.

Donors: the campaign and political-committee contributions for THAT office's campaigns, from one cycle before
the term started to the term's end. Same sources as for current seats.

## Where to write
- Your own folder: scripts/data/tenure/<your slice>/ (given in your task). Keep progress.md there and append
  a line after each meeting month / session / report you finish, so a rerun picks up where you stopped.
- Use the same file shapes the repo already uses for that kind of body (read scripts/data/tenure/flhouse/README.md,
  scripts/data/tenure/flsenate/README.md, scripts/data/tenure/congress/README.md, scripts/data/tenure/cities-a/
  progress.md, scripts/data/tenure/county/progress.md and scripts/data/city/<slug>/ before writing anything).
  For a body the site has no list for (Miami Gardens, Surfside, Palmetto Bay, Biscayne Park, Boca Raton, the
  School Board, the Attorney General's office), copy the shape of scripts/data/city/<slug>/actions.json and
  body.json.
- Write one `offices.json` in your folder: for each person and prior office, `{"pid","office","body","district",
  "start":"YYYY-MM-DD","end":"YYYY-MM-DD","giftsFrom":"YYYY-MM-DD","source":{"label","url"},"files":[...]}`
  listing the files that hold that office's actions, roll calls and donors. Exact first and last day from an
  official record (oath, certification, clerk roster); if only a year is known, say so.
- Do not edit scripts, public/, or any folder but your own. Commit nothing.

## Browser
Do NOT use the Chrome or built-in-browser tools (other agents share them). Where a record needs a browser
(dos.elections.myflorida.com contributions, flhouse.gov request forms behind a bot check, sign-in portals),
write the exact request to `needs-browser.md` in your folder (URL, form fields, date range, output file name)
and carry on with everything else. The coordinator runs those in one browser pass.

## Rules
- Official records only. Never infer a vote. Where only an agenda exists, every member seated that day gets
  "Vote not given in the minutes".
- Shell curl is blocked for many government sites; use WebFetch and retry URL variants. Endpoints that work
  are listed in the existing progress.md files ("works via"). flsenate.gov rate-limits: wait 6-10 s between
  requests and back off 60 s on 429 (two agents share it).
- If a body's records for some years are not online, list the missing months in progress.md and the summary.
- Never understate: partial totals say "at least" and why.
- Finish with summary.md: per person and office, the term, the date range covered, actions found, roll calls
  found, gifts found, and every gap.
