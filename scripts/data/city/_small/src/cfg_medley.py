def murl(a,b):
    for p in ('AGENDA:','NOREAD:'):
        if b.startswith(p): return b[len(p):]
    return b
CFG=dict(slug='medley', city='Medley', body='Medley Town Council',
 window={'from':'2025-01-01','to':'2026-10-05','latestRecordRead':None},
 members=['Ayala','Rodriguez'],
 member_names={'Ayala':'Edgar Ayala (Councilman)','Rodriguez':'Lizelh Rodriguez (Councilwoman)','others':'Agendas also name Mayor Stefano, Vice Mayor Jinete and Councilwoman Lourdes Rodriguez; the full council roster was not confirmed from minutes in this pass'},
 meeting_url=murl,
 agenda_note='Agenda only; minutes are in the Laserfiche library (medleydocs.com), which refused automated and browser access in this pass',
 sources=[{'name':'Town of Medley council meeting agendas (2025 and 2026 pages)','url':'https://www.townofmedley.com/council-meetings'},
          {'name':'Town of Medley Laserfiche public records library (minutes)','url':'https://www.medleydocs.com/WebLink/Welcome.aspx?dbid=0&repo=LFMedley'}],
 gaps=[
  {'issue':'Minutes not read: medleydocs.com (Laserfiche WebLink) returned a cookie error page to the fetcher and the browser pane was refused, even after site access was granted. Every action except the July 7, 2025 Florida Wood item is listed from the agenda with roll null; outcomes, movers and votes are unknown.'},
  {'issue':'No agenda posted for January 2025, February 2025, August 2025 (cancelled per July 7 agenda) or January 2026 (cancelled per Dec 1 agenda); the Sept 22, 2026 second budget hearing agenda is not on the page'},
  {'issue':'Items that recur on later agendas (Florida Wood, pet crematorium, Titan Florida, Verra Mobility, Vetted Security, Res-Des Palmetto, UniCapital) were probably deferred at the earlier meeting; each listing is kept until minutes confirm the outcome'},
  {'issue':'Agendas omit many vendor and claimant names (insurance renewals, vehicle purchases, settlement claimants, land sale buyer)'},
  {'issue':'Member roster not confirmed; roll keys limited to Ayala and Rodriguez (the two incumbents tracked on the site)'}])
