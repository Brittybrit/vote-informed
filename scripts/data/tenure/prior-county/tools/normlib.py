import re
SUFX=r'\b(INCORPORATED|INC|LLC|L L C|LLLP|LTD|LIMITED|CORPORATION|CORP|COMPANY|CO|LP|L P|LLP|PA|P A|PLLC|NA|N A|THE)\b'
def norm(s):
    s=s.upper().replace('&',' AND ')
    s=re.sub(r'[^A-Z0-9 ]',' ',s); s=re.sub(r'\s+',' ',s).strip()
    s=re.sub(r'^THE ','',s)
    for a,b in [('INCORPORATED','INC'),('CORPORATION','CORP'),('COMPANY','CO'),('LIMITED','LTD'),('L L C','LLC'),('L P','LP'),('P A','PA'),('N A','NA')]: s=re.sub(r'\b'+a+r'\b',b,s)
    return s
def core(s):
    c=re.sub(SUFX,' ',norm(s)); c=re.sub(r'\s+',' ',c).strip()
    return c
