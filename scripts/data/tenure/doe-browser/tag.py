"""Builds industry.json: industry tags for donor names in this folder's DOE exports (all dates),
with the same rules as scripts/data/industry/state-donors.json (scripts/data/industry/build/tag_state.py + overrides.json;
scope: total >= $500 across these files, or any organisation; INT and REF rows excluded). Only names not already in
scripts/data/industry/state-donors.json or the flhouse/flsenate industry-pre2025.json files (those win).
Run: python3 -I scripts/data/tenure/doe-browser/tag.py"""
import csv, glob, json, collections, os, shutil, subprocess, tempfile
H = os.path.dirname(os.path.abspath(__file__)); R = os.path.abspath(os.path.join(H, '../../../..'))
D = collections.defaultdict(lambda: {"total": 0, "n": 0, "occs": collections.Counter(), "types": collections.Counter(), "files": set()})
for f in sorted(glob.glob(os.path.join(H, '*.tsv'))):
    for row in csv.reader(open(f, encoding='utf-8', errors='replace', newline=''), delimiter='\t', quoting=csv.QUOTE_NONE):
        if len(row) < 8 or row[3].strip() in ('INT', 'REF') or row[0] == 'Candidate/Committee': continue
        try: a = float(row[2])
        except ValueError: continue
        nm = row[4].strip().upper(); x = D[nm]
        x['total'] += a; x['n'] += 1; x['occs'][row[7].strip()] += 1; x['types'][row[3].strip()] += 1; x['files'].add(os.path.basename(f)[:-4])
agg = {k: {"total": round(v["total"], 2), "n": v["n"], "occ": v["occs"].most_common(1)[0][0], "occs": list(v["occs"]), "types": list(v["types"]), "files": sorted(v["files"])} for k, v in D.items()}
tmp = tempfile.mkdtemp()
json.dump(agg, open(os.path.join(tmp, 'agg.json'), 'w'))
B = os.path.join(R, 'scripts/data/industry/build')
shutil.copy(os.path.join(B, 'overrides.json'), tmp)
subprocess.run(['python3', '-I', os.path.join(B, 'tag_state.py')], cwd=tmp, check=True)
T = json.load(open(os.path.join(tmp, 'state_tagged.json')))
have = set(json.load(open(os.path.join(R, 'scripts/data/industry/state-donors.json')))['donors']) | set(json.load(open(os.path.join(R, 'scripts/data/tenure/flhouse/donors/industry-pre2025.json')))['donors']) | set(json.load(open(os.path.join(R, 'scripts/data/tenure/flsenate/donors/industry-pre2025.json')))['donors'])
out = {k: {kk: vv for kk, vv in v.items() if not kk.startswith('_')} for k, v in sorted(T.items()) if k not in have}
json.dump({"source": "scripts/data/tenure/doe-browser/*.tsv (DOE, all dates), tagged with scripts/data/industry/build/tag_state.py and overrides.json, same scope as state-donors.json (total >= $500 across these files, or any organisation; INT and REF rows excluded). Only names not already in scripts/data/industry/state-donors.json or the flhouse/flsenate industry-pre2025.json files; those win for any name in both.", "donors": out},
          open(os.path.join(H, 'industry.json'), 'w'), indent=1, ensure_ascii=False)
shutil.rmtree(tmp)
print(len(agg), 'names;', len(out), 'tagged new', sum(1 for v in out.values() if v['tags'] == ['unknown']), 'unknown')
