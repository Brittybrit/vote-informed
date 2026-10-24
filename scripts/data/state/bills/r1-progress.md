# r1 progress (retry slice)
- Reuse A from s1/s2 for 2025-34,69,75,78,82,84,85,94,97. Need A redo: 79, 99, 120-124, 170-172.
- 2026-10-24: first fetch (2025-34 fp analysis) hit WebFetch hourly limit (RATE_LIMIT_EXCEEDED). Nothing fetched. r1-A/B/C.jsonl empty.
- Resume order: B for 2025-34,69,75,78,82,84,85,94,97 (A reusable from s1/s2-A.jsonl); A+B for 2025-79,99,120-124,170-172; C votes 2025-11 S, 2025-45 H, 2025-155 S, 2026-4 H, 2026-89 S.
