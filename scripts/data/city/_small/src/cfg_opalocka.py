def murl(a,b):
    return 'https://opalockafl.portal.civicclerk.com/event/%s/files' % a
CFG=dict(slug='opalocka', city='Opa-locka', body='Opa-locka City Commission',
 window={'from':'2025-01-01','to':'2026-10-24','latestRecordRead':'2026-10-14'},
 members=['Taylor','Kelley','Bass','Ervin','Santiago'],
 member_names={'Taylor':'John H. Taylor Jr. (Mayor)','Kelley':'Joseph L. Kelley (Vice Mayor)','Bass':'Dr. Sherelean Bass (Commissioner)','Ervin':'Natasha L. Ervin (Commissioner)','Santiago':'Luis B. Santiago (Commissioner)'},
 meeting_url=murl,
 agenda_note='Agenda only; no minutes posted',
 sources=[{'name':'Opa-locka CivicClerk API (events, agendas, minutes attachments)','url':'https://opalockafl.api.civicclerk.com/v1/Events'},
          {'name':'Opa-locka CivicClerk portal','url':'https://opalockafl.portal.civicclerk.com/'},
          {'name':'Commission minutes PDFs attached to the next meeting agenda item "Approval of Minutes"','url':'https://opalockafl.portal.civicclerk.com/'}],
 gaps=[
  {'date':'2026-05-27','issue':'Regular meeting held (agenda and packet posted) but no minutes attached to any later agenda; private-party agenda items listed with roll null'},
  {'date':'2026-10-14','issue':'Minutes read are the draft attached to the 2026-10-28 agenda; not yet approved'},
  {'date':'2026-10-28','issue':'Meeting not yet held as of 2026-10-24; agenda posted but not included'},
  {'date':'2025-03-12','issue':'No quorum; no actions taken'},
  {'issue':'Cancelled regular meetings (no records): 2025-02-26, 2025-08-13, 2025-08-27, 2025-11-26, 2025-12-24, 2026-05-13, 2026-08-12, 2026-08-26'},
  {'issue':'Several consent-agenda votes (2025-05-14, 2025-05-28, 2025-06-11) and the 2025-08-25 lease vote record a 5-0 or 4-0 roll but no mover or second; mover and second are null'},
  {'issue':'Consent items carry the roll of the single consent-agenda vote; pulled items carry their own vote'},
  {'issue':'Applicants for site plans, plats, special exceptions and rezonings (3400 NW 135 St, 14301 NW 27 Ave, 2466 Ali Baba Ave, 13449 NW 42 Ave, 1700 Service Road, 13060 Cairo Lane, 3570/3530/3450 NW 135 St) are not named in the minutes or titles; the contractor on the seven Cairo Lane/NW 127 St change orders and the NW 127 St water-main change order is not named either'},
  {'issue':'Budget hearings (2025-09-09, 2025-09-24, 2026-09-08, 2026-09-23) and special meetings of 2025-11-14 and 2025-11-24 were read; they hold only millage, budget and code items, with no private-party actions'},
  {'issue':'Interlocal agreements, state and federal grants, mutual aid, RFP issuances naming no vendor, code amendments, scholarships and union contracts are excluded under the standard'}])
