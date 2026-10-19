import fs from 'node:fs';
// recipient (as written on the request) -> LDA client key; null = no federal lobbying registration found / not applicable
export function clientOf(r){
  const s=String(r).toUpperCase().replace(/[’']/g,"'").replace(/\s+/g,' ').trim();
  const rules=[
    [/^BROWARD SHERIFF/,"BROWARD SHERIFF'S OFFICE"],
    [/SHERIFF/,null],
    [/^LEE COUNTY EMERGENCY/,'LEE COUNTY'],
    [/^(MIAMI.?DADE COUNTY SEAPORT|PORTMIAMI)/,'MIAMI-DADE COUNTY'],
    [/^MIAMI.?DADE COUNTY|^MIAMI DADE HOUSING/,'MIAMI-DADE COUNTY'],
    [/^MIAMI.?DADE COLLEGE/,null],
    [/^CITY OF MIAMI SPRINGS/,'CITY OF MIAMI SPRINGS'],
    [/^CITY OF MIAMI$/,'CITY OF MIAMI'],
    [/UNIVERSITY OF MIAMI/,'UNIVERSITY OF MIAMI'],
    [/FLORIDA INTERNATIONAL UNIVERSITY/,'FLORIDA INTERNATIONAL UNIVERSITY'],
    [/FLORIDA ATLANTIC UNIVERSITY/,'FLORIDA ATLANTIC UNIVERSITY'],
    [/NOVA SOUTHEASTERN/,'NOVA SOUTHEASTERN UNIVERSITY'],
    [/MICCOSUKEE/,'MICCOSUKEE TRIBE'],
    [/^BROWARD COUNTY/,'BROWARD COUNTY'],
    [/BOCA RATON/,'CITY OF BOCA RATON'],[/CAPE CORAL/,'CITY OF CAPE CORAL'],[/COCONUT CREEK/,'CITY OF COCONUT CREEK'],
    [/CORAL GABLES/,'CITY OF CORAL GABLES'],[/CORAL SPRINGS/,'CITY OF CORAL SPRINGS'],[/DEERFIELD BEACH/,'CITY OF DEERFIELD BEACH'],
    [/FORT LAUDERDALE/,'CITY OF FORT LAUDERDALE'],[/^CITY OF HIALEAH$/,'CITY OF HIALEAH'],[/^CITY OF HOMESTEAD/,'CITY OF HOMESTEAD'],
    [/LIGHTHOUSE POINT/,'CITY OF LIGHTHOUSE POINT'],[/OAKLAND PARK/,'CITY OF OAKLAND PARK'],[/POMPANO BEACH/,'CITY OF POMPANO BEACH'],
    [/SANIBEL/,'CITY OF SANIBEL'],[/^CITY OF SOUTH MIAMI/,'CITY OF SOUTH MIAMI'],[/^CITY OF WEST MIAMI/,'CITY OF WEST MIAMI'],
    [/^COLLIER COUNTY( BOARD)?/,'COLLIER COUNTY'],[/KEY WEST INTERNATIONAL AIRPORT/,'KEY WEST INTERNATIONAL AIRPORT'],
    [/MONROE COUNTY SCHOOL/,'MONROE COUNTY SCHOOL DISTRICT'],[/^(MONROE|MOROE) COUNTY/,'MONROE COUNTY'],
    [/^LEE COUNTY (COMMISSION|BOARD)/,'LEE COUNTY'],[/^PALM BEACH COUNTY/,'PALM BEACH COUNTY'],
    [/CUTLER BAY/,'TOWN OF CUTLER BAY'],[/^TOWN OF MEDLEY/,'TOWN OF MEDLEY'],[/MIAMI LAKES/,'TOWN OF MIAMI LAKES'],
    [/KEY BISCAYNE/,'VILLAGE OF KEY BISCAYNE'],[/PALMETTO BAY/,'VILLAGE OF PALMETTO BAY'],[/PINECREST/,'VILLAGE OF PINECREST'],
  ];
  for(const [re,k] of rules) if(re.test(s)) return k;
  return null;
}
const fy26=JSON.parse(fs.readFileSync('fy26-house-cpf.json'));
const reqs=[];
for(const r of fy26.rows) reqs.push({member:r[0],fy:'FY2026',subcommittee:r[1],recipient:r[2].trim(),project:r[3].trim(),address:r[4],amount:r[5],source:fy26.source,memberUrl:r[6]});
const lastOf={'diaz-balart':'Diaz-Balart',salazar:'Salazar',gimenez:'Gimenez',moskowitz:'Moskowitz',donalds:'Donalds'};
for(const f of fs.readdirSync('earmarks')){ const k=f.replace('.json',''); if(!lastOf[k]) continue; const e=JSON.parse(fs.readFileSync('earmarks/'+f));
  for(const x of e.requests||[]) if(x.fiscal_year==='FY2027') reqs.push({member:lastOf[k],fy:'FY2027',subcommittee:x.subcommittee||null,recipient:String(x.recipient).trim(),project:String(x.project_title).trim(),address:x.recipient_address||null,amount:x.amount_requested,amountText:x.amount_as_written||null,source:x.source_url}); }
for(const r of reqs) r.client=clientOf(r.recipient);
fs.writeFileSync('requests.json',JSON.stringify(reqs,null,1));
const byM={}; for(const r of reqs){ (byM[r.member]=byM[r.member]||new Set()); if(r.client) byM[r.member].add(r.client); }
console.log(reqs.length, 'requests;', reqs.filter(r=>!r.client).length,'no client');
console.log(JSON.stringify(Object.fromEntries(Object.entries(byM).map(([k,v])=>[k,[...v]]))));
console.log([...new Set(reqs.filter(r=>!r.client).map(r=>r.recipient))].join(' | '));
