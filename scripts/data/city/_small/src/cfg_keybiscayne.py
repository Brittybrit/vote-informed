def murl(a,b): return a
CFG=dict(slug='keybiscayne', city='Key Biscayne', body='Key Biscayne Village Council',
 window={'from':'2022-11-17','to':'2026-10-24','latestRecordRead':'2026-05-14'},
 members=['Bracken','Caplan','London','Stoner','Vazquez','Sardinas','Rasco','McCormick','Moss'],
 member_names={'Bracken':'Michael F. Bracken (Councilmember)','Caplan':'Franklin H. Caplan (Councilmember)','London':'Edward London (Councilmember)','Stoner':'Nancy Stoner (Councilmember)','Vazquez':'Fernando A. Vazquez (Councilmember)','Sardinas':'Oscar Sardinas (Vice Mayor)','Rasco':'Joe I. Rasco (Mayor)','McCormick':'Allison McCormick (Councilmember, Vice Mayor 2024; left Nov 2024)','Moss':'Brett G. Moss (Councilmember, Vice Mayor 2022-23; left Nov 2024)'},
 meeting_url=murl,
 agenda_note='Agenda only; minutes not posted on Granicus',
 sources=[{'name':'Key Biscayne Granicus ViewPublisher (council agendas, minutes, packets)','url':'https://keybiscayne.granicus.com/ViewPublisher.php?view_id=1'},
          {'name':'Minutes PDFs (MinutesViewer) and agenda packets (CloudFront) linked from Granicus','url':'https://keybiscayne.granicus.com/ViewPublisher.php?view_id=1'}],
 gaps=[
  {'from':'2022-11-17','to':'2024-12-31','issue':'Tenure extension (Oct 25, 2026): Vazquez and Sardinas were installed Nov 17, 2022. Granicus posts minutes for 30 of the 41 council meetings from Nov 29, 2022 to Dec 17, 2024 (the Nov 29 and Dec 13, 2022 minutes are scans, read by OCR). No minutes posted for: Jan 17, Feb 15 (regular), Mar 14, Sep 12, Sep 26 (budget and special) 2023; Jun 25, Sep 10, Sep 24, Oct 22, Oct 23 2024. Private-party items from those agendas are listed with roll null.'},
  {'issue':'2022-2024: the 1047 Mariner Drive variance was deferred on Jun 6, 2023 (5-2); its later disposition is not in the posted minutes (the Jul 18, 2023 minutes PDF ends with the resolution title only). The 299 Crandon Boulevard time extensions (Nov 14, 2023) are left out because the property is county library land. Chamber of Commerce, interlocal, grant and union items follow the standard.'},
  {'issue':'Granicus posts minutes for only 12 of the 2025-2026 meetings (2025-01-14 regular and LPA, 2025-02-11, 2025-03-18, 2025-04-08, 2025-05-13 regular and LPA, 2025-06-10, 2025-07-01, 2026-02-10, 2026-04-14, 2026-05-14). Minutes are not included in later agenda packets. Every other council meeting from 2025-08-19 through 2026-10-13, and the 2025-01-28 special meeting, is agenda-only; their private-party agenda items are listed with roll null'},
  {'issue':'Several minutes PDFs are scans with OCR noise; rolls were read from the "voting Yes / voting No" lists and checked by hand for split votes'},
  {'date':'2025-07-01','issue':'Councilmember Bracken recused himself on the 12-22-24 Crandon Boulevard site plan; he is marked absent in that roll'},
  {'issue':'Applicants or owners are not named in titles for the variances at 920 Mariner Drive and 640 South Mashta Drive, or for the 101 Harbor Drive rezoning'},
  {'issue':'Workshops (infrastructure, undergrounding, shoreline, swale, budget, Zone 1) take no votes and are not listed'},
  {'issue':'Excluded under the standard: FDEP, FEMA, NOAA, FIND, UASI and county grant and interlocal items, School Board joint use, Supervisor of Elections polling agreement, police union contracts, code amendments and budgets'}])
