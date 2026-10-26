#!/bin/bash
# prints fetch progress and the readings still to do (used while waiting; no fetching)
cd "$(dirname "$0")"
echo "ps=$(ls ps | wc -l) stageA=$(wc -l < stageA.jsonl) rolls=$(ls rolls | wc -l) pbtext=$(ls ../raw/pbtext | wc -l) pfsA=$(wc -l < ../../prior-flsenate/bills/stageA.jsonl 2>/dev/null)"
python3 build-bills.py > /dev/null && python3 pending.py ${1:-40}
