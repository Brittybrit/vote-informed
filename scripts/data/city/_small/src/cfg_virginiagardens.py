def murl(a,b): return a
CFG=dict(slug='virginiagardens', city='Virginia Gardens', body='Virginia Gardens Village Council',
 window={'from':'2025-01-01','to':'2026-10-24','latestRecordRead':'2026-09-17'},
 members=['Fernandez','Arce','Conover','Taylor-Martinez','Tur'],
 member_names={'Fernandez':'Gabriel Fernandez (Council President)','Arce':'Jorge Arce (Council Member)','Conover':'Debra Conover (Council Member)','Taylor-Martinez':'Elizabeth Taylor-Martinez (Council Member)','Tur':'Michael Tur (Council Member, appointed 2026-01-26 to the seat of the late Richard Block)'},
 meeting_url=murl,
 agenda_note='Agenda only; minutes not posted',
 sources=[{'name':'Village of Virginia Gardens Mayor & Council page (agendas and minutes, scanned PDFs)','url':'https://virginiagardens-fl.gov/mayor-council/'}],
 gaps=[
  {'issue':'The village website posts agendas and minutes for 2026 only. No 2025 council records (2025-01-01 to 2025-12-31) are online, so 2025 actions are missing entirely'},
  {'issue':'All minutes are image scans with no text layer; they were read by OCR (Tesseract) and checked by hand'},
  {'issue':'Mayor Fred Spencer Deno IV attends but the minutes record votes only by the five council members; he is not in the roll'},
  {'date':'2026-09-17','issue':'The posted minutes scan is missing the page with items 9-11 (resolution 11(g)1 and the administrative reports); only resolution 11(g)2 and the ordinance first reading are visible'},
  {'date':'2026-10-15','issue':'Meeting held; minutes not yet posted. The agenda has no private-party items'},
  {'issue':'The 2026-01-26 special meeting (appointment of Michael Tur) and executive session, the 2026-09-28 final budget hearing and the 2026-09-28 special meeting (police union contract) have agendas only; none has private-party items'},
  {'issue':'Excluded under the standard: FDOT local agency program agreement, statewide mutual aid, Miami-Dade urban county CDBG agreement, police collective bargaining agreement, employee hires and board appointments, budgets and millage'}])
