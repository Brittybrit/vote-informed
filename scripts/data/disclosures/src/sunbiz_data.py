# Sunbiz rows, checked 2026-10-23 via search.sunbiz.org officer/RA search and entity detail pages.
# address: entity principal address, omitted ("(residential address omitted)") where it appears to be a home.
SB = "https://search.sunbiz.org/Inquiry/CorporationSearch/SearchResultDetail?inquirytype=EntityName&directionType=Initial&searchNameOrder=X&aggregateId="
M = "name and filed address match"
N = "name only"
RES = "(residential address omitted)"

def r(entity, doc, role, status, address, basis, agg):
    return {"entity": entity, "docNumber": doc, "role": role, "status": status, "address": address, "basis": basis, "url": SB + agg}

SUNBIZ = {
 "vince-c-lago": [
  r("VICENTE C. LAGO, P.A.", "P16000044173", "DPST (director, president, secretary, treasurer); registered agent", "ACTIVE (filed 2016-05-20; reinstated 2022-12-12; 2026 annual report filed 2026-03-26)", "5200 San Amaro Dr, Coral Gables, FL 33146", M, "domp-p16000044173-6f3d66c9-fa9e-4eac-8435-19c9d1eaeea0"),
  r("VT & C HOLDINGS LLC", "L21000272440", "MGR (with Teobaldo Rosell and Carlos Rosell)", "INACTIVE (filed 2021-06-10; voluntary dissolution 2026-02-17)", "7270 NW 12th St #200, Miami, FL 33126", M, "flal-l21000272440-58aed33d-1325-4d41-b848-5c434df5e7ce"),
  r("BDI HOLDINGS LLC", "L22000419512", "AMBR", "INACTIVE (filed 2022-09-27; admin dissolution 2023-09-22)", "7270 NW 12th St Unit 200, Miami, FL 33126", M, "flal-l22000419512-47c57d47-46df-4df1-9c11-84723ef40a01"),
  r("ALMERIA HOLDINGS LLC", "L26000527615", "MGR; registered agent", "ACTIVE (filed 2026-10-16)", "5200 San Amaro Dr, Coral Gables, FL 33146 (filed as 'Sam Amaro')", M, "flal-l26000527615-77a7a3fa-91ba-4ad0-b1ab-64db4066dd4c"),
  r("VE CONSTRUCTION & DESIGN CORP.", "P11000092130", "D; registered agent", "INACTIVE (filed 2011-10-20; admin dissolution 2012-09-28)", "5200 San Amaro Dr, Coral Gables, FL 33146", M, "domp-p11000092130-95afb429-e6db-4c10-bbaf-2f46436ed12c"),
  r("MCAT HOLDINGS RE LLC", "L25000532224", "MGR", "INACTIVE (filed 2025-12-03; admin dissolution 2026-09-25)", "520 San Amaro Drive, Coral Gables, FL 33146", N, "flal-l25000532224-ae3b93e3-627c-4a15-8089-8cdc7e26565c"),
  r("CAPITOL EQUITY LLC", "L21000007182", "MGR (listed as 'Lago, Vince')", "INACTIVE (filed 2021-01-08; admin dissolution 2022-09-23)", "362 Minorca Ave, Coral Gables, FL 33134", N, "flal-l21000007182-814b442b-249b-4b18-adac-48078a96ee2a"),
  r("GIRALDA GARAGE CONDOMINIUM ASSOCIATION, INC.", "N03000002314", "President and Director, ex officio (City-controlled association, c/o City of Coral Gables; also President/Director of 250 Aragon Condominium Association N06000013035 and Andalusia Garage Condominium Association N15000005998, same address)", "ACTIVE (2026 annual report filed)", "c/o City of Coral Gables, 405 Biltmore Way, Coral Gables, FL 33134", M, "domnp-n03000002314-73b2e458-4754-4a8f-b4c0-0aebc6824951"),
 ],
 "melissa-castro": [
  r("M.E.D. EXPEDITERS INC.", "P20000079108", "P (president); registered agent", "ACTIVE (filed 2020-10-01; 2026 annual report filed 2026-04-14)", "55 Merrick Way 214, Coral Gables, FL 33134", M, "domp-p20000079108-f10ef0d2-6b99-484e-8d89-a74ea9561611"),
  r("FLORIDA BUILDING CODE PRIVATE PROVIDER LLC", "L21000368228", "CEO; registered agent", "INACTIVE (filed 2021-08-17; admin dissolution 2023-09-22)", "55 Merrick Way 214, Coral Gables, FL 33134", M, "flal-l21000368228-5e8146c7-6d07-443c-9a8d-a6756f30e2ec"),
  r("GIRALDA GARAGE CONDOMINIUM ASSOCIATION, INC.", "N03000002314", "Director, ex officio (City-controlled association, c/o City of Coral Gables; also Director of 250 Aragon Condominium Association N06000013035 and Andalusia Garage Condominium Association N15000005998, same address)", "ACTIVE (2026 annual report filed)", "c/o City of Coral Gables, 405 Biltmore Way, Coral Gables, FL 33134", M, "domnp-n03000002314-73b2e458-4754-4a8f-b4c0-0aebc6824951"),
  r("MC SQUARED INVESTMENTS LLC", "L20000042047", "AMBR; registered agent", "ACTIVE (filed 2020-02-05; 2026 annual report filed 2026-04-10)", RES, N, "flal-l20000042047-80131390-e814-49b9-8e9b-40e09acfc474"),
  r("MELISSA CASTRO LLC", "L24000088157", "MGR; registered agent", "ACTIVE (filed 2024-02-19; reinstated 2026-01-24)", RES, N, "flal-l24000088157-75974cd5-fafe-454c-91cd-ea6700c319a3"),
 ],
 "maureen-porras": [
  r("IMMIGRATION DEFENSE BAR ASSOCIATION, INC.", "N21000006955", "D (director)", "ACTIVE (filed 2021-05-21; 2026 annual report filed 2026-04-29)", "2828 Coral Way, Suite 540, Miami, FL 33145", N, "domnp-n21000006955-d9a8615f-4ac0-4fcb-9615-35477e12243e"),
 ],
 "howard-s-weinberg": [
  r("HOWARD S. WEINBERG, P.A.", "P93000053912", "DPTS; registered agent", "ACTIVE (filed 1993-07-28; 2026 annual report filed 2026-02-12)", "3370 NE 190 St Suite 1414, Aventura, FL 33180", M, "domp-p93000053912-a9900bce-585f-48f7-806a-963ad4692511"),
  r("ASW3 LLC", "L23000313992", "MGR; registered agent", "ACTIVE (filed 2023-07-05; 2026 annual report filed 2026-02-12)", "3370 NE 190th St #1414, Aventura, FL 33180", M, "flal-l23000313992-e288969a-5412-477c-b621-2ecf28db2a19"),
 ],
 "mary-estime-irvin": [
  r("ESTIME & IRVIN CONSULTING, LLC", "L17000138889", "MGR; registered agent", "ACTIVE (filed 2017-06-27; reinstated 2026-01-22)", "155 NE 131 Street, North Miami, FL 33161", M, "flal-l17000138889-00a721ea-882c-4eb6-a535-5a4620f186d0"),
  r("THE ESTIME-IRVIN FOUNDATION, INC.", "N22000007310", "C (chair); registered agent", "ACTIVE (filed 2022-06-27; 2026 annual report filed 2026-03-02)", "12865 West Highway, North Miami, FL 33161", M, "domnp-n22000007310-064759eb-6905-446a-bab5-4eb8bd719398"),
  r("NORTH MIAMI FOUNDATION FOR SENIOR CITIZENS' SERVICES, INC.", "731483", "Director (officer address 155 NE 131 Street)", "ACTIVE (2026 annual report filed 2026-03-31)", "620 NE 127 Street, North Miami, FL 33161", M, "domnp-731483-7a628592-d17d-45df-ab40-5aabb9fdafe0"),
  r("FROM HAND 2 HAND, CORP", "P22000082312", "VP (listed as 'Estime, Mary', officer address 155 NE 131st St)", "INACTIVE (filed 2022-10-27; admin dissolution 2024-09-27)", "820 NE 125th St, North Miami, FL 33161", M, "domp-p22000082312-19ce22b3-3664-431b-a2cf-a661bc9c0049"),
 ],
 "kassandra-timothe": [
  r("ELEVATE YOUR BRAND LLC", "L19000194162", "MGR; registered agent", "ACTIVE (filed 2019-07-30; 2026 annual report filed 2026-05-18)", "950 NE 129 St, North Miami, FL 33161", M, "flal-l19000194162-34d8a3d5-4ff6-4196-94ef-b37c46be269e"),
  r("THE GREATER NORTH MIAMI CHAMBER OF COMMERCE, INC.", "N00623", "Director", "ACTIVE (2026 annual report filed 2026-08-13)", "13100 West Dixie Highway, North Miami, FL 33161", N, "domnp-n00623-a3798fe6-6ffc-42bb-a8ee-055f80389898"),
 ],
 "alix-desulme": [
  r("LEAD TO EXCEL USA, CORP.", "P22000079404", "P (president); registered agent", "ACTIVE (filed 2022-10-17; 2026 annual report filed 2026-04-08)", "12794 West Dixie Hwy, North Miami, FL 33161", M, "domp-p22000079404-86023357-0ba6-40ad-b86e-80a7f66938ce"),
  r("ENGAGE FLORIDA, INC.", "P20000093529", "P (president); registered agent", "ACTIVE (filed 2020-11-25; 2026 annual report filed 2026-04-08)", "12794 West Dixie Hwy, North Miami, FL 33161", M, "domp-p20000093529-678d537b-f960-4599-a967-ae78c79d0d46"),
  r("THE INTERNATIONAL ENGLISH INSTITUTE, INC.", "P18000043348", "P; registered agent", "INACTIVE (filed 2018-05-10; admin dissolution 2019-09-27)", "(residential address omitted; matches the North Miami property on his Form 1)", M, "domp-p18000043348-6ff421f0-134f-4a8b-809e-0f7d68e51bc5"),
 ],
 "steve-calle": [
  r("SOMI DEVELOPMENTS, LLC", "L18000225021", "MGR (with Sandy Calle); registered agent", "ACTIVE (filed 2018-09-21; 2026 annual report filed 2026-04-28)", "5765 SW 50th St, South Miami, FL 33155", M, "flal-l18000225021-9feb3d57-b131-46d8-bec5-1f9749d80eb8"),
  r("SOMI INVESTMENT GROUP, LLC", "L20000298695", "MGR; registered agent", "INACTIVE (filed 2020-09-22; pending reinstatement 2025-05-01)", "5765 SW 50 St, Miami, FL 33155", M, "flal-l20000298695-fa5b8961-1ded-4a4c-bd66-efa4272b599c"),
  r("555 CATALONIA, LLC", "L20000336325", "registered agent", "ACTIVE (filed 2020-10-22; 2026 annual report filed 2026-04-28)", "5765 SW 50 St, Miami, FL 33155", M, "flal-l20000336325-fddd8b6d-4bbe-4551-98d4-85b42358a209"),
  r("POPOCAL INVESTMENTS, LLC", "L23000224308", "MGR (with Sandy R. Calle); registered agent", "ACTIVE (filed 2023-05-05; 2026 annual report filed 2026-01-16)", "5765 SW 50 St, South Miami, FL 33155", M, "flal-l23000224308-9a652242-af4a-4884-9d80-c5d3255591b3"),
  r("5760 TOWNHOMES, LLC", "L25000238997", "MGR (with Sandy Calle); registered agent", "ACTIVE (filed 2025-05-20; 2026 annual report filed 2026-04-28)", "5765 SW 50 St, South Miami, FL 33155", M, "flal-l25000238997-5f7030ef-45dc-460c-b818-fe000f71209a"),
  r("BDI VIDA L.L.C.", "L25000321695", "registered agent (principal address is his business address; not on his Form 1)", "ACTIVE (filed 2025-07-14; 2026 annual report filed 2026-04-25)", "5765 SW 50 St, Miami, FL 33155", M, "flal-l25000321695-474d6ea9-f776-40ea-8508-57e0f4e0d369"),
  r("1216 SOROLLA, LLC", "L21000261594", "registered agent", "INACTIVE (filed 2021-06-04; voluntary dissolution 2026-02-12)", "5765 SW 50 St, South Miami, FL 33155", M, "flal-l21000261594-4201e8b7-d1dc-41c5-8e8a-c685dc5da4c8"),
  r("CARU PROPERTIES, LLC", "L05000112386", "MGRM", "INACTIVE (filed 2005-11-21; admin dissolution 2014-09-26)", "5291 Gold Tree Ct, Orlando, FL 32808", M, "flal-l05000112386-c3b886b8-1eb5-4f26-9114-210e8a8bf13d"),
 ],
 "lisa-bonich": [
  r("BEACON III DEVELOPMENT LLC", "L16000066382", "MGR; registered agent", "INACTIVE (filed 2016-04-04; admin dissolution 2017-09-22)", "5801 SW 64th Place, South Miami", N, "flal-l16000066382-09482041-46f5-4994-a300-c4b50e9142b2"),
  r("ART IN ORDER LLC", "L19000188409", "MGR; registered agent", "INACTIVE (filed 2019-07-23; admin dissolution 2022-09-23)", RES, N, "flal-l19000188409-42e57fcf-6aca-4d9a-a32f-eb5c0f48f94f"),
 ],
 "javier-fernandez": [
  r("JAVIER E. FERNANDEZ, ESQ., P.A.", "P20000002098", "P (president); registered agent", "ACTIVE (filed 2019-12-30; reinstated 2025-10-06; 2026 annual report filed 2026-05-03)", "c/o SMGQ Law, 201 Alhambra Circle Suite 1250, Coral Gables, FL 33134", M, "domp-p20000002098-f10baa4e-301a-4d5f-b80e-4c3cb4295d72"),
  r("FERNANDEZ DEVELOPMENT LAW PLLC", "L22000126427", "registered agent", "ACTIVE (filed 2022-03-14; reinstated 2025-10-06)", "201 Alhambra Circle Suite 1205, Coral Gables, FL 33134", M, "flal-l22000126427-5b33ef52-6898-489d-b376-0aefe3c94cb5"),
  r("COREOPSIS CONSULTING LLC", "L21000139244", "registered agent", "ACTIVE (filed 2021-03-24; reinstated 2026-03-01)", "c/o SMGQ Law, 201 Alhambra Circle Ste 1205, Coral Gables, FL 33134", M, "flal-l21000139244-b049dbde-7565-4468-bb9f-618f37e699bd"),
  r("SABAL PALM STRATEGIES LLC", "L21000135601", "MGR; registered agent (not on his Form 1)", "ACTIVE (filed 2021-03-23; reinstated 2026-03-01)", "201 Alhambra Circle Ste 1205, Coral Gables, FL 33134", M, "flal-l21000135601-3cde85d0-4de9-4d23-8b53-123aefdbadb9"),
  r("LMJF TRANSIT SOLUTIONS LLC", "L26000135976", "registered agent (not on his Form 1; formed after the 2025 reporting year)", "ACTIVE (filed 2026-03-06)", "201 Alhambra Circle Suite 1205, Coral Gables, FL 33134", M, "flal-l26000135976-422120bc-41d0-495e-894d-afcbcd3c5df9"),
 ],
 "ken-fairman": [
  r("FLORIDA PAVEMENT SERVICES, INC.", "P12000067371", "President (Kenneth J. Fairman)", "ACTIVE (filed 2012-08-03; 2026 annual report filed 2026-03-30)", "10901 SW 60th Ave, Pinecrest, FL 33156", M, "domp-p12000067371-71df4f00-af7e-4935-a484-e619c02f733b"),
  r("TREEMENDOUS MIAMI, INC.", "N99000000399", "President (officer address 10901 SW 60 Ave)", "ACTIVE (2026 annual report filed 2026-03-09)", "10665 SW 62 Avenue, Miami, FL 33156", M, "domnp-n99000000399-9db56ac0-fd03-4e87-b4d7-ba280e05b1c1"),
  r("FRIENDS OF PINECREST GARDENS, INC.", "N20000009544", "Director", "ACTIVE (filed 2020-08-04; 2026 annual report filed 2026-04-01)", "12645 Pinecrest Parkway, Pinecrest, FL 33156", N, "domnp-n20000009544-8f79ea2e-92c5-4f61-a929-7c40c6dcaa1a"),
  r("MIRACLE LEAGUE OF MIAMI-DADE INC.", "N10000005016", "Director of Baseball Operations", "ACTIVE (2026 annual report filed 2026-02-18)", "8300 SW 164th Terrace, Palmetto Bay, FL 33157", N, "domnp-n10000005016-c9811550-cad1-41ce-8896-4767a53a8422"),
 ],
 "edgar-ayala": [
  r("THE TOWN OF MEDLEY FOUNDATION, INC.", "N98000003317", "Director", "ACTIVE (2026 annual report filed 2026-02-05)", "7777 NW 72nd Avenue, Medley, FL 33166 (Town Hall)", M, "domnp-n98000003317-08aab899-4994-4176-b42f-5579c91b4e68"),
  r("AXIOMATIC LLC", "L26000251587", "AMBR; registered agent", "ACTIVE (filed 2026-05-05)", RES, N, "flal-l26000251587-a23c2136-4bbd-45b1-9c84-ba22f731a3ff"),
 ],
 "lizelh-rodriguez": [
  r("THE TOWN OF MEDLEY FOUNDATION, INC.", "N98000003317", "Director", "ACTIVE (2026 annual report filed 2026-02-05)", "7777 NW 72nd Avenue, Medley, FL 33166 (Town Hall)", N, "domnp-n98000003317-08aab899-4994-4176-b42f-5579c91b4e68"),
 ],
 "luis-gonzalez": [
  r("VITAL GRAPHICS AND SIGNS INC.", "P12000000923", "P (president); registered agent", "ACTIVE (filed 2012-01-04)", "2131 West 60 St, Hialeah, FL 33016", M, "domp-p12000000923-d8c78c6f-9b14-42b8-9092-91101cd49be0"),
  r("SANTA FE FAMILY, INC.", "P05000042297", "PS (president/secretary)", "ACTIVE (filed 2005-03-21)", "2131 West 60 Street, Hialeah, FL 33016", M, "domp-p05000042297-732f4fa8-bd30-4a9e-a045-1731884121d6"),
 ],
 "natasha-l-ervin": [
  r("TAXES BY NATASHA LLC", "L23000159485", "PRES; registered agent", "ACTIVE (filed 2023-03-30; 2026 annual report filed 2026-04-29)", "770 Opa Locka Blvd, Opa-locka, FL 33054", M, "flal-l23000159485-62ed1443-0168-4288-ae10-bee1e633cbc2"),
  r("ERVIN PROPERTIES MIAMI, LLC", "L21000235865", "MGR; registered agent", "ACTIVE (filed 2021-05-20; 2026 annual report filed 2026-04-29)", "770 Opa Locka Blvd, Opa-locka, FL 33054", M, "flal-l21000235865-95dc4830-9545-4a68-a4bd-d46e992384f2"),
  r("TAXES BY NATASHA, INC.", "P98000062273", "D; registered agent", "INACTIVE (filed 1998-07-13; admin dissolution 2013-09-27)", "770 Opa-locka Blvd, Opa-locka, FL 33054", M, "domp-p98000062273-471c4c8f-a620-4ee7-9f27-357266bd18e1"),
 ],
 "sherelean-bass": [
  r("JESUS CHRIST IS LORD MIRACLE DELIVERANCE CENTER INC.", "N10000001318", "President", "ACTIVE (2026 annual report filed 2026-05-01)", "2230 SW 70th Avenue Suite 2, Davie, FL 33317", N, "domnp-n10000001318-f2dc4d7c-864c-4484-9036-382387fdb17f"),
  r("AFTER CHURCH LOUNGE LLC", "L26000528483", "registered agent", "ACTIVE (filed 2026-10-14)", "Opa-locka, FL 33054 " + RES, N, "flal-l26000528483-b266a445-c864-4254-a2ad-bd2ac108fd05"),
  r("THE FAMILY CHRISTIAN ASSOCIATION OF AMERICA, INC", "N01392", "Chaplain", "ACTIVE (2026 annual report filed 2026-01-28)", "14701 NW 7 Avenue, Miami, FL 33168", N, "domnp-n01392-5be8fd62-a93d-44d6-9ee5-208efbb5d188"),
 ],
 "suzy-lord": [
  r("CUTLER BAY TOWN FOUNDATION, INC.", "N09000010966", "Director", "INACTIVE (filed 2009-11-12; admin dissolution 2025-09-26)", "10720 Caribbean Blvd 105, Cutler Bay, FL 33189 (Town Hall)", M, "domnp-n09000010966-6942dc38-0b71-4745-95b6-e7aadaabf849"),
 ],
 "richard-ramirez": [
  r("LOYAL ORDER OF MOOSE 380 INC.", "N14000005210", "COO", "ACTIVE (2026 annual report filed 2026-03-24)", "9854 E. Evergreen Street, Miami, FL 33157", N, "domnp-n14000005210-1cf735ce-ca6e-4a89-bb6a-946c6289784b"),
 ],
 "oscar-sardinas": [
  r("ORGANIZATIONAL EXCELLENCE & LEADERSHIP SOLUTIONS LLC", "L25000438041", "AMBR (authorized member)", "ACTIVE (filed 2025-09-23; 2026 annual report filed 2026-02-05)", "7901 4th St N Ste 300, St. Petersburg, FL 33702 (a commercial registered-agent address shared by many companies)", M, "flal-l25000438041-867e6f2d-04f8-452a-b7e3-5d4b64808bbe"),
  r("KEY BISCAYNE AMBASSADOR CONDOMINIUM ASSOCIATION, INC.", "733492", "P (president)", "ACTIVE (2026 annual report filed 2026-01-14)", "575 Crandon Blvd, Key Biscayne, FL 33149", N, "domnp-733492-f668ba73-6ef9-48e3-9d61-4b0727e055b5"),
 ],
 "fernando-a-vazquez": [
  r("CWR GLOBAL INC.", "P16000026534", "VP", "ACTIVE (filed 2016-03-21; reinstated 2026-02-02)", "Key Biscayne, FL 33149 " + RES, N, "domp-p16000026534-878ce1df-543c-4aec-a98a-7e13e33a1dca"),
 ],
 "larisa-svechin": [
  r("SUNNY ISLES BEACH K-8 COMMUNITY SCHOOL FUND, INC", "N06000009064", "President", "ACTIVE (2026 annual report filed 2026-01-14)", "16850 Collins Avenue 112-214, Sunny Isles Beach, FL 33160", N, "domnp-n06000009064-56bf7711-9792-4cc9-9c3a-a16cdeb35af7"),
 ],
 "fabian-basabe": [
  r("FABIAN BASABE ENTERPRISES, INC.", "P94000002131", "President; registered agent", "ACTIVE (filed 1994-01-07; reinstated 2017-01-09; 2026 annual report filed 2026-02-07)", RES, N, "domp-p94000002131-f1f36404-cc7a-4682-b1df-441ca99fb16d"),
  r("48 N W 54TH ST LLC", "L20000324384", "MGR; registered agent", "INACTIVE (filed 2020-10-13; admin dissolution 2022-09-23)", "named for 48 NW 54th Street, a property on his Form 6", M, "flal-l20000324384-6fc969b4-b92d-440d-9323-759727b4565a"),
  r("SHOT ON SITE STUDIOS LLC", "L20000017828", "AMBR", "INACTIVE (filed 2020-01-10; admin dissolution 2023-09-22)", RES + " (same building as the Miami Beach unit on his Form 6)", M, "flal-l20000017828-ce81812e-0c59-45f8-8262-7fac9f948348"),
 ],
 "ashley-viola-gantt": [
  r("GANTT LEGACY LAW, P.A.", "P21000038394", "P (president); registered agent", "ACTIVE (filed 2021-04-21; 2026 annual report filed 2026-05-01)", "2121 Biscayne Blvd #1131, Miami, FL 33137 (Form 6 prints '1131 Biscayne blvd')", M, "domp-p21000038394-44227024-48a2-4821-8fe6-8af9a2e81268"),
  r("LAW OFFICES OF BRACY DAVIS, GANTT, & RAYNER, P.A.", "P25000025435", "P (president); registered agent", "ACTIVE (filed 2025-04-30; 2026 annual report filed 2026-05-01)", "3833 Central Avenue, St. Petersburg, FL 33713", M, "domp-p25000025435-a340b6d7-7eb7-47df-b6ff-18521e62e139"),
  r("GWEN S. CHERRY, BLACK WOMEN LAWYERS ASSOCIATION, INC.", "N09349", "President; registered agent", "ACTIVE (2026 annual report filed 2026-03-06)", "2525 Ponce de Leon Blvd Suite 300, Coral Gables, FL 33134", N, "domnp-n09349-61576420-1404-42eb-a01a-a66a76a309e1"),
  r("FAWL SUPPORT ORGANIZATION, INC.", "N23000010653", "D (director)", "ACTIVE (filed 2023-09-05; 2026 annual report filed 2026-01-07)", "4030 Henderson Blvd Suite 337, Tampa, FL 33629", N, "domnp-n23000010653-7311a9cd-b5b7-437a-a5a9-e4c93b1d42ec"),
 ],
 "omar-blanco": [
  r("ABL3 PARTNERS LLC", "L26000152326", "MGR; registered agent (Omar L. Blanco)", "ACTIVE (filed 2026-03-16)", RES, N, "flal-l26000152326-21d094d2-2470-4a28-b148-2fa679885372"),
 ],
 "kevin-d-chambliss": [
  r("FLORIDA LEGISLATIVE BLACK CAUCUS, INC.", "N06000002400", "Secretary", "ACTIVE (2026 annual report filed 2026-05-07)", "400 N Adams Street Suite B, Tallahassee, FL 32301", N, "domnp-n06000002400-cae0bad0-bd02-4133-a40e-b93d33d71d44"),
 ],
 "mike-redondo": [
  r("REDONDO LAW P.A.", "P19000009652", "CEO; registered agent", "ACTIVE (filed 2019-01-28; 2026 annual report filed 2026-03-08)", "2828 Coral Way, Suite 303, Miami, FL 33145", M, "domp-p19000009652-9e20ab9e-ec85-4a0d-bd5f-ece7a644699e"),
  r("REDONDO & HINES, P.L.L.C.", "L25000377918", "MGR (not on his Form 6)", "ACTIVE (filed 2025-08-15; 2026 annual report filed 2026-04-22)", "Tallahassee property listed on his Form 6 " + RES, M, "flal-l25000377918-27c0ea4c-8a7d-417b-ab48-236b2c3304ed"),
  r("AEGIS LEGAL GROUP, P.A.", "P26000026194", "P (president, Michael D. Redondo); registered agent; officer address matches his residence on Form 6", "ACTIVE (filed 2026-05-13)", "3350 Virginia Street, 2nd Floor, Miami, FL 33133", M, "domp-p26000026194-603ba1d5-a129-46c7-8b39-e5478161d666"),
  r("RIFLES LLC", "L21000395713", "MGR; registered agent", "INACTIVE (filed 2021-09-07; admin dissolution 2026-09-25)", "2828 Coral Way Suite 303, Miami, FL 33145", M, "flal-l21000395713-1d5422cd-abb0-4837-9c8e-e3d16e6a11bf"),
 ],
 "juan-carlos-porras": [
  r("SERVICARGO MIAMI INC.", "P04000006437", "P/D; registered agent", "ACTIVE (filed 2004-01-08; 2026 annual report filed 2026-04-15)", RES + " (matches the address on his own W-2 attached to Form 6)", M, "domp-p04000006437-098c0fb3-294c-46d1-8dda-16901686beea"),
  r("PORRAS CONSULTING LLC", "L24000184357", "AR (authorized representative); registered agent", "ACTIVE (filed 2024-04-18; 2026 annual report filed 2026-04-15)", RES + " (matches his W-2 address)", M, "flal-l24000184357-65d42953-6dc5-4800-a7e1-f31cfdcc1f19"),
  r("GLOBAL EAGLE FOOD CORP", "P21000103530", "P (president); registered agent; officer address matches his W-2 address (not on his Form 6)", "ACTIVE (filed 2021-12-10; 2026 annual report filed 2026-04-15)", "8213 NW 74th Ave, Miami, FL 33166", M, "domp-p21000103530-5f51ffb8-9529-4bbf-ac01-7f930151078d"),
  r("CURMED, LLC", "L16000029115", "CEO; registered agent (not on his Form 6)", "ACTIVE (filed 2016-02-11; 2026 annual report filed 2026-04-15)", RES + " (matches his W-2 address)", M, "flal-l16000029115-c1b519c0-ae7e-4cd1-bad5-6d0705aea849"),
 ],
 "angela-nixon": [
  r("THE MOXIE GROUP, LLC.", "L15000028585", "MGR (listed as 'Nixon, Angie M'); registered agent", "ACTIVE (filed 2015-02-16; reinstated 2020-10-05; 2026 annual report filed 2026-04-30)", "5007 Soutel Drive, Jacksonville, FL 32208", N, "flal-l15000028585-8952a071-0d99-4225-8498-24838a1e58ac"),
  r("ANGELA AND NATHAN LLC", "L26000255102", "AMBR", "ACTIVE (filed 2026-05-06)", "720 Pippin Street, Jacksonville, FL 32206", N, "flal-l26000255102-71f9d6c8-5387-4378-b447-01cbfe28c692"),
 ],
 "ileana-garcia": [
  r("NARMAR CONSULTING LLC", "L22000109759", "MGR (Ileana Y. Garcia); not on her Form 6", "ACTIVE (filed 2022-03-03; 2026 annual report filed 2026-02-06)", RES + " (matches the address on her own 2025 federal return attached to Form 6)", M, "flal-l22000109759-3b80fd38-4bcc-4343-a1a4-7b8e32010aae"),
 ],
 "ana-maria-rodriguez": [
  r("AMR & CC LLC", "L25000126600", "MGR; registered agent (listed as 'Maria Rodriguez, Ana')", "ACTIVE (filed 2025-03-24)", RES + " (the Homestead address on her Form 6)", M, "flal-l25000126600-45747043-32fd-4906-ae0b-65e04d334fe1"),
 ],
 "james-uthmeier": [
  r("KEEP FLORIDA CLEAN, INC.", "N24000006478", "D (director, with David Dewhirst and Carl Sceusa)", "INACTIVE (filed 2024-05-30; voluntary dissolution 2025-02-20)", "113 South Monroe Street 1st Floor, Tallahassee, FL 32301", N, "domnp-n24000006478-f40b743b-281c-41aa-bbfa-59c106083b30"),
 ],
 "blaise-ingoglia": [
  r("HARTLAND HOMES, INC.", "P02000026766", "DP (director, president)", "ACTIVE (filed 2002-03-05; 2026 annual report filed 2026-04-28)", "2931 Landover Blvd, Spring Hill, FL 34608", M, "domp-p02000026766-2e30318e-2899-4906-914e-a139e17468ae"),
  r("HARTLAND HOLDINGS, INC.", "P04000104664", "P (president)", "ACTIVE (filed 2004-07-14; 2026 annual report filed 2026-04-28)", "2931 Landover Blvd, Spring Hill, FL 34608", M, "domp-p04000104664-113e6dee-7b56-434b-b2b3-2e5232b072ef"),
  r("THE HARTLAND CENTRE, LLC", "L07000068968", "MGRM", "ACTIVE (filed 2007-07-02; 2026 annual report filed 2026-04-28)", "2931 Landover Blvd, Spring Hill, FL 34608", M, "flal-l07000068968-f00dfc3c-c2c0-4442-9de5-9e5fc262c7a5"),
  r("CONSERVATIVE HOLDINGS, LLC", "L08000023285", "MGR", "ACTIVE (filed 2008-03-05; 2026 annual report filed 2026-04-28)", "2931 Landover Blvd, Spring Hill, FL 34608", M, "flal-l08000023285-fa9075c4-46ac-43ce-af94-a0e02499e79d"),
  r("HARTLAND PLAZA LLC", "L24000169679", "MGR (officer address 2931 Landover Blvd); not on his Form 6", "ACTIVE (filed 2024-04-11; 2026 annual report filed 2026-04-28)", "13295 Jacqueline Rd, Brooksville, FL 34613", M, "flal-l24000169679-8310d639-49dd-4f77-b21c-bca2efce3b1f"),
  r("GOVERNMENT GONE WILD PRODUCTIONS, LLC", "L11000018720", "MGRM; registered agent; not on his Form 6", "ACTIVE (filed 2011-02-14; 2026 annual report filed 2026-04-28)", "2931 Landover Blvd, Spring Hill, FL 34608", M, "flal-l11000018720-237f0fba-7306-48d4-9297-1cb4002e27b7"),
  r("OLETA FARMS PROPERTY OWNERS ASSOCIATION, INC.", "N23000011465", "D (director); registered agent", "ACTIVE (filed 2023-09-15; 2026 annual report filed 2026-04-28)", "2931 Landover Boulevard, Spring Hill, FL 34608", M, "domnp-n23000011465-3991ea69-8bad-4054-a7f8-1528343e4520"),
 ],
 "wilton-simpson": [
  r("SIMPSON FARMS, INC.", "P97000038332", "DPST (director, president, secretary, treasurer)", "ACTIVE (filed 1997-04-28; 2026 annual report filed 2026-01-13)", "401 E. Jackson Street Suite 3100, Tampa, FL 33602 (officer address PO Box 2010, Dade City)", M, "domp-p97000038332-098be406-cfa2-4746-85d6-9b8c9e859f15"),
  r("SIMPSON FARMS, LLC", "L23000394664", "MGR; not on his Form 6", "ACTIVE (filed 2023-08-23; 2026 annual report filed 2026-01-13)", "401 E Jackson St Ste 3100, Tampa, FL 33602 (officer address PO Box 2010, Dade City)", M, "flal-l23000394664-85a7e568-86ef-4b32-a422-8314a282a73f"),
  r("BELLY WADDING, L.L.C.", "L04000050057", "MGRM", "ACTIVE (filed 2004-07-06; 2026 annual report filed 2026-02-13)", "12445 U.S. 301, Dade City, FL 33525", M, "flal-l04000050057-716c3367-2578-4b75-9769-4f43b91db358"),
  r("WSMB, LLC", "L14000188440", "MGR", "ACTIVE (filed 2014-12-09; 2026 annual report filed 2026-04-01)", "10651 US Hwy 301, Dade City, FL 33525", M, "flal-l14000188440-7dcbfd6e-7e6a-4b59-b904-2b5dddbf9fd7"),
  r("WES FLORIDA, LLC", "L18000000093", "MGR (Form 6 prints 'WES FL LLC')", "ACTIVE (filed 2018-12-29; 2026 annual report filed 2026-01-13)", "401 E. Jackson Street Suite 3100, Tampa, FL 33602 (officer address PO Box 2010, Dade City)", M, "flal-l18000000093-e2278746-3ed5-45f4-b27f-9b10422b58a5"),
  r("37925 CHURCH AVENUE, LLC", "L23000440836", "MGR (one of two managers)", "ACTIVE (filed 2023-09-22; 2026 annual report filed 2026-01-13)", "401 E. Jackson Street Suite 3100, Tampa, FL 33602", M, "flal-l23000440836-ebf94208-f4db-45c2-a9dd-7b4aa0830a65"),
  r("14217 3RD STREET, LLC", "L25000260085", "MGR (Form 6 prints '14217 3rd Ave LLC')", "ACTIVE (filed 2025-06-12; 2026 annual report filed 2026-01-13)", "400 N. Ashley Drive Suite 3100, Tampa, FL 33602 (officer address PO Box 2010, Dade City)", M, "flal-l25000260085-acf26e20-1dd2-43f0-bae8-ae21921bab18"),
  r("80 FT ROAD CITRUS, LIMITED LIABILITY COMPANY", "L22000432685", "MGR (Form 6 prints '80 FT Grove LLC')", "ACTIVE (filed 2022-10-06; 2026 annual report filed 2026-02-02)", "12349 North Curley Street, San Antonio, FL 33576", M, "flal-l22000432685-2ae58790-6d05-4d36-861c-38e467fd5214"),
  r("BANKFLORIDA", "P07000060636", "Director", "ACTIVE (2026 annual report filed 2026-04-03)", "12482 US Highway 301, Dade City, FL 33525", M, "domp-p07000060636-b2abaaeb-dd2f-403c-8069-e598b8b0edd4"),
  r("BANKFLORIDA BANCORP, INC.", "P21000007104", "Director", "ACTIVE (filed 2021-02-02; 2026 annual report filed 2026-04-03)", "12482 US Highway 301, Dade City, FL 33525", M, "domp-p21000007104-4840bfe0-5f6f-4a6c-b987-eaab65890f87"),
  r("PASCO COUNTY FARM BUREAU, INC.", "N13000000951", "Director", "ACTIVE (2026 annual report filed 2026-04-16)", "12445 US Hwy 301, Dade City, FL 33525", M, "domnp-n13000000951-4b31b574-d3ec-4717-8572-65cf512a8d2b"),
 ],
 "maria-elvira-salazar": [
  r("MIRACLE TV, INC.", "P12000090551", "D/P and S/T (named on her 2025 House disclosure, Schedule E, as President/Director/Secretary/Treasurer)", "INACTIVE (filed 2012-10-26; admin dissolution 2026-09-25)", RES, N, "domp-p12000090551-4f96fed1-bcc6-4517-8c66-cbf4c3fcfb61"),
  r("MES HOME DISTRIBUTORS, INC.", "P24000035832", "P; registered agent (her 2025 disclosure lists 'MES Home Distributors, 100% Interest', dissolved May 2025)", "INACTIVE (filed 2024-05-21; admin dissolution 2025-09-26)", RES, N, "domp-p24000035832-4c7a2aa9-1929-4ae7-b54a-08a7f19d8d32"),
  r("MES HEALTH HOLDING, INC.", "P20000047719", "President; registered agent (not on her 2025 disclosure)", "INACTIVE (filed 2020-06-29; admin dissolution 2025-09-26)", RES, N, "domp-p20000047719-8ae9569d-c044-4a9b-aa6b-d677e5a7b104"),
 ],
}
