"""Extract State Board of Administration fiscal determinations for Florida Housing Finance Corporation multifamily bonds from the
Governor and Cabinet transcripts (raw/cabinet/<date>_transcript.txt, or .ocr.txt for scanned 2019 transcripts).
Each: date, item, amount, project (as read into the record), units/county text, seconds, objection, raw text. -> raw/cabinet/sba-fhfc.json"""
import json, os, re, glob
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(HERE, 'raw', 'cabinet')
def clean(t):
    t = re.sub(r'www\.phippsreporting\.com.*?\n', '', t); t = t.replace('·', ' ')
    t = re.sub(r'\n\s*\d{1,2}\s', ' ', t); t = re.sub(r'(C & N REPORTERS 850-697-8314|APEX REPORTING, INC\. TALLAHASSEE, FLORIDA 850-597-5185|\(888\) ?811-3408( YVer1f)?|CAPITAL CITY COURT REPORTERS capitalcitycourtreporters@gmail\.com 850\.459\.1323|Veritext Legal Solutions 800-726-7007 305-376-8800|P&T STENOGRAPHIC SERVICES, INC\. CABINET MEETING - [\d/]+ \d+)', ' ', t)
    return re.sub(r'\s+', ' ', t)
out = []
files = {}
for f in glob.glob(os.path.join(D, '*_transcript.txt')) + glob.glob(os.path.join(D, '*_transcript.ocr.txt')):
    d = os.path.basename(f)[:10]
    if f.endswith('.ocr.txt') or os.path.getsize(f) > 2000: files[d] = f
for d, f in sorted(files.items()):
    if not ('2019-01-08' <= d <= '2025-01-21'): continue
    t = clean(open(f, encoding='utf-8', errors='replace').read())
    s = t.find('proceedings began'); s = s if s > 0 else 0
    body = t[s:]
    for m in re.finditer(r'Florida Housing Finance', body, re.I):
        pre = body[max(0, m.start() - 600):m.start()]
        im = list(re.finditer(r'Items? (\w+)', pre))
        item = im[-1].group(1) if im else None
        post = body[m.start():m.start() + 1400]
        end = re.search(r'motion carries|carries\.|That carries|It\'s approved', post, re.I)
        seg = post[:end.end()] if end else post[:700]
        amt = re.search(r'\$\s?([\d,.]+)(\s*(million|billion))?|([\d,]{6,})', pre[-250:] + ' ' + seg[:200])
        proj = None
        for pat in [r'\(([A-Z][^)]{3,60})\)\.?', r'This is (?:the )?([A-Z][A-Za-z0-9\'&. -]{2,60}?)(?: project|,| in | new| \d)', r'designated,? ([A-Z][A-Za-z0-9\' &.-]{2,60}?)[.,]', r'Series 20\d\d\.? ([A-Z][A-Za-z0-9\' &.-]{2,60}?) (?:project|in)', r'\d{4}\. ([A-Z][A-Za-z\' &.-]{2,60}?) project']:
            pm = re.search(pat, seg)
            if pm and not re.match(r'(This|Request|Florida|Multi|SBA|State|Series|Item|new|acquisition)', pm.group(1)): proj = pm.group(1).strip(' .,'); break
        if 'Homeowner' in seg[:300] or 'Homeowner' in pre[-200:]: proj = proj or 'Homeowner Mortgage Revenue Bonds (single-family pool)'
        seconds = re.findall(r'(GOVERNOR DESANTIS|ATTORNEY GENERAL MOODY|MS\. MOODY|COMMISSIONER MOODY|CFO PATRONIS|MR\. PATRONIS|CHIEF FINANCIAL OFFICER PATRONIS|COMMISSIONER PATRONIS|CFP PATRONIS|COMMISSIONER FRIED|MS\. FRIED|COMMISSIONER SIMPSON): (?:I )?[Ss]econd', seg)
        obj = re.search(r'[Oo]bjection\.(?! the)|I object|One objection', seg)
        out.append({'date': d, 'item': item, 'amountText': amt.group(0) if amt else None, 'project': proj,
                    'seconds': sorted(set(seconds)), 'objectionNoted': bool(obj), 'text': seg[:900], 'transcript': os.path.basename(f)})
# de-duplicate repeated mentions within one item
ded = []
for o in out:
    if ded and ded[-1]['date'] == o['date'] and o['text'][:120] in ded[-1]['text']: continue
    if ded and ded[-1]['date'] == o['date'] and ded[-1]['text'][:300] == o['text'][:300]: continue
    ded.append(o)
json.dump(ded, open(os.path.join(D, 'sba-fhfc.json'), 'w'), indent=1)
print(len(ded)); [print(o['date'], o['item'], o['amountText'], '|', o['project'], '|', o['seconds'], o['objectionNoted']) for o in ded]
