"""Shared helpers for the prior-cities-south builders: action records in the shape of scripts/data/city/<slug>/actions.json."""
import json, re, os, datetime
KIND = {'c': 'contract', 'z': 'zoning', 'a': 'agreement', 'o': 'other', 'l': 'lease', 'g': 'grant', 's': 'sale',
        'p': 'license', 'e': 'easement', 't': 'settlement', 'contract': 'contract', 'zoning': 'zoning', 'agreement': 'agreement',
        'lease': 'lease', 'grant': 'grant', 'land': 'sale', 'permit': 'license', 'easement': 'easement', 'settlement': 'settlement'}
def amount_of(text):
    a = sorted(set(re.findall(r'\$\s?([\d,]+(?:\.\d\d)?)', text or '')))
    if len(a) == 1:
        try: return float(a[0].replace(',', ''))
        except ValueError: return None
    return None
def parties_of(field, owners=None, date=None):
    out = []
    for x in (field or '').split(';'):
        x = x.strip()
        if not x or x in ('-', '?'): continue
        if x.startswith('@'):
            o = (owners or {}).get(x[1:].strip())
            out.append(o['owner'] if o and o.get('owner') else 'Owner of ' + x[1:].strip())
        else:
            out.append(x)
    return out
def tally(roll):
    if not roll: return None
    return [sum(v == 'yes' for v in roll.values()), sum(v == 'no' for v in roll.values())]
def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1); f.write('\n')
def read_decisions(path):
    rows = []
    for line in open(path):
        line = line.rstrip('\n')
        if not line.strip() or line.startswith('#'): continue
        p = line.split('|')
        while len(p) < 5: p.append('')
        rows.append(dict(key=p[0], kind=p[1], parties=p[2], title=p[3], note=p[4]))
    return rows
