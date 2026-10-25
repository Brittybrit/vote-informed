#!/bin/bash
# Runs every resumable fetcher of this slice in parallel (request starts are spaced by src/net.py). Rerun after any stop.
cd "$(dirname "$0")/.."
python3 -I src/fetch_pdfs.py >> raw/fetch_pdfs.log 2>&1 &
python3 -I src/votes.py >> bills/votes.log 2>&1 &
python3 -I bills/pfs_enacted_list.py >> bills/fetch-list.log 2>&1 &
python3 -I src/get_journals.py >> raw/gaa/journals.log 2>&1 &
( python3 -I bills/pfs_stageA.py >> bills/stageA.log 2>&1 ) &
wait
echo ALLDONE
