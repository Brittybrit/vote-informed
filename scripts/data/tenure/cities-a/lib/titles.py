"""Template titles in English, Spanish and Kreyol for tenure actions (cities-a slice).
title(kind_key, parties, amount, subject_key, extra) -> (en, es, ht). Parties and amounts are kept as written."""
import re
SUBJ = {  # subject key -> (en, es, ht)
 'tree': ('tree trimming', 'poda de árboles', 'taye pyebwa'),
 'lawn': ('lawn and landscape maintenance', 'mantenimiento de césped y jardines', 'antretyen gazon ak jaden'),
 'asphalt': ('asphalt resurfacing', 'repavimentación con asfalto', 'reasfaltaj'),
 'drain': ('storm drain and sewer cleaning', 'limpieza de drenajes y alcantarillado', 'netwayaj drenaj ak egou'),
 'sewer': ('sewer and water system work', 'obras de alcantarillado y agua', 'travay sistèm egou ak dlo'),
 'water': ('water plant supplies', 'suministros para la planta de agua', 'founiti pou izin dlo a'),
 'chem': ('water treatment chemicals', 'químicos para tratar el agua', 'pwodui chimik pou trete dlo'),
 'fuel': ('fuel', 'combustible', 'gaz'),
 'it': ('computer hardware and software', 'equipos y programas de computación', 'materyèl ak lojisyèl òdinatè'),
 'software': ('software and support', 'programas informáticos y soporte', 'lojisyèl ak sipò'),
 'phones': ('wireless phone and data service', 'servicio de telefonía y datos móviles', 'sèvis telefòn ak done san fil'),
 'police': ('police equipment', 'equipo policial', 'ekipman lapolis'),
 'vehicles': ('vehicles and equipment', 'vehículos y equipo', 'machin ak ekipman'),
 'vlease': ('vehicle lease-purchase financing', 'financiamiento de arrendamiento con opción a compra de vehículos', 'finansman lokasyon-acha machin'),
 'insurance': ('insurance coverage', 'cobertura de seguros', 'kouvèti asirans'),
 'health': ('employee health insurance', 'seguro médico para empleados', 'asirans sante pou anplwaye yo'),
 'wcomp': ("workers' compensation claims services", 'servicios de reclamos de compensación laboral', 'sèvis reklamasyon konpansasyon travayè'),
 'eng': ('engineering services', 'servicios de ingeniería', 'sèvis enjenyè'),
 'arch': ('architecture and design services', 'servicios de arquitectura y diseño', 'sèvis achitekti ak konsepsyon'),
 'constr': ('construction work', 'obras de construcción', 'travay konstriksyon'),
 'roof': ('roof repairs', 'reparación de techos', 'reparasyon twati'),
 'hvac': ('air conditioning repairs', 'reparación de aire acondicionado', 'reparasyon klimatizasyon'),
 'parks': ('park and playground equipment', 'equipo para parques y áreas de juego', 'ekipman pak ak teren jwèt'),
 'turf': ('synthetic turf and track work', 'trabajos de césped sintético y pista', 'travay gazon sentetik ak pis'),
 'stadium': ('stadium seating', 'gradas del estadio', 'chèz estad la'),
 'lobby': ('lobbying services', 'servicios de cabildeo', 'sèvis lobi'),
 'audit': ('auditing services', 'servicios de auditoría', 'sèvis odit'),
 'consult': ('consulting services', 'servicios de consultoría', 'sèvis konsiltasyon'),
 'legal': ('legal services', 'servicios legales', 'sèvis legal'),
 'waste': ('garbage and recycling collection', 'recolección de basura y reciclaje', 'ranmasaj fatra ak resiklaj'),
 'transit': ('public transportation service', 'servicio de transporte público', 'sèvis transpò piblik'),
 'events': ('event services', 'servicios para eventos', 'sèvis pou evènman'),
 'fireworks': ('fireworks shows', 'espectáculos de fuegos artificiales', 'fedatifis'),
 'training': ('training services', 'servicios de capacitación', 'sèvis fòmasyon'),
 'housing': ('home repair and rehabilitation', 'reparación y rehabilitación de viviendas', 'reparasyon ak reyabilitasyon kay'),
 'youth': ('youth and community programs', 'programas juveniles y comunitarios', 'pwogram pou jèn ak kominote'),
 'marketing': ('marketing services', 'servicios de mercadeo', 'sèvis maketing'),
 'security': ('security services', 'servicios de seguridad', 'sèvis sekirite'),
 'elevator': ('elevator maintenance', 'mantenimiento de ascensores', 'antretyen asansè'),
 'uniform': ('uniforms', 'uniformes', 'inifòm'),
 'office': ('office supplies', 'artículos de oficina', 'founiti biwo'),
 'emergency': ('emergency repairs', 'reparaciones de emergencia', 'reparasyon ijans'),
 'debris': ('disaster debris services', 'servicios de escombros tras desastres', 'sèvis debri apre dezas'),
 'ads': ('advertising space', 'espacios publicitarios', 'espas piblisite'),
 'bikes': ('bike or scooter sharing', 'bicicletas o patinetas compartidas', 'bisiklèt oswa eskoutè pataje'),
 'rail': ('railroad crossing agreement', 'acuerdo de cruce ferroviario', 'akò travèse ray tren'),
 'museum': ('museum management', 'administración del museo', 'jesyon mize a'),
 'food': ('food assistance', 'asistencia alimentaria', 'asistans manje'),
 'printing': ('copiers and printing', 'copiadoras e impresión', 'fotokopyèz ak enpresyon'),
 'utility': ('utility services', 'servicios públicos', 'sèvis piblik'),
 'trolley': ('trolley service', 'servicio de trolley', 'sèvis twoli'),
 'art': ('public art', 'arte público', 'atizay piblik'),
 'retire': ('retirement plan services', 'servicios del plan de jubilación', 'sèvis plan retrèt'),
 'tires': ('tires and fleet parts', 'neumáticos y piezas de flota', 'kawotchou ak pyès machin'),
 'meters': ('water meters', 'medidores de agua', 'kontè dlo'),
 'cameras': ('cameras and surveillance', 'cámaras y vigilancia', 'kamera ak siveyans'),
 'education': ('education programs', 'programas educativos', 'pwogram edikasyon'),
 'sidewalk': ('sidewalk repairs', 'reparación de aceras', 'reparasyon twotwa'),
 'consult2': ('planning and consulting services', 'servicios de planificación y consultoría', 'sèvis planifikasyon ak konsiltasyon'),
 'sandbags': ('sandbags', 'sacos de arena', 'sak sab'),
 'tutor': ('tutoring services', 'servicios de tutoría', 'sèvis leson patikilye'),
 'boat': ('police boat equipment', 'equipo para embarcaciones policiales', 'ekipman bato lapolis'),
 'other': ('services', 'servicios', 'sèvis'),
}
def money(a):
    if a is None or a == '': return ''
    if isinstance(a, (int, float)):
        return '${:,.0f}'.format(a) if float(a).is_integer() else '${:,.2f}'.format(a)
    return str(a)
def J(ps):
    ps = list(ps)
    if not ps: return ('', '', '')
    if len(ps) == 1: return (ps[0],) * 3
    a = ', '.join(ps[:-1])
    return (a + ' and ' + ps[-1], a + ' y ' + ps[-1], a + ' ak ' + ps[-1])
def title(k, ps, amt=None, s='other', x=''):
    """k: template key. ps: parties shown in the title (list). amt: number or string. s: SUBJ key. x: address/place."""
    P = J(ps); m = money(amt); S = SUBJ.get(s, SUBJ['other'])
    ue = (' (up to %s)' % m) if m else ''; us = (' (hasta %s)' % m) if m else ''; uh = (' (jiska %s)' % m) if m else ''
    fe = (' (%s)' % m) if m else ''
    T = {
     'contract': ('Hired %s for %s%s' % (P[0], S[0], ue), 'Contrató a %s para %s%s' % (P[1], S[1], us), 'Te angaje %s pou %s%s' % (P[2], S[2], uh)),
     'renew': ('Renewed the %s contract with %s%s' % (S[0], P[0], ue), 'Renovó el contrato de %s con %s%s' % (S[1], P[1], us), 'Renouvle kontra %s ak %s%s' % (S[2], P[2], uh)),
     'amend': ('Amended the %s contract with %s%s' % (S[0], P[0], ue), 'Modificó el contrato de %s con %s%s' % (S[1], P[1], us), 'Modifye kontra %s ak %s%s' % (S[2], P[2], uh)),
     'change': ('Approved a change order for %s on %s%s' % (P[0], S[0], fe), 'Aprobó una orden de cambio para %s en %s%s' % (P[1], S[1], fe), 'Apwouve yon chanjman lòd pou %s sou %s%s' % (P[2], S[2], fe)),
     'buy': ('Bought %s from %s%s' % (S[0], P[0], ue), 'Compró %s a %s%s' % (S[1], P[1], us), 'Achte %s nan men %s%s' % (S[2], P[2], uh)),
     'piggy': ('Bought %s from %s using another government\'s contract%s' % (S[0], P[0], ue), 'Compró %s a %s usando el contrato de otro gobierno%s' % (S[1], P[1], us), 'Achte %s nan men %s ak kontra yon lòt gouvènman%s' % (S[2], P[2], uh)),
     'nobid': ('Hired %s for %s without bidding%s' % (P[0], S[0], ue), 'Contrató a %s para %s sin licitación%s' % (P[1], S[1], us), 'Te angaje %s pou %s san lisitasyon%s' % (P[2], S[2], uh)),
     'emerg': ('Ratified an emergency purchase from %s for %s%s' % (P[0], S[0], fe), 'Ratificó una compra de emergencia a %s para %s%s' % (P[1], S[1], fe), 'Ratifye yon acha ijans nan men %s pou %s%s' % (P[2], S[2], fe)),
     'award': ('Awarded %s to %s%s' % (S[0], P[0], ue), 'Adjudicó %s a %s%s' % (S[1], P[1], us), 'Bay %s kontra %s%s' % (P[2], S[2], uh)),
     'agree': ('Signed an agreement with %s for %s%s' % (P[0], S[0], ue), 'Firmó un acuerdo con %s para %s%s' % (P[1], S[1], us), 'Siyen yon akò ak %s pou %s%s' % (P[2], S[2], uh)),
     'union': ('Ratified the union contract with %s' % P[0], 'Ratificó el contrato sindical con %s' % P[1], 'Ratifye kontra sendika ak %s' % P[2]),
     'unionmou': ('Approved a side agreement with the union %s' % P[0], 'Aprobó un acuerdo complementario con el sindicato %s' % P[1], 'Apwouve yon akò siplemantè ak sendika %s' % P[2]),
     'settle': ('Approved a settlement with %s%s' % (P[0], fe), 'Aprobó un acuerdo legal con %s%s' % (P[1], fe), 'Apwouve yon akò regleman ak %s%s' % (P[2], fe)),
     'lease': ('Approved a lease with %s%s' % (P[0], (' for %s' % x) if x else ''), 'Aprobó un arrendamiento con %s%s' % (P[1], (' para %s' % x) if x else ''), 'Apwouve yon kontra lokasyon ak %s%s' % (P[2], (' pou %s' % x) if x else '')),
     'leasein': ('Rented space for the city from %s%s' % (P[0], (' at %s' % x) if x else ''), 'Alquiló un espacio para la ciudad a %s%s' % (P[1], (' en %s' % x) if x else ''), 'Lwe yon espas pou vil la nan men %s%s' % (P[2], (' nan %s' % x) if x else '')),
     'leaseamend': ('Amended the lease with %s%s' % (P[0], (' for %s' % x) if x else ''), 'Modificó el arrendamiento con %s%s' % (P[1], (' para %s' % x) if x else ''), 'Modifye kontra lokasyon ak %s%s' % (P[2], (' pou %s' % x) if x else '')),
     'sale': ('Approved selling city land to %s%s' % (P[0], (' at %s' % x) if x else ''), 'Aprobó vender terreno municipal a %s%s' % (P[1], (' en %s' % x) if x else ''), 'Apwouve vann tè vil la bay %s%s' % (P[2], (' nan %s' % x) if x else '')),
     'buyland': ('Approved buying land from %s%s' % (P[0], (' at %s' % x) if x else ''), 'Aprobó comprar un terreno a %s%s' % (P[1], (' en %s' % x) if x else ''), 'Apwouve achte tè nan men %s%s' % (P[2], (' nan %s' % x) if x else '')),
     'siteplan': ('Approved the site plan at %s' % x, 'Aprobó el plano del sitio en %s' % x, 'Apwouve plan sit la nan %s' % x),
     'siteplanno': ('Rejected the site plan at %s' % x, 'Rechazó el plano del sitio en %s' % x, 'Rejte plan sit la nan %s' % x),
     'cup': ('Granted a conditional use permit at %s' % x, 'Otorgó un permiso de uso condicional en %s' % x, 'Bay yon pèmi itilizasyon kondisyonèl nan %s' % x),
     'cupno': ('Denied a conditional use permit at %s' % x, 'Negó un permiso de uso condicional en %s' % x, 'Refize yon pèmi itilizasyon kondisyonèl nan %s' % x),
     'plat': ('Approved a plat at %s' % x, 'Aprobó un plano de subdivisión en %s' % x, 'Apwouve yon plan lotisman nan %s' % x),
     'landuse': ('Changed the land use designation at %s' % x, 'Cambió la clasificación de uso del suelo en %s' % x, 'Chanje deziyasyon itilizasyon tè nan %s' % x),
     'rezone': ('Rezoned the property at %s' % x, 'Cambió la zonificación de la propiedad en %s' % x, 'Chanje zonaj pwopriyete a nan %s' % x),
     'variance': ('Granted a variance at %s' % x, 'Otorgó una variación en %s' % x, 'Bay yon derogasyon nan %s' % x),
     'devagree': ('Approved a development agreement with %s%s' % (P[0], (' for %s' % x) if x else ''), 'Aprobó un acuerdo de desarrollo con %s%s' % (P[1], (' para %s' % x) if x else ''), 'Apwouve yon akò devlopman ak %s%s' % (P[2], (' pou %s' % x) if x else '')),
     'grant': ('Gave %s to %s' % (m or 'funding', P[0]), 'Otorgó %s a %s' % (m or 'fondos', P[1]), 'Bay %s %s' % (P[2], m or 'lajan')),
     'sponsor': ('Sponsored %s%s' % (P[0], fe), 'Patrocinó a %s%s' % (P[1], fe), 'Patwone %s%s' % (P[2], fe)),
     'easement': ('Approved an easement with %s%s' % (P[0], (' at %s' % x) if x else ''), 'Aprobó una servidumbre con %s%s' % (P[1], (' en %s' % x) if x else ''), 'Apwouve yon sèvitid ak %s%s' % (P[2], (' nan %s' % x) if x else '')),
     'license': ('Granted a license agreement to %s for %s' % (P[0], S[0]), 'Otorgó un acuerdo de licencia a %s para %s' % (P[1], S[1]), 'Bay %s yon akò lisans pou %s' % (P[2], S[2])),
     'partner': ('Approved a partnership with %s for %s%s' % (P[0], S[0], ue), 'Aprobó una alianza con %s para %s%s' % (P[1], S[1], us), 'Apwouve yon patenarya ak %s pou %s%s' % (P[2], S[2], uh)),
     'abandon': ('Approved closing and selling a city alley to %s%s' % (P[0], (' at %s' % x) if x else ''), 'Aprobó cerrar y vender un callejón municipal a %s%s' % (P[1], (' en %s' % x) if x else ''), 'Apwouve fèmen epi vann yon ti ri vil la bay %s%s' % (P[2], (' nan %s' % x) if x else '')),
     'select': ('Selected %s for %s%s' % (P[0], S[0], ue), 'Seleccionó a %s para %s%s' % (P[1], S[1], us), 'Chwazi %s pou %s%s' % (P[2], S[2], uh)),
     'insure': ('Bought %s from %s%s' % (S[0], P[0], fe), 'Contrató %s con %s%s' % (S[1], P[1], fe), 'Achte %s nan men %s%s' % (S[2], P[2], fe)),
     'str': ('Revoked short-term rental status at %s' % x, 'Revocó el permiso de alquiler a corto plazo en %s' % x, 'Anile estati lokasyon kout tèm nan %s' % x),
    }
    if k not in T: raise KeyError(k)
    return T[k]
