"""Parse OCR'd Board of Trustees certifications (raw/cert-ocr/<dmid>.txt) into raw/bot-items-2019-2024.json.
One record per certification: meeting date, item, title, action, request, applicant, county, consideration, BTLDS ids."""
import json, os, re
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(HERE, 'raw')
idx = json.load(open(os.path.join(R, 'btlds-index-2019-2025.json')))
by = {}
for r in idx:
    if not ('2019-01-08' <= r['agendaDate'][:10] <= '2025-01-21'): continue
    k = r['documentManagementId']
    by.setdefault(k, {'date': r['agendaDate'][:10], 'type': r['agendaSubTypeName'], 'subject': r['subjectName'], 'counties': set()})
    by[k]['counties'].add(r['countyName'])
backup = {}
for k, v in by.items():
    if v['type'] == 'BACKUP': backup.setdefault((v['date'], v['subject'][:60]), k)
def grab(t, label, stops):
    m = re.search(label + r'\s*:?\s*(.*?)(?=' + '|'.join(stops) + r'|\Z)', t, re.S)
    return re.sub(r'\s+', ' ', m.group(1)).strip() if m else None
out = []
for k, v in sorted(by.items(), key=lambda kv: (kv[1]['date'], kv[0])):
    if v['type'] != 'CERTIFICATION': continue
    t = open(os.path.join(R, 'cert-ocr', k + '.txt'), encoding='utf-8').read()
    item = re.search(r'ITEM\s*#\s*(?:Substitute\s+)?Item\s*([0-9]+[A-Z]?)', t) or re.search(r'approved (?:the following )?(?:Substitute )?Item\s*([0-9]+[A-Z]?)', t) or re.search(r'\bItem\s*([0-9]+[A-Z]?)\b', t)
    action = grab(t, r'ACTION', [r'Future Board', r'MEMBERS', r'Action/Follow'])
    if not action:
        m = re.search(r'met on [A-Za-z]+ \d+, \d{4},? and (approved|withdrew|deferred)', t)
        action = (m.group(1).capitalize() + ' (certificate)') if m else None
    title = grab(t, r'TITLE', [r'CABINET MEETING DATE'])
    out.append({
        'dmid': k, 'date': v['date'], 'item': item.group(1) if item else None, 'subject': v['subject'], 'counties': sorted(v['counties']),
        'title': title or v['subject'], 'action': action,
        'request': grab(t, r'REQUEST', [r'VOTING REQUIREMENT', r'COUNTY:', r'APPLICANT', r'=== PAGE']),
        'applicant': grab(t, r'APPLICANT', [r'LOCATION', r'COUNTY:', r'CONSIDERATION', r'STAFF', r'Lease No', r'=== PAGE']),
        'consideration': grab(t, r'CONSIDERATION', [r'APPRAISED', r'STAFF REMARKS', r'=== PAGE', r'REVIEWED']),
        'backup': backup.get((v['date'], v['subject'][:60])),
        'cert_url': 'https://prodenv.dep.state.fl.us/DslBtlds/public/piDownloadDocument?documentManagementID=' + k,
    })
json.dump(out, open(os.path.join(R, 'bot-items-2019-2024.json'), 'w'), indent=1)
print(len(out), sum(1 for o in out if o['action']), sum(1 for o in out if o['item']))
