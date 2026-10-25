import re, json, html
D='/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/raw/cpf/'
def money(s):
    s=s.replace(',','')
    m=re.search(r'\$\s*([\d.]+)\s*(million|milllion|thousand)?',s,re.I)
    if not m: return None,None
    v=float(m.group(1)); u=(m.group(2) or '').lower()
    if u.startswith('mil') and v<1000: v*=1e6
    elif u=='thousand': v*=1e3
    return int(round(v)), (m.group(0) if u else None)
out=[]
# Diaz-Balart: FY25 section of his page
t=open(D+'mariodiazbalart_house_gov_issues_cpf-requests.html.txt').read()
sec=t[t.index('FY25 CPF Requests Submitted'):t.index('FY24 Community Project Funding Requests')]
sec=re.sub(r'\n(st|nd|rd|th)\n',r'\1',sec)
blocks=re.split(r'\nCERTIFICATION LETTER\n',sec)
for b in blocks:
    lines=[x.strip() for x in b.split('\n') if x.strip() and 'FY25 CPF Requests' not in x]
    if not any(l.startswith('Recipient') for l in lines): continue
    i=[k for k,l in enumerate(lines) if l.startswith('Recipient')][0]
    proj=' '.join(lines[:i]).strip()
    rec=lines[i].split(':',1)[1].strip() or lines[i+1]
    loc=next((l.split(':',1)[1].strip() for l in lines if l.startswith('Location')),None)
    amt_l=next(l for l in lines if l.startswith('Amount'))
    amt,txt=money(amt_l)
    out.append({'member':'Diaz-Balart','fy':'FY2025','subcommittee':None,'recipient':rec,'project':proj,'address':loc,'amount':amt,'amountText':amt_l.split(':',1)[1].strip(),'source':'https://mariodiazbalart.house.gov/issues/cpf-requests'})
# Salazar
t=open(D+'salazar_house_gov_fy-2025-community-funding-project-requests.html.txt').read()
for m in re.finditer(r'Title:\s*\n(.*?)\nProject Sponsor:\s*(.*?)\nProject Amount:\s*(.*?)\n',t):
    amt,_=money(m.group(3))
    out.append({'member':'Salazar','fy':'FY2025','subcommittee':None,'recipient':m.group(2).strip(),'project':m.group(1).strip(),'address':None,'amount':amt,'source':'https://salazar.house.gov/fy-2025-community-funding-project-requests'})
# Gimenez
t=open(D+'gimenez25.html.txt').read()
t=re.sub(r'\n(st|nd|rd|th)\n',r'\1',t)
for m in re.finditer(r'Project Name:\s*\n(.*?)\nProject Sponsor and Address:\s*\n(.*?)\nProject Amount Requested:\s*\n(.*?)\n',t,re.S):
    amt,_=money(m.group(3)); sp=re.sub(r'\s+',' ',m.group(2)).strip()
    rec,addr=(sp.split(' located at ',1)+[None])[:2] if ' located at ' in sp else (sp,None)
    if addr is None and ' located ' in sp: rec,addr=sp.split(' located ',1)
    out.append({'member':'Gimenez','fy':'FY2025','subcommittee':None,'recipient':rec.strip(),'project':re.sub(r'\s+',' ',m.group(1)).strip(),'address':addr,'amount':amt,'source':'https://gimenez.house.gov/services/fy-2025-project-requests'})
# Donalds
t=open(D+'donalds_house_gov_fy25-selections_.html.txt').read()
sec=t[t.index('FY 25 COMMUNITY PROJECT SELECTIONS'):t.index('Washington, DC Office')]
blocks=re.split(r'\nFinancial Certification(?: Letter)?\s*\n',sec)
for b in blocks:
    lines=[x.strip() for x in b.split('\n') if x.strip() and 'COMMUNITY PROJECT SELECTIONS' not in x]
    if not any(l.startswith('Recipient') for l in lines): continue
    i=[k for k,l in enumerate(lines) if l.startswith('Recipient')][0]
    proj=' '.join(lines[:i]).strip()
    rec=lines[i].split(':',1)[1].strip()
    loc=next((l.split(':',1)[1].strip() for l in lines if l.startswith('Location')),None)
    amt_l=next(l for l in lines if l.startswith('Amount'))
    amt,txt=money(amt_l)
    out.append({'member':'Donalds','fy':'FY2025','subcommittee':None,'recipient':rec,'project':proj,'address':loc,'amount':amt,'amountText':re.sub(r'^Amount of\s+Request:?\s*','',amt_l),'source':'https://donalds.house.gov/fy25-selections/'})
json.dump(out,open('fy25.json','w'),indent=1)
import collections; print(collections.Counter(x['member'] for x in out)); 
for x in out: print(x['member'],'|',x['project'][:60],'|',x['recipient'][:50],'|',x['amount'])
