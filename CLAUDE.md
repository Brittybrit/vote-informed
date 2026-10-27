# Working rules for this repo

## Names say what they are (Brit, Oct 27, 2026)
Architect everything so nobody needs memory, Brit's or Claude's, to translate a name. Every secret, token,
bucket, branch, file, folder, worker and field is named for what it is and what uses it, specific enough that it
can't be confused with a sibling.
- Secrets and tokens are named for the one job they serve (`CLOUDFLARE_DEPLOY_TOKEN`, `CLOUDFLARE_R2_TOKEN`), and
  one token does one job.
- Shared assets are named for their owner, not their first user (bucket `wethepeople305-sources` serves Ballot305
  and future We the People reports).
- When something is renamed, rename it everywhere in the same change; no aliases left to remember.
- When a name can't be fixed yet, list it under "Known names that need translating" below with what it really is.

### Known names that need translating
- Cloudflare Worker `ballot-intel` (wrangler.toml) is the Ballot305 site. Old name from before the rebrand; renaming
  creates a new worker and moves the ballot305.org route, so it waits until after Nov 3, 2026.
- Repo `vote-informed` is Ballot305.
- Branch `sources-archive` holds interim source text and inbox batches for the R2 bucket `wethepeople305-sources`.
