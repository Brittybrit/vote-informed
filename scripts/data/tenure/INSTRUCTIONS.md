# Full tenure: every official action and every donor, back to the start of each incumbent's tenure

Brit, Oct 25, 2026: "the actions need to cover all of their tenure." The action-first standard
(claude/action-first-standard.md, summarized in the repo at scripts/data/tenure/STANDARD.md) used a universe
from Jan 1, 2025. The universe now starts at the incumbent's first day in the seat they hold now (continuous
service on the same body counts as one tenure; roster.json has the dates). Everything else in the standard
is unchanged: the same qualifying actions, roll calls from the body's own records, a tie needs a yes or no
vote the member cast, lobbyist and owner rules, laws that qualify only when their own analysis names a kind
of business that benefits.

Donors: a tie can only be found if the donor data reaches back as far as the actions. So for every
incumbent in your slice, also pull their campaign and political-committee contributions from the official
filing system back to the start of their tenure (one cycle before the start, too, since gifts before a vote
count). Same sources the repo already uses for 2025-2026 (FEC, Florida Division of Elections, Miami-Dade
VoterFocus, city EasyVote / clerk portals). Write them in the same format and place the repo already reads for
that body, extended to the earlier dates, so the existing pipeline picks them up. Note every report you could
not get.

## How to work
- Read STANDARD.md, then the existing files for your bodies (scripts/data/city/<slug>/, scripts/data/state/,
  scripts/data/federal/ or wherever the current 2025-2026 data for that body lives; find them by reading
  scripts/city-actions.mjs, scripts/lib/city.mjs, scripts/state-bills.mjs, scripts/federal-earmarks.mjs and
  scripts/money-summary.mjs). Extend those same files with the earlier actions and gifts, same schema, same
  ids style. Do not change scripts, public/data/decisions.json or any file outside your bodies' folders.
- Resume first: keep progress.md in scripts/data/tenure/<your slice>/ and append a line after each meeting
  month / session / report you finish. A rerun must pick up where you stopped. Commit nothing.
- Official records only. Never infer a vote. Where only an agenda exists, mark the vote unknown as the
  standard says.
- Shell curl is blocked for most government sites; use WebFetch, and retry URL variants on errors. The repo's
  scripts/data folders have notes on which endpoints work (search for "works via WebFetch" in progress.md files).
- If a body's records for some years are not online at all, say which months are missing in progress.md and
  in summary text at the end, rather than guessing.
- Finish with a short report: per incumbent, tenure start, the date range now covered, actions added, gifts
  added, gaps.
