"""Write scripts/data/city/nmb/owners.json: owner of record (Miami-Dade Property Appraiser, sales history as of the vote)
for tenure-era NMB land-use actions that name an address. Folio lookups were made 2026-10-25 (tools/pa.py)."""
import json, os, sys
REPO = sys.argv[1]
PA = 'https://apps.miamidadepa.gov/PApublicServiceProxy/PaServicesProxy.ashx?Operation=GetPropertySearchByFolio&clientAppName=PropertySearch&folioNumber='
# id: (address, folio, owner as of the vote, applicant named in the record or registry, note)
O = {
 'R2022-168': ('2261 NE 164 St', '07-2216-026-0010', 'BH SG LLC', 'BH-SG Owner LLC', 'Owner at the vote: BH SG LLC (bought 8/12/2022 from CK Prive Group 164 LLC); sold 5/5/2026 to Decker Center Miami LLC. Applicant per the 2023 lobbyist registration (Bercow, Amster).'),
 'R2022-169': ('15801-15807 Biscayne Blvd', '07-2216-035-0010', 'Biscayne 18 Dev LLC', None, 'No sale since 2005; current owner was owner at the vote.'),
 'R2022-68': ('2811 NE 164 St', '07-2215-007-0010', 'Mark A. Antonio and Ana B. Antonio', 'Mark and Ana Antonio', 'Owners named in the resolution.'),
 'R2023-68': ('16651 NE 18 Ave', '07-2216-001-0010', 'Prestige Boardwalk LLC', 'Prestige Boardwalk LLC', 'Owner since 4/17/2018.'),
 'R2023-86': ('16651 NE 18 Ave (alley south of NE 167 St)', '07-2216-001-0010', 'Prestige Boardwalk LLC', 'Prestige Boardwalk LLC', 'Alley abuts the Prestige Boardwalk site.'),
 'R2023-69': ('853 NE 164 St', '07-2218-011-0220', 'Joseph Feder', None, 'Owner since 2/14/2022 (later transfers to himself).'),
 'R2023-85': ('1700 NE 164 St', None, None, '1700 NE 164 Associates, LLC', 'Address not found in the Property Appraiser search; applicant from the 2023 lobbyist registration (development approvals at the SE corner of NE 17 Ave and NE 164 St).'),
 'R2023-103': ('1998-2065 NE 161 St and 2051 NE 160 St', '07-2216-012-0650', 'Lanaar Properties LLC', 'Lanaar Properties LLC', 'Lanaar Properties LLC bought 2000 NE 161 St on 10/26/2022; transferred to Lanaar Elementary School Inc on 5/16/2025.'),
 'R2023-104': ('17100 NE 19 Ave', '07-2209-004-2670', '17100 Property Holdings LLC', 'Univida Medical Center', 'Owner since 3/23/2021.'),
 'R2023-105': ('1699-1755 NE 167 St', '07-2217-003-0090', 'PPG ARK Equishares Owner LLC', 'PPG ARK Equishares Owner LLC', 'Bought from Dezer NMB Campus LLC on 4/18/2022 (former Nova Southeastern campus).'),
 'R2023-120': ('1800 NE 168 St', '07-2209-042-0010', '1800 NE 168th Street LLC', 'Citadel Care Centers', 'Current owner (no sales listed on the folio).'),
 'R2023-121': ('73 NW 167 St', '07-2113-007-2170', 'NAL Property Investments LLC', 'Bullish International (B-side Liquors)', 'Owner since 6/6/2022.'),
 'R2023-119': ('16385-16445 W Dixie Hwy and 2255 NE 164 St', '07-2216-032-0010', '2255 Land Associates LLC; Laurenzo Bros Property LLC (16385 W Dixie Hwy, folio 07-2216-003-0010)', 'May NMB LLC', 'Both owners since 12/21/2012. Applicant per the 2023/2024 lobbyist registrations.'),
 'R2024-32': ('16950 NE 17 Ave', '07-2208-002-1880', 'Luis Zolezzi', None, ''),
 'R2024-69': ('14585 Biscayne Blvd', '07-2221-030-0010', 'Oleta Partners Biscayne', 'At Home store', 'Current owner of record; sales history not checked.'),
 'R2024-72': ('16385 Biscayne Blvd CU-1', '07-2216-042-0055', 'Legacy at Harbour Inc.', 'Howl Nation', 'Commercial unit owner since 7/3/2019.'),
 'R2024-70': ('15530-15780 W Dixie Hwy', '07-2216-018-0040', 'North Towne Phase I, LLC', 'North Towne Phase I, LLC', 'Bought from New North Equities LLC on 3/14/2022 (c/o AHS Residential).'),
 'R2024-71': ('15530 and 15540 W Dixie Hwy', '07-2216-018-0040', 'North Towne Phase I, LLC', 'North Towne Phase I, LLC', 'Applicant named in the resolution.'),
 'ord-2024-10': ('15530-15780 W Dixie Hwy', '07-2216-018-0040', 'North Towne Phase I, LLC', 'North Towne Phase I, LLC', ''),
 'R2024-78': ('1973-1991 NE 163 St', '07-2216-001-0730', 'Elevate 163 North Miami Beach LLC', 'Elevate 163 North Miami Beach LLC', 'Bought 7/31/2023 from Pina Investments LLC; sold 1/26/2026 to Alturia North Miami Beach Asset LLC.'),
 'R2024-91': ('105 NE 167 St', '07-2113-007-1510', 'Food Group Investments LLC', 'La Granja', 'Owner since 9/26/2013.'),
 'R2024-102': ('1400 NE 171 St', '07-2208-006-0620', 'World Class Properties Investments LLC', 'World Class Properties Investments LLC', 'Owner since 10/19/2020.'),
 'R2024-103': ('3380 NE 170 St', '07-2210-001-1510', 'Jacob Koby Ohayon', None, 'Owner since 10/7/2022.'),
 'ord-2024-12': ('17031 and 17051 NE 20 Ave', '07-2209-006-0503', 'The Offices of NMB LLC', 'The Offices of NMB LLC', 'Bought 5/31/2024 from San Francisco Group of Fla LLC.'),
 'R2024-116': ('17450 Biscayne Blvd', '07-2209-009-0090', 'MTV 55 LLC', None, 'Owner since 5/18/2023 (from MTV Biscayne LLC).'),
 'R2024-117': ('1981 NE 153 St', '07-2216-019-0090', 'JME Holdings LLC', 'Feldman House', 'Owner since 8/2021.'),
 'R2024-131': ('16955-17071 W Dixie Hwy', '07-2209-002-0010', 'TRG NMB 5Park LLC', 'Trinsic Acquisition Company LLC', 'The plat folios (07-2209-002-0010 etc.) now carry the 5 Park condominium; TRG NMB 5Park LLC bought the parcels 3/28/2022. Applicant per the 2024 lobbyist registration (Aura North Miami Beach).'),
}
out = {'checked': '2026-10-25',
       'sources': ['Miami-Dade Property Appraiser public service proxy (GetAddress / GetPropertySearchByFolio): https://apps.miamidadepa.gov/PApublicServiceProxy/PaServicesProxy.ashx',
                   'NMB Registered Lobbyist Lists 2023 and 2024 (principals named as applicants)', 'NMB minutes (NovusAgenda) for applicants named on the record'],
       'note': 'Owner of record for tenure-era (Dec 2022 - Dec 2024) land-use items. Where the parcel was sold after the vote, the owner shown is the grantee of the last sale before the vote.',
       'byAction': {}}
for k, (addr, folio, owner, appl, note) in O.items():
    out['byAction'][k] = {'address': addr, 'folio': folio, 'owner': owner, 'ownerSrc': (PA + folio.replace('-', '')) if folio else None,
                          'officers': None, 'sunbizSrc': None, 'applicant': appl, 'note': note}
p = os.path.join(REPO, 'scripts/data/city/nmb/owners.json')
json.dump(out, open(p, 'w'), ensure_ascii=False, indent=1); open(p, 'a').write('\n')
print(len(out['byAction']))
