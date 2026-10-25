"""Write a candidate's older EasyVote reports (those submitted before the current campaign) as one donor CSV
per campaign, scripts/data/city/<slug>/<acct>_<label>.csv, in the format scripts/lib/city.mjs reads.
Same rules as the worker's evCandidateDonors: qualifying papers skipped; per report name (ignoring
"amended"), the newest filing with itemized rows; a row present in both the redacted and original version
counted once (same date, amount, and one name's words a subset of the other's).
Usage: python3 ev_old.py <slug> <acct> <label> <filers.json> <contribs.json> <lastname> <from-submitted> <to-submitted>
(dates YYYY-MM-DD, on the report's submitted date). Inputs are the API answers saved from
ecf-api.easyvoteapp.com/filer/documentsearch/<customer> and /advancedsearch/contributions/<customer>?recipientLastName=<last>,
called with the clerk portal's Origin header."""
import csv, json, os, re, sys, unicodedata
slug, acct, label, ff, cf, last, d0, d1 = sys.argv[1:9]
def norm(s): return re.sub(r'\s+', ' ', re.sub(r'[^A-Z0-9 ]', ' ', unicodedata.normalize('NFD', str(s or '')).encode('ascii', 'ignore').decode().upper())).strip()
def evdate(s):
    m = re.match(r'^(\d\d)/(\d\d)/(\d\d)$', s or ''); return '20%s-%s-%s' % (m.group(3), m.group(1), m.group(2)) if m else ''
def who(x):
    org = (x.get('ContributorOrganizationName') or '').strip()
    if org: return re.sub(r'\s+', ' ', org)
    n = ' '.join(p for p in [x.get('ContributorFirstName'), x.get('ContributorMiddleName'), x.get('ContributorLastName')] if p) or x.get('ContributorFullName') or ''
    n = re.sub(r'\s+', ' ', n).strip(); n = re.sub(r'^(mr|mrs|ms|miss)\.?\s+(?=\S)', '', n, flags=re.I)
    m = re.match(r'^([^,]+),\s*(\S[^,]*)$', n)
    if m and not re.match(r'^(jr|sr|ii|iii|iv|llc|inc|corp|co|ltd|lp|llp|pllc|pa|p\.a)\.?$', m.group(2), re.I): n = m.group(2) + ' ' + m.group(1)
    return n.rstrip(',').strip()
F = [f for f in json.load(open(ff)) if norm(last) in norm(f.get('lastname'))]
assert len(F) == 1, [f['lastname'] for f in F]
docs = [d for d in F[0]['documents'] if d.get('documentid') and not re.search('qualif', d.get('documentname') or '', re.I) and d0 <= evdate(d['datesubmitted']) <= d1]
C = json.load(open(cf))
by = {}
for x in C: by.setdefault(re.sub('_Redacted$', '', x['DocumentFilingId'] or '', flags=re.I).upper(), []).append(x)
groups = {}
for d in docs: groups.setdefault(norm(re.sub('amend(ed|ment)?', ' ', d['documentname'] or '', flags=re.I)).replace(' ', ''), []).append(d)
out = []
for g in groups.values():
    g.sort(key=lambda d: evdate(d['datesubmitted']), reverse=True)
    use = next((d for d in g if by.get(d['documentid'].upper())), None)
    if not use: print('no rows:', [d['documentname'] for d in g]); continue
    kept = []
    rows = sorted(by[use['documentid'].upper()], key=lambda x: 0 if re.search('_Redacted$', x['DocumentFilingId'], re.I) else 1)
    for x in rows:
        v = 'r' if re.search('_Redacted$', x['DocumentFilingId'], re.I) else 'o'; s = set(norm(who(x)).split())
        if any(k[0] != v and k[1] == x['ContributionDate'] and k[2] == x['ContributionAmount'] and (k[3] <= s or s <= k[3]) for k in kept): continue
        kept.append((v, x['ContributionDate'], x['ContributionAmount'], s))
        date = re.sub(r'^0\d(\d\d-)', r'20\1', str(x['ContributionDate'])[:10])
        out.append([use['documentname'].strip(), use['documentid'], date, 'C', who(x), '', '', x['ContributionAmount'], ''])
dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'city', slug, '%s_%s.csv' % (acct, label))
with open(dest, 'w', newline='') as fh:
    w = csv.writer(fh); w.writerow(['report', 'document id', 'item date', 'Cont/Exp', 'name', 'address 1', 'occupation', 'amount', 'Amend. code'])
    for r in sorted(out, key=lambda r: (r[2], r[4])): w.writerow(r)
print(dest, len(out), sum(float(r[7] or 0) for r in out if float(r[7] or 0) > 0))
