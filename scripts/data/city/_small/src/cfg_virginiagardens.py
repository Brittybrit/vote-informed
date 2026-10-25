def murl(a,b): return a
CFG=dict(slug='virginiagardens', city='Virginia Gardens', body='Virginia Gardens Village Council',
 window={'from':'2023-07-20','to':'2026-10-24','latestRecordRead':'2026-09-17'},
 members=['Fernandez','Arce','Conover','Taylor-Martinez','Tur','Block'],
 member_names={'Fernandez':'Gabriel Fernandez (Council President)','Arce':'Jorge Arce (Council Member)','Conover':'Debra Conover (Council Member)','Taylor-Martinez':'Elizabeth Taylor-Martinez (Council Member)','Tur':'Michael Tur (Council Member, appointed 2026-01-26 to the seat of the late Richard Block)','Block':'Richard Block (former Council Member, died in office; seat filled 2026-01-26)'},
 meeting_url=murl,
 agenda_note='Agenda only; minutes not posted',
 sources=[{'name':'Village of Virginia Gardens Mayor & Council page (agendas and minutes, scanned PDFs)','url':'https://virginiagardens-fl.gov/mayor-council/'}],
 gaps=[
  {'issue':'The Mayor & Council page lists 2026 records only, but the village WordPress media library (wp-json/wp/v2/media) holds unlisted council minutes scans from 2023-07-20 to 2025-10-16; these were read by OCR. Arce (on council since Sept 2005), Taylor-Martinez (since 2001), Conover and Fernandez served before July 2023: no council records before 2023-07-20 are online, so their earlier tenure is not covered'},
  {'issue':'Missing months in 2023-07 .. 2025-12: no council minutes or agendas found for Dec 2023, Jun 2024, Dec 2024, Jun 2025, Aug 2025 (these may be recess months), or Dec 2025; Nov 13, 2025 regular meeting and Nov 27, 2023 final budget hearing and Aug 1, 2023 special meeting have agendas only (no private-party items on them); minutes for Mar 20, 2025, Sep 18, 2025 and Oct 16, 2025 record no resolutions'},
  {'issue':'Owners for residential variances (6250 NW 37 Ter, 6380 NW 38 Ter) are not named in the minutes; they are taken from the Miami-Dade Property Appraiser record for the folio stated in the resolution'},
  {'issue':'All minutes are image scans with no text layer; they were read by OCR (Tesseract) and checked by hand'},
  {'issue':'Mayor Fred Spencer Deno IV attends but the minutes record votes only by the five council members; he is not in the roll'},
  {'date':'2026-09-17','issue':'The posted minutes scan is missing the page with items 9-11 (resolution 11(g)1 and the administrative reports); only resolution 11(g)2 and the ordinance first reading are visible'},
  {'date':'2026-10-15','issue':'Meeting held; minutes not yet posted. The agenda has no private-party items'},
  {'issue':'The 2026-01-26 special meeting (appointment of Michael Tur) and executive session, the 2026-09-28 final budget hearing and the 2026-09-28 special meeting (police union contract) have agendas only; none has private-party items'},
  {'issue':'Excluded under the standard: FDOT local agency program agreement, statewide mutual aid, Miami-Dade urban county CDBG agreement, police collective bargaining agreements and contract negotiations (2023), interlocal agreements with Miami-Dade County (gas tax, curbside recycling), mutual aid with Miami Beach, Title VI plan, audited financial statements (WithumSmith & Brown, accepted as a report), congressional appropriation requests, employee hires and board appointments, budgets and millage'}])
