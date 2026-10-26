// Finds a voter's precinct from a street address or the phone's location, in the browser.
// 1. Address -> coordinates: the U.S. Census Bureau geocoder (free, no key).
// 2. Coordinates -> precinct: the county's own precinct polygons (Miami-Dade GIS, Precinct layer on
//    ArcGIS Online), queried with a point-in-polygon request.
// Both calls go straight from the browser to those services; the address is never sent to this site.
// If a browser call fails (network, blocked by an extension), the same lookup runs through /api/geocode
// and /api/precinct on this site, which pass it along and keep nothing.
// The precinct that comes back is the whole precinct; split precincts (116.0 / 116.1) are told apart
// only by the voter's own ballot, so both halves are returned and the page asks which.
(function(){
  var CENSUS = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';
  var LAYER = 'https://services.arcgis.com/8Pc9XBTAsYuxx9Ny/arcgis/rest/services/Precinct_gdb/FeatureServer/0/query';
  var SOURCES = {
    geocoder: 'https://geocoding.geo.census.gov/geocoder/',
    precincts: 'https://gis-mdc.opendata.arcgis.com/datasets/MDC::precinct',
    layer: 'https://services.arcgis.com/8Pc9XBTAsYuxx9Ny/arcgis/rest/services/Precinct_gdb/FeatureServer/0'
  };

  // "123 Main St Miami" -> "123 Main St Miami, FL": the geocoder needs a state to stay in Florida
  function cleanAddress(s){
    var a = String(s || '').replace(/\s+/g, ' ').trim();
    if(!a) return '';
    if(!/\b(fl|florida)\b/i.test(a)) a += ', FL';
    return a;
  }

  // Census geocoder response -> {lat, lng, matched} or null
  function parseGeocode(j){
    var m = j && j.result && j.result.addressMatches;
    if(!m || !m.length) return null;
    var best = m[0];
    if(!best.coordinates) return null;
    var st = best.addressComponents && best.addressComponents.state;
    if(st && String(st).toUpperCase() !== 'FL') return null;
    var lat = Number(best.coordinates.y), lng = Number(best.coordinates.x);
    if(!isFinite(lat) || !isFinite(lng)) return null;
    return { lat: lat, lng: lng, matched: best.matchedAddress || '' };
  }

  // ArcGIS query response -> whole precinct number as a string ("503"), or '' when the point is in
  // no precinct (outside Miami-Dade, or in the bay)
  function parseLayer(j){
    var f = j && j.features;
    if(!f || !f.length) return '';
    var id = f[0].attributes && (f[0].attributes.ID != null ? f[0].attributes.ID : f[0].attributes.id);
    if(id == null) return '';
    var n = parseInt(id, 10);
    return isFinite(n) ? String(n) : '';
  }

  // Whole precinct + the county's precinct list -> every precinct code the voter might be in.
  // ["503.0"] for most; ["116.0", "116.1"] where the county splits a precinct.
  function candidates(whole, data){
    var out = [], n = parseInt(whole, 10);
    if(!isFinite(n) || !data || !data.precincts) return out;
    var pad = String(n); while(pad.length < 3) pad = '0' + pad;
    for(var k in data.precincts){ if(k.split('.')[0] === pad) out.push(k); }
    out.sort();
    return out;
  }

  function fetchJson(url, ms){
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function(){ ctl.abort(); }, ms || 12000) : null;
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).finally(function(){ if(timer) clearTimeout(timer); });
  }

  // Address -> {lat, lng, matched}; throws 'nomatch' when the geocoder finds nothing in Florida
  function geocode(address){
    var a = cleanAddress(address);
    if(!a) return Promise.reject(new Error('empty'));
    // The Census geocoder refuses calls from other sites' pages, so the address goes through this site's
    // /api/geocode (rooftop match first, then the Census); a second try if the first times out
    var viaSite = '/api/geocode?q=' + encodeURIComponent(a);
    return fetchJson(viaSite, 20000).catch(function(){ return fetchJson(viaSite, 20000); }).then(function(j){
      var g = parseGeocode(j);
      if(!g) throw new Error('nomatch');
      return g;
    });
  }

  // Coordinates -> whole precinct number ("503") or '' when none
  function precinctAt(lat, lng){
    var direct = LAYER + '?f=json&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects' +
      '&outFields=ID&returnGeometry=false&geometry=' + encodeURIComponent(lng + ',' + lat);
    var viaSite = '/api/precinct?lat=' + encodeURIComponent(lat) + '&lng=' + encodeURIComponent(lng);
    return fetchJson(direct).catch(function(){ return fetchJson(viaSite); }).then(function(j){
      if(j && j.error) throw new Error('layer');
      return parseLayer(j);
    });
  }

  // The phone's location -> {lat, lng}; rejects with the browser's error (denied, unavailable, timeout)
  function locate(){
    return new Promise(function(res, rej){
      if(!navigator.geolocation) return rej(new Error('unsupported'));
      navigator.geolocation.getCurrentPosition(function(p){
        res({ lat: p.coords.latitude, lng: p.coords.longitude, matched: '', accuracy: p.coords.accuracy });
      }, function(e){ rej(e); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 });
    });
  }

  window.findPrecinct = {
    cleanAddress: cleanAddress, parseGeocode: parseGeocode, parseLayer: parseLayer, candidates: candidates,
    geocode: geocode, precinctAt: precinctAt, locate: locate, SOURCES: SOURCES
  };
})();
