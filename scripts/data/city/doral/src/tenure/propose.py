# Proposes kind and parties for each parsed Doral minutes item (items.json from parse_minutes.py); the
# output (proposals.tsv) is then reviewed by hand into decisions.txt.
import json, re, sys
x = json.load(open(sys.argv[1]))
EX = re.compile(r'(MINUTES\s*$|Minutes\s*$|PROCLAMATION|Proclamation|Key to the City|APPOINT|NOMINAT|MILLAGE|BUDGET FOR FISCAL|TENTATIVE BUDGET|FINAL BUDGET|Budget Amendment|CERTIFYING AND DECLARING|JOB DESCRIPTION|PAY PLAN|LEGISLATIVE PRIORIT|URGING|SUPPORTING (LEGISLATION|H\.R|THE ADOPTION|SENATE|HOUSE)|OPPOSING|Presentation|PRESENTATION|Monthly Report|Report\s*$|EMPLOYMENT AGREEMENT|RESIGNATION|TRANSFER \$[\d,.]+ FROM (PUBLIC WORKS |)ACCOUNT|AUTHORIZING THE CITY MANAGER TO TRANSFER)', re.I)
SUF = r'(?:INC\.?|INCORPORATED|LLC\.?|L\.L\.C\.|LLP|L\.P\.|LP|CORP\.?|CORPORATION|COMPANY|CO\.|LTD\.?|P\.A\.|PA|PLLC|GROUP|FOUNDATION|ASSOCIATION(?: INC)?|CLUB|CHURCH|ACADEMY|SCHOOL|UNIVERSITY|INSTITUTE|PARTNERS|ASSOCIATES|SERVICES|TRUST|BANK|SOCIETY|COUNCIL|LEAGUE|ALLIANCE)'
ENT = re.compile(r"((?:[A-Z0-9&’'\.\-/]+,? ){0,8}?[A-Z0-9&’'\.\-/]+,? " + SUF + r")(?=[ ,;.)]|$)")
STOP = re.compile(r'^(?:AND|WITH|TO|FROM|THE|OF|FOR|BY|A|AN|APPROVING|AUTHORIZING|AWARDING|EXECUTE|ENTER|INTO|AGREEMENT|AMENDMENT|CONTRACT|WORK|ORDER|PURCHASE|PURCHASES|UTILIZING|ACCEPTING|PROPOSAL|SERVICES|PROVISION|CITY|MANAGER|NEGOTIATE|AN|WAIVING|COMPETITIVE|BID|PROCESS|REQUESTED|REQUEST|HOST|USE|LOGO|PERMIT|SPECIAL|EVENT|SPONSORSHIP|MUNICIPAL|GRANT|GRANTS|IN|AMOUNT|NOT|EXCEED|ON|BEHALF|AT|ITS|ALL|LOCATED|PARTNERSHIP|EXTENDED|HOURS|FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NO\.|MASTER|DEVELOPMENT|SITE|PLAN|MODIFICATION|EXISTING|INCREASE|RATIFYING|AMENDED|RESTATED|PROFESSIONAL|BETWEEN|DORAL|SETTLEMENT|SECTION|8|APPROVE|MIAMI-DADE|COUNTY|TOP|RANKED|FIRMS?|LOWEST|MOST|RESPONSIVE|RESPONSIBLE|BIDDER|BIDDERS|PRE-QUALIFIED|VENDOR|RECOGNIZING|THAT)\s+')
def ents(t):
    out = []
    for m in ENT.finditer(t):
        e = m.group(1).strip(' ,')
        while True:
            e2 = STOP.sub('', e)
            if e2 == e: break
            e = e2
        if len(e) < 6 or re.match(r'^(CITY OF|MIAMI-DADE|FLORIDA DEPARTMENT|STATE OF|SCHOOL BOARD|THE SCHOOL)', e): continue
        if e not in out: out.append(e)
    return out
def kind(t):
    T = t.upper()
    for k, p in [('zoning', r'SITE PLAN|ZONING|LAND USE|PLAT\b|VARIANCE|PLANNED UNIT|MASTER DEVELOPMENT AGREEMENT|PUD|REZONING|FLUM'), ('settlement', r'SETTLEMENT'),
                 ('easement', r'EASEMENT'), ('lease', r'\bLEASE'), ('license', r'SPECIAL EVENT PERMIT|EXTENDED HOURS PERMIT|USE OF THE CITY LOGO|LICENSE|FRANCHISE'),
                 ('grant', r'GRANTS? (IN THE AMOUNT )?TO|SPONSORSHIP|WAIVER OF .*FEES|DONATION'), ('agreement', r'AGREEMENT|MEMORANDUM OF UNDERSTANDING'),
                 ('contract', r'CONTRACT|AWARD|PURCHASE|WORK ORDER|BID|PIGGYBACK|PROPOSAL|SERVICES')]:
        if re.search(p, T): return k
    return 'other'
rows = []
for i, r in enumerate(x):
    if not r['roll'] or EX.search(r['title']): continue
    if re.search(r'Minutes|Presentations', r['section'] or ''): continue
    full = r['title'].split(' :: ')[-1]
    t = re.sub(r'^(A |AN )?(RESOLUTION|ORDINANCE) OF THE MAYOR AND THE CITY COUNCIL OF THE CITY OF DORAL, FLORIDA,? ?', '', full)
    t = re.sub(r'; (AUTHORIZING THE CITY MANAGER TO (EXPEND|EXECUTE ALL)|PROVIDING FOR (IMPLEMENTATION|AN EFFECTIVE|SEVERABILITY|CONFLICTS)).*$', '', t)
    rd = '1' if re.search(r'on First Reading', r['motion'], re.I) else ('2' if re.search(r'Second Reading', r['motion'], re.I) else '0')
    amts = re.findall(r'\$([\d,]+\.\d\d)', t)
    rows.append([str(i), r['date'], r['item'], r['file'], kind(t), ';'.join(ents(t)), rd, amts[0].replace(',', '') if len(amts) == 1 else '', t[:260]])
print('\n'.join('|'.join(r) for r in rows))
