# Per-member roll for each Broward motion from the clerk's VOTE line (minutes text in Legistar).
import re
MEM = ['Alston', 'Bogen', 'Fisher', 'Furr', 'Geller', 'Moskowitz', 'Rich', 'Ryan', 'Udine']
def roll(vote, seated=MEM):
    out = {m: 'yes' for m in seated}; flags = []
    m = re.match(r'\s*(?:VOTE:\s*)?(\d+)-(\d+)\.?\s*(.*)', vote or '')
    if not m: return None, None, ['no tally']
    y, n, rest = int(m.group(1)), int(m.group(2)), m.group(3)
    for sent in re.split(r'(?<=\.)\s+|\)\s*', rest):
        names = [k for k in seated if re.search(r'\b' + k + r'\b', sent)]
        if not names: continue
        if re.search(r'voted no', sent): v = 'no'
        elif re.search(r'abstain', sent): v = 'abstained'
        elif re.search(r'not present|out of the room|inaudible|not audible', sent): v = 'absent'
        elif re.search(r'affirmative', sent): v = 'yes'
        else: flags.append('unparsed: ' + sent); continue
        for k in names: out[k] = v
    cy = sum(1 for v in out.values() if v == 'yes'); cn = sum(1 for v in out.values() if v == 'no')
    if (cy, cn) != (y, n): flags.append('tally %d-%d vs parsed %d-%d' % (y, n, cy, cn))
    return out, '%d-%d' % (y, n), flags
