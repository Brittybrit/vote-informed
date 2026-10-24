A='https://legistar1.granicus.com/Pinecrest/attachments/'
def murl(a,b):
    if b.startswith('AGENDA:'): return b[7:]
    return A+a+'.pdf'
CFG=dict(slug='pinecrest', city='Pinecrest', body='Pinecrest Village Council',
 window={'from':'2025-01-01','to':'2026-10-13','latestRecordRead':'2026-09-22'},
 members=['del Prado','Fairman','Meyer','Greenberg','Corradino','McDonald'],
 member_names={'del Prado':'Shannon del Prado (Councilmember; left the council by April 2026)','Fairman':'Ken Fairman (Councilmember; Vice Mayor from Nov 2025)','Meyer':'Ariel Meyer (Councilmember)','Greenberg':'Jerry Greenberg (Vice Mayor to Nov 2025, then Councilmember)','Corradino':'Joseph M. Corradino (Mayor)','McDonald':'James E. McDonald (interim Councilmember, Seat 3, from May 2026)'},
 meeting_url=murl,
 agenda_note='Agenda only; no minutes posted',
 sources=[{'name':'Pinecrest Legistar Web API (events and agenda items)','url':'https://webapi.legistar.com/v1/pinecrest/events'},
          {'name':'Approved minutes PDFs attached to the next regular meeting consent agenda (legistar1.granicus.com/Pinecrest/attachments)','url':'https://pinecrest.legistar.com/Calendar.aspx'}],
 gaps=[
  {'date':'2026-10-13','issue':'Minutes not yet posted (they will be attached to the next regular agenda); agenda items listed with roll null'},
  {'date':'2026-01-09','issue':'Special meeting agenda lists an offer of judgment and a settlement offer in Megladon Inc. v. Village of Pinecrest; no minutes for this special meeting were attached to any later agenda (the Feb 10, 2026 packet contains minutes of a Jan 9 workshop instead)'},
  {'date':'2025-01-16','issue':'Special site meeting (115 Street between 70 Avenue and 69 Court) has no minutes posted; no action items on its agenda'},
  {'issue':'Legistar API carries no votes, movers or tallies for Pinecrest; all votes come from the clerk minutes PDFs'},
  {'issue':'Workshops and attorney-client executive sessions (Megladon litigation, 2025-07-15 through 2026-07-14) were read; they record no actions on private parties'},
  {'issue':'Roll calls cover the five members present; McDonald (interim, from May 2026) replaced del Prado, whose column is null after April 2026'},
  {'issue':'The Jan 14, 2025 minutes header misprints the year as 2024; dated 2025-01-14 here'},
  {'issue':'Applicants for the Pinecrest Business Alternative District expansion (10420 SW 77 Avenue, 10500 SW 77 Court) are not named in the minutes'}])
