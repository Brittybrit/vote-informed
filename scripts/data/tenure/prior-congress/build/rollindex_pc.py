# Index clerk.house.gov roll XMLs 2013-2016 for Jolly (J000296) and Graham (G000575).
import os, json, sys
import xml.etree.ElementTree as ET
D = sys.argv[1]; OUT = sys.argv[2]
IDS = {'J000296': 'Jolly', 'G000575': 'Graham'}
idx = {}
for y in ['2013', '2014', '2015', '2016']:
    for f in sorted(os.listdir(os.path.join(D, y))):
        s = open(os.path.join(D, y, f), 'rb').read()
        if b'<rollcall-vote>' not in s: continue
        r = ET.fromstring(s); m = r.find('vote-metadata')
        tot = m.find('vote-totals/totals-by-vote')
        t = lambda p: (tot.findtext(p) or '').strip() if tot is not None else ''
        votes = {}
        for rv in r.findall('vote-data/recorded-vote'):
            nid = rv.find('legislator').get('name-id')
            if nid in IDS: votes[IDS[nid]] = rv.findtext('vote')
        k = y + '-' + str(int(f[4:-4]))
        idx[k] = {'y': int(y), 'roll': int(f[4:-4]), 'date': m.findtext('action-date'), 'congress': m.findtext('congress'),
                  'legis': (m.findtext('legis-num') or '').strip(), 'q': (m.findtext('vote-question') or '').strip(),
                  'desc': (m.findtext('vote-desc') or '').strip(), 'result': m.findtext('vote-result'),
                  'yea': t('yea-total'), 'nay': t('nay-total'), 'present': t('present-total'), 'nv': t('not-voting-total'), 'm': votes}
json.dump(idx, open(OUT, 'w'))
print(len(idx))
