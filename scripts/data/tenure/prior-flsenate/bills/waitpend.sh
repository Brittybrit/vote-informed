#!/bin/bash
# exits when >= $1 stage B readings are pending, or stage A has stopped
cd "$(dirname "$0")"
while true; do
  n=$(python3 -I pfs_stageB.py | tail -1 | awk '{print $2}')
  [ "$n" -ge "${1:-15}" ] && break
  pgrep -f 'bills/pfs_stageA.py' >/dev/null || { echo "stageA not running"; break; }
  sleep 60
done
python3 -I pfs_stageB.py | cut -c1-1200
