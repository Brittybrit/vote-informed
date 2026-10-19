// Which races on the countywide master ballot a precinct votes on, from the county's
// precinct / district cross reference (/data/precincts.json).
// raceInPrecinct returns true (on that precinct's ballot), false (not on it), or null (can't tell
// from the precinct alone, e.g. a community development district, so the race stays visible).
(function(){
  var ALIAS = { 'NORTH MIAMI BEACH': 'N MIAMI BEACH', 'NORTH BAY VILLAGE': 'N BAY VILLAGE', 'INDIAN CREEK': 'INDIAN CREEK VILLAGE' };
  function muniName(s){
    var n = String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    return ALIAS[n] || n;
  }
  // "33", "033", "33.0", "PRECINCT 033.0" -> "033.0"
  function normPrecinct(p){
    var m = String(p || '').match(/(\d{1,4})(?:\.(\d))?/);
    if(!m) return '';
    var n = String(parseInt(m[1], 10));
    while(n.length < 3) n = '0' + n;
    return n + '.' + (m[2] || '0');
  }
  var EVERYONE = /^(united states senator|governor|attorney general|chief financial officer|commissioner of agriculture|justice of the supreme court|district court of appeal|circuit judge|county court judge|state attorney|public defender|sheriff|property appraiser|tax collector|supervisor of elections|clerk of)/i;
  var EVERYONE_MEASURE = /^(no\.?\s*\d+\s+constitutional amendment|constitutional amendment|amendment\s*\d|county referendum|school board referendum|miami-dade county)/i;
  function num(re, o){ var m = o.match(re); return m ? parseInt(m[1], 10) : null; }

  function raceInPrecinct(race, pct, data){
    var row = data && data.precincts && data.precincts[pct];
    if(!row) return null;
    var o = String(race && race.office || '').trim(), n;
    if(race.isMeasure){
      if(EVERYONE_MEASURE.test(o)) return true;
      var mm = o.match(/^(?:city|town|village) of (.+?)(?:\s+\d+)?\s*:/i);
      if(mm) return muniName(mm[1]) === row[3];
      return null;
    }
    if(EVERYONE.test(o)) return true;
    if((n = num(/^representative in congress,?\s+district\s+(\d+)/i, o)) !== null) return row[0] === n;
    if((n = num(/^state senator,?\s+district\s+(\d+)/i, o)) !== null) return row[1] === n;
    if((n = num(/^state representative,?\s+district\s+(\d+)/i, o)) !== null) return row[2] === n;
    if((n = num(/^school board member,?\s+district\s+(\d+)/i, o)) !== null) return row[4] === n;
    if((n = num(/^county commissioner,?\s+district\s+(\d+)/i, o)) !== null) return row[5] === n;
    if((n = num(/community council\s+(\d+)/i, o)) !== null) return row[6] === n;
    var cm = o.match(/^(.+?)\s+[-–]\s+(.+)$/);
    if(cm){
      var city = muniName(cm[1]);
      var known = false;
      for(var k in data.precincts){ if(data.precincts[k][3] === city){ known = true; break; } }
      if(!known) return null;          // not a city: special districts and the like
      if(city !== row[3]) return false;
      // Only North Miami and Miami Gardens elect some council seats by district; the county
      // publishes precinct lists for those districts. Other cities' seats are citywide.
      if(city === 'NORTH MIAMI' && (n = num(/district\s+(\d+)/i, cm[2])) !== null) return (data.northMiamiDistrict || {})[pct] === n;
      if(city === 'MIAMI GARDENS' && /residential area/i.test(cm[2]) && (n = num(/seat\s+(\d+)/i, cm[2])) !== null) return (data.miamiGardensDistrict || {})[pct] === n;
      return true;
    }
    return null;
  }
  window.precinctFilter = { raceInPrecinct: raceInPrecinct, normPrecinct: normPrecinct, muniName: muniName };
})();
