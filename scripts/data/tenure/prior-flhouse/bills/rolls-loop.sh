#!/bin/bash
# keeps fetching House roll calls for newly qualifying 2013-2020 laws: rebuild the URL list, fetch what is missing, wait
cd "$(dirname "$0")"
while true; do python3 build-bills.py > /dev/null; python3 rolls.py ../raw/roll-urls-old.txt | grep -v '^fetched 0'; sleep 300; done
