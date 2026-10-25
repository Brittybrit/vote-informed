# Rule-based screening for 108th-116th laws. Each rule: (cls, category, sentence regex). A law qualifies on the
# first sentence of its final CRS summary that matches a rule; that sentence (trimmed) is the quote.
import json, re, sys
L = json.load(open(sys.argv[1])); OUT = sys.argv[2]
def final(x):
    p = None
    for s in x['summaries']:
        if re.search(r'(?i)public law|enrolled', s['desc'] or ''): p = s
    return re.sub(r'\s+', ' ', html_unescape((p or x['summaries'][-1])['text']))
import html
def html_unescape(s): return html.unescape(s).replace('\xa0', ' ')
R = [
 ('hospitals', 'Hospitals', r'(low-volume hospitals|Medicare-dependent|Medicare-Dependent Hospital|(delays?|eliminat\w*) (certain )?reductions? (to|in) (the )?Medicaid disproportionate|increase\w* [^.]{0,40}(DSH|disproportionate share hospital) allotments|payments to children\'s hospitals|outpatient hold harmless|payments? (to|for) [^.]{0,40}(rural|small|critical access|sole community) hospitals|exempts critical access hospitals)'),
 ('pharma', 'Drug and device makers', r'(priority review voucher|orphan drug (tax )?credit|moratorium on the [^.]{0,30}excise tax on (the sale of )?medical devices|repeals? the [^.]{0,30}excise tax on (the sale of )?medical devices|liability of a sponsor, manufacturer)'),
 ('smallbiz', 'Small businesses', r'(Paycheck Protection Program|small business (concerns? )?(loan|lending)|loans? (guaranteed )?(to|for) small businesses|small business investment compan|(guarantee|guaranteeing) [^.]{0,30}small business loans|assistance to small businesses|emergency economic relief for small businesses|small business reorganization|SBA[^.]{0,40}(loan|guarantee))'),
 ('smallrd', 'Small business R&D contractors', r'(Small Business Innovation Research|SBIR)'),
 ('farms', 'Farms', r'(payments? to [^.]{0,40}(agricultural )?(producers|farmers|growers|ranchers)|assistance to [^.]{0,30}(agricultural )?(producers|farmers|growers|ranchers)|(producers|farmers|growers|ranchers)[^.]{0,60}(disaster assistance|emergency assistance|indemnity|market loss|tree assistance)|family farmers?[^.]{0,40}(bankruptcy|chapter 12)|farm bill)'),
 ('oilgas', 'Oil, gas and coal', r'((oil|natural gas|coal)[^.]{0,40}(royalty relief|leasing program|lease sales?|opens?|available for leasing)|lessees? of [^.]{0,30}(oil|gas)|Mountain Valley Pipeline|nullifies the [^.]{0,80}(Resource Extraction Issuers|Stream Protection Rule))'),
 ('energy', 'Energy producers', r'((credit|incentive)[^.]{0,60}(biodiesel|ethanol|renewable|wind|solar|alternative fuel|nuclear power|electricity produced)|(biodiesel|ethanol|renewable diesel|alternative fuel)[^.]{0,40}(credit|incentive))'),
 ('airlines', 'Airlines', r'(air carriers?[^.]{0,60}(insurance|reinsurance|compensation|payroll support|loans?|financial assistance|war risk)|(insurance|reinsurance|compensation|payroll support|financial assistance)[^.]{0,40}air carriers?)'),
 ('telecom', 'Broadband and telecom providers', r'((reimburse|funds to|offset the cost)[^.]{0,60}(broadband|communications|telecommunications) providers)'),
 ('banks', 'Banks and credit unions', r'((exempt|relief)[^.]{0,80}(depository institutions|credit unions|community banks|banks with|insured depository)|(depository institutions|credit unions|community banks)[^.]{0,40}(exempt|relief))'),
 ('guns', 'Firearm makers and sellers', r'civil liability action[^.]{0,80}manufacturer or seller of a firearm'),
 ('hydro', 'Hydropower projects', r'(extend[^.]{0,80}(time|deadline|period)[^.]{0,80}(hydroelectric|hydropower) project|(hydroelectric|hydropower) project[^.]{0,80}extend)'),
 ('native', 'Alaska Native corporations', r'(convey[^.]{0,80}(Native|Village) Corporation|Native Corporation[^.]{0,40}(convey|receive|entitled))'),
 ('named', 'Named company', r'convey[^.]{0,100}\b([A-Z][\w&.,\'-]+ ){1,5}(Corporation|Company|Inc\.?|LLC|L\.L\.C\.)'),
 ('defense', 'Defense contractors', r'(multiyear procurement contracts?|multiyear procurement of)'),
 ('crypto', 'Crypto', r'(digital asset|cryptocurrency)[^.]{0,40}(exempt|relief)'),
]
CRA = {'115-4': ('oilgas', 'Oil, gas and mining companies', 'nullifies the "Disclosure of Payments by Resource Extraction Issuers" rule'),
       '115-5': ('coal', 'Coal mining companies', 'nullifies the Stream Protection Rule finalized by the Department of the Interior\'s Office of Surface Mining Reclamation and Enforcement'),
       '115-11': ('contractors', 'Federal contractors', 'nullifies the rule finalized by the Department of Defense, the General Services Administration, and the National Aeronautics and Space Administration (NASA)'),
       '115-21': ('employers', 'Employers', 'nullifies the Department of Labor\'s rule ... about employers\' ongoing obligation to make and maintain records of work-related injuries'),
       '115-22': ('telecom', 'Broadband providers', 'nullifies the rule submitted by the Federal Communications Commission entitled "Protecting the Privacy of Customers of Broadband and Other Telecommunications Services"'),
       '115-74': ('banks', 'Banks and lenders', 'nullifies a rule submitted by the Consumer Financial Protection Bureau (CFPB) regarding arbitration agreements'),
       '115-172': ('autos', 'Auto lenders and dealers', 'nullifies the rule ... relating to indirect auto lending and compliance with the Equal Credit Opportunity Act')}
res = {}
for x in L:
    pl = x['pl']; title = x['title'] or ''
    if re.search(r'(?i)(post office|postal service located|to designate|to rename|redesignate|commemorat|gold medal|coin act|memorial)', title): continue
    t = final(x); sents = re.split(r'(?<=[.;])\s+', t)
    if pl in CRA:
        c, cat, q = CRA[pl]; res[pl] = {'cls': c, 'category': cat, 'named': [], 'quote': q, 'rule': 'CRA (overturned rule names the business)'}; continue
    if re.search(r'(?i)national defense authorization act for fiscal year', title):
        q = next((s for s in sents if re.search(R[-2][2], s, re.I)), None) or next((s for s in sents if re.search(r'(?i)procurement|authorizes appropriations', s)), sents[0])
        res[pl] = {'cls': 'defense', 'category': 'Defense contractors', 'named': [], 'quote': q[:300], 'rule': 'NDAA (as P.L. 119-60)'}; continue
    for cls, cat, rx in R:
        s = next((s for s in sents if re.search(rx, s, re.I if cls != 'named' else 0)), None)
        if s:
            named = []
            if cls == 'named':
                m = re.search(rx, s); named = [m.group(0).split(' to ', 1)[-1].replace('convey', '').strip()] if m else []
            res[pl] = {'cls': cls, 'category': cat, 'named': named, 'quote': s.strip()[:300], 'rule': 'rule:' + cls}
            break
json.dump(res, open(OUT, 'w'), indent=1)
import collections
print(len(res), collections.Counter(v['cls'] for v in res.values()))
print(collections.Counter(k.split('-')[0] for k in res))
