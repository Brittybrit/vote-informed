// Ballot305 browser pass: fetch each listed document from this site's own origin, bundle as inbox tar.gz parts, download.
(function () {
  if (window.__b305 && window.__b305.running) return 'already running';
  const HOST = location.hostname;
  const LIST = 'https://raw.githubusercontent.com/Brittybrit/vote-informed/sources-archive/browser-pass/' + (window.__b305host || HOST) + '.tsv';
  const DAY = new Date().toISOString().slice(0, 10);
  const CAP = 85 * 1024 * 1024, DELAY = 1500;
  const prev = window.__b305 && window.__b305.parts ? window.__b305.parts.length + (window.__b305.partBase || 0) : 0;
  const S = window.__b305 = { partBase: prev, running: true, host: HOST, done: 0, ok: 0, fail: [], total: 0, parts: [], bytes: 0, started: Date.now() };
  const enc = new TextEncoder();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const ext = ct => /pdf/.test(ct) ? 'pdf' : /html/.test(ct) ? 'html' : /json/.test(ct) ? 'json' : /xml/.test(ct) ? 'xml' : /spreadsheet|excel/.test(ct) ? 'xlsx' : 'bin';
  function header(name, size) {
    const h = new Uint8Array(512);
    const put = (s, off, len) => { const b = enc.encode(s); h.set(b.subarray(0, len), off); };
    const oct = (n, len) => n.toString(8).padStart(len - 1, '0') + '\0';
    put(name, 0, 100); put(oct(0o644, 8), 100, 8); put(oct(0, 8), 108, 8); put(oct(0, 8), 116, 8);
    put(oct(size, 12), 124, 12); put(oct(Math.floor(Date.now() / 1000), 12), 136, 12);
    put('        ', 148, 8); put('0', 156, 1); put('ustar\u000000', 257, 8);
    let sum = 0; for (const b of h) sum += b; put(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
    return h;
  }
  let files = [], size = 0;
  const add = (name, data) => { files.push(header(name, data.byteLength), data); const pad = (512 - data.byteLength % 512) % 512; if (pad) files.push(new Uint8Array(pad)); size += 512 + data.byteLength + pad; };
  async function flush() {
    if (!files.length) return;
    files.push(new Uint8Array(1024));
    const gz = new Blob(files).stream().pipeThrough(new CompressionStream('gzip'));
    const blob = await new Response(gz).blob();
    const n = String(S.partBase + S.parts.length).padStart(2, '0');
    const name = `${DAY}-browser-${HOST}-${n}.tar.gz.part-00`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    S.parts.push({ name, bytes: blob.size }); files = []; size = 0;
    await sleep(3000);
  }
  (async () => {
    try {
      const rows = window.__b305rows || (await (await fetch(LIST)).text()).split('\n').filter(Boolean).map(l => l.split('\t'));
      const fix = window.__b305fix || (u => u);
      S.total = rows.length;
      for (const [id, url] of rows) {
        try {
          const g = window.__b305get ? await window.__b305get(fix(url)) : await (async () => { const r = await fetch(fix(url), { credentials: 'include' }); return { ok: r.ok, status: r.status, ct: r.headers.get('content-type') || '', b: new Uint8Array(await r.arrayBuffer()) }; })();
          const r = { ok: g.ok, status: g.status }, ct = g.ct, b = g.b;
          const head = new TextDecoder().decode(b.slice(0, 600)).toLowerCase();
          if (!r.ok || b.byteLength < 200 || /captcha|access denied|request unsuccessful|cf-chl/.test(head)) throw new Error(r.status + ' ' + b.byteLength);
          if (size + b.byteLength > CAP) await flush();
          const x = ext(ct);
          add(`inbox/${id}.${x}`, b);
          add(`inbox/${id}.json`, enc.encode(JSON.stringify({ url, read: DAY, how: 'browser pass from ' + HOST + ' (Brit\'s desktop browser), content-type ' + ct + ', ' + b.byteLength + ' bytes, status ' + r.status })));
          S.ok++; S.bytes += b.byteLength;
        } catch (e) { S.fail.push([id, url, String(e.message || e)]); }
        S.done++;
        await sleep(DELAY);
      }
      await flush();
    } catch (e) { S.error = String(e.message || e); }
    S.running = false; S.finished = Date.now();
  })();
  return 'started ' + HOST;
})()
