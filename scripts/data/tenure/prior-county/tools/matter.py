import re,html
def clean(s):
    s=re.sub(r'<br\s*/?>','\n',s,flags=re.I); s=re.sub(r'<[^>]+>',' ',s); s=html.unescape(s)
    s=s.replace('ï¿½',"'").replace('�',"'"); s=re.sub(r'[ \t\r\xa0]+',' ',s); s=re.sub(r' *\n[ \n]*','\n',s); return s.strip()
def field(t,name,nxt):
    m=re.search(re.escape(name)+r':\s*\n?(.*?)\n\s*(?:'+nxt+r'):',t,re.S)
    return m.group(1).strip() if m else None
def parse_matter(path):
    raw=open(path,encoding='latin-1').read()
    t=clean(raw)
    d={}
    d['fileType']=field(t,'File Type','Status')
    d['status']=field(t,'Status','Version')
    d['reference']=field(t,'Reference','Control')
    d['requester']=field(t,'Requester','Cost')
    d['finalAction']=field(t,'Final Action','Agenda Date')
    d['sponsors']=field(t,'Sponsors','Sunset Provision')
    m=re.search(r'Registered Lobbyist:\s*(.*?)\n\s*Legislative History',t,re.S); d['lobbyists']=m.group(1).strip() if m else None
    i=t.find('Legislative History'); j=t.find('Legislative Text')
    hist=t[i:j] if i>=0 else ''
    d['vetoLines']=[l for l in re.findall(r'[^\n]*(?:[Vv]eto|VETO)[^\n]*',hist)][:20]
    lt=t[j:] if j>=0 else ''
    m=re.search(r'From:\s*(.{0,80}?)\s*(?:Subject|$)',lt,re.S)
    d['memoFrom']=re.sub(r'\s+',' ',m.group(1)).strip() if m else None
    m=re.search(r'(?:^|\n)\.{0,2}\s*(?:STAFF )?RECOMMENDATIONS?\s*:?\s*\n(?:\s*RECOMMENDATIONS?\s*:?\s*\n)?(.{20,600})',lt,re.S|re.I) or re.search(r'\.\.RECOMMENDATION\s*(.{0,600})',lt,re.S)
    d['recommendation']=re.sub(r'\s+',' ',m.group(1)).strip()[:600] if m else None
    d['mayorMemo']=bool(d['memoFrom'] and re.search(r'Mayor',d['memoFrom']))
    d['textAvailable']='There is no text currently available' not in lt
    # history rows: Acting body / date / action
    rows=[]
    for m in re.finditer(r'\n(Board of County Commissioners|County Mayor|Mayor|Clerk of the Board|County Attorney|[A-Z][A-Za-z,&\.\- ]{3,80}(?:Committee|Council|Board|Subcommittee))\s*\n(\d{1,2}/\d{1,2}/\d{4})\s*\n([^\n]*)\n([^\n]*)',hist):
        rows.append([m.group(1),m.group(2),m.group(3),m.group(4)])
    d['history']=rows[:60]
    return d
