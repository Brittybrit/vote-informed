// Shared renderer for one official-action card from decisions.json.
// Used by /decisions (every action of a body) and the candidate dossier on / (one person's actions).
(function(){
  var S = {
    en: {
      title: 'Official actions: votes, lobbyists and gifts',
      lede: 'This page starts from the vote. For each Miami-Dade County Commission action that benefits a named company or group, it shows how every commissioner voted, who was registered with the county to lobby for that company, and whether the company, those lobbyists or their lobbying firms gave to a commissioner who is on the November 3, 2026 ballot. Gifts are listed with the dates the reports show, before or after the vote. Nothing here claims a vote was bought.',
      loading: 'Loading…', loadErr: 'Couldn’t load the list. Try again in a minute.',
      search: 'Search a company, lobbyist, donor or file number', noresult: 'Nothing matches that search.',
      'body.county': 'County Commission', 'body.cities': 'Cities (next)', 'body.state': 'Florida Legislature (after cities)',
      sActs: 'actions since {date}', sLob: 'with a registered lobbyist', sGift: 'with a gift to a commissioner on the ballot', sUpdated: 'last checked',
      onBallot: 'On the ballot: {name}, running for {race}. Gifts checked in:',
      offBallot: 'The other {n} commissioners are not on the November 3 ballot. Their votes are shown, but their donors were not checked.',
      fAll: 'All actions', fGift: 'Gift to someone on the ballot', fSplit: 'Split votes', fLob: 'Registered lobbyists',
      'kind.award': 'Contract award', 'kind.change': 'Contract change', 'kind.lease': 'Lease or agreement', 'kind.zoning': 'Zoning', 'kind.landuse': 'Land-use plan change', 'kind.plat': 'Plat', 'kind.easement': 'Easement', 'kind.land': 'County land', 'kind.funding': 'Funding', 'kind.finance': 'Financing', 'kind.labor': 'Union contract', 'kind.district': 'Special district', 'kind.other': 'Other',
      'meeting.bcc': 'Commission meeting', 'meeting.zoning': 'Zoning and land-use meeting',
      'res.adopted': 'Adopted', 'res.approved': 'Approved', 'res.approvedCond': 'Approved with conditions', 'res.denied': 'Denied', 'res.firstReading': 'Passed on first reading',
      party: 'Company or group named in the item: {p}', parties: 'Companies or groups named in the item: {p}',
      unan: 'unanimous', tally: '{y}-{n}',
      'v.yes': 'Yes', 'v.no': 'No', 'v.absent': 'Absent', 'v.excused': 'Excused', 'v.vacant': 'Not yet seated',
      votedBy: '{name}: {v}', allVotes: 'How all 13 members voted', grayNote: 'Gray: not on the November 3 ballot, donors not checked.',
      moved: 'Motion by {m}, seconded by {s}.',
      lobbied: 'Registered with the county to lobby for the company', lobFor: 'for {p}', lobReg: 'registered {date}', lobMore: 'Show all {n} lobbyists',
      gifts: 'Gifts to commissioners on the ballot', gave: '<b>{donor}</b> gave {amt} on {date} to {acct}',
      'how.party': 'The giver is the company named in the item.',
      'how.lobbyist': 'Same name as {lob}, registered to lobby for {p}{basis}.',
      'how.firm': 'A lobbying firm that lists the same office address as {lob}, registered to lobby for {p}.',
      basisAddr: '; the report lists the same address as the registration', basisOcc: '; the report lists the occupation as “{occ}”',
      noGift: 'No gift from the company, its registered lobbyists or their firms was found in {accts}.',
      matter: 'County file {id}', clerk: 'Signed resolution with roll call', minutes: 'Meeting minutes', draft: 'draft', registry: 'Lobbyist registry',
      how1: 'How this is made: every item the County Commission acted on from November 18, 2025 (when Commissioner Lopez was seated) through October 6, 2026 was searched for a named private company, developer or group that receives a contract, lease, land, zoning approval, money or a change to an existing deal. Routine items with no named beneficiary are not listed. Each vote comes from the Clerk of the Board’s minutes, which list the motion, the tally, each “no” vote and each absence, and was checked against the roll call in the signed resolution where the clerk posts one. Many minutes are still marked draft by the clerk.',
      how2: 'Gifts are matched three ways, and each gift says which: the giver is the company itself; the giver has the same name as a registered lobbyist on the item and the report shows the same address or a lawyer, lobbyist or consultant job; or the giver is a lobbying firm at the same office address as a registered lobbyist on the item. In cities without a registry, the note under a gift says how it connects. Names are shown as each record spells them. Only officials on the November 3 ballot were checked. Read the <a href="/methodology#decisions">full method</a>. Found an error? Email <a href="mailto:corrections@ballot305.org">corrections@ballot305.org</a>.',
      foot: '<a href="/">Back to Ballot305.org</a> · <a href="/actions">Donors, lobbyists and official actions by candidate</a> · <a href="/methodology">How it works</a> · <a href="/about">About</a>',
      lede2: 'This page starts from the vote. For each action by the Miami-Dade County Commission and the city councils that benefits a named company or group, it shows how each member voted, who was registered to lobby for that company, and whether the company, those lobbyists or their lobbying firms gave to an official who is on the November 3, 2026 ballot. Gifts are listed with the dates the reports show, before or after the vote. Nothing here claims a vote was bought.',
      'body.state2': 'Florida Legislature (next)', sActs2: 'actions listed', sGift2: 'with a gift to someone on the ballot',
      offBallot2: 'The other members are not on the November 3 ballot. Their votes are shown, but their donors were not checked.',
      allVotes2: 'How each member voted', gifts2: 'Gifts to members on the ballot', lobbied2: 'Registered lobbyists for the company',
      'res.passed': 'Passed', 'res.failed': 'Failed', 'res.withdrawn': 'Withdrawn before a vote', 'kind.permit': 'Permit',
      rollPartial: 'The record says the vote was unanimous but does not name every member; names shown are the ones it lists.', consentNote: 'Passed on the consent agenda.',
      'role.moved': 'made the motion', 'role.seconded': 'seconded', 'role.presented': 'presented the item', 'role.sponsoredItem': 'sponsored the item',
      firstReading: 'First reading: {date}.', namedLobbyist: 'Lobbyist named on the agenda: {n}', coverageH: 'What was checked', alsoOn: '{name}, also on the ballot for {race}:', pickBody: 'Choose a commission, council or legislature above to see its actions.',
      record: 'Meeting record', legistar: 'City file', othersH: 'Other cities with officials on the ballot',
      'st.none': 'reviewed; no official actions found that name one of their donors', 'st.nodata': 'no itemized campaign reports posted, so this can’t be checked', 'st.nogivers': 'reports list no outside donors',
      howCity: 'For each city, the box under its name says what was checked. Where a city posts a lobbyist registry, the list starts from what registered lobbyists’ clients asked for; where it doesn’t, the list starts from items that name a donor of someone on the ballot, and those gifts are shown with a note on how they connect.',
      lede3: 'This page starts from the official action. For each action by the Miami-Dade County Commission and the city councils that benefits a named company or group, it shows how each member voted, who was registered to lobby for that company, and whether the company, those lobbyists or their lobbying firms gave to an official who is on the November 3, 2026 ballot. For state legislators, the actions are the budget requests they filed. Gifts are listed with the dates the reports show, before or after the action. Nothing here claims a vote or request was bought.',
      'v.requested': 'filed this request', 'kind.request': 'Budget request', 'res.requested': 'Asked for {amt} in the state budget', 'res.requestedW': 'Asked for {amt} in the state budget; later marked withdrawn',
      partyS: 'Would receive the money: {p}', lobbiedS: 'Lobbyist named on the request form', formLink: 'Request form',
      noGiftS: 'No gift from the group receiving the money, the lobbying firm on the form, its PAC or its lobbyists was found in {accts}.',
      'how.s.named': 'Same name as {lob}, the lobbyist named on the form. The report lists the occupation as “{occ}”.',
      'how.s.firm': 'The lobbying firm named on the form ({firm}).',
      'how.s.firmpac': 'The political committee of the lobbying firm named on the form ({firm}).',
      'how.s.firmlob': 'A lobbyist at the firm named on the form ({firm}).',
      'how.s.party': 'The giver is the group named on the form to receive the money.',
      offBallotS: 'Only members from Miami-Dade who are on the November 3 ballot are listed, plus Angie Nixon of Jacksonville, who is running for U.S. Senate.',
      howState: 'Each state legislator files budget request forms asking for money for a project. The form names the member, the group that would get the money, and the registered lobbyist working on it. A gift from one of a firm’s lobbyists or from the firm’s political committee is counted as a gift from the firm, at any amount. Each request also says whether its form number is in the final budget and whether the governor vetoed it. Floor votes are on bills that became law where the Legislature’s staff analysis says the bill helps a kind of business that gave to the member.',
      'reg.confirmed': 'Registered with the Legislature to lobby for {p} ({y}).', 'reg.confirmedAs': 'Registered with the Legislature to lobby for {p} ({y}). The form names the group as “{rec}”.', 'reg.confirmedRequester': 'Registered with the Legislature to lobby for {p} ({y}), which the form lists as the group making the request.', 'reg.otherClients': 'Registered with the Legislature, but not found registered for a client named “{rec}” in the 2024, 2025 or 2026 lists.', 'reg.notFound': 'Not found in the Legislature’s 2024, 2025 or 2026 lobbyist lists.', fUnreg: 'Lobbyist not found registered for the client', 'bud.in': 'In the final {fy} budget ({law}, {ch}) at {amt}.', 'bud.inNoAmt': 'Named in the final {fy} budget ({law}, {ch}); the text does not give a separate amount for it.', 'bud.more': 'It is also named in a part of the budget that gives no separate amount.', 'bud.veto': 'The governor vetoed {amt} of it.', 'bud.vetoAll': 'The governor vetoed it ({amt}).', 'bud.notIn': 'Form number {ref} does not appear in the final {fy} budget ({law}, {ch}).', 'bud.law': 'Final budget', 'bud.vetoL': 'Governor’s veto list', fFund: 'In the final budget', 'kind.bill': 'Floor vote on a bill', 'v.nv': 'Did not vote', 'v.abstain': 'Abstained', 'how.s.cls': 'Occupation as reported: {occ}.', noGiftB: 'No gift from the donors described in the note above was found in {accts}.', fBill: 'Floor votes on bills', rollCall: 'Roll call', analysisL: 'Staff analysis', billL: 'Bill page',
      'res.requestedF': 'Asked for {amt} in the federal budget (earmark request)', lobbiedF: 'Registered with Congress to lobby for the group getting the money', noGiftF: 'No gift from the group getting the money, its federal lobbying firms, their PACs or their lobbyists was found in {accts}.', 'how.s.ldaFirm': 'A lobbying firm registered with Congress to lobby for {p} ({firm}).', 'how.s.ldaPac': 'The political committee of {firm}, registered with Congress to lobby for {p}.', 'how.s.ldaLob': 'A lobbyist at {firm}, a firm registered with Congress to lobby for {p}.', 'how.s.ldaEmp': 'The report lists {firm} as employer; {firm} is registered with Congress to lobby for {p}.', 'how.s.ld203': ' From the lobbyist’s or firm’s own contribution report to Congress.', 'how.s.ldaOwn': 'A lobbyist on {p}’s own staff, registered with Congress.', 'how.s.noFec': ' Not found in the campaign’s FEC reports as of Oct 19, 2026.', srcL: 'report', cmteL: 'Committee table', reqPage: 'Member’s request page', 'st.norequests': 'made no earmark requests in 2025 or 2026 (Senate Appropriations Committee charts of every senator’s requests)', howFed: 'Each member of Congress may request money for specific local projects (Community Project Funding in the House, Congressionally Directed Spending in the Senate) and must post each request. Each card shows a request, the group that would get the money, the firms registered with Congress to lobby for that group (Lobbying Disclosure Act filings), and gifts to the member from the group, those firms, their PACs or their lobbyists, from FEC reports and lobbyists\u2019 own contribution reports (LD-203).', offBallotF: 'Only members of Congress on Miami-Dade\u2019s November 3 ballot are listed.', gaveN: '<b>{donor}</b> gave {amt} to {acct} in {n} gifts between {date} and {last}', 'how.s.clsF': 'Business: {occ}. From the campaign\u2019s FEC report.', cboL: 'Congressional Budget Office estimate', crsL: 'Congressional Research Service report', frL: 'Federal Register notice', howFedV: 'Floor votes are on bills that became law in 2025 where a Congressional Budget Office estimate, a Congressional Research Service report or the rule being overturned names the kind of business affected. Donors are those businesses giving through their PACs; gifts from their employees are not counted. A PAC that gave more than once is shown as one line with its total.',
    },
    es: {
      title: 'Acciones oficiales: votos, cabilderos y donaciones',
      lede: 'Esta página empieza por el voto. Para cada acción de la Comisión del Condado Miami-Dade que beneficia a una empresa o grupo con nombre, muestra cómo votó cada comisionado, quién estaba registrado ante el condado como cabildero de esa empresa y si la empresa, esos cabilderos o sus firmas de cabildeo donaron a un comisionado que está en la boleta del 3 de noviembre de 2026. Las donaciones aparecen con las fechas que muestran los reportes, antes o después del voto. Nada aquí afirma que un voto fue comprado.',
      loading: 'Cargando…', loadErr: 'No se pudo cargar la lista. Intente de nuevo en un minuto.',
      search: 'Busque una empresa, cabildero, donante o número de expediente', noresult: 'Nada coincide con esa búsqueda.',
      'body.county': 'Comisión del Condado', 'body.cities': 'Ciudades (siguiente)', 'body.state': 'Legislatura de Florida (después de las ciudades)',
      sActs: 'acciones desde el {date}', sLob: 'con un cabildero registrado', sGift: 'con una donación a un comisionado en la boleta', sUpdated: 'última revisión',
      onBallot: 'En la boleta: {name}, que se postula para {race}. Donaciones revisadas en:',
      offBallot: 'Los otros {n} comisionados no están en la boleta del 3 de noviembre. Se muestran sus votos, pero no se revisaron sus donantes.',
      fAll: 'Todas las acciones', fGift: 'Donación a alguien en la boleta', fSplit: 'Votos divididos', fLob: 'Cabilderos registrados',
      'kind.award': 'Adjudicación de contrato', 'kind.change': 'Cambio de contrato', 'kind.lease': 'Arrendamiento o acuerdo', 'kind.zoning': 'Zonificación', 'kind.landuse': 'Cambio al plan de uso de suelo', 'kind.plat': 'Plano', 'kind.easement': 'Servidumbre', 'kind.land': 'Terreno del condado', 'kind.funding': 'Fondos', 'kind.finance': 'Financiamiento', 'kind.labor': 'Contrato sindical', 'kind.district': 'Distrito especial', 'kind.other': 'Otro',
      'meeting.bcc': 'Reunión de la comisión', 'meeting.zoning': 'Reunión de zonificación y uso de suelo',
      'res.adopted': 'Adoptada', 'res.approved': 'Aprobada', 'res.approvedCond': 'Aprobada con condiciones', 'res.denied': 'Negada', 'res.firstReading': 'Aprobada en primera lectura',
      party: 'Empresa o grupo nombrado en el asunto: {p}', parties: 'Empresas o grupos nombrados en el asunto: {p}',
      unan: 'por unanimidad', tally: '{y}-{n}',
      'v.yes': 'Sí', 'v.no': 'No', 'v.absent': 'Ausente', 'v.excused': 'Excusado', 'v.vacant': 'Aún no tomaba posesión',
      votedBy: '{name}: {v}', allVotes: 'Cómo votaron los 13 miembros', grayNote: 'En gris: no están en la boleta del 3 de noviembre, donantes no revisados.',
      moved: 'Moción de {m}, secundada por {s}.',
      lobbied: 'Registrados ante el condado como cabilderos de la empresa', lobFor: 'por {p}', lobReg: 'registrado {date}', lobMore: 'Ver los {n} cabilderos',
      gifts: 'Donaciones a comisionados en la boleta', gave: '<b>{donor}</b> donó {amt} el {date} a {acct}',
      'how.party': 'El donante es la empresa nombrada en el asunto.',
      'how.lobbyist': 'Mismo nombre que {lob}, registrado como cabildero de {p}{basis}.',
      'how.firm': 'Una firma de cabildeo con la misma dirección de oficina que {lob}, registrado como cabildero de {p}.',
      basisAddr: '; el reporte muestra la misma dirección que el registro', basisOcc: '; el reporte indica la ocupación “{occ}”',
      noGift: 'No se encontró ninguna donación de la empresa, sus cabilderos registrados o sus firmas en {accts}.',
      matter: 'Expediente del condado {id}', clerk: 'Resolución firmada con la votación', minutes: 'Acta de la reunión', draft: 'borrador', registry: 'Registro de cabilderos',
      how1: 'Cómo se hace: se revisó cada asunto que la Comisión del Condado aprobó o rechazó desde el 18 de noviembre de 2025 (cuando la comisionada Lopez tomó posesión) hasta el 6 de octubre de 2026, buscando una empresa privada, desarrollador o grupo con nombre que recibe un contrato, arrendamiento, terreno, aprobación de zonificación, dinero o un cambio a un acuerdo existente. No se incluyen asuntos de rutina sin un beneficiario con nombre. Cada voto viene de las actas de la Secretaría de la Junta, que muestran la moción, el conteo, cada voto en contra y cada ausencia, y se comparó con la votación de la resolución firmada cuando la secretaría la publica. Muchas actas todavía están marcadas como borrador.',
      how2: 'Las donaciones se vinculan de tres formas, y cada una dice cuál: el donante es la propia empresa; el donante tiene el mismo nombre que un cabildero registrado en el asunto y el reporte muestra la misma dirección o un empleo de abogado, cabildero o consultor; o el donante es una firma de cabildeo en la misma dirección de oficina que un cabildero registrado en el asunto. En ciudades sin registro, la nota bajo cada donación explica la relación. Los nombres aparecen como los escribe cada registro. Solo se revisaron los funcionarios que están en la boleta del 3 de noviembre. Lea el <a href="/methodology#decisions">método completo</a>. ¿Encontró un error? Escriba a <a href="mailto:corrections@ballot305.org">corrections@ballot305.org</a>.',
      foot: '<a href="/">Volver a Ballot305.org</a> · <a href="/actions">Donantes, cabilderos y acciones oficiales por candidato</a> · <a href="/methodology">Cómo funciona</a> · <a href="/about">Acerca de</a>',
      lede2: 'Esta página empieza por el voto. Para cada acción de la Comisión del Condado Miami-Dade y de los concejos municipales que beneficia a una empresa o grupo con nombre, muestra cómo votó cada miembro, quién estaba registrado como cabildero de esa empresa y si la empresa, esos cabilderos o sus firmas de cabildeo donaron a un funcionario que está en la boleta del 3 de noviembre de 2026. Las donaciones aparecen con las fechas que muestran los reportes, antes o después del voto. Nada aquí afirma que un voto fue comprado.',
      'body.state2': 'Legislatura de Florida (siguiente)', sActs2: 'acciones en la lista', sGift2: 'con una donación a alguien en la boleta',
      offBallot2: 'Los demás miembros no están en la boleta del 3 de noviembre. Se muestran sus votos, pero no se revisaron sus donantes.',
      allVotes2: 'Cómo votó cada miembro', gifts2: 'Donaciones a miembros en la boleta', lobbied2: 'Cabilderos registrados de la empresa',
      'res.passed': 'Aprobado', 'res.failed': 'Rechazado', 'res.withdrawn': 'Retirado antes de votar', 'kind.permit': 'Permiso',
      rollPartial: 'El acta dice que la votación fue unánime pero no nombra a cada miembro; se muestran los nombres que aparecen.', consentNote: 'Aprobado en la agenda de consentimiento.',
      'role.moved': 'presentó la moción', 'role.seconded': 'secundó', 'role.presented': 'presentó el asunto', 'role.sponsoredItem': 'patrocinó el asunto',
      firstReading: 'Primera lectura: {date}.', namedLobbyist: 'Cabildero nombrado en la agenda: {n}', coverageH: 'Qué se revisó', alsoOn: '{name}, también en la boleta para {race}:', pickBody: 'Elija arriba una comisión, un concejo o una legislatura para ver sus acciones.',
      record: 'Acta de la reunión', legistar: 'Expediente de la ciudad', othersH: 'Otras ciudades con funcionarios en la boleta',
      'st.none': 'revisado; no se encontraron acciones oficiales que nombren a uno de sus donantes', 'st.nodata': 'no hay reportes de campaña detallados, así que no se puede revisar', 'st.nogivers': 'sus reportes no muestran donantes externos',
      howCity: 'Para cada ciudad, el recuadro bajo su nombre explica qué se revisó. Donde la ciudad publica un registro de cabilderos, la lista parte de lo que pidieron los clientes de cabilderos registrados; donde no, parte de los asuntos que nombran a un donante de alguien en la boleta, y esas donaciones se muestran con una nota sobre la relación.',
      lede3: 'Esta página parte de la acción oficial. Para cada acción de la Comisión del Condado de Miami-Dade y de los concejos municipales que beneficia a una empresa o grupo con nombre, muestra cómo votó cada miembro, quién estaba registrado para cabildear por esa empresa y si la empresa, esos cabilderos o sus firmas donaron a un funcionario que está en la boleta del 3 de noviembre de 2026. Para los legisladores estatales, las acciones son las solicitudes de fondos que presentaron. Las donaciones aparecen con las fechas de los reportes, antes o después de la acción. Nada aquí afirma que se compró un voto o una solicitud.',
      'v.requested': 'presentó esta solicitud', 'kind.request': 'Solicitud de fondos', 'res.requested': 'Pidió {amt} en el presupuesto estatal', 'res.requestedW': 'Pidió {amt} en el presupuesto estatal; luego marcada como retirada',
      partyS: 'Recibiría el dinero: {p}', lobbiedS: 'Cabildero nombrado en el formulario', formLink: 'Formulario de solicitud',
      noGiftS: 'No se encontró ninguna donación del grupo que recibiría el dinero, de la firma de cabildeo del formulario, de su PAC ni de sus cabilderos en {accts}.',
      'how.s.named': 'Mismo nombre que {lob}, el cabildero nombrado en el formulario. El reporte indica la ocupación como “{occ}”.',
      'how.s.firm': 'La firma de cabildeo nombrada en el formulario ({firm}).',
      'how.s.firmpac': 'El comité político de la firma de cabildeo nombrada en el formulario ({firm}).',
      'how.s.firmlob': 'Un cabildero de la firma nombrada en el formulario ({firm}).',
      'how.s.party': 'El donante es el grupo que el formulario nombra para recibir el dinero.',
      offBallotS: 'Solo aparecen los miembros de Miami-Dade que están en la boleta del 3 de noviembre, y Angie Nixon, de Jacksonville, candidata al Senado de EE. UU.',
      howState: 'Cada legislador estatal presenta formularios para pedir dinero del presupuesto para un proyecto. El formulario nombra al miembro, al grupo que recibiría el dinero y al cabildero registrado que trabaja en él. Una donación de uno de los cabilderos de una firma o del comité político de la firma cuenta como donación de la firma, sin importar el monto. Cada solicitud también indica si su número de formulario está en el presupuesto final y si el gobernador la vetó. Los votos en el pleno son sobre proyectos que se convirtieron en ley cuando el análisis del personal legislativo dice que el proyecto ayuda a un tipo de negocio que donó al miembro.',
      'reg.confirmed': 'Registrado ante la Legislatura como cabildero de {p} ({y}).', 'reg.confirmedAs': 'Registrado ante la Legislatura como cabildero de {p} ({y}). El formulario nombra al grupo como “{rec}”.', 'reg.confirmedRequester': 'Registrado ante la Legislatura como cabildero de {p} ({y}), que el formulario indica como el grupo que hace la solicitud.', 'reg.otherClients': 'Registrado ante la Legislatura, pero no aparece registrado para un cliente llamado “{rec}” en las listas de 2024, 2025 o 2026.', 'reg.notFound': 'No aparece en las listas de cabilderos de la Legislatura de 2024, 2025 o 2026.', fUnreg: 'Cabildero sin registro para el cliente', 'bud.in': 'En el presupuesto final {fy} ({law}, {ch}) por {amt}.', 'bud.inNoAmt': 'Nombrada en el presupuesto final {fy} ({law}, {ch}); el texto no indica una cantidad aparte para ella.', 'bud.more': 'También aparece en una parte del presupuesto que no indica una cantidad aparte.', 'bud.veto': 'El gobernador vetó {amt}.', 'bud.vetoAll': 'El gobernador la vetó ({amt}).', 'bud.notIn': 'El número de formulario {ref} no aparece en el presupuesto final {fy} ({law}, {ch}).', 'bud.law': 'Presupuesto final', 'bud.vetoL': 'Lista de vetos del gobernador', fFund: 'En el presupuesto final', 'kind.bill': 'Votación en el pleno sobre un proyecto de ley', 'v.nv': 'No votó', 'v.abstain': 'Se abstuvo', 'how.s.cls': 'Ocupación declarada: {occ}.', noGiftB: 'No se encontró ninguna donación de los donantes descritos en la nota en {accts}.', fBill: 'Votos sobre proyectos de ley', rollCall: 'Lista de votación', analysisL: 'Análisis legislativo', billL: 'Página del proyecto',
      'res.requestedF': 'Pidió {amt} en el presupuesto federal (solicitud de fondos para un proyecto)', lobbiedF: 'Registrados ante el Congreso como cabilderos del grupo que recibiría el dinero', noGiftF: 'No se encontró ninguna donación del grupo que recibiría el dinero, sus firmas de cabildeo federal, sus comités políticos o sus cabilderos en {accts}.', 'how.s.ldaFirm': 'Una firma registrada ante el Congreso como cabildera de {p} ({firm}).', 'how.s.ldaPac': 'El comité político de {firm}, registrada ante el Congreso como cabildera de {p}.', 'how.s.ldaLob': 'Un cabildero de {firm}, firma registrada ante el Congreso como cabildera de {p}.', 'how.s.ldaEmp': 'El reporte indica {firm} como empleador; {firm} está registrada ante el Congreso como cabildera de {p}.', 'how.s.ld203': ' Según el reporte de contribuciones que el cabildero o la firma presentó al Congreso.', 'how.s.ldaOwn': 'Un cabildero del propio personal de {p}, registrado ante el Congreso.', 'how.s.noFec': ' No aparece en los reportes de la campaña ante la FEC al 19 de octubre de 2026.', srcL: 'reporte', cmteL: 'Tabla del comité', reqPage: 'Página de solicitudes del miembro', 'st.norequests': 'no hizo solicitudes de fondos para proyectos en 2025 ni 2026 (tablas del Comité de Asignaciones del Senado con las solicitudes de cada senador)', howFed: 'Cada miembro del Congreso puede pedir fondos para proyectos locales específicos (Community Project Funding en la Cámara, Congressionally Directed Spending en el Senado) y debe publicar cada solicitud. Cada tarjeta muestra una solicitud, el grupo que recibiría el dinero, las firmas registradas ante el Congreso como cabilderas de ese grupo (registros de la Ley de Divulgación de Cabildeo) y las donaciones al miembro del grupo, esas firmas, sus comités políticos o sus cabilderos, según los reportes de la FEC y los reportes de contribuciones de los propios cabilderos (LD-203).', offBallotF: 'Solo aparecen los miembros del Congreso en la boleta del 3 de noviembre en Miami-Dade.', gaveN: '<b>{donor}</b> donó {amt} a {acct} en {n} donaciones entre el {date} y el {last}', 'how.s.clsF': 'Negocio: {occ}. Del reporte de la campaña ante la FEC.', cboL: 'Estimación de la Oficina de Presupuesto del Congreso', crsL: 'Informe del Servicio de Investigación del Congreso', frL: 'Aviso en el Federal Register', howFedV: 'Los votos en el pleno son sobre proyectos que se convirtieron en ley en 2025 en los que una estimación de la Oficina de Presupuesto del Congreso, un informe del Servicio de Investigación del Congreso o la regla que se anula nombra el tipo de negocio afectado. Los donantes son esos negocios a través de sus comités de acción política (PAC); no se cuentan las donaciones de sus empleados. Un PAC que donó más de una vez aparece en una sola línea con su total.',
    },
    ht: {
      title: 'Aksyon ofisyèl: vòt, lobiyis ak kado',
      lede: 'Paj sa a kòmanse ak vòt la. Pou chak aksyon Komisyon Konte Miami-Dade ki benefisye yon konpayi oswa yon gwoup ki gen non, li montre kijan chak komisè te vote, ki moun ki te anrejistre nan konte a kòm lobiyis pou konpayi sa a, epi si konpayi a, lobiyis sa yo oswa konpayi lobi yo te bay yon komisè ki sou bilten vòt 3 novanm 2026 la. Nou mete kado yo ak dat rapò yo montre, anvan oswa apre vòt la. Anyen isit la pa di yo te achte yon vòt.',
      loading: 'N ap chaje…', loadErr: 'Nou pa t ka chaje lis la. Eseye ankò nan yon minit.',
      search: 'Chèche yon konpayi, yon lobiyis, yon donatè oswa yon nimewo dosye', noresult: 'Anyen pa koresponn ak rechèch sa a.',
      'body.county': 'Komisyon Konte', 'body.cities': 'Vil yo (apre)', 'body.state': 'Lejislati Florid (apre vil yo)',
      sActs: 'aksyon depi {date}', sLob: 'ak yon lobiyis anrejistre', sGift: 'ak yon kado bay yon komisè ki sou bilten an', sUpdated: 'dènye verifikasyon',
      onBallot: 'Sou bilten an: {name}, kandida pou {race}. Kado nou verifye nan:',
      offBallot: 'Lòt {n} komisè yo pa sou bilten vòt 3 novanm lan. Nou montre vòt yo, men nou pa verifye donatè yo.',
      fAll: 'Tout aksyon', fGift: 'Kado bay yon moun ki sou bilten an', fSplit: 'Vòt divize', fLob: 'Lobiyis anrejistre',
      'kind.award': 'Kontra bay', 'kind.change': 'Chanjman kontra', 'kind.lease': 'Lokasyon oswa akò', 'kind.zoning': 'Zonaj', 'kind.landuse': 'Chanjman plan itilizasyon tè', 'kind.plat': 'Plan teren', 'kind.easement': 'Sèvitid', 'kind.land': 'Tè konte', 'kind.funding': 'Lajan', 'kind.finance': 'Finansman', 'kind.labor': 'Kontra sendika', 'kind.district': 'Distri espesyal', 'kind.other': 'Lòt',
      'meeting.bcc': 'Reyinyon komisyon', 'meeting.zoning': 'Reyinyon zonaj ak itilizasyon tè',
      'res.adopted': 'Adopte', 'res.approved': 'Apwouve', 'res.approvedCond': 'Apwouve ak kondisyon', 'res.denied': 'Refize', 'res.firstReading': 'Pase nan premye lekti',
      party: 'Konpayi oswa gwoup ki nonmen nan dosye a: {p}', parties: 'Konpayi oswa gwoup ki nonmen nan dosye a: {p}',
      unan: 'alinanimite', tally: '{y}-{n}',
      'v.yes': 'Wi', 'v.no': 'Non', 'v.absent': 'Absan', 'v.excused': 'Eskize', 'v.vacant': 'Poko te chita',
      votedBy: '{name}: {v}', allVotes: 'Kijan 13 manm yo te vote', grayNote: 'An gri: pa sou bilten vòt 3 novanm lan, nou pa verifye donatè yo.',
      moved: 'Mosyon {m}, apiye pa {s}.',
      lobbied: 'Anrejistre nan konte a kòm lobiyis pou konpayi a', lobFor: 'pou {p}', lobReg: 'anrejistre {date}', lobMore: 'Montre tout {n} lobiyis yo',
      gifts: 'Kado bay komisè ki sou bilten an', gave: '<b>{donor}</b> bay {amt} {date} pou {acct}',
      'how.party': 'Moun ki bay la se konpayi ki nonmen nan dosye a.',
      'how.lobbyist': 'Menm non ak {lob}, anrejistre kòm lobiyis pou {p}{basis}.',
      'how.firm': 'Yon konpayi lobi ki gen menm adrès biwo ak {lob}, anrejistre kòm lobiyis pou {p}.',
      basisAddr: '; rapò a montre menm adrès ak anrejistreman an', basisOcc: '; rapò a bay travay la kòm “{occ}”',
      noGift: 'Nou pa jwenn okenn kado konpayi a, lobiyis anrejistre li yo oswa konpayi yo nan {accts}.',
      matter: 'Dosye konte {id}', clerk: 'Rezolisyon siyen ak vòt la', minutes: 'Pwosè-vèbal reyinyon an', draft: 'bouyon', registry: 'Rejis lobiyis',
      how1: 'Kijan nou fè l: nou chèche chak dosye Komisyon Konte a te deside depi 18 novanm 2025 (lè komisè Lopez te chita) rive 6 oktòb 2026, pou jwenn yon konpayi prive, yon devlopè oswa yon gwoup ki gen non ki resevwa yon kontra, yon lokasyon, tè, yon apwobasyon zonaj, lajan oswa yon chanjman nan yon akò ki la deja. Nou pa mete dosye woutin ki pa gen yon benefisyè ki gen non. Chak vòt soti nan pwosè-vèbal Grefye Konsèy la, ki montre mosyon an, total la, chak vòt non ak chak absans, epi nou konpare l ak vòt ki nan rezolisyon siyen an lè grefye a pibliye l. Anpil pwosè-vèbal toujou make bouyon.',
      how2: 'Nou mare kado yo twa fason, epi chak kado di kilès: moun ki bay la se konpayi a menm; moun ki bay la gen menm non ak yon lobiyis anrejistre sou dosye a epi rapò a montre menm adrès la oswa yon travay avoka, lobiyis oswa konsiltan; oswa moun ki bay la se yon konpayi lobi nan menm adrès biwo ak yon lobiyis anrejistre sou dosye a. Nan vil ki pa gen rejis, nòt anba kado a di kijan li konekte. Nou ekri non yo jan chak dosye ekri yo. Nou verifye sèlman ofisyèl ki sou bilten vòt 3 novanm lan. Li <a href="/methodology#decisions">tout metòd la</a>. Ou jwenn yon erè? Ekri <a href="mailto:corrections@ballot305.org">corrections@ballot305.org</a>.',
      foot: '<a href="/">Retounen sou Ballot305.org</a> · <a href="/actions">Donatè, lobiyis ak aksyon ofisyèl pa kandida</a> · <a href="/methodology">Kijan li mache</a> · <a href="/about">Konsènan</a>',
      lede2: 'Paj sa a kòmanse ak vòt la. Pou chak aksyon Komisyon Konte Miami-Dade ak konsèy vil yo ki benefisye yon konpayi oswa yon gwoup ki gen non, li montre kijan chak manm te vote, ki moun ki te anrejistre kòm lobiyis pou konpayi sa a, epi si konpayi a, lobiyis sa yo oswa konpayi lobi yo te bay yon ofisyèl ki sou bilten vòt 3 novanm 2026 la. Nou mete kado yo ak dat rapò yo montre, anvan oswa apre vòt la. Anyen isit la pa di yo te achte yon vòt.',
      'body.state2': 'Lejislati Florid (apre)', sActs2: 'aksyon nan lis la', sGift2: 'ak yon kado bay yon moun ki sou bilten an',
      offBallot2: 'Lòt manm yo pa sou bilten vòt 3 novanm lan. Nou montre vòt yo, men nou pa verifye donatè yo.',
      allVotes2: 'Kijan chak manm te vote', gifts2: 'Kado bay manm ki sou bilten an', lobbied2: 'Lobiyis anrejistre pou konpayi a',
      'res.passed': 'Pase', 'res.failed': 'Pa pase', 'res.withdrawn': 'Retire anvan vòt', 'kind.permit': 'Pèmi',
      rollPartial: 'Dosye a di vòt la te alinanimite men li pa nonmen chak manm; non nou montre yo se sa li bay.', consentNote: 'Pase nan ajanda konsantman an.',
      'role.moved': 'te pwopoze mosyon an', 'role.seconded': 'te apiye', 'role.presented': 'te prezante dosye a', 'role.sponsoredItem': 'te parennen dosye a',
      firstReading: 'Premye lekti: {date}.', namedLobbyist: 'Lobiyis ajanda a nonmen: {n}', coverageH: 'Sa nou verifye', alsoOn: '{name}, ki sou bilten an tou pou {race}:', pickBody: 'Chwazi yon komisyon, yon konsèy oswa yon lejislati anwo a pou w wè aksyon li yo.',
      record: 'Dosye reyinyon an', legistar: 'Dosye vil la', othersH: 'Lòt vil ki gen ofisyèl sou bilten an',
      'st.none': 'revize; nou pa jwenn aksyon ofisyèl ki nonmen youn nan donatè li yo', 'st.nodata': 'pa gen rapò kanpay detaye, kidonk nou pa ka verifye', 'st.nogivers': 'rapò li yo pa gen donatè deyò',
      howCity: 'Pou chak vil, bwat ki anba non li a di sa nou verifye. Kote vil la pibliye yon rejis lobiyis, lis la kòmanse ak sa kliyan lobiyis anrejistre yo te mande; kote li pa pibliye l, lis la kòmanse ak dosye ki nonmen yon donatè yon moun ki sou bilten an, epi nou montre kado sa yo ak yon nòt sou kijan yo konekte.',
      lede3: 'Paj sa a kòmanse ak aksyon ofisyèl la. Pou chak aksyon Komisyon Konte Miami-Dade ak konsèy vil yo ki benefisye yon konpayi oswa yon gwoup ki gen non, li montre kijan chak manm te vote, ki moun ki te anrejistre pou fè lobi pou konpayi sa a, epi si konpayi a, lobiyis sa yo oswa fèm yo te bay yon ofisyèl ki sou bilten 3 novanm 2026 la. Pou lejislatè Leta yo, aksyon yo se demann bidjè yo te depoze. Kado yo parèt ak dat rapò yo bay, anvan oswa apre aksyon an. Anyen isit la pa di yo te achte yon vòt oswa yon demann.',
      'v.requested': 'te depoze demann sa a', 'kind.request': 'Demann bidjè', 'res.requested': 'Te mande {amt} nan bidjè Leta a', 'res.requestedW': 'Te mande {amt} nan bidjè Leta a; pita yo make l retire',
      partyS: 'Ta resevwa lajan an: {p}', lobbiedS: 'Lobiyis ki nonmen sou fòm nan', formLink: 'Fòm demann nan',
      noGiftS: 'Nou pa jwenn okenn kado nan gwoup ki ta resevwa lajan an, fèm lobi ki sou fòm nan, PAC li oswa lobiyis li yo nan {accts}.',
      'how.s.named': 'Menm non ak {lob}, lobiyis ki nonmen sou fòm nan. Rapò a bay okipasyon an kòm “{occ}”.',
      'how.s.firm': 'Fèm lobi ki nonmen sou fòm nan ({firm}).',
      'how.s.firmpac': 'Komite politik fèm lobi ki nonmen sou fòm nan ({firm}).',
      'how.s.firmlob': 'Yon lobiyis nan fèm ki nonmen sou fòm nan ({firm}).',
      'how.s.party': 'Moun ki bay la se gwoup fòm nan nonmen pou resevwa lajan an.',
      offBallotS: 'Se sèlman manm Miami-Dade ki sou bilten 3 novanm nan ki parèt, ak Angie Nixon, ki soti Jacksonville epi k ap kandida pou Sena Etazini.',
      howState: 'Chak lejislatè Leta depoze fòm pou mande lajan nan bidjè a pou yon pwojè. Fòm nan nonmen manm nan, gwoup ki ta resevwa lajan an, ak lobiyis anrejistre k ap travay sou li. Yon kado nan men youn nan lobiyis yon fèm oswa nan komite politik fèm nan konte kòm yon kado fèm nan, kèlkeswa kantite a. Chak demann di tou si nimewo fòm li nan bidjè final la epi si gouvènè a te mete veto sou li. Vòt nan sesyon plenyè yo se sou pwojè ki te tounen lwa lè analiz anplwaye Lejislati a di pwojè a ede yon kalite biznis ki te bay manm nan lajan.',
      'reg.confirmed': 'Anrejistre nan Lejislati a kòm lobiyis pou {p} ({y}).', 'reg.confirmedAs': 'Anrejistre nan Lejislati a kòm lobiyis pou {p} ({y}). Fòm nan rele gwoup la “{rec}”.', 'reg.confirmedRequester': 'Anrejistre nan Lejislati a kòm lobiyis pou {p} ({y}), ke fòm nan bay kòm gwoup k ap fè demann nan.', 'reg.otherClients': 'Anrejistre nan Lejislati a, men nou pa jwenn li anrejistre pou yon kliyan ki rele “{rec}” nan lis 2024, 2025 oswa 2026 yo.', 'reg.notFound': 'Nou pa jwenn li nan lis lobiyis Lejislati a pou 2024, 2025 oswa 2026.', fUnreg: 'Lobiyis pa anrejistre pou kliyan an', 'bud.in': 'Nan bidjè final {fy} la ({law}, {ch}) pou {amt}.', 'bud.inNoAmt': 'Yo nonmen l nan bidjè final {fy} la ({law}, {ch}); tèks la pa bay yon kantite apa pou li.', 'bud.more': 'Yo nonmen l tou nan yon pati bidjè a ki pa bay yon kantite apa.', 'bud.veto': 'Gouvènè a te mete veto sou {amt} ladan l.', 'bud.vetoAll': 'Gouvènè a te mete veto sou li ({amt}).', 'bud.notIn': 'Nimewo fòm {ref} la pa parèt nan bidjè final {fy} la ({law}, {ch}).', 'bud.law': 'Bidjè final', 'bud.vetoL': 'Lis veto gouvènè a', fFund: 'Nan bidjè final la', 'kind.bill': 'Vòt nan sesyon plenyè sou yon pwojè lwa', 'v.nv': 'Pa t vote', 'v.abstain': 'Te abstni', 'how.s.cls': 'Travay yo deklare: {occ}.', noGiftB: 'Nou pa jwenn okenn kado nan donatè nòt la dekri yo nan {accts}.', fBill: 'Vòt sou pwojè lwa', rollCall: 'Lis vòt la', analysisL: 'Analiz Lejislati a', billL: 'Paj pwojè a',
      'res.requestedF': 'Te mande {amt} nan bidjè federal la (demann lajan pou yon pwojè)', lobbiedF: 'Anrejistre nan Kongrè a kòm lobiyis pou gwoup ki t ap resevwa lajan an', noGiftF: 'Nou pa jwenn okenn kado nan men gwoup ki t ap resevwa lajan an, fèm lobi federal li yo, komite politik yo oswa lobiyis yo nan {accts}.', 'how.s.ldaFirm': 'Yon fèm lobi ki anrejistre nan Kongrè a pou {p} ({firm}).', 'how.s.ldaPac': 'Komite politik {firm}, ki anrejistre nan Kongrè a kòm lobiyis pou {p}.', 'how.s.ldaLob': 'Yon lobiyis nan {firm}, yon fèm ki anrejistre nan Kongrè a kòm lobiyis pou {p}.', 'how.s.ldaEmp': 'Rapò a bay {firm} kòm patwon; {firm} anrejistre nan Kongrè a kòm lobiyis pou {p}.', 'how.s.ld203': ' Selon rapò kontribisyon lobiyis la oswa fèm nan bay Kongrè a.', 'how.s.ldaOwn': 'Yon lobiyis nan pwòp anplwaye {p}, ki anrejistre nan Kongrè a.', 'how.s.noFec': ' Nou pa jwenn li nan rapò FEC kanpay la jiska 19 oktòb 2026.', srcL: 'rapò', cmteL: 'Tablo komite a', reqPage: 'Paj demann manm nan', 'st.norequests': 'pa t fè okenn demann lajan pou pwojè an 2025 oswa 2026 (tablo Komite Afektasyon Sena a ak demann chak senatè)', howFed: 'Chak manm Kongrè a ka mande lajan pou pwojè lokal espesifik (Community Project Funding nan Chanm nan, Congressionally Directed Spending nan Sena a) epi yo dwe pibliye chak demann. Chak kat montre yon demann, gwoup ki t ap resevwa lajan an, fèm ki anrejistre nan Kongrè a kòm lobiyis pou gwoup sa a (dosye Lwa sou Divilgasyon Lobi), ak kado bay manm nan nan men gwoup la, fèm sa yo, komite politik yo oswa lobiyis yo, selon rapò FEC ak rapò kontribisyon lobiyis yo menm (LD-203).', offBallotF: 'Se sèlman manm Kongrè ki sou bilten 3 novanm Miami-Dade la ki parèt.', gaveN: '<b>{donor}</b> bay {acct} {amt} nan {n} kado ant {date} ak {last}', 'how.s.clsF': 'Biznis: {occ}. Soti nan rapò FEC kanpay la.', cboL: 'Estimasyon Biwo Bidjè Kongrè a', crsL: 'Rapò Sèvis Rechèch Kongrè a', frL: 'Avi nan Federal Register', howFedV: 'Vòt nan sesyon plenyè yo se sou pwojè ki te tounen lwa an 2025 kote yon estimasyon Biwo Bidjè Kongrè a, yon rapò Sèvis Rechèch Kongrè a oswa règ y ap anile a nonmen kalite biznis ki konsène. Donatè yo se biznis sa yo ki bay atravè PAC yo; nou pa konte kado anplwaye yo. Yon PAC ki te bay plis pase yon fwa parèt sou yon sèl liy ak total li.',
    }
  };

  function make(getLang){
    var LANG;
  function t(k, v){ var s = (S[LANG][k] != null ? S[LANG][k] : S.en[k]) || ''; return v ? s.replace(/\{(\w+)\}/g, function(_, n){ return v[n] != null ? v[n] : ''; }) : s; }
    function esc(x){ return String(x == null ? '' : x).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function L(x){ return x && typeof x === 'object' ? (x[LANG] || x.en || '') : (x || ''); }
    function usd(n){ return '$' + Math.round(Number(n) || 0).toLocaleString('en-US'); }
    function day(d){ var m = String(d||'').match(/^(\d{4})-(\d{2})-(\d{2})/); if(!m) return ''; try { return new Date(+m[1], +m[2]-1, +m[3]).toLocaleDateString(LANG === 'ht' ? 'fr' : LANG, {month:'short', day:'numeric', year:'numeric'}); } catch(e){ return d; } }
    function link(u, txt){ return /^https:\/\//.test(u || '') ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(txt) + ' ↗</a>' : ''; }
    function norm(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    function list(a){ return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + (LANG === 'es' ? ' y ' : LANG === 'ht' ? ' ak ' : ' and ') + a[a.length - 1]; }

  function mem(B, k){ for(var i = 0; i < B.members.length; i++) if(B.members[i].key === k) return B.members[i].name; return k; }
    function acctNames(B, keys){ return list(keys.map(function(k){ return B.accounts[k] ? L(B.accounts[k].name) : k; })); }
    function vword(v){ return t('v.' + (v || 'vacant')); }
    function hasGift(a){ return (a.gifts || []).length > 0; }
    function isSplit(a){ return !!(a.tally && a.tally[1] > 0); }
    function regDates(l){ var r = (l.regs || (l.reg ? [l.reg] : [])).slice().sort(); if(!r.length) return ''; var a0 = /^\d{4}-\d{2}$/.test(r[0]) ? r[0] : day(r[0]), a1 = /^\d{4}-\d{2}$/.test(r[r.length-1]) ? r[r.length-1] : day(r[r.length-1]); return a0 === a1 ? a0 : a0 + ' – ' + a1; }

    function lobHtml(B, a){
      var ls = a.lobbied || [], out = '', LH = B.level === 'federal' ? t('lobbiedF') : B.type === 'requests' ? t('lobbiedS') : t('lobbied2');
      if(a.namedLobbyist) out += '<div class="lob">' + t('namedLobbyist', {n: esc(a.namedLobbyist)}) + '</div>';
      if(!ls.length) return out ? '<div class="lobs"><div class="h">' + LH + '</div>' + out + '</div>' : '';
      var by = {}, order = [];
      ls.forEach(function(l){ var k = l.for || ''; if(!by[k]){ by[k] = []; order.push(k); } by[k].push(l); });
      var rows = order.map(function(p){
        return by[p].map(function(l){ var d = regDates(l); return '<div class="lob"><b>' + esc(l.name) + '</b>' + (l.firm ? ' (' + esc(l.firm) + ')' : '') + (p && (order.length > 1 || !a.parties || a.parties.indexOf(p) < 0) ? ' ' + t('lobFor', {p: esc(p)}) : '') + (d ? ' · ' + t('lobReg', {date: esc(d)}) : '') + (l.legReg ? '<div class="how2">' + t('reg.' + l.legReg.status, {p: esc(l.legReg.principal), y: esc(list(l.legReg.years || [])), rec: esc(l.for)}) + '</div>' : '') + '</div>'; }).join('');
      }).join('');
      var head = '<div class="h">' + LH + '</div>' + out;
      if(ls.length > 6) return '<div class="lobs">' + head + '<details><summary>' + t('lobMore', {n: ls.length}) + '</summary>' + rows + '</details></div>';
      return '<div class="lobs">' + head + rows + '</div>';
    }
    function giftHtml(B, a){
      var on = Object.keys(B.onBallot), out = '', gs = a.gifts || [];
      if(gs.length){
        var by = {}, order = [];
        gs.forEach(function(g){ if(!by[g.to]){ by[g.to] = []; order.push(g.to); } by[g.to].push(g); });
        out += '<div class="gifts"><div class="h">' + t('gifts2') + '</div>' + order.map(function(k){
          var note = a.giftNotes && a.giftNotes[k] ? '<div class="how2">' + esc(L(a.giftNotes[k])) + '</div>' : '';
          return by[k].map(function(g){
            var acc = B.accounts[g.acct] ? L(B.accounts[g.acct].name) : mem(B, g.to);
            var how = '';
            if(g.rel) how = t('how.s.' + g.rel, {lob: esc(g.lobbyist), firm: esc(g.firmName), occ: esc(L(g.occ)), p: esc(g.forParty)}) + (g.why ? ' (' + esc(L(g.why)) + ')' : '') + (g.ld203 ? t('how.s.ld203') : '');
            else if(g.kind === 'party') how = t('how.party');
            else if(g.kind === 'lobbyist') how = t('how.lobbyist', {lob: esc(g.lobbyist), p: esc(g.forParty), basis: g.basis === 'addr' ? t('basisAddr') : g.occ ? t('basisOcc', {occ: esc(L(g.occ))}) : ''});
            else if(g.kind === 'firm') how = t('how.firm', {lob: esc(g.lobbyist), p: esc(g.forParty)});
            if(g.fec === false) how += t('how.s.noFec');
            return '<div class="gift">' + (g.n > 1 ? t('gaveN', {donor: esc(g.donor), amt: usd(g.amount), n: g.n, date: esc(day(g.date)), last: esc(day(g.last)), acct: esc(acc)}) : t('gave', {donor: esc(g.donor), amt: usd(g.amount), date: esc(day(g.date)), acct: esc(acc)})) + (g.src ? ' ' + link(g.src, t('srcL')) : '') + (how ? '<div class="how2">' + how + '</div>' : '') + '</div>';
          }).join('') + note;
        }).join('') + '</div>';
      }
      on.forEach(function(k){
        if(a.vacant === k || !(k in a.roll) || a.roll[k] == null) return;
        if(!gs.some(function(g){ return g.to === k; }) && B.onBallot[k].accounts) out += '<p class="nogift">' + t(B.type === 'requests' ? (a.kind === 'bill' ? 'noGiftB' : B.level === 'federal' ? 'noGiftF' : 'noGiftS') : 'noGift', {accts: esc(acctNames(B, B.onBallot[k].accounts))}) + '</p>';
      });
      return out;
    }
    function linkHtml(B, a){
      return (a.links || []).map(function(l){
        var lab = l.t === 'matter' ? (B.key === 'county' ? t('matter', {id: a.id}) : t('legistar') + (a.ref ? ' ' + a.ref : '')) : l.t === 'clerk' ? t('clerk') : l.t === 'minutes' ? t('minutes') + (l.draft ? ' (' + t('draft') + ')' : '') : l.t === 'vote' ? t('rollCall') : l.t === 'analysis' ? t('analysisL') : l.t === 'cbo' ? t('cboL') : l.t === 'crs' ? t('crsL') : l.t === 'fr' ? t('frL') : l.t === 'bill' ? t('billL') : l.t === 'cmte' ? t('cmteL') : B.level === 'federal' ? t('reqPage') : B.type === 'requests' ? t('formLink') : t('record');
        return link(l.url, lab);
      }).join('') + ((a.lobbied || []).length && B.registries ? B.registries.map(function(r){ return link(r.url, t('registry')); }).slice(0, 1).join('') : '');
    }
    function inBudget(a){ var b = a.budget; return !!(b && b.status === 'in' && !(b.vetoed && b.amount && b.vetoed >= b.amount)); }
    function budHtml(a){
      var b = a.budget; if(!b) return '';
      var p = {fy: esc(b.fy), law: esc(b.law), ch: esc(b.ch), ref: esc(b.ref)}, txt;
      if(b.status === 'notIn') txt = t('bud.notIn', p);
      else {
        txt = b.amount ? t('bud.in', Object.assign({amt: usd(b.amount)}, p)) : t('bud.inNoAmt', p);
        if(b.amount && b.someUnstated) txt += ' ' + t('bud.more');
        if(b.vetoed) txt += ' ' + t(b.amount && b.vetoed >= b.amount ? 'bud.vetoAll' : 'bud.veto', {amt: usd(b.vetoed)});
      }
      return '<div class="bud">' + txt + '</div>';
    }
    function budLinks(a){ var b = a.budget; if(!b) return ''; return link(b.url, t('bud.law') + ' ' + b.law) + (b.vetoed ? link(b.vetoUrl, t('bud.vetoL')) : ''); }
    function actHtml(B, a){
      var on = Object.keys(B.onBallot);
      var RQ = B.type === 'requests';
      var res = '<strong>' + t('res.' + a.result, {amt: usd(a.ask)}) + '</strong>';
      if(a.tally) res += ' ' + (a.tally[1] ? '<span class="split">' + t('tally', {y: a.tally[0], n: a.tally[1]}) + '</span>' : t('tally', {y: a.tally[0], n: 0}) + ', ' + t('unan'));
      else if(a.unanimous) res += ', ' + t('unan');
      var onb = on.filter(function(k){ return k in a.roll; }).map(function(k){
        var v = a.roll[k], r = (a.roles && a.roles[k]) || [];
        var extra = r.length ? ' · ' + r.map(function(x){ return t('role.' + x); }).join(', ') : (a.mover === k ? ' · ' + t('role.moved') : a.second === k ? ' · ' + t('role.seconded') : '');
        return '<span class="' + (v === 'no' ? 'no' : v === 'yes' || v === 'requested' ? '' : 'away') + '">' + esc(t('votedBy', {name: mem(B, k), v: v == null ? '—' : vword(v)})) + esc(extra) + '</span>';
      }).join('');
      var keys = Object.keys(a.roll);
      var roll = keys.length && !RQ ? B.members.map(function(m){ return m.key; }).filter(function(k){ return keys.indexOf(k) >= 0; }).concat(keys.filter(function(k){ return !B.members.some(function(m){ return m.key === k; }); })).map(function(k){
        var v = a.roll[k], ob = on.indexOf(k) >= 0;
        return '<span' + (ob ? '' : ' class="nb"') + '>' + (ob ? '<b>' + esc(mem(B, k)) + '</b>' : esc(mem(B, k))) + '</span><span class="' + (v === 'no' ? 'v-no' : '') + '">' + (v == null ? '—' : vword(v)) + '</span>';
      }).join('') : '';
      var mv = a.mover && a.second ? '<div class="note">' + t('moved', {m: esc(mem(B, a.mover)), s: esc(mem(B, a.second))}) + '</div>' : '';
      var partial = !a.rollComplete && keys.length ? '<div class="note">' + t('rollPartial') + '</div>' : '';
      var party = a.parties && a.parties.length ? '<div class="party">' + (RQ ? t('partyS', {p: esc(a.parties.join('; '))}) : a.parties.length > 1 ? t('parties', {p: esc(a.parties.join('; '))}) : t('party', {p: esc(a.parties[0])})) + '</div>' : '';
      var ttl = a.title ? esc(L(a.title)) : t('kind.' + a.kind) + ': ' + esc(L(a.subject));
      var meta = [a.dateLabel ? esc(L(a.dateLabel)) : esc(day(a.date))]; if(a.meeting) meta.push(t('meeting.' + a.meeting)); if(a.ref) meta.push(esc(a.ref));
      var search = norm([a.id, a.ref, L(a.subject), L(a.title), (a.parties || []).join(' ')].concat((a.lobbied || []).map(function(l){ return l.name + ' ' + (l.for || ''); })).concat((a.gifts || []).map(function(g){ return g.donor; })).join(' '));
      return '<div class="act" data-search="' + esc(search) + '" data-gift="' + (hasGift(a) ? 1 : 0) + '" data-split="' + (isSplit(a) ? 1 : 0) + '" data-lob="' + ((a.lobbied || []).length || a.namedLobbyist ? 1 : 0) + '" data-unreg="' + ((a.lobbied || []).some(function(l){ return l.legReg && /^(otherClients|notFound)$/.test(l.legReg.status); }) ? 1 : 0) + '" data-fund="' + (inBudget(a) ? 1 : 0) + '" data-bill="' + (a.kind === 'bill' ? 1 : 0) + '">' +
        '<div class="when">' + meta.join(' · ') + '</div><div class="ttl">' + ttl + '</div>' + party +
        '<div class="res">' + res + (a.consent ? ' · ' + t('consentNote') : '') + '</div>' + (RQ ? budHtml(a) : '') +
        (onb ? '<div class="onb">' + onb + '</div>' : '') +
        (roll ? '<details><summary>' + t('allVotes2') + '</summary><div class="roll">' + roll + '</div>' + partial + '<div class="note">' + t('grayNote') + '</div>' + mv + '</details>' : '') +
        (a.firstReading ? '<p class="note">' + t('firstReading', {date: esc(day(a.firstReading))}) + '</p>' : '') +
        (a.note ? '<p class="note">' + esc(L(a.note)) + '</p>' : '') +
        lobHtml(B, a) + giftHtml(B, a) + '<div class="links">' + linkHtml(B, a) + (RQ ? budLinks(a) : '') + '</div></div>';
    }

    function api(f){ return function(){ LANG = getLang(); return f.apply(null, arguments); }; }
    LANG = getLang();
    return { S: S, t: api(t), esc: esc, L: api(L), usd: usd, day: api(day), link: link, norm: norm, list: api(list),
      mem: mem, acctNames: api(acctNames), vword: api(vword), hasGift: hasGift, isSplit: isSplit, regDates: api(regDates),
      lobHtml: api(lobHtml), giftHtml: api(giftHtml), linkHtml: api(linkHtml), inBudget: inBudget, budHtml: api(budHtml),
      budLinks: api(budLinks), actHtml: api(actHtml) };
  }
  window.DecisionCard = make;
})();
