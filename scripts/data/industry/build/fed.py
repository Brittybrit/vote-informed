import json
P=json.load(open('/root/vote-informed/scripts/data/federal/pac-agg.json'))
TAX=["realestate-dev","affordable-housing","homebuilders","construction","engineering","land-use-law","lobbying","law-firm","insurance-property","insurance-health","insurance-auto","insurance-other","banks","credit-unions","payday-consumer-finance","securities-investment","crypto","hospitals","physicians","nursing-homes","pharma","pharmacies-pbm","health-other","oil-gas","electric-utility","gas-utility","telecom","solar-renewables","autos-dealers","auto-manufacturers","towing","trucking-logistics","airlines","cruise-maritime","ports","rail","ride-hailing","defense","aerospace","tech-software","tobacco-vaping","alcohol-beverage","gambling-casinos","pari-mutuel","restaurants-hospitality","hotels-tourism","retail","grocery","agriculture-sugar","agriculture-citrus","agriculture-other","waste-environment","water-utility","private-prisons","firearms","charter-schools","private-schools","education-other","labor-union","trade-association","political-committee","party","self","individual-noindustry","other"]
# key -> (tags, basis, src)
W={
 "credit-unions-ta":(["political-committee","trade-association","credit-unions"],"website","https://www.cuna.org/"),
 "aba":(["political-committee","trade-association","banks"],"name",None),
 "anduril":(["political-committee","defense"],"website","https://www.anduril.com/"),
 "bae":(["political-committee","defense","aerospace"],"website","https://www.baesystems.com/en-us/who-we-are"),
 "boeing":(["political-committee","aerospace","defense"],"website","https://www.boeing.com/"),
 "booz":(["political-committee","defense","tech-software"],"website","https://www.boozallen.com/about.html"),
 "caci":(["political-committee","defense","tech-software"],"website","https://en.wikipedia.org/wiki/CACI"),
 "chevron":(["political-committee","oil-gas"],"website","https://www.chevron.com/"),
 "cubic":(["political-committee","defense","other"],"website","https://www.cubic.com/about-us"),
 "ngc":(["political-committee","defense","aerospace"],"website","https://www.northropgrumman.com/"),
 "rtx":(["political-committee","defense","aerospace"],"website","https://www.rtx.com/"),
 "ga":(["political-committee","defense","aerospace"],"website","https://www.ga.com/about"),
 "gd":(["political-committee","defense","aerospace"],"website","https://www.gd.com/"),
 "hii":(["political-committee","defense","cruise-maritime"],"website","https://www.hii.com/"),
 "kratos":(["political-committee","defense"],"website","https://www.kratosdefense.com/"),
 "l3":(["political-committee","defense","aerospace"],"website","https://www.l3harris.com/"),
 "leidos":(["political-committee","defense","tech-software"],"website","https://www.leidos.com/company"),
 "drs":(["political-committee","defense"],"website","https://www.leonardodrs.com/"),
 "lmt":(["political-committee","defense","aerospace"],"website","https://www.lockheedmartin.com/"),
 "red6":(["political-committee","defense","aerospace"],"website","https://red6ar.com/"),
 "bank-regions":(["political-committee","banks"],"website","https://www.regions.com/about-regions"),
 "saab":(["political-committee","defense"],"website","https://www.saab.com/"),
 "snc":(["political-committee","aerospace","defense"],"website","https://www.sncorp.com/suppliers/doing-business-with-snc/"),
 "williams":(["political-committee","oil-gas"],"website","https://www.williams.com/"),
 "toyota":(["political-committee","auto-manufacturers"],"name",None),
 "jm":(["political-committee","autos-dealers","securities-investment","insurance-auto"],"website","https://jmfamily.com/"),
 "saic":(["political-committee","defense","tech-software"],"website","https://www.saic.com/"),
 "ses":(["political-committee","aerospace","defense","telecom"],"website","https://www.ses.com/"),
 "pnc":(["political-committee","banks"],"website","https://www.pnc.com/en/about-pnc.html"),
 "bmo":(["political-committee","banks"],"website","https://www.bmo.com/en-us/main/about-bmo/"),
 "cadence":(["political-committee","banks"],"name",None),
 "capone":(["political-committee","banks"],"website","https://www.capitalone.com/about/"),
 "citi":(["political-committee","banks"],"website","https://www.citigroup.com/global/about-us"),
 "coinbase":(["political-committee","crypto"],"website","https://www.coinbase.com/about"),
 "es3":(["political-committee","defense","aerospace","engineering"],"website","https://www.es3inc.com/?p=56"),
 "fifth":(["political-committee","banks"],"name",None),
 "gm":(["political-committee","auto-manufacturers"],"website","https://www.gm.com/company/about-gm"),
 "huntington-bank":(["political-committee","banks"],"name",None),
 "jpm":(["political-committee","banks","securities-investment"],"website","https://www.jpmorganchase.com/about"),
 "mantech":(["political-committee","defense","tech-software"],"website","https://www.mantech.com/"),
 "nada":(["political-committee","trade-association","autos-dealers"],"website","https://www.nada.org/about-nada"),
 "p66":(["political-committee","oil-gas"],"website","https://www.phillips66.com/"),
 "santander":(["political-committee","banks"],"website","https://www.santanderus.com/"),
 "serco":(["political-committee","defense","other"],"website","https://www.serco.com/na/about"),
 "truist":(["political-committee","banks"],"website","https://www.truist.com/who-we-are"),
 "usb":(["political-committee","banks"],"name",None),
 "boa":(["political-committee","banks"],"name",None),
 "wf":(["political-committee","banks"],"website","https://www.wellsfargo.com/about/"),
}
def key(c):
    c=c.upper()
    rules=[("CREDIT UNION","credit-unions-ta"),("AMERICAN BANKERS","aba"),("ANDURIL","anduril"),("BAE SYSTEMS","bae"),("BOEING","boeing"),("BOOZ ALLEN","booz"),("CACI","caci"),("CHEVRON","chevron"),("CUBIC","cubic"),("NORTHROP","ngc"),("RTX","rtx"),("GENERAL ATOMICS","ga"),("GENERAL DYNAMICS","gd"),("HUNTINGTON INGALLS","hii"),("KRATOS","kratos"),("L3HARRIS","l3"),("LEIDOS","leidos"),("LEONARDO DRS","drs"),("LOCKHEED","lmt"),("RED SIX","red6"),("REGIONS FINANCIAL","bank-regions"),("SAAB","saab"),("SIERRA NEVADA","snc"),("WILLIAMS COMPANIES","williams"),("TOYOTA","toyota"),("JM FAMILY","jm"),("SCIENCE APPLICATIONS","saic"),("SES SPACE","ses"),("PNC","pnc"),("BMO","bmo"),("CADENCE BANK","cadence"),("CAPITAL ONE","capone"),("CITIGROUP","citi"),("COINBASE","coinbase"),("ENGINEERING AND SOFTWARE","es3"),("FIFTH THIRD","fifth"),("GENERAL MOTORS","gm"),("HUNTINGTON BANCSHARES","huntington-bank"),("JPMORGAN","jpm"),("MANTECH","mantech"),("NATIONAL AUTOMOBILE DEALERS","nada"),("PHILLIPS 66","p66"),("SANTANDER","santander"),("SERCO","serco"),("TRUIST","truist"),("U.S. BANCORP","usb"),("BANK OF AMERICA","boa"),("WELLS FARGO","wf")]
    for s,k in rules:
        if s in c: return k
    raise Exception(c)
out={}
for r in P['rows']:
    t,b,s=W[key(r[1])]
    out[r[1]]={"tags":t,"basis":b,"src":s}
for k,v in out.items():
    for t in v['tags']: assert t in TAX,t
json.dump({"taxonomy":TAX,"donors":out},open('/root/vote-informed/scripts/data/industry/federal-pacs.json','w'),indent=1)
import collections
c=collections.Counter()
for r in P['rows']:
    for t in out[r[1]]['tags']:
        if t!='political-committee': c[t]+=r[3]
print(len(out),c.most_common(8))
json.dump(TAX,open('tax.json','w'))
