"""Build scripts/data/city/nmb/tenure/actions.json (North Miami Beach, Nov 22 2022 .. Dec 31 2024) from the parsed
minutes (nmb/keep.json, nmb/seg.json; see nmb_seg.py, nmb_cand.py, nmb_keep.py) plus the hand-checked spec S below.
Run from the scratchpad work dir that holds nmb/ (txt/, seg.json, keep.json, cand.json):
    python3 -I <repo>/scripts/data/tenure/cities-a/nmb-src/nmb_build.py <repo>
Votes: a non-consent item takes the vote that follows its own 'Motion to approve <Resolution> N' line (nmb_verify);
a consent item takes the consent-agenda vote. Voice votes give a tally plus members named opposed / absent / off
the dais; every other member present is shown 'yes' only when that adds up to the tally (else 'unknown')."""
import json, os, re, sys
REPO = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
from titles import title
from nmb_verify import verify, next_consent
from nmb_parse import load
from nmb_votes import present, parse_vote
MURL = 'https://nmb.novusagenda.com/agendapublic/DisplayAgendaPDF.ashx?MinutesMeetingID=%s'
K = json.load(open('nmb/keep.json')); C = json.load(open('nmb/cand.json')); SEG = json.load(open('nmb/seg.json'))
MEMBERS = ['DeFillipo', 'Piper', 'Joseph', 'Chernoff', 'Fleurimond', 'Jean', 'Smith', 'Smukler', 'Su']

# key 'date|no' -> (kind, template, [parties], amount, subject, place, custom (en,es,ht) or None, note)
B = 'Black & Veatch Corporation'; KCI = 'KCI Technologies, Inc.'; SUI = 'Southern Underground Industries, Inc.'
PRO = 'Pro Transportation, Inc. (Prokel Mobility)'; FB = 'BeeFree, LLC (Freebee)'; CR = 'The Corradino Group, Inc.'
CW = 'Coastal Waste & Recycling of Florida, Inc.'; HZ = 'Hazen and Sawyer'; BC = 'Brown and Caldwell'
S = {
 '2022-12-20|R2022-154': ('contract', 'nobid', ['MKI Services, Inc.'], 71000, 'wequip', '', None, 'Sole-source purchase of Haywood Gordon equipment for the Norwood water plant.'),
 '2022-12-20|R2022-155': ('contract', 'amend', ['American Traffic Solutions, Inc. (Verra Mobility)'], None, 'cameras', '', ('Amended the red-light camera contract with American Traffic Solutions (Verra Mobility)', 'Modificó el contrato de cámaras de luz roja con American Traffic Solutions (Verra Mobility)', 'Modifye kontra kamera limyè wouj ak American Traffic Solutions (Verra Mobility)'), ''),
 '2022-12-20|R2022-158': ('contract', 'contract', ['Condo Electric Corp.'], 120000, 'motor', '', None, ''),
 '2022-12-20|R2022-159': ('contract', 'nobid', ['TriNova, Inc.'], 70000, 'wequip', '', None, 'Sole-source purchase of pumps and flowmeters.'),
 '2022-12-20|R2022-160': ('contract', 'nobid', ['RDP Technologies, Inc.'], 95000, 'wequip', '', None, 'Sole-source purchase of lime slaker equipment.'),
 '2022-12-20|R2022-162': ('contract', 'contract', ['Razorback, LLC'], 130000, 'tankclean', '', None, ''),
 '2022-12-20|R2022-163': ('contract', 'buy', ['Carus Corporation'], 50000, 'chem', '', None, 'Increase in annual spending for corrosion inhibitor (orthophosphate).'),
 '2023-03-21|R2022-171': ('contract', 'change', [KCI], 369696, 'arch', '', None, 'Ratified a change order on the Washington Park design agreement.'),
 '2023-03-21|R2022-172': ('contract', 'agree', [B], 524617, 'pm', '', None, 'Work Order #4, public works staff augmentation.'),
 '2023-03-21|R2023-01': ('lease', 'leasein', ['Industrial Tower and Wireless, LLC'], 384958.80, 'tower', '', ('Leased radio tower space from Industrial Tower and Wireless, LLC for 5 years (up to $384,958.80)', 'Arrendó espacio en una torre de radio a Industrial Tower and Wireless, LLC por 5 años (hasta $384,958.80)', 'Lwe espas sou yon fò radyo nan men Industrial Tower and Wireless, LLC pou 5 an (jiska $384,958.80)'), 'Quantar repeaters for NMB Water; options for ten one-year renewals.'),
 '2023-03-21|R2023-04': ('contract', 'change', ['Team Contracting, Inc.'], 500000, 'constr', '', None, 'General contracting and construction management services.'),
 '2023-03-21|R2023-07': ('contract', 'piggy', ['LMK Pipe Renewal, LLC'], 65000, 'sewer', '', None, 'City of St. Petersburg contract; emergency sewer line repairs.'),
 '2023-03-21|R2023-08': ('contract', 'change', ['N. Harris Computer Corporation'], 168830, 'billing', '', None, 'Ratified change order: utility bill printing, mailing and postage.'),
 '2023-03-21|R2023-11': ('contract', 'nobid', ['Afton Pumps, Inc.'], 295000, 'wells', '', None, 'Sole-source purchase of three well pumps and motors.'),
 '2023-03-21|R2023-12': ('contract', 'buy', ['IT Partners, LLC'], 35000, 'it', '', None, 'Increase in annual spending.'),
 '2023-03-21|R2023-13': ('contract', 'buy', ['Gardening Angel Nursery, Inc.'], 31000, 'lawn', '', None, 'Increase in annual spending on landscape material.'),
 '2023-03-21|R2023-14': ('contract', 'renew', [FB], None, 'rideshare', '', None, 'Agreement extension for on-demand transportation. Pulled from the consent agenda, then added back and passed with it.'),
 '2023-03-21|R2023-16': ('contract', 'renew', ['Sustainable Design & Construction Services, Inc.'], 49500, 'housing', '', None, 'Housing consulting for the owner-occupied home rehabilitation program.'),
 '2023-03-21|R2023-21': ('contract', 'piggy', ['H&J Asphalt, Inc.'], 144000, 'asphalt', '', None, 'City of Miami Gardens contract.'),
 '2023-03-21|R2023-23': ('contract', 'buy', ['Hach Company'], 51000, 'lab', '', None, 'Increase in annual spending.'),
 '2023-03-21|R2023-25': ('contract', 'change', ['Home Depot U.S.A., Inc.'], 36300, 'supplies', '', None, 'Ratified change order for citywide operating and maintenance supplies.'),
 '2023-04-18|R2023-19': ('contract', 'award', ['Plumber Mikes, Inc.'], 927731, 'sewer', '', None, 'ITB-22-051-MC, Corona del Mar Phase II sewer lateral connections.'),
 '2023-04-18|R2023-24': ('contract', 'change', ['Bespoke Construction Management, LLC'], 53000, 'constr', '', None, 'City Hall 2nd floor renovation (Contract 21-032-MC). Pulled from the March 21 consent agenda; approved April 18.'),
 '2023-04-18|R2023-32': ('contract', 'buy', ['AAA Automated Door Repair, Inc.'], 30000, 'doors', '', None, 'Increase in annual spending.'),
 '2023-04-18|R2023-33': ('contract', 'buy', ['Condo Electric Corp.'], 105000, 'motor', '', None, 'Increase in annual spending.'),
 '2023-04-27|R2022-168': ('zoning', 'siteplan', ['BH-SG Owner LLC', 'BH SG LLC (owner of record)'], None, '', '2261 NE 164 St', ('Approved the BH 164 site plan and 10 variances for a 32-story, 400-unit tower at 2261 NE 164 St', 'Aprobó el plano del sitio BH 164 y 10 variaciones para una torre de 32 pisos y 400 viviendas en 2261 NE 164 St', 'Apwouve plan sit BH 164 ak 10 derogasyon pou yon tou 32 etaj, 400 inite nan 2261 NE 164 St'), 'Matthew Amster and Sandy Peaceman represented the applicant/owner; applicant agreed to give $40,000 to the NMB Library.'),
 '2023-04-27|R2022-169': ('zoning', 'siteplan', ['Biscayne 18 Dev LLC (owner of record)'], None, '', '15801-15807 Biscayne Blvd', ('Approved the Biscayne Office Complex site plan and a 248-space garage at 15801-15807 Biscayne Blvd', 'Aprobó el plano del sitio de Biscayne Office Complex y un garaje de 248 espacios en 15801-15807 Biscayne Blvd', 'Apwouve plan sit Biscayne Office Complex ak yon garaj 248 plas nan 15801-15807 Biscayne Blvd'), 'Ben Fernandez represented the applicant/owner.'),
 '2023-04-27|R2022-68': ('zoning', 'variance', ['Mark and Ana Antonio'], None, '', '2811 NE 164 St', ('Granted a variance letting an existing awning at 2811 NE 164 St extend 17 feet into the side setback', 'Otorgó una variación para que un toldo existente en 2811 NE 164 St ocupe 17 pies del retiro lateral', 'Bay yon derogasyon pou yon tant ki la deja nan 2811 NE 164 St antre 17 pye nan maj akote a'), 'Owners Ana and Mark Antonio named in the resolution (Mark Antonio was then Interim City Manager).'),
 '2023-05-16|R2023-37': ('contract', 'buy', ["Greenfield's Outdoor Fitness, Inc."], 258300, 'fitness', '', None, 'Along the Snake Creek Canal.'),
 '2023-05-16|R2023-39': ('contract', 'buy', ['The Butler Group of South Florida, LLC (NextStaff)'], None, 'crossing', '', None, 'Increase in annual spending.'),
 '2023-05-16|R2023-40': ('contract', 'buy', ['Bartow Ford'], None, 'fleet', '', None, 'Seven police duty vehicles.'),
 '2023-05-16|R2023-41': ('contract', 'buy', ['Cintas Corporation No. 2'], None, 'firstaid', '', None, 'Increase in annual spending.'),
 '2023-05-16|R2023-42': ('contract', 'buy', ['Pantin Gov, LLC'], 21000, 'annex', '', None, 'Pulled from the consent agenda.'),
 '2023-06-20|R2023-43': ('contract', 'buy', ['C.A.P. Government, Inc.'], None, 'consult', '', None, 'Business license consulting and field inspections.'),
 '2023-06-20|R2023-47': ('contract', 'amend', [CR], 50000, 'consult', '', None, 'Increase to a continuing-services task order.'),
 '2023-07-18|R2023-49': ('contract', 'piggy', ['Preferred Governmental Claim Solutions, Inc.'], 57750, 'claims', '', None, ''),
 '2023-07-18|R2023-50': ('contract', 'agree', ['EAC Consulting, Inc.'], 272789, 'eng', '', None, 'Task order: Highland Village stormwater improvements Phase II.'),
 '2023-08-15|R2023-54': ('contract', 'buy', ['Azteca Systems, LLC'], None, 'assets', '', None, 'Cityworks asset management software support.'),
 '2023-08-15|R2023-55': ('contract', 'contract', ['ROK Technologies, LLC'], None, 'gis', '', None, ''),
 '2023-08-15|R2023-56': ('contract', 'amend', ['Atkins North America, Inc.'], 18300, 'arch', '', None, 'Task order increase, City Hall first floor renovation.'),
 '2023-08-15|R2023-57': ('contract', 'piggy', ['WGI, Inc.'], 149950, 'sidewalk', '', None, 'Citywide pavement and sidewalk condition assessment.'),
 '2023-08-15|R2023-60': ('contract', 'buy', ['Lhoist North America of Alabama, LLC'], None, 'chem', '', None, 'Quicklime for the water utility.'),
 '2023-08-15|R2023-61': ('contract', 'buy', ['A.C. Schultes of Florida, Inc.'], None, 'wells', '', None, 'Increase in annual spending.'),
 '2023-08-15|R2023-62': ('contract', 'buy', ['Augmented Intelligence Academy, Inc.'], None, 'stem', '', None, ''),
 '2023-08-15|R2023-63': ('contract', 'award', ['Star Building Services, Inc.'], None, 'janitorial', '', None, 'ITB-22-056-SG citywide janitorial services.'),
 '2023-08-15|R2023-65': ('contract', 'piggy', ['Brenntag Mid-South, Inc.'], 271000, 'chem', '', None, 'Sodium hydroxide; estimated annual amount.'),
 '2023-08-15|R2023-66': ('contract', 'agree', ['Chen Moore and Associates'], 119751, 'eng', '', None, 'Task order: NE 12th Avenue roundabout design.'),
 '2023-08-15|R2023-68': ('zoning', 'siteplan', ['Prestige Boardwalk LLC'], None, '', '16651 NE 18 Ave', ('Approved the Prestige Boardwalk site plan and an alley vacation at 16651 NE 18 Ave', 'Aprobó el plano del sitio de Prestige Boardwalk y el cierre de un callejón en 16651 NE 18 Ave', 'Apwouve plan sit Prestige Boardwalk ak fèmen yon ti ri nan 16651 NE 18 Ave'), 'Pedro Gassant (Holland & Knight) and Manuel Del Monte (Zyscovich) presented for the applicant.'),
 '2023-08-15|2023-69': ('zoning', 'variance', ['Joseph Feder (owner of record)'], None, '', '853 NE 164 St', ('Granted a variance for a side-yard pool at 853 NE 164 St (Feder residence)', 'Otorgó una variación para una piscina en el patio lateral en 853 NE 164 St (residencia Feder)', 'Bay yon derogasyon pou yon pisin nan lakou akote nan 853 NE 164 St (kay Feder)'), ''),
 '2023-08-15|R2023-71': ('contract', 'contract', ['Carbyne, Inc.'], None, 'dispatch', '', None, ''),
 '2023-08-15|R2023-72': ('contract', 'change', ['FieldTurf USA, Inc.'], None, 'turf', '', None, 'Mishcon Park field turf and site remediation.'),
 '2023-08-15|2023-73': ('zoning', None, ['Owners of North Miami Beach Village (one represented by Eduardo Robayna)'], None, '', '', ('Amended the declaration of restrictions and shared-area agreement for North Miami Beach Village', 'Modificó la declaración de restricciones y el acuerdo de áreas comunes de North Miami Beach Village', 'Modifye deklarasyon restriksyon ak akò zòn komen North Miami Beach Village'), 'Eduardo Robayna appeared on behalf of one of the property owners.'),
 '2023-09-19|R2023-78': ('contract', 'renew', ['Caballero, Fierman, Llerena & Garcia, LLP'], None, 'audit', '', None, 'One-year extension.'),
 '2023-09-19|R2023-79': ('contract', 'buy', ['Prolime Corporation'], 258000, 'sludge', '', None, 'Increase in annual spending.'),
 '2023-09-19|R2023-80': ('contract', 'agree', [HZ], 179350, 'eng', '', None, 'Task order: pump station upgrades.'),
 '2023-09-19|R2023-81': ('contract', 'change', ['PCL Construction, Inc.'], 222128, 'plantconstr', '', None, 'Norwood plant renovation; relocation of FPL power.'),
 '2023-09-19|R2023-82': ('contract', 'agree', ['The Avanti Company'], None, 'wequip', '', None, 'Lightning suppression technology.'),
 '2023-09-19|R2023-83': ('contract', 'agree', ['Calvin, Giordano and Associates'], 80720, 'eng', '', None, 'Task order: library generator project.'),
 '2023-09-19|R2023-85': ('zoning', 'siteplan', ['1700 NE 164 Associates, LLC (applicant per city lobbyist registration)'], None, '', '1700 NE 164 St', ('Approved The Helios site plan and five variances for a 378-unit mixed-use building at 1700 NE 164 St', 'Aprobó el plano del sitio de The Helios y cinco variaciones para un edificio de uso mixto de 378 viviendas en 1700 NE 164 St', 'Apwouve plan sit The Helios ak senk derogasyon pou yon bilding 378 inite nan 1700 NE 164 St'), 'Ethan Wasserman appeared on behalf of the applicant; he and Devon Vickers (Greenberg Traurig) were registered with the city as lobbyists for 1700 NE 164 Associates, LLC for development approvals at the SE corner of NE 17 Ave and NE 164 St (2023 lobbyist list).'),
 '2023-09-19|R2023-86': ('zoning', 'abandon', ['Prestige Boardwalk LLC'], None, '', 'NE 167 St (Fulford by the Sea, Block 66)', ('Vacated a 20-foot, 8,311 sq ft alley south of NE 167 St for the Prestige Boardwalk project', 'Cerró un callejón de 20 pies (8,311 pies cuadrados) al sur de NE 167 St para el proyecto Prestige Boardwalk', 'Fèmen yon ti ri 20 pye (8,311 pye kare) nan sid NE 167 St pou pwojè Prestige Boardwalk'), 'Pedro Gassant appeared on behalf of the applicant. Applicant identified as Prestige Boardwalk from the item heading and the Aug 15 site plan (R2023-68).'),
 '2023-09-19|R2023-87': ('contract', 'agree', [FB], None, 'rideshare', '', None, ''),
 '2023-10-17|2023-59': ('agreement', 'partner', ['CareerSource South Florida'], None, 'workforce', '', None, 'Pulled from the Aug 15 consent agenda; approved Oct 17.'),
 '2023-10-17|R2023-89': ('contract', 'agree', ['David Mancini & Sons, Inc.'], 1500000, 'watermain', '', None, 'Design-build agreement, Oleta River crossing water main.'),
 '2023-10-17|R2023-91': ('contract', 'agree', [B], 4222763, 'pm', '', None, 'Work Order #4, NMB Water program management.'),
 '2023-10-17|R2023-96': ('contract', 'renew', ['ODP Business Solutions, LLC'], 150000, 'office', '', None, ''),
 '2023-10-17|R2023-99': ('contract', 'change', ['Crom Corporation'], 48700, 'tankclean', '', None, 'Baffle curtains for an 800,000-gallon storage tank.'),
 '2023-10-17|R2023-101': ('contract', 'agree', [CR], 324480, 'consult', '', None, 'Task order: management staff for Community Development. Pulled from the consent agenda.'),
 '2023-10-17|R2023-102': ('contract', 'amend', [PRO], 163800, 'trolley', '', None, 'Route E trolley, seven-month extension.'),
 '2023-10-17|R2023-103': ('zoning', 'siteplan', ['Lanaar Properties LLC (owner of record)'], None, '', '1998-2065 NE 161 St', ('Approved the Lanaar Academy site plan and seven variances for a private school at 1998-2065 NE 161 St', 'Aprobó el plano del sitio de Lanaar Academy y siete variaciones para una escuela privada en 1998-2065 NE 161 St', 'Apwouve plan sit Lanaar Academy ak sèt derogasyon pou yon lekòl prive nan 1998-2065 NE 161 St'), 'Matt Amster represented the applicant/property owner.'),
 '2023-10-17|R2023-104': ('zoning', 'cup', ['Univida Medical Center', '17100 Property Holdings LLC (owner of record)'], None, '', '17100 NE 19 Ave', None, 'Medical office; Javier Vazquez represented the applicant/property owner.'),
 '2023-10-17|R2023-105': ('zoning', 'siteplan', ['PPG ARK Equishares Owner LLC (owner of record)'], None, '', '1699-1755 NE 167 St', ('Approved the Palm Aire site plan and 16 variances on the former Nova Southeastern campus, 1699-1755 NE 167 St', 'Aprobó el plano del sitio de Palm Aire y 16 variaciones en el antiguo campus de Nova Southeastern, 1699-1755 NE 167 St', 'Apwouve plan sit Palm Aire ak 16 derogasyon sou ansyen kanpis Nova Southeastern, 1699-1755 NE 167 St'), 'Matt Amster represented the applicant/property owner; Kobi Karp presented the plans.'),
 '2023-10-17|R2023-107': ('contract', 'agree', ['Enterprise Fleet Management, Inc.'], 595743, 'fleet', '', None, 'Police fleet replacement program.'),
 '2023-10-17|R2023-109': ('settlement', 'settle', ['Jennie Pierre, as parent of a minor'], None, '', '', None, 'Pierre v. City of North Miami Beach, Case No. 19-15012-CA-01.'),
 '2023-10-26|R2023-106': ('contract', 'amend', [CW], None, 'waste', '', None, 'Amendment No. 2: moved the annual CPI increase date.'),
 '2023-12-19|R2023-111': ('settlement', 'settle', ['Terry Garcia'], None, '', '', None, 'Garcia v. City of North Miami Beach, Case No. 2022-017977-CA-01.'),
 '2023-12-19|R2023-112': ('contract', 'contract', ['MCCI, LLC'], 160000, 'digitize', '', None, 'Building Department records.'),
 '2023-12-19|R2023-114': ('contract', 'piggy', ['Raftelis Financial Consultants, Inc.'], 367400, 'rates', '', None, ''),
 '2023-12-19|R2023-115': ('contract', 'piggy', ['Polaris Sales, Inc.'], 63059, 'vehicles', '', None, 'Two utility task vehicles (ratified).'),
 '2023-12-19|R2023-117': ('contract', 'piggy', ['Airgas USA, LLC'], 110000, 'chem', '', None, 'Carbon dioxide bulk delivery.'),
 '2023-12-19|R2023-120': ('zoning', 'siteplan', ['Citadel Care Centers', '1800 NE 168th Street LLC (owner of record)'], None, '', '1800 NE 168 St', ('Approved Citadel Care Center: a 147-bed nursing facility with seven variances at 1800 NE 168 St', 'Aprobó Citadel Care Center: un centro de enfermería de 147 camas con siete variaciones en 1800 NE 168 St', 'Apwouve Citadel Care Center: yon sant swen 147 kabann ak sèt derogasyon nan 1800 NE 168 St'), 'Javier Vazquez represented the applicant/property owner.'),
 '2023-12-19|R2023-121': ('zoning', 'cup', ['Bullish International (B-side Liquors)', 'NAL Property Investments LLC (owner of record)'], None, '', '73 NW 167 St', ('Granted a conditional use for a package liquor store (B-side Liquors) at 73 NW 167 St', 'Otorgó un uso condicional para una licorería (B-side Liquors) en 73 NW 167 St', 'Bay yon itilizasyon kondisyonèl pou yon magazen likè (B-side Liquors) nan 73 NW 167 St'), 'Willis Andrews represented the applicant/property owner.'),
 '2023-12-19|R2023-122': ('grant', 'grant', ['North Miami Beach Eruv Council, Inc.'], 35000, '', '', None, 'Right-of-way permit and grant toward maintaining and expanding the eruv line.'),
 '2023-12-19|R2023-123': ('contract', 'nobid', ['Sun-Star Electric, Inc.'], 100120, 'wells', '', None, 'Sole-source Hitachi submersible motor.'),
 '2023-12-19|R2023-124': ('contract', 'piggy', ['Airgas Specialty Products, Inc.'], 100000, 'chem', '', None, ''),
 '2023-12-19|R2023-126': ('contract', 'piggy', ['Rechtien International Trucks, Inc.'], 138048, 'truck', '', None, '22-foot trash dump truck.'),
 '2023-12-19|R2023-127': ('contract', 'piggy', ['Lhoist North America of Alabama, LLC'], 1100000, 'chem', '', None, 'Quicklime; estimated annual amount.'),
 '2023-12-19|R2023-128': ('contract', 'piggy', ['Allied Universal Corp.'], 882000, 'chem', '', None, 'Sodium hypochlorite; estimated annual amount.'),
 '2023-12-19|R2023-129': ('contract', 'award', [SUI], 12701471, 'watermain', '', None, 'ITB-23-028-SG, Eastern Shores water main replacement Phase II.'),
 '2023-12-19|R2023-125': ('contract', 'agree', ['C.A.P. Government, Inc.'], None, 'consult', '', None, 'Business tax receipt (BTR) evaluation, training and staff augmentation.'),
 '2024-01-16|R2023-119': ('zoning', 'siteplan', ['May NMB LLC', '2255 Land Associates LLC (owner of record)', 'Laurenzo Bros Property LLC (owner of record)'], None, '', '16385-16445 W Dixie Hwy and 2255 NE 164 St', ('Approved the May NMB site plan and 13 variances for a 34-story, 1,217-unit project at 16385-16445 W Dixie Hwy', 'Aprobó el plano del sitio de May NMB y 13 variaciones para un proyecto de 34 pisos y 1,217 viviendas en 16385-16445 W Dixie Hwy', 'Apwouve plan sit May NMB ak 13 derogasyon pou yon pwojè 34 etaj, 1,217 inite nan 16385-16445 W Dixie Hwy'), 'Matthew Amster represented the applicant/property owner. Tabled Dec 19, 2023 (5-2, Chernoff and Smith opposed) and approved Jan 16, 2024.'),
 '2024-01-16|R2024-01': ('contract', 'change', ['Home Depot U.S.A., Inc. (Home Depot Pro)'], 150000, 'supplies', '', None, 'Citywide janitorial supplies.'),
 '2024-01-16|R2024-02': ('contract', 'piggy', ['Amaya Solutions, Inc. (American Water Chemicals)'], 194000, 'chem', '', None, 'Antiscalant.'),
 '2024-01-16|R2024-03': ('contract', 'piggy', ['BrightView Landscape Services'], 135880, 'lawn', '', None, 'Athletic field maintenance; estimated annual amount.'),
 '2024-01-16|R2024-05': ('contract', 'piggy', ['Altec Industries, Inc.'], 240887, 'truck', '', None, 'Freightliner bucket truck.'),
 '2024-01-16|R2024-06': ('contract', 'contract', ['AMCS Group, Inc.'], 60000, 'software', '', None, 'Fleet management software.'),
 '2024-01-16|R2024-07': ('contract', 'nobid', ['Core & Main'], 80000, 'meters', '', None, 'Sole-source Sensus products.'),
 '2024-01-16|R2024-08': ('contract', 'change', ['Crom Corporation'], 20715, 'tankclean', '', None, 'Baffle curtain replacement.'),
 '2024-01-16|R2024-09': ('contract', 'piggy', ['Enterprise Fleet Management, Inc.'], 266000, 'vlease', '', None, 'Vehicle leasing; estimated annual amount.'),
 '2024-01-16|R2024-10': ('contract', 'piggy', ['Environmental Products Group, Inc.'], 399600, 'vehicles', '', None, 'Whirlwind vacuum street sweeper truck.'),
 '2024-01-16|R2024-11': ('contract', 'nobid', ['Fluid Control Specialties, Inc.'], 320000, 'wequip', '', None, 'Sole-source process control instruments.'),
 '2024-01-16|R2024-12': ('contract', 'nobid', ['Gilson Engineering Sales of Florida'], 82000, 'wequip', '', None, 'Sole-source Precision Digital products.'),
 '2024-01-16|R2024-13': ('contract', 'change', ['Graybar Electric Company, Inc.'], 235000, 'electric', '', None, 'Electrical products and services.'),
 '2024-01-16|R2024-15': ('contract', 'change', ['Sherwin-Williams'], 70000, 'paint', '', None, 'Paint and related products.'),
 '2024-01-16|R2024-16': ('contract', 'agree', ['Stantec Consulting Services, Inc.'], 79200, 'eng', '', None, 'Task order: deep injection well testing and operations.'),
 '2024-01-16|R2024-17': ('contract', 'change', ['Toshiba America Business Solutions'], 125000, 'printing', '', None, ''),
 '2024-01-16|R2024-18': ('contract', 'nobid', ['TriNova, Inc.'], 102000, 'wequip', '', None, 'Sole-source Endress+Hauser and ProMinent products.'),
 '2024-01-16|R2024-19': ('contract', 'change', ['Waco Filters Corporation'], 80000, 'wequip', '', None, 'Cartridge filters, three years.'),
 '2024-01-16|R2024-21': ('settlement', 'settle', ['Christian Romain-Pierrot'], None, '', '', None, 'Romain-Pierrot v. City of North Miami Beach, Case No. 2022-022157-CA-01.'),
 '2024-01-16|R2024-22': ('contract', 'change', [CW], None, 'waste', '', ('Approved weekly recycling pickup by Coastal Waste & Recycling (fee up $3.50 a month per home)', 'Aprobó la recolección semanal de reciclaje por Coastal Waste & Recycling (tarifa sube $3.50 al mes por vivienda)', 'Apwouve ranmasaj resiklaj chak semèn pa Coastal Waste & Recycling (frè monte $3.50 pa mwa pou chak kay)'), 'City absorbs the added cost through Sept 30, 2024.'),
 '2024-02-20|R2024-24': ('contract', 'change', ['Shaw Industries, Inc.'], 350000, 'flooring', '', None, ''),
 '2024-02-20|R2024-25': ('contract', 'change', ['Thyssenkrupp Elevator Corporation'], 200000, 'elevator', '', None, ''),
 '2024-02-20|R2024-26': ('contract', 'change', ['World Electric Supply Co.'], 130000, 'electric', '', None, 'Lighting and electrical supplies.'),
 '2024-02-20|R2024-27': ('contract', 'agree', ['WSP USA, Inc.'], 492609, 'eng', '', None, 'Task order: Pine Tree North water main replacement management.'),
 '2024-02-20|R2024-28': ('contract', 'change', ['Xylem Water Solutions, Inc.'], 357000, 'pumps2', '', None, 'Flygt pumps, parts and repairs.'),
 '2024-02-20|R2024-29': ('contract', 'piggy', ['AAA Automated Door Repair, Inc.'], 110000, 'doors', '', None, ''),
 '2024-02-20|R2024-30': ('contract', 'piggy', ['Environmental Products Group, Inc.'], 148000, 'vactor', '', None, ''),
 '2024-02-20|R2024-32': ('zoning', 'variance', ['Luis Zolezzi'], None, '', '16950 NE 17 Ave', ('Granted variances for a side-yard pool at 16950 NE 17 Ave (Zolezzi residence)', 'Otorgó variaciones para una piscina en el patio lateral en 16950 NE 17 Ave (residencia Zolezzi)', 'Bay derogasyon pou yon pisin nan lakou akote nan 16950 NE 17 Ave (kay Zolezzi)'), 'Luis Zolezzi, the owner, appeared.'),
 '2024-02-20|R2024-34': ('contract', 'renew', ['Invoice Cloud, Inc.'], 612000, 'billing', '', None, 'Electronic billing and payment software.'),
 '2024-02-20|R2024-35': ('contract', 'piggy', ['Rexel USA, Inc.'], 595000, 'wequip', '', None, 'Allen-Bradley and Rockwell automation equipment.'),
 '2024-02-20|R2024-36': ('contract', 'piggy', ['Trane U.S. Inc.'], 625000, 'hvac3', '', None, ''),
 '2024-02-20|R2024-37': ('contract', 'award', ['Florida Design Drilling, LLC'], 1150000, 'pumpstation', '', None, 'ITB-23-027-SG, operations center pump station improvements.'),
 '2024-02-20|R2024-42': ('easement', 'easement', ['3rd Day Church, Inc.'], None, '', '', ('Substituted 3rd Day Church as grantee of a city easement held by Jewish War Veterans Post #682', 'Sustituyó a 3rd Day Church como beneficiaria de una servidumbre municipal que tenía Jewish War Veterans Post #682', 'Mete 3rd Day Church kòm benefisyè yon sèvitid vil la ki te pou Jewish War Veterans Post #682'), 'Michael Snyder appeared on behalf of 3rd Day Church.'),
 '2024-02-20|R2024-43': ('agreement', None, ['NMB Place Owner, LLC'], 500000, '', '', ('Gave NMB Place Owner, LLC $500,000 in building permit credits instead of a cash reimbursement', 'Otorgó a NMB Place Owner, LLC $500,000 en créditos de permisos de construcción en lugar de un reembolso en efectivo', 'Bay NMB Place Owner, LLC $500,000 an kredi pèmi konstriksyon olye yon ranbousman lajan kach'), ''),
 '2024-03-19|R2024-40': ('contract', 'change', ['Axon Enterprise, Inc.'], 151229, 'tasers', '', None, 'Forty Taser 7 devices.'),
 '2024-03-19|R2024-44': ('contract', 'renew', [PRO], 1925688, 'trolley', '', None, 'One-year renewal, trolley operations and maintenance.'),
 '2024-03-19|R2024-45': ('agreement', None, ['Utility Service Partners Private Label, Inc. (Service Line Warranties of America)'], None, '', '', ('Approved a marketing agreement letting Service Line Warranties of America sell home water and sewer line warranties to residents', 'Aprobó un acuerdo de mercadeo para que Service Line Warranties of America venda garantías de tuberías a los residentes', 'Apwouve yon akò maketing pou Service Line Warranties of America vann garanti tiyo bay rezidan yo'), ''),
 '2024-04-16|R2024-47': ('contract', 'piggy', ['GML Coatings, LLC'], 90000, 'sewer', '', None, 'Sewer, stormwater line and manhole rehabilitation.'),
 '2024-04-16|R2024-48': ('agreement', 'agree', ['North Miami Beach Little League, Inc.'], None, 'sports', '', None, ''),
 '2024-04-16|R2024-49': ('agreement', 'agree', ['North Miami Beach Youth Athletic Club, Inc.'], None, 'sports', '', None, 'Pulled from the consent agenda.'),
 '2024-04-16|R2024-50': ('contract', 'change', ['B&H Foto & Electronics Corp.'], 100000, 'av', '', None, ''),
 '2024-04-16|R2024-54': ('agreement', 'union', ['AFSCME Local 3293'], None, '', '', None, 'Collective bargaining agreement Oct 1, 2023 - Sept 30, 2026.'),
 '2024-04-16|R2024-56': ('contract', 'agree', [BC], 534980, 'eng', '', None, 'Task order: Pinetree Park South water main replacement.'),
 '2024-04-16|R2024-57': ('contract', 'agree', [BC], 411056, 'eng', '', None, 'Task order: Norland Southeast water main replacement.'),
 '2024-04-16|R2024-58': ('contract', 'contract', ['Greenspoon Marder, LLP'], None, 'legal2', '', None, 'RFQ-23-035-SG; Joseph Geller appeared. The commission ranked the firm first on March 18, 2024.'),
 '2024-05-21|R2024-60': ('contract', 'change', ['Shenandoah General Construction, LLC'], 200000, 'drain', '', None, 'Pulled from the consent agenda.'),
 '2024-05-21|R2024-61': ('contract', 'renew', ['Rubin, Turnbull & Associates'], 93750, 'lobby', '', None, 'Federal lobbying. Pulled from the consent agenda.'),
 '2024-05-21|R2024-63': ('contract', 'change', [KCI], 174910, 'arch', '', None, 'Washington Park design enhancements and bidding help.'),
 '2024-06-27|R2024-65': ('contract', 'change', ['DoneRite Pumps, Inc.'], 25000, 'pumps', '', None, ''),
 '2024-06-27|R2024-66': ('contract', 'change', ['A.C. Schultes of Florida, Inc.'], 45000, 'wells', '', None, ''),
 '2024-06-27|R2024-67': ('contract', 'piggy', ['DOF Creations, LLC'], 140000, 'network', '', None, 'Lease-to-own; annual amount.'),
 '2024-06-27|R2024-68': ('contract', 'piggy', ['Razorback, LLC'], 251000, 'tankclean', '', None, 'Annual amount.'),
 '2024-06-27|R2024-69': ('zoning', 'variance', ['At Home store (represented by Patience Shaffer)', 'Oleta Partners Biscayne (owner of record)'], None, '', '14585 Biscayne Blvd', ('Granted a sign variance for an illuminated wall sign at the At Home store, 14585 Biscayne Blvd', 'Otorgó una variación para un letrero iluminado en la tienda At Home, 14585 Biscayne Blvd', 'Bay yon derogasyon pou yon pankat limen nan magazen At Home, 14585 Biscayne Blvd'), ''),
 '2024-06-27|R2024-72': ('zoning', 'cup', ['Howl Nation (represented by Eduardo Machado)', 'Legacy at Harbour Inc. (owner of record)'], None, '', '16385 Biscayne Blvd', ('Granted a conditional use for a pet supply store and dog hotel (Howl Nation) at 16385 Biscayne Blvd', 'Otorgó un uso condicional para una tienda de mascotas y hotel para perros (Howl Nation) en 16385 Biscayne Blvd', 'Bay yon itilizasyon kondisyonèl pou yon magazen bèt ak otèl chen (Howl Nation) nan 16385 Biscayne Blvd'), ''),
 '2024-06-27|R2024-73': ('contract', 'award', [SUI], 3191524, 'watermain', '', None, 'ITB-24-016-SG, Bunche Park water main replacement.'),
 '2024-07-16|R2024-70': ('zoning', 'siteplan', ['North Towne Phase I, LLC', 'AHS Residential, LLC (Resia)'], None, '', '15530-15780 W Dixie Hwy', ('Approved the New North site plan and 18 variances for 1,296 homes at 15530-15780 W Dixie Hwy', 'Aprobó el plano del sitio de New North y 18 variaciones para 1,296 viviendas en 15530-15780 W Dixie Hwy', 'Apwouve plan sit New North ak 18 derogasyon pou 1,296 kay nan 15530-15780 W Dixie Hwy'), 'Pedro Gassant presented for the applicant and Gus Cabrera (AHS Residential/Resia) spoke; owner named in the companion alley vacation (R2024-71).'),
 '2024-07-16|R2024-71': ('zoning', 'abandon', ['North Towne Phase I, LLC', 'AHS Residential, LLC (Resia)'], None, '', '15530 and 15540 W Dixie Hwy', ('Vacated a 20-foot alley next to 15530 and 15540 W Dixie Hwy in favor of North Towne Phase I, LLC', 'Cerró un callejón de 20 pies junto a 15530 y 15540 W Dixie Hwy a favor de North Towne Phase I, LLC', 'Fèmen yon ti ri 20 pye bò 15530 ak 15540 W Dixie Hwy an favè North Towne Phase I, LLC'), 'Applicant named in the resolution.'),
 '2024-07-16|2024-10': ('zoning', 'devagree', ['North Towne Phase I, LLC', 'AHS Residential, LLC (Resia)'], None, '', '15530-15780 W Dixie Hwy', ('Amended the New North development agreement for 15530-15780 W Dixie Hwy', 'Modificó el acuerdo de desarrollo de New North para 15530-15780 W Dixie Hwy', 'Modifye akò devlopman New North pou 15530-15780 W Dixie Hwy'), 'Ordinance, second reading.'),
 '2024-07-16|R2024-76': ('contract', 'piggy', ['WGI, Inc.'], 167470, 'traffic', '', None, ''),
 '2024-07-16|R2024-77': ('contract', 'change', ['MCCI, LLC'], 33100, 'digitize', '', None, ''),
 '2024-07-16|R2024-81': ('contract', 'piggy', ['SpryPoint Services, Inc.'], 1602345, 'billing', '', None, 'Utility billing and customer service software.'),
 '2024-07-16|R2024-83': ('contract', 'award', [SUI], 6686387, 'sewer', '', None, 'ITB-24-005-SG, multi-site wastewater project.'),
 '2024-08-27|R2024-78': ('zoning', 'siteplan', ['Elevate 163 North Miami Beach LLC (owner of record)'], None, '', '1973-1991 NE 163 St', ('Approved Elevate 163: a 26-story, 351-unit building with nine variances at 1973-1991 NE 163 St', 'Aprobó Elevate 163: un edificio de 26 pisos y 351 viviendas con nueve variaciones en 1973-1991 NE 163 St', 'Apwouve Elevate 163: yon bilding 26 etaj, 351 inite ak nèf derogasyon nan 1973-1991 NE 163 St'), 'Matt Amster appeared on behalf of the applicant.'),
 '2024-08-27|R2024-88': ('contract', 'change', ['Pantropic Power, Inc.'], 80000, 'generator', '', None, ''),
 '2024-08-27|R2024-91': ('zoning', 'siteplan', ['Food Group Investments LLC (owner of record)', 'La Granja'], None, '', '105 NE 167 St', ('Approved a site plan to expand the La Granja restaurant at 105 NE 167 St', 'Aprobó un plano del sitio para ampliar el restaurante La Granja en 105 NE 167 St', 'Apwouve yon plan sit pou agrandi restoran La Granja nan 105 NE 167 St'), 'Fernando Gallesi presented.'),
 '2024-08-27|R2024-92': ('contract', 'select', ['Aetna, Inc.'], None, 'health', '', None, ''),
 '2024-09-17|R2024-93': ('contract', 'change', ["Country Bill's Lawn Maintenance, Inc."], 300000, 'lawn', '', None, 'Approved with a one-year extension.'),
 '2024-09-17|R2024-94': ('contract', 'renew', ['Garland/DBS, Inc.'], 8000000, 'roof', '', None, 'Five-year renewal.'),
 '2024-09-17|R2024-95': ('sale', 'sale', ['Palmetto Homes Urban Development Group'], None, '', '', ('Awarded city-owned land to Palmetto Homes Urban Development Group to build an affordable home', 'Adjudicó un terreno municipal a Palmetto Homes Urban Development Group para construir una vivienda asequible', 'Bay Palmetto Homes Urban Development Group yon tè vil la pou bati yon kay abòdab'), 'RFP-24-020-SG.'),
 '2024-09-17|R2024-96': ('contract', 'buy', ['CentralSquare Technologies'], None, 'dispatch', '', None, 'Police dispatch and records system.'),
 '2024-09-17|R2024-99': ('contract', 'piggy', ['Insituform Technologies, LLC'], 227000, 'pipelining', '', None, ''),
 '2024-09-17|R2024-102': ('zoning', 'siteplan', ['World Class Properties Investments LLC'], None, '', '1400 NE 171 St', ('Approved a site plan and four variances for a three-unit building at 1400 NE 171 St', 'Aprobó un plano del sitio y cuatro variaciones para un edificio de tres unidades en 1400 NE 171 St', 'Apwouve yon plan sit ak kat derogasyon pou yon bilding twa inite nan 1400 NE 171 St'), 'Ceasar Mestre presented.'),
 '2024-09-17|R2024-103': ('zoning', 'variance', ['Jacob Koby Ohayon'], None, '', '3380 NE 170 St', None, 'Setback variances for a shade structure (Ohayon residence); Alter Gambarte spoke for the owner.'),
 '2024-10-15|2024-12': ('zoning', 'rezone', ['The Offices of NMB LLC'], None, '', '17031 and 17051 NE 20 Ave', ('Rezoned 17031 and 17051 NE 20 Ave from multifamily to limited business, at the request of The Offices of NMB LLC', 'Cambió la zonificación de 17031 y 17051 NE 20 Ave de multifamiliar a comercio limitado, a pedido de The Offices of NMB LLC', 'Chanje zonaj 17031 ak 17051 NE 20 Ave soti nan plizyè fanmi pou biznis limite, jan The Offices of NMB LLC te mande'), 'Ordinance, second reading (first reading Sept 17, 2024).'),
 '2024-10-15|R2024-110': ('contract', 'change', ['Allied Universal Corp.'], 25000, 'poolchem', '', None, ''),
 '2024-10-15|R2024-111': ('contract', 'piggy', ['RingCentral, Inc.'], None, 'phones2', '', None, ''),
 '2024-10-15|R2024-112': ('contract', 'award', ['Northwest Exterminating Co., LLC', 'Tower Pest Control, Inc.'], 90000, 'pest', '', None, 'ITB-24-011-AS; primary and secondary vendors.'),
 '2024-10-15|R2024-113': ('contract', 'piggy', ['The Goodyear Tire & Rubber Company'], 370000, 'tires', '', None, ''),
 '2024-10-15|R2024-116': ('zoning', 'siteplan', ['MTV 55 LLC (owner of record)'], None, '', '17450 Biscayne Blvd', ('Approved the 174 Shoppes site plan and variances at 17450 Biscayne Blvd', 'Aprobó el plano del sitio de 174 Shoppes y variaciones en 17450 Biscayne Blvd', 'Apwouve plan sit 174 Shoppes ak derogasyon nan 17450 Biscayne Blvd'), 'Martin Djmal presented.'),
 '2024-10-15|R2024-117': ('zoning', 'siteplan', ['JME Holdings LLC (owner of record)', 'Feldman House'], None, '', '1981 NE 153 St', ('Approved the Feldman House warehouse site plan and four variances at 1981 NE 153 St', 'Aprobó el plano del sitio del almacén Feldman House y cuatro variaciones en 1981 NE 153 St', 'Apwouve plan sit depo Feldman House ak kat derogasyon nan 1981 NE 153 St'), 'Errol Feldman presented.'),
 '2024-10-15|R2024-122': ('contract', 'change', ["All Webb's Enterprise, Inc."], 260000, 'sewer', '', None, ''),
 '2024-10-15|R2024-125': ('contract', 'piggy', ['Motorola Solutions, Inc.'], 1869000, 'radios', '', None, 'Request to defer was dropped by consensus; heard and approved.'),
 '2024-12-17|R2024-120': ('agreement', None, [CW], None, '', '', ('Set how Coastal Waste & Recycling\'s contract donations are spent (scholarships, seniors, community programs)', 'Definió cómo se usan las donaciones contractuales de Coastal Waste & Recycling (becas, adultos mayores, programas comunitarios)', 'Fikse kijan don kontra Coastal Waste & Recycling yo ap depanse (bous, granmoun, pwogram kominote)'), 'Passed as amended.'),
 '2024-12-17|R2024-124': ('contract', 'agree', ['Marcum, LLP'], None, 'audit', '', ('Rejected the resolution approving Marcum, LLP as external auditor', 'Rechazó la resolución que aprobaba a Marcum, LLP como auditor externo', 'Rejte rezolisyon ki t ap apwouve Marcum, LLP kòm oditè ekstèn'), 'The motion on the resolution failed 3-4; a later motion to approve the engagement with Marcum passed 7-0 (recorded separately).'),
 '2024-12-17|R2024-127': ('contract', 'agree', ['Carollo Engineers, Inc.'], 358220, 'eng', '', None, ''),
 '2024-12-17|R2024-129': ('contract', 'contract', ['ROK Technologies, LLC'], None, 'gis', '', None, ''),
 '2024-12-17|R2024-131': ('zoning', 'plat', ['Trinsic Acquisition Company LLC (Aura North Miami Beach)', 'TRG NMB 5Park LLC (owner of record)'], None, '', '16955-17071 W Dixie Hwy', ('Approved the Central Subdivision (Aura) final plat at 16955-17071 W Dixie Hwy', 'Aprobó el plano final de subdivisión Central Subdivision (Aura) en 16955-17071 W Dixie Hwy', 'Apwouve plan final lotisman Central Subdivision (Aura) nan 16955-17071 W Dixie Hwy'), 'Vanessa Madrid appeared on behalf of the applicant/developer.'),
 '2024-12-17|R2024-132': ('agreement', 'union', ['International Union of Police Associations, Local 6005'], None, '', '', None, ''),
 '2024-12-17|R2024-133': ('contract', 'agree', [B], 280000, 'pm', '', None, 'Washington Park Phase 1 pump station and force main.'),
 '2024-12-17|R2024-134': ('zoning', 'vacate', ['Public Health Trust (Jackson North Medical Center)'], None, '', '', ('Vacated parts of NW 171 St and East Drive for the Jackson North Medical Center expansion', 'Cerró partes de NW 171 St y East Drive para la ampliación de Jackson North Medical Center', 'Fèmen kèk pati NW 171 St ak East Drive pou agrandisman Jackson North Medical Center'), 'Public hospital system; listed because the vacation benefits the named applicant.'),
 '2024-12-17|R2024-138': ('contract', 'piggy', ['Alan Jay Automotive Management, Inc. (Alan Jay Fleet Sales)'], None, 'vehicles', '', None, ''),
}
# Motions (no resolution number) that award or pay a named private party
MOT = [
 # (id, date, mid, find-regex, kind, parties, custom title, note, amount)
 ('2023-03-21-fox', '2023-03-21', '366', r'Motion to approve to authorize Interim City Attorney John Herin and the Fox Rothschild', 'contract', ['Fox Rothschild LLP'], ('Authorized Fox Rothschild as substitute counsel for the city in the mayor-residency case', 'Autorizó a Fox Rothschild como abogados sustitutos de la ciudad en el caso de residencia del alcalde', 'Otorize Fox Rothschild kòm avoka ranplasman vil la nan ka rezidans majistra a'), 'Mayor DeFillipo off the dais.', None),
 ('2023-04-18-pizzi', '2023-04-18', '367', r'Motion to approve Interim City Attorney John Herin to engage Michael Pizzi', 'contract', ['Michael Pizzi'], ('Hired attorney Michael Pizzi as outside counsel to investigate past alleged misuse of city funds', 'Contrató al abogado Michael Pizzi para investigar el supuesto mal uso de fondos municipales', 'Te angaje avoka Michael Pizzi pou mennen ankèt sou move itilizasyon lajan vil la'), '', None),
 ('2023-08-15-brodsky', '2023-08-15', '372', r"Motion to approve to pay attorneys' fees to Brodsky", 'contract', ['Brodsky Fotiu-Wojtowicz, PLLC'], ('Paid $26,272.96 in attorney fees to Brodsky Fotiu-Wojtowicz for Commissioner Fleurimond\'s case', 'Pagó $26,272.96 en honorarios a Brodsky Fotiu-Wojtowicz por el caso del comisionado Fleurimond', 'Peye $26,272.96 frè avoka bay Brodsky Fotiu-Wojtowicz pou ka komisyonè Fleurimond'), 'Commissioner Joseph recused and left the dais.', '$26,272.96'),
 ('2023-10-17-deans', '2023-10-17', '376', r'Motion to approve the 4:00am-6:00am extension of hours', 'license', ["Platinum South Inc. (Dean's Gold)"], ("Approved 4-6 a.m. extended hours for Dean's Gold", "Aprobó el horario extendido de 4 a 6 a.m. para Dean's Gold", "Apwouve lè pwolonje 4-6 a.m. pou Dean's Gold"), 'Alan Rosenthal represented the business. The roll call lists Jean "Yes" but the minutes state the motion passed 5-1 with Jean opposed; her vote is shown as not given.', None),
 ('2023-10-17-ferraro', '2023-10-17', '376', r'Motion to approve authorization to engage the Ferraro Law Firm', 'contract', ['The Ferraro Law Firm'], ('Hired the Ferraro Law Firm to represent the city in PFAS litigation', 'Contrató a Ferraro Law Firm para representar a la ciudad en el litigio sobre PFAS', 'Te angaje Ferraro Law Firm pou reprezante vil la nan pwosè PFAS'), '', None),
 ('2024-01-16-g5ive', '2024-01-16', '380', r'Motion to approve the request made by Commissioner Joseph, seconded by\s+Commissioner\s+Chernoff', 'license', ['G5ive'], ('Renewed 4-6 a.m. liquor hours for G5ive at 337 NW 170 St', 'Renovó el horario de licor de 4 a 6 a.m. para G5ive en 337 NW 170 St', 'Renouvle lè likè 4-6 a.m. pou G5ive nan 337 NW 170 St'), '', None),
 ('2024-02-20-donation', '2024-02-20', '382', r'Motion to approve a charitable donation of \$10,000', 'grant', ['Humane Society of Greater Miami', 'Ancient Spanish Monastery Foundation'], ('Gave $10,000 split between the Humane Society of Greater Miami and the Ancient Spanish Monastery', 'Donó $10,000 repartidos entre la Humane Society of Greater Miami y el Ancient Spanish Monastery', 'Bay $10,000 separe ant Humane Society of Greater Miami ak Ancient Spanish Monastery'), '', '$10,000'),
 ('2024-03-19-brodsky', '2024-03-19', '385', r'Motion to approve the payment made by Commissioner Fleurimond', 'contract', ['Brodsky Fotiu-Wojtowicz, PLLC'], ("Paid $47,593.87 in attorney fees to Brodsky Fotiu-Wojtowicz for Commissioner Joseph's case", 'Pagó $47,593.87 en honorarios a Brodsky Fotiu-Wojtowicz por el caso del comisionado Joseph', 'Peye $47,593.87 frè avoka bay Brodsky Fotiu-Wojtowicz pou ka komisyonè Joseph'), 'Commissioner Joseph off the dais; he filed Form 8B (voting conflict).', '$47,593.87'),
 ('2024-03-19-nabors', '2024-03-19', '385', r'Nabors, Giblin, and Nickerson[\s\S]{0,300}?Motion to approve the authorization made by', 'contract', ['Nabors, Giblin & Nickerson, P.A.'], ('Hired Nabors, Giblin & Nickerson (Valerie Vicente) to negotiate the next City Attorney contract', 'Contrató a Nabors, Giblin & Nickerson (Valerie Vicente) para negociar el contrato del próximo abogado municipal', 'Te angaje Nabors, Giblin & Nickerson (Valerie Vicente) pou negosye kontra pwochen avoka vil la'), '', None),
 ('2024-05-21-ross', '2024-05-21', '389', r'Motion to approve to authorize payment for services provided by Evan Ross', 'contract', ['Evan Ross (public relations firm)'], ("Paid Evan Ross's public relations firm for May and kept it for June at the same cost", 'Pagó a la firma de relaciones públicas de Evan Ross por mayo y la mantuvo en junio al mismo costo', 'Peye konpayi relasyon piblik Evan Ross pou me epi kenbe l pou jen menm pri'), 'Related Task Order R2024-59 (Public Communicators Group) was deferred.', None),
 ('2024-08-27-g5ive', '2024-08-27', '400', r'Motion to approve the Business Tax Receipt made by', 'license', ['G5ive (Taboo Miami)'], ('Approved 4-6 a.m. alcohol service for G5ive (Taboo Miami) at 337 NW 170 St', 'Aprobó servicio de alcohol de 4 a 6 a.m. para G5ive (Taboo Miami) en 337 NW 170 St', 'Apwouve sèvis alkòl 4-6 a.m. pou G5ive (Taboo Miami) nan 337 NW 170 St'), 'Shemara Todd and Noel Johnson appeared on behalf of the establishment.', None),
 ('2024-09-10-chamber', '2024-09-10', '402', r'Motion to approve funding \$30,000 in the budget to the Chamber of Commerce', 'grant', ['North Miami Beach Chamber of Commerce'], ('Budgeted $30,000 for the North Miami Beach Chamber of Commerce, with a financial review', 'Presupuestó $30,000 para la Cámara de Comercio de North Miami Beach, con una revisión financiera', 'Mete $30,000 nan bidjè pou Chanm Komès North Miami Beach, ak yon revizyon finansye'), 'Mayor Piper recused (Chamber affiliation).', '$30,000'),
 ('2024-12-17-brunson', '2024-12-17', '410', r'Motion to approve an engagement agreement with the Anthony Brunson firm', 'contract', ['Anthony Brunson P.A.'], ('Rejected hiring the Anthony Brunson firm as external auditor', 'Rechazó contratar a la firma Anthony Brunson como auditor externo', 'Rejte angaje konpayi Anthony Brunson kòm oditè ekstèn'), 'Tony Brunson appeared for the firm.', None),
 ('2024-12-17-marcum', '2024-12-17', '410', r'Motion to approve an engagement agreement with the Marcum firm', 'contract', ['Marcum, LLP'], ('Hired Marcum, LLP as external auditor', 'Contrató a Marcum, LLP como auditor externo', 'Te angaje Marcum, LLP kòm oditè ekstèn'), 'Mo Ariza represented Marcum. Follows the failed vote on R2024-124.', None),
]
DROP = {
 '2024-12-17|R2024-134': 'Jackson North Medical Center right-of-way vacation (Public Health Trust, a county body)',
 '2023-10-17|2023-59': 'partnership with CareerSource South Florida (public workforce board)',
 '2023-09-19|R2023-77': 'deferred at this meeting (Prokel trolley extension); approved as R2023-102 on Oct 17, 2023',
 '2024-03-19|R2024-39': 'tabled 4-3 (Chen Moore trolley route study task order)',
 '2024-05-21|R2024-59': 'deferred (Public Communicators Group task order)',
 '2023-12-19|R2023-119': 'tabled 5-2; approved Jan 16, 2024',
 '2023-08-15|2023-59': 'pulled from consent; approved Oct 17, 2023',
 '2023-03-21|R2023-15': 'pulled from the consent agenda and not acted on at this meeting (Country Bill\'s change order); no later approval found in the minutes',
 '2024-09-17|2024-12': 'first reading (second reading Oct 15, 2024 is the action)',
 '2024-06-27|R2024-74': 'settlement with the City of Miami Gardens (government party)',
 '2024-02-20|R2024-33': 'Washington Park site plan (city project; no private applicant)',
}
NOCONS = {'2023-04-18|R2023-19', '2023-04-18|R2023-24'}
ORD = {'2024-10', '2024-12'}
EXTRA = {'2023-03-21|R2023-25': '2023-03-21|R2023-2S', '2023-03-21|R2023-01': '2023-03-21|R2023-0l'}
def nk(c): return '%s|%s' % (c['date'], c['no'])
KMAP = {}
for c in K:
    KMAP[nk(c)] = c
for a, b in EXTRA.items():
    if b in KMAP: KMAP[a] = KMAP.pop(b)
# items recovered from cand.json (dropped by nmb_keep for no auto-parsed party, or segmented under a stray number)
for c in C:
    k = nk(c)
    if k in S and (k not in KMAP or not KMAP[k].get('result')): KMAP[k] = c
def money(a):
    if a is None: return None
    return '${:,.0f}'.format(a) if float(a).is_integer() else '${:,.2f}'.format(a)
acts, tr, gaps_extra, used = [], {}, [], set()
def presence(mid): return present(load(mid))[0]
for k in sorted(S):
    if k in DROP: continue
    c = KMAP.get(k)
    if not c: raise SystemExit('no candidate for ' + k)
    used.add(k)
    kind, tpl, ps, amt, subj, x, cust, note = S[k]
    mid = c['mid']; pres = presence(mid)
    no = c['no'].replace('0l', '01').replace('2S', '25')
    if not no.startswith('R') and no not in ORD: no = 'R' + no
    r = verify(mid, c['no'], pres) if True or k in ('2023-04-18|R2023-24', '2023-10-17|2023-59', '2023-10-17|R2023-101', '2024-04-16|R2024-49', '2024-05-21|R2024-60', '2024-05-21|R2024-61') else None
    nc = next_consent(mid, c['no']) if not r and k not in NOCONS else None
    if r:
        roll, res, mv, sc, raw, how = r; consent = False
    elif nc and nc[2]:
        mv, sc, raw = nc; roll, res, how = parse_vote(raw, pres); consent = True
    else:
        roll, res, mv, sc, how = c['roll'], c['result'], c['mover'], c['second'], c['how']; consent = bool(c['consent'])
        if consent:
            m = re.search(r'made by ([^,]+), seconded by ([^.]+)\.', c['vote'] or '')
            if m:
                from nmb_votes import who
                a1, a2 = who(m.group(1)), who(m.group(2)); mv = a1[0] if a1 else mv; sc = a2[0] if a2 else sc
    if k == '2024-10-15|2024-12': mv, sc = 'Smith', 'Smukler'  # minutes print 'Ordinance 2014-12'
    if not roll: raise SystemExit('no roll ' + k)
    en, es, ht = cust if cust else title(tpl, ps, amt, subj, x)
    y = sum(v == 'yes' for v in roll.values()); n = sum(v == 'no' for v in roll.values())
    unk = any(v == 'unknown' for v in roll.values())
    typ = 'Ordinance' if not no.startswith('R') else 'Resolution'
    aid = ('ord-' + no) if typ == 'Ordinance' else no
    if k == '2024-12-17|R2024-124': res = 'failed'
    nts = [note] if note else []
    if 'voice' in (how or ''): nts.append('Voice vote; roll built from the stated tally and attendance.' if not unk else 'Voice vote; the stated tally does not match attendance, so individual votes are not given.')
    a = {'id': aid, 'date': c['date'], 'ref': ('Consent agenda' if consent else ('Quasi-judicial' if kind == 'zoning' else 'Legislation')) + ' (%s %s)' % (typ, no),
         'title': en, 'kind': kind, 'parties': ps, 'amount': money(amt) if isinstance(amt, (int, float)) else amt,
         'url': MURL % mid, 'roll': roll, 'tally': None if unk else '%d-%d' % (y, n), 'mover': mv, 'second': sc,
         'consent': consent, 'result': res, 'notes': ' '.join(nts), 'tenure': True}
    acts.append(a); tr[aid] = {'en': en, 'es': es, 'ht': ht}
for (aid, date, mid, rx, kind, ps, cust, note, amt) in MOT:
    t = re.sub(r'[ \t]+', ' ', load(mid).replace('\f', '\n'))
    m = re.search(rx, t)
    if not m: raise SystemExit('motion not found ' + aid)
    seg = re.sub(r'\s+', ' ', t[m.start():m.start() + 900])
    mm = re.search(r'made by\s+((?:Acting\s+|Vice\s+)?(?:Mayor|Commissioner)\s+[A-Z][A-Za-z\'-]+)\s*,?\s*(?:and\s+)?seconded by\s+((?:Acting\s+|Vice\s+)?(?:Mayor|Commissioner)\s+[A-Z][A-Za-z\'-]+)', seg) or re.search(r'by\s+((?:Acting\s+|Vice\s+)?(?:Mayor|Commissioner)\s+[A-Z][A-Za-z\'-]+)\s*,?\s*seconded by\s+((?:Acting\s+|Vice\s+)?(?:Mayor|Commissioner)\s+[A-Z][A-Za-z\'-]+)', seg)
    v = re.search(r'(?:(?:Voice|Ro\s?l\s?l\s?Call)\s*Vote:?.{0,300}?)?MO[TI]+ON\s+(?:PASSED|FAILED).{0,200}', seg, re.I)
    pres = presence(mid)
    roll, res, how = parse_vote(re.sub(r'\s+', ' ', v.group(0)), pres)
    from nmb_votes import who
    mv = who(mm.group(1))[0] if mm else None; sc = who(mm.group(2))[0] if mm else None
    if aid == '2023-10-17-deans': roll = dict(roll, Jean='unknown')  # record contradicts itself; see card-notes.json
    if aid == '2024-09-10-chamber': roll = dict(roll, Piper='recused')
    if aid == '2023-08-15-brodsky': roll = dict(roll, Joseph='recused')
    if aid == '2024-03-19-brodsky': roll = dict(roll, Joseph='recused')
    y = sum(x == 'yes' for x in roll.values()); n = sum(x == 'no' for x in roll.values()); unk = any(x == 'unknown' for x in roll.values())
    if aid == '2023-10-17-deans': y, n, unk = 5, 1, False  # stated result
    nts = [note] if note else []
    if 'voice' in how: nts.append('Voice vote; roll built from the stated tally and attendance.')
    en, es, ht = cust
    acts.append({'id': aid, 'date': date, 'ref': 'Motion (no resolution number)', 'title': en, 'kind': kind, 'parties': ps, 'amount': amt,
                 'url': MURL % mid, 'roll': roll, 'tally': None if unk else '%d-%d' % (y, n), 'mover': mv, 'second': sc,
                 'consent': False, 'result': res, 'notes': ' '.join(nts), 'tenure': True})
    tr[aid] = {'en': en, 'es': es, 'ht': ht}
acts.sort(key=lambda a: (a['date'], a['id']))
# meetings: every minutes document read, Nov 22 2022 .. Dec 31 2024
NAMES = {'363': 'Regular', '364': 'Regular (no quorum)', '365': 'Regular (no quorum)', '374': 'Budget hearing', '375': 'Budget hearing', '378': 'Regular (no quorum)', '381': 'Commission conference', '383': 'Special (City Attorney selection)', '384': 'Commission conference', '386': 'Commission conference', '388': 'Commission conference', '390': 'Special', '391': 'Commission conference', '393': 'Commission conference', '396': 'Workshop', '397': 'Special', '398': 'Pre-budget workshop', '399': 'Commission conference', '401': 'Special', '402': 'Budget hearing', '403': 'Commission conference', '405': 'Budget hearing', '412': 'Commission conference', '413': 'Special', '414': 'Special', '435': 'Swearing-in ceremony', '436': 'Workshop'}
meet = []
for k2, v in sorted(SEG.items(), key=lambda x: x[1]['date']):
    if not ('2022-11-22' <= v['date'] <= '2024-12-31'): continue
    meet.append({'date': v['date'], 'name': NAMES.get(k2, 'Regular'), 'url': MURL % k2, 'read': True})
meet.append({'date': '2023-09-13', 'name': 'Budget hearing', 'url': MURL % '374', 'read': True}); meet.sort(key=lambda m: m['date'])
gaps = [
 {'issue': 'Chernoff won the Group 2 seat in the Nov 22, 2022 runoff and Smith the Group 6 seat on Nov 8, 2022; the first commission meeting with minutes after that is Dec 20, 2022. Minutes for Jan 17, Feb 21 and Nov 14, 2023 record no quorum and no business.'},
 {'issue': 'Minutes are scanned PDFs for most 2023-2024 meetings; text read by OCR and checked against page images where the record was ambiguous. Vendor spellings follow the resolution titles.'},
 {'issue': 'Left out because the record names no private beneficiary: RFP rankings that only authorize negotiating with the top-ranked firm (R2023-10, R2023-22 insurance brokerage; R2023-17 SCADA design-build; R2023-26 Oleta River crossing; R2024-47 City Attorney ranking; R2024-86 financial support services; R2024-87 holiday lighting; R2024-89 lobbying services; R2024-123 Washington Park pump station), cooperative/multi-vendor piggybacks (R2022-161 tires, R2022-165 OEM parts, R2023-09 hoses, R2023-90 IT cooperative contracts, R2024-14 OEM parts, R2024-38 executive search, R2024-100 body armor), R2023-113 economic development plan and R2024-20 strategic plan (Florida International University, a public university), R2024-55 Norwood plant direct materials (no vendor named), R2024-118 Washington Park bonds (no underwriter named), and motions to hire unnamed outside counsel (Jan 16 and Oct 15, 2024) or pay unnamed legal fees ($5,000, May 21, 2024).'},
 {'issue': 'Not counted: R2024-74 settlement with the City of Miami Gardens and R2024-106 funding it (government party); interlocal agreements and grants with Miami-Dade County, the State and FIU; R2024-134 Jackson North Medical Center right-of-way vacation (Public Health Trust); Resolution 2023-59 partnership with CareerSource South Florida (public workforce board); R2023-15 (Country Bill\'s $250,000 change order) was pulled from the Mar 21, 2023 consent agenda and no vote on it appears in the minutes.'},
 {'issue': 'Deferred or tabled, so not listed on that date: R2023-77 (deferred Sept 19, 2023; approved as R2023-102), R2024-39 Chen Moore task order (tabled Mar 19, 2024), R2024-59 Public Communicators task order (deferred May 21, 2024), R2023-119 May NMB (tabled Dec 19, 2023, 5-2 with Chernoff and Smith opposed; approved Jan 16, 2024).'},
 {'issue': 'Dean\'s Gold extended hours (Oct 17, 2023): the roll call lists all six members "Yes" but the minutes state "MOTION PASSED 5-1 with Commissioner Jean opposed"; her vote is shown as unknown (see the card note).'},
]
out = {'window_from': '2022-11-22', 'actions': acts, 'meetings': meet, 'gaps': gaps, 'translations': tr}
dest = os.path.join(REPO, 'scripts/data/city/nmb/tenure'); os.makedirs(dest, exist_ok=True)
json.dump(out, open(os.path.join(dest, 'actions.json'), 'w'), ensure_ascii=False, indent=1)
import collections
print(len(acts), 'actions', collections.Counter(a['date'][:4] for a in acts), 'unknown', sum(1 for a in acts if any(v == 'unknown' for v in a['roll'].values())), 'meetings', len(meet))
