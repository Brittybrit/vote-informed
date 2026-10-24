def murl(a,b): return a
CFG=dict(slug='biscaynepark', city='Biscayne Park', body='Biscayne Park Village Commission',
 window={'from':'2025-01-01','to':'2026-10-24','latestRecordRead':'2026-09-22'},
 members=['Groth','Amsler','Huntington','Samaria','Gonzalez'],
 member_names={'Groth':'Jonathan Groth (Mayor)','Amsler':'Veronica Amsler (Commissioner; Vice Mayor in 2026)','Huntington':'Ryan Huntington (Commissioner)','Samaria':'Dan Samaria (Commissioner; Vice Mayor June-December 2025)','Gonzalez':'Art Gonzalez (Commissioner; appointed 2025-02-04 to the vacant seat, Vice Mayor early 2025)'},
 meeting_url=murl,
 agenda_note='Agenda only; minutes not posted',
 sources=[{'name':'Biscayne Park Commission Approved Minutes (2025 and 2026 lists)','url':'https://biscayneparkfl.gov/agendas'}],
 gaps=[
  {'issue':'Only approved minutes are posted; the last is the 2026-09-22 budget hearing. The October 2026 regular meeting has no minutes yet and its agenda was not located on the site'},
  {'issue':'Nine minutes PDFs are image scans (2025-01-07, 2025-04-01, 2025-11-04, 2025-12-08, 2026-01-13, 2026-02-03, 2026-03-03, 2026-04-07, 2026-05-05); they were read by OCR (Tesseract)'},
  {'issue':'Minutes give tallies ("VOTE 4-1 Amsler") rather than full roll calls. Rolls are filled in from the attendance list when the vote is unanimous of those present, or when the dissenter is named; otherwise roll is null and the tally is in the notes'},
  {'date':'2025-02-04','issue':'Commission vacancy filled by appointment of Art Gonzalez at this meeting; Mayor Groth attended by Zoom and left at 6:22 pm, so later votes are 4-0 without him'},
  {'issue':'Several awards approve "the top-ranked proposer" without naming it in the minutes (tree installation 2026-04-07, stormwater Phase II-A 2026-04-07, Log Cabin roof 2026-05-05, NE 6th Avenue medians 2026-07-09)'},
  {'issue':'Excluded under the standard: FDOT, county, mutual aid and North Miami agreements, grants, PBA MOUs, manager and police chief employment agreements, board appointments, meeting procedure changes, budgets and millage'}])
