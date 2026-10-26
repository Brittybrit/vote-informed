# Drafts decision lines (key|kind|parties|title|note) for the non-purchase items of a year, from the printed captions.
# The drafts are checked and corrected by hand into decisions-<year>.txt; nothing here is final.
import json, re, sys
SP = __import__('os').path.dirname(__import__('os').path.abspath(__file__))
I = json.load(open(SP + '/cache/items.json'))
GOV = re.compile(r'^(the )?(State of Florida|Florida Department|Department of|Palm Beach County|Board of County Commissioners|County|School (Board|District)|'
                 r'Florida Inland Navigation|Solid Waste Authority|South Florida Water|Lake Worth Drainage|Greater Boca Raton Beach|Beach and Park|'
                 r'Boca Raton Community Redevelopment|Community Redevelopment Agency|CRA\b|City of|Town of|Village of|Florida Atlantic University|FAU\b|'
                 r'Board of Trustees|United States|U\.S\.|Federal|Florida Fish|Florida Division|Florida Communities Trust|Palm Tran|'
                 r'South Florida Regional|Treasure Coast|Supervisor of Elections|Palm Beach (State College|Sheriff|Transportation)|Boca Raton Airport Authority|'
                 r'Florida East Coast Railway|Institute of Police|Bureau of|Florida Atlantic Research|Florida Municipal|Florida League of Cities|Boca Raton Housing Authority|'
                 r'Office of|Florida Office|National Oceanic|FDOT|FDEP|Children.s Services Council|Florida Commission|Florida Highway|State Attorney|'
                 r'Public Defender|Florida International|Florida Housing Finance|Housing Finance Authority|Palm Beach Metropolitan|Metropolitan Planning)', re.I)
def short(t):
    t = re.sub(r'^.*?(?=An? (resolution|ordinance) of)', '', t, flags=re.I | re.S) if re.search(r'An? (resolution|ordinance) of', t, re.I) else t
    t = re.sub(r'An? (resolution|ordinance) of the City (Council )?of Boca Ra\w*\s*,?\s*(Florida,?)?\s*', '', t, flags=re.I)
    t = re.sub(r'providing for (severability|repealer|codification|conflicts?|an effective date)[;:,]?\s*|providing an effective date', '', t)
    return re.sub(r'\s+', ' ', t).strip(' ;')
def clean_party(p):
    p = re.sub(r'\s+,', ',', p); p = re.sub(r'\s+\.', '.', p); p = re.sub(r'\s{2,}', ' ', p)
    return p.strip(' ,;')
PAT = [
    (r'(?:qualified applicant|incentive)', r'(?:recommending|approving)\s+(.+?)\s+(?:be approved )?as a qualified applicant', 'grant', 'Approved economic development incentives for {p}'),
    (r'settlement', r'(?:claim|lawsuit|case|action)\s+(?:filed )?(?:by|of|with|styled)\s+(.+?)(?:\s*\(|,|;| against| v\.|$)', 'settlement', 'Settled a claim by {p}'),
    (r'[Ee]asement [Dd]eed (?:from|with)', r'[Ee]asement [Dd]eed (?:from|with)\s+(.+?)(?:,| over| for|;|$)', 'easement', 'Accepted an easement from {p}'),
    (r'easement (?:deed )?(?:granting|to)', r'easement (?:deed )?(?:granting (?:a |an )?(?:non-exclusive )?easement )?to\s+(.+?)(?: over|,|;|$)', 'easement', 'Granted an easement to {p}'),
    (r'license', r'license(?: agreement)?\s+(?:with|to)\s+(.+?)(?:\s*\(|,? for| to | pursuant|;|$)', 'license', 'Granted a license to {p}'),
    (r'lease', r'lease(?: agreement)?\s+(?:with|to)\s+(.+?)(?:\s*\(|,? for| to | pursuant|;|$)', 'lease', 'Approved a lease with {p}'),
    (r'[Ff]ranchise', r'[Ff]ranchise [Aa]greement[s]? (?:and [^;]*? )?with\s+(.+?)(?: pursuant|;|$)', 'license', 'Granted a franchise to {p}'),
    (r'.', r'(?:agreement|contract|[Ww]ork [Oo]rder(?: No\.? ?\d+)?|[Aa]mendment|memorandum of understanding|[Mm]emorandum of [Aa]greement|stipulation(?: of parties)?|purchase|grant agreement|[Aa]greement[s]?|MOU|addendum|task order(?: No\.? ?\d+)?|renewal)\s+(?:No\.? ?[\w\-]+ )?(?:with|between the City and|to)\s+(?:the\s+)?(.+?)(?:\s*\(|,? (?:for|in order|pursuant|relating|regarding|to provide|to permit|to allow|as |and documents|under|in an amount|in the amount|in support)\b|;|$)', 'contract', 'Approved an agreement with {p}'),
]
y = sys.argv[1]
for it in I:
    if it['date'][:4] != y or it['purchase']: continue
    cap = short(it['caption'])
    v = it['vote']
    if not v: continue
    kind = party = title = ''
    if re.search(r'Quasi|QUASI', it['section']) or re.search(r'site plan|conditional use|rezoning|plat known|variance|abandonment|Future Land Use Map|master plan', cap, re.I):
        kind = 'zoning'
        m = re.search(r'for (?:the )?([A-Z][\w&\'\.\- ]+?(?:School|Church|Club|Hospital|University|Center|Academy|Temple|Synagogue|Inc\.?|LLC|Brewery|Hotel|Resort|Course|Association))\b', cap)
        party = m.group(1) if m else ''
        title = 'Approved %s for %s' % (re.search(r'(site plan|conditional use|rezoning|plat|variance|abandonment|land use map amendment|master plan)', cap, re.I).group(1).lower() if re.search(r'(site plan|conditional use|rezoning|plat|variance|abandonment|land use map amendment|master plan)', cap, re.I) else 'a development approval', party or '?')
    else:
        for trig, pat, k, tt in PAT:
            if not re.search(trig, cap): continue
            m = re.search(pat, cap)
            if m:
                party = clean_party(m.group(1)); kind = k; title = tt.format(p=party)
                pm = re.search(r'(?:for the purpose of|for the provision of|in order to|to provide|for)\s+(?:providing\s+)?(.+?)(?:;|$)', cap[m.end(1):])
                if pm and k in ('contract', 'grant', 'license', 'lease'):
                    pu = re.sub(r'^(the|a|an)\s+', '', pm.group(1).strip())
                    if len(pu) > 80: pu = pu[:80].rsplit(' ', 1)[0]
                    title += ' for ' + pu
                break
    if party and GOV.match(party): kind = 'X-gov'
    if not party and not kind: kind = '-'
    print('%s|%s|%s|%s|| %s' % (it['key'], kind, party, title, cap[:260]))
