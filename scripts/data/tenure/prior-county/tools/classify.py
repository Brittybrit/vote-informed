import re,json
SUF=r"(?:INCORPORATED|INC|L\.?L\.?L\.?P|L\.?L\.?C|LTD|LIMITED|CORPORATION|CORP|COMPANY|CO|L\.?P|L\.?L\.?P|P\.?L\.?L\.?C|P\.?A|JV|JOINT VENTURE|N\.?A|PLC|S\.?A|GMBH|AG|LLLP)"
ORGWORD=r"(?:ASSOCIATION|FOUNDATION|UNION|CHURCH|MINISTRIES|COALITION|SOCIETY|INSTITUTE|ALLIANCE|FEDERATION|CONSERVANCY|ARCHDIOCESE|YMCA|YWCA)"
GOV=re.compile(r"(?i)\b(CITY OF|TOWN OF|VILLAGE OF|STATE OF|COUNTY OF|FLORIDA DEPARTMENT|DEPARTMENT OF|SCHOOL BOARD|UNITED STATES|U\.S\. |PUBLIC HEALTH TRUST|WATER MANAGEMENT DISTRICT|HOUSING FINANCE AUTHORITY|INDUSTRIAL DEVELOPMENT AUTHORITY|EDUCATIONAL FACILITIES AUTHORITY|HEALTH FACILITIES AUTHORITY|EXPRESSWAY AUTHORITY|TRANSPORTATION AUTHORITY|CHILDREN'S TRUST|MIAMI-DADE COUNTY|DADE COUNTY(?! (POLICE BENEVOLENT|ASSOCIATION|FARM BUREAU|MEDICAL))|METROPOLITAN DADE|BOARD OF|COMMISSION|FLORIDA INTERNATIONAL UNIVERSITY|MIAMI-DADE COLLEGE|MIAMI DADE COLLEGE|FLORIDA ATLANTIC|UNIVERSITY OF FLORIDA|FEDERAL|SHERIFF|CLERK|COMMUNITY REDEVELOPMENT AGENCY|\bCRA\b|TRUST FUND|TAXING DISTRICT|AUTHORITY|SOUTH FLORIDA REGIONAL|MPO|METROPOLITAN PLANNING|DISTRICT SCHOOL|COURTS?\b|JUDICIAL|GOVERNMENT OF|FLORIDA DEPT|FDOT|AGENCY FOR|HOUSING AGENCY|FLORIDA HOUSING FINANCE)\b")
STOP={'TO','WITH','BETWEEN','BY','FROM','FOR','AWARDING','AWARD','APPROVING','AUTHORIZING','RATIFYING','ACCEPTING','GRANTING','AGREEMENT','CONTRACT','LEASE','AND/OR','VIA','UNDER','REGARDING','ON','AT','IN','INTO','AS','THAT','WHICH','WHEREBY','INCLUDING','ENTITLED','KNOWN','NAMED','BEHALF','BENEFIT','RESOLUTION','ORDINANCE','PLAT','WAIVER','EXECUTE','EXECUTION','AMENDMENT','AMENDING','RENEWAL','PURCHASE','PETITION','APPLICATION','SUBMITTED','FILED','CONVEYANCE','CONVEYING','EASEMENT','SETTLEMENT','RE:','RE','VS','V.','VS.','VERSUS','ASSIGNMENT','ASSIGNING','ENTER','ENTERING','DESIGNATING','DESIGNATE','EXEMPTIONS','EXEMPTION','LICENSE','PERMIT','CONSENT','RECOGNIZING','TENANT','OWNER','DEVELOPER','PROVIDER','VENDOR','CONTRACTOR','CONSULTANT','APPLICANT','THROUGH','UPON','OVER','ALSO','WHO','WHOSE','ITS','BUT','NOT','FOLLOWING','SUCH','EACH','ANY','ALL','CERTAIN','LOCATED','OWNED','OPERATED','DBA','D/B/A','F/K/A','ASSIGNEE','AFFILIATE','BENEFITING','BENEFITTING','AMONG','ALONG','LICENSES','CLAIM','MEMBERS','AGENCIES','ARTICLES','REESTABLISHMENT','COMMEMORATING','APPROVE','SUBSTITUTION','ADVISORS','RELEASING','THEIR','ABILITY','DEFENSE','ADVERTISEMENT','COSTS','D/B/A/','F/A','A/F/A','A/K/A'}
LEAD={'THE','A','AN','OF','AND','&','SAID','ITS','NEW','SUCCESSOR','EXISTING'}
TOK=re.compile(r"[A-Z0-9][A-Z0-9&'\.\-/]*|[,;:()\[\]]|&")
SUFRE=re.compile(r"^"+SUF+r"\.?$")
ORGRE=re.compile(r"^"+ORGWORD+r"$")
def titlecase(s):
    def w(x):
        if re.match(r"^(LLC|LLLP|LP|LLP|PLLC|JV|PA|P\.A\.|N\.A\.|USA|II|III|IV|DBA|AECOM|FPL|MDX|CBE|DBE|HNTB|URS|AT&T|PNC|BMO|TD|MV|GDC|ISS|CH2M|HDR|IBM|ADT|TKO|MCM|CSA|IDB|HUD|YMCA|YWCA|UM)\.?,?$",x): return x.replace('LLC','LLC')
        return x[:1]+x[1:].lower() if x[:1].isalpha() else x[:1]+x[1:].lower()
    out=' '.join(w(x) for x in s.split())
    out=re.sub(r"\b(Of|And|The|For|De|La|Del|Los|Las|At|In|On)\b",lambda m:m.group(1).lower(),out)
    out=out[:1].upper()+out[1:]
    out=re.sub(r"\bInc\b\.?","Inc.",out); out=re.sub(r"\bCorp\b\.?","Corp.",out); out=re.sub(r"\bLtd\b\.?","Ltd.",out); out=re.sub(r"Inc\.\.","Inc.",out)
    return out
UNIONS=[r"AMERICAN FEDERATION OF STATE,? COUNTY,? AND MUNICIPAL EMPLOYEES(?:\s*\(AFSCME\))?(?:,? (?:AFL-CIO,? )?(?:[A-Z\-]+ ){0,4}?(?:LOCAL|COUNCIL) \d+)?",
 r"\bAFSCME,? (?:LOCAL|COUNCIL) \d+",r"GOVERNMENT SUPERVISORS ASSOCIATION OF FLORIDA(?:,? OPEIU)?(?:,? LOCAL 100)?",
 r"(?:MIAMI-)?DADE COUNTY POLICE BENEVOLENT ASSOCIATION",r"(?:DADE COUNTY ASSOCIATION OF FIRE ?FIGHTERS|INTERNATIONAL ASSOCIATION OF FIRE ?FIGHTERS),? LOCAL 1403",
 r"TRANSPORT WORKERS UNION(?: OF AMERICA)?,? (?:AFL-CIO,? )?LOCAL 291",r"(?:SEIU|SERVICE EMPLOYEES INTERNATIONAL UNION),? LOCAL 1991",
 r"INTERNATIONAL UNION OF OPERATING ENGINEERS,? LOCAL \d+",r"INTERNATIONAL BROTHERHOOD OF ELECTRICAL WORKERS,? LOCAL \d+",r"FRATERNAL ORDER OF POLICE(?:,? LODGE \d+)?"]
def orgs(title):
    U=title.upper().replace('\n',' ')
    pre=[]
    for u in UNIONS:
        for m in re.finditer(u,U):
            s=m.group(0).strip(' ,')
            if s not in pre: pre.append(s)
    r=orgs0(title)
    r=[x for x in r if not any(x in p or p in x or re.match(r'^(LOCAL \d+|AMERICAN FEDERATION.*|.*POLICE BENEVOLENT ASSOCIATION.*|GOVERNMENT SUPERVISORS.*|.*FIRE ?FIGHTERS.*)$',x) and any(k in x for k in ('LOCAL','FEDERATION','BENEVOLENT','SUPERVISORS','FIRE')) for p in pre)]
    return pre+r
def orgs0(title):
    t=re.sub(r"\(([^()]*)\)\s*$","",title.upper())  # drop trailing (Department)
    t=t.replace('\n',' ')
    toks=TOK.findall(t)
    res=[]
    i=0
    while i<len(toks):
        tk=toks[i]
        issuf=bool(SUFRE.match(tk)) and not (tk.startswith('INCORPORATED') and not (i>0 and toks[i-1]==','))
        isorg=bool(ORGRE.match(tk))
        islocal = tk=='LOCAL' and i+1<len(toks) and re.match(r'^\d',toks[i+1])
        if not(issuf or isorg or islocal): i+=1; continue
        end=i+ (2 if islocal else 1)
        if isorg and end<len(toks) and toks[end] in ('OF','FOR'):
            HARD={'TO','WITH','BETWEEN','BY','FROM','AWARDING','APPROVING','AUTHORIZING','AGREEMENT','AGREEMENTS','CONTRACT','LEASE','GRANT','FUNDING','PURSUANT','REGARDING','WHICH','THAT',';',':','(',')','[',']'}
            e2=end+1; stop=None
            while e2<len(toks) and e2-end<10:
                w=toks[e2]
                if SUFRE.match(w) and not w.startswith('INCORPORATED'): stop=e2+1; break
                if w in HARD: break
                if w==',' and not (e2+1<len(toks) and (SUFRE.match(toks[e2+1]) or toks[e2+1] in ('LOCAL','AFL-CIO','OPEIU'))): break
                e2+=1
            if stop is None:
                stop=e2 if toks[end]=='OF' else end
                if toks[end]=='OF':
                    k=end+1
                    while k<stop and toks[k] not in ('FOR','AND','TO','IN','AT','ON'): k+=1
                    stop=min(k,end+7)
            while stop>end+1 and toks[stop-1] in ('AND','OF','THE','FOR','IN',',','&','AT','ON'): stop-=1
            if stop>end+1: end=stop
            while end<len(toks) and toks[end] in ('LOCAL',) and end+1<len(toks) and re.match(r'^\d',toks[end+1]): end+=2
        # extend right over trailing suffix chain e.g. ", INC." after ORGWORD, or "LLC" after "CO."
        while end<len(toks) and (SUFRE.match(toks[end]) or (toks[end]==',' and end+1<len(toks) and SUFRE.match(toks[end+1]) and not toks[end+1] in('CO','SA','AG','NA'))):
            end+=1
        # walk left
        j=i-1; words=[]
        k=i
        while j>=0:
            w=toks[j]
            if w in (';',':','(',')','[',']'): break
            if w==',':
                # comma allowed only right before suffix token
                if SUFRE.match(toks[j+1]) and j+1==i and issuf: j-=1; continue
                break
            if w in STOP: break
            if w=='AND' and ((j>0 and (toks[j-1] in ('COUNTY',',') or SUFRE.match(toks[j-1]) or ORGRE.match(toks[j-1]))) or toks[j+1]=='THE'): break
            if w=='OF' and j>0 and toks[j-1] in STOP|{'PLAT','BEHALF','BENEFIT','FAVOR','USE','PART','NAME','TERMS','EXECUTION','VACATION','CLOSURE','DESIGNATION','SALE','ACQUISITION','ISSUANCE','ADDITION','ADDITIONS','WAIVER','REPRESENTATION','FIRM','AFFILIATE','STOCK','SUBSIDIARY','MEMBER','DIVISION','SHARES','INTEREST','INTERESTS','OWNERSHIP','CONTROL','TRANSFER','ASSETS','LICENSES','CLAIM','EMPLOYEES','MEMBERS','INCORPORATION','PROPERTIES','REESTABLISHMENT','DEFENSE','ADVERTISEMENT','COSTS','ABILITY'}: break
            j-=1
            if i-j>12: break
        start=j+1
        span=toks[start:end]
        while span and (span[0] in LEAD|{','}) and not (span[0]=='A' and len(span)>1 and span[1]=='&'): span=span[1:]
        if not span or (len(span)==1 and (issuf or isorg)): i=end; continue
        name=' '.join(span).replace(' ,',',').replace('( ','(').replace(' )',')')
        if not GOV.search(name) and not re.match(r'^(PROFESSIONAL|CONSTRUCTION|MANAGEMENT|SECURITY|JANITORIAL|ENGINEERING|DESIGN|PROPOSED|ARCHITECTURAL|TECHNICAL|INFORMATION|HEALTH|SOCIAL|LEGAL|FINANCIAL|TRANSIT|BUS|AIRPORT|COUNTY|COUNTYWIDE|VARIOUS|MULTIPLE|OTHER|CERTAIN|EMERGENCY|SUPPORT|MAINTENANCE|REPAIR|CLEANING|LANDSCAPING|PARKING|TOWING|CONSULTING|HUMAN|COMMUNITY|NON-PROFIT|NONPROFIT|NOT-FOR-PROFIT|PRIVATE|PUBLIC|LOCAL|STATE|NATIONAL|UNITED|BANKING|INSURANCE|INVESTMENT|ADVISORY|SPORTS|ECONOMIC|RECREATIONAL|CULTURAL|EDUCATIONAL)( (SERVICES|SYSTEM|SYSTEMS|GROUP|COUNCIL|ASSOCIATION|AGREEMENT|PARTNERS|PARTNERSHIP|BANK|TRUST|UNION|CLUB|INSTITUTE|CENTER))?$',name):
            res.append(name)
        i=end
    out=[]
    for n in res:
        n=n.strip(' ,.'); n=n+('.' if re.search(r'\b(INC|CORP|LTD|CO|P\.A|N\.A|L\.P)$',n) else '')
        if n not in out: out.append(n)
    out=[n for n in out if not any(o!=n and (o.startswith(n) or (re.match(r'^LOCAL \d+$',n) and n in o)) for o in out)]
    out=[n for n in out if not re.match(r'^(LOCAL \d+|AMERICAN FEDERATION|DADE COUNTY ASSOCIATION|NATIONAL FOUNDATION)$',n)]
    if 'UNIVERSITY OF MIAMI' in title.upper() and 'UNIVERSITY OF MIAMI' not in out: out.append('UNIVERSITY OF MIAMI')
    return out
FINAL={'Adopted':'adopted','Approved':'approved','Adopted as amended':'adopted','Approved as amended':'approved','Denied':'denied','Motion to adopt failed':'failed','Not adopted':'failed','Not approved':'failed','Failed':'failed','Motion to adopt as amended failed':'failed','Approved with conditions':'approved','Rejected':'failed','Motion to adopt died due to lack of a second':'failed'}
EXCL=re.compile(r"(?i)\b(URGING|OPPOSING|ENCOURAGING|CODESIGNAT|CO-DESIGNAT|PROCLAM|CONDOLENCE|SYMPATHY|COMMEND|CONGRATULAT|HONORING|RECOGNIZ|RENAMING|NAMING(?! RIGHTS)|MILLAGE|SPECIAL TAXING DISTRICT|ASSESSMENT ROLL|OMNIBUS|DISCRETIONARY|IN-KIND|RESERVE FUNDS|OFFICE BUDGET|CAPITAL OUTLAY RESERVE|COMMUNITY-BASED ORGANIZATIONS? (FUNDING|ALLOCATION)|ALLOCATIONS? (OF|FROM) (THE )?DISTRICT|DISTRICT \d+ (OFFICE|DISCRETIONARY|RESERVE|COMMUNITY))")
SOFT=re.compile(r"(?i)\b(SUPPORTING|APPOINT\w*|REQUESTING|DECLARING [^;]{0,80}\b(DAY|WEEK|MONTH))\b")
def classify(t):
    T=t.upper()
    if re.search(r'^(HEARING NO|PH NO|.*APPLICANT:)',T) or re.search(r'Z\d{4,}|^\d\d-\d+-CZ',T): return 'zoning','Zoning application'
    if re.search(r'COMPREHENSIVE DEVELOPMENT MASTER PLAN|\bCDMP\b',T) and re.search(r'APPLICATION',T): return 'landuse','Master plan amendment'
    if 'WAIVER OF PLAT' in T: return 'plat','Plat waiver'
    if re.search(r'\bPLAT OF\b',T): return 'plat','Plat approved'
    if re.search(r'COLLECTIVE BARGAINING|LABOR AGREEMENT|BARGAINING UNIT',T): return 'labor','Union contract'
    if re.search(r'SETTLEMENT|SETTLE ',T): return 'settlement','Settlement'
    if re.search(r'CHANGE ORDER',T): return 'change','Change order'
    if re.search(r'BOND|TEFRA|FEDERAL TAX LAW|INTERNAL REVENUE CODE',T) and re.search(r'HOUSING FINANCE|MULTIFAMILY|INDUSTRIAL DEVELOPMENT|HEALTH FACILITIES|EDUCATIONAL FACILITIES|147\(F\)|TEFRA',T): return 'finance','Housing bond approval (federal tax law)' if 'HOUSING' in T else 'Bond issue approved'
    if re.search(r'GROUND LEASE',T): return 'lease','Ground lease'
    if re.search(r'\bLEASE|SUBLEASE',T): return 'lease','Lease'
    if re.search(r'EASEMENT',T): return 'easement','Easement'
    if re.search(r'(CLOSE|CLOSING|VACAT)\w* (A |THE )?(PORTION|ALLEY|ROAD|STREET|RIGHT)',T) or 'VACATION OF RIGHT' in T: return 'funding','Public road or alley closed'
    if re.search(r'BROWNFIELD',T): return 'other','Brownfield designation'
    if re.search(r'TAX EXEMPTION|AD VALOREM TAX EXEMPT',T): return 'funding','Tax exemption'
    if re.search(r'CONVEY|DEED|SALE OF|SELL|SURPLUS',T) and re.search(r'PROPERT|LAND|PARCEL|LOT',T): return 'land','County property conveyed'
    if re.search(r'PURCHASE OF (REAL )?PROPERTY|ACQUI\w+ (OF )?(REAL )?PROPERTY|PURCHASE AND SALE',T): return 'land','Property purchase or sale'
    if re.search(r'DESIGN[- ]BUILD',T): return 'award','Design-build contract'
    if re.search(r'PROFESSIONAL SERVICES? AGREEMENT|ARCHITECTURAL|ENGINEERING SERVICES',T) and not re.search(r'AMENDMENT|SUPPLEMENT',T): return 'award','Professional services contract'
    if re.search(r'SUPPLEMENTAL AGREEMENT|SUPPLEMENT NO',T): return 'change','Supplemental agreement'
    if re.search(r'(BID|COMPETITIVE).{0,40}WAIV|WAIV\w* .{0,60}(BID|COMPETITIVE)|SOLE SOURCE|NON-COMPETITIVE|DESIGNATED PURCHASE|BID WAIVER',T): return 'award','Contract without competitive bidding'
    if re.search(r'EMERGENCY',T) and re.search(r'CONTRACT|PURCHASE',T) and 'RATIF' in T: return 'award','Emergency contract ratified'
    if re.search(r'(ADDITIONAL EXPENDITURE AUTHORITY|INCREAS\w+ .{0,40}(CONTRACT|AUTHORITY)|EXTEND\w* .{0,40}CONTRACT|OPTION TO RENEW|RENEWAL)',T): return 'change','Contract extended or increased'
    if re.search(r'AMENDMENT (NO\. ?\d+ )?TO|AMENDED AND RESTATED|AMENDING (THE )?(AGREEMENT|CONTRACT)|MODIFICATION',T): return 'change','Contract amendment'
    if re.search(r'PREQUALIFICATION|PRE-QUALIFI|POOL',T): return 'award','Prequalified vendor pool'
    if re.search(r'CONCESSION',T): return 'award','Concession'
    if re.search(r'LICENSE AGREEMENT|REVOCABLE LICENSE|USE AGREEMENT',T): return 'lease','License agreement'
    if re.search(r'\bLOAN\b',T): return 'funding','Loan'
    if re.search(r'\bGRANT',T): return 'funding','Grant'
    if re.search(r'DONATION',T): return 'funding','Donation'
    if re.search(r'FUNDING|ALLOCAT|FUNDS TO|SUBSIDY|INCENTIVE|SURTAX|HOME FUNDS|CDBG|PAYMENT TO',T): return 'funding','County funding'
    if re.search(r'AWARD|CONTRACT|PURCHASE|BID',T): return 'award','Contract award'
    if re.search(r'AGREEMENT|MEMORANDUM OF UNDERSTANDING',T): return 'other','Agreement'
    if re.search(r'HISTORIC',T): return 'other','Historic designation'
    if re.search(r'COMMUNITY DEVELOPMENT DISTRICT',T): return 'district','Community development district'
    return 'other','County action'
AMT=re.compile(r"\$\s?([\d,]+(?:\.\d+)?)(\s*MILLION)?")
def amount(t):
    T=t.upper()
    m=re.search(r"(?:NOT TO EXCEED|TOTAL (?:CONTRACT )?(?:AMOUNT|VALUE|AWARD)(?: OF)?|IN THE (?:TOTAL )?AMOUNT OF|AMOUNT (?:OF|UP TO)|UP TO)\s*(?:AN? )?(?:AMOUNT OF )?\$\s?([\d,]+(?:\.\d+)?)(\s*MILLION)?",T)
    if not m: m=AMT.search(T)
    if not m: return None
    try: v=float(m.group(1).replace(',',''))
    except: return None
    # "$6,300,000 MILLION" in a county title is a clerical doubling: a figure already in full dollars stays as is
    if m.group(2) and v<1e6: v*=1e6
    return v if v>0 else None
def fmtamt(v):
    if v is None: return ''
    if v>=1e6: s=f"${v/1e6:.1f}".rstrip('0').rstrip('.')+' million'
    else: s=f"${v:,.0f}"
    return ', '+s
def zoning_party(T):
    m=re.search(r'APPLICANT\(?S?\)?:\s*(.*?)\s*(?:--|$)',T)
    if not m: m=re.search(r'HEARING NO\.?\s*[\w-]+\s*--\s*DISTRICT\(S\)\s*[\d, &]+\s*--\s*(.*?)\s*--',T)
    if not m: return []
    s=m.group(1).strip(' .')
    if GOV.search(s): return []
    parts=[p.strip(' ,.') for p in re.split(r',?\s+AND\s+(?=[A-Z0-9])(?!.*\bAND\b.*(?:LLC|INC))|;\s*',s) if p.strip(' ,.')]
    return [s] if len(parts)>3 else ([s] if not parts else parts)
def filedby(T):
    m=re.search(r'FILED BY\s+(.*?)(?:,\s*LOCATED|;\s|\(|$| LOCATED)',T)
    if m:
        s=m.group(1).strip(' ,.')
        if not GOV.search(s): return [s]
    return []
def district(T):
    m=re.search(r'DISTRICT\(S\):?\s*0?(\d+)',T); return int(m.group(1)) if m else None
