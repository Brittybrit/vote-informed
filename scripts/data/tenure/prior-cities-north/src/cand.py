"""Shared helpers: pick qualifying-action candidates from resolution/ordinance titles and guess kind, parties, amount.
The guesses are reviewed by hand (decisions/*.tsv) before anything is written."""
import re

EXCL = re.compile(r'\b(INTERLOCAL|UNIFORM METHOD|MILLAGE|TENTATIVE BUDGET|FINAL BUDGET|BUDGET AMENDMENT|AMENDING THE (?:FISCAL|BUDGET)|APPOINT|PROCLAIM|PROCLAMATION|RECOGNIZING|COMMENDING|HONORING|URGING|OPPOSING|SUPPORTING (?:HOUSE|SENATE|THE PASSAGE|LEGISLATION)|CO-DESIGNAT|DESIGNATING .{0,40} (?:WAY|STREET|AVENUE)|RENAMING|NAMING|LEGISLATIVE PRIORITIES|CANVASS|ELECTION|BALLOT|SYMPATHY|MOMENT OF SILENCE|EMPLOYEE OF|PERSONNEL POLICY|PAY PLAN|SALARY|CITY MANAGER.{0,30}EMPLOYMENT AGREEMENT|CITY ATTORNEY.{0,30}EMPLOYMENT|CITY CLERK.{0,30}EMPLOYMENT)\b')
GOVONLY = re.compile(r'(MIAMI-DADE COUNTY|STATE OF FLORIDA|FLORIDA DEPARTMENT|FDOT|UNITED STATES|U\.S\. DEPARTMENT|SCHOOL BOARD|CITY OF [A-Z ]+|TOWN OF [A-Z ]+|VILLAGE OF|DEPARTMENT OF|FEDERAL|COUNTY|TRANSPORTATION PLANNING|CHILDREN.S TRUST|SOUTH FLORIDA REGIONAL|HOUSING FINANCE AUTHORITY|COMMUNITY REDEVELOPMENT AGENCY|FLORIDA INLAND|SOUTH FLORIDA WATER)')
KINDS = [
    ('settlement', r'SETTLEMENT|SETTLE\b|CLAIM OF|LAWSUIT'),
    ('zoning', r'REZON|ZONING|VARIANCE|SITE PLAN|\bPLAT\b|TENTATIVE PLAT|FINAL PLAT|SPECIAL EXCEPTION|CONDITIONAL USE|DEVELOPMENT AGREEMENT|LAND USE|FUTURE LAND|PLANNED (?:UNIT )?DEVELOPMENT|DEVELOPMENT ORDER|WAIVER OF PLAT|REQUEST OF|APPLICATION OF|APPLICANT|ABANDON|VACAT|CLOSURE OF|SPECIAL TAXING DISTRICT APPLICATION'),
    ('easement', r'EASEMENT'),
    ('lease', r'\bLEASE|SUBLEASE|USE AGREEMENT|LICENSE AGREEMENT|CONCESSION'),
    ('sale', r'SALE OF|CONVEY|PURCHASE OF (?:THAT |THE )?(?:CERTAIN )?(?:REAL )?PROPERTY|ACQUI(?:RE|SITION) OF (?:REAL )?PROPERTY|PURCHASE AND SALE|DONAT(?:E|ION|ING) (?:OF )?(?:CITY )?(?:REAL )?PROPERTY|SURPLUS'),
    ('grant', r'ALLOCAT|SPONSOR(?:SHIP)? (?:OF|FOR|TO)|IN SUPPORT OF|DONATION TO|CONTRIBUTION TO|GRANT (?:TO|AGREEMENT WITH)|FUNDING (?:TO|FOR)|WAIV(?:E|ING|ER OF) (?:THE )?(?:FEE|RENTAL|COST)|FEE WAIVER|IN-KIND|COMMUNITY (?:DEVELOPMENT|PARTNER)|CDBG'),
    ('license', r'\bPERMIT\b|LICENSE\b|FRANCHISE'),
    ('contract', r'AWARD|\bBID\b|\bRFP\b|\bITB\b|\bRFQ\b|PURCHAS|PIGGYBACK|CONTRACT|AGREEMENT|CHANGE ORDER|SOLE SOURCE|PROFESSIONAL SERVICES|RENEW|EXTENSION|AMENDMENT|EXPENDITURE|TASK ORDER|WORK ORDER|PROPOSAL|ENGAG|RETAIN|PAYMENT TO|COLLECTIVE BARGAINING|PARTNER|OUTSIDE COUNSEL|COUNSEL LIST|SPONSOR THE USE'),
]
SUFFIX = r'(?:INC\.?|INCORPORATED|LLC|L\.L\.C\.|CORP\.?|CORPORATION|CO\.|COMPANY|P\.A\.|PA|P\.L\.|PL|PLLC|LLP|LTD\.?|L\.P\.|LP|GROUP|ASSOCIATES|PARTNERS|FOUNDATION|ASSOCIATION|CHURCH|MINISTRIES|ENTERPRISES|SERVICES|CONSULTING|CONSTRUCTION|ENGINEERING|SOLUTIONS|HOLDINGS|TRUST|SOCIETY|CLUB|ACADEMY|COUNCIL|FEDERATION|UNION|BENEVOLENT ASSOCIATION|LEAGUE|INSTITUTE|CENTER|USA|AMERICA)'
PAT = [
    r'\bWITH\s+(?:THE\s+)?([A-Z0-9&\'\.,\- ]{3,90}?)(?:,\s*(?:A|AN)\s+(?:FLORIDA|DELAWARE|NOT)|\s+FOR\s|\s+TO\s|;|\s+IN\s+(?:AN|THE)\s|\s+PURSUANT|\s+UTILIZING|\s+UNDER|\s+RELATING|\s+REGARDING|\s+AS\s|\s+NUNC|\s+PIGGYBACK|\s+FROM\s|\s+AND\s+THE\s+CITY|\s+\()',
    r'\b(?:AWARD(?:ING)?|AWARDED)\s+(?:A\s+|THE\s+)?(?:BID|CONTRACT|RFP|ITB|RFQ|PROPOSAL)?[^;]{0,40}?\bTO\s+(?:THE\s+)?([A-Z0-9&\'\.,\- ]{3,90}?)(?:,\s*(?:A|AN)\s|\s+FOR\s|;|\s+IN\s+(?:AN|THE)\s|\s+PURSUANT|\s+UTILIZING|\s+AS\s|\s+\()',
    r'\bFROM\s+(?:THE\s+)?([A-Z0-9&\'\.,\- ]{3,90}?' + SUFFIX + r')\b',
    r'\bIN\s+SUPPORT\s+OF\s+(?:THE\s+)?([A-Z0-9&\'\.,\- ]{3,90}?)(?:;|\s+FOR\s|\s+TO\s|\'S\s|’S\s|,\s*PROVIDING)',
    r'\b(?:TO|FOR)\s+(?:THE\s+)?([A-Z0-9&\'\.\- ]{3,80}?' + SUFFIX + r')\b',
    r'\b(?:SUBMITTED BY|REQUEST(?:ED)? (?:OF|BY)|APPLICATION (?:OF|BY|FROM)|APPLICANT,?)\s+(?:THE\s+)?([A-Z0-9&\'\.,\- ]{3,90}?)(?:,|;|\s+FOR\s|\s+TO\s|\s+\()',
]
NUMWORDS = None

def amount(t):
    m = re.findall(r'\$\s*([0-9][0-9,\s]*(?:\.\s*\d{2})?)', t)
    vals = []
    for x in m:
        x = re.sub(r'[\s,]', '', x)
        try: vals.append(float(x))
        except ValueError: pass
    return max(vals) if vals else None

def kind_of(t):
    for k, rx in KINDS:
        if re.search(rx, t): return k
    return None

def parties_of(t):
    out = []
    for rx in PAT:
        for m in re.finditer(rx, t):
            p = m.group(1).strip(' ,.;')
            if len(p) < 3 or GOVONLY.fullmatch(p) or re.match(r'^(THE )?CITY\b|^(A|AN|ANY|ALL|ITS|SAID|THIS|THAT|SUCH|EACH|CERTAIN|AMOUNT|TOTAL|SUM|NOT TO EXCEED|PERIOD|TERM|PURPOSE|PURPOSES|EXHIBIT)\b', p): continue
            if p not in out: out.append(p)
    return out

def is_candidate(t):
    if not t: return False, None
    T = t.upper()
    k = kind_of(T)
    if not k: return False, None
    if EXCL.search(T) and k not in ('settlement', 'zoning', 'sale', 'lease'): return False, k
    if re.search(r'ACCEPT(?:ING|ANCE OF)?\s+(?:A|THE)?\s*[^;]{0,80}GRANT|APPLY(?:ING)? FOR|APPLICATION FOR [^;]{0,40}GRANT|SUBMIT(?:TING)? (?:A |AN )?(?:GRANT )?APPLICATION', T) and k in ('contract', 'grant'):
        return False, k
    return True, k

def nice(p):
    """Title-case an all-caps party name."""
    small = {'OF', 'AND', 'THE', 'FOR', 'IN', 'AT', 'ON', 'DE', 'LA', 'DEL'}
    keep = {'LLC', 'LLP', 'PLLC', 'USA', 'P.A.', 'PA', 'P.L.', 'PL', 'II', 'III', 'IV', 'YMCA', 'NAACP', 'CDC', 'PBA', 'AFSCME', 'FPL', 'AT&T', 'HNTB', 'CBRE', 'BRPH', 'CSA', 'CGA', 'EAC', 'IBM', 'HDR', 'MBA', 'CMA', 'RJ', 'GFA', 'SFM', 'ADT', 'NFC', 'CPA', 'CPAS', 'CSX', 'NBA', 'NFL', 'FIU', 'MDC', 'TD', 'LP', 'L.P.', 'L.L.C.', 'INC.', 'CORP.', 'CO.'}
    words = re.split(r'(\s+)', p.strip())
    out = []
    for i, w in enumerate(words):
        if w.isspace(): out.append(w); continue
        W = w.upper()
        if W in keep:
            out.append({'INC.': 'Inc.', 'CORP.': 'Corp.', 'CO.': 'Co.'}.get(W, W))
        elif W in small and i > 0: out.append(w.lower())
        elif W in ('INC', 'CORP', 'LTD'): out.append(W.title())
        else: out.append('-'.join(x[:1].upper() + x[1:].lower() for x in w.split('-')))
    return ''.join(out)
