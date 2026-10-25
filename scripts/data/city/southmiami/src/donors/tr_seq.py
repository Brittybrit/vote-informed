# split DS-DE 13 itemized contribution pages (pdftotext -layout, or tesseract text) into entries by the
# sequence numbers the form prints; draft name/amount/date for hand review
import re,sys,json
D=re.compile(r'(\d{2})\s*[,/|;1I{]\s*(\d{1,2})\s*[,/|;1I{)]?\s*(?:20\s?2\s?\d|202[,~:]?|20 22|2022)?')
ADDR=re.compile(r'\b(FL|NY|DC|GA|CO|MD|NJ|CA|TX|VA)\b\s*,?\s*\d{3}|\bFL\s*\d{5}|\d{5}\s*$')
def amount(s):
    m=re.search(r'\$\s?(\d[\d ,]*\.\s?\d\s?\d)',s)
    if m: return float(re.sub(r'[ ,]','',m.group(1)))
    m=re.search(r'\$\s?(\d{3,5})\b',s)
    if m: v=float(m.group(1)); return v/100 if v>=1000 else v
    m=re.search(r'(?<![\d.])5(\d{2,3}\.\d\d)\b',s)
    if m: return float(m.group(1))
    return None
def parse(text):
    pages=[p for p in re.split(r'\f|=====PAGE',text) if 'ITEMIZED CONTRIBUTIONS' in p.upper()]
    ents=[];exp=1;cur=[]
    for p in pages:
        m=re.search(r'Amendm\S*\s+Amou\S*',p) or re.search(r'Number\s+Cit\S+, State',p)
        body=p[m.end():] if m else p
        body=re.split(r'[OD]S\s?.?\s?[DO]E\s?13',body)[0]
        for l in body.split('\n'):
            if not l.strip(): continue
            mm=re.match(r'^\s*(\d{1,3})(?:\s{2,}|\s*$)',l)
            cur.append(l)
            if mm and int(mm.group(1))==exp:
                ents.append(cur); cur=[]; exp+=1
        # leftover lines before page end carry to the next entry (names printed above the date)
    if any(x.strip() for x in cur): ents.append(cur)
    out=[]
    for n,e in enumerate(ents,1):
        s=' '.join(e)
        di=next((i for i,l in enumerate(e) if D.match(l.strip()) and re.search(r'20\s?2|202|\d{2}\s*[,/|;1I]\s*\d{1,2}\s*[,/|;1I]',l[:40])),None)
        date=None;name=''
        if di is not None:
            l=e[di].strip(); d=D.match(l); date=(d.group(1),d.group(2).zfill(2))
            rest=re.split(r'\s{2,}|\$',l[d.end():].strip())[0].strip(' ,)|')
            pre=[x.strip() for x in e[:di] if x.strip() and not ADDR.search(x) and not re.match(r'^\d',x.strip())]
            name=' '.join(pre+([rest] if rest and not re.fullmatch(r'[IBO]|PC',rest) else []))
        out.append({'seq':n,'date':date,'name':re.sub(r'\s+',' ',name).strip(),'amount':amount(s),'raw':re.sub(r'\s+',' ',s)[:240]})
    return out
if __name__=='__main__':
    rows=parse(open(sys.argv[1],errors='replace').read())
    for r in rows: print('%d|%s|%s|%s|| %s'%(r['seq'],'-'.join(r['date']) if r['date'] else '??',r['name'],r['amount'],r['raw'][:150]))
    print('SUM',sum(r['amount'] or 0 for r in rows),'N',len(rows),'missing amt',[r['seq'] for r in rows if r['amount'] is None])
