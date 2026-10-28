// Money summary per incumbent, in English, Spanish and Haitian Creole.
// Data: /data/money-summary.json (built by scripts/money-summary.mjs). Used by / and /decisions.
// moneySummary(entry, lang) returns HTML (names escaped).
//
// Writing rules: money first, then the actions. Every number says what it counts. Totals list their
// parts. Percentages name what they are a share of. Before and after are both stated in dollars, never
// "the rest". Nothing implies a gift bought an action.
// Every dollar, donor and item in the headline is from an action in the donor's favor: a yes vote, a request the
// official filed, or an action the official took (Brit, Oct 27, 2026). Donors tied to items the official voted no
// on are never in the total; their line (against) says so.
(function(){
  function esc(x){ return String(x == null ? '' : x).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function usd(n){ return '$' + Math.round(Number(n) || 0).toLocaleString('en-US'); }
  function big(n, lang){
    if(n < 1e6) return usd(n);
    var x = (Math.round(n / 1e5) / 10).toFixed(1).replace(/\.0$/, '');
    return '$' + x + (lang === 'es' ? ' millones' : lang === 'ht' ? ' milyon' : ' million');
  }
  function pct(a, b){ if(!b) return ''; var x = a / b * 100; return x > 0 && x < 1 ? '<1%' : Math.round(x) + '%'; }
  function L(o, lang){ return o && typeof o === 'object' ? (o[lang] || o.en) : o; }
  // he / his, she / her; a person with no pronoun on file is named instead
  function he(p){ return p.pron === 'she' ? 'she' : p.pron === 'he' ? 'he' : esc(p.last); }
  function his(p){ return p.pron === 'she' ? 'her' : p.pron === 'he' ? 'his' : esc(p.last) + '\u2019s'; }
  function him(p){ return p.pron === 'she' ? 'her' : p.pron === 'he' ? 'him' : esc(p.last); }
  // two shares of the same count that always add up to 100%
  function pair(t, n){ var a = Math.round(t / n * 100); if(t && !a) return ['<1%', '>99%']; if(t < n && a === 100) return ['>99%', '<1%']; return [a + '%', (100 - a) + '%']; }
  var MONTHS = {
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    es: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],
    ht: ['janvye','fevriye','mas','avril','me','jen','jiyè','out','septanm','oktòb','novanm','desanm']
  };
  // 'Since January 2025': the month of the first counted action (Brit, Oct 25, 2026)
  function since(from, lang){
    var m = String(from || '2025-01').match(/^(\d{4})-(\d{2})/) || [0, '2025', '01'];
    var mo = MONTHS[lang][+m[2] - 1], y = m[1];
    return lang === 'es' ? 'Desde ' + mo + ' de ' + y : lang === 'ht' ? 'Depi ' + mo + ' ' + y : 'Since ' + mo + ' ' + y;
  }
  function He(p){ var x = he(p); return x.charAt(0).toUpperCase() + x.slice(1); }
  var W = {
    en: {
      donors: function(n){ return n === 1 ? '1 donor' : n + ' donors'; },
      before: function(b){ return 'the ' + b; },
      // 1. The money: total, from how many donors, and which account got how much
      took: function(p, why){
        var s = esc(p.name) + ' took ' + usd(p.total) + ' from ' + this.donors(p.donors) + ' ' + why + '.';
        if(p.campaignAmt && p.committeeAmt) s += ' ' + usd(p.campaignAmt) + ' went to the campaign and ' + usd(p.committeeAmt) + ' to ' + (p.cmteRole === 'solicits' ? 'the political committee (PAC) ' + he(p) + ' reported raising money for.' : (p.body === 'county' ? 'the political committee (PAC) ' : 'the political committee' + ((p.committees != null ? p.committees > 1 : p.accounts > 2) ? 's ' : ' ')) + he(p) + ' chairs.');
        else if(p.committeeAmt) s += ' All of it went to the political committee ' + he(p) + ' chairs.';
        return s;
      },
      // what the record shows: an action the official took in the donor's favor, not that the donor benefited (Brit, Oct 27, 2026)
      whyAct: function(p, R, Bl, fed){
        if(p.kind === 'cabinet') return 'tied to official actions ' + he(p) + ' took in their favor: a yes vote on a contested Cabinet item where they were a party, or an action ' + he(p) + ' took as head of the office';
        var req = fed ? 'an earmark request ' + he(p) + ' filed' : 'a budget request ' + he(p) + ' filed', law = 'a yes vote on a contested law that helps their industry';
        var parts = (R && R.money ? [req] : []).concat(Bl && Bl.money ? [law] : []);
        return 'tied to official actions ' + he(p) + ' took in their favor: ' + (parts.length ? parts.join(', or ') : req + ', or ' + law);
      },
      whyBody: function(p, b){ return 'whose business before ' + this.before(b) + ' got ' + his(p) + ' yes vote'; },
      // 2. Where it came from (state legislators and Congress); the parts add up to the total above
      // a lobbying firm is paid to lobby for its client; it is named as the client's lobbying firm, never as the one getting the money
      fromReq: function(p, R, fed, b){ return usd(R.money) + ' came from ' + (fed ? 'the federal lobbying firm (or its PAC or lobbyists) for the group that would get the money, on ' + R.n + ' earmark request' + (R.n === 1 ? '' : 's') + ' ' + he(p) + ' filed' : 'the lobbying firm for the group that would get the money, or from that group, on ' + R.n + ' budget request' + (R.n === 1 ? '' : 's') + ' ' + he(p) + ' filed in ' + this.before(b)) + '.'; },
      fromBills: function(p, Bl, fed){ var one = Bl.bills === 1 && Bl.yes === 1; return usd(Bl.money) + ' came from ' + (fed ? 'PACs' : 'donors') + ' in ' + (one ? 'an industry that a contested law' : 'industries that contested laws') + ' ' + he(p) + ' voted yes on may help, by ' + (one ? 'its' : 'their') + ' official analysis.'; },
      // Donors tied only to items the official voted no on: context, never in the total
      against: function(p, A, fed){
        var what = A.bills != null ? (A.bills === 1 ? 'a bill that helps' : A.bills + ' bills that help') + ' industries whose ' + (fed ? 'PACs' : 'donors') + ' gave ' + usd(A.money)
          : (A.votes === 1 ? '1 item' : A.votes + ' items') + ' that helped donors who gave ' + usd(A.money);
        return He(p) + ' voted no on ' + what + '. That money is not counted above.';
      },
      noneYes: function(p, b){ return 'No donors found tied to actions ' + he(p) + ' took in their favor in ' + this.before(b) + (p.giftsFrom ? ' from ' + p.giftsFrom.slice(0, 4) + ' on.' : ' in 2025 or 2026.'); },
      // 3. Timing, both sides in dollars
      timing: function(p, what){
        if(!p.beforeAmt) return 'All of it came in after the ' + what + '.';
        if(!p.afterAmt || p.before === p.gifts) return 'All of it came in before the ' + what + '.';
        return usd(p.beforeAmt) + ' came in before the ' + what + ' it is tied to. ' + usd(p.afterAmt) + ' came in after.';
      },
      whatReq: 'request or vote', whatBill: 'vote', whatVote: 'vote or action',
      // 4. The actions
      req: function(p, R, fed){
        var s = (R.n === 1 ? 'That request asked' : 'Those ' + R.n + ' requests asked') + ' for ' + big(R.ask, 'en') + ' in all.';
        if(fed) return s + (R.fedChecked ? ' Of the ' + R.fedChecked + ' made for FY2022-FY2025, which asked for ' + big(R.fedAsk, 'en') + ', ' + big(R.fedFunded, 'en') + ' was funded in the final laws.' + (R.fedChecked < R.n ? ' Whether the newer ones were funded is not checked here yet.' : '') : ' Whether they were funded is not checked here yet.');
        if(!R.inBudget) return s + ' None of it was in the final budget.';
        var share = pct(R.funded, R.ask);
        if(R.vetoed) return s + ' ' + big(R.inBudget, 'en') + ' was put in the budget. The governor vetoed ' + big(R.vetoed, 'en') + ' of the ' + big(R.inBudget, 'en') + ', leaving ' + big(R.funded, 'en') + ' in the final budget' + (share ? ': about ' + share + ' of the ' + big(R.ask, 'en') + ' requested.' : '.');
        return s + ' ' + big(R.funded, 'en') + ' was in the final budget' + (share ? ': about ' + share + ' of the ' + big(R.ask, 'en') + ' requested.' : '.');
      },
      // every bill vote counted is a yes
      bills: function(p, Bl){
        return He(p) + ' voted yes on ' + (Bl.bills === 1 ? 'the bill' : 'all ' + Bl.bills + ' bills') + (Bl.votes > Bl.bills ? ' (' + Bl.votes + ' floor votes in all)' : '') + '.';
      },
      // every item counted is a yes vote
      voted: function(p, b){
        return He(p) + ' voted yes on ' + (p.items === 1 ? '1 item' : p.items + ' items') + (p.since ? ' since ' + p.since : '') + ' before ' + this.before(b) + ' where a donor had business.';
      },
      cabinet: function(p){
        var parts = [];
        if(p.votes) parts.push('voted yes on ' + (p.yes === p.votes ? (p.votes === 1 ? 'the one Cabinet vote' : 'all ' + p.votes + ' Cabinet votes') : p.yes + ' of ' + p.votes + ' Cabinet votes') + ' where a donor was a party');
        if(p.acted) parts.push('took ' + p.acted + ' action' + (p.acted === 1 ? '' : 's') + ' as head of the office that named a donor, or a kind of business that gave');
        return He(p) + ' ' + parts.join(', and ') + '.';
      },
      split: function(p){ return p.items === 1 ? 'It was a split vote (at least one member voted no).' : p.split + ' of the ' + p.items + (p.split === 1 ? ' was a split vote' : ' were split votes') + ' (at least one member voted no).'; },
      // The standard (Brit, Oct 25, 2026): Since <month year>, <he> <acts tied to donors> <n> (<%>). On <n> (<%>), they did not.
      billShare: function(p, U, fed){
        var q = pair(U.tied, U.n), r = U.n - U.tied;
        // the pool is the laws whose floor vote was not unanimous (Brit, Oct 27, 2026)
        return since(U.from, 'en') + ', of the ' + U.n + ' new ' + (U.n === 1 ? 'law' : 'laws') + ' ' + he(p) + ' voted on that ' + (U.n === 1 ? 'was' : 'were') + ' not passed unanimously, ' + he(p) + ' voted yes on ' + U.tied + ' (' + q[0] + ') that help an industry whose ' + (fed ? 'PACs' : 'donors') + ' gave ' + him(p) + ' money. On the other ' + r + ' (' + q[1] + '), ' + he(p) + ' voted no or none of ' + his(p) + ' ' + (fed ? 'PACs' : 'donors') + ' were in the industry helped.';
      },
      share: function(p, S, b){
        if(S.def === 'donorFirst') return 'This city’s list was built by starting from ' + his(p) + ' donors, because the city posts no usable lobbyist registry. So there is no fair count of the actions that did not involve a donor.';
        var q = pair(S.tied, S.n), r = S.n - S.tied, k = S.tied + ' (' + q[0] + ')', s0 = since(S.from, 'en') + ', ' + he(p) + ' ';
        var act = S.def === 'earmarks' ? 'filed ' + S.tied + ' earmark ' + (S.tied === 1 ? 'request' : 'requests') + ' (' + q[0] + ') for groups whose lobbyists gave to ' + him(p)
          : S.def === 'requests' ? 'filed ' + S.tied + ' budget ' + (S.tied === 1 ? 'request' : 'requests') + ' (' + q[0] + ') where a lobbyist, or the group getting the money, gave to ' + him(p)
          : S.def === 'cabinet' ? 'took ' + S.tied + ' ' + (S.tied === 1 ? 'action' : 'actions') + ' as head of the office (' + q[0] + ') that helped one of ' + his(p) + ' donors'
          : null;
        // votes: the pool is the votes that were not unanimous (Brit, Oct 27, 2026)
        if(act === null) return since(S.from, 'en') + ', of the ' + S.n + ' ' + (S.n === 1 ? 'vote' : 'votes') + ' ' + he(p) + ' cast that ' + (S.n === 1 ? 'was' : 'were') + ' not unanimous, ' + S.tied + ' (' + q[0] + ') helped one of ' + his(p) + ' donors. On the other ' + r + ' (' + q[1] + '), ' + he(p) + ' voted no or no donor was involved.';
        // requests are all the member's own: the rest had no donor. Votes: the rest were a no vote or had no donor.
        var rest = S.def === 'earmarks' || S.def === 'requests' ? 'On ' + r + ' (' + q[1] + '), they did not.'
          : 'On the other ' + r + ' (' + q[1] + '), no donor was involved. Cabinet votes are not counted: the record shows no vote against any of them, and unanimous votes are not ties.';
        return s0 + act + '. ' + rest;
      },
      tookBills: function(p, Bl, fed){ var n = p.donors; return He(p) + ' took ' + usd(p.total) + ' from ' + (fed ? (n === 1 ? '1 PAC' : n + ' PACs') : this.donors(n)) + ' in ' + (Bl.bills === 1 ? 'an industry that a contested law' : 'industries that contested laws') + ' ' + he(p) + ' voted yes on may help, by ' + (Bl.bills === 1 ? 'its' : 'their') + ' official analysis.'; },
      none: function(p, b){ return 'No donors found with business before ' + this.before(b) + (p.giftsFrom ? ' from ' + p.giftsFrom.slice(0, 4) + ' on.' : ' in 2025 or 2026.'); },
      nogivers: function(p){ return esc(p.name) + '’s reports show no outside donors.'; },
      nodata: function(p){ return 'No itemized donor reports are posted for ' + esc(p.name) + ', so this could not be checked.'; },
      noneCity: 'No donors found with business before the city in 2025 or 2026.',
      noneF: function(p){ return 'None of ' + esc(p.name) + '’s earmark requests were for a group whose federal lobbying firm, its PAC or its lobbyists gave to the campaign.'; },
      norequests: function(p){ return esc(p.name) + ' made no earmark requests in 2025 or 2026.'; },
      gap: function(p, g){ var y = g.years[0] === g.years[1] ? 'for ' + g.years[0] : 'from ' + g.years[0] + ' through ' + g.years[1];
        return 'Campaign reports for ' + esc(p.name) + ' ' + y + (g.why === 'cantRead' ? ' could not be read' : ' are not online') + ', so donations from ' + (g.years[0] === g.years[1] ? 'that year' : 'those years') + ' are not counted. Ties between donors and ' + his(p) + ' votes may be missing.'; },
      how: 'How this is counted'
    },
    es: {
      donors: function(n){ return n === 1 ? '1 donante' : n + ' donantes'; },
      before: function(b){ var w = String(b).split(' ')[0]; return (/^(Concejo|Senado)$/.test(w) ? 'el ' : /^(Comisi|Cámara|Junta)/.test(w) ? 'la ' : '') + b; },
      took: function(p, why){
        var s = esc(p.name) + ' recibió ' + usd(p.total) + ' de ' + this.donors(p.donors) + ' ' + why + '.';
        if(p.campaignAmt && p.committeeAmt) s += ' ' + usd(p.campaignAmt) + ' fue a la campaña y ' + usd(p.committeeAmt) + ' ' + (p.cmteRole === 'solicits' ? 'al comité político (PAC) para el que declaró recaudar fondos' : (p.committees != null ? p.committees > 1 : p.accounts > 2) ? 'a los comités políticos que preside' : 'al comité político' + (p.body === 'county' ? ' (PAC)' : '') + ' que preside') + '.';
        else if(p.committeeAmt) s += ' Todo fue al comité político que preside.';
        return s;
      },
      whyAct: function(p, R, Bl, fed){
        if(p.kind === 'cabinet') return 'vinculados a actos oficiales que tomó a su favor: un voto a favor en un asunto del Gabinete no unánime en el que eran parte, o un acto como jefe de su oficina';
        var req = fed ? 'una solicitud de fondos para proyectos que presentó' : 'una solicitud de presupuesto que presentó', law = 'un voto a favor de una ley no unánime que ayuda a su sector';
        var parts = (R && R.money ? [req] : []).concat(Bl && Bl.money ? [law] : []);
        return 'vinculados a actos oficiales que tomó a su favor: ' + (parts.length ? parts.join(', o ') : req + ', o ' + law);
      },
      whyBody: function(p, b){ return 'cuyos asuntos ante ' + this.before(b) + ' recibieron su voto a favor'; },
      fromReq: function(p, R, fed, b){ return usd(R.money) + ' vino de ' + (fed ? 'la firma de cabildeo federal (o su comité político o sus cabilderos) del grupo que recibiría el dinero, en ' + R.n + ' solicitud' + (R.n === 1 ? '' : 'es') + ' de fondos para proyectos que presentó' : 'la firma de cabildeo del grupo que recibiría el dinero, o de ese grupo, en ' + R.n + ' solicitud' + (R.n === 1 ? '' : 'es') + ' de presupuesto que presentó en ' + this.before(b)) + '.'; },
      fromBills: function(p, Bl, fed){ var one = Bl.bills === 1 && Bl.yes === 1; return usd(Bl.money) + ' vino de ' + (fed ? 'comités políticos' : 'donantes') + ' de ' + (one ? 'un sector al que una ley no unánime' : 'sectores a los que leyes no unánimes') + ' que votó a favor ' + (one ? 'puede' : 'pueden') + ' ayudar, según ' + (one ? 'su' : 'sus') + ' análisis oficial' + (one ? '' : 'es') + '.'; },
      against: function(p, A, fed){
        var what = A.bills != null ? (A.bills === 1 ? 'un proyecto de ley que ayuda' : A.bills + ' proyectos de ley que ayudan') + ' a sectores cuyos ' + (fed ? 'comités políticos' : 'donantes') + ' dieron ' + usd(A.money)
          : (A.votes === 1 ? '1 asunto que ayudaba' : A.votes + ' asuntos que ayudaban') + ' a donantes que dieron ' + usd(A.money);
        return 'Votó en contra de ' + what + '. Ese dinero no se cuenta en el total de arriba.';
      },
      noneYes: function(p, b){ return 'No se encontraron donantes vinculados a actos que tomó a su favor en ' + this.before(b) + (p.giftsFrom ? ' desde ' + p.giftsFrom.slice(0, 4) + '.' : ' en 2025 ni 2026.'); },
      timing: function(p, what){
        if(!p.beforeAmt) return 'Los ' + usd(p.total) + ' llegaron después ' + what + ' con que se vinculan.';
        if(!p.afterAmt || p.before === p.gifts) return 'Los ' + usd(p.total) + ' llegaron antes ' + what + ' con que se vinculan.';
        return usd(p.beforeAmt) + ' llegó antes ' + what + ' con que se vincula. ' + usd(p.afterAmt) + ' llegó después.';
      },
      whatReq: 'de la solicitud o el voto', whatBill: 'del voto', whatVote: 'del voto o el acto',
      req: function(p, R, fed){
        var s = (R.n === 1 ? 'Esa solicitud pedía ' : 'Esas ' + R.n + ' solicitudes pedían ') + big(R.ask, 'es') + ' en total.';
        if(fed) return s + (R.fedChecked ? ' De las ' + R.fedChecked + ' presentadas para los años fiscales 2022 a 2025, que pedían ' + big(R.fedAsk, 'es') + ', ' + big(R.fedFunded, 'es') + ' recibieron fondos en las leyes finales.' + (R.fedChecked < R.n ? ' Aquí todavía no se revisa si las más recientes recibieron fondos.' : '') : ' Aquí todavía no se revisa si recibieron fondos.');
        if(!R.inBudget) return s + ' Nada de eso quedó en el presupuesto final.';
        var share = pct(R.funded, R.ask);
        if(R.vetoed) return s + ' ' + big(R.inBudget, 'es') + ' se incluyó en el presupuesto. El gobernador vetó ' + big(R.vetoed, 'es') + ' de esos ' + big(R.inBudget, 'es') + ', y quedaron ' + big(R.funded, 'es') + ' en el presupuesto final' + (share ? ': cerca del ' + share + ' de los ' + big(R.ask, 'es') + ' pedidos.' : '.');
        return s + ' ' + big(R.funded, 'es') + ' quedó en el presupuesto final' + (share ? ': cerca del ' + share + ' de los ' + big(R.ask, 'es') + ' pedidos.' : '.');
      },
      bills: function(p, Bl){
        return 'Votó a favor ' + (Bl.bills === 1 ? 'del proyecto de ley' : 'de los ' + Bl.bills + ' proyectos de ley') + (Bl.votes > Bl.bills ? ' (' + Bl.votes + ' votaciones en el pleno en total)' : '') + '.';
      },
      voted: function(p, b){
        return 'Votó a favor en ' + (p.items === 1 ? '1 asunto' : p.items + ' asuntos') + (p.since ? ' desde ' + p.since : '') + ' ante ' + this.before(b) + ' en que un donante tenía interés.';
      },
      cabinet: function(p){
        var parts = [];
        if(p.votes) parts.push('votó a favor de ' + (p.yes === p.votes ? (p.votes === 1 ? 'el único voto del Gabinete' : 'los ' + p.votes + ' votos del Gabinete') : p.yes + ' de los ' + p.votes + ' votos del Gabinete') + ' en que un donante era parte');
        if(p.acted) parts.push('tomó ' + p.acted + ' acci' + (p.acted === 1 ? 'ón' : 'ones') + ' como ' + (p.pron === 'she' ? 'jefa' : 'jefe') + ' de la oficina que nombra a un donante, o a un tipo de negocio que donó');
        var x = parts.join(', y '); return x.charAt(0).toUpperCase() + x.slice(1) + '.';
      },
      split: function(p){ return p.items === 1 ? 'Fue una votación dividida (al menos un miembro votó en contra).' : p.split + ' de los ' + p.items + (p.split === 1 ? ' fue una votación dividida' : ' fueron votaciones divididas') + ' (al menos un miembro votó en contra).'; },
      billShare: function(p, U, fed){
        var q = pair(U.tied, U.n), r = U.n - U.tied;
        return since(U.from, 'es') + ', de ' + (U.n === 1 ? 'la ley nueva que votó y que no se aprobó' : 'las ' + U.n + ' leyes nuevas que votó y que no se aprobaron') + ' por unanimidad, votó a favor de ' + U.tied + ' (' + q[0] + ') que ayudan a un sector cuyos ' + (fed ? 'comités políticos' : 'donantes') + ' le dieron dinero. En las otras ' + r + ' (' + q[1] + '), votó en contra o ninguno de sus ' + (fed ? 'comités políticos' : 'donantes') + ' era del sector al que ayudan.';
      },
      tookBills: function(p, Bl, fed){ var n = p.donors; return 'Recibió ' + usd(p.total) + ' de ' + (fed ? (n === 1 ? '1 comité político' : n + ' comités políticos') : this.donors(n)) + ' de ' + (Bl.bills === 1 ? 'un sector al que una ley no unánime' : 'sectores a los que leyes no unánimes') + ' que votó a favor ' + (Bl.bills === 1 ? 'puede' : 'pueden') + ' ayudar, según ' + (Bl.bills === 1 ? 'su análisis oficial' : 'sus análisis oficiales') + '.'; },
      share: function(p, S, b){
        if(S.def === 'donorFirst') return 'La lista de esta ciudad se armó a partir de sus donantes, porque la ciudad no publica un registro de cabilderos utilizable. Así que no hay un conteo justo de los actos sin donantes.';
        var q = pair(S.tied, S.n), r = S.n - S.tied, s0 = since(S.from, 'es') + ', ';
        var act = S.def === 'earmarks' ? 'presentó ' + S.tied + (S.tied === 1 ? ' solicitud' : ' solicitudes') + ' de fondos federales para proyectos (' + q[0] + ') para grupos cuyos cabilderos le donaron'
          : S.def === 'requests' ? 'presentó ' + S.tied + (S.tied === 1 ? ' solicitud' : ' solicitudes') + ' de presupuesto (' + q[0] + ') en las que un cabildero, o el grupo que recibiría el dinero, le donó'
          : S.def === 'cabinet' ? 'tomó ' + S.tied + ' ' + (S.tied === 1 ? 'acto' : 'actos') + ' como jefe de su oficina (' + q[0] + ') que ayudaron a uno de sus donantes'
          : null;
        if(act === null) return since(S.from, 'es') + ', de ' + (S.n === 1 ? 'el voto que emitió y que no fue unánime' : 'los ' + S.n + ' votos que emitió y que no fueron unánimes') + ', ' + S.tied + ' (' + q[0] + ') ayudaron a uno de sus donantes. En los otros ' + r + ' (' + q[1] + '), votó en contra o no había un donante involucrado.';
        var rest = S.def === 'earmarks' || S.def === 'requests' ? 'En ' + r + ' (' + q[1] + '), no.'
          : 'En los otros ' + r + ' (' + q[1] + '), no había un donante involucrado. Los votos del Gabinete no se cuentan: el registro no muestra ningún voto en contra, y los votos unánimes no son vínculos.';
        return s0 + act + '. ' + rest;
      },
      none: function(p, b){ return 'No se encontraron donantes con asuntos ante ' + this.before(b) + (p.giftsFrom ? ' desde ' + p.giftsFrom.slice(0, 4) + '.' : ' en 2025 ni 2026.'); },
      nogivers: function(p){ return 'Los informes de ' + esc(p.name) + ' no muestran donantes externos.'; },
      nodata: function(p){ return 'No hay informes detallados de donantes publicados para ' + esc(p.name) + ', así que esto no se pudo revisar.'; },
      noneCity: 'No se encontraron donantes con asuntos ante la ciudad en 2025 ni 2026.',
      noneF: function(p){ return 'Ninguna de las solicitudes de fondos federales para proyectos de ' + esc(p.name) + ' fue para un grupo cuya firma de cabildeo federal, su comité político o sus cabilderos donaron a la campaña.'; },
      norequests: function(p){ return esc(p.name) + ' no hizo solicitudes de fondos federales para proyectos en 2025 ni 2026.'; },
      gap: function(p, g){ var y = g.years[0] === g.years[1] ? 'de ' + g.years[0] : 'de ' + g.years[0] + ' a ' + g.years[1];
        return 'Los informes de campaña de ' + esc(p.name) + ' ' + y + (g.why === 'cantRead' ? ' no se pudieron leer' : ' no están en internet') + ', así que las donaciones de ' + (g.years[0] === g.years[1] ? 'ese año' : 'esos años') + ' no se cuentan. Pueden faltar vínculos entre donantes y sus votos.'; },
      how: 'Cómo se cuenta'
    },
    ht: {
      donors: function(n){ return n + ' donatè'; },
      before: function(b){ return b; },
      took: function(p, why){
        var s = esc(p.name) + ' resevwa ' + usd(p.total) + ' nan men ' + this.donors(p.donors) + ' ' + why + '.';
        if(p.campaignAmt && p.committeeAmt) s += ' ' + usd(p.campaignAmt) + ' te ale nan kanpay la epi ' + usd(p.committeeAmt) + ' nan ' + (p.cmteRole === 'solicits' ? 'komite politik (PAC) li te deklare li ranmase lajan pou li a.' : (p.committees != null ? p.committees > 1 : p.accounts > 2) ? 'komite politik li prezide yo.' : 'komite politik' + (p.body === 'county' ? ' (PAC)' : '') + ' li prezide a.');
        else if(p.committeeAmt) s += ' Tout te ale nan komite politik li prezide a.';
        return s;
      },
      whyAct: function(p, R, Bl, fed){
        if(p.kind === 'cabinet') return 'ki lye ak aksyon ofisyèl li te pran an favè yo: yon vòt wi sou yon dosye Kabinè ki pa t inanim kote yo te yon pati, oswa yon aksyon li te pran kòm chèf biwo a';
        var req = fed ? 'yon demann lajan pou pwojè li te depoze' : 'yon demann bidjè li te depoze', law = 'yon vòt wi sou yon lwa ki pa t pase inanim ki ede sektè yo';
        var parts = (R && R.money ? [req] : []).concat(Bl && Bl.money ? [law] : []);
        return 'ki lye ak aksyon ofisyèl li te pran an favè yo: ' + (parts.length ? parts.join(', oswa ') : req + ', oswa ' + law);
      },
      whyBody: function(p, b){ return 'ki te gen dosye devan ' + this.before(b) + ' li te vote wi pou yo'; },
      fromReq: function(p, R, fed, b){ return usd(R.money) + ' te soti nan ' + (fed ? 'fèm lobi federal (oswa komite politik li oswa lobiyis li) gwoup ki t ap resevwa lajan an, sou ' + R.n + ' demann lajan pou pwojè li te depoze' : 'fèm lobi gwoup ki t ap resevwa lajan an, oswa gwoup sa a li menm, sou ' + R.n + ' demann bidjè li te depoze nan ' + this.before(b)) + '.'; },
      fromBills: function(p, Bl, fed){ var one = Bl.bills === 1 && Bl.yes === 1; return usd(Bl.money) + ' te soti nan ' + (fed ? 'komite politik' : 'donatè') + ' nan ' + (one ? 'yon sektè yon lwa' : 'sektè lwa') + ' ki pa t pase inanim, li te vote wi pou ' + (one ? 'li' : 'yo') + ', ka ede, dapre analiz ofisyèl la.'; },
      against: function(p, A, fed){
        var what = A.bills != null ? (A.bills === 1 ? 'yon pwojè lwa' : A.bills + ' pwojè lwa') + ' ki ede sektè kote ' + (fed ? 'komite politik' : 'donatè') + ' yo te bay ' + usd(A.money)
          : A.votes + ' dosye ki te ede donatè ki te bay ' + usd(A.money);
        return 'Li te vote non sou ' + what + '. Lajan sa a pa konte nan total anwo a.';
      },
      noneYes: function(p, b){ return 'Nou pa jwenn okenn donatè ki lye ak aksyon li te pran an favè yo nan ' + this.before(b) + (p.giftsFrom ? ' depi ' + p.giftsFrom.slice(0, 4) + '.' : ' an 2025 oswa 2026.'); },
      timing: function(p, what){
        if(!p.beforeAmt) return 'Tout ' + usd(p.total) + ' yo te rive apre ' + what + ' yo konekte ak yo.';
        if(!p.afterAmt || p.before === p.gifts) return 'Tout ' + usd(p.total) + ' yo te rive anvan ' + what + ' yo konekte ak yo.';
        return usd(p.beforeAmt) + ' te rive anvan ' + what + ' li konekte ak li. ' + usd(p.afterAmt) + ' te rive apre.';
      },
      whatReq: 'demann oswa vòt', whatBill: 'vòt', whatVote: 'vòt oswa aksyon',
      req: function(p, R, fed){
        var s = (R.n === 1 ? 'Demann sa a te mande ' : R.n + ' demann sa yo te mande ') + big(R.ask, 'ht') + ' an tout.';
        if(fed) return s + (R.fedChecked ? ' Nan ' + R.fedChecked + ' demann pou ane fiskal 2022 rive 2025 yo, ki te mande ' + big(R.fedAsk, 'ht') + ', ' + big(R.fedFunded, 'ht') + ' te finanse nan lwa final yo.' + (R.fedChecked < R.n ? ' Nou poko tcheke isit la si sa ki pi resan yo te finanse.' : '') : ' Nou poko tcheke isit la si yo te finanse.');
        if(!R.inBudget) return s + ' Anyen ladan l pa t nan bidjè final la.';
        var share = pct(R.funded, R.ask);
        if(R.vetoed) return s + ' ' + big(R.inBudget, 'ht') + ' te antre nan bidjè a. Gouvènè a te mete veto sou ' + big(R.vetoed, 'ht') + ' nan ' + big(R.inBudget, 'ht') + ' sa a, sa ki kite ' + big(R.funded, 'ht') + ' nan bidjè final la' + (share ? ': anviwon ' + share + ' nan ' + big(R.ask, 'ht') + ' yo te mande a.' : '.');
        return s + ' ' + big(R.funded, 'ht') + ' te nan bidjè final la' + (share ? ': anviwon ' + share + ' nan ' + big(R.ask, 'ht') + ' yo te mande a.' : '.');
      },
      bills: function(p, Bl){
        return 'Li te vote wi sou ' + (Bl.bills === 1 ? 'pwojè lwa a' : 'tout ' + Bl.bills + ' pwojè lwa yo') + (Bl.votes > Bl.bills ? ' (' + Bl.votes + ' vòt an sesyon plenyè an tout)' : '') + '.';
      },
      voted: function(p, b){
        return 'Li te vote wi sou ' + p.items + ' dosye' + (p.since ? ' depi ' + p.since : '') + ' devan ' + this.before(b) + ' kote yon donatè te gen enterè.';
      },
      cabinet: function(p){
        var parts = [];
        if(p.votes) parts.push('te vote wi sou ' + (p.yes === p.votes ? (p.votes === 1 ? 'sèl vòt Kabinè a' : 'tout ' + p.votes + ' vòt Kabinè yo') : p.yes + ' sou ' + p.votes + ' vòt Kabinè') + ' kote yon donatè te pati');
        if(p.acted) parts.push('te pran ' + p.acted + ' aksyon kòm chèf biwo a ki nonmen yon donatè, oswa yon kalite biznis ki te bay');
        return 'Li ' + parts.join(', epi ') + '.';
      },
      split: function(p){ return p.items === 1 ? 'Se te yon vòt divize (omwen yon manm te vote non).' : p.split + ' nan ' + p.items + ' yo se te vòt divize (omwen yon manm te vote non).'; },
      billShare: function(p, U, fed){
        var q = pair(U.tied, U.n), r = U.n - U.tied;
        return since(U.from, 'ht') + ', sou ' + U.n + ' nouvo lwa li te vote sou yo ki pa t pase a linanimite, li te vote wi sou ' + U.tied + ' (' + q[0] + ') ki ede yon sektè kote ' + (fed ? 'komite politik' : 'donatè') + ' yo te ba li lajan. Sou lòt ' + r + ' yo (' + q[1] + '), li te vote non oswa okenn nan ' + (fed ? 'komite politik' : 'donatè') + ' li yo pa t nan sektè lwa a ede a.';
      },
      tookBills: function(p, Bl, fed){ var n = p.donors; return 'Li te resevwa ' + usd(p.total) + ' nan men ' + (fed ? (n === 1 ? '1 komite politik' : n + ' komite politik') : this.donors(n)) + ' nan ' + (Bl.bills === 1 ? 'yon sektè yon lwa' : 'sektè lwa') + ' ki pa t pase inanim, li te vote wi pou ' + (Bl.bills === 1 ? 'li' : 'yo') + ', ka ede, dapre analiz ofisyèl la.'; },
      share: function(p, S, b){
        if(S.def === 'donorFirst') return 'Lis vil sa a kòmanse ak donatè li yo, paske vil la pa pibliye yon rejis lobiyis nou ka itilize. Kidonk pa gen yon fason jis pou konte aksyon ki pa t gen donatè.';
        var q = pair(S.tied, S.n), r = S.n - S.tied, s0 = since(S.from, 'ht') + ', ';
        var act = S.def === 'earmarks' ? 'li te depoze ' + S.tied + ' demann lajan federal pou pwojè (' + q[0] + ') pou gwoup kote lobiyis yo te ba li lajan'
          : S.def === 'requests' ? 'li te depoze ' + S.tied + ' demann bidjè (' + q[0] + ') kote yon lobiyis, oswa gwoup ki t ap resevwa lajan an, te ba li lajan'
          : S.def === 'cabinet' ? 'li te fè ' + S.tied + ' aksyon kòm chèf biwo a (' + q[0] + ') ki te ede youn nan donatè li yo'
          : null;
        if(act === null) return since(S.from, 'ht') + ', sou ' + S.n + ' vòt li te bay ki pa t inanim, ' + S.tied + ' (' + q[0] + ') te ede youn nan donatè li yo. Sou lòt ' + r + ' yo (' + q[1] + '), li te vote non oswa pa t gen donatè ladan.';
        var rest = S.def === 'earmarks' || S.def === 'requests' ? 'Pou ' + r + ' (' + q[1] + '), pa t genyen.'
          : 'Sou lòt ' + r + ' yo (' + q[1] + '), pa t gen donatè ladan. Nou pa konte vòt Kabinè yo: dosye a pa montre okenn vòt kont, e vòt inanim yo pa lyen.';
        return s0 + act + '. ' + rest;
      },
      none: function(p, b){ return 'Nou pa jwenn okenn donatè ki te gen dosye devan ' + this.before(b) + (p.giftsFrom ? ' depi ' + p.giftsFrom.slice(0, 4) + '.' : ' an 2025 oswa 2026.'); },
      nogivers: function(p){ return 'Rapò ' + esc(p.name) + ' yo pa montre okenn donatè deyò.'; },
      nodata: function(p){ return 'Pa gen rapò donatè detaye ki afiche pou ' + esc(p.name) + ', kidonk nou pa t ka verifye.'; },
      noneCity: 'Nou pa jwenn okenn donatè ki te gen dosye devan vil la an 2025 oswa 2026.',
      noneF: function(p){ return 'Okenn nan demann lajan federal  ' + esc(p.name) + ' pa t pou yon gwoup kote fèm lobi federal li, komite politik li oswa lobiyis li te bay kanpay la.'; },
      norequests: function(p){ return esc(p.name) + ' pa t fè okenn demann lajan federal pou pwojè an 2025 oswa 2026.'; },
      gap: function(p, g){ var y = g.years[0] === g.years[1] ? 'pou ' + g.years[0] : 'soti ' + g.years[0] + ' rive ' + g.years[1];
        return 'Rapò kanpay ' + esc(p.name) + ' ' + y + (g.why === 'cantRead' ? ' nou pa t ka li yo' : ' pa sou entènèt') + ', kidonk nou pa konte don ' + (g.years[0] === g.years[1] ? 'ane sa a' : 'ane sa yo') + '. Gen lyen ant donatè ak vòt li yo ki ka manke.'; },
      how: 'Kijan nou konte'
    }
  };
  // Groups of sentences, shown as short paragraphs: the money, where it came from, timing, the actions.
  function moneySummary(p, lang){
    var out = summaryBody(p, lang), g = p.donorGap;
    return g && g.years ? (out ? out + '<br>' : '') + '<em>' + (W[lang] || W.en).gap(p, g) + '</em>' : out;
  }
  // Full check (scripts/data/full-check/headlines.json): the same count, the same words, for every candidate in
  // the race, across every office they held (Brit, Oct 27, 2026)
  var FULL = {
    en: function(p, f){
      return f.helped + ' of ' + f.decisions + ' decisions in office helped donors who paid ' + him(p) + '. ' + usd(f.amount) + ' came from ' + f.donors + ' donor' + (f.donors === 1 ? '' : 's') + ' tied to those decisions.'
        + '<br>' + 'Record checked: ' + esc(L(f.record, 'en')) + '. Decisions are contested votes, budget requests, bills ' + he(p) + ' passed, and lawsuits, settlements, grants and contracts ' + his(p) + ' office chose. Uncontested votes and routine buying are not counted.';
    },
    es: function(p, f){
      return f.helped + ' de ' + f.decisions + ' decisiones en el cargo ayudaron a donantes que le dieron dinero. ' + usd(f.amount) + ' vino de ' + f.donors + ' donante' + (f.donors === 1 ? '' : 's') + ' vinculado' + (f.donors === 1 ? '' : 's') + ' a esas decisiones.'
        + '<br>' + 'Historial revisado: ' + esc(L(f.record, 'es')) + '. Las decisiones son votos disputados, solicitudes de presupuesto, leyes que logró aprobar, y demandas, acuerdos, subvenciones y contratos que eligió su oficina. No se cuentan los votos sin oposición ni las compras de rutina.';
    },
    ht: function(p, f){
      return f.helped + ' sou ' + f.decisions + ' desizyon pandan li nan pòs te ede donatè ki te ba li lajan. ' + usd(f.amount) + ' soti nan ' + f.donors + ' donatè ki lye ak desizyon sa yo.'
        + '<br>' + 'Dosye nou tcheke: ' + esc(L(f.record, 'ht')) + '. Desizyon yo se vòt ki te gen opozisyon, demann bidjè, lwa li te fè pase, ak pwosè, akò, sibvansyon ak kontra biwo li te chwazi. Nou pa konte vòt san opozisyon ni acha woutin.';
    }
  };
  function summaryBody(p, lang){
    if(p.fullCheck) return (FULL[lang] || FULL.en)(p, p.fullCheck);
    var w = W[lang] || W.en, b = esc(L(p.bodyName, lang)), groups = [];
    if(p.kind === 'none') return p.status === 'nogivers' ? w.nogivers(p) : p.status === 'nodata' ? w.nodata(p) : p.status === 'norequests' ? w.norequests(p) : '';
    // donors tied only to items voted no on: its own line, after the actions, never in the total
    var ag = p.against ? [w.against(p, p.against, p.kind === 'federal')] : [];
    if(p.kind === 'federal' || p.kind === 'state'){
      var fed = p.kind === 'federal', R = p.requests || {n: 0, money: 0}, Bl = p.bills || {votes: 0, yes: 0, money: 0};
      // Nothing tied: the share line only. A line saying no donor was found is never shown: it highlights meeting the
      // bare minimum (Brit, Oct 27, 2026).
      if(!p.total) return [p.share && p.share.n ? w.share(p, p.share, b) : '', fed && p.body === 'ussenate' && !R.n ? w.norequests(p) : '', ag[0] || ''].filter(Boolean).join('<br>');
      var onlyBills = Bl.money && !R.money && Bl.money === p.total;
      if(onlyBills){
        groups.push([w.tookBills(p, Bl, fed), w.timing(p, w.whatBill), Bl.votes ? w.bills(p, Bl) : ''].filter(Boolean));
        groups.push(ag);
      } else {
      groups.push([w.took(p, w.whyAct(p, R, Bl, fed))]);
      var from = [];
      if(R.money) from.push(w.fromReq(p, R, fed, b));
      if(Bl.money) from.push(w.fromBills(p, Bl, fed));
      groups.push(from);
      groups.push([w.timing(p, w.whatReq)]);
      var acts = [];
      if(R.money) acts.push(w.req(p, R, fed));
      if(Bl.votes && Bl.money) acts.push(w.bills(p, Bl));
      if(fed && !R.n && p.body === 'ussenate') acts.push(w.norequests(p));
      groups.push(acts);
      groups.push(ag);
      }
    } else {
      if(!p.total) return [p.share && p.share.n ? w.share(p, p.share, b) : '', ag[0] || ''].filter(Boolean).join('<br>');
      groups.push([w.took(p, p.kind === 'cabinet' ? w.whyAct(p) : w.whyBody(p, b))]);
      groups.push([w.timing(p, w.whatVote)]);
      var a2 = [p.kind === 'cabinet' ? w.cabinet(p) : w.voted(p, b)];
      if(p.split) a2.push(w.split(p));
      groups.push(a2);
      groups.push(ag);
    }
    // What ties leads, then the percentages (Brit, Oct 26, 2026): the money tied to official actions, then the
    // share of actions tied to donors, then the share of laws, then the rest
    var top = [];
    if(p.share && (p.share.def === 'donorFirst' || p.share.n)) top.push([w.share(p, p.share, b)]);
    if(p.bills && p.bills.universe && p.bills.universe.n) top.push([w.billShare(p, p.bills.universe, p.kind === 'federal')]);
    groups = groups.slice(0, 1).concat(top, groups.slice(1));
    return groups.filter(function(g){ return g.length; }).map(function(g){ return g.join(' '); }).join('<br>');
  }
  moneySummary.howLabel = function(lang){ return (W[lang] || W.en).how; };
  if(typeof window !== 'undefined') window.moneySummary = moneySummary;
  if(typeof module !== 'undefined') module.exports = moneySummary;
})();
