#!/bin/bash
# Every 10 minutes: rebuild bills/vote-jobs.jsonl from all qualifying laws and fetch any Senate sheets not yet read.
cd "$(dirname "$0")/.."
while true; do
  python3 -I src/vote_jobs.py > /dev/null
  python3 -I src/votes.py >> bills/votes.log 2>&1
  pgrep -f '^python3 -I bills/pfs_stageA' > /dev/null || { python3 -I src/vote_jobs.py >/dev/null; python3 -I src/votes.py >> bills/votes.log 2>&1; echo "stage A stopped; votes loop ends"; break; }
  sleep 600
done
