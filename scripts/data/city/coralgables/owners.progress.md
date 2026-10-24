# Coral Gables owner tracing progress

Access: shell cannot reach PA/Sunbiz (proxy 403). WebFetch works for:
- PA address search: https://apps.miamidadepa.gov/PApublicServiceProxy/PaServicesProxy.ashx?Operation=GetAddress&clientAppName=PropertySearch&myUnit=&from=1&myAddress=<ADDR>&to=200
- PA folio detail (owner, mailing, sales): ...?Operation=GetPropertySearchByFolio&clientAppName=PropertySearch&folioNumber=<13-digit folio>
- Sunbiz search: https://search.sunbiz.org/Inquiry/CorporationSearch/SearchResults?inquiryType=EntityName&searchTerm=<NAME>

## Done
- 24-8230 1414 Galiano St: folio 03-4108-009-3310. Owner at action date (2025-01-14): CREH GALIANO LLC (bought 2/3/2023, sold 7/2/2026 to LUCKY START SOUTH LLC). Sunbiz CREH GALIANO LLC M23000001403 (inactive) - officers pending.
- CREH GALIANO LLC (M23000001403, foreign, filed 2/1/2023, withdrawn 7/31/2026): P Danielle Gonzalez, VP Todd Rubinstein, both 6400 Granada Blvd Coral Gables; principal c/o Greenberg Traurig 333 SE 2nd Ave Ste 4400. Detail URL format that works: SearchResultDetail?inquirytype=DocumentNumber&directionType=Initial&searchNameOrder=<DOC>0&aggregateId=<aggId>&searchTerm=<DOC>
## PA current owners (GetAddress; current, not yet date-checked)
- 950 University Dr 03-4118-005-2080 GRANADA CONT PRESB CHURCH INC
- 545-551 Menendez Ave: not found in PA (street listing shows 501-541 only)
- 1531 Liguria 03-4130-002-0961 CLVEN GAMMA THETA LLC
- 3247 Riviera Dr 03-4118-005-0310 JASON D HERTZBERG TRS / JASON D HERTZBERG TRUST
- 5877 Ponce 03-4130-009-0170 WINDSOR INVESTMENTS / 5877 PONCE DE LEON LLC
- 12850 SW 57 Ave (Pinecrest) 20-5013-008-0031 John & Graciela Crespo
- 6901 Trionfo 03-4130-008-0260 Sergey Koteinikov / Anna Andreeva
- 4311 Ponce 03-4120-017-1240 4225 PONCE VENTURES LLC
- 4125 Santa Maria 03-4119-001-4310 CLAUDIO R ALVAREZ TRS / CNC I TRUST
- 1154 Alfonso 03-4130-008-0430 Alvaro Gazzolo / Gillian Gaggero Gazzolo
- 717 N Greenway 03-4108-001-4040 Laurence Christian Marlin / Kathy Ann Webb Marlin
- 627 Anastasia 03-4117-008-5210, 635 Anastasia 03-4117-008-5220 THE TERRACES AT ANASTASIA LLC
- 275 Giralda 6A 03-4108-131-0080, 6B 03-4108-131-0090 ROBERT A PARRA TRS / ROBERT A PARRA REVOCABLE TRUST
- 1258 Obispo 03-4107-016-0260 Javier Avila / Jennifer Ruiz
- 1101 Stanford 03-4130-015-0070 UNIVERSITY OF MIAMI (1350 Miller Rd 03-4130-015-0050 also UM)
- 1530 Liguria 03-4130-002-0992 ZBTNH ALPHA OMEGA LLC
- 1231 Dickinson -> PA returns 03-4130-015-0020 UNIVERSITY OF MIAMI (site 5665 Ponce)
- 905 Hardee 03-4129-026-1461 Miguel Diaz De La Portilla / Elinette Ruiz Diaz De La Portilla
- 110 Phoenetia 03-4108-009-1840 PHOENETIA ACQUISITION LLC
- 5851 San Amaro: not found
- 6100 Caballero 03-4130-006-0290 GABLES WATERWAY OWNER LLC
- 1155 Blue Rd 03-4119-002-0010 RIVIERA COUNTRY CLUB OF C GABLES
- 1250 S Dixie: PA server error
- 722 Aledo 03-4117-004-1770 SOUTHERN OASIS PROPERTY LLC
- 720 Madeira 03-4108-002-0770 CHARLES L BYNUM
- 2701 Indian Mound Trl 03-4118-002-0450 EDW A MCCARTHY-ARCHBISHOP
- 320 Giralda: not found
## Sales-history (owner at action date) checks
- 1531 Liguria: RPG MIAMI LLC owned 10/2021-2/16/2026 (then Alpha Sigma Phi Fraternity Inc, then CLVEN GAMMA THETA LLC 3/4/2026) -> action 2025-05-20 owner RPG MIAMI LLC
- 5877 Ponce: Windsor Investments / 5877 Ponce de Leon LLC since 3/25/2015; mail 117 Aragon Ave
- 4311 Ponce: 4225 PONCE VENTURES LLC since 2/11/2022; mail 8950 SW 74 Ct Ste 1808
- 627/635 Anastasia: Terraces at Anastasia LLC since 7/11/2025; mail 3750 S Dixie Hwy PH
- 1530 Liguria: ZBTNH Alpha Omega LLC since 3/22/2021; mail Indianapolis
- 110 Phoenetia: CENTURY CRYSTAL GROUP LLC 11/8/2021-4/6/2026 -> owner on 2026-02-10; PHOENETIA ACQUISITION LLC after
- 6901 Trionfo: Koteinikov/Andreeva since 2015
- 1154 Alfonso: Gazzolo since 1999 (life estates 2021)
- 1258 Obispo: Avila/Ruiz since 10/2021
- 6100 Caballero: GABLES WATERWAY OWNER LLC since 5/24/2025; mail 1300 Brickell Ave
- 722 Aledo: Brian Goldmeier / Nicole Gomez Goldmeier 8/2022-6/8/2026 -> owner on 2026-06-02
- 3247 Riviera: Hertzberg since 2021
- 4125 Santa Maria: Claudio R Alvarez Trs / CNC I Trust since 2016; mail 1205 SW 37 Ave 300
- 717 N Greenway: Marlin since 2018
- 275 Giralda 6A: Jacqueline Anne Julio Trust 2/2022-11/19/2025 -> owner on 2025-10-28
- 905 Hardee: Diaz de la Portilla since 2018
- 720 Madeira: Charles L Bynum since 4/15/2026 (prior 720 Madeira Holdings LLC 8/2024-4/2026)
- 12850 SW 57 Ave: Crespo since 8/2021
- 1250 S Dixie 03-4130-004-0010 UNIVERSITY SHOPPING CENTER LLP since 3/2015; mail 2875 NE 191 St 605 Aventura
- 1150 S Dixie 03-4130-000-0025 PS EP 25 LLC; 1320 S Dixie 03-4130-004-0020 UNIVERSITY OF MIAMI; 1190/1350 S Dixie PA errors
- 950 University: Granada Continental Presbyterian Church Inc (no sales)
## Packet/Legistar (gateway page https://coralgables.legistar.com/gateway.aspx?M=L&ID=<matterId> gives body text + View.ashx attachment links that WebFetch can read; legistar1.com attachment links are robots-blocked)
- 24-8230 gateway: no owner named; lobbyist Mario Garcia-Serra; passed Res 2025-12
- 24-8339 gateway: no applicant named; lobbyists Tucker Gibbs, Wayne Pathman
- 25-8782 (950 University): letter of agreement by Compeling Solutions, Inc. (12/13/2024); attachment "Granada Church - Letter of Agreement"
- 25-8946 (545-547 Menendez) & 25-8948 (549-551): applicant Riviera Gables, LLC, 301 Almeria Ave #330; letter signed Jenny Ducret
- 25-8950 (1531 Liguria): applicant University of Miami ("privately owned fraternity house")
- 25-8967: applicant/owner Jason D. Hertzberg Trust
- 25-8974: applicant Empire Engineering Service Corp. for owner Windsor Investments LLC
- 25-8976: applicant Carlab Engineering, Inc. for owners John and Graciela Crespo
- 25-9293: no names; Res 2025-240
- 25-9355: no names; Exhibit B applicant letter of intent
- 25-9465: no names; lobbyist Laura Russo
- CG Sunbiz: RPG MIAMI LLC M22000013352 MGR RPG Managment LLC (Indianapolis); 4225 PONCE VENTURES LLC L21000459393 MGR 4225 Ponce Manager LLC -> AMBR Constellation Real Estate LLC, 95 Merrick Way Ste 518; TERRACES AT ANASTASIA L25000288978 MGRs Jorge L Lopez, Daniel J Lopez; CENTURY CRYSTAL GROUP L21000271150 MGRs Tatiana Pino, Ricardo Caporal, Nicolas Jaramillo; WINDSOR INVESTMENTS (5877 PONCE DE LEON) LLC L15000046978 MGR Roland Digasbarro, 117 Aragon Ave
- 24-8230 Notice of Appeal (View.ashx ID=13658254): appellant CREH Galiano, LLC; attorney Mario Garcia-Serra, Gunster
- 24-8339 cover memo (ID=13686984): applicant City of Coral Gables Public Works Dept; abutting owners not named
- 25-9293 appeal application: names illegible/blank
- 25-9355 Exhibit B (ID=14323658): applicant 4225 Ponce Venture, LLC; LOI by Joe Jimenez, JMZ Group
- 25-9465 staff report (ID=14745646): applicants Alvaro Gazzolo & Gillian Gaggero-Gazzolo; architect Antonio E. Rodriguez, CAD Studio Architecture
- MatterIds: 25-9377=27974 25-9678=28275 25-8776=27375 25-9713=28310 25-9956=28553 25-9846=28443 25-9279=27876 25-9780=28377 25-1217=28814 25-1238=28835 25-1239=28836 26-1130=28993 26-1139=29002 26-1140=29003 26-1198=29061 26-1144=29007 26-1415=29278 24-7193=25806 26-1439=29302 26-1569=29435 26-1629=29495 26-1755=29620 26-1826=29691
- gateway results: 25-9377 none named; 25-9678 lobbyist Laura Russo only; 25-8776 none (attachment "MARLIN ARCHITECTURAL SET"); 25-9713 lobbyist Joe Jimenez, submittal ID=14878980; 25-9956 none; 25-9846 lobbyist Ceasar Mestre, LOI ID=14947959 (GUID 72415C5C-BAE8-4C1B-8B4B-7C14446D3D6C); presentation by CoterieCollective
- 25-1238 applicant/owner University of Miami; 25-1239 owner ZBT National Housing, applicant Great Minds Engineering; 25-1217 developer Cade Capital Partners; 25-9279 no names (staff report ID=15125019 GUID 5F5A9CF3-B25F-4031-B3E8-9225078653A9)
- 26-1130 applicant University of Miami; 26-1139 owner/applicant Mr. Diaz de la Portilla; 26-1140 lobbyist Jorge Navarro only; 26-1198 applicant University of Miami; 26-1144 lobbyist Garcia-Serra, "Property Owner Consent Letter"; 26-1415 owner The Riviera Country Club, agent David Plummer & Associates; 24-7193 lobbyist Laura Russo; 26-1439 lobbyist Joe Jimenez; 26-1569 none; 26-1629 none, Res 2026-162; 26-1755 owner Archdiocese of Miami, agent Kimley-Horn and Associates, Inc.; 26-1826 none; 25-9364 operator not named; 25-9780 City is proponent (city-owned)
- 25-9713 submittal: applicant/owner The Terraces at Anastasia, LLC; letter by Joe Jimenez, JMZ Group
- 25-9846 LOI: owners Javier Avila & Jennifer Ruiz; attorney Oscar A. De la Rosa, De la Rosa Law, P.A.; contractor bids Orion Electric, Bold Construction Specialties, Atlas Roofing, Atlas Construction Co, RCAT Appliances, DR Equipment, Red Fine Hardwood Floors
- 25-9279 PZB staff report: applicant City of Coral Gables; owners not named. PA: 1150 PS EP 25 LLC (bought 1/7/2026; prior Dennys Inc -> owner at 2026-01-27 PS EP 25 LLC), 1190 MARIPOSA PLAZA LLC 03-4130-000-0024, 1250 University Shopping Center LLP, 1320 University of Miami, 1350 1350 S DIXIE LLC 03-4130-004-0021
- 25-9293 cover memo: appellant Sergey Kotelnikov
- 26-1439 Regency Parc: 2701 Salzedo 03-4117-005-4010 REGENCY PARC LLC (Sunbiz L12000052146 MGR Codina Manager LLC, auth rep Armando Codina, 2020 Salzedo St 5th Fl)
- Sunbiz: Riviera Gables LLC L21000318094 MGR Jenny Ducret, 400 University Dr Ste 300; Southern Oasis L26000265113 MGR Sypria Limited (Nassau) - but owner at 6/2/2026 was Goldmeier; Constellation RE LLC L19000175532 MGR Eduardo I. Otaola; Gables Waterway Owner M25000006814 auth reps Edgardo DeFortuna, Nelson Stabile; 1350 S Dixie LLC M16000001596 AMBR 1350 S Dixie Mezz Borrower LLC; Mariposa Plaza M16000006599 MGR MT Mariposa Management LLC c/o FMC; Cade Capital Partners L15000104587 MGRs John Federico Marquez, Jose Antonio Vizcarrondo, Juan Maroso; ZBTNH Alpha Omega L21000033546 MGR ZBT National Housing Inc; 720 Madeira Holdings L24000287250 AMBR Venancio I Torre, Isabella Loret de Mola
- BDI / M.E.D. Expediters: no hit in any packet doc read; web search found nothing. Not a full-text search of all attachments.
## CG DONE with lookups; next: write owners.json, then North Miami
