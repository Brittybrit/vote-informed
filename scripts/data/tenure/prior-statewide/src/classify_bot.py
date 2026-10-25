"""Classify parsed Board of Trustees items (raw/bot-items-2019-2024.json): does the item benefit a named private party?
Writes raw/bot-items-classified.json with qualifies, why, parties. Manual decisions are in EXCLUDE / PARTIES below."""
import json, os, re
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(HERE, 'raw')
items = json.load(open(os.path.join(R, 'bot-items-2019-2024.json')))
# index -> reason (no named private beneficiary, procedural, or government-only)
EXCLUDE = {
 0:'minutes',1:'project ranking list',6:'government-only conveyance (City of West Palm Beach)',9:'rule',10:'priority list / work plan',13:'minutes',
 18:'government applicant only (Town of Palm Beach)',21:'minutes',22:'government-only release (City of Pahokee)',32:'minutes',40:'minutes',41:'project ranking list',
 42:'management plan',49:'aquaculture use zone (FDACS; no lessee named)',50:'minutes',51:'government-only (FDOT)',53:'priority list / work plan',62:'minutes',
 63:'management plan',64:'government-only deed restriction (City of Fort Lauderdale)',66:'government-only (State Fire Marshal)',68:'government-only (DCF / City of Pembroke Pines)',
 80:'minutes',86:'rule',87:'government-only (City of Daytona Beach)',91:'rule',92:'minutes',94:'government-only (Port of Palm Beach District)',97:'government-only (City of Doral); deferred',
 98:'priority list / work plan',101:'delegation of authority to FDACS',102:'minutes',103:'government-only (FSU Board of Trustees)',104:'government-only (City of Doral)',
 112:'minutes',113:'management plan',114:'project ranking list',115:'priority list / work plan',116:'delegation of authority',117:'advisory board selection (appointment)',
 120:'government-only (FAU / Palm Beach State College)',124:'government-only (U.S. Navy)',128:'government seller (Monroe County Comprehensive Plan Land Authority)',
 139:'minutes',140:'management plan',143:'government-only (FDOT)',144:'government-only (National Park Service)',153:'aquaculture use zone (FDACS; no lessee named)',
 154:'aquaculture use zone (FDACS; no lessee named)',155:'aquaculture use zone (FDACS; no lessee named)',156:'aquaculture use zone (FDACS; no lessee named)',159:'minutes',
 160:'management plan',170:'withdrawn without objection',174:'minutes',175:'project ranking list',176:'priority list / work plan',182:'minutes',189:'rule',
 190:'aquaculture use zone (FDACS; no lessee named)',194:'rule',216:'government-only (Bradford County)',217:'government-only (Walton County School Board)',
 218:'government-only (U.S. Navy)',220:'RFLPP acquisition list',222:'government-only (Jacksonville Port Authority)',224:'project ranking list',225:'priority list / work plan',
 243:'rule',249:'government applicant only (City of Miami, Watson Island deed restrictions)',250:'government-only (South Florida Water Management District)',261:'rule',262:'RFLPP acquisition list',
}
KW = r'\s*(?:,\s*)?(?:Option Agreements?|Aquaculture|Conservation Easement|Recommended Consol|Lease|Sublease|Exchange Agreement|Acceptance of Offer|Partial Release|Purchase Agreement|Assignment of Option|Modification|Management Agreement|Sovereignty|Quitclaim|Release of|Water Column|Special Events|/|Delegation|Determination|Managing Agency)'
def parties_of(x):
    t = re.sub(r'\s+', ' ', x['title'] or '').strip()
    t = re.sub(r'^(Board of Trustees\s*/\s*|Delegation\s*/\s*)+', '', t, flags=re.I)
    m = re.split(KW, t, maxsplit=1, flags=re.I)
    head = m[0].strip(' ,/')
    return head
items_out = []
for i, x in enumerate(items):
    q = i not in EXCLUDE
    items_out.append({**x, 'idx': i, 'qualifies': q, 'why': EXCLUDE.get(i), 'party_head': parties_of(x)})
json.dump(items_out, open(os.path.join(R, 'bot-items-classified.json'), 'w'), indent=1)
print(sum(o['qualifies'] for o in items_out), len(items_out))
