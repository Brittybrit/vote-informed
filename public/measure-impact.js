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
  var GROUPS = ['homestead', 'owner_other', 'renter', 'business', 'farm', 'school_parent', 'school_staff', 'public_employee', 'transit', 'library', 'park_user', 'senior'];

  function usd(n){ return '$' + Math.round(Number(n) || 0).toLocaleString('en-US'); }
  function big(n, lang){
    if(n < 1e6) return usd(n);
    var x = (Math.round(n / 1e5) / 10).toFixed(1).replace(/\.0$/, '');
    return '$' + x + (lang === 'es' ? ' millones' : lang === 'ht' ? ' milyon' : ' million');
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
    return { groups: g, homeValue: num(o.homeValue), nsTax: num(o.nsTax), otherValue: num(o.otherValue) };
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
    { k: 'fire', amt: 743.7e6, groups: [] },
    { k: 'roads', amt: 407.1e6, groups: ['transit'] },
    { k: 'parks', amt: 130.8e6, groups: ['park_user'] },
    { k: 'libraries', amt: 128.5e6, groups: ['library'] },
    { k: 'community', amt: 66.4e6, groups: ['senior'] },
    { k: 'animals', amt: 31e6, groups: [] }
  ];
  // School levy: 1 mill ($1 per $1,000 of taxable value). Homesteads get $25,000 off for school taxes.
  var LEVY = { mills: 1, perYear: 585e6, teachers: 88, safety: 12, typical: 316 };

  function isAmend3(title){ return /homestead exemption/i.test(title) && /non-?homestead/i.test(title); }
  function isSchoolLevy(title){ return /levy for teachers/i.test(title) || (/school board/i.test(title) && /renewal of existing ad valorem levy/i.test(title)); }

  /* ---------- wording ---------- */
  var W = {
    en: {
      head: 'What this means for you',
      intro: 'Add a few details and we’ll lay out what YES and NO would change for someone in your situation, and what public money and services ride on it. Your answers stay on this device. Nothing is sent or saved anywhere else.',
      start: 'Add my situation', edit: 'Edit my situation', clear: 'Clear my answers', saveBtn: 'Show what it means for me', cancel: 'Cancel',
      formHead: 'Check what applies to you. Skip anything you’d rather not say.',
      g: {
        homestead: 'I own the home I live in (homestead exemption)', owner_other: 'I own property I don’t live in (rental, second home, land, business property)',
        renter: 'I rent my home', business: 'I own a business', farm: 'I own or lease farmland, or run a farm or agritourism business',
        school_parent: 'I have a child in a public school (district or charter)', school_staff: 'I work for the school district',
        public_employee: 'I work for the county or a city (including police and fire)', transit: 'I ride the bus, Metrorail or Metromover',
        library: 'I use public libraries', park_user: 'I use public parks', senior: 'I’m 65 or older'
      },
      o: {
        homestead: 'Homeowners who live in their home', owner_other: 'Owners of property they don\u2019t live in', renter: 'Renters', business: 'Business owners',
        farm: 'Farmland owners and farm businesses', school_parent: 'Families with children in public school', school_staff: 'School district employees',
        public_employee: 'County and city employees', transit: 'Transit riders', library: 'Library users', park_user: 'Park users', senior: 'People 65 and older'
      },
      homeValue: 'Your home’s assessed value', homeValueHelp: 'On your TRIM notice or the Property Appraiser’s site, the line called Assessed Value.',
      nsTax: 'Property taxes on your last bill, leaving out the School Board lines and non-ad valorem assessments (trash, etc.)', nsTaxHelp: 'Optional. Lets us estimate dollars, not just exempt value.',
      otherValue: 'Assessed value of the property you own but don’t live in', lookup: 'Look up your values',
      privacy: 'Saved on this device only.',
      ifYes: 'If YES wins', ifNo: 'If NO wins', when: 'When', everyone: 'Everyone it covers',
      forYou: 'For you', youSaid: 'You said: ', noneForYou: 'Official sources don’t describe anything this measure changes specifically for the situation you gave, beyond what it changes for everyone.',
      others: 'What it means for others in your community', money: 'Public money and services at stake', youUse: 'You said you use this',
      reconcileHead: 'Your taxes and the services they pay for', unknown: 'Not yet known',
      sources: 'Sources', disc: 'Plain-language consequences compiled with AI from the measure text and official sources, plus calculations from official figures. It does not say how to vote. Check anything that would change your vote against the linked sources.',
      loading: 'Looking up what this measure changes, and for whom. Usually 20 to 60 seconds.', failed: 'Couldn’t load this right now.', retry: 'Try again',
      approx: 'Estimate. Tax rates are set every year, so the real number will differ.',
      a3: {
        exempt: function(c, n27, n28){ return 'Today ' + usd(c) + ' of your home’s assessed value is exempt from non-school property taxes. With YES that becomes ' + usd(n27) + ' in 2027 and ' + usd(n28) + ' in 2028 (then it rises with inflation).'; },
        save: function(s27, s28, t){ return 'At today’s tax rates, your non-school property taxes of ' + usd(t) + ' a year would be about ' + usd(s27) + ' lower in 2027 and ' + usd(s28) + ' lower in 2028.'; },
        noTax: 'Add the tax amount from your last bill to see this in dollars.',
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
      head: 'Lo que significa para usted',
      intro: 'Agregue algunos datos y le mostraremos lo que el SÍ y el NO cambiarían para alguien en su situación, y qué dinero y servicios públicos dependen de ello. Sus respuestas se quedan en este dispositivo. No se envían ni se guardan en ningún otro lugar.',
      start: 'Agregar mi situación', edit: 'Editar mi situación', clear: 'Borrar mis respuestas', saveBtn: 'Mostrar lo que significa para mí', cancel: 'Cancelar',
      formHead: 'Marque lo que aplica a usted. Omita lo que prefiera no decir.',
      g: {
        homestead: 'Soy dueño de la casa donde vivo (exención homestead)', owner_other: 'Tengo una propiedad donde no vivo (alquiler, segunda casa, terreno, local comercial)',
        renter: 'Alquilo mi vivienda', business: 'Tengo un negocio', farm: 'Soy dueño o arrendatario de tierras agrícolas, o tengo una finca o negocio de agroturismo',
        school_parent: 'Tengo un hijo en una escuela pública (del distrito o chárter)', school_staff: 'Trabajo para el distrito escolar',
        public_employee: 'Trabajo para el condado o una ciudad (incluida policía y bomberos)', transit: 'Uso el autobús, Metrorail o Metromover',
        library: 'Uso las bibliotecas públicas', park_user: 'Uso los parques públicos', senior: 'Tengo 65 años o más'
      },
      o: {
        homestead: 'Dueños que viven en su vivienda', owner_other: 'Dueños de propiedades donde no viven', renter: 'Inquilinos', business: 'Dueños de negocios',
        farm: 'Dueños de tierras agrícolas y negocios agrícolas', school_parent: 'Familias con hijos en escuelas públicas', school_staff: 'Empleados del distrito escolar',
        public_employee: 'Empleados del condado y de las ciudades', transit: 'Usuarios del transporte público', library: 'Usuarios de bibliotecas', park_user: 'Usuarios de parques', senior: 'Personas de 65 años o más'
      },
      homeValue: 'Valor tasado (Assessed Value) de su vivienda', homeValueHelp: 'En su aviso TRIM o en el sitio del Tasador de Propiedades, la línea Assessed Value.',
      nsTax: 'Impuestos a la propiedad de su última factura, sin las líneas del School Board ni los cargos que no son ad valorem (basura, etc.)', nsTaxHelp: 'Opcional. Nos permite estimar dólares, no solo el valor exento.',
      otherValue: 'Valor tasado de la propiedad donde no vive', lookup: 'Busque sus valores',
      privacy: 'Guardado solo en este dispositivo.',
      ifYes: 'Si gana el SÍ', ifNo: 'Si gana el NO', when: 'Cuándo', everyone: 'Para todos los que abarca',
      forYou: 'Para usted', youSaid: 'Usted indicó: ', noneForYou: 'Las fuentes oficiales no describen nada que esta medida cambie específicamente para la situación que indicó, más allá de lo que cambia para todos.',
      others: 'Lo que significa para otros en su comunidad', money: 'Dinero y servicios públicos en juego', youUse: 'Usted indicó que usa esto',
      reconcileHead: 'Sus impuestos y los servicios que pagan', unknown: 'Aún no se sabe',
      sources: 'Fuentes', disc: 'Consecuencias en lenguaje sencillo, compiladas con IA a partir del texto de la medida y fuentes oficiales, más cálculos con cifras oficiales. No indica cómo votar. Verifique con las fuentes enlazadas todo lo que podría cambiar su voto.',
      loading: 'Buscando qué cambia esta medida y para quién. Normalmente de 20 a 60 segundos.', failed: 'No se pudo cargar en este momento.', retry: 'Intentar de nuevo',
      approx: 'Estimado. Las tasas de impuestos se fijan cada año, así que la cifra real será distinta.',
      a3: {
        exempt: function(c, n27, n28){ return 'Hoy ' + usd(c) + ' del valor tasado de su vivienda está exento de los impuestos a la propiedad que no son escolares. Con el SÍ serían ' + usd(n27) + ' en 2027 y ' + usd(n28) + ' en 2028 (luego sube con la inflación).'; },
        save: function(s27, s28, t){ return 'Con las tasas de hoy, sus impuestos no escolares de ' + usd(t) + ' al año bajarían unos ' + usd(s27) + ' en 2027 y ' + usd(s28) + ' en 2028.'; },
        noTax: 'Agregue el monto de impuestos de su última factura para verlo en dólares.',
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
      head: 'Sa sa vle di pou ou',
      intro: 'Ajoute kèk detay epi n ap montre w sa WI ak NON ta chanje pou yon moun nan sitiyasyon w, ak ki lajan piblik ak sèvis piblik ki depann de sa. Repons ou yo rete sou aparèy sa a. Yo pa voye yo ni sere yo okenn lòt kote.',
      start: 'Ajoute sitiyasyon m', edit: 'Chanje sitiyasyon m', clear: 'Efase repons mwen yo', saveBtn: 'Montre m sa sa vle di pou mwen', cancel: 'Anile',
      formHead: 'Make sa ki aplike pou ou. Kite sa ou pa vle di.',
      g: {
        homestead: 'Mwen se pwopriyetè kay mwen rete a (egzanpsyon homestead)', owner_other: 'Mwen gen yon pwopriyete mwen pa rete ladan l (lokasyon, dezyèm kay, tè, lokal biznis)',
        renter: 'Mwen lwe kay mwen', business: 'Mwen gen yon biznis', farm: 'Mwen posede oswa lwe tè agrikòl, oswa mwen gen yon fèm oswa biznis agwotouris',
        school_parent: 'Mwen gen yon pitit nan yon lekòl piblik (distri oswa chartè)', school_staff: 'Mwen travay pou distri lekòl la',
        public_employee: 'Mwen travay pou konte a oswa yon vil (sa gen ladan l lapolis ak ponpye)', transit: 'Mwen pran bis, Metrorail oswa Metromover',
        library: 'Mwen sèvi ak bibliyotèk piblik', park_user: 'Mwen sèvi ak pak piblik', senior: 'Mwen gen 65 an oswa plis'
      },
      o: {
        homestead: 'Pwopriyetè ki rete nan kay yo', owner_other: 'Pwopriyetè ki gen pwopriyete yo pa rete ladan l', renter: 'Lokatè', business: 'Pwopriyetè biznis',
        farm: 'Pwopriyetè tè agrikòl ak biznis agrikòl', school_parent: 'Fanmi ki gen pitit nan lekòl piblik', school_staff: 'Anplwaye distri lekòl la',
        public_employee: 'Anplwaye konte a ak vil yo', transit: 'Moun ki pran transpò piblik', library: 'Moun ki sèvi ak bibliyotèk', park_user: 'Moun ki sèvi ak pak', senior: 'Moun 65 an oswa plis'
      },
      homeValue: 'Valè evalyasyon (Assessed Value) kay ou', homeValueHelp: 'Sou avi TRIM ou oswa sou sit Evalyatè Pwopriyete a, liy ki rele Assessed Value.',
      nsTax: 'Taks pwopriyete sou dènye fakti w, san liy School Board yo ak frè ki pa ad valorem yo (fatra, elatriye)', nsTaxHelp: 'Si w vle. Sa pèmèt nou estime an dola, pa sèlman valè ki egzante.',
      otherValue: 'Valè evalyasyon pwopriyete ou pa rete ladan l', lookup: 'Chèche valè ou yo',
      privacy: 'Sere sou aparèy sa a sèlman.',
      ifYes: 'Si WI genyen', ifNo: 'Si NON genyen', when: 'Kilè', everyone: 'Pou tout moun li kouvri',
      forYou: 'Pou ou', youSaid: 'Ou di: ', noneForYou: 'Sous ofisyèl yo pa dekri anyen mezi sa a chanje espesyalman pou sitiyasyon ou bay la, pi lwen pase sa li chanje pou tout moun.',
      others: 'Sa sa vle di pou lòt moun nan kominote w', money: 'Lajan piblik ak sèvis ki an jwèt', youUse: 'Ou di ou sèvi ak sa',
      reconcileHead: 'Taks ou ak sèvis yo peye', unknown: 'Nou poko konnen',
      sources: 'Sous', disc: 'Konsekans an langaj senp, ki fèt ak èd entèlijans atifisyèl apati tèks mezi a ak sous ofisyèl, plis kalkil ak chif ofisyèl. Li pa di w kijan pou w vote. Verifye nan sous ki gen lyen yo nenpòt bagay ki ta ka chanje vòt ou.',
      loading: 'N ap chèche sa mezi sa a chanje, ak pou kiyès. Anjeneral 20 a 60 segonn.', failed: 'Nou pa ka chaje sa kounye a.', retry: 'Eseye ankò',
      approx: 'Estimasyon. To taks yo fikse chak ane, kidonk vrè chif la ap diferan.',
      a3: {
        exempt: function(c, n27, n28){ return 'Jodi a ' + usd(c) + ' nan valè evalyasyon kay ou egzante de taks pwopriyete ki pa pou lekòl. Avèk WI sa vin ' + usd(n27) + ' an 2027 ak ' + usd(n28) + ' an 2028 (apre sa li monte ak enflasyon).'; },
        save: function(s27, s28, t){ return 'Ak to taks jodi a, taks ki pa pou lekòl ou yo, ' + usd(t) + ' pa ane, ta bese anviwon ' + usd(s27) + ' an 2027 ak ' + usd(s28) + ' an 2028.'; },
        noTax: 'Ajoute montan taks sou dènye fakti w pou w wè sa an dola.',
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
  function words(lang){ return W[lang] || W.en; }

  /* ---------- the calculations official numbers support ---------- */
  // Returns { yes: [...], no: [...], reconcile: {...} } in plain data; the page turns it into HTML.
  function amend3(me, lang){
    var w = words(lang).a3, out = { yes: [], no: [], approx: false, reconcile: null, sources: [SRC.senate, SRC.edr, SRC.county] };
    var A = me.homeValue, s28 = 0;
    if(has(me, 'homestead')){
      if(A){
        var c = currentNonSchoolExempt(A), n27 = Math.min(A, 150000), n28 = Math.min(A, 250000);
        out.yes.push(w.exempt(c, n27, n28));
        if(me.nsTax){
          // effective non-school rate on today's taxable value, applied to the extra exempt value
          var base = A - c, rate = base > 0 ? me.nsTax / base : 0;
          var s27 = Math.min(me.nsTax, Math.max(0, n27 - c) * rate);
          s28 = Math.min(me.nsTax, Math.max(0, n28 - c) * rate);
          out.yes.push(w.save(s27, s28, me.nsTax));
          out.approx = true;
          out.savings = { y2027: Math.round(s27), y2028: Math.round(s28) };
        } else out.yes.push(w.noTax);
      } else out.yes.push(w.noValue);
      out.no.push(w.no);
    }
    if(has(me, 'owner_other')) out.yes.push(w.other);
    if(has(me, 'renter')) out.yes.push(w.renter);
    out.reconcile = {
      loss: w.loss(lang),
      fundsHead: w.funds,
      funds: COUNTY_FUNDS.map(function(f){ return { label: w.f[f.k], amount: big(f.amt, lang), mine: f.groups.some(function(g){ return has(me, g); }) }; }),
      fundNote: w.fundNote,
      respond: w.respond,
      share: s28 ? w.share(s28, lang) : ''
    };
    return out;
  }
  function schoolLevy(me, lang){
    var w = words(lang).lv, out = { yes: [], no: [], approx: false, reconcile: null, sources: [SRC.school] };
    var paid = false;
    if(has(me, 'homestead')){
      if(me.homeValue){ var p = Math.max(0, me.homeValue - 25000) * LEVY.mills / 1000; out.yes.push(w.pay(p)); out.payHome = Math.round(p); paid = true; }
      else out.yes.push(w.noValue);
    }
    if(has(me, 'owner_other') && me.otherValue){ var q = me.otherValue * LEVY.mills / 1000; out.yes.push(w.payOther(q)); out.payOther = Math.round(q); paid = true; }
    if(paid){ out.yes.push(w.yes); out.no.push(w.no); out.approx = true; }
    else if(!has(me, 'homestead')) out.yes.push(w.typical);
    out.reconcile = {
      loss: w.district(lang),
      fundsHead: '', funds: [],
      fundNote: '',
      respond: w.ifNo,
      mine: has(me, 'school_parent') || has(me, 'school_staff')
    };
    return out;
  }
  function calc(title, me, lang){
    if(!me) return null;
    if(isAmend3(title)) return amend3(me, lang);
    if(isSchoolLevy(title)) return schoolLevy(me, lang);
    return null;
  }

  window.measureImpact = {
    GROUPS: GROUPS, SRC: SRC, load: load, save: save, clear: clear, normalize: normalize, has: has, any: any,
    words: words, calc: calc, usd: usd,
    _test: { currentNonSchoolExempt: currentNonSchoolExempt, isAmend3: isAmend3, isSchoolLevy: isSchoolLevy }
  };
})();
