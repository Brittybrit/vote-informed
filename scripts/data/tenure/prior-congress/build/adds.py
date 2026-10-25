# Closer read of 113th (from Mar 11, 2014) and 114th Congress public laws: laws added to the rule-based screen.
# Each: pl -> (cls, category, named, regex that picks the quoted sentence from the final CRS summary)
import json, re, html, sys
L = {x['pl']: x for x in json.load(open('../work/laws108-116.json'))}
def final(x):
    p = None
    for s in x['summaries']:
        if re.search(r'(?i)public law|enrolled', s['desc'] or ''): p = s
    return re.sub(r'\s+', ' ', html.unescape((p or x['summaries'][-1])['text']))
A = {
 '113-90': ('oilgas', 'Propane and heating-fuel carriers', [], r'regulatory relief for commercial motor vehicle operations'),
 '113-97': ('employers', 'Cooperatives (employer pension plans)', [], r'Establishes minimum funding standards for CSEC'),
 '113-109': ('autos', 'Auto dealers', [], r'remove the requirement that a dealer'),
 '113-121': ('farms', 'Farms', [], r'Exempts from SPCC regulation farms'),
 '113-125': ('oilgas', 'Propane and heating-fuel carriers', [], r'shall not apply to any motor carrier'),
 '113-156': ('banks', 'State-examined financial institutions', [], r'rely upon examinations conducted by a state'),
 '113-164': ('airlines', 'Airlines; small businesses', [], r'air carrier liability for third party claims'),
 '113-167': ('realestate', 'Condominium developers and sellers', [], r'exempt from certain registration'),
 '113-172': ('defense', 'Defense contractors', [], r'loans to private business enterprises'),
 '113-177': ('hydro', 'Hydropower projects', [], r'reinstate the license and extend'),
 '113-198': ('hospitals', 'Hospitals', [], r'not to enforce requirements for direct physician supervision'),
 '113-200': ('telecom', 'Satellite TV carriers', [], r'Extends until December 31, 2019, the exemption from retransmission consent'),
 '113-223': ('mining', 'Named company', ['Freeport Minerals Corporation'], r'conditional withdrawal of the Department of the Interior\'s objections'),
 '113-250': ('banks', 'Banks and credit unions', [], r'Exempts from the leverage and risk-based capital requirements'),
 '113-263': ('manufacturing', 'Power-supply makers', [], r'exempt external power supplies'),
 '113-279': ('insurers', 'Insurers', [], r'shall not be required to subject any person to such minimum capital requirements'),
 '113-281': ('defense', 'Defense contractors (shipbuilders)', [], r'multiyear contracts for the procurement of Offshore Patrol Cutters'),
 '114-1': ('insurers', 'Insurers', [], r'trigger the federal share of compensation'),
 '114-23': ('telecom', 'Telephone and internet companies', [], r'Extends liability protections to persons who provide information'),
 '114-27': ('manufacturing', 'Import-hurt firms (Trade Adjustment Assistance)', [], r'TAA program for firms and farmers'),
 '114-53': ('smallbiz', 'Small businesses', [], r'accommodate increased demand for general business loans'),
 '114-55': ('airlines', 'Fractional aircraft ownership programs', [], r'exemption from ticket taxes for aircraft in fractional'),
 '114-73': ('rail', 'Railroads', [], r'Extends from December 31, 2015, to December 31, 2018, the deadline'),
 '114-89': ('pharma', 'Drug and device makers', [], r'register an applicant to manufacture a controlled substance'),
 '114-90': ('space', 'Commercial space launch companies', [], r'liability coverage of licensees'),
 '114-112': ('hospitals', 'Hospitals', [], r'not to enforce requirements for direct physician supervision'),
 '114-115': ('pharma', 'Medical equipment suppliers', [], r'temporarily exempts from certain Medicare payment adjustments wheelchair'),
 '114-125': ('logistics', 'Importers and exporters', [], r'provide trade benefits to importers'),
 '114-141': ('airlines', 'Fractional aircraft ownership programs', [], r'exemption from ticket taxes for aircraft in fractional'),
 '114-145': ('pharma', 'Drug makers and distributors', [], r'opportunity to submit a corrective action plan'),
 '114-153': ('corporate', 'Companies that own trade secrets', [], r'A trade secret owner may file a civil action'),
 '114-163': ('bridge', 'Named company', ['Starr-Camargo Bridge Company'], r'is made permanent and expanded to include the successors'),
 '114-187': ('smallbiz', 'Small businesses (HUBZone, Puerto Rico)', [], r'exempt Puerto Rico from the 20% population cap'),
 '114-190': ('airlines', 'Fractional aircraft ownership programs', [], r'exemption from ticket taxes for aircraft in fractional'),
 '114-198': ('pharma', 'Drug makers', [], r'exclude abuse-deterrent prescription drugs'),
 '114-260': ('contractors', 'Federal contractors', [], r'makes permanent the Government Accountability Office'),
 '114-315': ('smallbiz', 'Veteran-owned small businesses', [], r'The surviving spouse of a service-disabled veteran who acquires'),
 '114-322': ('rail', 'Railroads', [], r'accept funds from a railroad carrier to expedite'),
 '114-323': ('fishing', 'Commercial fishing vessel owners', [], r'reimburse fishermen for the fines'),
}
out = {}
for pl, (c, cat, named, rx) in A.items():
    sents = re.split(r'(?<=[.;])\s+', final(L[pl]))
    s = [x for x in sents if re.search(rx, x)]
    assert s, pl
    q = s[0].strip()
    q = re.sub(r'^\(?This measure has not been amended[^)]*\)\s*', '', q)
    q = re.sub(r'^(The (expanded )?summary of (that|the House passed) version is repeated here\.\)\s*)', '', q)
    q = re.sub(r'^\)\s*', '', q); q = re.sub(r'^Reliable Home Heating Act - ', '', q); q = re.sub(r'^\d+\)\s*', '', q)
    q = re.sub(r'^[A-Z][^.]{0,90}? Act of 20\d\d( or [^-]{0,40})? - ', '', q)
    out[pl] = {'cls': c, 'category': cat, 'named': named, 'quote': q[:300] + ('…' if len(q) > 300 else ''), 'rule': 'read'}
json.dump(out, open('adds.json', 'w'), indent=1, ensure_ascii=False)
for k, v in out.items(): print(k, v['category'], '|', v['quote'][:150])
