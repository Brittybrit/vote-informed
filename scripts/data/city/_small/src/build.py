"""Build scripts/data/city/<slug>/actions.json from compact TSV rows.

rows.tsv columns: idsuffix, ref, kind2, amount, roll(letters per member: y/n/a/-), moverIdx, secondIdx,
meetingIdx, parties(;), title, notes
meetings.tsv columns: idx, date, name, url-or-key, extra
"""
import json, sys, os

KIND = {'co': 'contract', 'zo': 'zoning', 'le': 'lease', 'sa': 'sale', 'gr': 'grant', 'se': 'settlement',
        'li': 'license', 'ag': 'agreement', 'ea': 'easement', 'ot': 'other'}
ROLL = {'y': 'yes', 'n': 'no', 'a': 'absent'}


def build(cfg):
    base = os.path.dirname(os.path.abspath(__file__))
    meetings = {}
    order = []
    for line in open(os.path.join(base, cfg['slug'] + '_meetings.tsv')):
        line = line.rstrip('\n')
        if not line:
            continue
        idx, date, name, a, b = (line.split('\t') + ['', '', '', '', ''])[:5]
        url = cfg['meeting_url'](a, b)
        read = not b.startswith('AGENDA:') and not b.startswith('NOREAD')
        m = {'date': date, 'name': name, 'url': url, 'read': read}
        if not read:
            m['note'] = cfg.get('agenda_note', 'Agenda only; no minutes posted')
        meetings[idx] = m
        order.append(idx)
    mem = cfg['members']
    actions = []
    for line in open(os.path.join(base, cfg['slug'] + '_rows.tsv')):
        line = line.rstrip('\n')
        if not line.strip():
            continue
        f = line.split('\t')
        f += [''] * (11 - len(f))
        sid, ref, k, amt, roll, mv, sc, mi, parties, title, notes = f[:11]
        m = meetings[mi]
        r = None
        tally = None
        partial = roll.startswith('~')
        roll = roll.lstrip('~')
        if roll:
            r = {mem[i]: ROLL[c] for i, c in enumerate(roll) if c != '-'}
            yes = sum(1 for v in r.values() if v == 'yes')
            no = sum(1 for v in r.values() if v == 'no')
            tally = None if partial else f'{yes}-{no}'
        a = {
            'id': f"{cfg['slug']}-{sid}",
            'date': m['date'],
            'ref': ref or None,
            'title': title,
            'kind': KIND[k],
            'parties': [p.strip() for p in parties.split(';') if p.strip()],
            'amount': (float(amt) if '.' in amt else int(amt)) if amt else None,
            'url': m['url'],
            'roll': r,
            'tally': tally,
            'mover': mem[int(mv)] if mv != '' else None,
            'second': mem[int(sc)] if sc != '' else None,
            'notes': notes or None,
        }
        if not roll:
            a['notes'] = (a['notes'] + '; ' if a['notes'] else '') + 'No vote recorded in the posted record'
        actions.append(a)
    actions.sort(key=lambda a: (a['date'], a['id']))
    ids = [a['id'] for a in actions]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        sys.exit('duplicate ids: %s' % dup)
    out = {
        'city': cfg['city'],
        'body': cfg['body'],
        'window': cfg['window'],
        'members': cfg.get('member_names'),
        'standard': 'Every action benefiting a named private party (contracts, purchases, renewals, change orders, '
                    'piggybacks, zoning/land use/variances/plats/site plans/development agreements, leases and sales of '
                    'public land, grants and fee waivers to named organizations, settlements, easements, licenses). '
                    'Excludes proclamations, ceremonial items, appointments, internal staffing, '
                    'government-only items. Built without reference to donors.',
        'sources': cfg['sources'],
        'meetings': [meetings[i] for i in sorted(order, key=lambda i: (meetings[i]['date'], meetings[i]['name']))],
        'actions': actions,
        'gaps': cfg['gaps'],
    }
    dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", cfg["slug"], "actions.json")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, 'w') as fh:
        json.dump(out, fh, indent=1, ensure_ascii=False)
        fh.write('\n')
    print(cfg['slug'], 'meetings', len(out['meetings']), 'read', sum(m['read'] for m in out['meetings']),
          'actions', len(actions), 'gaps', len(cfg['gaps']))
    return out


if __name__ == '__main__':
    import importlib.util
    spec = importlib.util.spec_from_file_location('cfg', sys.argv[1])
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    build(mod.CFG)
