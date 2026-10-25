import json, re, csv, sys, openpyxl
sys.path.insert(0, '.')
D = '/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/raw/cpf/'
N = {'Diaz-Balart': 'Diaz-Balart', 'Salazar': 'Salazar', 'Gimenez': 'Gimenez', 'Donalds': 'Donalds', 'Moskowitz': 'Moskowitz'}
SRC = {'FY2022': 'https://democrats-appropriations.house.gov/sites/evo-subsites/democrats-appropriations.house.gov/files/documents/Community%20Project%20Funding%20Request%20Table%20-%2006222021.csv_.xlsx',
       'FY2023': 'https://democrats-appropriations.house.gov/sites/evo-subsites/democrats-appropriations.house.gov/files/documents/FY23%20CPF%20Requests%202022-06-06.xlsx',
       'FY2024': 'https://appropriations.house.gov/sites/evo-subsites/republicans-appropriations.house.gov/files/FY%202024%20House%20CPF%20Requests%202023-04-27%20%28430pm%29.xlsx'}
MURL = {'Diaz-Balart': 'https://mariodiazbalart.house.gov/issues/cpf-requests', 'Salazar': 'https://salazar.house.gov/', 'Gimenez': 'https://gimenez.house.gov/services/community-project-funding', 'Donalds': 'https://donalds.house.gov/services/community-funding.htm', 'Moskowitz': 'https://moskowitz.house.gov/appropriations-disclosures'}
SUB = {'CJS': 'Commerce, Justice, Science', 'THUD': 'Transportation, Housing and Urban Development', 'AG': 'Agriculture', 'Labor HHS': 'Labor, Health and Human Services', 'Interior': 'Interior and Environment', 'FSGG': 'Financial Services and General Government', 'Energy and Water': 'Energy and Water', 'Homeland Security': 'Homeland Security', 'Defense': 'Defense', 'MilCon': 'Military Construction, Veterans Affairs'}
def mem(s):
    for k in N:
        if k in str(s): return k
reqs = []
rows = list(openpyxl.load_workbook(D + 'fy22-requests.xlsx', read_only=True).worksheets[0].iter_rows(values_only=True))
for r in rows[1:]:
    m = mem(r[0])
    if m: reqs.append({'member': m, 'fy': 'FY2022', 'subcommittee': r[2], 'recipient': None, 'project': str(r[3]).strip(), 'address': r[5], 'amount': int(float(r[4])), 'source': SRC['FY2022']})
rows = list(openpyxl.load_workbook(D + 'fy23-requests.xlsx', read_only=True).worksheets[0].iter_rows(values_only=True))
for r in rows[1:]:
    m = mem(r[0])
    if not m: continue
    amt = r[3]
    try: amt = int(float(amt))
    except: amt = 0
    reqs.append({'member': m, 'fy': 'FY2023', 'subcommittee': SUB.get(r[1], r[1]), 'recipient': (r[4] if r[4] and r[4] != 'None' else None), 'project': str(r[2]).strip(), 'address': None, 'amount': amt, 'source': SRC['FY2023']})
rows = list(openpyxl.load_workbook(D + 'fy24-requests.xlsx', read_only=True).worksheets[0].iter_rows(values_only=True))
for r in rows[1:]:
    m = mem(r[0])
    if m: reqs.append({'member': m, 'fy': 'FY2024', 'subcommittee': r[4], 'recipient': str(r[5]).strip(), 'project': str(r[6]).strip(), 'address': r[7], 'amount': int(round(float(r[8]))), 'source': SRC['FY2024'], 'memberUrl': r[9]})
for r in json.load(open('fy25.json')):
    r['memberUrl'] = r.pop('source'); r['source'] = r['memberUrl']; reqs.append(r)
for r in reqs:
    r.setdefault('memberUrl', MURL[r['member']])
json.dump(reqs, open('requests-raw.json', 'w'), indent=1)
import collections
print(collections.Counter((r['member'], r['fy']) for r in reqs))
