# Query lda.gov for filings naming each recipient as client, filing years 2021-2024. Cached per query.
import json, os, time, urllib.request, urllib.parse, sys
C = 'lda_cache'; os.makedirs(C, exist_ok=True)
Q = json.load(open('lda_queries.json'))   # {key: [search strings]}
years = [int(y) for y in sys.argv[1].split(',')]
def get(url):
    for a in range(8):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'Accept': 'application/json'}), timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(6 + a * 4); continue
            raise
        except Exception: time.sleep(5)
    raise Exception('fail ' + url)
ALL = sorted({n for v in Q.values() for n in v})
for n in ALL:
    k = 'q'
    if True:
        for y in years:
            f = f"{C}/{k}|{n}|{y}.json".replace('/', '_').replace(' ', '_')
            f = C + '/' + f.split('_', 1)[1] if False else os.path.join(C, (k + '|' + n + '|' + str(y)).replace('/', '-'))
            if os.path.exists(f): continue
            url = 'https://lda.gov/api/v1/filings/?' + urllib.parse.urlencode({'client_name': n, 'filing_year': y, 'page_size': 25})
            out = []
            while url:
                d = get(url); out += d['results']; url = d.get('next'); time.sleep(2.2)
            slim = [{'uuid': r['filing_uuid'], 'type': r['filing_type'], 'year': r['filing_year'], 'posted': r['dt_posted'][:10], 'client': r['client']['name'], 'clientId': r['client']['id'],
                     'registrant': r['registrant']['name'], 'registrantId': r['registrant']['id'],
                     'lobbyists': sorted({(l['lobbyist']['first_name'] + ' ' + l['lobbyist']['last_name']).upper().strip() for a in (r.get('lobbying_activities') or []) for l in a['lobbyists']}),
                     'issues': sorted({a.get('general_issue_code') for a in (r.get('lobbying_activities') or [])}), 'income': r.get('income'), 'expenses': r.get('expenses')} for r in out]
            json.dump(slim, open(f, 'w'))
            print(k, n, y, len(slim), flush=True)
