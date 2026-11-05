// Post-election thank-you popup (Nov 2026). Shown once per browser on every public page.
// Collects an email for "the next Miami-Dade ballots are loaded" notices (POST /api/notify-signup,
// stored in KV under notify-signup:<email>; export from /admin.html) and links the WhatsApp community.
// Self-contained: its own styles and strings, so pages only need <script src="/thank-you-popup.js" defer>.
(function(){
  var SEEN_KEY = 'ballot305.thankYouPopup2026.seen';
  var WTP_URL = 'https://wethepeople305.org';
  var WHATSAPP_URL = 'https://chat.whatsapp.com/KwOrWIfEqdsIZqMFfV3Ict';

  try { if (localStorage.getItem(SEEN_KEY)) return; } catch(e) {}
  if (/[?&]nopopup\b/.test(location.search)) return;

  var STR = {
    en: {
      title: 'Thank you, Miami!',
      body: 'Election Day 2026 was amazing, but we are not done. Stay engaged and informed day to day at {wtp}.',
      ask: 'Want to be notified when the next Miami-Dade ballots are loaded on Ballot305.org? Share your email:',
      ph: 'you@example.com', label: 'Email address', send: 'Notify me', sending: 'Saving…',
      done: 'You\'re on the list. We\'ll email you when the next ballots are loaded.',
      bad: 'Enter a valid email address.', err: 'That didn\'t go through. Try again in a minute.',
      privacy: 'We only use your email to tell you when new ballots are loaded.',
      wa: 'Join our WhatsApp', later: 'Maybe later', close: 'Close'
    },
    es: {
      title: '¡Gracias, Miami!',
      body: 'El Día de las Elecciones 2026 fue increíble, pero no hemos terminado. Manténgase informado y participe día a día en {wtp}.',
      ask: '¿Quiere que le avisemos cuando se carguen las próximas boletas de Miami-Dade en Ballot305.org? Comparta su correo electrónico:',
      ph: 'usted@ejemplo.com', label: 'Correo electrónico', send: 'Avísenme', sending: 'Guardando…',
      done: 'Ya está en la lista. Le escribiremos cuando se carguen las próximas boletas.',
      bad: 'Escriba un correo electrónico válido.', err: 'No se pudo guardar. Inténtelo de nuevo en un minuto.',
      privacy: 'Solo usamos su correo para avisarle cuando se carguen nuevas boletas.',
      wa: 'Únase a nuestro WhatsApp', later: 'Ahora no', close: 'Cerrar'
    },
    ht: {
      title: 'Mèsi, Miami!',
      body: 'Jou Eleksyon 2026 la te fantastik, men nou poko fini. Rete angaje e enfòme chak jou sou {wtp}.',
      ask: 'Ou vle nou fè w konnen lè pwochen bilten vòt Miami-Dade yo chaje sou Ballot305.org? Pataje imèl ou:',
      ph: 'ou@egzanp.com', label: 'Adrès imèl', send: 'Fè m konnen', sending: 'N ap anrejistre…',
      done: 'Ou sou lis la. N ap voye yon imèl ba ou lè pwochen bilten yo chaje.',
      bad: 'Antre yon adrès imèl ki valab.', err: 'Sa pa t pase. Eseye ankò nan yon minit.',
      privacy: 'Nou sèlman itilize imèl ou pou fè w konnen lè nouvo bilten yo chaje.',
      wa: 'Antre nan WhatsApp nou an', later: 'Pita', close: 'Fèmen'
    }
  };
  var lang = null;   // same choice the site uses: saved language first, then the browser's
  try { var saved = localStorage.getItem('ballot305.lang'); if (STR[saved]) lang = saved; } catch(e) {}
  if (!lang) { var n = (navigator.language || '').toLowerCase(); lang = n.indexOf('es') === 0 ? 'es' : n.indexOf('ht') === 0 ? 'ht' : 'en'; }
  var T = STR[lang];
  function esc(x){ return String(x).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  var css = '' +
    '.ty305-back{position:fixed; inset:0; z-index:1000; background:rgba(19,31,60,.55); display:flex; align-items:center; justify-content:center; padding:16px; animation:ty305in .25s ease-out;}' +
    '@keyframes ty305in{from{opacity:0;} to{opacity:1;}}' +
    '.ty305{position:relative; width:min(460px,100%); max-height:calc(100vh - 32px); overflow:auto; background:#FAFAF7; color:#131F3C; border:2px solid #131F3C; box-shadow:6px 6px 0 #131F3C; padding:26px 22px 20px; font-family:"Libre Franklin","Franklin Gothic Medium",Arial,sans-serif; text-align:left;}' +
    '.ty305 h2{font-size:28px; line-height:1.1; font-weight:900; letter-spacing:-.01em; margin:0 34px 12px 0;}' +
    '.ty305 p{font-size:15px; line-height:1.5; margin:0 0 14px;}' +
    '.ty305 a{color:#1D4ED8; font-weight:600;}' +
    '.ty305 .ty305-x{position:absolute; top:10px; right:10px; width:38px; height:38px; border:0; background:transparent; font-size:26px; line-height:1; color:#131F3C; cursor:pointer;}' +
    '.ty305 form{display:flex; gap:8px; flex-wrap:wrap; margin:0 0 6px;}' +
    '.ty305 input[type=email]{flex:1 1 200px; min-width:0; min-height:46px; padding:0 12px; border:1.5px solid #131F3C; background:#fff; color:#131F3C; font:16px "Libre Franklin",Arial,sans-serif;}' +
    '.ty305 .ty305-go{min-height:46px; padding:0 16px; border:0; background:#131F3C; color:#FAFAF7; font:800 14px "Libre Franklin",Arial,sans-serif; text-transform:uppercase; letter-spacing:.02em; cursor:pointer;}' +
    '.ty305 .ty305-go:disabled{opacity:.6; cursor:default;}' +
    '.ty305 .ty305-msg{font-size:14px; min-height:20px; margin:0 0 4px;}' +
    '.ty305 .ty305-msg.ok{color:#2F6B3C; font-weight:600;}' +
    '.ty305 .ty305-msg.no{color:#9B2C1F;}' +
    '.ty305 .ty305-fine{font-size:12px; color:#3D4763; margin:0 0 16px;}' +
    '.ty305 .ty305-wa{display:flex; align-items:center; justify-content:center; gap:8px; min-height:46px; border:1.5px solid #131F3C; color:#131F3C; text-decoration:none; font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:.02em; margin:0 0 10px;}' +
    '.ty305 .ty305-wa svg{width:20px; height:20px; fill:#2F6B3C;}' +
    '.ty305 .ty305-later{display:block; width:100%; min-height:40px; border:0; background:transparent; color:#3D4763; font:600 14px "Libre Franklin",Arial,sans-serif; text-decoration:underline; cursor:pointer;}' +
    '.ty305 .ty305-hp{position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden;}' +
    'body.ty305-open .coach{display:none!important;}' +   /* the menu tip waits until the popup closes */
    '.ty305 :focus-visible{outline:3px solid #1D4ED8; outline-offset:2px;}' +
    '@media (prefers-reduced-motion: reduce){.ty305-back{animation:none;}}';

  var waIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z"/></svg>';

  function show(){
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var lastFocus = document.activeElement;
    var back = document.createElement('div'); back.className = 'ty305-back';
    back.innerHTML =
      '<div class="ty305" role="dialog" aria-modal="true" aria-labelledby="ty305t">' +
        '<button type="button" class="ty305-x" aria-label="' + esc(T.close) + '">&times;</button>' +
        '<h2 id="ty305t">' + esc(T.title) + '</h2>' +
        '<p>' + esc(T.body).replace('{wtp}', '<a href="' + WTP_URL + '" target="_blank" rel="noopener">WeThePeople305.org</a>') + '</p>' +
        '<p id="ty305ask">' + esc(T.ask) + '</p>' +
        '<form novalidate>' +
          '<input type="email" name="email" autocomplete="email" inputmode="email" required aria-label="' + esc(T.label) + '" aria-describedby="ty305ask" placeholder="' + esc(T.ph) + '">' +
          '<label class="ty305-hp" aria-hidden="true">Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label>' +
          '<button type="submit" class="ty305-go">' + esc(T.send) + '</button>' +
        '</form>' +
        '<p class="ty305-msg" role="status" aria-live="polite"></p>' +
        '<p class="ty305-fine">' + esc(T.privacy) + '</p>' +
        '<a class="ty305-wa" href="' + WHATSAPP_URL + '" target="_blank" rel="noopener">' + waIcon + esc(T.wa) + '</a>' +
        '<button type="button" class="ty305-later">' + esc(T.later) + '</button>' +
      '</div>';
    document.body.appendChild(back);
    document.body.classList.add('ty305-open');
    var box = back.querySelector('.ty305'), form = back.querySelector('form'), input = form.querySelector('input[type=email]'),
        go = form.querySelector('.ty305-go'), msg = back.querySelector('.ty305-msg');

    function close(){
      try { localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch(e) {}
      document.removeEventListener('keydown', onKey, true);
      back.remove();
      document.body.classList.remove('ty305-open');
      if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch(e) {}
    }
    function onKey(e){
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = box.querySelectorAll('a[href],button:not([disabled]),input:not([tabindex="-1"]):not([disabled])');
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey, true);
    back.addEventListener('click', function(e){ if (e.target === back) close(); });
    back.querySelector('.ty305-x').addEventListener('click', close);
    back.querySelector('.ty305-later').addEventListener('click', close);
    back.querySelector('.ty305-wa').addEventListener('click', function(){ try { localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch(e) {} });

    form.addEventListener('submit', async function(e){
      e.preventDefault();
      var email = input.value.trim();
      msg.className = 'ty305-msg';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.className = 'ty305-msg no'; msg.textContent = T.bad; input.focus(); return; }
      go.disabled = true; go.textContent = T.sending; msg.textContent = '';
      try {
        var r = await fetch('/api/notify-signup', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, lang: lang, website: form.website.value }) });
        if (!r.ok) {
          var d = await r.json().catch(function(){ return {}; });
          throw new Error(r.status === 400 ? T.bad : (lang === 'en' && d.error) || T.err);
        }
        try { localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch(e2) {}
        form.style.display = 'none';
        msg.className = 'ty305-msg ok'; msg.textContent = T.done;
        back.querySelector('.ty305-later').textContent = T.close;
      } catch(err) {
        msg.className = 'ty305-msg no'; msg.textContent = err.message || T.err;
        go.disabled = false; go.textContent = T.send;
      }
    });
    setTimeout(function(){ input.focus(); }, 50);
  }

  function start(){ setTimeout(show, 600); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
