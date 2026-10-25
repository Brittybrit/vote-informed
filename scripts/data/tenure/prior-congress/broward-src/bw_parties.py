# Party extraction for Broward motions: named private parties from the motion text.
import re
SUF = r"(?:Inc\.?|Incorporated|LLC|L\.L\.C\.|Corp\.?|Corporation|Company|Co\.|L\.P\.|LP|LLP|L\.L\.P\.|P\.A\.|P\.C\.|P\.L\.|PLLC|Ltd\.?|LTD|N\.A\.|Joint Venture|Foundation)"
TOK = r"[A-Z0-9][\w&'’.\-/]*"
NAME = r"((?:" + TOK + r")(?:,? (?:" + TOK + r"|of|and|the|for|de|del|&|at|in|to|d/b/a|dba|DBA|D/B/A))*?,? " + SUF + r")(?![\w])"
GOVW = re.compile(r"(?i)\b(city|town|village|county|state|florida department|department of|school board|sheriff|district|authority|agency|united states|u\.s\.|federal|commission|fdot|fdem|fdep|clerk|property appraiser|supervisor of elections|bureau|metropolitan planning|division of|office of)\b")
LEAD = re.compile(r"^(?:(?:A|An|The|and|or|with|to|by|for|from|between|among|in|of|executed|granting|vendor|bidder|bidders|proposer|firms?|the firms of|Agreement|Amendment|Contract|Second|Third|First)\s+)+")
PAT = [
    r"(?i:between) Broward County(?: \(“?County”?\))?,? and (?:the )?(.+?)(?:,? (?:a Florida|for|to provide|to|in the|in an|as|\(|regarding|providing|effective)|[;(])",
    r"(?:Agreement|Amendment|agreement|amendment) (?:with|to) (?:the )?(.+?)(?:,? (?:a Florida|for|to|in the|in an|\()|[;(])",
    r"(?:bidders?|proposer|vendor|designation of|designation to|standardization of|to sole source vendor),? (.+?)(?:,? for |,? a certified|\()",
    r"franchise to (.+?), for",
    r"executed by (.+?)(?:,? (?:for|located|at no cost)|\s+for\b)",
    r"settlement(?:,| with)? (?:including costs and attorney’s fees, )?in the case of (.+?) (?:vs?\.|v\.) ",
    r"in the case of Broward County vs?\. (.+?), \d",
    r"settlement with (.+?) \(",
    r"Easement granting (.+?) a perpetual",
    r"Petitioners?: (.+?)(?:;|\.|\(|$| Agent)",
    r"gap financing (?:loan )?(?:in the amount of [$\d,]+ (?:from the [\w ]+ )?)?to (.+?),",
    r"APPROVE (.+?), the owner of",
    r"new property owner, (.+?), ",
]
def clean(n):
    n = re.sub(r'^(?:[\d,.$]+\.? )?(?:No\. \d+ )?\d+\. ', '', n.strip())
    n = re.sub(r'^No\. \d+ \d+\. ', '', n)
    n = re.sub(r',? (?:MA|Agreement|Contract|Bid) No\..*$|,? et al\.?$|,? operating$|,? a not-for-profit.*$', '', n)
    n = n.strip(' ,.;“”"')
    n = re.sub(r'\s*\(“?[A-Z][\w&\-]*”?\)$', '', n)
    n = LEAD.sub('', n).strip(' ,')
    return n
def parties(t):
    out = []
    for p in PAT:
        for m in re.finditer(p, t):
            for n in re.split(r'; ', m.group(1)):
                n = clean(n)
                if n and 3 < len(n) < 110 and not GOVW.search(n.split(',')[0]) and not n.lower().startswith(('broward', 'board of')): out.append(n)
    for m in re.finditer(NAME, t):
        n = re.sub(r'^.*?\b(?:and|between) Broward County(?: \(“?County”?\))?,? and ', '', clean(m.group(1)))
        if len(n) > 5 and not GOVW.search(n) and not re.search(r'(?i)broward|^(Florida|Fort Lauderdale)$|Trust Fund|Services$', n): out.append(n)
    out = [re.sub(r'^No\. \d+ \d+\. ', '', n) for n in out]
    out = [n for n in out if not re.search(r'(?i)^(memorandum|agreement|resolution|contract|amendment|indenture|depository trust)', n)]
    res = []
    for n in out:
        k = re.sub(r'[^a-z0-9]', '', n.lower())
        if any(k in re.sub(r'[^a-z0-9]', '', r.lower()) or re.sub(r'[^a-z0-9]', '', r.lower()) in k for r in res):
            # keep the longer suffix-bearing form
            continue
        res.append(n)
    return res
