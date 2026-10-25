"""Download each Board of Trustees CERTIFICATION (and TRANSCRIPT) from DEP BTLDS and OCR it.
Usage: python3 -I ocr_certs.py <workdir> [CERTIFICATION|TRANSCRIPT] [maxpages]
Writes raw/cert-ocr/<dmid>.txt in the prior-statewide folder (text only; PDFs deleted after OCR)."""
import json, os, subprocess, sys, concurrent.futures as cf
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
work = sys.argv[1]; kind = sys.argv[2] if len(sys.argv) > 2 else 'CERTIFICATION'; maxp = int(sys.argv[3]) if len(sys.argv) > 3 else 3
OUT = os.path.join(HERE, 'raw', 'cert-ocr' if kind == 'CERTIFICATION' else 'transcript-ocr'); os.makedirs(OUT, exist_ok=True)
idx = json.load(open(os.path.join(HERE, 'raw', 'btlds-index-2019-2025.json')))
ids = sorted({r['documentManagementId'] for r in idx if r['agendaSubTypeName'] == kind and '2019-01-08' <= r['agendaDate'][:10] <= '2025-01-21'})
URL = 'https://prodenv.dep.state.fl.us/DslBtlds/public/piDownloadDocument?documentManagementID='
def one(i):
    dst = os.path.join(OUT, i + '.txt')
    if os.path.exists(dst) and os.path.getsize(dst) > 200: return i, 'skip'
    pdf = os.path.join(work, i + '.pdf')
    for _ in range(3):
        r = subprocess.run(['curl', '-s', '-m', '300', URL + i, '-o', pdf])
        if os.path.exists(pdf) and os.path.getsize(pdf) > 1000: break
    else: return i, 'dl-fail'
    txt = []
    try:
        n = int([l for l in subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout.splitlines() if l.startswith('Pages')][0].split()[-1])
    except Exception: n = maxp
    last = n if maxp == 0 else min(n, maxp)
    pre = os.path.join(work, 'p' + i)
    subprocess.run(['pdftoppm', '-r', '200', '-gray', '-f', '1', '-l', str(last), pdf, pre])
    for f in sorted(x for x in os.listdir(work) if x.startswith('p' + i + '-')):
        t = subprocess.run(['tesseract', os.path.join(work, f), '-'], capture_output=True, text=True).stdout
        txt.append('=== PAGE ' + f.rsplit('-', 1)[1].split('.')[0] + ' ===\n' + t); os.remove(os.path.join(work, f))
    open(dst, 'w').write(f'# dmid {i} pages {n}\n' + '\n'.join(txt))
    os.remove(pdf)
    return i, 'ok'
with cf.ThreadPoolExecutor(3) as ex:
    for i, s in ex.map(one, ids): print(i, s, flush=True)
