def murl(a,b): return a
CFG=dict(slug='sunnyisles', city='Sunny Isles Beach', body='Sunny Isles Beach City Commission',
 window={'from':'2025-01-01','to':'2026-10-24','latestRecordRead':'2026-09-29'},
 members=['Svechin','Lama','Joseph','Stuyvesant','Viscarra'],
 member_names={'Svechin':'Larisa Svechin (Mayor)','Lama':'Alex Lama (Vice Mayor in 2025; Commissioner by 2026)','Joseph':'Jerry Joseph (Commissioner; sworn in 2025-01-15)','Stuyvesant':'Fabiola Stuyvesant (Commissioner)','Viscarra':'Jeniffer Viscarra (Commissioner in 2025; Vice Mayor by 2026)'},
 meeting_url=murl,
 agenda_note='Agenda only; summary minutes not found',
 sources=[{'name':'Sunny Isles Beach Granicus ViewPublisher (view_id=2) and AgendaViewer agenda PDFs','url':'https://sibfl.granicus.com/ViewPublisher.php?view_id=2'},
          {'name':'Summary minutes PDFs linked from the clerk memo attached to the next regular agenda (Legistar attachment storage)','url':'https://sibfl.granicus.com/ViewPublisher.php?view_id=2'}],
 gaps=[
  {'issue':'Summary minutes were found for 2025-01-16, 02-20, 03-20, 04-03, 04-17, 05-15, 06-17, 08-21, 09-03, 09-11, 09-18 and 2026-09-17 (draft) and 09-29. For 2025-07-17, 10-16, 11-20 and 2026-03-19, 07-16 and 08-20 the clerk memo attached to the next agenda has no link to the minutes file; minutes for 2026-01-15, 02-19, 04-16, 05-14 and 06-18 were never put on a later agenda. Private-party agenda items from those meetings are listed with roll null'},
  {'date':'2026-10-15','issue':'Meeting held; minutes not yet posted. Agenda items listed with roll null'},
  {'date':'2026-09-15','issue':'Second budget hearing has video but no agenda or minutes posted'},
  {'issue':'Most resolutions pass by voice vote. Where the minutes give a voice tally equal to the members present and name any dissenters, the roll is filled in from the attendance list (yes for everyone present who is not named as voting no); otherwise roll is null'},
  {'date':'2025-06-17','issue':'Vice Mayor Lama absent; Mayor Svechin recused herself at 7:21 p.m. and is marked absent on later items'},
  {'issue':'Local Planning Agency sessions, workshops and special presentation sessions were not read for actions'},
  {'issue':'Excluded: interlocal and FDOT agreements, DOJ forfeiture fund authorizations (the related vendor purchases are listed), PBA collective bargaining agreement, city manager suspension, resignation and separation, proclamations, keys to the city and legislative resolutions'},
  {'issue':'Several site plans and promissory notes for FAR bonuses/TDRs name the developer only in the exhibit (PZ2015-16 phases on 2026-03-19)'}])
