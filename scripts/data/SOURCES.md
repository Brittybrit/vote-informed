# Source library: save every document you read, once

Brit, Oct 27, 2026: every document the research reads is stored once, the raw file and its extracted text, in
Cloudflare R2, both linked from one searchable catalog. Nobody should have to find and OCR the same handwritten
PDF twice.

## The rule

When you read a document (PDF, web page, spreadsheet, scanned form, minutes), save it to the inbox:

```
scripts/data/sources/inbox/<id>.<ext>   the raw file as served (pdf, html, xlsx...). For a page read in a browser, a saved copy of the page.
scripts/data/sources/inbox/<id>.txt     the text you read: pdftotext output, your OCR, or the page as readable text
scripts/data/sources/inbox/<id>.json    {"url": ..., "title": ..., "people": [pid, ...], "read": "YYYY-MM-DD", "how": ...}
```

- `id` is the first 16 hex characters of the SHA-1 of the URL, without any `#fragment`:
  `printf %s "$URL" | sha1sum | cut -c1-16` or, in Node, `createHash('sha1').update(url).digest('hex').slice(0, 16)`.
- `people` are the pids the document was read for (empty list if none). `how` is how you got it: `curl`, `WebFetch`,
  `browser`, `pdftotext`, `ocr (tesseract)`, `ocrmypdf`, `Claude in Chrome` and so on. Add `"date"` if the document has one.
- Always write the `.json` sidecar. Files without one are skipped.
- Save the text even if you only needed one line, and save the raw file even when the text is all you used. If the
  site blocks scripts (scripts/sources/blocked-hosts.txt), the inbox copy is the only copy the archive will ever get.
- Keep citing the original URL in your findings, as before. The catalog links the URL to the stored copy.
- Before fetching anything, check the catalog first: `grep -F '"url":"<url>"' scripts/data/sources/catalog.jsonl`,
  or search by title or host. If `textArchived` is true, the text is in R2 at `text/<id>.txt`; if `text` names a repo
  path, read that. Don't download it again.

## What happens next

- `node scripts/sources/catalog.mjs` rebuilds `scripts/data/sources/catalog.jsonl`: one line per distinct document
  cited anywhere in scripts/data and public/data, with title, kind, host, people, dates, where it is cited, any
  extracted text already in the repo (or in the interim tarball on branch `sources-archive`), and whether it can
  be fetched by script.
- The **Archive sources** GitHub Action (`.github/workflows/archive-sources.yml`, nightly and on demand) uploads the
  inbox to the R2 bucket `ballot305-sources`, then deletes the inbox files and commits the catalog. It also
  downloads every fetchable document not yet stored (politely: 2 s or more between requests to a host, robots.txt
  honored), extracts text (pdftotext, OCR with ocrmypdf when a PDF has no text layer, first 60 pages) and stores
  `raw/<id>.<ext>` and `text/<id>.txt`.
- The inbox folder is gitignored on main (it holds hundreds of MB). To hand a batch to the Action, pack it onto branch
  `sources-archive`: `cd scripts/data/sources && tar -czf - inbox | split -b 90m -d -a 2 - <worktree>/inbox/<YYYY-MM-DD>.tar.gz.part-`,
  commit and push that branch (never force-push), and commit the rebuilt catalog on main. The Action unpacks every
  batch and skips ids already stored, so a batch can stay on the branch after it is uploaded.
- `node scripts/research-index.mjs` lists catalog entries as records of type `source` in Brit's research index.

## Catalog fields

`id`, `url`, `title`, `kind` (pdf, html, xlsx, other), `host`, `people`, `dates` ([first, last]), `citedBy` (up to 10
repo files), `text` (repo path, or `sources-archive:scratch-text.tar.xz:<path>`), `textExcerpt` (true when that
text is only a section), `local` (raw file in the repo), `inbox`, `r2` (`raw` and `text` keys in the bucket),
`archived` (raw stored), `textArchived` (text stored), `fetchable` (false for hosts that block scripts, or a URL
robots.txt disallows), and from the archive job: `sha256`, `bytes`, `contentType`, `fetched`, `textChars`, `ocr`,
`pages`, `dupOf` (same bytes as another id), `attempts`, `error`.
