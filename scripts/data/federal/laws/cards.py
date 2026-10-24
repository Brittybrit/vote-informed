# Adds every qualifying enacted law in universe.json to floor-votes.json (the cards' source), keeping the five
# hand-written entries. Subjects and "who it helps" lines are written here in all three languages; the quote
# is the analysis's own words (CRS summary, CBO estimate or the overturned rule), kept short.
# Run: python3 scripts/data/federal/laws/cards.py && node scripts/federal-earmarks.mjs && node scripts/money-summary.mjs
import json, os
H = os.path.dirname(os.path.abspath(__file__))
FV = os.path.join(H, '..', 'floor-votes.json')
U = json.load(open(os.path.join(H, 'universe.json')))
fv = json.load(open(FV))
have = {b['law'] for b in fv['bills']}

# class key -> label (who the donors are). Classes already in floor-votes.json are reused.
NEW_CLASSES = {
  'hospitals': ('hospitals', 'hospitales', 'lopital'),
  'pharmacies': ('pharmacies', 'farmacias', 'famasi'),
  'appliances': ('appliance and equipment makers', 'fabricantes de electrodomésticos y equipos', 'manifakti aparèy ak ekipman'),
  'payments': ('payment app companies', 'empresas de aplicaciones de pago', 'konpayi aplikasyon peman'),
  'tires': ('tire makers', 'fabricantes de neumáticos', 'manifakti kawotchou'),
  'industrial': ('industrial plants', 'plantas industriales', 'faktori endistriyèl'),
  'coal': ('coal mining companies', 'empresas de minería de carbón', 'konpayi min chabon'),
  'mining': ('mining and geothermal companies', 'empresas mineras y geotérmicas', 'konpayi min ak jeyotèmik'),
  'dcbiz': ('businesses in Washington, D.C.', 'empresas en Washington D. C.', 'biznis nan Washington D.C.'),
  'smallrd': ('small businesses doing federal research', 'pequeñas empresas que hacen investigación federal', 'ti biznis k ap fè rechèch federal'),
  'hydro': ('hydropower companies', 'empresas hidroeléctricas', 'konpayi idwoelektrik'),
  'sbic': ('small business investment firms', 'firmas de inversión en pequeñas empresas', 'fèm envestisman nan ti biznis'),
  'native': ('an Alaska Native corporation', 'una corporación nativa de Alaska', 'yon kòporasyon natif Alaska'),
  'housing': ('manufactured-home builders and banks', 'constructores de casas prefabricadas y bancos', 'konstriktè kay prefabrike ak bank'),
  'farms': ('farms and forest owners', 'granjas y dueños de bosques', 'fèm ak pwopriyetè forè'),
  'music': ('music venues and festivals', 'locales y festivales de música', 'sal ak festival mizik'),
  'esop': ('employee-owned companies', 'empresas propiedad de sus empleados', 'konpayi ki pou anplwaye yo'),
}
# law -> (key, class, subject en/es/ht, helps en/es/ht)
L = {
 '119-3': ('sjres11', 'oilgas', ('Repeal of an offshore drilling rule on protecting shipwrecks and artifacts', 'Derogación de una regla de perforación en alta mar sobre la protección de naufragios y artefactos', 'Anilasyon yon règ sou forage nan lanmè pou pwoteje epav ak atifak'), ('offshore oil and gas companies', 'empresas de petróleo y gas en alta mar', 'konpayi petwòl ak gaz nan lanmè')),
 '119-4': ('hr1968', 'hospitals', ('Full-year government funding for 2025 (continuing resolution)', 'Financiamiento del gobierno para todo 2025 (resolución continua)', 'Finansman gouvènman an pou tout 2025 (rezolisyon kontinyèl)'), ('hospitals', 'hospitales', 'lopital')),
 '119-5': ('hjres25', 'crypto', ('Repeal of the IRS rule on reporting by crypto brokers', 'Derogación de la regla del IRS sobre reportes de corredores de criptomonedas', 'Anilasyon règ IRS sou rapò koutye kripto'), ('crypto brokers', 'corredores de criptomonedas', 'koutye kripto')),
 '119-6': ('hjres20', 'appliances', ('Repeal of energy standards for gas tankless water heaters', 'Derogación de normas de energía para calentadores de agua a gas sin tanque', 'Anilasyon nòm enèji pou chofaj dlo gaz san rezèvwa'), ('water heater makers', 'fabricantes de calentadores de agua', 'manifakti chofaj dlo')),
 '119-7': ('hjres24', 'appliances', ('Repeal of energy standards for walk-in coolers and freezers', 'Derogación de normas de energía para cámaras frigoríficas', 'Anilasyon nòm enèji pou chanm frijidè ak frizè'), ('commercial refrigeration makers', 'fabricantes de refrigeración comercial', 'manifakti refrijerasyon komèsyal')),
 '119-8': ('hjres42', 'appliances', ('Repeal of an energy rule on appliance testing and certification', 'Derogación de una regla de energía sobre pruebas y certificación de electrodomésticos', 'Anilasyon yon règ enèji sou tès ak sètifikasyon aparèy'), ('appliance and equipment makers', 'fabricantes de electrodomésticos y equipos', 'manifakti aparèy ak ekipman')),
 '119-9': ('hjres75', 'appliances', ('Repeal of energy standards for commercial refrigerators and freezers', 'Derogación de normas de energía para refrigeradores y congeladores comerciales', 'Anilasyon nòm enèji pou frijidè ak frizè komèsyal'), ('commercial refrigeration makers', 'fabricantes de refrigeración comercial', 'manifakti refrijerasyon komèsyal')),
 '119-11': ('sjres28', 'payments', ('Repeal of federal oversight of large payment apps', 'Derogación de la supervisión federal de grandes aplicaciones de pago', 'Anilasyon sipèvizyon federal sou gwo aplikasyon peman'), ('large payment app companies', 'grandes empresas de aplicaciones de pago', 'gwo konpayi aplikasyon peman')),
 '119-14': ('hjres61', 'tires', ('Repeal of air pollution limits for tire factories', 'Derogación de límites de contaminación del aire para fábricas de neumáticos', 'Anilasyon limit polisyon lè pou faktori kawotchou'), ('tire makers', 'fabricantes de neumáticos', 'manifakti kawotchou')),
 '119-15': ('hjres87', 'autos', ('Blocking California’s rule requiring more zero-emission trucks', 'Bloqueo de la regla de California que exige más camiones de cero emisiones', 'Bloke règ Kalifòni ki egzije plis kamyon zewo emisyon'), ('truck makers', 'fabricantes de camiones', 'manifakti kamyon')),
 '119-17': ('hjres89', 'autos', ('Blocking California’s rule on truck and engine pollution', 'Bloqueo de la regla de California sobre la contaminación de camiones y motores', 'Bloke règ Kalifòni sou polisyon kamyon ak motè'), ('truck and engine makers', 'fabricantes de camiones y motores', 'manifakti kamyon ak motè')),
 '119-19': ('sjres13', 'banks', ('Repeal of the bank regulator’s rule on reviewing bank mergers', 'Derogación de la regla del regulador bancario sobre fusiones de bancos', 'Anilasyon règ regilatè bank lan sou fizyon bank yo'), ('banks', 'bancos', 'bank')),
 '119-20': ('sjres31', 'industrial', ('Repeal of an EPA rule on how polluting plants can change category', 'Derogación de una regla de la EPA sobre cómo las plantas contaminantes cambian de categoría', 'Anilasyon yon règ EPA sou kijan faktori ki polye ka chanje kategori'), ('industrial plants', 'plantas industriales', 'faktori endistriyèl')),
 '119-21': ('hr1', 'oilgas', ('One Big Beautiful Bill Act (taxes, spending, energy)', 'Ley One Big Beautiful Bill (impuestos, gasto, energía)', 'Lwa One Big Beautiful Bill (taks, depans, enèji)'), ('oil and gas companies, among other businesses', 'empresas de petróleo y gas, entre otras', 'konpayi petwòl ak gaz, pami lòt biznis')),
 '119-44': ('hr2483', 'pharmacies', ('Reauthorization of opioid treatment and recovery programs (SUPPORT Act)', 'Reautorización de programas de tratamiento y recuperación de opioides (Ley SUPPORT)', 'Re-otorizasyon pwogram tretman ak gerizon opioyid (Lwa SUPPORT)'), ('pharmacies', 'farmacias', 'famasi')),
 '119-47': ('sjres80', 'oilgas', ('Reopening parts of Alaska’s National Petroleum Reserve to drilling', 'Reapertura de partes de la Reserva Nacional de Petróleo de Alaska a la perforación', 'Relouvri kèk pati nan Rezèv Petwòl Nasyonal Alaska pou forage'), ('oil and gas companies', 'empresas de petróleo y gas', 'konpayi petwòl ak gaz')),
 '119-48': ('hjres104', 'coal', ('Reopening federal land in Montana to coal leasing (Miles City)', 'Reapertura de tierras federales en Montana al arrendamiento de carbón (Miles City)', 'Relouvri tè federal nan Montana pou lokasyon chabon (Miles City)'), ('coal mining companies', 'empresas de minería de carbón', 'konpayi min chabon')),
 '119-49': ('hjres105', 'oilgas', ('Reopening federal land in North Dakota to oil, gas and coal', 'Reapertura de tierras federales en Dakota del Norte al petróleo, gas y carbón', 'Relouvri tè federal nan Dakota di Nò pou petwòl, gaz ak chabon'), ('oil, gas and coal companies', 'empresas de petróleo, gas y carbón', 'konpayi petwòl, gaz ak chabon')),
 '119-51': ('hjres130', 'coal', ('Reopening federal land in Wyoming to coal leasing (Buffalo)', 'Reapertura de tierras federales en Wyoming al arrendamiento de carbón (Buffalo)', 'Relouvri tè federal nan Wyoming pou lokasyon chabon (Buffalo)'), ('coal mining companies', 'empresas de minería de carbón', 'konpayi min chabon')),
 '119-52': ('hjres131', 'oilgas', ('Reopening Alaska’s Arctic refuge coastal plain to oil and gas leasing', 'Reapertura de la llanura costera del refugio ártico de Alaska al petróleo y gas', 'Relouvri plèn kotyè refij Aktik Alaska pou petwòl ak gaz'), ('oil and gas companies', 'empresas de petróleo y gas', 'konpayi petwòl ak gaz')),
 '119-78': ('hjres142', 'dcbiz', ('Blocking a D.C. law on business income taxes', 'Bloqueo de una ley de D. C. sobre impuestos a la renta de empresas', 'Bloke yon lwa D.C. sou taks sou revni biznis'), ('businesses in Washington, D.C.', 'empresas en Washington D. C.', 'biznis nan Washington D.C.')),
 '119-83': ('s3971', 'smallrd', ('Renewal of federal research grants for small businesses (SBIR/STTR)', 'Renovación de becas federales de investigación para pequeñas empresas (SBIR/STTR)', 'Renouvèlman sibvansyon rechèch federal pou ti biznis (SBIR/STTR)'), ('small businesses doing federal research', 'pequeñas empresas que hacen investigación federal', 'ti biznis k ap fè rechèch federal')),
 '119-85': ('hjres140', 'mining', ('Reopening federal land in Minnesota to mining', 'Reapertura de tierras federales en Minnesota a la minería', 'Relouvri tè federal nan Minnesota pou min'), ('mining and geothermal companies', 'empresas mineras y geotérmicas', 'konpayi min ak jeyotèmik')),
 '119-90': ('s1020', 'hydro', ('More time to build licensed hydropower projects', 'Más plazo para construir proyectos hidroeléctricos con licencia', 'Plis tan pou bati pwojè idwoelektrik ki gen lisans'), ('hydropower companies', 'empresas hidroeléctricas', 'konpayi idwoelektrik')),
 '119-101': ('hr6644', 'housing', ('ROAD to Housing Act (manufactured homes and housing finance)', 'Ley ROAD to Housing (casas prefabricadas y financiamiento de vivienda)', 'Lwa ROAD to Housing (kay prefabrike ak finansman lojman)'), ('manufactured-home builders and banks', 'constructores de casas prefabricadas y bancos', 'konstriktè kay prefabrike ak bank')),
 '119-102': ('s629', 'farms', ('Faster disaster aid for farms and forest land', 'Ayuda más rápida por desastres para granjas y bosques', 'Èd pi rapid pou katastwòf pou fèm ak tè forè'), ('farms and forest owners', 'granjas y dueños de bosques', 'fèm ak pwopriyetè forè')),
 '119-124': ('s2403', 'esop', ('Retire through Ownership Act (employee-owned companies)', 'Ley Retire through Ownership (empresas propiedad de sus empleados)', 'Lwa Retire through Ownership (konpayi ki pou anplwaye yo)'), ('employee-owned companies', 'empresas propiedad de sus empleados', 'konpayi ki pou anplwaye yo')),
}
# Two names for the analysis the quote comes from
SRC = {
 'crs': ('The Congressional Research Service summary', 'El resumen del Servicio de Investigación del Congreso', 'Rezime Sèvis Rechèch Kongrè a'),
 'cbo': ('The Congressional Budget Office’s cost estimate', 'La estimación de costos de la Oficina de Presupuesto del Congreso', 'Estimasyon kou Biwo Bidjè Kongrè a'),
 'rule': ('The rule being overturned', 'La regla que se anula', 'Règ y ap anile a'),
}
for k, (en, es, ht) in NEW_CLASSES.items():
  fv['classes'].setdefault(k, {'label': {'en': en, 'es': es, 'ht': ht}, 'donors': []})
added = []
for law in U['laws']:
  pl = 'P.L. ' + law['pl']
  if not law.get('benefits') or pl in have or law['pl'] not in L: continue
  key, cls, subj, helps = L[law['pl']]
  votes = []
  for ch in ('house', 'senate'):
    v = (law.get('votes') or {}).get(ch)
    if not v or not v.get('roll') or not v.get('members'): continue
    motion = 'passage'
    if law['pl'] == '119-21' and ch == 'house': motion = 'concurHouse'
    votes.append({'chamber': ch, 'roll': int(v['roll']), 'date': v['date'], 'tally': v['tally'], 'notVoting': v.get('notVoting'), 'motion': motion,
                  'members': {m: ('nv' if x == 'not voting' else x) for m, x in v['members'].items()}})
  if not votes: continue
  src = law.get('analysisSource', 'crs')
  q = law['benefits']['quote']
  t = {'crs': 'crs', 'cbo': 'cbo', 'rule': 'fr'}[src]
  added.append({'key': key, 'ref': law['bill'] + ' · ' + law['date'][:4], 'law': pl, 'bill': law['url'], 'subject': {'en': subj[0], 'es': subj[1], 'ht': subj[2]}, 'class': cls,
    'universe': True,
    'quote': {'t': t, 'url': law['analysisUrl'], 'src': dict(zip(('en', 'es', 'ht'), SRC[src])), 'inline': True,
              'pre': {'en': 'It helps ' + helps[0] + ', which the analysis describes this way:', 'es': 'Beneficia a ' + helps[1] + ', que el análisis describe así:', 'ht': 'Li ede ' + helps[2] + ', analiz la dekri yo konsa:'},
              'en': q, 'es': q, 'ht': q},
    'votes': votes})
fv['bills'] += added
for b in fv['bills']: b['universe'] = True
fv['universeNote'] = 'Every law enacted from Jan 3, 2025 through Oct 20, 2026 (P.L. 119-1 to 119-134) was screened; the 35 whose CRS summary, CBO estimate or overturned rule names a kind of business it helps are listed. Screening: scripts/data/federal/laws/universe.json.'
json.dump(fv, open(FV, 'w'), indent=1, ensure_ascii=False)
open(FV, 'a').write('\n')
print('added', len(added), 'bills; total', len(fv['bills']))
