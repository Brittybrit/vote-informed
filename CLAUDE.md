# Working rules for this repo

## Only Brit deploys (Oct 27, 2026)
Never run `wrangler deploy` or trigger the Deploy workflow. Push to main; Brit deploys ballot305.org herself.

## Commit authorship (Brit, Oct 27, 2026)
Commits Claude writes are authored by Claude: `git -c user.name=Claude -c user.email=noreply@anthropic.com commit`.
Brit's own commits are hers. Earlier commits authored as Brittybrit stay as they are: never rewrite or force-push
history to change authorship.

## Names say what they are (Brit, Oct 27, 2026)
Architect everything so nobody needs memory, Brit's or Claude's, to translate a name. Every secret, token,
bucket, branch, file, folder, worker and field is named for what it is and what uses it, specific enough that it
can't be confused with a sibling.
- Secrets and tokens are named for the one job they serve (`CLOUDFLARE_TOKEN_DEPLOY_BALLOT305`, `CLOUDFLARE_TOKEN_R2_WETHEPEOPLE305_SOURCES`), and
  one token does one job.
- A Cloudflare token's name is the exact GitHub secret name that holds it, plus where that secret lives, e.g.
  `CLOUDFLARE_TOKEN_DEPLOY_BALLOT305 (GitHub vote-informed)`. Same string in both places, nothing to look up.
- Shared assets are named for their owner, not their first user (bucket `wethepeople305-sources` serves Ballot305
  and future We the People reports).
- When something is renamed, rename it everywhere in the same change; no aliases left to remember.
- When a name can't be fixed yet, list it under "Known names that need translating" below with what it really is.

### Known names that need translating
- Cloudflare Worker `ballot-intel` (wrangler.toml) is the Ballot305 site. Old name from before the rebrand; renaming
  creates a new worker and moves the ballot305.org route, so it waits until after Nov 3, 2026.
- workers.dev subdomain `ballot-intel.workers.dev` is the account-wide subdomain (every Worker's *.workers.dev URL,
  including Ballot317's). Same post-election rename as the Worker.
- Repo `vote-informed` is Ballot305.
- Branch `sources-archive` holds interim source text and inbox batches for the R2 bucket `wethepeople305-sources`.
