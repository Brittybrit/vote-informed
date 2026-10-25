"""House floor votes of this slice's members on laws already screened by other slices (not re-screened here):
- 2022A, 2022D, 2023B, 2023, 2023C, 2024 sessions: ../../flhouse/bills-2023.json, bills-2024.json (Lopez; 2022D also Avila, Ingoglia)
- 2025 sessions: ../../../state/bills/universe.json (Lopez, seated until Nov 18, 2025)
- 2021, 2021A, 2021B, 2022, 2022C: ../../flhouse/bills-2122.json (Avila, Ingoglia)
For each qualifying law, the same House roll call those files use (their votes.house.url), re-read from the official
PDF for these members (rolls.py; marks matched by surname and district). Writes ../bills-2122.json, ../bills-2023.json,
../bills-2024.json and ../bills-2025.json in the shape of ../../flhouse/bills-2023.json, with "screenedBy" naming the
source and "missing" listing laws whose roll call is not read yet.
Run: python3 build-reuse.py"""
import json, os, sys
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import rolls
T = os.path.join(H, '..', '..')
SRC = {'2122': ('flhouse/bills-2122.json', ['Avila', 'Ingoglia'], 'flsenate'),
       '2023': ('flhouse/bills-2023.json', ['Lopez', 'Avila', 'Ingoglia'], 'flhouse'),
       '2024': ('flhouse/bills-2024.json', ['Lopez'], 'flhouse'),
       '2025': ('../state/bills/universe.json', ['Lopez'], 'state')}
for key, (f, mem, by) in SRC.items():
    U = json.load(open(os.path.join(T, f)))
    out, missing = [], {'roll': [], 'houseVote': []}
    # laws whose House roll call the source lists only under missing.C (its URL is known, the roll was not read there)
    extra = {m[0]: m[2] for m in (U.get('missing') or {}).get('C', []) if isinstance(m, list) and m[1] == 'H'}
    for b in U['bills']:
        if not b.get('benefits'): continue
        if key == '2025' and not str(b['session']).startswith('2025'): continue
        rec = {k: b.get(k) for k in ('bill', 'session', 'chapter', 'title', 'url', 'analysisUrl', 'benefits', 'screen', 'note')}
        rec['screenedBy'] = b.get('screenedBy') or by; rec['votes'] = {}
        h = (b.get('votes') or {}).get('house')
        if not h and b['chapter'] in extra: h = {'url': extra[b['chapter']], 'motion': None, 'date': None, 'tally': None}
        if not h: missing['houseVote'].append(b['chapter']); out.append(rec); continue
        r = rolls.read(h['url'], mem, h.get('date'))
        if r is None: missing['roll'].append(b['chapter'])
        else:
            d, tal, act = rolls.meta(rolls.plain(rolls.text(h['url'])))
            rec['votes']['house'] = {'date': d or h.get('date'), 'motion': h.get('motion') or act or 'final passage', 'tally': tal or h.get('tally'), 'url': h['url'], 'roll': r}
        out.append(rec)
    seated = [m for m in mem]
    J = {'generated': 'scripts/data/tenure/prior-flhouse/bills/build-reuse.py', 'extends': 'scripts/data/state/bills/universe.json',
         'rule': f'Qualifying laws as screened in scripts/data/{"tenure/" if not f.startswith("..") else ""}{f.replace("../", "")} (not re-screened); House floor votes of ' + ', '.join(seated) + ' read from the same official roll call. A member is "not seated" on dates outside their House tenure.',
         'members': {m: {'district': rolls.MEMBERS[m][1], 'start': rolls.MEMBERS[m][2], 'end': rolls.MEMBERS[m][3]} for m in mem},
         'counts': {'qualifying': len(out), 'withHouseVote': sum(1 for x in out if x['votes'])}, 'missing': missing, 'bills': out}
    json.dump(J, open(os.path.join(H, '..', f'bills-{key}.json'), 'w'), indent=1, ensure_ascii=False)
    tally = {m: {} for m in mem}
    for x in out:
        for m, v in x['votes'].get('house', {}).get('roll', {}).items(): tally[m][v] = tally[m].get(v, 0) + 1
    print(key, J['counts'], {k: len(v) for k, v in missing.items()}, tally)
