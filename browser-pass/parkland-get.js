window.__b305get = async (url) => {
  const H = { 'Content-Type': 'application/json' }, repo = 'Parkland';
  const id = +new URL(url).searchParams.get('id');
  const info = (await (await fetch('/WebLink/DocumentService.aspx/GetBasicDocumentInfo', { method: 'POST', headers: H, body: JSON.stringify({ repoName: repo, entryId: id }) })).json()).data || {};
  if (!info.hasImagedPages && info.edocUrl) { const r = await fetch(info.edocUrl); return { ok: r.ok, status: r.status, ct: r.headers.get('content-type') || '', b: new Uint8Array(await r.arrayBuffer()) }; }
  const n = info.pageCount || 1;
  const tok = (await (await fetch(`/WebLink/GeneratePDF10.aspx?key=${id}&PageRange=1%20-%20${n}&Watermark=0&repo=${repo}`, { method: 'POST', headers: H, body: '{}' })).text()).split(/\r?\n/)[0].trim();
  for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 1500)); const t = await (await fetch('/WebLink/DocumentService.aspx/PDFTransition', { method: 'POST', headers: H, body: JSON.stringify({ Key: tok }) })).json(); if (t.data && t.data.finished) break; }
  const r = await fetch(`/WebLink/PDF10/${tok}/${id}`);
  return { ok: r.ok, status: r.status, ct: 'application/pdf', b: new Uint8Array(await r.arrayBuffer()) };
};
'parkland getter set';
