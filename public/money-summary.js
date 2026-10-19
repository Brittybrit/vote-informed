// One-line money summary per incumbent, in English, Spanish and Haitian Creole.
// Data: /data/money-summary.json (built by scripts/money-summary.mjs). Used by / and /decisions.
// moneySummary(entry, lang) returns HTML (names escaped).
(function(){
  function esc(x){ return String(x == null ? '' : x).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function usd(n){ return '$' + Math.round(Number(n) || 0).toLocaleString('en-US'); }
  function big(n, lang){
    if(n < 1e6) return usd(n);
    var x = (Math.round(n / 1e5) / 10).toFixed(1).replace(/\.0$/, '');
    return '$' + x + (lang === 'es' ? ' millones' : lang === 'ht' ? ' milyon' : ' million');
  }
  function L(o, lang){ return o && typeof o === 'object' ? (o[lang] || o.en) : o; }
  var W = {
    en: {
      donors: function(n){ return n === 1 ? '1 donor' : n + ' donors'; },
      before: function(b){ return 'the ' + b; },
      took: function(p, b){ return (p.accounts > 1 ? esc(p.name) + '’s campaign and ' + (p.body === 'county' ? 'PAC' : 'political committee') + ' took ' : esc(p.name) + ' took ') + usd(p.total) + ' from ' + this.donors(p.donors) + ' with business before ' + this.before(b) + '.'; },
      voted: function(p){
        var s = esc(p.last) + ' voted yes on ' + (p.items === 1 ? (p.yes ? 'the one item' : 'none of the one item') : p.yes === p.items ? 'all ' + p.items + ' items' : p.yes + ' of the ' + p.items + ' items');
        if(p.items === 1 && !p.yes) s = esc(p.last) + (p.no ? ' voted no on the one item' : ' was absent for the one item');
        else { if(p.no) s += ', no on ' + p.no; if(p.away) s += ', and was absent for ' + p.away; }
        return s + '.';
      },
      split: function(p){ return p.items === 1 ? 'It was a split vote.' : p.split === 1 ? 'One was a split vote.' : p.split + ' were split votes.'; },
      req: function(p, R){ return esc(p.name) + ' filed ' + R.n + ' budget request' + (R.n === 1 ? '' : 's') + ' worth ' + big(R.ask, 'en') + ' where the lobbying firm or the group getting the money gave ' + usd(R.money) + '. ' + (R.funded ? big(R.funded, 'en') + ' of that made the final budget after vetoes.' : 'None of it made the final budget.'); },
      bills: function(p, Bl, first){
        var what = Bl.yes === Bl.votes ? (Bl.votes === Bl.bills ? Bl.bills + ' bill' + (Bl.bills === 1 ? '' : 's') : 'all ' + Bl.votes + ' floor votes on ' + Bl.bills + ' bills') : Bl.yes + ' of ' + Bl.votes + ' floor votes on ' + Bl.bills + ' bill' + (Bl.bills === 1 ? '' : 's');
        return (first ? esc(p.name) : esc(p.last)) + ' voted yes on ' + what + (Bl.bills === 1 ? ' that helps' : ' that help') + ' kinds of business that gave' + (Bl.money ? '; those donors gave ' + usd(Bl.money) + (first ? '' : ' more') : '') + '.';
      },
      total: function(p){ return 'In all, ' + usd(p.total) + (p.accounts > 2 ? ' to the campaign and political committees' : p.accounts > 1 ? ' to the campaign and political committee' : '') + '.'; },
      after: 'Every gift came after the action it is tied to.',
      allBefore: 'Every gift came before an action it is tied to.',
      someBefore: function(a){ return usd(a) + ' of it came before an action it is tied to.'; },
      none: function(p, b){ return 'No donors found with business before ' + this.before(b) + ' in 2025 or 2026.'; },
      nogivers: function(p){ return esc(p.name) + '’s reports show no outside donors.'; },
      nodata: function(p){ return 'No itemized donor reports are posted for ' + esc(p.name) + ', so this could not be checked.'; },
      noneCity: 'No donors found with business before the city in 2025 or 2026.',
      reqF: function(p, R){ return esc(p.name) + ' filed ' + R.n + ' earmark request' + (R.n === 1 ? '' : 's') + ' worth ' + big(R.ask, 'en') + ' for groups whose federal lobbying firms, their PACs or their lobbyists gave ' + usd(R.money) + ' from ' + this.donors(R.donors) + '.'; },
      noneF: function(p){ return 'None of ' + esc(p.name) + '’s earmark requests in 2025 or 2026 were for a group whose federal lobbying firm, its PAC or its lobbyists gave to the campaign.'; },
      norequests: function(p){ return esc(p.name) + ' made no earmark requests in 2025 or 2026.'; },
      how: 'How this is counted'
    },
    es: {
      donors: function(n){ return n === 1 ? '1 donante' : n + ' donantes'; },
      before: function(b){ var w = String(b).split(' ')[0]; return (/^(Concejo|Senado)$/.test(w) ? 'el ' : /^(Comisi|Cámara|Junta)/.test(w) ? 'la ' : '') + b; },
      took: function(p, b){ return (p.accounts > 1 ? 'La campaña y el ' + (p.body === 'county' ? 'PAC' : 'comité político') + ' de ' + esc(p.name) + ' recibieron ' : esc(p.name) + ' recibió ') + usd(p.total) + ' de ' + this.donors(p.donors) + ' con asuntos ante ' + this.before(b) + '.'; },
      voted: function(p){
        var s = esc(p.last) + ' votó a favor ' + (p.items === 1 ? 'del único asunto' : p.yes === p.items ? 'de los ' + p.items + ' asuntos' : 'de ' + p.yes + ' de los ' + p.items + ' asuntos');
        if(p.items === 1 && !p.yes) s = esc(p.last) + (p.no ? ' votó en contra del único asunto' : ' estuvo ausente en el único asunto');
        else { if(p.no) s += ', en contra de ' + p.no; if(p.away) s += ' y estuvo ausente en ' + p.away; }
        return s + '.';
      },
      split: function(p){ return p.items === 1 ? 'Fue una votación dividida.' : p.split === 1 ? 'Una fue una votación dividida.' : p.split + ' fueron votaciones divididas.'; },
      req: function(p, R){ return esc(p.name) + ' presentó ' + R.n + ' solicitud' + (R.n === 1 ? '' : 'es') + ' de presupuesto por ' + big(R.ask, 'es') + ' en las que la firma de cabildeo o el grupo que recibiría el dinero donó ' + usd(R.money) + '. ' + (R.funded ? big(R.funded, 'es') + ' de eso quedó en el presupuesto final después de los vetos.' : 'Nada de eso quedó en el presupuesto final.'); },
      bills: function(p, Bl, first){
        var n = Bl.bills + ' proyecto' + (Bl.bills === 1 ? '' : 's') + ' de ley';
        var what = Bl.yes === Bl.votes ? (Bl.votes === Bl.bills ? n : 'las ' + Bl.votes + ' votaciones en el pleno sobre ' + n) : Bl.yes + ' de ' + Bl.votes + ' votaciones en el pleno sobre ' + n;
        return (first ? esc(p.name) : esc(p.last)) + ' votó a favor de ' + what + (Bl.bills === 1 && Bl.votes === 1 ? ' que beneficia' : ' que benefician') + ' a tipos de negocio que donaron' + (Bl.money ? '; esos donantes dieron ' + usd(Bl.money) + (first ? '' : ' más') : '') + '.';
      },
      total: function(p){ return 'En total, ' + usd(p.total) + (p.accounts > 2 ? ' a la campaña y los comités políticos' : p.accounts > 1 ? ' a la campaña y el comité político' : '') + '.'; },
      after: 'Cada donación llegó después de la acción con la que se vincula.',
      allBefore: 'Cada donación llegó antes de una acción con la que se vincula.',
      someBefore: function(a){ return usd(a) + ' llegó antes de una acción con la que se vincula.'; },
      none: function(p, b){ return 'No se encontraron donantes con asuntos ante ' + this.before(b) + ' en 2025 o 2026.'; },
      nogivers: function(p){ return 'Los informes de ' + esc(p.name) + ' no muestran donantes externos.'; },
      nodata: function(p){ return 'No hay informes detallados de donantes publicados para ' + esc(p.name) + ', así que no se pudo verificar.'; },
      noneCity: 'No se encontraron donantes con asuntos ante la ciudad en 2025 o 2026.',
      reqF: function(p, R){ return esc(p.name) + ' presentó ' + R.n + ' solicitud' + (R.n === 1 ? '' : 'es') + ' de fondos federales para proyectos por ' + big(R.ask, 'es') + ' para grupos cuyas firmas de cabildeo federal, sus comités políticos o sus cabilderos donaron ' + usd(R.money) + ' de ' + this.donors(R.donors) + '.'; },
      noneF: function(p){ return 'Ninguna de las solicitudes de fondos federales de ' + esc(p.name) + ' en 2025 o 2026 fue para un grupo cuya firma de cabildeo federal, su comité político o sus cabilderos donaran a la campaña.'; },
      norequests: function(p){ return esc(p.name) + ' no hizo solicitudes de fondos federales para proyectos en 2025 ni 2026.'; },
      how: 'C\u00f3mo se cuenta'
    },
    ht: {
      donors: function(n){ return n + ' donatè'; },
      before: function(b){ return b; },
      took: function(p, b){ return (p.accounts > 1 ? 'Kanpay ak ' + (p.body === 'county' ? 'PAC' : 'komite politik') + ' ' + esc(p.name) + ' resevwa ' : esc(p.name) + ' resevwa ') + usd(p.total) + ' nan men ' + this.donors(p.donors) + ' ki te gen dosye devan ' + this.before(b) + '.'; },
      voted: function(p){
        var s = esc(p.last) + ' vote wi sou ' + (p.items === 1 ? 'sèl dosye a' : p.yes === p.items ? 'tout ' + p.items + ' dosye yo' : p.yes + ' nan ' + p.items + ' dosye yo');
        if(p.items === 1 && !p.yes) s = esc(p.last) + (p.no ? ' vote non sou sèl dosye a' : ' te absan pou sèl dosye a');
        else { if(p.no) s += ', non sou ' + p.no; if(p.away) s += ' epi li te absan pou ' + p.away; }
        return s + '.';
      },
      split: function(p){ return p.items === 1 ? 'Se te yon vòt divize.' : p.split === 1 ? 'Youn se te yon vòt divize.' : p.split + ' ladan yo se te vòt divize.'; },
      req: function(p, R){ return esc(p.name) + ' depoze ' + R.n + ' demann bidjè pou ' + big(R.ask, 'ht') + ' kote fèm lobiyis la oswa gwoup ki t ap resevwa lajan an te bay ' + usd(R.money) + '. ' + (R.funded ? big(R.funded, 'ht') + ' ladan l te rive nan bidjè final la apre veto yo.' : 'Anyen ladan l pa t rive nan bidjè final la.'); },
      bills: function(p, Bl, first){
        var n = Bl.bills + ' pwojè lwa';
        var what = Bl.yes === Bl.votes ? (Bl.votes === Bl.bills ? n : 'tout ' + Bl.votes + ' vòt an sèsyon plènyè sou ' + n) : Bl.yes + ' nan ' + Bl.votes + ' vòt an sèsyon plènyè sou ' + n;
        return (first ? esc(p.name) : esc(p.last)) + ' vote wi sou ' + what + ' ki ede kalite biznis ki te bay lajan' + (Bl.money ? '; donatè sa yo te bay ' + usd(Bl.money) + (first ? '' : ' anplis') : '') + '.';
      },
      total: function(p){ return 'An tout, ' + usd(p.total) + (p.accounts > 2 ? ' pou kanpay la ak komite politik yo' : p.accounts > 1 ? ' pou kanpay la ak komite politik la' : '') + '.'; },
      after: 'Chak kado te vini apre aksyon li konekte ak li a.',
      allBefore: 'Chak kado te vini anvan yon aksyon li konekte ak li.',
      someBefore: function(a){ return usd(a) + ' ladan l te vini anvan yon aksyon li konekte ak li.'; },
      none: function(p, b){ return 'Nou pa jwenn okenn donatè ki te gen dosye devan ' + this.before(b) + ' an 2025 oswa 2026.'; },
      nogivers: function(p){ return 'Rapò ' + esc(p.name) + ' yo pa montre okenn donatè deyò.'; },
      nodata: function(p){ return 'Pa gen rapò donatè detaye ki afiche pou ' + esc(p.name) + ', kidonk nou pa t ka verifye.'; },
      noneCity: 'Nou pa jwenn okenn donat\u00e8 ki te gen dosye devan vil la an 2025 oswa 2026.',
      reqF: function(p, R){ return esc(p.name) + ' depoze ' + R.n + ' demann lajan federal pou pwojè pou ' + big(R.ask, 'ht') + ' pou gwoup kote fèm lobi federal yo, komite politik yo oswa lobiyis yo te bay ' + usd(R.money) + ' nan men ' + this.donors(R.donors) + '.'; },
      noneF: function(p){ return 'Okenn nan demann lajan federal ' + esc(p.name) + ' an 2025 oswa 2026 pa t pou yon gwoup kote fèm lobi federal li, komite politik li oswa lobiyis li te bay kanpay la.'; },
      norequests: function(p){ return esc(p.name) + ' pa t fè okenn demann lajan federal pou pwojè an 2025 oswa 2026.'; },
      how: 'Kijan nou konte'
    }
  };
  function moneySummary(p, lang){
    var w = W[lang] || W.en, b = esc(L(p.bodyName, lang)), out = [];
    if(p.kind === 'none') return p.status === 'nogivers' ? w.nogivers(p) : p.status === 'nodata' ? w.nodata(p) : p.status === 'norequests' ? w.norequests(p) : w.noneCity;
    if(p.kind === 'federal') return p.total ? w.reqF(p, p.requests) : w.noneF(p);
    if(!p.total) return w.none(p, b);
    var timing = !p.before ? w.after : p.before === p.gifts ? w.allBefore : w.someBefore(p.beforeAmt);
    if(p.kind === 'state'){
      var R = p.requests, Bl = p.bills;
      if(R.n) out.push(w.req(p, R));
      if(Bl.votes) out.push(w.bills(p, Bl, !R.n));
      out.push(w.total(p), timing);
      return out.join(' ');
    }
    out.push(w.took(p, b), w.voted(p));
    if(p.split) out.push(w.split(p));
    out.push(timing);
    return out.join(' ');
  }
  moneySummary.howLabel = function(lang){ return (W[lang] || W.en).how; };
  if(typeof window !== 'undefined') window.moneySummary = moneySummary;
  if(typeof module !== 'undefined') module.exports = moneySummary;
})();
