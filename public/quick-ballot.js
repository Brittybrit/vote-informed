// Reads an uploaded sample ballot in the browser, so a precinct ballot costs nothing to load.
// The PDF's own text gives the election date and the precinct; the races then come from the
// countywide master ballot (already checked against the county's PDF), filtered to that precinct.
// No AI parse, no upload. Ballots it can't read this way (scans, no precinct printed) fall back
// to the server parse as before.
(function(){
  var PDFJS = '/vendor/pdfjs-4.10.38/pdf.min.mjs';
  var WORKER = '/vendor/pdfjs-4.10.38/pdf.worker.min.mjs';
  var MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8,
    september: 9, october: 10, november: 11, december: 12 };

  async function readPdfText(file, maxPages){
    var pdfjs = await import(PDFJS);
    pdfjs.GlobalWorkerOptions.workerSrc = WORKER;
    var doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    var out = [];
    for(var i = 1; i <= Math.min(doc.numPages, maxPages || 12); i++){
      var tc = await (await doc.getPage(i)).getTextContent();
      out.push(tc.items.map(function(it){ return it.str; }).join(' '));
    }
    return out.join('\n');
  }

  // 'this' when the text names Nov 3, 2026; 'other' when it names a different election date;
  // '' when it names no full date (can't tell here, so the server decides).
  function electionCheck(text, want){
    want = want || { year: 2026, month: 11, day: 3 };
    var re = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(20\d{2})\b/gi;
    var m, found = false;
    while((m = re.exec(String(text || '')))){
      found = true;
      if(MONTHS[m[1].toLowerCase()] === want.month && +m[2] === want.day && +m[3] === want.year) return 'this';
    }
    return found ? 'other' : '';
  }

  // "PRECINCT 033.0" -> "033.0"; '' when no single precinct is printed
  function precinctFromText(text, normPrecinct){
    var all = String(text || '').match(/\bPRECINCT\s+(\d{1,4}(?:\.\d)?)\b/gi) || [];
    var set = {};
    all.forEach(function(s){ set[normPrecinct(s)] = true; });
    var keys = Object.keys(set).filter(Boolean);
    return keys.length === 1 ? keys[0] : '';
  }

  function norm(s){
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/["“”][^"“”]*["“”]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  // Races the precinct alone can't place (community development districts and the like): kept only
  // when the ballot's own text shows them, by a candidate's name or the question's title.
  function seenOnBallot(races, text, isUnknown){
    var t = ' ' + norm(text) + ' ';
    var seen = [];
    races.forEach(function(r, ri){
      if(!isUnknown(r, ri)) return;
      var hit = (r.candidates || []).some(function(c){ var n = norm(c.name); return n.length > 4 && t.indexOf(' ' + n + ' ') >= 0; });
      if(!hit && r.isMeasure){ var o = norm(r.office).split(' ').slice(0, 8).join(' '); hit = o.length > 10 && t.indexOf(o) >= 0; }
      if(hit) seen.push(ri);
    });
    return seen;
  }

  window.quickBallot = { readPdfText: readPdfText, electionCheck: electionCheck, precinctFromText: precinctFromText, seenOnBallot: seenOnBallot };
})();
