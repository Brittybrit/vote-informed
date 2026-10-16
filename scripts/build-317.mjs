// Builds public-317/ (Ballot317, Marion County, Indiana) from Ballot305's public/index.html.
//   node scripts/build-317.mjs
// Ballot305's files are only read, never written. Every change below is an exact text replacement
// that must match once; if Ballot305's page changes underneath one, the build stops and says which,
// instead of shipping a half-converted page. Rerun after Ballot305 page changes to carry them over.
// Hand-written Ballot317 pages (about, methodology) and data files live in public-317/ directly
// and are not touched here.
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(root, 'public');
const OUT = path.join(root, 'public-317');
fs.mkdirSync(OUT, { recursive: true });

let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
function rep(old, nu, count = 1) {
  const n = html.split(old).length - 1;
  if (n !== count) throw new Error('build-317: expected ' + count + ' match(es), found ' + n + ' for: ' + old.slice(0, 100));
  html = html.split(old).join(nu);
}
function repRe(re, nu) {
  if (!re.test(html)) throw new Error('build-317: no match for ' + re);
  html = html.replace(re, nu);
}

const PORTAL = 'https://indianavoters.in.gov/';

// Head: title, description, share cards (no share image yet: the 305 one would be wrong)
repRe(/<title>[^<]*<\/title>\n<meta name="description" content="[^"]*">/,
  '<title>BALLOT317 - For an Informed, Engaged Indianapolis</title>\n' +
  '<meta name="description" content="Free, nonpartisan research on every race and question on the Marion County, Indiana ballot. See who funds each candidate, who endorses them, with sources. Build your ballot plan and print it.">');
repRe(/<link rel="icon" href="\/favicon\.ico"[^>]*>\n/, '');
repRe(/<link rel="apple-touch-icon"[^>]*>\n<link rel="manifest"[^>]*>\n/, '');
repRe(/<meta property="og:type"[\s\S]*?<meta name="twitter:image"[^>]*>\n/,
  '<meta property="og:type" content="website">\n' +
  '<meta property="og:site_name" content="Ballot317">\n' +
  '<meta property="og:title" content="Ballot317: Follow the money, honey">\n' +
  '<meta property="og:description" content="Every race on the Marion County, Indiana ballot. Who funds them, who endorses them, with sources. Free and nonpartisan.">\n' +
  '<meta name="twitter:card" content="summary">\n');

// Masthead: name, English and Spanish only
rep('<h1 class="wordmark" aria-label="Ballot305.org">BALL<span class="o" aria-hidden="true"></span>T305<span class="dotorg">.ORG</span></h1>',
  '<h1 class="wordmark" aria-label="Ballot317">BALL<span class="o" aria-hidden="true"></span>T317</h1>');
rep('<button data-lang="es">ES</button><button data-lang="ht">KREYÒL</button>', '<button data-lang="es">ES</button>');

// Voter links: Indiana Voter Portal for registration, precinct and sample ballot
rep('https://www.voterfocus.com/VoterInformationLookup/voterSearch?county=FL-DAD', PORTAL, 3);
rep('https://registertovoteflorida.gov/', PORTAL);
// No countywide master ballot in Marion County: one sample ballot per precinct
rep('<button class="gb-opt" id="loadMaster" type="button">', '<button class="gb-opt" id="loadMaster" type="button" hidden>');

// Saved plans and language choice: own storage names
rep("'ballot305.lang'", "'ballot317.lang'", 2);
rep("var STORE = 'ballot305.plans';", "var STORE = 'ballot317.plans';");
rep('if(/^ballot305/.test(k))', 'if(/^ballot317/.test(k))');

// Languages: English and Spanish
rep("var LANGS = ['en', 'es', 'ht'];", "var LANGS = ['en', 'es'];\n" + overrides());
rep("  if (n.indexOf('ht') === 0) return 'ht';\n", '');

// Ballot sections: Indiana office titles
rep("if(/constitutional amendment|^(no\\.?|amendment)\\s*\\d/.test(o)) return 'amend';",
  "if(/constitutional amendment|public question|^(no\\.?|amendment)\\s*\\d/.test(o)) return 'amend';");
rep("if(/governor|attorney general|chief financial officer|commissioner of agriculture|state senat|state representative|state attorney|public defender/.test(o)) return 'state';",
  "if(/secretary of state|state comptroller|auditor of state|state treasurer|treasurer of state|state senat|state representative|tax court/.test(o)) return 'state';");
rep("if(/county|school board|sheriff|property appraiser|tax collector|supervisor of elections|clerk of|soil and water|community council/.test(o)) return 'county';",
  "if(/county|school|sheriff|prosecut|clerk|auditor|recorder|assessor|coroner|surveyor|township|trustee|constable|board member/.test(o)) return 'county';");
rep("if(/\\b(united states|u\\.?s\\.?)\\s+senat|representative in congress|congressional|president of the united states/.test(o)) return 'federal';",
  "if(/\\b(united states|u\\.?s\\.?)\\s+(senat|representative)|representative in congress|congressional|president of the united states/.test(o)) return 'federal';");
// Where state outside-spending filings live
rep("var state = /^(Governor|Attorney General|Chief Financial Officer|Commissioner of Agriculture|State Senator|State Representative|State Attorney|Public Defender|Circuit Judge)|District Court of Appeal|Justice of the Supreme Court/i.test(o);",
  "var state = /^(Secretary of State|State Comptroller|Auditor of State|State Treasurer|Treasurer of State|State Senator|State Representative)/i.test(o);");

// Vote bar: Marion County vote centers. Any county voter can vote at any vote center, early or on
// Election Day, so there is no precinct polling place to look up.
repRe(/function renderVoteBar\(\)\{[\s\S]*?\n\}\n\nasync function getEvSites/, indyVoteBar() + '\n\nasync function getEvSites');
rep("var VOTE = { evStart:'2026-10-19', evEnd:'2026-11-01', eday:'2026-11-03', open:7, close:19,",
  "var VOTE = { evStart:'2026-10-06', satStart:'2026-10-24', satEnd:'2026-11-01', evEnd:'2026-11-02', eday:'2026-11-03', open:6, close:18,");
rep("  lookup:'" + PORTAL + "' };", "  lookup:'" + PORTAL + "', centers:'https://vote.indy.gov/early-voting/', map:'https://vote.indy.gov/' };");

fs.writeFileSync(path.join(OUT, 'index.html'), html);

// Shared static files that carry no Ballot305 branding
for (const f of ['favicon.svg', 'admin.html']) fs.copyFileSync(path.join(SRC, f), path.join(OUT, f));
let headers = fs.readFileSync(path.join(SRC, '_headers'), 'utf8')
  .replace(/\n\/actions\.html\n[^\n]*\n/, '\n').replace(/\n\/transparency\.html\n[^\n]*\n/, '\n');
fs.writeFileSync(path.join(OUT, '_headers'), headers);
console.log('public-317/index.html built (' + html.length + ' bytes)');



function indyVoteBar() {
  return `function renderVoteBar(){
  var bar = $('voteBar'), n = miamiNow(), d = n.date, h = n.hour, html = '';
  if(d > VOTE.eday || (d === VOTE.eday && h >= VOTE.close)){ bar.className = 'votenow'; bar.innerHTML = ''; return; }
  var btn = function(url, label){ return '<a class="vb-btn" href="' + esc(url) + '" target="_blank" rel="noopener">' + label + ' &#8599;</a>'; };
  if(d === VOTE.eday || (d === VOTE.evEnd && h >= 12)){
    var open = d === VOTE.eday && h >= VOTE.open;
    html = '<div class="vb-row"><div><div class="vb-kicker">' + t('vb.kicker.eday') + '</div>' +
      '<div class="vb-head">' + (open ? '<span class="live"></span>' + t('vb.polls.open') : d === VOTE.eday ? t('vb.polls.opens') : t('vb.eve.head')) + '</div>' +
      '<div class="vb-sub">' + t('vb.eday.sub') + '</div></div>' + btn(VOTE.map, t('vb.btn.find')) + '</div>';
  } else {
    var head, sub;
    if(d < VOTE.evStart){ head = t('vb.pre.head'); sub = t('vb.pre.sub'); }
    else if(d < VOTE.satStart){ head = t('vb.dt.head'); sub = t('vb.dt.sub'); }
    else if(d <= VOTE.satEnd){ head = t('vb.sat.head'); sub = t('vb.sat.sub'); }
    else { head = t('vb.last.head'); sub = t('vb.last.sub'); }
    html = '<div class="vb-row"><div><div class="vb-kicker">' + t('vb.kicker.ev') + '</div>' +
      '<div class="vb-head">' + head + '</div><div class="vb-sub">' + sub + '</div></div>' + btn(VOTE.centers, t('vb.btn.sites')) + '</div>' +
      '<div class="vb-note">' + t('vb.source') + ' <a href="' + esc(VOTE.centers) + '" target="_blank" rel="noopener">' + t('vb.sourceName') + ' &#8599;</a></div>';
  }
  bar.innerHTML = html;
  bar.className = 'votenow show';
}`;
}

// Interface text that differs from Ballot305. Applied on top of Ballot305's English and Spanish
// strings; the Haitian Creole set is dropped.
function overrides() {
  const foot = (indep, made, how, about, corr) => indep + '<br>' + made + ' <a href="https://www.instagram.com/realbritty" target="_blank" rel="noopener">@realbritty</a> &middot; <a href="/methodology">' + how + '</a> &middot; <a href="/about">' + about + '</a> &middot; ' + corr + ': <a href="mailto:corrections@ballot305.org">corrections@ballot305.org</a>';
  const en = {
    'tagline': 'For an informed, engaged Indianapolis',
    'gb.exact.d': 'Look yourself up on the Indiana Voter Portal for your sample ballot, with only the races you&rsquo;ll actually vote on. Save it as a PDF and upload it here.',
    'rc.check.sub': 'Indiana Voter Portal, also where you get your sample ballot &rarr;',
    'print.note': 'Personal research notes prepared with Ballot317. This is not an official ballot. Verify races and names against your official ballot when voting.',
    'foot': foot('Independent voter research tool. Not affiliated with the Marion County Election Board, the Indiana Election Division or any government agency. This is not an official ballot and does not record votes.', 'Made with love by', 'How it works', 'About', 'Corrections'),
    'upload.banner': 'This ballot was read from the PDF you uploaded. Compare it with your official sample ballot from the Indiana Voter Portal.',
    'loc.mdc': 'Elsewhere in Marion County',
    'loc.fl': 'Elsewhere in Indiana',
    'loc.out': 'Outside Indiana',
    'loc.noAgainstLocal': 'This guide doesn&rsquo;t add up outside spending from Indiana filings for state and local races. Any groups found in news coverage are listed under Outside Spending below. Full filings: {src}.',
    'loc.srcState': 'Indiana Election Division',
    'loc.srcCounty': 'Marion County Election Board',
    'loc.notePlace': 'This seat is elected by a district, and addresses are matched to {place} as a whole, not the district. That counts some people who can&rsquo;t vote in this race, and where a district reaches into another county, voters there show as elsewhere in Indiana.',
    'loc.noteGroups': 'Groups (PACs, companies, unions, parties) are placed by the address they filed under, often a treasurer&rsquo;s office, not by where their own donors live. Groups can&rsquo;t vote; this shows where the money sits, not who votes.',
    'og.business': 'A business. Indiana business records list its registered agent and officers.',
    'og.nomatch': 'No federal PAC or IRS nonprofit matched this exact name. It may be an Indiana political committee, a business, or a group known by another name.',
    'og.search.sunbiz': 'Indiana businesses',
    'tag.ownersnot.d': 'A limited liability company (LLC). A donation in a company name does not show who owns it. The Public records link opens Indiana&rsquo;s business search, where its record lists its registered agent and officers.',
    'tag.labortype.d': 'The kind of workers this union represents. Ballot317 does not give labor unions a left or right label.',
    'vb.pre.head': 'Early voting starts Tuesday, Oct 6',
    'vb.pre.sub': 'Downtown at the City-County Building first; eight more vote centers open Oct 24. Any Marion County voter can use any site.',
    'vb.dt.head': 'Early voting is open downtown',
    'vb.dt.sub': 'City-County Building, 200 E. Washington St., through noon Monday, Nov 2. Eight more vote centers open Saturday, Oct 24. Any Marion County voter can use any site. Bring a photo ID.',
    'vb.sat.head': 'Early voting is open at 9 sites',
    'vb.sat.sub': 'Eight township vote centers: 11am to 6pm through Sunday, Nov 1. Downtown at the City-County Building through noon Monday, Nov 2. Any Marion County voter can use any site. Bring a photo ID.',
    'vb.last.head': 'Last day of early voting: downtown until noon',
    'vb.last.sub': 'Only the City-County Building, 200 E. Washington St., is open today, until noon. Bring a photo ID.',
    'vb.btn.sites': 'Sites and hours',
    'vb.btn.find': 'Find a vote center',
    'vb.eve.head': 'Election Day is Tuesday, Nov 3, 6am to 6pm',
    'vb.polls.open': 'Polls are open until 6pm',
    'vb.polls.opens': 'Polls open at 6am today',
    'vb.eday.sub': 'Any Marion County voter can vote at any vote center. If you are in line by 6pm, you can vote. Bring a photo ID.',
    'vb.sourceName': 'Indy Votes (Marion County Election Board)'
  };
  const es = {
    'tagline': 'Por una Indianápolis informada y participativa',
    'gb.exact.d': 'Búsquese en el Portal de Votantes de Indiana para obtener su boleta de muestra, solo con las contiendas en las que realmente votará. Guárdela como PDF y súbala aquí.',
    'rc.check.sub': 'Portal de Votantes de Indiana, también donde obtiene su boleta de muestra &rarr;',
    'print.note': 'Notas personales de investigación preparadas con Ballot317. Esta no es una boleta oficial. Verifique las contiendas y los nombres con su boleta oficial al votar.',
    'foot': foot('Herramienta independiente de investigación para votantes. No está afiliada a la Junta Electoral del Condado de Marion, a la División Electoral de Indiana ni a ninguna agencia gubernamental. Esta no es una boleta oficial y no registra votos.', 'Hecho con amor por', 'Cómo funciona', 'Acerca de', 'Correcciones'),
    'upload.banner': 'Esta boleta se leyó del PDF que usted cargó. Compárela con su boleta de muestra oficial del Portal de Votantes de Indiana.',
    'loc.mdc': 'En otra parte del Condado de Marion',
    'loc.fl': 'En otra parte de Indiana',
    'loc.out': 'Fuera de Indiana',
    'loc.noAgainstLocal': 'Esta guía no suma los gastos externos de los informes de Indiana en las contiendas estatales y locales. Los grupos hallados en la prensa aparecen abajo en Gastos externos. Informes completos: {src}.',
    'loc.srcState': 'División Electoral de Indiana',
    'loc.srcCounty': 'Junta Electoral del Condado de Marion',
    'loc.notePlace': 'Este cargo se elige por distrito y las direcciones se comparan con todo {place}, no con el distrito. Eso cuenta a algunas personas que no pueden votar en esta contienda, y cuando un distrito llega a otro condado, sus votantes aparecen como en otra parte de Indiana.',
    'loc.noteGroups': 'Los grupos (PAC, empresas, sindicatos, partidos) se ubican por la dirección con la que se registraron, a menudo la oficina de un tesorero, no por dónde viven sus donantes. Los grupos no votan; esto muestra dónde está el dinero, no quién vota.',
    'og.business': 'Una empresa. Los registros comerciales de Indiana indican su agente registrado y sus directivos.',
    'og.nomatch': 'Ningún PAC federal ni organización sin fines de lucro del IRS coincide exactamente con este nombre. Puede ser un comité político de Indiana, una empresa o un grupo conocido por otro nombre.',
    'og.search.sunbiz': 'Empresas de Indiana',
    'tag.ownersnot.d': 'Una compañía de responsabilidad limitada (LLC). Una donación a nombre de una compañía no muestra quién es su dueño. El enlace Registros públicos abre la búsqueda de empresas de Indiana, donde su registro indica su agente registrado y sus directivos.',
    'tag.labortype.d': 'El tipo de trabajadores que representa este sindicato. Ballot317 no les asigna a los sindicatos una etiqueta de izquierda o derecha.',
    'vb.pre.head': 'La votación anticipada empieza el martes 6 de octubre',
    'vb.pre.sub': 'Primero en el centro, en el City-County Building; otros ocho centros de votación abren el 24 de octubre. Cualquier votante del Condado de Marion puede usar cualquier centro.',
    'vb.dt.head': 'La votación anticipada está abierta en el centro',
    'vb.dt.sub': 'City-County Building, 200 E. Washington St., hasta el mediodía del lunes 2 de noviembre. Otros ocho centros de votación abren el sábado 24 de octubre. Cualquier votante del Condado de Marion puede usar cualquier centro. Lleve una identificación con foto.',
    'vb.sat.head': 'La votación anticipada está abierta en 9 centros',
    'vb.sat.sub': 'Ocho centros en los municipios: de 11am a 6pm hasta el domingo 1 de noviembre. En el centro, en el City-County Building, hasta el mediodía del lunes 2 de noviembre. Cualquier votante del Condado de Marion puede usar cualquier centro. Lleve una identificación con foto.',
    'vb.last.head': 'Último día de votación anticipada: en el centro hasta el mediodía',
    'vb.last.sub': 'Hoy solo abre el City-County Building, 200 E. Washington St., hasta el mediodía. Lleve una identificación con foto.',
    'vb.btn.sites': 'Centros y horarios',
    'vb.btn.find': 'Encuentre un centro de votación',
    'vb.eve.head': 'El Día de las Elecciones es el martes 3 de noviembre, de 6am a 6pm',
    'vb.polls.open': 'Las urnas están abiertas hasta las 6pm',
    'vb.polls.opens': 'Las urnas abren hoy a las 6am',
    'vb.eday.sub': 'Cualquier votante del Condado de Marion puede votar en cualquier centro de votación. Si está en la fila a las 6pm, puede votar. Lleve una identificación con foto.',
    'vb.sourceName': 'Indy Votes (Junta Electoral del Condado de Marion)'
  };
  return '// Ballot317 (Marion County, Indiana): text that differs from Ballot305. Built by scripts/build-317.mjs.\n' +
    'Object.assign(I18N.en, ' + JSON.stringify(en, null, 1) + ');\n' +
    'Object.assign(I18N.es, ' + JSON.stringify(es, null, 1) + ');\n' +
    'delete I18N.ht;\n';
}

var ABOUT = `
  <h1>About</h1>
  <p class="lede">Ballot317 is a free, independent, nonpartisan voter guide for Marion County, Indiana, built and run by Brit Lawrence (<a href="https://www.instagram.com/realbritty" target="_blank" rel="noopener">@realbritty</a>). It runs on the same code as <a href="https://ballot305.org" target="_blank" rel="noopener">Ballot305</a>, her guide for Miami-Dade County.</p>

  <h2>Who runs it</h2>
  <p>Ballot317 is not affiliated with any candidate, campaign, political party, political committee, or government office, including the Marion County Election Board and the Indiana Election Division. It is not an official ballot and does not record votes.</p>

  <h2>Who pays for it</h2>
  <p>Ballot317 is paid for by its creator. It takes no money from candidates, campaigns, parties, or political committees. The running costs are web hosting and the AI service used for research.</p>

  <h2>Where the information comes from</h2>
  <p>Donor figures come from public filings with the Federal Election Commission and the Indiana Election Division. County, township, judicial and school board candidates file paper or PDF reports with the Marion County Election Board, so donors for those races come from news coverage and web research, and the page links the county&rsquo;s reports. Endorsements, ratings, and background come from AI-assisted research of public web sources, linked on each page. <a href="/methodology">How it works</a> explains the rules, including what the tool can get wrong.</p>
  <p>Donor names come from public records. They are shown to inform voters and may not be used to solicit contributions or for any commercial purpose. Federal law restricts that use of FEC contributor information.</p>

  <h2>Corrections</h2>
  <p>Every candidate and measure page has a <strong>Report a problem with this page</strong> link at the bottom. Reports go straight to the site owner. We review reports within 24 hours and take down anything false while we correct it.</p>
  <p>Candidates, campaigns, and anyone named on the site can also write to <a href="mailto:corrections@ballot305.org">corrections@ballot305.org</a>.</p>

  <h2>Privacy</h2>
  <p>Ballot317 has no accounts and no ads. Your ballot plan is saved only in the browser on your own device. On a shared computer, use <strong>Forget everything on this device</strong> under your saved ballot plans when you're done. The site does not collect your name or address. If you send a problem report, it keeps what you wrote, and contact details only if you give them, for 90 days.</p>

  <h2>Open source</h2>
  <p>All of the code is public on <a href="https://github.com/Brittybrit/vote-informed" target="_blank" rel="noopener">GitHub</a> under the MIT license.</p>
`;

var METHOD = `
  <h1>How it works</h1>
  <p class="lede">Upload the sample ballot for your precinct and Ballot317 turns it into a list of every race and question on it. Tap a candidate to see who funds them and who endorses them, with a link for every claim.</p>

  <h2>Your ballot</h2>
  <p>Marion County publishes one sample ballot per precinct. Find yours on the <a href="https://indianavoters.in.gov/" target="_blank" rel="noopener">Indiana Voter Portal</a>, save it as a PDF and upload it. The races are read from the PDF by AI, so compare them with your official sample ballot. Your picks stay in your own browser.</p>

  <h2>Who funds each candidate</h2>
  <dl>
    <dt><strong>Congress</strong></dt>
    <dd>Itemized contributions from the Federal Election Commission, refreshed daily, plus outside groups&rsquo; spending reported to the FEC.</dd>
    <dt><strong>Secretary of State, Comptroller, Treasurer, Indiana Senate and House</strong></dt>
    <dd>Contributions reported to the Indiana Election Division in 2025 and 2026, from its public data downloads. The page says which reports are included and through what date. Indiana sets no limit on gifts from individuals to state candidates, so large single gifts are normal here and are shown as given.</dd>
    <dt><strong>Prosecutor, sheriff, other county offices, township offices, judges and school boards</strong></dt>
    <dd>These candidates file with the Marion County Election Board, which posts the reports as PDF files, some handwritten. Until the county publishes them as data, the donors shown for these races come from news coverage and web research, and each one links to its source. The county&rsquo;s reports are at <a href="https://www.indy.gov/workflow/search-campaign-finance-records" target="_blank" rel="noopener">indy.gov</a>.</dd>
  </dl>
  <p>Only money for this election cycle (2025 and 2026) is shown.</p>

  <h2>How local is the money</h2>
  <p>Each giver is placed by the address on the filing: in the area that votes for the office, elsewhere in Marion County, elsewhere in Indiana, or outside Indiana. Marion County is matched by ZIP code, and a few ZIP codes on the county line reach into neighboring counties, so the split is approximate. Legislative districts are matched to Marion County as a whole, not the district. Groups are placed by the address they filed under, which shows where the money sits, not who votes.</p>

  <h2>Endorsements and ratings</h2>
  <p>Endorsements are listed only when a group or person explicitly backs the candidate in this election, with a link. Groups urging a vote against a candidate are listed separately. Ratings (bar polls, qualification ratings, scorecards) are shown only when the rating appears on the rating group&rsquo;s own website. Labor unions are labeled by the kind of workers they represent, not left or right. Judicial candidates are also checked for ties to the Federalist Society, with the evidence shown.</p>

  <h2>What it can get wrong</h2>
  <p>Background, endorsements and donors for county races come from AI-assisted web research. Every item links to its source; links the research did not actually find are removed. Research can still miss things or attach something to the wrong person with the same name, so check the sources, and use <strong>Report a problem with this page</strong> if something is wrong. Spanish text is machine-translated.</p>
`;

// About and How it works: Ballot305's page shell (styles), Ballot317 content
const about = fs.readFileSync(path.join(SRC, 'about.html'), 'utf8');
const shell = about.slice(0, about.indexOf('<body>'))
  .replace(/<title>[^<]*<\/title>/, '<title>{{TITLE}} · BALLOT317</title>')
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="{{DESC}}">');
if (!shell.includes('{{TITLE}}') || !shell.includes('{{DESC}}')) throw new Error('build-317: about.html head changed');
const page = (title, desc, body) => shell.replace('{{TITLE}}', title).replace('{{DESC}}', desc) +
  '<body>\n<header><a href="/">Ballot317</a></header>\n<main>\n' + body.trim() + '\n</main>\n' +
  '<footer><a href="/">Back to Ballot317</a> &middot; <a href="/methodology">How it works</a> &middot; <a href="/about">About</a></footer>\n</body>\n</html>\n';
fs.writeFileSync(path.join(OUT, 'about.html'), page('About', 'Who runs Ballot317, who pays for it, where its information comes from, and how to get a correction.', ABOUT));
fs.writeFileSync(path.join(OUT, 'methodology.html'), page('How it works', 'Where Ballot317 gets donor, endorsement and background information for Marion County, Indiana races, and what it can get wrong.', METHOD));
console.log('public-317/about.html and methodology.html built');
