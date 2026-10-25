# Index clerk.house.gov roll XMLs: per roll -> date, legis, question, desc, totals, our members' votes
import datetime
import os, re, json, sys
import xml.etree.ElementTree as ET
D = sys.argv[1]; OUT = sys.argv[2]
IDS = {'D000600': 'Diaz-Balart', 'S000168': 'Salazar', 'G000593': 'Gimenez', 'D000032': 'Donalds', 'M001217': 'Moskowitz'}
idx = json.load(open(OUT)) if os.path.exists(OUT) else {}
for y in sorted(os.listdir(D)):
    for f in sorted(os.listdir(os.path.join(D, y))):
        k = y + '-' + f[4:-4].lstrip('0')
        if k in idx: continue
        s = open(os.path.join(D, y, f), 'rb').read()
        if b'<rollcall-vote>' not in s: continue
        r = ET.fromstring(s); m = r.find('vote-metadata')
        tot = m.find('vote-totals/totals-by-vote')
        t = lambda p: (tot.findtext(p) or '').strip() if tot is not None else ''
        votes = {}
        for rv in r.findall('vote-data/recorded-vote'):
            lg = rv.find('legislator'); nid = lg.get('name-id')
            if nid in IDS: votes[IDS[nid]] = rv.findtext('vote')
        idx[k] = {'y': int(y), 'roll': int(f[4:-4]), 'date': m.findtext('action-date'), 'congress': m.findtext('congress'),
                  'legis': (m.findtext('legis-num') or '').strip(), 'q': (m.findtext('vote-question') or '').strip(),
                  'desc': (m.findtext('vote-desc') or '').strip(), 'result': m.findtext('vote-result'),
                  'yea': t('yea-total'), 'nay': t('nay-total'), 'present': t('present-total'), 'nv': t('not-voting-total'), 'm': votes}
json.dump(idx, open(OUT, 'w'))
print(len(idx))
# HTML pages for rolls above 999 (clerk.house.gov/Votes/YYYYNNNN)
import glob
IDS2 = {'D000600': 'Diaz-Balart'}
for f in sorted(glob.glob(os.path.join(D, '*', 'h*.html'))):
    y = os.path.basename(os.path.dirname(f)); n = int(os.path.basename(f)[1:-5]); k = y + '-' + str(n)
    if k in idx: continue
    s = open(f, errors='ignore').read()
    q = re.search(r'<label>Vote Question:</label>\s*(.*?)</p>', s, re.S)
    dt = re.search(r'first-row heading"[^>]*>\s*([A-Z][a-z]{2} \d{2}, \d{4})', s)
    leg = re.search(r'<a [^>]*href="[^"]*bill[^"]*"[^>]*>\s*([A-Z. ]+\d+)\s*</a>', s)
    votes = {}
    for nid, name in IDS2.items():
        m = re.search(r'/Members/' + nid + r'".*?<td data-label="vote">([^<]+)</td>', s, re.S)
        if m: votes[name] = m.group(1).strip()
    tot = re.search(r'<td[^>]*>\s*Totals?\s*</td>\s*<td[^>]*>\s*(\d+)\s*</td>\s*<td[^>]*>\s*(\d+)\s*</td>\s*<td[^>]*>\s*(\d+)\s*</td>\s*<td[^>]*>\s*(\d+)\s*</td>', s, re.S)
    d = datetime.datetime.strptime(dt.group(1), '%b %d, %Y').strftime('%d-%b-%Y') if dt else None
    idx[k] = {'y': int(y), 'roll': n, 'date': d, 'congress': None, 'legis': (leg.group(1).replace('.', ' ').replace('  ', ' ').strip().upper() if leg else ''), 'q': re.sub(r'\s+', ' ', q.group(1)).strip() if q else '',
              'desc': '', 'result': None, 'yea': tot.group(1) if tot else '', 'nay': tot.group(2) if tot else '', 'present': tot.group(3) if tot else '', 'nv': tot.group(4) if tot else '', 'm': votes, 'html': True}
json.dump(idx, open(OUT, 'w'))
print(len(idx))
