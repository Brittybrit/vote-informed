"""Write EasyVote export JSON ({acct: [[report, documentId, date, name, amount], ...]}) as donor CSVs for
scripts/city-actions.mjs. Usage: python3 ev-csv.py <slug> <export.json>. The rows come from the city's
EasyVote API, read from the clerk's portal (the API answers only that origin); see <slug>/DONORS.md."""
import csv, json, os, sys
slug, src = sys.argv[1], sys.argv[2]
d = json.load(open(src))
here = os.path.dirname(os.path.abspath(__file__))
for acct, rows in d.items():
    with open(os.path.join(here, '..', slug, acct + '.csv'), 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['report', 'document id', 'item date', 'Cont/Exp', 'name', 'address 1', 'occupation', 'amount', 'Amend. code'])
        for r in rows: w.writerow([r[0], r[1], r[2], 'C', r[3], '', '', r[4], ''])
    print(slug, acct, len(rows), sum(r[4] for r in rows))
