// Money summary per incumbent, in English, Spanish and Haitian Creole.
// Data: /data/money-summary.json (built by scripts/money-summary.mjs). Used by / and /decisions.
// moneySummary(entry, lang) returns HTML (names escaped).
//
// Writing rules: money first, then the actions. Every number says what it counts. Totals list their
// parts. Percentages name what they are a share of. Before and after are both stated in dollars, never
// "the rest". Nothing implies a gift bought an action.
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
  function nv(Bl){ return Math.max(0, (Bl.votes || 0) - (Bl.yes || 0) - (Bl.no || 0)); }
  var W = {
    en: {
      donors: function(n){ return n === 1 ? '1 donor' : n + ' donors'; },
      before: function(b){ return 'the ' + b; },
      // 1. The money: total, from how many donors, and which account got how much
      took: function(p, why){
        var s = esc(p.name) + ' took ' + usd(p.total) + ' from ' + this.donors(p.donors) + ' ' + why + '.';
        if(p.campaignAmt && p.committeeAmt) s += ' ' + usd(p.campaignAmt) + ' went to the campaign and ' + usd(p.committeeAmt) + ' to ' + (p.cmteRole === 'solicits' ? 'the political committee (PAC) ' + he(p) + ' reported raising money for.' : (p.body === 'county' ? 'the political committee (PAC) ' : 'the political committee' + (p.accounts > 2 ? 's ' : ' ')) + he(p) + ' chairs.');
        else if(p.committeeAmt) s += ' All of it went to the political committee ' + he(p) + ' chairs.';
        return s;
      },
      whyAct: function(p){ return 'tied to ' + his(p) + ' official actions'; },
      whyBody: function(p, b){ return 'with business before ' + this.before(b); },
      // 2. Where it came from (state legislators and Congress); the parts add up to the total above
      fromReq: function(p, R, fed, b){ return usd(R.money) + ' came from ' + (fed ? 'the federal lobbying firms (or their PACs or lobbyists) of groups that ' + he(p) + ' asked Congress to fund, in ' + R.n + ' earmark request' + (R.n === 1 ? '' : 's') : 'the lobbying firms, or the groups that would get the money, on ' + R.n + ' budget request' + (R.n === 1 ? '' : 's') + ' ' + he(p) + ' filed in ' + this.before(b)) + '.'; },
      fromBills: function(p, Bl, fed){ return usd(Bl.money) + ' came from ' + (fed ? 'PACs' : 'donors') + ' in industries helped by ' + (Bl.bills === 1 && Bl.yes === 1 ? 'a bill' : 'bills') + ' ' + he(p) + ' voted for.'; },
      fromOther: function(p, Bl, fed){ var how = Bl.no && nv(Bl) ? 'voted against or did not vote on' : Bl.no ? 'voted against' : 'did not vote on'; return usd(Bl.otherMoney) + ' came from ' + (fed ? 'PACs' : 'donors') + ' in industries helped by bills ' + he(p) + ' ' + how + '.'; },
      // 3. Timing, both sides in dollars
      timing: function(p, what){
        if(!p.beforeAmt) return 'All of it came in after the ' + what + '.';
        if(!p.afterAmt || p.before === p.gifts) return 'All of it came in before the ' + what + '.';
        return usd(p.beforeAmt) + ' came in before the ' + what + ' it is tied to. ' + usd(p.afterAmt) + ' came in after.';
      },
      whatReq: 'request or vote', whatBill: 'vote', whatVote: 'vote or action',
      // 4. The actions
      req: function(p, R, fed){
        var s = 'Those ' + (R.n === 1 ? 'request asked' : R.n + ' requests asked') + ' for ' + big(R.ask, 'en') + ' in all.';
        if(fed) return s + (R.fedChecked ? ' Of the ' + R.fedChecked + ' made for FY2022-FY2025, which asked for ' + big(R.fedAsk, 'en') + ', ' + big(R.fedFunded, 'en') + ' was funded in the final laws.' + (R.fedChecked < R.n ? ' Whether the newer ones were funded is not checked here yet.' : '') : ' Whether they were funded is not checked here yet.');
        if(!R.inBudget) return s + ' None of it was in the final budget.';
        var share = pct(R.funded, R.ask);
        if(R.vetoed) return s + ' ' + big(R.inBudget, 'en') + ' was put in the budget. The governor vetoed ' + big(R.vetoed, 'en') + ' of the ' + big(R.inBudget, 'en') + ', leaving ' + big(R.funded, 'en') + ' in the final budget' + (share ? ': about ' + share + ' of the ' + big(R.ask, 'en') + ' requested.' : '.');
        return s + ' ' + big(R.funded, 'en') + ' was in the final budget' + (share ? ': about ' + share + ' of the ' + big(R.ask, 'en') + ' requested.' : '.');
      },
      bills: function(p, Bl){
        var n = Bl.bills === 1 ? 'the bill' : 'the ' + Bl.bills + ' bills', parts = [];
        if(Bl.yes === Bl.votes) return He(p) + ' voted yes on ' + (Bl.bills === 1 ? n : 'all ' + Bl.bills + ' bills') + (Bl.votes > Bl.bills ? ' (' + Bl.votes + ' floor votes in all)' : '') + '.';
        if(Bl.yes) parts.push('yes ' + Bl.yes + (Bl.yes === 1 ? ' time' : ' times'));
        if(Bl.no) parts.push('no ' + Bl.no + (Bl.no === 1 ? ' time' : ' times'));
        var s = He(p) + (parts.length ? ' voted ' + parts.join(' and ') + ' in ' : ' did not vote in any of the ') + Bl.votes + ' floor votes on ' + n;
        return s + (parts.length && nv(Bl) ? ', and did not vote ' + nv(Bl) + (nv(Bl) === 1 ? ' time' : ' times') : '') + '.';
      },
      voted: function(p, b){
        var on = (p.items === 1 ? 'the one item' : p.items + ' items') + (p.since ? ' since ' + p.since : '') + ' before ' + this.before(b) + ' where a donor had business';
        if(p.items === 1) return He(p) + (p.yes ? ' voted yes on ' : p.no ? ' voted no on ' : p.abst ? ' abstained or recused on ' : p.unk ? ' has no vote given in the minutes on ' : ' was absent for ') + on + '.';
        var parts = ['voted yes on ' + p.yes];
        if(p.no) parts.push('no on ' + p.no);
        if(p.abst) parts.push('abstained or recused on ' + p.abst);
        if(p.away) parts.push('was absent for ' + p.away);
        if(p.unk) parts.push('the minutes do not give ' + his(p) + ' vote on ' + p.unk);
        return 'Of the ' + on + ', ' + he(p) + ' ' + (parts.length > 1 ? parts.slice(0, -1).join(', ') + (parts.length > 2 ? ',' : '') + ' and ' + parts[parts.length - 1] : parts[0]) + '.';
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
        return since(U.from, 'en') + ', ' + he(p) + ' voted on ' + U.tied + ' new ' + (U.tied === 1 ? 'law' : 'laws') + ' (' + q[0] + ') that help an industry whose ' + (fed ? 'PACs' : 'donors') + ' gave ' + him(p) + ' money. On ' + r + ' (' + q[1] + '), they did not.';
      },
      share: function(p, S, b){
        if(S.def === 'donorFirst') return 'This city’s list was built by starting from ' + his(p) + ' donors, because the city posts no usable lobbyist registry. So there is no fair count of the actions that did not involve a donor.';
        var q = pair(S.tied, S.n), r = S.n - S.tied, k = S.tied + ' (' + q[0] + ')', s0 = since(S.from, 'en') + ', ' + he(p) + ' ';
        var act = S.def === 'earmarks' ? 'filed ' + S.tied + ' earmark ' + (S.tied === 1 ? 'request' : 'requests') + ' (' + q[0] + ') for groups whose lobbyists gave to ' + him(p)
          : S.def === 'requests' ? 'filed ' + S.tied + ' budget ' + (S.tied === 1 ? 'request' : 'requests') + ' (' + q[0] + ') where a lobbyist, or the group getting the money, gave to ' + him(p)
          : S.def === 'cabinet' ? 'took ' + S.tied + ' Cabinet ' + (S.tied === 1 ? 'vote or office action' : 'votes and office actions') + ' (' + q[0] + ') that involved one of ' + his(p) + ' donors'
          : 'voted on ' + S.tied + ' ' + (S.tied === 1 ? 'action' : 'actions') + ' (' + q[0] + ') that involved one of ' + his(p) + ' donors';
        return s0 + act + '. On ' + r + ' (' + q[1] + '), they did not.';
      },
      tookBills: function(p, Bl, fed){ var n = p.donors; return He(p) + ' took ' + usd(p.total) + ' from ' + (fed ? (n === 1 ? '1 PAC' : n + ' PACs') : this.donors(n)) + ' in industries helped by ' + (Bl.bills === 1 ? 'a bill' : 'bills') + ' ' + he(p) + ' voted for.'; },
      none: function(p, b){ return 'No donors found with business before ' + this.before(b) + (p.giftsFrom ? ' from ' + p.giftsFrom.slice(0, 4) + ' on.' : ' in 2025 or 2026.'); },
      nogivers: function(p){ return esc(p.name) + '’s reports show no outside donors.'; },
      nodata: function(p){ return 'No itemized donor reports are posted for ' + esc(p.name) + ', so this could not be checked.'; },
      noneCity: 'No donors found with business before the city in 2025 or 2026.',
      noneF: function(p){ return 'None of ' + esc(p.name) + '’s earmark requests were for a group whose federal lobbying firm, its PAC or its lobbyists gave to the campaign.'; },
      norequests: function(p){ return esc(p.name) + ' made no earmark requests in 2025 or 2026.'; },
      how: 'How this is counted'
    },
    es: {
      donors: function(n){ return n === 1 ? '1 donante' : n + ' donantes'; },
      before: function(b){ var w = String(b).split(' ')[0]; return (/^(Concejo|Senado)$/.test(w) ? 'el ' : /^(Comisi|Cámara|Junta)/.test(w) ? 'la ' : '') + b; },
      took: function(p, why){
        var s = esc(p.name) + ' recibió ' + usd(p.total) + ' de ' + this.donors(p.donors) + ' ' + why + '.';
        if(p.campaignAmt && p.committeeAmt) s += ' ' + usd(p.campaignAmt) + ' fue a la campaña y ' + usd(p.committeeAmt) + ' ' + (p.cmteRole === 'solicits' ? 'al comité político (PAC) para el que declaró recaudar fondos' : p.accounts > 2 ? 'a los comités políticos que preside' : 'al comité político' + (p.body === 'county' ? ' (PAC)' : '') + ' que preside') + '.';
        else if(p.committeeAmt) s += ' Todo fue al comité político que preside.';
        return s;
      },
      whyAct: function(p){ return 'vinculados a sus actos oficiales'; },
      whyBody: function(p, b){ return 'con asuntos ante ' + this.before(b); },
      fromReq: function(p, R, fed, b){ return usd(R.money) + ' vino de ' + (fed ? 'las firmas de cabildeo federal (o sus comités políticos o cabilderos) de grupos para los que pidió fondos al Congreso, en ' + R.n + ' solicitud' + (R.n === 1 ? '' : 'es') + ' de fondos para proyectos' : 'las firmas de cabildeo, o los grupos que recibirían el dinero, de ' + R.n + ' solicitud' + (R.n === 1 ? '' : 'es') + ' de presupuesto que presentó en ' + this.before(b)) + '.'; },
      fromBills: function(p, Bl, fed){ return usd(Bl.money) + ' vino de ' + (fed ? 'comités políticos' : 'donantes') + ' de sectores que se benefician de ' + (Bl.bills === 1 && Bl.yes === 1 ? 'un proyecto de ley' : 'proyectos de ley') + ' que apoyó con su voto.'; },
      fromOther: function(p, Bl, fed){ var how = Bl.no && nv(Bl) ? 'votó en contra o no votó' : Bl.no ? 'votó en contra' : 'no votó'; return usd(Bl.otherMoney) + ' vino de ' + (fed ? 'comités políticos' : 'donantes') + ' de sectores que se benefician de proyectos de ley en los que ' + how + '.'; },
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
        var n = Bl.bills === 1 ? 'el proyecto de ley' : 'los ' + Bl.bills + ' proyectos de ley', parts = [];
        if(Bl.yes === Bl.votes) return 'Votó a favor ' + (Bl.bills === 1 ? 'del proyecto de ley' : 'de ' + n) + (Bl.votes > Bl.bills ? ' (' + Bl.votes + ' votaciones en el pleno en total)' : '') + '.';
        if(Bl.yes) parts.push('a favor ' + Bl.yes + (Bl.yes === 1 ? ' vez' : ' veces'));
        if(Bl.no) parts.push('en contra ' + Bl.no + (Bl.no === 1 ? ' vez' : ' veces'));
        var s = (parts.length ? 'Votó ' + parts.join(' y ') + ' en ' : 'No votó en ninguna de las ') + Bl.votes + ' votaciones en el pleno sobre ' + n;
        return s + (parts.length && nv(Bl) ? ', y no votó ' + nv(Bl) + (nv(Bl) === 1 ? ' vez' : ' veces') : '') + '.';
      },
      voted: function(p, b){
        var on = (p.items === 1 ? 'el único asunto' : p.items + ' asuntos') + (p.since ? ' desde ' + p.since : '') + ' ante ' + this.before(b) + ' en que un donante tenía interés';
        if(p.items === 1) return (p.yes ? 'Votó a favor en ' : p.no ? 'Votó en contra en ' : p.abst ? 'Se abstuvo o se inhibió en ' : p.unk ? 'El acta no indica su voto en ' : 'Estuvo ausente en ') + on + '.';
        var parts = ['votó a favor en ' + p.yes];
        if(p.no) parts.push('en contra en ' + p.no);
        if(p.abst) parts.push('se abstuvo o se inhibió en ' + p.abst);
        if(p.away) parts.push('estuvo ausente en ' + p.away);
        if(p.unk) parts.push('el acta no indica su voto en ' + p.unk);
        return 'De los ' + on + ', ' + (parts.length > 1 ? parts.slice(0, -1).join(', ') + ' y ' + parts[parts.length - 1] : parts[0]) + '.';
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
        return since(U.from, 'es') + ', votó en ' + U.tied + ' ' + (U.tied === 1 ? 'ley nueva' : 'leyes nuevas') + ' (' + q[0] + ') que benefician a un sector cuyos ' + (fed ? 'comités políticos' : 'donantes') + ' le dieron dinero. En ' + r + ' (' + q[1] + '), no.';
      },
      tookBills: function(p, Bl, fed){ var n = p.donors; return 'Recibió ' + usd(p.total) + ' de ' + (fed ? (n === 1 ? '1 comité político' : n + ' comités políticos') : this.donors(n)) + ' de sectores que se benefician de ' + (Bl.bills === 1 ? 'un proyecto de ley' : 'proyectos de ley') + ' que apoyó con su voto.'; },
      share: function(p, S, b){
        if(S.def === 'donorFirst') return 'La lista de esta ciudad se armó a partir de sus donantes, porque la ciudad no publica un registro de cabilderos utilizable. Así que no hay un conteo justo de los actos sin donantes.';
        var q = pair(S.tied, S.n), r = S.n - S.tied, s0 = since(S.from, 'es') + ', ';
        var act = S.def === 'earmarks' ? 'presentó ' + S.tied + ' solicitudes de fondos federales para proyectos (' + q[0] + ') para grupos cuyos cabilderos le donaron'
          : S.def === 'requests' ? 'presentó ' + S.tied + ' solicitudes de presupuesto (' + q[0] + ') en las que un cabildero, o el grupo que recibiría el dinero, le donó'
          : S.def === 'cabinet' ? 'tomó ' + S.tied + ' votos del Gabinete y actos de su oficina (' + q[0] + ') que involucraron a uno de sus donantes'
          : 'votó en ' + S.tied + ' acciones (' + q[0] + ') que involucraron a uno de sus donantes';
        return s0 + act + '. En ' + r + ' (' + q[1] + '), no.';
      },
      none: function(p, b){ return 'No se encontraron donantes con asuntos ante ' + this.before(b) + (p.giftsFrom ? ' desde ' + p.giftsFrom.slice(0, 4) + '.' : ' en 2025 ni 2026.'); },
      nogivers: function(p){ return 'Los informes de ' + esc(p.name) + ' no muestran donantes externos.'; },
      nodata: function(p){ return 'No hay informes detallados de donantes publicados para ' + esc(p.name) + ', así que esto no se pudo revisar.'; },
      noneCity: 'No se encontraron donantes con asuntos ante la ciudad en 2025 ni 2026.',
      noneF: function(p){ return 'Ninguna de las solicitudes de fondos federales para proyectos de ' + esc(p.name) + ' fue para un grupo cuya firma de cabildeo federal, su comité político o sus cabilderos donaron a la campaña.'; },
      norequests: function(p){ return esc(p.name) + ' no hizo solicitudes de fondos federales para proyectos en 2025 ni 2026.'; },
      how: 'Cómo se cuenta'
    },
    ht: {
      donors: function(n){ return n + ' donatè'; },
      before: function(b){ return b; },
      took: function(p, why){
        var s = esc(p.name) + ' resevwa ' + usd(p.total) + ' nan men ' + this.donors(p.donors) + ' ' + why + '.';
        if(p.campaignAmt && p.committeeAmt) s += ' ' + usd(p.campaignAmt) + ' te ale nan kanpay la epi ' + usd(p.committeeAmt) + ' nan ' + (p.cmteRole === 'solicits' ? 'komite politik (PAC) li te deklare li ranmase lajan pou li a.' : p.accounts > 2 ? 'komite politik li prezide yo.' : 'komite politik' + (p.body === 'county' ? ' (PAC)' : '') + ' li prezide a.');
        else if(p.committeeAmt) s += ' Tout te ale nan komite politik li prezide a.';
        return s;
      },
      whyAct: function(p){ return 'ki konekte ak aksyon ofisyèl li'; },
      whyBody: function(p, b){ return 'ki te gen dosye devan ' + this.before(b); },
      fromReq: function(p, R, fed, b){ return usd(R.money) + ' te soti nan ' + (fed ? 'fèm lobi federal (oswa komite politik oswa lobiyis yo) gwoup li te mande Kongrè a finanse, nan ' + R.n + ' demann lajan pou pwojè' : 'fèm lobiyis yo, oswa gwoup ki t ap resevwa lajan an, sou ' + R.n + ' demann bidjè li te depoze nan ' + this.before(b)) + '.'; },
      fromBills: function(p, Bl, fed){ return usd(Bl.money) + ' te soti nan ' + (fed ? 'komite politik' : 'donatè') + ' nan sektè ' + (Bl.bills === 1 && Bl.yes === 1 ? 'yon pwojè lwa' : 'pwojè lwa') + ' li te vote pou yo ede.'; },
      fromOther: function(p, Bl, fed){ var how = Bl.no && nv(Bl) ? 'te vote kont oswa pa t vote sou yo' : Bl.no ? 'te vote kont yo' : 'pa t vote sou yo'; return usd(Bl.otherMoney) + ' te soti nan ' + (fed ? 'komite politik' : 'donatè') + ' nan sektè kèk pwojè lwa ede, kote li ' + how + '.'; },
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
        var n = Bl.bills === 1 ? 'pwojè lwa a' : Bl.bills + ' pwojè lwa yo', parts = [];
        if(Bl.yes === Bl.votes) return 'Li te vote wi sou ' + (Bl.bills === 1 ? n : 'tout ' + n) + (Bl.votes > Bl.bills ? ' (' + Bl.votes + ' vòt an sesyon plenyè an tout)' : '') + '.';
        if(Bl.yes) parts.push('wi ' + Bl.yes + ' fwa');
        if(Bl.no) parts.push('non ' + Bl.no + ' fwa');
        var s = 'Li' + (parts.length ? ' te vote ' + parts.join(' epi ') + ' nan ' : ' pa t vote nan okenn nan ') + Bl.votes + ' vòt an sesyon plenyè sou ' + n;
        return s + (parts.length && nv(Bl) ? ', epi li pa t vote ' + nv(Bl) + ' fwa' : '') + '.';
      },
      voted: function(p, b){
        var on = (p.items === 1 ? 'sèl dosye' : p.items + ' dosye') + (p.since ? ' depi ' + p.since : '') + ' devan ' + this.before(b) + ' kote yon donatè te gen enterè';
        if(p.items === 1) return (p.yes ? 'Li te vote wi sou ' : p.no ? 'Li te vote non sou ' : p.abst ? 'Li te abstni oswa retire tèt li sou ' : p.unk ? 'Rapò reyinyon an pa bay vòt li sou ' : 'Li te absan pou ') + on + '.';
        var parts = ['li te vote wi sou ' + p.yes];
        if(p.no) parts.push('non sou ' + p.no);
        if(p.abst) parts.push('li te abstni oswa retire tèt li sou ' + p.abst);
        if(p.away) parts.push('li te absan pou ' + p.away);
        if(p.unk) parts.push('rapò reyinyon an pa bay vòt li sou ' + p.unk);
        return 'Sou ' + on + ', ' + (parts.length > 1 ? parts.slice(0, -1).join(', ') + ' epi ' + parts[parts.length - 1] : parts[0]) + '.';
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
        return since(U.from, 'ht') + ', li te vote sou ' + U.tied + ' nouvo lwa (' + q[0] + ') ki ede yon sektè kote ' + (fed ? 'komite politik' : 'donatè') + ' yo te ba li lajan. Pou ' + r + ' (' + q[1] + '), yo pa t ba li.';
      },
      tookBills: function(p, Bl, fed){ var n = p.donors; return 'Li te resevwa ' + usd(p.total) + ' nan men ' + (fed ? (n === 1 ? '1 komite politik' : n + ' komite politik') : this.donors(n)) + ' nan sektè ' + (Bl.bills === 1 ? 'yon pwojè lwa' : 'pwojè lwa') + ' li te vote pou yo ede.'; },
      share: function(p, S, b){
        if(S.def === 'donorFirst') return 'Lis vil sa a kòmanse ak donatè li yo, paske vil la pa pibliye yon rejis lobiyis nou ka itilize. Kidonk pa gen yon fason jis pou konte aksyon ki pa t gen donatè.';
        var q = pair(S.tied, S.n), r = S.n - S.tied, s0 = since(S.from, 'ht') + ', ';
        var act = S.def === 'earmarks' ? 'li te depoze ' + S.tied + ' demann lajan federal pou pwojè (' + q[0] + ') pou gwoup kote lobiyis yo te ba li lajan'
          : S.def === 'requests' ? 'li te depoze ' + S.tied + ' demann bidjè (' + q[0] + ') kote yon lobiyis, oswa gwoup ki t ap resevwa lajan an, te ba li lajan'
          : S.def === 'cabinet' ? 'li te fè ' + S.tied + ' vòt Kabinè ak aksyon biwo (' + q[0] + ') ki te gen youn nan donatè li yo ladan'
          : 'li te vote sou ' + S.tied + ' aksyon (' + q[0] + ') ki te gen youn nan donatè li yo ladan';
        return s0 + act + '. Pou ' + r + ' (' + q[1] + '), pa t genyen.';
      },
      none: function(p, b){ return 'Nou pa jwenn okenn donatè ki te gen dosye devan ' + this.before(b) + (p.giftsFrom ? ' depi ' + p.giftsFrom.slice(0, 4) + '.' : ' an 2025 oswa 2026.'); },
      nogivers: function(p){ return 'Rapò ' + esc(p.name) + ' yo pa montre okenn donatè deyò.'; },
      nodata: function(p){ return 'Pa gen rapò donatè detaye ki afiche pou ' + esc(p.name) + ', kidonk nou pa t ka verifye.'; },
      noneCity: 'Nou pa jwenn okenn donatè ki te gen dosye devan vil la an 2025 oswa 2026.',
      noneF: function(p){ return 'Okenn nan demann lajan federal  ' + esc(p.name) + ' pa t pou yon gwoup kote fèm lobi federal li, komite politik li oswa lobiyis li te bay kanpay la.'; },
      norequests: function(p){ return esc(p.name) + ' pa t fè okenn demann lajan federal pou pwojè an 2025 oswa 2026.'; },
      how: 'Kijan nou konte'
    }
  };
  // Groups of sentences, shown as short paragraphs: the money, where it came from, timing, the actions.
  function moneySummary(p, lang){
    var w = W[lang] || W.en, b = esc(L(p.bodyName, lang)), groups = [];
    if(p.kind === 'none') return p.status === 'nogivers' ? w.nogivers(p) : p.status === 'nodata' ? w.nodata(p) : p.status === 'norequests' ? w.norequests(p) : w.noneCity;
    if(p.kind === 'federal' || p.kind === 'state'){
      var fed = p.kind === 'federal', R = p.requests || {n: 0, money: 0}, Bl = p.bills || {votes: 0, yes: 0, money: 0};
      if(!p.total) return (p.share && p.share.n ? w.share(p, p.share, b) + '<br>' : '') + (fed ? (p.body === 'ussenate' && !R.n ? w.norequests(p) : w.noneF(p)) : w.none(p, b));
      var onlyBills = Bl.money && !R.money && !Bl.otherMoney && Bl.money === p.total;
      if(onlyBills){
        groups.push([w.tookBills(p, Bl, fed), w.timing(p, w.whatBill), Bl.votes ? w.bills(p, Bl) : ''].filter(Boolean));
      } else {
      groups.push([w.took(p, w.whyAct(p))]);
      var from = [];
      if(R.money) from.push(w.fromReq(p, R, fed, b));
      if(Bl.money) from.push(w.fromBills(p, Bl, fed));
      if(Bl.otherMoney) from.push(w.fromOther(p, Bl, fed));
      groups.push(from);
      groups.push([w.timing(p, w.whatReq)]);
      var acts = [];
      if(R.money) acts.push(w.req(p, R, fed));
      if(Bl.votes && (Bl.money || Bl.otherMoney)) acts.push(w.bills(p, Bl));
      if(fed && !R.n && p.body === 'ussenate') acts.push(w.norequests(p));
      groups.push(acts);
      }
    } else {
      if(!p.total) return (p.share && p.share.n ? w.share(p, p.share, b) + '<br>' : '') + w.none(p, b);
      groups.push([w.took(p, p.kind === 'cabinet' ? w.whyAct(p) : w.whyBody(p, b))]);
      groups.push([w.timing(p, w.whatVote)]);
      var a2 = [p.kind === 'cabinet' ? w.cabinet(p) : w.voted(p, b)];
      if(p.split) a2.push(w.split(p));
      groups.push(a2);
    }
    // The percentages lead (Brit, Oct 24, 2026): share of actions tied to donors, then the share of laws
    var top = [];
    if(p.share && (p.share.def === 'donorFirst' || p.share.n)) top.push([w.share(p, p.share, b)]);
    if(p.bills && p.bills.universe && p.bills.universe.n) top.push([w.billShare(p, p.bills.universe, p.kind === 'federal')]);
    groups = top.concat(groups);
    return groups.filter(function(g){ return g.length; }).map(function(g){ return g.join(' '); }).join('<br>');
  }
  moneySummary.howLabel = function(lang){ return (W[lang] || W.en).how; };
  if(typeof window !== 'undefined') window.moneySummary = moneySummary;
  if(typeof module !== 'undefined') module.exports = moneySummary;
})();
