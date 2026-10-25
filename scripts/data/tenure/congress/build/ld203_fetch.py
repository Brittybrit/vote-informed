import json, os, time, urllib.request, urllib.parse, sys
C = 'ld203_cache'; os.makedirs(C, exist_ok=True)
Q = [('Diaz-Balart', 'Diaz-Balart'), ('Salazar', 'Salazar'), ('Gimenez', 'Gimenez'), ('Donalds', 'Donalds'), ('Moskowitz', 'Moskowitz')]
years = [int(y) for y in sys.argv[1].split(',')]
def get(url):
    for a in range(10):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'Accept': 'application/json'}), timeout=90) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(8 + a * 5); continue
            raise
        except Exception: time.sleep(6)
    raise Exception('fail ' + url)
for m, q in Q:
    for y in years:
        f = os.path.join(C, f'{m}|{y}.json')
        if os.path.exists(f): continue
        url = 'https://lda.gov/api/v1/contributions/?' + urllib.parse.urlencode({'contribution_honoree': q, 'filing_year': y, 'page_size': 25})
        out = []
        while url:
            d = get(url); time.sleep(2.2)
            for r in d['results']:
                items = [i for i in r.get('contribution_items') or [] if q.lower() in ((i.get('honoree_name') or '') + ' ' + (i.get('payee_name') or '')).lower()]
                if items: out.append({'uuid': r['filing_uuid'], 'year': r['filing_year'], 'type': r['filing_type'], 'posted': r['dt_posted'][:10], 'filerType': r['filer_type'],
                                      'registrant': (r.get('registrant') or {}).get('name'), 'registrantId': (r.get('registrant') or {}).get('id'),
                                      'lobbyist': ((r.get('lobbyist') or {}).get('first_name', '') + ' ' + (r.get('lobbyist') or {}).get('last_name', '')).strip().upper() or None,
                                      'items': items})
            url = d.get('next')
        json.dump(out, open(f, 'w')); print(m, y, len(out), flush=True)
