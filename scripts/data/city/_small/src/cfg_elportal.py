def murl(a,b): return a
CFG=dict(slug='elportal', city='El Portal', body='El Portal Village Council',
 window={'from':'2025-01-01','to':'2026-10-24','latestRecordRead':'2026-07-30'},
 members=['Nickerson','Martin','Urbom','Lightfoot-Ward','Winters'],
 member_names={'Nickerson':'Omarr C. Nickerson (Mayor)','Martin':'Darian Martin (Vice Mayor)','Urbom':'Anders Urbom (Councilperson)','Lightfoot-Ward':'Dr. Anna E. Lightfoot-Ward (Councilperson)','Winters':'Charles Winters (Councilperson)'},
 meeting_url=murl,
 agenda_note='Agenda only; no minutes posted',
 sources=[{'name':'Village of El Portal meeting agendas and minutes (files named <Type>-<Agenda|Minutes>-YYYYMMDD.pdf)','url':'https://elportalvillage.com/village-meetings/'}],
 gaps=[
  {'issue':'El Portal "minutes" are verbatim transcripts (Full Moon Creative) without item numbers at each vote. Rolls were matched to agenda items by address or keyword and by agenda order; matched rolls carry a note and should be checked against the meeting video. Where the match failed, roll is null'},
  {'issue':'No minutes posted for 2025-11-18, 2025-12-09, 2026-03-24 or 2026-09-22; private-party agenda items from those meetings are listed with roll null'},
  {'issue':'Meeting URLs point to the village meetings page with the file name as a fragment; the PDFs sit under wp-content/uploads/<year>/<month>/'},
  {'issue':'Planning & Zoning board minutes (2025-01-21, 03-20, 06-24, 07-09, 10-28, 2026-01-22, 07-30) are a separate board and were not counted as council actions'},
  {'issue':'Excluded under the standard: Miami-Dade interlocal agreements (legal notices, recycling), speed humps, advisory boards, landscaper/asphalt proposals that name no vendor, FOP police contract, village manager hiring and contract, elections and millage'},
  {'date':'2025-03-25','issue':'Consent agenda (including the Osuna Ornamental Fences proposal) passed 3-0 but the transcript does not identify the three voters; roll null'}])
