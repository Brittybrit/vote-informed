import re,html,json,sys,os
BASE='/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/pc/'
def clean(s):
    s=re.sub(r'<br\s*/?>','\n',s,flags=re.I)
    s=re.sub(r'<[^>]+>',' ',s); s=html.unescape(s)
    s=s.replace('\xef\xbf\xbd',"'").replace('ï¿½',"'").replace('�',"'")
    s=re.sub(r'[ \t\r\xa0]+',' ',s)
    s=re.sub(r' *\n[ \n]*','\n',s)
    return s.strip()
def header(t):
    h={}
    for k in ['Members Present','Members Absent','Members Late','Members Excused','Members Absent County Business']:
        m=re.search(re.escape(k)+r':\s*</[^>]*>(.*?)(?=Members |<td colspan|\n\s*1[A-Z ])',t,re.S)
        if not m:
            m=re.search(re.escape(k)+r':(.*?)(?=Members |</table)',t,re.S)
        v=clean(m.group(1)) if m else None
        h[k]=[x.strip() for x in v.split(';') if x.strip() and x.strip()!='None'] if v else []
    return h
def parse(mid):
    t=open(BASE+f'min/{mid}.html',encoding='latin-1').read()
    top=clean(t[:t.find('Members Present')]) if 'Members Present' in t else ''
    title=''
    m=re.search(r'Miami-Dade ([^\n]*?Minutes)',top); title=m.group(1) if m else ''
    status='FINAL OFFICIAL' if 'FINAL OFFICIAL' in top else ('DRAFT' if 'DRAFT' in top else '')
    # attendance block: text between Members Present and first item
    ti=clean(t)
    a=ti.find('Members Present:')
    att={}
    if a>=0:
        blk=ti[a:a+3000]
        for k in ['Members Present','Members Absent','Members Late','Members Excused','Members Absent County Business']:
            m=re.search(r'(?:^|\n)'+re.escape(k)+r':\s*\n?(.*?)\n',blk)
            v=m.group(1).strip() if m else ''
            att[k]=[x.strip() for x in v.split(';') if x.strip() and x.strip()!='None']
    # items
    anchors=[m for m in re.finditer(r'documentKey=(\d+)',t)]
    items=[]
    for n,m in enumerate(anchors):
        start=m.start(); end=anchors[n+1].start() if n+1<len(anchors) else len(t)
        # label: last colspan=4 strong before start
        pre=t[max(0,start-1500):start]
        lm=list(re.finditer(r'<td colspan="4"><font[^>]*><strong>\s*([^<]*?)\s*</font>',pre))
        label=lm[-1].group(1).strip() if lm else ''
        seg=t[start:end]
        # trim at next label row
        nl=seg.find('<td colspan="4"><font')
        segi=seg[:nl] if nl>0 else seg
        # header row cells up to '</tr>'
        hr=segi[:segi.find('</tr>')]
        cells=[clean(c) for c in re.findall(r'<td[^>]*>(.*?)(?=<td|</tr>|$)',hr,re.S)]
        typ=''
        mt=re.search(r'target="_blank">\d+\s*</a>.*?<td width="350"><font[^>]*><strong>\s*([^<&]*)',hr,re.S)
        if mt: typ=mt.group(1).strip()
        spons=[]
        for c in re.findall(r'<td width="(?:250|150)"><font[^>]*><strong>(.*?)</font>',hr,re.S):
            v=clean(c)
            if v: spons+= [x.strip() for x in v.split('\n') if x.strip()]
        rest=segi[segi.find('</tr>'):]
        tm=re.search(r'<td colspan="3" valign="top"><font[^>]*>(.*?)</font></td>',rest,re.S)
        ttl=clean(tm.group(1)) if tm else ''
        rm=re.search(r'<td width="250" valign="top"><font[^>]*>(.*?)</td>',rest,re.S)
        res=clean(rm.group(1)) if rm else ''
        rp=re.search(r'<strong>REPORT: </strong>(.*?)</td>',rest,re.S)
        rep=clean(rp.group(1)) if rp else ''
        hist=[]
        for hm in re.finditer(r'<strong>(\d+/\d+/\d{4})</strong>\s*<font[^>]*><em>(.*?)</em>',rest,re.S):
            hist.append([hm.group(1),clean(hm.group(2))])
        items.append({'id':m.group(1),'label':label,'type':typ,'sponsors':spons,'title':ttl,'result':res,'report':rep,'hist':hist})
    return {'meetId':mid,'title':title,'status':status,'att':att,'items':items}
if __name__=='__main__':
    os.makedirs(BASE+'parsed',exist_ok=True)
    for l in open(BASE+'meetings.tsv'):
        d,i,b,r=(l.rstrip('\n').split('\t')+[''])[:4]
        if not os.path.exists(BASE+f'min/{i}.html') or os.path.getsize(BASE+f'min/{i}.html')<1000: continue
        if os.path.exists(BASE+f'parsed/{i}.json') and len(sys.argv)<2: continue
        p=parse(i); p.update(date=d,list=b,listStatus=r)
        json.dump(p,open(BASE+f'parsed/{i}.json','w'))
