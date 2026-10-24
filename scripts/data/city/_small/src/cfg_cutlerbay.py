def murl(a,b): return a
CFG=dict(slug='cutlerbay', city='Cutler Bay', body='Cutler Bay Town Council',
 window={'from':'2025-01-01','to':'2026-10-24','latestRecordRead':'2026-10-08'},
 members=['Meerbott','Callahan','Duncan','Lord','Ramirez'],
 member_names={'Meerbott':'Tim Meerbott (Mayor)','Callahan':'Michael P. Callahan (Vice Mayor)','Duncan':'Robert "BJ" Duncan (Council Member)','Lord':'Suzy Lord (Council Member)','Ramirez':'Richard M. Ramirez (Council Member)'},
 meeting_url=murl,
 agenda_note='Agenda only; minutes not yet posted',
 sources=[{'name':'Cutler Bay eSCRIBE published meetings (GetCalendarMeetings, Meeting.aspx minutes HTML)','url':'https://pub-cutlerbay-fl.escribemeetings.com/'}],
 gaps=[
  {'date':'2026-10-21','issue':'Regular meeting held but minutes not yet posted; private-party agenda items listed with roll null'},
  {'date':'2025-03-19','issue':'eSCRIBE minutes record mover, seconder and "Passed" for each motion but no member-by-member vote; roll and tally null (all five members attended)'},
  {'date':'2025-01-07','issue':'Special meeting minutes record no member votes; the only action (Legacy Park master plan revision) is town-only and was deferred'},
  {'issue':'Cutler Bay Community Fund grant resolutions name the dollar total but not the not-for-profit recipients; recipients are in the attached exhibits, which were not opened'},
  {'issue':'Consent items carry the single consent-agenda vote, which eSCRIBE repeats under each consent item'},
  {'issue':'Absent members are marked absent from the attendance block in each set of minutes'},
  {'issue':'Workshops, zoning workshops and budget hearings were read; workshops take no votes'},
  {'issue':'Excluded under the standard: interlocal agreements with Miami-Dade County and FDOT, state and federal grant acceptances, RFP/ITB issuances naming no vendor, code amendments, budgets and town-only brownfield designations (Blue Heron Park, town-owned property)'}])
