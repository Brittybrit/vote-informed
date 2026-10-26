"""Builds industry-pre2025.json: industry tags for donor names in the DOE browser pulls this slice uses
(../../doe-browser/, read in place, not copied), same rules as ../../flsenate/donors/tag.py and
scripts/data/industry/state-donors.json (scripts/data/industry/build/tag_state.py + overrides.json; scope: total >= $500
across these rows, or any organisation; INT and REF rows excluded). Rows used = each office's gift window
(PRIOR.md: one cycle before the Senate term to its last day) and, for candidate pulls, only (STS) Senate rows.
Names already in scripts/data/industry/state-donors.json or an existing tenure industry-pre2025.json win (left out here).
Run: python3 -I scripts/data/tenure/prior-flsenate/donors/tag.py"""
import csv, glob, json, collections, os, shutil, subprocess, tempfile
H = os.path.dirname(os.path.abspath(__file__)); R = os.path.abspath(os.path.join(H, '../../../../..'))
DOE = os.path.join(H, '../../doe-browser')
# file -> (row filter on the candidate/committee column, gift window from, to)
FILES = {
 'avila-cand.tsv': ('(STS)', '2020-11-04', '2026-08-25'),
 'pc64489-avila.tsv': (None, '2020-11-04', '2026-08-25'),
 'taddeo-cand.tsv': ('(STS)', '2016-11-09', '2022-11-08'),
 'simpson-cand.tsv': ('(STS)', '2010-11-03', '2022-11-08'),
 'pc60614-simpson.tsv': (None, '2010-11-03', '2022-11-08'),
 'pc74435-simpson.tsv': (None, '2010-11-03', '2022-11-08'),
 'pc74437-simpson.tsv': (None, '2010-11-03', '2022-11-08'),
 'pc79644-simpson-pre2025.tsv': (None, '2010-11-03', '2022-11-08'),
 'pc88885-simpson.tsv': (None, '2010-11-03', '2022-11-08'),
 'jjrodriguez-cand.tsv': ('Rodriguez, Jose Javier (DEM)(STS)', '2014-11-05', '2020-11-03'),
 'campbell-cand.tsv': ('(STS)', '2014-11-05', '2018-11-06'),
}
def rows(f):
    filt, a, b = FILES[f]
    for row in csv.reader(open(os.path.join(DOE, f), encoding='utf-8', errors='replace'), delimiter='\t', quoting=csv.QUOTE_NONE):  # DOE export has no quoting; stray quotes in names
        row = [c.rstrip('\r') for c in row]
        if len(row) < 8 or row[0] == 'Candidate/Committee': continue
        if filt and filt not in row[0]: continue
        try: m, d_, y = row[1].split('/')
        except ValueError: continue
        if not (a <= f'{y}-{m}-{d_}' <= b): continue
        yield row
if __name__ == '__main__':
    D = collections.defaultdict(lambda: {"total": 0, "n": 0, "occs": collections.Counter(), "types": collections.Counter(), "files": set()})
    used = {}
    for f in FILES:
        n = 0
        for row in rows(f):
            n += 1
            if row[3].strip() in ('INT', 'REF'): continue
            try: a = float(row[2])
            except ValueError: continue
            nm = row[4].strip().upper(); x = D[nm]
            x['total'] += a; x['n'] += 1; x['occs'][row[7].strip()] += 1; x['types'][row[3].strip()] += 1; x['files'].add(f[:-4])
        used[f] = n
    agg = {k: {"total": round(v["total"], 2), "n": v["n"], "occ": v["occs"].most_common(1)[0][0], "occs": list(v["occs"]), "types": list(v["types"]), "files": sorted(v["files"])} for k, v in D.items()}
    tmp = tempfile.mkdtemp()
    json.dump(agg, open(os.path.join(tmp, 'agg.json'), 'w'))
    B = os.path.join(R, 'scripts/data/industry/build')
    shutil.copy(os.path.join(B, 'overrides.json'), tmp)
    subprocess.run(['python3', '-I', os.path.join(B, 'tag_state.py')], cwd=tmp, check=True)
    T = json.load(open(os.path.join(tmp, 'state_tagged.json')))
    have = set(json.load(open(os.path.join(R, 'scripts/data/industry/state-donors.json')))['donors'])
    for f in glob.glob(os.path.join(R, 'scripts/data/tenure/*/donors/industry-pre2025.json')):
        if os.path.abspath(f) != os.path.join(H, 'industry-pre2025.json'): have |= set(json.load(open(f))['donors'])
    out = {k: {kk: vv for kk, vv in v.items() if not kk.startswith('_')} for k, v in sorted(T.items()) if k not in have}
    json.dump({"source": "scripts/data/tenure/doe-browser/ DOE pulls (files and row filters in prior-flsenate/donors/tag.py: Senate (STS) rows and the chaired committees, within each Senate term's gift window), tagged with scripts/data/industry/build/tag_state.py and overrides.json, same scope as state-donors.json (total >= $500, or any organisation; INT and REF excluded). Only names not already in scripts/data/industry/state-donors.json or another scripts/data/tenure/*/donors/industry-pre2025.json; those win.",
               "rows": used, "donors": out}, open(os.path.join(H, 'industry-pre2025.json'), 'w'), indent=1, ensure_ascii=False)
    shutil.rmtree(tmp)
    print(used); print(len(agg), 'names;', len(out), 'tagged new', sum(1 for v in out.values() if v['tags'] == ['unknown']), 'unknown')
