// "What this means for you" on ballot measures, in English, Spanish and Haitian Creole.
// The voter's answers stay on their device (localStorage 'ballot305.me'); nothing here is sent anywhere.
// The page asks /api/measure-impact for each measure's effects by circumstance (shared, cached for
// everyone) and uses this file to match those effects to the voter, run the few calculations that
// official numbers support, and set any tax change next to the public money and services it moves.
//
// Writing rules: describe consequences, not merits. Every number says what it counts, where it comes
// from and its period. A saving is never shown without what the government collecting the tax loses
// and what that money pays for now. No prediction of what a government will cut.
(function(){
  var KEY = 'ballot305.me';
  var GROUPS = ['homestead', 'owner_other', 'renter', 'business', 'farm', 'school_staff', 'public_employee', 'senior'];

  function usd(n){ return '$' + Math.round(Number(n) || 0).toLocaleString('en-US'); }
  function big(n, lang){
    if(n < 1e6) return usd(n);
    var x = (Math.round(n / 1e5) / 10).toFixed(1).replace(/\.0$/, '');
    return '$' + x + (lang === 'es' ? ' millones' : lang === 'ht' ? ' milyon' : ' million');
  }
  // Which row of the millage chart a city name (the Property Appraiser's, or the voter's pick) is.
  function rates(){ return (typeof window !== 'undefined' && window.MILLAGE_2026) || null; }
  function squash(x){ return String(x || '').toLowerCase().replace(/^(city|town|village) of /, '').replace(/[^a-z]/g, ''); }
  function placeKey(name){
    var M = rates(); if(!M || !name) return '';
    var n = squash(name);
    if(/^unincorporated|^umsa/.test(n)) return 'Unincorporated';
    var keys = Object.keys(M.places);
    for(var i = 0; i < keys.length; i++) if(squash(keys[i]) === n) return keys[i];
    if(n === 'bayharbor' || n === 'bayharborisland') return 'Bay Harbor Islands';
    if(n === 'sunnyisles') return 'Sunny Isles Beach';
    return '';
  }
  function num(v){ var n = parseFloat(String(v == null ? '' : v).replace(/[$,\s]/g, '')); return isFinite(n) && n > 0 ? n : 0; }

  /* ---------- the voter's answers, on this device only ---------- */
  function load(){
    try{ var o = JSON.parse(localStorage.getItem(KEY) || 'null'); return normalize(o); }catch(e){ return null; }
  }
  function normalize(o){
    if(!o || typeof o !== 'object') return null;
    var g = {};
    GROUPS.forEach(function(k){ if(o.groups && o.groups[k]) g[k] = true; });
    if(g.homestead && g.renter) delete g.renter;
    var pa = o.pa && typeof o.pa === 'object' ? { assessed: num(o.pa.assessed), countyTaxable: num(o.pa.countyTaxable), schoolTaxable: num(o.pa.schoolTaxable) } : null;
    return { groups: g, homeValue: num(o.homeValue), nsTax: num(o.nsTax), otherValue: num(o.otherValue),
      place: placeKey(o.place), pa: pa && pa.assessed ? pa : null };
  }
  function save(o){ var n = normalize(o); try{ localStorage.setItem(KEY, JSON.stringify(n)); }catch(e){} return n; }
  function clear(){ try{ localStorage.removeItem(KEY); }catch(e){} }
  function has(me, k){ return !!(me && me.groups && me.groups[k]); }
  function any(me){ return !!(me && (Object.keys(me.groups).length || me.homeValue || me.otherValue)); }

  /* ---------- official numbers, with their sources ---------- */
  var SRC = {
    senate: { name: 'Florida Senate, CS/HJR 1-F bill summary', url: 'https://flsenate.gov/Committees/BillSummaries/2026F/html/1' },
    edr: { name: 'Florida Office of Economic and Demographic Research, revenue impact (current exemption amounts)', url: 'https://edr.state.fl.us/Content/conferences/revenueimpact/archives/2026F/_pdf/impact0612.pdf' },
    county: { name: 'Miami-Dade County, Amendment 3 and County services', url: 'https://www.miamidade.gov/global/government/mayor/amendment-three/home.page' },
    school: { name: 'Miami-Dade County School Board, Resolution 26-023 (April 22, 2026)', url: 'https://pdfs.dadeschools.net/Bdarch/2026/Bd042226/agenda/H-12%20--%20Gallon%20--%2004.22.2026%20--%20Resolution%20No.%2026-023%20Referendum%20Renewal%20%20{Good%20Cause}.pdf' },
    pa: { name: 'Miami-Dade Property Appraiser, property search', url: 'https://apps.miamidadepa.gov/propertysearch/' }
  };
  // Amendment 3: today's homestead exemption from non-school taxes is the first $25,000 plus a second
  // exemption on value from $50,000 up to $76,411 (2026, inflation adjusted). EDR, June 12, 2026.
  var NS_SECOND_TOP = 76411;
  function currentNonSchoolExempt(A){ return Math.min(A, 25000) + Math.max(0, Math.min(A, NS_SECOND_TOP) - 50000); }
  // Miami-Dade County's own estimate, "at current tax rates"; and what County property taxes pay for now.
  var COUNTY_LOSS = { y2027: 385.8e6, full: 696.7e6 };
  var COUNTY_FUNDS = [
    { k: 'fire', amt: 743.7e6 },
    { k: 'roads', amt: 407.1e6 },
    { k: 'parks', amt: 130.8e6 },
    { k: 'libraries', amt: 128.5e6 },
    { k: 'community', amt: 66.4e6 },
    { k: 'animals', amt: 31e6 }
  ];
  // School levy: 1 mill ($1 per $1,000 of taxable value). Homesteads get $25,000 off for school taxes.
  var LEVY = { mills: 1, perYear: 585e6, teachers: 88, safety: 12, typical: 316 };

  function isAmend3(title){ return /homestead exemption/i.test(title) && /non-?homestead/i.test(title); }
  function isSchoolLevy(title){ return /levy for teachers/i.test(title) || (/school board/i.test(title) && /renewal of existing ad valorem levy/i.test(title)); }

  /* ---------- wording ---------- */
  var W = {
    en: {
      head: 'What this means for you', why: 'Why is this on the ballot?',
      intro: 'Add a few details and we’ll lay out what YES and NO would change for someone in your situation, and what public money and services ride on it. Your answers stay on this device. Nothing is sent or saved anywhere else.',
      start: 'Add my situation', edit: 'Edit my situation', clear: 'Clear my answers', saveBtn: 'Show what it means for me', cancel: 'Cancel',
      formHead: 'Check what applies to you. Skip anything you’d rather not say.',
      g: {
        homestead: 'I own the home I live in (homestead exemption)', owner_other: 'I own property I don’t live in (rental, second home, land, business property)',
        renter: 'I rent my home', business: 'I own a business', farm: 'I own or lease farmland, or run a farm or agritourism business',
        school_staff: 'I work for the school district',
        public_employee: 'I work for the county or a city (including police and fire)',
        senior: 'I’m 65 or older'
      },
      o: {
        homestead: 'Homeowners who live in their home', owner_other: 'Owners of property they don\u2019t live in', renter: 'Renters', business: 'Business owners',
        farm: 'Farmland owners and farm businesses', school_staff: 'School district employees',
        public_employee: 'County and city employees', senior: 'People 65 and older'
      },
      svc: { school_parent: 'Public schools', transit: 'Public transit', library: 'Public libraries', park_user: 'Public parks' },
      addr: {
        head: 'Fill in your values from your address',
        note: 'If you use this, your address goes to the Ballot305 server and on to the Miami-Dade Property Appraiser to find your property’s values. Ballot305 doesn’t keep it. You can skip this and type the numbers yourself.',
        street: 'Street address (like 123 NW 1 St)', unit: 'Unit (optional)', btn: 'Look up', looking: 'Looking up…',
        none: 'No property found at that address. Check the spelling, or type your values below.', pick: 'Pick your unit:',
        found: function(p){ return p.address + (p.municipality && p.address.toLowerCase().indexOf(p.municipality.toLowerCase()) < 0 ? ', ' + p.municipality : '') + ': assessed value ' + usd(p.assessed) + ' (' + p.year + ')' + (p.homestead ? ', with a homestead exemption.' : ', no homestead exemption.'); },
        home: 'This is my home (I live here)', other: 'I own it but don’t live here', filled: 'Filled in. Check the numbers below.'
      },
      homeValue: 'Your home’s assessed value', homeValueHelp: 'On your TRIM notice or the Property Appraiser’s site, the line called Assessed Value.',
      nsTax: 'Property taxes on your last bill, leaving out the School Board lines and non-ad valorem assessments (trash, etc.)', nsTaxHelp: 'Optional. Lets us estimate dollars, not just exempt value.',
      otherValue: 'Assessed value of the property you own but don’t live in', lookup: 'Look up your values',
      place: 'City you live in', placeFrom: function(p){ return 'Filled in from your precinct (' + p + ').'; }, placeNone: 'Not sure', placeUmsa: 'Unincorporated Miami-Dade', placeHelp: 'Shows which services your city runs and which the County runs, and, for owners, the 2026 tax rates. No address needed.',
      privacy: 'Saved on this device only.',
      ifYes: 'If YES wins', ifNo: 'If NO wins', forAll: 'For everyone', community: 'Effects on the whole community', when: 'When', everyone: 'Everyone it covers',
      forYou: 'For you', youSaid: 'You said: ', noneForYou: 'Official sources don’t describe anything this measure changes specifically for the situation you gave, beyond what it changes for everyone.',
      others: 'What it means for others in your community', money: 'Public money and services at stake',
      reconcileHead: 'Your taxes and the services they pay for', unknown: 'Not yet known',
      sources: 'Sources', disc: 'Plain-language consequences compiled with AI from the measure text and official sources, plus calculations from official figures. It does not say how to vote. Check anything that would change your vote against the linked sources.',
      loading: 'Researching what this measure changes, from official sources. This runs once per measure for everyone, usually under a minute; after that it opens instantly. Your address and answers are not part of it.', failed: 'Couldn\u2019t load this right now.', retry: 'Try again',
      approx: 'Estimate. Tax rates are set every year, so the real number will differ.',
      a3: {
        exempt: function(c, n27, n28){ return 'Today ' + usd(c) + ' of your home’s assessed value is exempt from non-school property taxes. With YES that becomes ' + usd(n27) + ' in 2027 and ' + usd(n28) + ' in 2028 (then it rises with inflation).'; },
        save: function(s27, s28, t){ return 'At today’s tax rates, your non-school property taxes of ' + usd(t) + ' a year would be about ' + usd(s27) + ' lower in 2027 and ' + usd(s28) + ' lower in 2028.'; },
        noTax: 'Pick your city above, or add the tax amount from your last bill, to see this in dollars.',
        now: function(ns, sc, y){ return 'At the ' + y + ' adopted tax rates, your home pays about ' + usd(ns) + ' a year in non-school property taxes and ' + usd(sc) + ' in school taxes.'; },
        umsa: 'Miami-Dade County, unincorporated area services (UMSA)', cityOf: function(n){ return 'City of ' + n; },
        county: 'Miami-Dade County, countywide', fireD: 'Miami-Dade Fire Rescue', libD: 'Miami-Dade Public Library System', trust: 'The Children’s Trust', regional: 'Water management and inland navigation districts',
        debt: 'Payments on voter-approved bonds (County and city)', debtNote: 'Bond payment rates are reset each year to cover the payments, so this part would shift to other taxpayers rather than go away.',
        splitHead: 'Who would collect less from you (2028, at 2026 rates)', notOnBill: 'Doesn\u2019t serve your city: your city runs its own',
        noValue: 'Add your home’s assessed value to see your own numbers.',
        no: 'With NO, your exemption stays as it is today. School taxes are not affected either way.',
        other: 'The yearly cap on increases in your property’s assessed value for non-school taxes drops from 10% to 5% starting in 2027. The homestead exemption doesn’t apply to property you don’t live in.',
        renter: 'Renters get no exemption from this. It lowers the yearly cap on assessment increases for rental property from 10% to 5%; whether that reaches rents is up to landlords and the market, and no official estimate says.',
        loss: function(lang){ return 'Miami-Dade County estimates it would collect about ' + big(COUNTY_LOSS.y2027, lang) + ' less in property taxes in the budget year starting October 2027, and about ' + big(COUNTY_LOSS.full, lang) + ' less every year once the $250,000 exemption is in place, at current tax rates. Your city and other local taxing districts would collect less too.'; },
        funds: 'What County property taxes pay for now:',
        f: { fire: 'Fire Rescue', roads: 'Transportation and public works (including part of the funding for 74 bus routes)', parks: 'Parks', libraries: 'Libraries', community: 'Community services (including meals for home-bound seniors)', animals: 'Animal services' },
        fundNote: 'Some cities run their own fire, parks or libraries instead of the County. Check who serves your address.',
        respond: 'If it passes, the County and your city decide how to cover the difference: spending cuts, reserves, other revenue, or higher tax rates within the law’s limits. The amendment also limits what counties and cities may spend property taxes on. Those choices are what your savings would be weighed against.',
        share: function(s){ return 'Your estimated ' + usd(s) + ' a year (2028) is your share of the money the County, your city and other local taxing districts would no longer collect.'; }
      },
      lv: {
        pay: function(p){ return 'You pay about ' + usd(p) + ' a year for this levy now, on your home.'; },
        payOther: function(p){ return 'About ' + usd(p) + ' a year on the property you don’t live in.'; },
        yes: 'With YES you keep paying it from July 1, 2027 through June 30, 2031. It renews the current levy, so it is not a new tax.',
        no: 'With NO the levy ends after June 30, 2027 and you stop paying it.',
        noValue: 'Add your home’s assessed value to see what you pay for it.',
        typical: 'The School Board puts the typical homeowner’s cost at less than $' + 316 + ' a year.',
        district: function(lang){ return 'The School Board estimates the levy raises about ' + big(LEVY.perYear, lang) + ' a year. Under the current levy, ' + LEVY.teachers + '% goes to teacher pay and ' + LEVY.safety + '% to school safety, mainly an officer at every school. Charter schools get a share by enrollment.'; },
        ifNo: 'If it isn’t renewed, the School Board says the teacher pay supplements it funds would end, and it could not keep an officer at every school from bell to bell without cutting into educational programs.'
      }
    },
    es: {
      head: 'Lo que significa para usted', why: '¿Por qué está esto en la boleta?',
      intro: 'Agregue algunos datos y le mostraremos lo que el SÍ y el NO cambiarían para alguien en su situación, y qué dinero y servicios públicos dependen de ello. Sus respuestas se quedan en este dispositivo. No se envían ni se guardan en ningún otro lugar.',
      start: 'Agregar mi situación', edit: 'Editar mi situación', clear: 'Borrar mis respuestas', saveBtn: 'Mostrar lo que significa para mí', cancel: 'Cancelar',
      formHead: 'Marque lo que aplica a usted. Omita lo que prefiera no decir.',
      g: {
        homestead: 'Soy dueño de la casa donde vivo (exención homestead)', owner_other: 'Tengo una propiedad donde no vivo (alquiler, segunda casa, terreno, local comercial)',
        renter: 'Alquilo mi vivienda', business: 'Tengo un negocio', farm: 'Soy dueño o arrendatario de tierras agrícolas, o tengo una finca o negocio de agroturismo',
        school_staff: 'Trabajo para el distrito escolar',
        public_employee: 'Trabajo para el condado o una ciudad (incluida policía y bomberos)',
        senior: 'Tengo 65 años o más'
      },
      o: {
        homestead: 'Dueños que viven en su vivienda', owner_other: 'Dueños de propiedades donde no viven', renter: 'Inquilinos', business: 'Dueños de negocios',
        farm: 'Dueños de tierras agrícolas y negocios agrícolas', school_staff: 'Empleados del distrito escolar',
        public_employee: 'Empleados del condado y de las ciudades', senior: 'Personas de 65 años o más'
      },
      svc: { school_parent: 'Escuelas públicas', transit: 'Transporte público', library: 'Bibliotecas públicas', park_user: 'Parques públicos' },
      addr: {
        head: 'Complete sus valores con su dirección',
        note: 'Si usa esto, su dirección va al servidor de Ballot305 y de ahí al Tasador de Propiedades de Miami-Dade para buscar los valores de su propiedad. Ballot305 no la guarda. Puede omitir esto y escribir las cifras usted mismo.',
        street: 'Dirección (por ejemplo 123 NW 1 St)', unit: 'Unidad (opcional)', btn: 'Buscar', looking: 'Buscando…',
        none: 'No se encontró ninguna propiedad en esa dirección. Revise cómo la escribió o escriba sus valores abajo.', pick: 'Elija su unidad:',
        found: function(p){ return p.address + (p.municipality && p.address.toLowerCase().indexOf(p.municipality.toLowerCase()) < 0 ? ', ' + p.municipality : '') + ': valor tasado ' + usd(p.assessed) + ' (' + p.year + ')' + (p.homestead ? ', con exención homestead.' : ', sin exención homestead.'); },
        home: 'Es mi casa (vivo aquí)', other: 'Soy dueño pero no vivo aquí', filled: 'Listo. Revise las cifras abajo.'
      },
      homeValue: 'Valor tasado (Assessed Value) de su vivienda', homeValueHelp: 'En su aviso TRIM o en el sitio del Tasador de Propiedades, la línea Assessed Value.',
      nsTax: 'Impuestos a la propiedad de su última factura, sin las líneas del School Board ni los cargos que no son ad valorem (basura, etc.)', nsTaxHelp: 'Opcional. Nos permite estimar dólares, no solo el valor exento.',
      otherValue: 'Valor tasado de la propiedad donde no vive', lookup: 'Busque sus valores',
      place: 'Ciudad donde vive', placeFrom: function(p){ return 'Completado según su precinto (' + p + ').'; }, placeNone: 'No estoy seguro', placeUmsa: 'Miami-Dade no incorporado', placeHelp: 'Muestra qué servicios presta su ciudad y cuáles el Condado y, para propietarios, las tasas de impuestos de 2026. No hace falta la dirección.',
      privacy: 'Guardado solo en este dispositivo.',
      ifYes: 'Si gana el SÍ', ifNo: 'Si gana el NO', forAll: 'Para todos', community: 'Efectos en toda la comunidad', when: 'Cuándo', everyone: 'Para todos los que abarca',
      forYou: 'Para usted', youSaid: 'Usted indicó: ', noneForYou: 'Las fuentes oficiales no describen nada que esta medida cambie específicamente para la situación que indicó, más allá de lo que cambia para todos.',
      others: 'Lo que significa para otros en su comunidad', money: 'Dinero y servicios públicos en juego',
      reconcileHead: 'Sus impuestos y los servicios que pagan', unknown: 'Aún no se sabe',
      sources: 'Fuentes', disc: 'Consecuencias en lenguaje sencillo, compiladas con IA a partir del texto de la medida y fuentes oficiales, más cálculos con cifras oficiales. No indica cómo votar. Verifique con las fuentes enlazadas todo lo que podría cambiar su voto.',
      loading: 'Investigando qué cambia esta medida, con fuentes oficiales. Se hace una sola vez por medida para todos, normalmente en menos de un minuto; después abre al instante. Su dirección y sus respuestas no se usan para esto.', failed: 'No se pudo cargar en este momento.', retry: 'Intentar de nuevo',
      approx: 'Estimado. Las tasas de impuestos se fijan cada año, así que la cifra real será distinta.',
      a3: {
        exempt: function(c, n27, n28){ return 'Hoy ' + usd(c) + ' del valor tasado de su vivienda está exento de los impuestos a la propiedad que no son escolares. Con el SÍ serían ' + usd(n27) + ' en 2027 y ' + usd(n28) + ' en 2028 (luego sube con la inflación).'; },
        save: function(s27, s28, t){ return 'Con las tasas de hoy, sus impuestos no escolares de ' + usd(t) + ' al año bajarían unos ' + usd(s27) + ' en 2027 y ' + usd(s28) + ' en 2028.'; },
        noTax: 'Elija su ciudad arriba, o agregue el monto de impuestos de su última factura, para verlo en dólares.',
        now: function(ns, sc, y){ return 'Con las tasas adoptadas para ' + y + ', su vivienda paga unos ' + usd(ns) + ' al año en impuestos a la propiedad no escolares y ' + usd(sc) + ' en impuestos escolares.'; },
        umsa: 'Condado de Miami-Dade, servicios del área no incorporada (UMSA)', cityOf: function(n){ return 'Ciudad de ' + n; },
        county: 'Condado de Miami-Dade, todo el condado', fireD: 'Bomberos y Rescate de Miami-Dade', libD: 'Sistema de Bibliotecas Públicas de Miami-Dade', trust: 'The Children’s Trust', regional: 'Distritos de manejo de agua y navegación interior',
        debt: 'Pagos de bonos aprobados por los votantes (Condado y ciudad)', debtNote: 'Las tasas para pagar bonos se ajustan cada año para cubrir los pagos, así que esta parte pasaría a otros contribuyentes en vez de desaparecer.',
        splitHead: 'Quién le cobraría menos (2028, con tasas de 2026)', notOnBill: 'No presta servicio en su ciudad: su ciudad tiene el suyo',
        noValue: 'Agregue el valor tasado de su vivienda para ver sus propias cifras.',
        no: 'Con el NO, su exención queda como está hoy. Los impuestos escolares no cambian en ningún caso.',
        other: 'El tope anual de aumento del valor tasado de su propiedad para impuestos no escolares baja del 10% al 5% a partir de 2027. La exención homestead no aplica a propiedades donde usted no vive.',
        renter: 'Los inquilinos no reciben ninguna exención con esto. Baja del 10% al 5% el tope anual de aumento de la tasación de propiedades de alquiler; si eso llega a los alquileres depende de los dueños y del mercado, y ninguna estimación oficial lo dice.',
        loss: function(lang){ return 'El Condado de Miami-Dade estima que recaudaría unos ' + big(COUNTY_LOSS.y2027, lang) + ' menos en impuestos a la propiedad en el año presupuestario que empieza en octubre de 2027, y unos ' + big(COUNTY_LOSS.full, lang) + ' menos cada año cuando la exención de $250,000 esté en vigor, con las tasas actuales. Su ciudad y otros distritos locales también recaudarían menos.'; },
        funds: 'Lo que pagan hoy los impuestos a la propiedad del Condado:',
        f: { fire: 'Bomberos y Rescate', roads: 'Transporte y obras públicas (incluida parte del financiamiento de 74 rutas de autobús)', parks: 'Parques', libraries: 'Bibliotecas', community: 'Servicios comunitarios (incluidas comidas para personas mayores en casa)', animals: 'Servicios de animales' },
        fundNote: 'Algunas ciudades tienen sus propios bomberos, parques o bibliotecas en vez del Condado. Verifique quién atiende su dirección.',
        respond: 'Si se aprueba, el Condado y su ciudad deciden cómo cubrir la diferencia: recortes de gastos, reservas, otros ingresos o tasas más altas dentro de los límites de la ley. La enmienda también limita en qué pueden gastar los condados y ciudades los impuestos a la propiedad. Contra esas decisiones se compara su ahorro.',
        share: function(s){ return 'Su ahorro estimado de ' + usd(s) + ' al año (2028) es su parte del dinero que el Condado, su ciudad y otros distritos locales dejarían de recaudar.'; }
      },
      lv: {
        pay: function(p){ return 'Hoy paga unos ' + usd(p) + ' al año por este impuesto, sobre su vivienda.'; },
        payOther: function(p){ return 'Unos ' + usd(p) + ' al año sobre la propiedad donde no vive.'; },
        yes: 'Con el SÍ lo sigue pagando del 1 de julio de 2027 al 30 de junio de 2031. Renueva el impuesto actual, así que no es un impuesto nuevo.',
        no: 'Con el NO el impuesto termina después del 30 de junio de 2027 y deja de pagarlo.',
        noValue: 'Agregue el valor tasado de su vivienda para ver cuánto paga por esto.',
        typical: 'La Junta Escolar calcula que al propietario típico le cuesta menos de $316 al año.',
        district: function(lang){ return 'La Junta Escolar estima que el impuesto recauda unos ' + big(LEVY.perYear, lang) + ' al año. Con el impuesto actual, el ' + LEVY.teachers + '% va a salarios de maestros y el ' + LEVY.safety + '% a seguridad escolar, principalmente un oficial en cada escuela. Las escuelas chárter reciben una parte según su matrícula.'; },
        ifNo: 'Si no se renueva, la Junta Escolar dice que terminarían los suplementos salariales de maestros que paga, y que no podría mantener un oficial en cada escuela durante todo el horario escolar sin afectar los programas educativos.'
      }
    },
    ht: {
      head: 'Sa sa vle di pou ou', why: 'Poukisa sa a sou bilten vòt la?',
      intro: 'Ajoute kèk detay epi n ap montre w sa WI ak NON ta chanje pou yon moun nan sitiyasyon w, ak ki lajan piblik ak sèvis piblik ki depann de sa. Repons ou yo rete sou aparèy sa a. Yo pa voye yo ni sere yo okenn lòt kote.',
      start: 'Ajoute sitiyasyon m', edit: 'Chanje sitiyasyon m', clear: 'Efase repons mwen yo', saveBtn: 'Montre m sa sa vle di pou mwen', cancel: 'Anile',
      formHead: 'Make sa ki aplike pou ou. Kite sa ou pa vle di.',
      g: {
        homestead: 'Mwen se pwopriyetè kay mwen rete a (egzanpsyon homestead)', owner_other: 'Mwen gen yon pwopriyete mwen pa rete ladan l (lokasyon, dezyèm kay, tè, lokal biznis)',
        renter: 'Mwen lwe kay mwen', business: 'Mwen gen yon biznis', farm: 'Mwen posede oswa lwe tè agrikòl, oswa mwen gen yon fèm oswa biznis agwotouris',
        school_staff: 'Mwen travay pou distri lekòl la',
        public_employee: 'Mwen travay pou konte a oswa yon vil (sa gen ladan l lapolis ak ponpye)',
        senior: 'Mwen gen 65 an oswa plis'
      },
      o: {
        homestead: 'Pwopriyetè ki rete nan kay yo', owner_other: 'Pwopriyetè ki gen pwopriyete yo pa rete ladan l', renter: 'Lokatè', business: 'Pwopriyetè biznis',
        farm: 'Pwopriyetè tè agrikòl ak biznis agrikòl', school_staff: 'Anplwaye distri lekòl la',
        public_employee: 'Anplwaye konte a ak vil yo', senior: 'Moun 65 an oswa plis'
      },
      svc: { school_parent: 'Lekòl piblik', transit: 'Transpò piblik', library: 'Bibliyotèk piblik', park_user: 'Pak piblik' },
      addr: {
        head: 'Ranpli valè ou yo ak adrès ou',
        note: 'Si w sèvi ak sa, adrès ou ale sou sèvè Ballot305 epi soti la ale kay Evalyatè Pwopriyete Miami-Dade pou jwenn valè pwopriyete w. Ballot305 pa kenbe l. Ou ka sote sa epi tape chif yo ou menm.',
        street: 'Adrès (tankou 123 NW 1 St)', unit: 'Inite (si genyen)', btn: 'Chèche', looking: 'N ap chèche…',
        none: 'Nou pa jwenn okenn pwopriyete nan adrès sa a. Verifye kijan w ekri l, oswa tape valè ou yo anba a.', pick: 'Chwazi inite ou:',
        found: function(p){ return p.address + (p.municipality && p.address.toLowerCase().indexOf(p.municipality.toLowerCase()) < 0 ? ', ' + p.municipality : '') + ': valè evalyasyon ' + usd(p.assessed) + ' (' + p.year + ')' + (p.homestead ? ', avèk egzanpsyon homestead.' : ', san egzanpsyon homestead.'); },
        home: 'Se kay mwen (mwen rete la)', other: 'Se pou mwen men mwen pa rete la', filled: 'Li ranpli. Verifye chif yo anba a.'
      },
      homeValue: 'Valè evalyasyon (Assessed Value) kay ou', homeValueHelp: 'Sou avi TRIM ou oswa sou sit Evalyatè Pwopriyete a, liy ki rele Assessed Value.',
      nsTax: 'Taks pwopriyete sou dènye fakti w, san liy School Board yo ak frè ki pa ad valorem yo (fatra, elatriye)', nsTaxHelp: 'Si w vle. Sa pèmèt nou estime an dola, pa sèlman valè ki egzante.',
      otherValue: 'Valè evalyasyon pwopriyete ou pa rete ladan l', lookup: 'Chèche valè ou yo',
      place: 'Vil kote w rete', placeFrom: function(p){ return 'Ranpli dapre pwesen ou (' + p + ').'; }, placeNone: 'Mwen pa sèten', placeUmsa: 'Miami-Dade ki pa enkòpore', placeHelp: 'Li montre ki sèvis vil ou bay ak ki sa Konte a bay, epi pou pwopriyetè, to taks 2026 yo. Ou pa bezwen bay adrès.',
      privacy: 'Sere sou aparèy sa a sèlman.',
      ifYes: 'Si WI genyen', ifNo: 'Si NON genyen', forAll: 'Pou tout moun', community: 'Efè sou tout kominote a', when: 'Kilè', everyone: 'Pou tout moun li kouvri',
      forYou: 'Pou ou', youSaid: 'Ou di: ', noneForYou: 'Sous ofisyèl yo pa dekri anyen mezi sa a chanje espesyalman pou sitiyasyon ou bay la, pi lwen pase sa li chanje pou tout moun.',
      others: 'Sa sa vle di pou lòt moun nan kominote w', money: 'Lajan piblik ak sèvis ki an jwèt',
      reconcileHead: 'Taks ou ak sèvis yo peye', unknown: 'Nou poko konnen',
      sources: 'Sous', disc: 'Konsekans an langaj senp, ki fèt ak èd entèlijans atifisyèl apati tèks mezi a ak sous ofisyèl, plis kalkil ak chif ofisyèl. Li pa di w kijan pou w vote. Verifye nan sous ki gen lyen yo nenpòt bagay ki ta ka chanje vòt ou.',
      loading: 'N ap chèche sa mezi sa a chanje, nan sous ofisyèl. Sa fèt yon sèl fwa pou chak mezi pou tout moun, anjeneral mwens pase yon minit; apre sa li louvri touswit. Adrès ou ak repons ou yo pa ladan l.', failed: 'Nou pa ka chaje sa kounye a.', retry: 'Eseye ankò',
      approx: 'Estimasyon. To taks yo fikse chak ane, kidonk vrè chif la ap diferan.',
      a3: {
        exempt: function(c, n27, n28){ return 'Jodi a ' + usd(c) + ' nan valè evalyasyon kay ou egzante de taks pwopriyete ki pa pou lekòl. Avèk WI sa vin ' + usd(n27) + ' an 2027 ak ' + usd(n28) + ' an 2028 (apre sa li monte ak enflasyon).'; },
        save: function(s27, s28, t){ return 'Ak to taks jodi a, taks ki pa pou lekòl ou yo, ' + usd(t) + ' pa ane, ta bese anviwon ' + usd(s27) + ' an 2027 ak ' + usd(s28) + ' an 2028.'; },
        noTax: 'Chwazi vil ou anlè a, oswa ajoute montan taks sou dènye fakti w, pou w wè sa an dola.',
        now: function(ns, sc, y){ return 'Ak to taks ki adopte pou ' + y + ' yo, kay ou peye anviwon ' + usd(ns) + ' pa ane an taks pwopriyete ki pa pou lekòl ak ' + usd(sc) + ' an taks lekòl.'; },
        umsa: 'Konte Miami-Dade, sèvis zòn ki pa enkòpore (UMSA)', cityOf: function(n){ return 'Vil ' + n; },
        county: 'Konte Miami-Dade, tout konte a', fireD: 'Ponpye ak Sekou Miami-Dade', libD: 'Sistèm Bibliyotèk Piblik Miami-Dade', trust: 'The Children’s Trust', regional: 'Distri jesyon dlo ak navigasyon andedan',
        debt: 'Peman sou obligasyon votè yo te apwouve (Konte ak vil)', debtNote: 'To pou peye obligasyon yo ajiste chak ane pou kouvri peman yo, kidonk pati sa a ta pase sou lòt kontribyab olye li disparèt.',
        splitHead: 'Kiyès ki ta kolekte mwens nan men w (2028, ak to 2026)', notOnBill: 'Li pa sèvi vil ou: vil ou gen pa l',
        noValue: 'Ajoute valè evalyasyon kay ou pou w wè pwòp chif ou.',
        no: 'Avèk NON, egzanpsyon w rete jan li ye jodi a. Taks lekòl yo pa chanje nan okenn ka.',
        other: 'Plafon chak ane sou ogmantasyon valè evalyasyon pwopriyete w pou taks ki pa pou lekòl desann soti 10% rive 5% apati 2027. Egzanpsyon homestead pa aplike pou pwopriyete ou pa rete ladan l.',
        renter: 'Lokatè pa jwenn okenn egzanpsyon nan sa. Li desann plafon chak ane sou ogmantasyon evalyasyon pwopriyete lokasyon soti 10% rive 5%; si sa rive sou lwaye a depann de pwopriyetè yo ak mache a, e okenn estimasyon ofisyèl pa di sa.',
        loss: function(lang){ return 'Konte Miami-Dade estime li ta kolekte anviwon ' + big(COUNTY_LOSS.y2027, lang) + ' mwens nan taks pwopriyete pou ane bidjè ki kòmanse oktòb 2027, ak anviwon ' + big(COUNTY_LOSS.full, lang) + ' mwens chak ane lè egzanpsyon $250,000 la an plas, ak to taks aktyèl yo. Vil ou ak lòt distri lokal ta kolekte mwens tou.'; },
        funds: 'Sa taks pwopriyete Konte a peye jodi a:',
        f: { fire: 'Ponpye ak Sekou', roads: 'Transpò ak travay piblik (sa gen ladan l yon pati nan finansman 74 liy bis)', parks: 'Pak', libraries: 'Bibliyotèk', community: 'Sèvis kominotè (sa gen ladan l manje pou granmoun ki pa ka soti lakay yo)', animals: 'Sèvis pou bèt' },
        fundNote: 'Gen kèk vil ki gen pwòp ponpye, pak oswa bibliyotèk yo olye Konte a. Verifye kiyès ki sèvi adrès ou.',
        respond: 'Si li pase, Konte a ak vil ou deside kijan pou yo kouvri diferans lan: koupe depans, rezèv, lòt revni, oswa to taks pi wo nan limit lalwa. Amannman an limite tou sa konte ak vil ka depanse taks pwopriyete pou li. Se desizyon sa yo ekonomi w ap konpare avè l.',
        share: function(s){ return 'Ekonomi ou estime a, ' + usd(s) + ' pa ane (2028), se pati pa w nan lajan Konte a, vil ou ak lòt distri lokal yo pa ta kolekte ankò.'; }
      },
      lv: {
        pay: function(p){ return 'Jodi a ou peye anviwon ' + usd(p) + ' pa ane pou taks sa a, sou kay ou.'; },
        payOther: function(p){ return 'Anviwon ' + usd(p) + ' pa ane sou pwopriyete ou pa rete ladan l.'; },
        yes: 'Avèk WI ou kontinye peye l soti 1ye jiyè 2027 rive 30 jen 2031. Li renouvle taks ki egziste deja a, kidonk se pa yon nouvo taks.',
        no: 'Avèk NON taks la fini apre 30 jen 2027 epi ou sispann peye l.',
        noValue: 'Ajoute valè evalyasyon kay ou pou w wè konbyen ou peye pou sa.',
        typical: 'Komisyon Lekòl la di sa koute yon pwopriyetè tipik mwens pase $316 pa ane.',
        district: function(lang){ return 'Komisyon Lekòl la estime taks la rapòte anviwon ' + big(LEVY.perYear, lang) + ' pa ane. Avèk taks aktyèl la, ' + LEVY.teachers + '% ale nan salè pwofesè ak ' + LEVY.safety + '% nan sekirite lekòl, sitou yon ofisye nan chak lekòl. Lekòl chartè yo jwenn yon pati selon kantite elèv yo.'; },
        ifNo: 'Si yo pa renouvle l, Komisyon Lekòl la di siplemantè salè pwofesè li peye yo ta fini, e li pa ta ka kenbe yon ofisye nan chak lekòl pandan tout jounen lekòl la san l pa touche pwogram edikasyon yo.'
      }
    }
  };
  // One or two plain lines per side for the summary boxes. Details go in the expanders.
  var SUM = {
    en: {
      a3Save: function(a, b){ return 'You’d pay about ' + usd(a) + ' less in 2027 and ' + usd(b) + ' less a year from 2028.'; },
      a3Gov: function(b){ return 'Your city, the County and other local districts would collect that ' + usd(b) + ' less from you, at today’s rates.'; },
      a3Same: 'Your property taxes and exemption stay as they are.',
      a3GovSame: 'Local governments keep collecting what they do today.',
      a3Renter: 'What you pay doesn’t change directly.',
      a3All: function(lang){ return 'Local governments would collect less: the County estimates about ' + big(COUNTY_LOSS.full, lang) + ' a year less for itself from 2028, plus what cities and other districts lose. That money now pays for fire rescue, transit and roads, parks, libraries and senior services: services the whole community shares, whether or not a person uses them directly.'; },
      a3AllNo: 'Local services keep the property tax money they have today.',
      a3Other: 'Yearly increases in the taxed value of property you don’t live in are capped at 5% instead of 10%.',
      a3OtherNo: 'The 10% yearly cap stays.',
      lvKeep: function(p){ return 'You keep paying about ' + usd(p) + ' a year for it, through June 2031.'; },
      lvStop: function(p){ return 'You stop paying about ' + usd(p) + ' a year after June 2027.'; },
      lvDistKeep: function(lang){ return 'The school district keeps about ' + big(LEVY.perYear, lang) + ' a year for teacher pay and school officers.'; },
      lvDistLose: function(lang){ return 'The school district loses about ' + big(LEVY.perYear, lang) + ' a year that now pays for teacher pay and school officers.'; }
    },
    es: {
      a3Save: function(a, b){ return 'Pagaría unos ' + usd(a) + ' menos en 2027 y ' + usd(b) + ' menos al año desde 2028.'; },
      a3Gov: function(b){ return 'Su ciudad, el Condado y otros distritos locales le cobrarían esos ' + usd(b) + ' menos, con las tasas de hoy.'; },
      a3Same: 'Sus impuestos a la propiedad y su exención quedan como están.',
      a3GovSame: 'Los gobiernos locales siguen recaudando lo mismo que hoy.',
      a3Renter: 'Lo que usted paga no cambia directamente.',
      a3All: function(lang){ return 'Los gobiernos locales recaudarían menos: el Condado estima unos ' + big(COUNTY_LOSS.full, lang) + ' al año menos para sí mismo desde 2028, más lo que pierdan las ciudades y otros distritos. Ese dinero hoy paga bomberos y rescate, transporte y calles, parques, bibliotecas y servicios para personas mayores: servicios que comparte toda la comunidad, los use o no cada persona.'; },
      a3AllNo: 'Los servicios locales mantienen el dinero de impuestos a la propiedad que tienen hoy.',
      a3Other: 'Los aumentos anuales del valor gravable de propiedades donde no vive tendrían un tope del 5% en vez del 10%.',
      a3OtherNo: 'El tope anual del 10% se mantiene.',
      lvKeep: function(p){ return 'Sigue pagando unos ' + usd(p) + ' al año por esto, hasta junio de 2031.'; },
      lvStop: function(p){ return 'Deja de pagar unos ' + usd(p) + ' al año después de junio de 2027.'; },
      lvDistKeep: function(lang){ return 'El distrito escolar mantiene unos ' + big(LEVY.perYear, lang) + ' al año para salarios de maestros y oficiales escolares.'; },
      lvDistLose: function(lang){ return 'El distrito escolar pierde unos ' + big(LEVY.perYear, lang) + ' al año que hoy pagan salarios de maestros y oficiales escolares.'; }
    },
    ht: {
      a3Save: function(a, b){ return 'Ou ta peye anviwon ' + usd(a) + ' mwens an 2027 ak ' + usd(b) + ' mwens chak ane apati 2028.'; },
      a3Gov: function(b){ return 'Vil ou, Konte a ak lòt distri lokal ta kolekte ' + usd(b) + ' sa a mwens nan men w, ak to jodi a.'; },
      a3Same: 'Taks pwopriyete w ak egzanpsyon w rete jan yo ye.',
      a3GovSame: 'Gouvènman lokal yo kontinye kolekte sa yo kolekte jodi a.',
      a3Renter: 'Sa w peye pa chanje dirèkteman.',
      a3All: function(lang){ return 'Gouvènman lokal yo ta kolekte mwens: Konte a estime anviwon ' + big(COUNTY_LOSS.full, lang) + ' mwens pa ane pou tèt li apati 2028, plis sa vil yo ak lòt distri pèdi. Lajan sa a peye ponpye ak sekou, transpò ak wout, pak, bibliyotèk ak sèvis pou granmoun jodi a: sèvis tout kominote a pataje, kit yon moun sèvi ak yo dirèkteman kit non.'; },
      a3AllNo: 'Sèvis lokal yo kenbe lajan taks pwopriyete yo genyen jodi a.',
      a3Other: 'Ogmantasyon chak ane nan valè taksab pwopriyete ou pa rete ladan l ta gen plafon 5% olye 10%.',
      a3OtherNo: 'Plafon 10% chak ane a rete.',
      lvKeep: function(p){ return 'Ou kontinye peye anviwon ' + usd(p) + ' pa ane pou sa, jiska jen 2031.'; },
      lvStop: function(p){ return 'Ou sispann peye anviwon ' + usd(p) + ' pa ane apre jen 2027.'; },
      lvDistKeep: function(lang){ return 'Distri lekòl la kenbe anviwon ' + big(LEVY.perYear, lang) + ' pa ane pou salè pwofesè ak ofisye lekòl yo.'; },
      lvDistLose: function(lang){ return 'Distri lekòl la pèdi anviwon ' + big(LEVY.perYear, lang) + ' pa ane ki peye salè pwofesè ak ofisye lekòl jodi a.'; }
    }
  };
  function sumWords(lang){ return SUM[lang] || SUM.en; }
  function words(lang){ return W[lang] || W.en; }

  /* ---------- the calculations official numbers support ---------- */
  // Returns { yes: [...], no: [...], reconcile: {...} } in plain data; the page turns it into HTML.
  // Today's taxes on the voter's home at the 2026 adopted rates, split by who collects them.
  // Taxable values come from the Property Appraiser lookup when the voter used it for this value,
  // otherwise from the assessed value and the homestead exemption.
  function homeTaxes(me){
    var M = rates(), A = me.homeValue, P = M && me.place ? M.places[me.place] : null;
    if(!A || !P) return null;
    var S = M.shared, pa = me.pa && me.pa.assessed === A ? me.pa : null;
    var ns = pa ? pa.countyTaxable : Math.max(0, A - currentNonSchoolExempt(A));
    var sc = pa ? pa.schoolTaxable : Math.max(0, A - 25000);
    var mills = {
      city: P.city, cityDebt: P.cityDebt, county: S.county, countyDebt: S.countyDebt,
      fire: P.fire ? S.fire : 0, library: P.library ? S.library : 0, trust: S.trust, regional: S.regional + S.find
    };
    var nsMills = 0; Object.keys(mills).forEach(function(k){ nsMills += mills[k]; });
    return { place: me.place, P: P, mills: mills, nsMills: nsMills, nsTaxable: ns, schoolTaxable: sc,
      nsTax: ns * nsMills / 1000, schoolTax: sc * (S.schoolOps + S.schoolVoted + S.schoolDebt) / 1000 };
  }
  function amend3(me, lang){
    var w = words(lang).a3, M = rates();
    var out = { yes: [], no: [], approx: false, reconcile: null, sources: [SRC.senate, SRC.edr, SRC.county] };
    var A = me.homeValue, s28 = 0, split = null;
    if(has(me, 'homestead')){
      if(A){
        var c = currentNonSchoolExempt(A), n27 = Math.min(A, 150000), n28 = Math.min(A, 250000);
        out.yes.push(w.exempt(c, n27, n28));
        var T = homeTaxes(me);
        if(T){
          // extra exempt value, never more than what is taxed today, at each authority's 2026 rate
          var d27 = Math.min(T.nsTaxable, Math.max(0, n27 - c)), d28 = Math.min(T.nsTaxable, Math.max(0, n28 - c));
          var s27 = d27 * T.nsMills / 1000; s28 = d28 * T.nsMills / 1000;
          out.yes.push(w.now(T.nsTax, T.schoolTax, M.year));
          out.yes.push(w.save(s27, s28, T.nsTax));
          var part = function(m){ return Math.round(d28 * m / 1000); };
          var cityName = T.place === 'Unincorporated' ? w.umsa : w.cityOf(T.place);
          split = [
            { label: cityName, amount: part(T.mills.city) },
            { label: w.county, amount: part(T.mills.county) },
            T.mills.fire ? { label: w.fireD, amount: part(T.mills.fire) } : null,
            T.mills.library ? { label: w.libD, amount: part(T.mills.library) } : null,
            { label: w.trust, amount: part(T.mills.trust) },
            { label: w.regional, amount: part(T.mills.regional) },
            { label: w.debt, amount: part(T.mills.cityDebt + T.mills.countyDebt), note: w.debtNote }
          ].filter(function(x){ return x && x.amount > 0; });
          out.approx = true;
          out.savings = { y2027: Math.round(s27), y2028: Math.round(s28) };
          out.sources.push(M.source);
        } else if(me.nsTax){
          // no city picked: the effective rate on the bill the voter typed in
          var base = A - c, rate = base > 0 ? me.nsTax / base : 0;
          var t27 = Math.min(me.nsTax, Math.max(0, n27 - c) * rate);
          s28 = Math.min(me.nsTax, Math.max(0, n28 - c) * rate);
          out.yes.push(w.save(t27, s28, me.nsTax));
          out.approx = true;
          out.savings = { y2027: Math.round(t27), y2028: Math.round(s28) };
        } else out.yes.push(w.noTax);
      } else out.yes.push(w.noValue);
      out.no.push(w.no);
    }
    if(has(me, 'owner_other')) out.yes.push(w.other);
    if(has(me, 'renter')) out.yes.push(w.renter);
    var U = sumWords(lang);
    // yes/no: for this voter; allYes/allNo: for everyone, whether or not they use the services
    out.summary = { yes: [], no: [], allYes: [U.a3All(lang)], allNo: [U.a3AllNo] };
    if(out.savings){ out.summary.yes.push(U.a3Save(out.savings.y2027, out.savings.y2028), U.a3Gov(out.savings.y2028)); out.summary.no.push(U.a3Same); }
    else if(has(me, 'homestead')){ out.summary.no.push(U.a3Same); }
    else if(has(me, 'renter')){ out.summary.yes.push(U.a3Renter); }
    if(has(me, 'owner_other')){ out.summary.yes.push(U.a3Other); out.summary.no.push(U.a3OtherNo); }
    var P = M && me.place ? M.places[me.place] : null;
    out.reconcile = {
      splitHead: split ? w.splitHead : '', split: split || [],
      loss: w.loss(lang),
      fundsHead: w.funds,
      funds: COUNTY_FUNDS.map(function(f){
        // whether the County service is on this voter's bill at all (some cities run their own)
        var on = !P ? null : f.k === 'fire' ? P.fire : f.k === 'libraries' ? P.library : true;
        return { label: w.f[f.k], amount: big(f.amt, lang),
          note: on === false ? w.notOnBill : '' };
      }),
      fundNote: P ? '' : w.fundNote,
      respond: w.respond,
      share: s28 && !split ? w.share(s28) : ''
    };
    return out;
  }
  function schoolLevy(me, lang){
    var w = words(lang).lv, out = { yes: [], no: [], approx: false, reconcile: null, sources: [SRC.school] };
    var paid = false;
    if(has(me, 'homestead')){
      if(me.homeValue){
        var sc = me.pa && me.pa.assessed === me.homeValue ? me.pa.schoolTaxable : Math.max(0, me.homeValue - 25000);
        var p = sc * LEVY.mills / 1000; out.yes.push(w.pay(p)); out.payHome = Math.round(p); paid = true;
      }
      else out.yes.push(w.noValue);
    }
    if(has(me, 'owner_other') && me.otherValue){ var q = me.otherValue * LEVY.mills / 1000; out.yes.push(w.payOther(q)); out.payOther = Math.round(q); paid = true; }
    if(paid){ out.yes.push(w.yes); out.no.push(w.no); out.approx = true; }
    var U = sumWords(lang), tot = (out.payHome || 0) + (out.payOther || 0);
    out.summary = { yes: [], no: [], allYes: [U.lvDistKeep(lang)], allNo: [U.lvDistLose(lang)] };
    if(paid){ out.summary.yes.push(U.lvKeep(tot)); out.summary.no.push(U.lvStop(tot)); }
    if(!paid && !has(me, 'homestead')) out.yes.push(w.typical);
    out.reconcile = {
      splitHead: '', split: [],
      loss: w.district(lang),
      fundsHead: '', funds: [],
      fundNote: '',
      respond: w.ifNo
    };
    return out;
  }
  // Amendment 1, Florida's rainy-day fund. Nothing in it is personal, so it is explained the same way
  // for everyone, in plain words, with the numbers that give it scale. Florida TaxWatch's guide is the
  // source for the balance and projections; the joint resolution (HJR 5019, 2025) for the rules.
  var BSF = { balance: 5.056e9, share: 9.75, transfer: 750e6, gr: 51.9e9, reach: 2049, added: 16.4e9 };
  var A1SRC = [
    { name: 'Florida TaxWatch, Taxpayer’s Guide to the 2026 Constitutional Amendments', url: 'https://floridataxwatch.org/the-florida-taxpayers-guide-for-the-2026-constitutional-amendments/' },
    { name: 'Florida Senate, HJR 5019 (2025) bill history', url: 'https://www.flsenate.gov/Session/Bill/2025/5019' },
    { name: 'Ballotpedia, Florida Budget Stabilization Fund Amendment (2026)', url: 'https://ballotpedia.org/Florida_Changes_to_Budget_Stabilization_Fund_Amendment_(2026)' },
    { name: 'WUWF, Ballot explainer: Amendment 1', url: 'https://www.wuwf.org/local-news/2026-10-23/ballot-explainer-amendment-1-budget-stabilization-fund' },
    { name: 'WUSF, Florida Democrats think they\u2019ll break Republican supermajorities', url: 'https://wusf.org/text/politics-issues/2026-10-01/florida-democrats-break-republican-supermajorities-what-does-that-mean' }
  ];
  function isAmend1(title){ return /budget stabilization fund/i.test(title); }
  var A1W = {
    en: {
      gYes: 'Florida would have to save more. Its rainy-day fund could grow from 10% to 25% of a year’s general revenue, and lawmakers would have to put in $750 million a year until it gets there.',
      gNo: 'The rainy-day fund stays capped at 10% of a year’s general revenue. It is already nearly full, so there are no required deposits.',
      you: 'No change to your taxes either way. It decides how much of the state’s money is saved instead of spent or returned in tax cuts.',
      allYes: 'About $750 million a year would go into savings that lawmakers could otherwise spend on things like schools, health care or roads, or use for tax cuts. In return the state would have a bigger cushion for a recession or a hurricane.',
      allNo: 'That $750 million a year stays available for the yearly budget or tax cuts. The fund keeps today’s cushion of about $5.1 billion.',
      what: 'What it is',
      whatTxt: 'The Budget Stabilization Fund is the state’s savings account, created in 1993. Today it can only be used to cover a revenue shortfall or an emergency the Governor declares, like a hurricane.',
      numbers: 'The numbers',
      n: [['Fund today', '$5.06 billion'], ['Share of a year’s general revenue', '9.75% (the cap is 10%)'], ['Yearly deposit if YES', '$750 million, about 1.4% of general revenue'], ['Cap if YES', '25% of general revenue'], ['When it would be full, at $750 million a year', 'about 2049, after about $16.4 billion in deposits']],
      nNote: 'Projection is Florida TaxWatch’s. It also found that if revenue grows 3% a year, $750 million deposits never reach 25%. The 1.4% is our math from TaxWatch’s figures.',
      rules: 'The new rules if YES',
      r: ['Deposits can be skipped in a year when lawmakers take money out for a shortfall, an emergency or a critical need.',
          'They can also skip a deposit to spend the money on a critical state need, by a two-thirds vote of each chamber in its own bill, no more than once every five years.',
          'New: when the fund is above 15%, lawmakers can take money out for a one-time “critical state need” by a two-thirds vote, but not below 10%. The amendment doesn’t define “critical state need.”'],
      who: 'Who decides what a \u201crainy day\u201d is',
      whoItems: ['A revenue shortfall: the Legislature, when the money coming in falls short of what the budget spends. Same today and under YES.',
        'An emergency: the Governor declares it. Same today and under YES.',
        'A \u201ccritical state need\u201d (new, only under YES): the Legislature alone, by a two-thirds vote of each chamber in a bill for that purpose. The amendment gives no definition, list or outside check, so it is whatever two-thirds of lawmakers agree it is.',
        'Today Republicans hold just over two-thirds of both chambers (WUSF, October 2026), so one party can reach that bar on its own. This election could change that.'],
      sides: 'Where it came from, and who is for and against it',
      sidesTxt: 'For: Senate President Ben Albritton, House Speaker Daniel Perez and Florida TaxWatch, who say a bigger reserve protects the state in a downturn. Against: Gov. Ron DeSantis, who calls the fund already maxed out, plus the Florida Education Association, the League of Women Voters of Florida and Americans for Tax Reform, who say the money should go to current needs or back to taxpayers.',
      needs: 'Where it came from: lawmakers, not a petition. Rep. Lawrence McClure filed it (HJR 5019) on June 4, 2025, while the Legislature was finishing that year\u2019s budget; Sen. Ed Hooper had a similar Senate version. It passed June 16, 2025, 100 to 1 in the House and 29 to 4 in the Senate. The Legislature can put amendments straight on the ballot; the Governor has no say. Lawmakers also wrote the first $750 million deposits into the last two budgets, pending this vote, and Gov. DeSantis vetoed both. It needs 60% of the vote to pass.',
      whyReason: 'Its sponsors say Florida needs a bigger cushion for the next recession or disaster: Senate President Ben Albritton said it makes the state\u2019s balance sheet more durable in difficult times. Changing the cap or the rules for using it takes a change to the state constitution, and only voters can approve that.'
    },
    es: {
      gYes: 'Florida tendría que ahorrar más. Su fondo de reserva podría crecer del 10% al 25% de los ingresos generales de un año, y los legisladores tendrían que depositar $750 millones al año hasta llegar ahí.',
      gNo: 'El fondo de reserva sigue con un tope del 10% de los ingresos generales de un año. Ya está casi lleno, así que no hay depósitos obligatorios.',
      you: 'Sus impuestos no cambian en ningún caso. Decide cuánto del dinero del estado se ahorra en vez de gastarse o devolverse con rebajas de impuestos.',
      allYes: 'Unos $750 millones al año irían a ahorros que los legisladores podrían usar en escuelas, salud o carreteras, o en rebajas de impuestos. A cambio, el estado tendría un colchón mayor para una recesión o un huracán.',
      allNo: 'Esos $750 millones al año siguen disponibles para el presupuesto anual o rebajas de impuestos. El fondo mantiene el colchón actual de unos $5,100 millones.',
      what: 'Qué es',
      whatTxt: 'El Fondo de Estabilización Presupuestaria es la cuenta de ahorros del estado, creada en 1993. Hoy solo puede usarse para cubrir una caída de ingresos o una emergencia que declare el Gobernador, como un huracán.',
      numbers: 'Las cifras',
      n: [['Fondo hoy', '$5,060 millones'], ['Parte de los ingresos generales de un año', '9.75% (el tope es 10%)'], ['Depósito anual si gana el SÍ', '$750 millones, cerca del 1.4% de los ingresos generales'], ['Tope si gana el SÍ', '25% de los ingresos generales'], ['Cuándo se llenaría, con $750 millones al año', 'alrededor de 2049, tras unos $16,400 millones en depósitos']],
      nNote: 'La proyección es de Florida TaxWatch. También halló que si los ingresos crecen 3% al año, los depósitos de $750 millones nunca llegan al 25%. El 1.4% es nuestro cálculo con cifras de TaxWatch.',
      rules: 'Las nuevas reglas si gana el SÍ',
      r: ['Los depósitos pueden omitirse en un año en que los legisladores saquen dinero por una caída de ingresos, una emergencia o una necesidad crítica.',
          'También pueden omitir un depósito para gastar en una necesidad crítica del estado, con dos tercios de cada cámara en una ley aparte, no más de una vez cada cinco años.',
          'Nuevo: cuando el fondo pasa del 15%, los legisladores pueden sacar dinero para una “necesidad crítica” de una sola vez, con dos tercios de los votos, sin bajar del 10%. La enmienda no define “necesidad crítica”.'],
      who: 'Quién decide qué es un \u201cdía de lluvia\u201d',
      whoItems: ['Una caída de ingresos: la Legislatura, cuando el dinero que entra no alcanza para lo que gasta el presupuesto. Igual hoy y con el SÍ.',
        'Una emergencia: la declara el Gobernador. Igual hoy y con el SÍ.',
        'Una \u201cnecesidad crítica del estado\u201d (nueva, solo con el SÍ): solo la Legislatura, con dos tercios de cada cámara en una ley para ese fin. La enmienda no da definición, lista ni control externo, así que es lo que dos tercios de los legisladores acuerden.',
        'Hoy los republicanos tienen algo más de dos tercios de ambas cámaras (WUSF, octubre de 2026), así que un solo partido puede alcanzar ese umbral. Esta elección podría cambiarlo.'],
      sides: 'De dónde salió, y quién está a favor y en contra',
      sidesTxt: 'A favor: el presidente del Senado Ben Albritton, el presidente de la Cámara Daniel Perez y Florida TaxWatch, que dicen que una reserva mayor protege al estado en una crisis. En contra: el gobernador Ron DeSantis, que dice que el fondo ya está al máximo, y la Florida Education Association, la League of Women Voters of Florida y Americans for Tax Reform, que dicen que el dinero debe ir a necesidades actuales o volver a los contribuyentes.',
      needs: 'De dónde salió: de los legisladores, no de una petición. El representante Lawrence McClure la presentó (HJR 5019) el 4 de junio de 2025, mientras la Legislatura terminaba el presupuesto de ese año; el senador Ed Hooper tenía una versión parecida en el Senado. Se aprobó el 16 de junio de 2025, 100 a 1 en la Cámara y 29 a 4 en el Senado. La Legislatura puede poner enmiendas directamente en la boleta; el Gobernador no participa. Los legisladores también incluyeron los primeros depósitos de $750 millones en los dos últimos presupuestos, sujetos a esta votación, y el gobernador DeSantis vetó ambos. Necesita el 60% de los votos.',
      whyReason: 'Sus impulsores dicen que Florida necesita un colchón mayor para la próxima recesión o desastre: el presidente del Senado Ben Albritton dijo que hace más sólido el balance del estado en tiempos difíciles. Cambiar el tope del fondo o las reglas para usarlo requiere cambiar la constitución estatal, y solo los votantes pueden aprobarlo.'
    },
    ht: {
      gYes: 'Florid ta oblije sere plis. Fon pou move jou li a ta ka grandi soti 10% rive 25% nan revni jeneral yon ane, e lejislatè yo ta oblije mete $750 milyon chak ane jiskaske li rive la.',
      gNo: 'Fon pou move jou a rete ak plafon 10% nan revni jeneral yon ane. Li prèske plen deja, kidonk pa gen depo obligatwa.',
      you: 'Taks ou pa chanje nan okenn ka. Li deside konbyen lajan Leta a sere olye li depanse l oswa remèt li an diminisyon taks.',
      allYes: 'Anviwon $750 milyon chak ane ta ale nan ekonomi lejislatè yo ta ka depanse sou lekòl, swen sante oswa wout, oswa sèvi pou diminye taks. An retou, Leta a ta gen yon kousen pi gwo pou yon resesyon oswa yon siklòn.',
      allNo: '$750 milyon sa a chak ane rete disponib pou bidjè anyèl la oswa pou diminye taks. Fon an kenbe kousen jodi a ki anviwon $5.1 milya.',
      what: 'Sa li ye',
      whatTxt: 'Fon Estabilizasyon Bidjè a se kont epay Leta a, yo te kreye l an 1993. Jodi a yo ka sèvi avè l sèlman pou kouvri yon mank revni oswa yon ijans Gouvènè a deklare, tankou yon siklòn.',
      numbers: 'Chif yo',
      n: [['Fon an jodi a', '$5.06 milya'], ['Pati nan revni jeneral yon ane', '9.75% (plafon an se 10%)'], ['Depo chak ane si WI genyen', '$750 milyon, anviwon 1.4% revni jeneral'], ['Plafon si WI genyen', '25% revni jeneral'], ['Kilè li ta plen, ak $750 milyon pa ane', 'anviwon 2049, apre anviwon $16.4 milya depo']],
      nNote: 'Pwojeksyon an se pa Florida TaxWatch. Li jwenn tou si revni grandi 3% pa ane, depo $750 milyon yo pa janm rive 25%. 1.4% la se kalkil pa nou ak chif TaxWatch.',
      rules: 'Nouvo règ yo si WI genyen',
      r: ['Yo ka sote depo yo nan yon ane lè lejislatè yo retire lajan pou yon mank revni, yon ijans oswa yon bezwen kritik.',
          'Yo ka sote yon depo tou pou depanse lajan an sou yon bezwen kritik Leta, ak de tyè vòt nan chak chanm nan yon lwa apa, pa plis pase yon fwa chak senk ane.',
          'Nouvo: lè fon an depase 15%, lejislatè yo ka retire lajan pou yon “bezwen kritik” yon sèl fwa ak de tyè vòt, men pa anba 10%. Amannman an pa defini “bezwen kritik”.'],
      who: 'Kiyès ki deside sa ki yon \u201cmove jou\u201d',
      whoItems: ['Yon mank revni: Lejislati a, lè lajan k ap antre a pa ase pou sa bidjè a depanse. Menm jan jodi a ak avèk WI.',
        'Yon ijans: Gouvènè a deklare l. Menm jan jodi a ak avèk WI.',
        'Yon \u201cbezwen kritik Leta\u201d (nouvo, sèlman avèk WI): Lejislati a sèl, ak de tyè vòt nan chak chanm nan yon lwa pou sa. Amannman an pa bay okenn definisyon, lis oswa kontwòl deyò, kidonk se sa de tyè lejislatè yo dakò li ye.',
        'Jodi a Repibliken yo gen yon ti kras plis pase de tyè nan tou de chanm yo (WUSF, oktòb 2026), kidonk yon sèl pati ka rive nan nivo sa a poukont li. Eleksyon sa a ka chanje sa.'],
      sides: 'Kote li soti, ak kiyès ki pou ak kiyès ki kont',
      sidesTxt: 'Pou: Prezidan Sena a Ben Albritton, Prezidan Chanm nan Daniel Perez ak Florida TaxWatch, ki di yon rezèv pi gwo pwoteje Leta a nan yon kriz. Kont: Gouvènè Ron DeSantis, ki di fon an deja plen, plis Florida Education Association, League of Women Voters of Florida ak Americans for Tax Reform, ki di lajan an ta dwe ale nan bezwen jodi a oswa retounen bay kontribyab yo.',
      needs: 'Kote li soti: nan men lejislatè yo, pa yon petisyon. Reprezantan Lawrence McClure te depoze l (HJR 5019) 4 jen 2025, pandan Lejislati a t ap fini bidjè ane sa a; Senatè Ed Hooper te gen yon vèsyon ki sanble nan Sena a. Li pase 16 jen 2025, 100 kont 1 nan Chanm nan ak 29 kont 4 nan Sena a. Lejislati a ka mete amannman dirèkteman sou bilten an; Gouvènè a pa gen mo pou l di. Lejislatè yo te mete premye depo $750 milyon yo nan de dènye bidjè yo tou, annatandan vòt sa a, e Gouvènè DeSantis te mete veto sou tou de. Li bezwen 60% vòt pou l pase.',
      whyReason: 'Moun ki pote l yo di Florid bezwen yon kousen pi gwo pou pwochen resesyon oswa dezas: Prezidan Sena a Ben Albritton te di li rann bilan Leta a pi solid nan moman difisil. Pou chanje plafon fon an oswa règ pou sèvi avè l, fòk yo chanje konstitisyon Leta a, e se sèlman votè yo ki ka apwouve sa.'
    }
  };
  function amend1(lang){
    var w = A1W[lang] || A1W.en;
    return {
      yes: [], no: [], approx: false, explainer: true, sources: A1SRC, why: [w.needs, w.whyReason],
      general: { yes: w.gYes, no: w.gNo },
      summary: { yes: [w.you], no: [], allYes: [w.allYes], allNo: [w.allNo] },
      reconcile: {
        head: w.what, explainer: true,
        splitHead: w.numbers, split: w.n.map(function(x){ return { label: x[0], text: x[1] }; }),
        loss: w.whatTxt, fundsHead: '', funds: [], fundNote: w.nNote,
        respond: '', share: '',
        extra: [{ head: w.rules, items: w.r }, { head: w.who, items: w.whoItems }, { head: w.sides, items: [w.sidesTxt] }]
      }
    };
  }
  function calc(title, me, lang){
    if(isAmend1(title)) return amend1(lang);   // same for everyone, no answers needed
    me = me || normalize({ groups: {} });      // no answers yet: the for-everyone part still applies
    if(isAmend3(title)) return amend3(me, lang);
    if(isSchoolLevy(title)) return schoolLevy(me, lang);
    return null;
  }

  window.measureImpact = {
    GROUPS: GROUPS, SRC: SRC, load: load, save: save, clear: clear, normalize: normalize, has: has, any: any,
    words: words, sumWords: sumWords, calc: calc, usd: usd, placeKey: placeKey, places: function(){ var M = rates(); return M ? Object.keys(M.places) : []; },
    _test: { homeTaxes: homeTaxes, currentNonSchoolExempt: currentNonSchoolExempt, isAmend3: isAmend3, isSchoolLevy: isSchoolLevy }
  };
})();
