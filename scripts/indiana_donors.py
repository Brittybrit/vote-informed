#!/usr/bin/env python3
"""Ballot317: Indiana state candidates' donors, from the Indiana Election Division's bulk data.

Builds public-317/data/in-donors.json, which the worker reads for the Secretary of State,
Comptroller, Treasurer and Indiana Senate and House races (see inCandidateDonors in src/worker.js).
Only standard-library Python 3. Run it on your Mac (the state site blocks cloud servers):

    cd ~/vote-informed
    python3 scripts/indiana_donors.py                 # downloads 2025 and 2026 contributions itself
    python3 scripts/indiana_donors.py 2025.zip 2026.zip   # or use files you downloaded by hand from
        # https://campaignfinance.in.gov/PublicSite/Reporting/DataDownload.aspx (Contributions, by year)

Then check one candidate against the state site before you trust it:

    python3 scripts/indiana_donors.py --check "Kristina Moorhead"

and commit public-317/data/in-donors.json and deploy Ballot317. Rerun after each filing deadline.

Options:
    --inspect          print the file's columns and first rows, write nothing (use if the build fails)
    --offices FILE     CSV with columns candidate,office (e.g. "Kristina Moorhead","State Senator, District 29")
                       so same-name candidates in different districts can be told apart
    --drop-amended     leave out rows marked Amended (see the note this prints about amended rows)
"""
import csv, io, json, os, re, sys, urllib.request, zipfile, datetime
from collections import defaultdict

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'public-317', 'data', 'in-donors.json')
BASE = 'https://campaignfinance.in.gov'
PAGE = BASE + '/PublicSite/Reporting/DataDownload.aspx'
PORTAL = BASE + '/PublicSite/Search.aspx'
SINCE = '2025-01-01'   # the 2025-2026 cycle only
UA = {'User-Agent': 'Mozilla/5.0 (Ballot317 nonpartisan voter guide; github.com/Brittybrit/vote-informed)'}

# Column names vary a little between years; each field accepts any of these headers (case and spaces ignored).
COLS = {
    'file': ['filenumber', 'committeefilenumber'],
    'ctype': ['committeetype'],
    'committee': ['committee', 'committeename'],
    'candidate': ['candidatename', 'candidate'],
    'gtype': ['contributortype'],
    'name': ['name', 'contributorname', 'contributor'],
    'city': ['city', 'contributorcity'],
    'state': ['state', 'contributorstate'],
    'zip': ['zip', 'zipcode', 'contributorzip'],
    'occ': ['occupation', 'contributoroccupation'],
    'type': ['type', 'contributiontype'],
    'amount': ['amount', 'contributionamount'],
    'date': ['contributiondate', 'date', 'receiveddate'],
    'amended': ['amended'],
}
NEEDED = ['committee', 'candidate', 'name', 'amount', 'date']


def die(msg):
    sys.exit('indiana_donors: ' + msg)


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def download():
    """Find the 2025 and 2026 contribution files on the download page."""
    try:
        page = fetch(PAGE).decode('utf-8', 'replace')
    except Exception as e:
        die('could not open %s (%s). Download the 2025 and 2026 contribution files by hand and pass them as arguments.' % (PAGE, e))
    links = re.findall(r'href="([^"]+)"', page)
    want = []
    for year in ('2025', '2026'):
        hit = [l for l in links if year in l and re.search(r'contribution', l, re.I)]
        if not hit:
            die('no %s contributions link on %s. Download it by hand and pass the files as arguments.' % (year, PAGE))
        want.append(urllib.request.urljoin(PAGE, hit[0].replace('&amp;', '&')))
    files = []
    for url in want:
        print('downloading', url)
        files.append((os.path.basename(url.split('?')[0]) or 'download', fetch(url)))
    return files


def rows_of(name, data):
    """CSV rows from a .csv or a .zip holding one."""
    if data[:2] == b'PK':
        z = zipfile.ZipFile(io.BytesIO(data))
        inner = [n for n in z.namelist() if n.lower().endswith(('.csv', '.txt'))]
        if not inner:
            die(name + ': no CSV inside the zip')
        data = z.read(inner[0])
    text = data.decode('utf-8-sig', 'replace')
    return csv.reader(io.StringIO(text))


def colmap(header):
    norm = [re.sub(r'[^a-z]', '', h.lower()) for h in header]
    out = {}
    for field, names in COLS.items():
        for n in names:
            if n in norm:
                out[field] = norm.index(n)
                break
    missing = [f for f in NEEDED if f not in out]
    if missing:
        die('columns not found: %s. The file has: %s. Rerun with --inspect and update COLS.' % (missing, header))
    return out


def iso(d):
    d = (d or '').strip().split(' ')[0].split('T')[0]
    for fmt in ('%m/%d/%Y', '%Y-%m-%d', '%m/%d/%y'):
        try:
            return datetime.datetime.strptime(d, fmt).strftime('%Y-%m-%d')
        except ValueError:
            pass
    return ''


def norm(s):
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', (s or '').lower())).strip()


def giver_type(gtype, giver, candidate):
    g = (gtype or '').lower()
    cw = set(norm(candidate).split())
    gw = [w for w in norm(giver).split() if len(w) > 1 and w not in ('jr', 'sr', 'ii', 'iii', 'mr', 'mrs', 'ms', 'dr')]
    if 'candidate' in g or 'self' in g or (len(gw) >= 2 and all(w in cw for w in gw)):
        return 'S'
    if 'individual' in g:
        return 'I'
    if 'labor' in g or 'union' in g:
        return 'U'
    if 'party' in g:
        return 'R'
    if 'pac' in g or 'political' in g or 'committee' in g or 'caucus' in g:
        return 'P'
    if 'corp' in g or 'business' in g or 'llc' in g:
        return 'C'
    if re.search(r'\b(pac|committee|caucus)\b', giver or '', re.I):
        return 'P'
    if re.search(r'\b(inc|llc|corp|corporation|company|co|lp|llp|ltd|pc|pllc)\b\.?', giver or '', re.I):
        return 'C'
    return 'I' if not g else 'C'


def main():
    args = [a for a in sys.argv[1:]]
    inspect = '--inspect' in args
    drop_amended = '--drop-amended' in args
    check = None
    offices = {}
    if '--check' in args:
        i = args.index('--check'); check = args[i + 1]; del args[i:i + 2]
    if '--offices' in args:
        i = args.index('--offices')
        with open(args[i + 1], newline='') as f:
            for r in csv.DictReader(f):
                offices[norm(r['candidate'])] = r['office'].strip()
        del args[i:i + 2]
    args = [a for a in args if not a.startswith('--')]

    if check and not args and os.path.exists(OUT):
        return show(json.load(open(OUT)), check)

    files = [(a, open(a, 'rb').read()) for a in args] if args else download()

    committees = {}
    amended_rows = 0
    total_rows = 0
    max_date = ''
    for name, data in files:
        reader = rows_of(name, data)
        header = next(reader)
        if inspect:
            print(name, 'columns:', header)
            for _, row in zip(range(5), reader):
                print('  ', row)
            continue
        c = colmap(header)
        get = lambda row, f: row[c[f]].strip() if f in c and c[f] < len(row) else ''
        for row in reader:
            if not row:
                continue
            total_rows += 1
            cand = get(row, 'candidate')
            if not cand:
                continue                      # PACs, parties, caucuses: not a candidate's own committee
            if 'ctype' in c and not re.search(r'candidate', get(row, 'ctype'), re.I):
                continue
            date = iso(get(row, 'date'))
            if not date or date < SINCE:
                continue
            amended = get(row, 'amended').lower() in ('y', 'yes', 'true', '1')
            if amended:
                amended_rows += 1
                if drop_amended:
                    continue
            try:
                amt = float(get(row, 'amount').replace('$', '').replace(',', '') or 0)
            except ValueError:
                continue
            key = (get(row, 'file') or get(row, 'committee')).strip()
            cm = committees.setdefault(key, {'candidate': cand, 'committee': get(row, 'committee'), 'givers': {}, 'total': 0.0, 'count': 0})
            giver = get(row, 'name') or '(no name)'
            g = cm['givers'].setdefault(norm(giver), {'name': giver, 'amount': 0.0, 'n': 0, 'first': date, 'last': date,
                                                       'city': '', 'st': '', 'zip': '', 'occ': '', 'gtype': '', 'kinds': set()})
            g['amount'] += amt
            cm['total'] += amt
            if amt > 0:
                g['n'] += 1
                cm['count'] += 1
            g['first'] = min(g['first'], date)
            if date >= g['last']:
                g['last'] = date
                g['city'], g['st'], g['zip'] = get(row, 'city'), get(row, 'state').upper(), get(row, 'zip')[:5]
                g['occ'] = get(row, 'occ') or g['occ']
                g['gtype'] = get(row, 'gtype') or g['gtype']
            t = get(row, 'type').lower()
            if 'kind' in t:
                g['kinds'].add('K')
            elif 'loan' in t:
                g['kinds'].add('L')
            else:
                g['kinds'].add('D')
            max_date = max(max_date, date)
    if inspect:
        return

    out = []
    for key, cm in committees.items():
        givers = []
        for g in cm['givers'].values():
            if round(g['amount'], 2) <= 0:
                continue
            # K = in-kind only; L = includes loans; '' = cash (or a mix without loans)
            kinds = 'K' if g['kinds'] == {'K'} else 'L' if 'L' in g['kinds'] else ''
            givers.append([g['name'], giver_type(g['gtype'], g['name'], cm['candidate']), round(g['amount'], 2), g['n'], g['first'], g['last'],
                           g['city'], g['st'], g['zip'], g['occ'][:60], kinds])
        if not givers:
            continue
        givers.sort(key=lambda x: -x[2])
        out.append({'candidate': cm['candidate'], 'office': offices.get(norm(cm['candidate']), ''), 'committee': cm['committee'],
                    'file': key, 'url': PORTAL, 'total': round(cm['total'], 2), 'count': cm['count'], 'givers': givers})
    out.sort(key=lambda x: x['candidate'])
    data = {'updated': datetime.date.today().isoformat(), 'through': max_date, 'portal': PORTAL,
            'source': 'Indiana Election Division bulk contribution data, ' + ', '.join(n for n, _ in files),
            'amendedRows': amended_rows, 'droppedAmended': drop_amended, 'candidates': out}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    print('wrote %s: %d candidate committees, %d rows read, latest gift %s, %.1f MB' %
          (os.path.relpath(OUT, ROOT), len(out), total_rows, max_date, os.path.getsize(OUT) / 1e6))
    if amended_rows:
        print('note: %d rows are marked Amended%s. Compare one candidate with the state site (--check) to see whether '
              'amended rows double count; if they do, rerun with --drop-amended.' % (amended_rows, ' and were left out' if drop_amended else ''))
    if check:
        show(data, check)


def show(data, who):
    w = norm(who).split()
    hits = [c for c in data['candidates'] if all(x in norm(c['candidate']).split() for x in w[-1:]) and norm(c['candidate'])[:1] == norm(who)[:1]]
    if not hits:
        print('no committee for', who)
    for c in hits:
        print('\n%s (%s) %s\n  total $%s from %d gifts, 2025-2026, through %s' % (c['candidate'], c['committee'], c['office'] or '',
              format(round(c['total']), ','), c['count'], data['through']))
        for g in c['givers'][:10]:
            print('   $%10s  %-40s %s  %s %s' % (format(round(g[2]), ','), g[0][:40], g[1], g[7], g[8]))


if __name__ == '__main__':
    main()
