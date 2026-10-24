import json, re
NMB25=["Joseph","Su","Chernoff","Fleurimond","Jean","Smith","Smukler"]
def roll_from(members, absent=(), no=(), explicit=None):
    if explicit:
        r={}
        for part in re.split(r',\s*', explicit):
            m=re.match(r'(\w+)\s*-\s*(\w+)', part.strip())
            if m: r[m.group(1)]= 'yes' if m.group(2).lower().startswith('y') else 'no'
        for mm in members:
            r.setdefault(mm,'absent')
        return r
    return {m: ('absent' if m in absent else 'no' if m in no else 'yes') for m in members}
def tally(r):
    y=sum(1 for v in r.values() if v=='yes'); n=sum(1 for v in r.values() if v=='no'); return f"{y}-{n}"
def A(id,date,ref,title,kind,parties,amount,url,members,mover=None,second=None,absent=(),no=(),explicit=None,consent=False,notes="",voice=None,result="passed",roll=None):
    r= roll if roll is not None else roll_from(members,absent,no,explicit)
    src = "roll call in minutes" if explicit else ("tally in minutes; names are the members present" if voice!=False else "")
    n = notes
    if not explicit and roll is None: n = (n+" " if n else "")+"Voice vote; roll built from the stated tally and attendance."
    return dict(id=id,date=date,ref=ref,title=title,kind=kind,parties=parties,amount=amount,url=url,roll=r,tally=tally(r) if result!='withdrawn' else None,mover=mover,second=second,consent=consent,result=result,notes=n.strip())
