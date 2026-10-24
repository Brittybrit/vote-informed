GR='https://southmiami.granicus.com/'
def murl(clip, doc):
    if doc.startswith('AGENDA:'): return doc[7:]
    return f'{GR}MinutesViewer.php?view_id=2&clip_id={clip}&doc_id={doc}'
CFG=dict(slug='southmiami', city='South Miami', body='South Miami City Commission',
 window={'from':'2025-01-01','to':'2026-10-20','latestRecordRead':'2026-10-06'},
 members=['Bonich','Calle','Corey','Fernandez','Rodriguez'],
 member_names={'Bonich':'Lisa Bonich (Commissioner)','Calle':'Steve Calle (Commissioner)','Corey':'Brian Corey (Vice Mayor)','Fernandez':'Javier Fernández (Mayor)','Rodriguez':'Danny Rodriguez (Commissioner)'},
 meeting_url=murl,
 agenda_note='Agenda only; no minutes or after-action summary posted',
 sources=[{'name':'South Miami Granicus meeting archive (ViewPublisher view 2)','url':GR+'ViewPublisher.php?view_id=2'},
          {'name':'After Action Summaries (clerk vote records with mover, second and roll call per item); used as the minutes source','url':GR+'ViewPublisher.php?view_id=2'}],
 gaps=[
  {'date':'2026-10-20','issue':'No minutes or after-action summary posted yet; agenda items listed with roll null','url':'https://granicus_production_attachments.s3.amazonaws.com/southmiami/b951c5ba502867a7be9f1fb0db9fcaab0.pdf'},
  {'date':'2026-05-05','issue':'No minutes or after-action summary posted on Granicus for this meeting; agenda items listed with roll null. The Subtext items were heard and decided May 19, 2026','url':'https://granicus_production_attachments.s3.amazonaws.com/southmiami/63274c40a7317e15716fa17189f609720.pdf'},
  {'date':'2026-03-17','issue':'A second, 15-minute City Commission clip (clip 1884) on this date shares the regular agenda and has no minutes; the main meeting record (clip 1885) was read'},
  {'date':'2025-05-29','issue':'Special meeting was an attorney-client session (287(g) litigation) with no public actions; no minutes posted'},
  {'date':'2025-09-16','issue':'After-action summary lists consent items 1-3 with no consent-agenda vote line; items 2 (Hycon Investments) and 3 (Sport Surfaces) carry roll null'},
  {'date':'2025-11-18','issue':'Tentative plat for 6240 SW 65 Avenue (item 7) has no outcome line after the companion variance was deferred; both were approved Dec 2, 2025, so item 7 is not listed separately'},
  {'issue':'Several site-specific land-use items name only an address; applicant left blank unless a companion item names the developer or owner'},
  {'issue':'After-action summaries were used as the vote record; full minutes exist for some 2025 meetings but give the same votes'}])
