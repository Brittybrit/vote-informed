"""Build scripts/data/city/aventura/tenure/actions.json (Weinberg's mayoral tenure, 2022-12-15 .. 2024-12-31)
from the signed resolutions/ordinances (Laserfiche page text in <work>/av/res/<docid>.json, parsed rolls in
<work>/av/parsed.json, kept list <work>/av/keep.json) and the minutes (<work>/av/min/<docid>.json).
Run from the work dir: python3 <repo>/scripts/data/tenure/cities-a/aventura-src/av_build.py <repo>"""
import json, re, os, sys, glob
REPO = sys.argv[1]
sys.path.insert(0, os.path.join(REPO, 'scripts/data/tenure/cities-a/lib'))
from titles import title
DV = 'https://egov2.cityofaventura.com/Imaging/DocView.aspx?id=%d&dbid=0&repo=CityHall'
P = {p['id']: p for p in json.load(open('av/parsed.json'))}
K = json.load(open('av/keep.json'))

# Item specs, read by hand from each signed resolution/ordinance.
# n: (kind, template, parties, amount, subj, x, custom(en,es,ht) or None, note)
AOO = 'Aventura Opportunity Owner LLC'; A2999 = 'Aventura 2999 LLC'; ACC = 'Aventura Corporate Center LLLP'
AHP = 'Aventura Harbor Property LLC'; GP = 'Gulfstream Park, LLC'; FB = 'BeeFree, LLC d/b/a Freebee'
BD = 'Berry Dunn McNeil & Parker, LLC'; IAV = 'Innovate Audio Visual, Inc.'; PS = ['PS Aventura Biscayne 2013 LLC', 'Public Storage Properties VI, Inc.']
SEA = 'Seawater Construction Corp.'; CS = 'Charter Schools USA at Aventura, LLC'
S = {
 'R2022-71': ('contract', 'award', ['Delta Property Maintenance, Inc.'], None, 'custodial', '', None, 'Bid No. 23-11-16-3, custodial services for the Community Recreation Center, parks and Cultural Center.'),
 'R2023-06': ('contract', 'award', ['Chai Tees, LLC'], None, 'uniform', '', None, 'RFP 23-11-15-3, school uniforms for Aventura City of Excellence School.'),
 'R2023-08': ('contract', 'piggy', ['Garber Ford'], 52369, 'vehicles', '', None, 'ARPA-funded Ford Transit wagon for the Police Explorer program, bought from Garber Ford on the Florida State Contract (resolution body and City Manager memo).'),
 'R2023-09': ('contract', 'piggy', [IAV], None, 'av', '', None, '911 dispatch center video wall (ARPA funds), from a competitive bid contract (#200904) awarded to Innovate Audio Visual (resolution body).'),
 'R2023-11': ('zoning', 'variance', ['Aventura Hospitality, LLC'], None, '', '2885 NE 191 St', None, 'Sign and outdoor lighting variances (third wall sign; exterior lighting at 80 feet). Applicant named in the resolution.'),
 'R2023-15': ('contract', 'pay', ['Garland/DBS Incorporated'], None, 'exterior', '', None, 'Exterior repairs at the Aventura Arts & Cultural Center, at the bid price in the attached documents.'),
 'R2023-16': ('contract', 'buy', [IAV], None, 'av', '', None, 'ARPA-funded audio-visual upgrade of the Commission Chambers; vendor named in the resolution body.'),
 'R2023-20': ('zoning', 'cup', [ACC], None, '', '2777 NE 185 St', ('Allowed alcohol sales at cocktail bar areas in the planned Aventura Food Hall at 2777 NE 185 St', 'Permitió la venta de alcohol en áreas de bar del futuro Aventura Food Hall en 2777 NE 185 St', 'Pèmèt vann alkòl nan zòn ba nan Aventura Food Hall ki planifye nan 2777 NE 185 St'), 'Commissioner Kruss recused himself (project next to his business) and left before the vote (April 4, 2023 minutes); the signed resolution lists him absent.'),
 'R2023-21': ('zoning', 'variance', [ACC], None, '', '2777 NE 185 St', None, 'Side setbacks of 10 feet where 20 required and 42.64% lot coverage where 40% allowed. Commissioner Kruss recused himself (April 4, 2023 minutes); the signed resolution lists him absent.'),
 'R2023-22': ('contract', 'award', ['Bejar Construction, Inc.'], 1308748, 'parkconstr', '', None, 'Bid No. 23-02-27-3, Founders Park South facility.'),
 'R2023-25': ('contract', 'award', ['HG Construction Development and Investment, Inc.'], 699167.78, 'parkconstr', '', None, 'Bid No. 23-03-22-3, Yacht Club Drive pocket park.'),
 'R2023-26': ('contract', 'buy', [IAV], None, 'av', '', None, 'ARPA-funded audio-visual upgrades and lectern for the executive conference room, from a national cooperative contract; vendor named in the resolution body.'),
 'R2023-28': ('contract', 'pay', ['Garland/DBS Incorporated'], 372848, 'roof', '', None, 'Roof restoration at the Aventura Community Recreation Center.'),
 'R2023-29': ('contract', 'agree', [BD], 150350, 'erpconsult', '', None, 'ERP/IT consulting (needs assessment and procurement support); amount not to exceed $150,350 in the agreement.'),
 'O2023-11': ('zoning', None, [A2999], None, '', '', ('Amended the comprehensive plan to allow up to 70 homes per acre in the Town Center land use category, as requested by Aventura 2999 LLC', 'Modificó el plan integral para permitir hasta 70 viviendas por acre en la categoría de uso Town Center, a pedido de Aventura 2999 LLC', 'Modifye plan konplè a pou pèmèt jiska 70 kay pa ak nan kategori Town Center, jan Aventura 2999 LLC te mande'), 'Second reading. Applicant named in the ordinance (ICON Aventura, 2999 NE 191 St).'),
 'O2023-12': ('zoning', None, [A2999], None, '', '', ('Changed the Town Center (TC1) zoning rules to allow up to 70 homes per acre for projects that set aside HERO housing, as requested by Aventura 2999 LLC', 'Cambió las reglas de zonificación Town Center (TC1) para permitir hasta 70 viviendas por acre en proyectos con viviendas HERO, a pedido de Aventura 2999 LLC', 'Chanje règ zonaj Town Center (TC1) pou pèmèt jiska 70 kay pa ak pou pwojè ki mete kay HERO apa, jan Aventura 2999 LLC te mande'), 'Second reading. Applicant named in the ordinance.'),
 'O2023-13': ('zoning', None, [AOO], None, '', '', ('Changed the TC4 zoning rules to allow apartments at up to 50 homes per acre, as requested by Aventura Opportunity Owner LLC', 'Cambió las reglas de zonificación TC4 para permitir apartamentos de hasta 50 viviendas por acre, a pedido de Aventura Opportunity Owner LLC', 'Chanje règ zonaj TC4 pou pèmèt apatman jiska 50 kay pa ak, jan Aventura Opportunity Owner LLC te mande'), 'Second reading. Applicant named in the ordinance (Aventura Corporate Center site, 20801-20807 Biscayne Blvd).'),
 'R2023-41': ('contract', 'contract', ['iWorQ Systems, Inc.'], None, 'assets', '', None, 'Three-year term.'),
 'R2023-42': ('contract', 'contract', ['Shellard Lighting Designs, LLC'], None, 'lights', '', None, '2023 holiday light display.'),
 'R2023-44': ('zoning', 'cup', [AOO], None, '', '20801-20807 Biscayne Blvd', ('Conditional use for 20801-20807 Biscayne Blvd: 47 homes per acre where 25 allowed, 24 stories where 10 allowed, smaller units', 'Uso condicional para 20801-20807 Biscayne Blvd: 47 viviendas por acre donde se permiten 25, 24 pisos donde se permiten 10, unidades más pequeñas', 'Itilizasyon kondisyonèl pou 20801-20807 Biscayne Blvd: 47 kay pa ak kote 25 pèmèt, 24 etaj kote 10 pèmèt, pi piti inite'), 'Applicant: Bercow Radell Fernandez & Tapanes on behalf of Aventura Opportunity Owner LLC (resolution).'),
 'R2023-46': ('contract', 'award', ['Green Engineering & Construction, Inc.'], 394145.25, 'parkconstr', '', None, 'Bid No. 23-08-25-3, Waterways Dog Park pre-engineered restroom building.'),
 'R2023-47': ('contract', 'change', ['Bejar Construction, Inc.'], None, 'canopy', '', None, 'Shade canopy at the Founders Park South facility.'),
 'R2023-48': ('contract', 'amend', [FB], None, 'transit', '', None, 'Third amendment: longer service hours for the Tesla Model X vehicles.'),
 'R2023-50': ('contract', 'agree', ['TranSystems Corporation'], 150000, 'consult2', '', None, 'Work Authorization 2023-001, planning for the Regional Transit Zone / Metropolitan Urban Center.'),
 'R2023-52': ('zoning', 'cup', ['Treats Spirits, LLC'], None, '', '19565 Biscayne Blvd', ('Allowed alcohol sales at a cocktail lounge in the Treats food court at Aventura Mall, 19565 Biscayne Blvd', 'Permitió la venta de alcohol en un bar del patio de comidas Treats en Aventura Mall, 19565 Biscayne Blvd', 'Pèmèt vann alkòl nan yon ba nan lakou manje Treats nan Aventura Mall, 19565 Biscayne Blvd'), ''),
 'R2023-53': ('zoning', None, [AHP], None, '', '20605 NE 34 Ave', ('Released the covenant that limited 20605 NE 34 Ave (Aventura Harbor) to five homes', 'Liberó el convenio que limitaba 20605 NE 34 Ave (Aventura Harbor) a cinco viviendas', 'Leve angajman ki te limite 20605 NE 34 Ave (Aventura Harbor) a senk kay'), 'Applicant: Rosenthal Rosenthal Rasco LLC on behalf of Aventura Harbor Property LLC (resolution).'),
 'R2023-54': ('zoning', 'cup', [AHP], None, '', '20605 NE 34 Ave', ('Conditional use for a residential tower at 20605 NE 34 Ave: floor area ratio 4.8 where 1.5 allowed', 'Uso condicional para una torre residencial en 20605 NE 34 Ave: coeficiente de edificación 4.8 donde se permite 1.5', 'Itilizasyon kondisyonèl pou yon tou rezidansyèl nan 20605 NE 34 Ave: rapò sifas 4.8 kote 1.5 pèmèt'), ''),
 'R2023-55': ('zoning', 'variance', [AHP], None, '', '20605 NE 34 Ave', ('Variance at 20605 NE 34 Ave: 15 stories where 7 allowed', 'Variación en 20605 NE 34 Ave: 15 pisos donde se permiten 7', 'Derogasyon nan 20605 NE 34 Ave: 15 etaj kote 7 pèmèt'), ''),
 'R2023-58': ('grant', 'grant', ['Magen David Adom'], 150000, '', '', ('Gave up to $150,000 to Magen David Adom for a fully equipped ambulance', 'Otorgó hasta $150,000 a Magen David Adom para una ambulancia equipada', 'Bay Magen David Adom jiska $150,000 pou yon anbilans ki ekipe nèt'), 'Waived Charter section 7.05 to make the donation.'),
 'R2023-59': ('contract', 'award', ['Everglades Painting Contractors, LLC', 'Five 12 Painting & Remodeling, LLC'], None, 'paint2', '', None, 'Bid No. 23-05-16-3.'),
 'R2023-60': ('contract', 'select', [FB], 668103, 'transit', '', None, 'RFP 23-10-03-3; amount is the annual not-to-exceed for an initial three-year term.'),
 'R2023-67': ('zoning', 'cup', [A2999], None, '', '2999 NE 191 St', ('Conditional use for ICON Aventura at 2999 NE 191 St: 69 homes per acre where 25 allowed, 26 stories where 4 allowed', 'Uso condicional para ICON Aventura en 2999 NE 191 St: 69 viviendas por acre donde se permiten 25, 26 pisos donde se permiten 4', 'Itilizasyon kondisyonèl pou ICON Aventura nan 2999 NE 191 St: 69 kay pa ak kote 25 pèmèt, 26 etaj kote 4 pèmèt'), 'Applicant: Bercow Radell Fernandez & Tapanes on behalf of Aventura 2999 LLC (resolution; Michael Marrero named in the minutes).'),
 'R2023-68': ('zoning', 'variance', ['AIR Waterways Village, LLC'], None, '', '3605 NE 207 St', None, 'Parking variance: 308 spaces where 345 required.'),
 'R2023-69': ('zoning', 'cup', PS, None, '', '21280-21288 Biscayne Blvd', None, 'Self-storage facility with floor area ratio 1.88 for a LEED Gold/Platinum building.'),
 'R2023-70': ('zoning', 'variance', PS, None, '', '21280-21288 Biscayne Blvd', None, 'Parking (60 where 103 required) and landscaped open space (28% where 33% required).'),
 'R2024-04': ('contract', 'select', ['AK Building Services, Inc.'], None, 'custodial', '', None, 'RFP 23-09-12-3, custodial services at Aventura City of Excellence School, three-year term.'),
 'R2024-05': ('zoning', 'cup', ['Padel Park Aventura LLC'], None, '', '18851 NE 29 Ave', ('Allowed padel courts on the top floor of the garage at 18851 NE 29 Ave', 'Permitió canchas de pádel en el último piso del garaje en 18851 NE 29 Ave', 'Pèmèt teren padèl sou dènye etaj garaj la nan 18851 NE 29 Ave'), ''),
 'R2024-06': ('zoning', 'cup', ['The Fresh Market, Inc.'], None, '', '19205 Biscayne Blvd, Unit E150', ('Allowed a liquor package store at 19205 Biscayne Blvd, Unit E150, despite the spacing rules', 'Permitió una licorería en 19205 Biscayne Blvd, local E150, pese a las reglas de distancia', 'Pèmèt yon magazen likè nan 19205 Biscayne Blvd, inite E150, malgre règ distans yo'), ''),
 'R2024-07': ('zoning', 'cup', ['Starbucks Coffee Company'], None, '', '20401 Biscayne Blvd', ('Allowed a Starbucks with a drive-through at 20401 Biscayne Blvd', 'Permitió un Starbucks con servicio al auto en 20401 Biscayne Blvd', 'Pèmèt yon Starbucks ak sèvis machin nan 20401 Biscayne Blvd'), 'Applicant: Michael J. Marrero of Bercow Radell Fernandez + Tapanes on behalf of Starbucks Coffee Company (resolution).'),
 'R2024-12': ('contract', 'select', ['Walker Consultants'], None, 'facility', '', None, 'RFP 23-08-25-2.'),
 'R2024-14': ('sale', None, [GP], None, '', '', ('Approved a letter of intent to buy a 3-acre parcel from Gulfstream Park for a future charter school site', 'Aprobó una carta de intención para comprar un terreno de 3 acres a Gulfstream Park para una futura escuela chárter', 'Apwouve yon lèt entansyon pou achte yon teren 3 ak nan men Gulfstream Park pou yon fiti lekòl charter'), 'Also authorized amendments to the Gulfstream Park development agreement.'),
 'R2024-15': ('contract', 'buy', ['Alan Jay Automotive Management, Inc. d/b/a Alan Jay Fleet Sales'], 55756, 'vehicles', '', None, ''),
 'R2024-18': ('zoning', 'cup', ['Gaby Aventura, LLC'], None, '', '19565 Biscayne Blvd, Unit 938', ('Allowed alcohol sales at a cocktail lounge in Gaby by Call Me Gaby, Aventura Mall', 'Permitió la venta de alcohol en un bar de Gaby by Call Me Gaby, Aventura Mall', 'Pèmèt vann alkòl nan yon ba nan Gaby by Call Me Gaby, Aventura Mall'), ''),
 'R2024-24': ('contract', 'agree', ['CES Consultants, Inc.', 'Chen Moore and Associates, Inc.', 'CTS Engineering, Inc.', 'GIT Consulting, LLC', 'KCI Technologies, Inc.', 'Kimley-Horn and Associates, Inc.', 'R.E. Chisholm Architects, Inc.', 'The Corradino Group, Inc.', 'Zyscovich, LLC'], None, 'arch', '', None, 'Continuing professional services agreements under RFQ 2023-11-01 (firms named in the fee schedules attached to the resolution; selected by Res. 2024-20 on April 2, 2024).'),
 'R2024-25': ('contract', 'select', ['SFM Landscape Services, LLC'], 494871.85, 'lawn', '', None, 'RFP 2024-1-1, Biscayne Boulevard and Government Center; amount is annual, initial three-year term.'),
 'R2024-26': ('contract', 'contract', ['Alpha Playgrounds'], None, 'playsurf', '', None, 'Founders Park and Peace Park.'),
 'R2024-27': ('contract', 'contract', [SEA], None, 'fence', '', None, 'Founders Park fencing. Rescinded and replaced by Res. 2024-32 on June 4, 2024.'),
 'R2024-32': ('contract', 'contract', [SEA], None, 'fence', '', None, 'Founders Park fencing, revised contract; rescinded Res. 2024-27.'),
 'R2024-33': ('sale', None, [GP], None, '', '', ('Approved a term sheet to buy a 3-acre parcel from Gulfstream Park for a future charter school site', 'Aprobó una hoja de términos para comprar un terreno de 3 acres a Gulfstream Park para una futura escuela chárter', 'Apwouve yon fèy kondisyon pou achte yon teren 3 ak nan men Gulfstream Park pou yon fiti lekòl charter'), 'Authorized negotiating a purchase and sale agreement.'),
 'R2024-34': ('zoning', 'variance', ['Turnberry Associates'], None, '', '19565 Biscayne Blvd', ('Variance allowing a second electric-vehicle showroom at Aventura Mall, 19565 Biscayne Blvd', 'Variación que permite una segunda sala de exhibición de vehículos eléctricos en Aventura Mall, 19565 Biscayne Blvd', 'Derogasyon ki pèmèt yon dezyèm salon machin elektrik nan Aventura Mall, 19565 Biscayne Blvd'), 'Applicant: Michael Marrero c/o Bercow Radell Fernandez Larkin & Tapanes on behalf of Turnberry Associates (resolution).'),
 'R2024-35': ('contract', 'amend', [CS], None, 'charter', '', None, 'Amended management agreement for Aventura City of Excellence School. Adopted June 13, 2024 (no minutes posted for that meeting; roll from the signed resolution).'),
 'R2024-36': ('contract', 'amend', [CS], None, 'charter', '', None, 'Amended management agreement for Don Soffer Aventura High School. Adopted June 13, 2024 (roll from the signed resolution).'),
 'R2024-39': ('contract', 'emerg', ['BrightView, Inc.'], None, 'lawn', '', None, 'Landscaping after the June 12-14, 2024 flooding.'),
 'R2024-40': ('contract', 'buy', ['Torres Electrical Supply Company, Inc.'], 273340, 'streetlights', '', None, 'Ten street lights.'),
 'R2024-41': ('contract', 'award', ['Dolphin Towing & Recovery, Inc.', 'Alpine Towing d/b/a Galactic Towing'], None, 'towing', '', None, 'RFP 24-03-18-3; Alpine/Galactic is the backup towing contract.'),
 'R2024-43': ('agreement', 'unionmou', ['South Florida Police Benevolent Association'], None, '', '', None, 'Lets bargaining-unit officers hired Oct 1, 2000 - Oct 1, 2003 buy pension service credit.'),
 'R2024-45': ('contract', 'agree', ['Kimley-Horn & Associates, Inc.'], 288546, 'study', '', None, 'Work authorization: comprehensive safety action plan.'),
 'R2024-46': ('contract', 'award', ['ABS General Contractors, Inc.', 'JLMB Construction Corp.', 'Waypoint Contracting, Inc.'], None, 'constr', '', None, 'Miscellaneous construction trade services.'),
 'R2024-47': ('contract', 'agree', ['KCI Technologies, Inc.'], 139400, 'eng', '', None, 'Work authorization: surveying and mapping for the NE 191 Street drainage and roadway project.'),
 'R2024-53': ('contract', 'award', ['Southern Comfort Solutions, Inc.', 'Green Alliance, Inc.', 'Cedenos Comfort Cooling, LLC', 'Pilar Services, Inc.'], None, 'hvac', '', None, 'HVAC service, maintenance, repair, replacement and installation.'),
 'R2024-54': ('contract', 'select', ['US Lubricants, LLC', 'Envirowaste Services Group, Inc.'], None, 'stormwater', '', None, 'RFP 2024-7-1.'),
 'R2024-55': ('contract', 'insure', ['Brown & Brown Insurance Services, Inc.'], None, 'insurance', '', None, "Property, liability, auto, cyber and workers' compensation insurance."),
 'R2024-58': ('contract', 'agree', ['Tyler Technologies, Inc.'], None, 'erp', '', None, 'ERP software-as-a-service agreement.'),
 'R2024-59': ('contract', 'agree', ['GIT Consulting, LLC'], 342120, 'study', '', None, 'Work authorization: citywide vulnerability assessment and stormwater master plan update.'),
 'R2024-60': ('agreement', None, ['Clear Channel Outdoor, LLC'], None, '', '', ('Approved an agreement letting Clear Channel Outdoor remove its old billboards and build two new ones in the city', 'Aprobó un acuerdo que permite a Clear Channel Outdoor retirar sus antiguas vallas y construir dos nuevas en la ciudad', 'Apwouve yon akò ki pèmèt Clear Channel Outdoor retire ansyen pankat li yo epi bati de nouvo nan vil la'), 'Reconstruction agreement (the billboard ordinance, Ord. 2024-12, passed July 2, 2024 with no applicant named).'),
 'R2024-61': ('sale', None, [GP], 3150000, '', '', ('Agreed to buy 0.7 more acres from Gulfstream Park for $3,150,000 (3.7 acres in all, for a charter school site)', 'Acordó comprar 0.7 acres más a Gulfstream Park por $3,150,000 (3.7 acres en total, para una escuela chárter)', 'Dakò achte 0.7 ak anplis nan men Gulfstream Park pou $3,150,000 (3.7 ak an tout, pou yon lekòl charter)'), ''),
 'R2024-65': ('contract', 'select', ['CAP Government, Inc.'], None, 'buildingrev', '', None, 'ISQ 24-08-30-3; fees are a share of permit fees collected.'),
 'R2024-66': ('contract', 'agree', ['RedSpeed Florida, LLC'], None, 'speedcam', '', None, ''),
 'R2024-67': ('contract', 'amend', [BD], 429954, 'erpconsult', '', None, 'First amendment: ERP implementation oversight (proposal grand total $429,954).'),
 'R2024-68': ('contract', 'agree', ['Island Construction Group, Inc.'], None, 'deck', '', None, 'Ratified the construction agreement to replace the Government Center mezzanine deck.'),
 'R2024-69': ('contract', 'agree', ['HPF Associates, Inc.'], 110200, 'deck', '', None, "Ratified; owner's representative services for the mezzanine deck replacement (fee not to exceed $110,200)."),
 'R2024-70': ('contract', 'award', ['Tapia Luis M Service Corp. d/b/a L&M Electrical Contractors', 'IAM Electric, Inc.', 'Phase 2 Electric, LLC d/b/a Wesworth Electric'], None, 'electric', '', None, 'On-call electrical repair and maintenance.'),
 'R2024-72': ('contract', 'award', ['Alpha Management Group, LLC', 'D.W. Recreation Services, Inc.', 'Leadex Corp.'], None, 'playsurf', '', None, 'Pour-in-place rubber and artificial turf playground surfaces.'),
 'R2024-74': ('contract', 'select', ['BrightView Landscape Services, Inc.'], 457104, 'lawn', '', None, 'RFP 2024-7-2, parks landscape maintenance; amount is annual, initial three-year term.'),
 'R2024-75': ('contract', 'agree', ['CES Consultants, Inc.'], 856932, 'eng', '', None, 'Work authorization: engineering for the NE 191 Street drainage and roadway project.'),
}
# Kept-list items left out on purpose (counted in gaps)
DROP = {'R2023-05': 'ranking of ERP consulting firms (no firm named in the resolution; BerryDunn agreement is Res. 2023-29)',
        'R2024-29': 'ranking of ERP solution firms (no firm named; Tyler agreement is Res. 2024-58)',
        'R2024-20': 'selection of RFQ 2023-11-01 consultants (names only in an exhibit; the agreements with the nine named firms are Res. 2024-24)',
        'R2023-17': 'emergency purchase of Carrier chiller units (no vendor named)',
        'O2023-04': 'drive-through conditional use in B2 (code change, no applicant named)',
        'O2023-14': 'committed submerged open space definition (code change, no applicant named)',
        'O2023-20': 'HERO housing density in all Town Center districts (code change, no applicant named)',
        'O2024-12': 'billboards allowed in limited capacity (code change, no applicant named)'}
CONSENT = {}
MIN = {}
for p in glob.glob('av/min/*.json'):
    d = json.load(open(p)); MIN[d['id']] = (d['name'], re.sub(r'\s+', ' ', ' '.join(d['text'][x].replace('\r', ' ') for x in sorted(d['text'], key=int))))
def where(typ, n):
    for i, (nm, t) in MIN.items():
        if re.search(typ + r' No\. ' + n + r' adopted as follows', t): return i, True
        if re.search(typ + r' No\. ?' + n + r'\b', t): return i, False
    return None, None
acts, tr, used = [], {}, set()
for k in K:
    typ = 'Ordinance' if 'Ordinance' in k['name'] else 'Resolution'
    n = re.search(r'No\. (\d{4}-\d+)', k['name']).group(1)
    key = typ[0] + n
    if key in DROP: continue
    if key not in S: raise SystemExit('no spec for ' + key)
    used.add(key)
    kind, tpl, ps, amt, subj, x, cust, note = S[key]
    en, es, ht = cust if cust else title(tpl, ps, amt, subj, x)
    roll = dict(k['roll'])
    if key in ('R2023-20', 'R2023-21'): roll['Kruss'] = 'recused'
    y = sum(v == 'yes' for v in roll.values()); no = sum(v == 'no' for v in roll.values())
    mid, cons = where(typ, n)
    if key in ('R2023-28', 'R2023-29'):  # May 2, 2023 minutes list them on consent, misnumbered 'Resolution No. 2026-28/29'
        mid, cons = 349222, True
        note = (note + ' ' if note else '') + 'The May 2, 2023 minutes print this as "Resolution No. 2026-%s" (clerk typo) on the consent agenda.' % n[-2:]
    aid = ('ord-' if typ == 'Ordinance' else '') + n
    a = {'id': aid, 'date': k['date'], 'ref': '%s No. %s%s' % (typ, n, ' (second reading)' if typ == 'Ordinance' else (' (consent)' if cons else '')),
         'title': en, 'kind': kind, 'parties': ps,
         'amount': ('${:,.0f}'.format(amt) if float(amt).is_integer() else '${:,.2f}'.format(amt)) if amt else None,
         'url': DV % k['id'], 'roll': roll, 'tally': '%d-%d' % (y, no), 'mover': k['mover'], 'second': k['second'],
         'consent': cons, 'result': 'passed', 'notes': ((note + ' ') if note else '') + 'Roll from vote block in signed %s.' % typ.lower(),
         'tenure': True}
    if mid: a['minutes'] = DV % mid
    acts.append(a); tr[aid] = {'en': en, 'es': es, 'ht': ht}
missing = set(S) - used
if missing: raise SystemExit('specs not in keep list: %s' % sorted(missing))
meet = []
for i, (nm, t) in sorted(MIN.items()):
    m = re.match(r'(\w+ \d+, \d{4}) Aventura City Commission (.*?) Minutes', nm)
    from datetime import datetime
    dt = datetime.strptime(m.group(1), '%B %d, %Y').strftime('%Y-%m-%d')
    if dt < '2022-12-15': continue
    meet.append({'date': dt, 'name': m.group(2), 'url': DV % i, 'read': True})
for dt in sorted(set(a['date'] for a in acts) - set(m['date'] for m in meet)):
    meet.append({'date': dt, 'name': 'Special Meeting', 'url': None, 'read': False, 'note': 'no minutes posted in Laserfiche; actions from the signed resolutions'})
meet.sort(key=lambda m: m['date'])
gaps = [
 {'issue': 'Weinberg: commissioner 2010-2018 (two terms), then off the commission; elected mayor unopposed in 2022 and first presided Dec 15, 2022 (Res. 2022-69/70/71). His current tenure starts 2022-12-15; the 2010-2018 commission terms are a separate tenure and are not covered.'},
 {'issue': 'Universe: every resolution and ordinance in the Laserfiche Resolutions (2022-2024) and Ordinances (2023-2024) folders adopted 2022-12-15 .. 2024-12-31 (215 items), plus motions in the regular and special meeting minutes. Left out because the record names no private beneficiary: ' + '; '.join(DROP.values()) + '; June 6, 2023 motion appropriating $54,627.91 a year for six police vehicles (no vendor named).'},
 {'issue': 'Not counted as an action for a party: Feb 7, 2023 motion waiving the gift rule so Charter Schools USA could pay the mayor\'s travel to tour its schools (benefit to the mayor, not a city action for the company; passed unanimously by roll call, mover Friedland, second Bloom).'},
 {'issue': 'Got183 LLC (TAL Aventura, 2785 NE 183 St): its comprehensive-plan, zoning and conditional-use items passed first reading June 6, 2023 and were later withdrawn or deferred (Nov 7, 2023; Feb 20, 2024) without a final vote, so they are not in the list; the extended-stay hotel text amendment passed first reading Feb 6, 2024 (6-1, Weinberg no) and was deferred Feb 20, 2024.'},
 {'issue': 'Minutes not posted for the June 13, 2024 special meeting (Res. 2024-35, 2024-36 read from the signed resolutions) and the May 18, 2023 meeting (school budgets only).'},
]
out = {'window_from': '2022-12-15', 'actions': acts, 'meetings': meet, 'gaps': gaps, 'translations': tr}
os.makedirs(os.path.join(REPO, 'scripts/data/city/aventura/tenure'), exist_ok=True)
json.dump(out, open(os.path.join(REPO, 'scripts/data/city/aventura/tenure/actions.json'), 'w'), ensure_ascii=False, indent=1)
print(len(acts), 'actions', len(meet), 'meetings')
