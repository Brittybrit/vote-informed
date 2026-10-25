A='https://legistar1.granicus.com/Pinecrest/attachments/'
def murl(a,b):
    if b.startswith('AGENDA:'): return b[7:]
    return A+a+'.pdf'
CFG=dict(slug='pinecrest', city='Pinecrest', body='Pinecrest Village Council',
 window={'from':'2022-11-08','to':'2026-10-13','latestRecordRead':'2026-09-22'},
 members=['del Prado','Fairman','Meyer','Greenberg','Corradino','McDonald','Abbott','Hochkammer'],
 member_names={'del Prado':'Shannon del Prado (Councilmember; left the council by April 2026)','Fairman':'Ken Fairman (Councilmember; Vice Mayor from Nov 2025)','Meyer':'Ariel Meyer (Councilmember)','Greenberg':'Jerry Greenberg (Vice Mayor to Nov 2025, then Councilmember)','Corradino':'Joseph M. Corradino (Mayor)','McDonald':'James E. McDonald (interim Councilmember, Seat 3, from May 2026)','Abbott':'Katie Abbott (Councilmember; left the council Nov 2024)','Hochkammer':'Anna Hochkammer (Vice Mayor 2022-23, Councilmember; left the council Nov 2024)'},
 meeting_url=murl,
 agenda_note='Agenda only; no minutes posted',
 sources=[{'name':'Pinecrest Legistar Web API (events and agenda items)','url':'https://webapi.legistar.com/v1/pinecrest/events'},
          {'name':'Approved minutes PDFs attached to the next regular meeting consent agenda (legistar1.granicus.com/Pinecrest/attachments)','url':'https://pinecrest.legistar.com/Calendar.aspx'}],
 gaps=[
  {'from':'2022-11-08','to':'2024-12-31','issue':'Tenure extension (Oct 25, 2026): Fairman was elected unopposed and sworn in Nov 8, 2022 (Dec 13, 2022 minutes). Minutes Dec 2, 2022 to Dec 10, 2024 were read from the clerk minutes PDFs attached to later Legistar agendas. Minutes of Jan 10, Jan 18 and Feb 13, 2023 and of the Nov 16, 2023, Feb 7, 2024, Aug 27 and Dec 3, 2024 workshops record no private-party actions. No meetings were held Nov 2022 between the election and Dec 2.'},
  {'issue':'2022-2024 consent items carry the single consent-agenda vote. Items the minutes record as approved by "consensus" during reports (HIP Program donations) are shown with every member present voting yes, as the minutes state the Council authorized unanimously.'},
  {'issue':'2022-2024 excluded: interlocals with Miami-Dade County, Coral Gables and FDOT, grant acceptances, the Moskowitz Family Foundation donation to the police (2022-69, a gift to the village), budget and code ordinances, the village-owned 11855 SW 60 Ave land use and rezoning, deferrals (Frontier Building Mar 19, 2024; Urban Robot May 7, 2024), vice mayor selections, and two June 13, 2023 roundabout sculpture resolutions (2023-53, 2023-54) whose vendor is left blank in the minutes'},
  {'date':'2026-10-13','issue':'Minutes not yet posted (they will be attached to the next regular agenda); agenda items listed with roll null'},
  {'date':'2026-01-09','issue':'Special meeting agenda lists an offer of judgment and a settlement offer in Megladon Inc. v. Village of Pinecrest; no minutes for this special meeting were attached to any later agenda (the Feb 10, 2026 packet contains minutes of a Jan 9 workshop instead)'},
  {'date':'2025-01-16','issue':'Special site meeting (115 Street between 70 Avenue and 69 Court) has no minutes posted; no action items on its agenda'},
  {'issue':'Legistar API carries no votes, movers or tallies for Pinecrest; all votes come from the clerk minutes PDFs'},
  {'issue':'Workshops and attorney-client executive sessions (Megladon litigation, 2025-07-15 through 2026-07-14) were read; they record no actions on private parties'},
  {'issue':'Roll calls cover the five members present; McDonald (interim, from May 2026) replaced del Prado, whose column is null after April 2026'},
  {'issue':'The Jan 14, 2025 minutes header misprints the year as 2024; dated 2025-01-14 here'},
  {'issue':'Applicants for the Pinecrest Business Alternative District expansion (10420 SW 77 Avenue, 10500 SW 77 Court) are not named in the minutes'}])
