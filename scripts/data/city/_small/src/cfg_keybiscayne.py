def murl(a,b): return a
CFG=dict(slug='keybiscayne', city='Key Biscayne', body='Key Biscayne Village Council',
 window={'from':'2025-01-01','to':'2026-10-24','latestRecordRead':'2026-05-14'},
 members=['Bracken','Caplan','London','Stoner','Vazquez','Sardinas','Rasco'],
 member_names={'Bracken':'Michael F. Bracken (Councilmember)','Caplan':'Franklin H. Caplan (Councilmember)','London':'Edward London (Councilmember)','Stoner':'Nancy Stoner (Councilmember)','Vazquez':'Fernando A. Vazquez (Councilmember)','Sardinas':'Oscar Sardinas (Vice Mayor)','Rasco':'Joe I. Rasco (Mayor)'},
 meeting_url=murl,
 agenda_note='Agenda only; minutes not posted on Granicus',
 sources=[{'name':'Key Biscayne Granicus ViewPublisher (council agendas, minutes, packets)','url':'https://keybiscayne.granicus.com/ViewPublisher.php?view_id=1'},
          {'name':'Minutes PDFs (MinutesViewer) and agenda packets (CloudFront) linked from Granicus','url':'https://keybiscayne.granicus.com/ViewPublisher.php?view_id=1'}],
 gaps=[
  {'issue':'Granicus posts minutes for only 12 of the 2025-2026 meetings (2025-01-14 regular and LPA, 2025-02-11, 2025-03-18, 2025-04-08, 2025-05-13 regular and LPA, 2025-06-10, 2025-07-01, 2026-02-10, 2026-04-14, 2026-05-14). Minutes are not included in later agenda packets. Every other council meeting from 2025-08-19 through 2026-10-13, and the 2025-01-28 special meeting, is agenda-only; their private-party agenda items are listed with roll null'},
  {'issue':'Several minutes PDFs are scans with OCR noise; rolls were read from the "voting Yes / voting No" lists and checked by hand for split votes'},
  {'date':'2025-07-01','issue':'Councilmember Bracken recused himself on the 12-22-24 Crandon Boulevard site plan; he is marked absent in that roll'},
  {'issue':'Applicants or owners are not named in titles for the variances at 920 Mariner Drive and 640 South Mashta Drive, or for the 101 Harbor Drive rezoning'},
  {'issue':'Workshops (infrastructure, undergrounding, shoreline, swale, budget, Zone 1) take no votes and are not listed'},
  {'issue':'Excluded under the standard: FDEP, FEMA, NOAA, FIND, UASI and county grant and interlocal items, School Board joint use, Supervisor of Elections polling agreement, police union contracts, code amendments and budgets'}])
