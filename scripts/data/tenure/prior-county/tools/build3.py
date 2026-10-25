# Stage 3: write the slice files.
import json,sys,re,os,collections
BASE='/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/pc/'
OUT='/home/claude/vote-informed/scripts/data/tenure/prior-county/'
sys.path.insert(0,BASE+'tools')
import gifts as G
S=json.load(open(BASE+'stage1.json')); A=json.load(open(BASE+'stage2.json'))
KEEP=['id','date','meeting','ref','agendaItem','title','titleFull','type','kind','parties','amount','result','tally','roll','rollComplete','mover','second','sponsors','lobbied','lobbiedRecord','links','universe','note','veto','mayor','seated','matter']
acts=[]
for a in A:
    o={k:a[k] for k in KEEP if k in a}
    if 'mayor' in o:
        mm=dict(o['mayor']); mm.pop('requester',None); mm.pop('sponsors',None); mm.pop('recommendation',None)
        mm['recommendedBy']=mm.pop('memoFrom'); mm['note']='recommendation text, requester and sponsors are in matter'
        o['mayor']=mm
    o['links']=a['links']+([{'t':'clerk','url':f"https://www.miamidade.gov/govaction/legistarfiles/MinMatters/{a['links'][0]['url'].split('yearFolder=')[1]}/{a['id']}min.pdf"}] if ('05'<=a['id'][:2]<'50') else [])
    acts.append(o)
acts.sort(key=lambda a:(a['date'],a['id']),reverse=True)
MEET=[m for m in S['meetings'] if '1998-06-16'<=m['date']<='2020-11-16']
for m in MEET:
    if m['meetId'] in (1317,4342): m['read']=False; m['error']='county error page from curl and WebFetch (2026-10-25)'
gaps=[
 'Window 1998-06-16 (Barreiro first seated; 6/16/1998 minutes accept the canvassing certificate for the June 2, 1998 District 5 special election) to 2020-11-16 (last BCC meeting before Gimenez left the mayor\'s office on 2020-11-17). 924 of the 926 listed meetings in the window read (BCC list CC, plus ZB 2017-07 on and CDMP 2017-04 on).',
 'Not read: commminute.asp?cmbmeetdate=4342 (2019-10-30 CDMP meeting) and 1317 (second 2003-05-20 entry) return the county error page. See needs-browser.md.',
 'BCC zoning hearings before 2017-07-20 are not in the Clerk\'s online minutes (the ZB and CDMP lists start 2017). Site-specific zoning votes 1998-06..2017-07 are therefore missing; RER results PDFs are listed in needs-browser.md.',
 'Universe: final votes (Adopted, Approved, Approved with conditions/staff recommendation, Denied, motion failed) on resolutions, ordinances, zoning items, change orders and professional service agreements, including files later vetoed. First readings, deferrals, withdrawals, items amended into a new file (the new file is used) are left out; a file appears once, at its last final vote.',
 'Excluded by rule: urging/opposing/supporting, codesignations and naming, appointments, proclamations and commendations, directives for reports or studies, millage, special taxing districts and assessment rolls, omnibus and district discretionary or reserve allocations, in-kind allocations, and code amendments (ORDINANCE RELATING TO ...) unless they grant something to a named party.',
 'Parties are taken from the item title: corporate and organization names (Inc., LLC, Ltd., Corp., Company, L.P., P.A., JV, Association, Foundation, union locals, etc.), FILED BY on plats, and the applicant field on zoning items. Government entities are dropped. An item whose title names no private party is left out and listed in unnamed.json (with the reason). About 40 of 6,148 extracted names are title fragments, not clean names. Titles are English only.',
 'In-kind service allocations (county park, transit or police services for an event run by a named group, charged to a district in-kind reserve) are excluded as district allocations, as in the county list; 1,277 of them are in unnamed.json.',
 '"Bid Awards" (BID AWARD RECOMMENDATIONS) packages in 1998-2004 minutes name no vendor in the title; their vendors are only in the attached packets and are not in this list.',
 'Rolls: every member present that day is yes unless the vote line lists No, Absent, Absent OCB (shown absent), Excused, or Absent COI (shown recused); late arrivals are absent for votes taken before they arrived when the printed tally requires it. Every printed tally matches the roll.',
 'Lobbyists: Clerk historical registrations (www2.miamidadeclerk.gov/lobbyhist), searched by principal name; a registration counts when the principal name equals the party (ignoring punctuation, "&"/AND and corporate suffix) and the lobbyist was employed on or before the vote, in the vote year or the year before. annualRegistration says whether the lobbyist\'s own annual registration list covers the vote year (null = list not retrieved). The archive\'s annual lists have gaps for many lobbyists, so it is shown, not used as a filter. Firms are not in the archive.',
 'Mayor fields (Gimenez, 2011-07-07..2020-11-16): memoFrom and recommendation are copied from the matter page\'s legislative text (the cover memorandum\'s From line and its RECOMMENDATION section); titleAuthorizesMayorToExecute / titleRatifiesMayorAction come from the item title; vetoed means the Clerk\'s file type for the item is "Mayoral Veto"; veto.overrideVotes are the override roll calls from the minutes. Contracts actually signed by the Mayor are not in the records read here.',
]
json.dump({'body':'county','name':'Miami-Dade Board of County Commissioners (prior offices: Barreiro D5, Gimenez D7 and Mayor)','window':{'from':'1998-06-16','to':'2020-11-16'},
  'sources':['https://www.miamidade.gov/govaction/minutes.asp?Action=Minutes&Oper=DisplayMinute&Minute=CC','https://www.miamidade.gov/govaction/minutes2.asp?Action=Minutes&Oper=DisplayMinute&Minute=ZB','https://www.miamidade.gov/govaction/minutes2.asp?Action=Minutes&Oper=DisplayMinute&Minute=CDMP','https://www.miamidade.gov/govaction/matter.asp','https://www2.miamidadeclerk.gov/lobbyhist'],
  'meetings':MEET,'actions':acts,'gaps':gaps},open(OUT+'actions.json','w'),separators=(',',':'))
json.dump(S['unnamed'],open(OUT+'unnamed.json','w'),separators=(',',':'))
json.dump(S['vetoes'],open(OUT+'vetoes.json','w'),indent=0)
# ---- donors preview ----
B=[a for a in A if a['seated']['Barreiro']]; GC=[a for a in A if a['seated']['Gimenez']]; GM=[a for a in A if a.get('mayor')]
RB=G.load(['barreiro-campaign-2004.csv','barreiro-campaign-2008.csv','barreiro-campaign-2012.csv','barreiro-campaign-2016.csv'])
RGc=G.load(['gimenez-campaign-2004.csv','gimenez-campaign-2008.csv'])
RGm=G.load(['gimenez-mayor-2011.csv','gimenez-mayor-2012.csv','gimenez-mayor-2016.csv'])
pb=G.match(B,RB,'Barreiro','vote'); pgc=G.match(GC,RGc,'Gimenez','vote'); pgm=G.match(GM,RGm,'Gimenez','mayor')
json.dump({'note':'PRELIMINARY, for the coordinator: county campaign contributions whose contributor name equals an action party (ignoring punctuation, &/AND and corporate suffix) or a lobbyist registered for that party (first+last name), dated on or before the action. Barreiro and Gimenez-commissioner rows only where the member voted yes or no. Gimenez-mayor rows are every action in his mayoral window; they are not votes. Firm and affiliate gifts are not matched here.',
  'barreiro':pb,'gimenezCommissioner':pgc,'gimenezMayor':pgm},open(OUT+'gifts-preview.json','w'),indent=0)
def tot(x):
    u={(g['file'],g['date'],g['name'],g['amount'],g.get('addr')) for r in x for g in r['gifts']}
    return [len(u),round(sum(t[3] for t in u),2)]
stats={}
def st(L,who):
    v=[a for a in L if a['roll'].get(who) in('yes','no')]
    return {'actions':len(L),'votedYesNo':len(v),'yes':sum(a['roll'].get(who)=='yes' for a in L),'no':sum(a['roll'].get(who)=='no' for a in L),
            'absentEtc':sum(a['roll'].get(who) in('absent','excused','recused') for a in L),'unknown':sum(a['roll'].get(who)=='unknown' for a in L),
            'lobbied':sum(1 for a in L if a['lobbied']),'first':min(a['date'] for a in L),'last':max(a['date'] for a in L)}
stats['barreiro']=st(B,'Barreiro'); stats['gimenezCommissioner']=st(GC,'Gimenez')
stats['gimenezMayor']={'actions':len(GM),'withMatterText':sum(1 for a in GM if a['mayor']['memoFrom']),'memoFromGimenez':sum(a['mayor']['mayorMemo'] for a in GM),
   'titleAuthorizesMayorToExecute':sum(a['mayor']['titleAuthorizesMayorToExecute'] for a in GM),'titleRatifiesMayorAction':sum(a['mayor']['titleRatifiesMayorAction'] for a in GM),
   'vetoed':sum(a['mayor']['vetoed'] for a in GM),'lobbied':sum(1 for a in GM if a['lobbied']),'first':min(a['date'] for a in GM),'last':max(a['date'] for a in GM)}
stats['gifts']={'barreiro':[len(pb)]+tot(pb),'gimenezCommissioner':[len(pgc)]+tot(pgc),'gimenezMayor':[len(pgm)]+tot(pgm)}
stats['donorRows']={'barreiro':[len(RB),round(sum(r['amount'] for r in RB),2)],'gimenezCommissioner':[len(RGc),round(sum(r['amount'] for r in RGc),2)],'gimenezMayor':[len(RGm),round(sum(r['amount'] for r in RGm),2)]}
stats['byYear']={who:dict(sorted(collections.Counter(a['date'][:4] for a in L).items())) for who,L in [('barreiro',B),('gimenezCommissioner',GC),('gimenezMayor',GM)]}
stats['unnamed']=len(S['unnamed']); stats['allActions']=len(A); stats['vetoItems']=len(S['vetoes'])
json.dump(stats,open(BASE+'stats.json','w'),indent=1); print(json.dumps(stats,indent=1))
