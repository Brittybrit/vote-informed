import zipfile, json, re, os, sys
import xml.etree.ElementTree as ET
RAW=sys.argv[1]; pls=set(sys.argv[3].split(',')); congs=sys.argv[2].split(',')
out={}
for c in congs:
  for t in ['hr','s','hjres','sjres']:
    z=zipfile.ZipFile(os.path.join(RAW,f'{c}-{t}.zip'))
    for n in z.namelist():
      b=ET.fromstring(z.read(n)).find('bill')
      laws=[i.findtext('number') for i in b.findall('laws/item') if (i.findtext('type') or '').startswith('Public')]
      pl=next((l for l in laws if l.split('-')[0]==c),None)
      if not pl or pl not in pls: continue
      acts=[]
      for a in b.findall('actions/item'):
        tx=a.findtext('text') or ''
        src=a.findtext('sourceSystem/name') or ''
        if re.search(r'(?i)roll|voice|unanimous consent|without objection|passed senate|passed house|agreed to in (the )?(house|senate)|became public law|presented to', tx):
          acts.append([a.findtext('actionDate'), src[:12], tx[:240]])
      out[pl]={'bill':f'{t}{b.findtext("number")}','acts':acts}
json.dump(out,open('acts.json','w'),indent=0)
