# Records that need a browser (prior-cities-north)

Each request says what to open, what to save, and where to save it. Nothing here has been fetched. After saving,
rows go into a donor CSV in the same shape as northmiamibeach/donors/*.csv (header
`report,document id,item date,Cont/Exp,name,address 1,occupation,amount,Amend. code`; candidate loans and the
candidate's own money left out; in-kind kept with Amend. code INK).

## 1. Miami Gardens campaign reports: Oliver Gilbert (2008, 2010, 2012, 2016) and Katrina Wilson (2018, 2022)
- Why: the archived candidate reports sit in the city's Laserfiche WebLink, folder 696635, which answers
  "Access denied" to scripts even though the minutes folders (86952) work. Newer filings are on EasyVote.
- Open: https://edocs.miamigardens-fl.gov/WebLink/Browse.aspx?id=696635&dbid=0&repo=Laserfiche
  and https://cityofmiamigardensfl.easyvotecampaignfinance.com/ (public candidate search).
- Find: the folders or filings for "Oliver Gilbert" (council Seat 6, 2008 and 2010 elections; mayor, 2012 and 2016
  elections) and "Katrina Wilson" (Seat 4, Nov 6, 2018 and Aug 23, 2022 elections).
- Date ranges: Gilbert Seat 6, contributions from 2006-03-26 to 2012-10-24; Gilbert mayor, from 2010-11-14 to
  2020-11-17; Wilson, from 2016-11-06 to now.
- Save: every treasurer's report PDF (each DS-DE 12 summary plus its DS-DE 13 pages) as
  scripts/data/tenure/prior-cities-north/miamigardens/donors/raw/<gilbert|wilson>_<year>_<report>.pdf.
- Then: transcribe to miamigardens/donors/gilbert_<year>.csv and wilson_<year>.csv.

## 2. Sunny Isles Beach: Dana Goldman (Seat 3 Feb 17, 2015 - Nov 16, 2021; mayor to Dec 6, 2022) and
##    Larisa Svechin (Seat 1 Nov 8, 2016 - Dec 6, 2022)
- Why: no actions and no donors could be built. The minutes and signed resolutions are in the city's Laserfiche
  (docucenter.sibfl.net), which the shell cannot reach; a WebFetch permission request for
  https://docucenter.sibfl.net/WebLink/Browse.aspx went unanswered. Campaign reports are on EasyVote only.
- Open (minutes): https://docucenter.sibfl.net/WebLink/Browse.aspx (City Clerk > Minutes > City Commission) or
  the City Clerk page at https://www.sibfl.net/ (Agendas and Minutes).
- Save: the minutes PDF of every regular and special City Commission meeting from 2015-02-17 through 2022-12-06, as
  scripts/data/tenure/prior-cities-north/sunnyisles/minutes/<yyyy-mm-dd>.pdf; plus the signed resolutions for the
  same dates if the minutes do not give each vote.
- Open (donors): https://sunnyislesbeachfl.easyvotecampaignfinance.com/ (candidate search), or the city's
  EasyVote API from that origin.
- Find: Goldman's 2015, 2016, 2020 (Seat 3) and 2021, 2022 (mayor) campaigns; Svechin's 2016 and 2020 (Seat 1)
  and 2021 mayoral campaigns. Contribution dates from 2013-02-17 (Goldman) and 2014-11-08 (Svechin) to 2022-12-06.
- Save: each report PDF as sunnyisles/donors/raw/<goldman|svechin>_<year>_<report>.pdf.

## 3. Opa-locka: Sherelean Bass (first term Nov 6, 2018 - Nov 2020) and Rose Tydus (Nov 2, 2004 - Nov 6, 2012)
- Why: CivicClerk has commission minutes only from Nov 26, 2019. Earlier minutes and all campaign reports before
  2022 are not online.
- Open: https://opalockafl.portal.civicclerk.com/ (filter: City Commission, Nov 2018 - Oct 2019; check for
  "Minutes" attachments), and the City Clerk page at https://www.opalockafl.gov/ (Agendas and Minutes, Archive).
- Save: minutes PDFs for every commission meeting 2018-11-06 .. 2019-11-25 as
  opalocka/minutes/<yyyy-mm-dd>.pdf; and, if any archive reaches back, 2004-11-02 .. 2012-11-06 for Tydus.
- Donors: if the clerk's archive lists 2018/2020 candidate reports for Bass or 2004/2008 reports for Tydus, save
  them as opalocka/donors/raw/<bass|tydus>_<year>_<report>.pdf. Otherwise this needs a public records request to
  the City Clerk (Joanna Flores), for the same years.

## 4. Biscayne Park: Daniel Samaria (Nov 6, 2018 - Nov 8, 2022)
- Why: the village posts no candidate reports, and no minutes for Nov and Dec 2018.
- Open: https://www.biscayneparkfl.gov/ (Village Clerk > Elections; Agendas and Minutes, 2018).
- Save: the Nov 2018 and Dec 2018 commission minutes as biscaynepark/minutes/<yyyy-mm-dd>.pdf; and Samaria's
  2018 campaign reports (contributions 2016-11-06 .. 2018-12-31) and any 2022 reports as
  biscaynepark/donors/raw/samaria_<year>_<report>.pdf. If not posted, a records request to the Village Clerk.

## 5. Aventura: Howard Weinberg (City Commission Seat 3, Nov 13, 2012 - Nov 13, 2018)
- Why: the Laserfiche "Candidate Information" folder (egov2.cityofaventura.com/Imaging, repo CityHall,
  folder 300157) starts with the 2020 election.
- Ask: City Clerk records request for Howard Weinberg's campaign treasurer's reports for the 2012 election and
  any 2014/2016 filings (contributions 2010-11-13 .. 2018-11-13). Save as aventura/donors/raw/weinberg_<year>_<report>.pdf.
- Also confirm whether he served before Nov 2012 (careers.jsonl says first elected 2010; the signed 2010-2012
  resolutions do not list him).

## 6. North Miami Beach: minutes before May 28, 2013; Chernoff's 2001 and 2003 reports
- Why: NovusAgenda minutes start at MinutesMeetingID 39 (May 28, 2013). Phyllis Smith (from May 2007) and
  Jay Chernoff (May 2001 - May 2009) have no actions before that. The DocumentCenter election folders start with 2005.
- Open: https://www.citynmb.com/ (City Clerk > Minutes archive / Laserfiche, if any) for council minutes
  2001-05-01 .. 2013-05-27.
- Save: one PDF per council meeting as northmiamibeach/minutes/<yyyy-mm-dd>.pdf.
- Ask (if not online): City Clerk records request for Chernoff's 2001 and 2003 campaign treasurer's reports
  (contributions 1999-05-01 .. 2003-12-31); save as northmiamibeach/donors/raw/chernoff_<year>_<report>.pdf.

## 7. Surfside: 2004 - 2009 town records and campaign reports
- Why: the town's online resolutions, agendas and minutes start in 2010. Burkett and Weinberg (Mar 2006 - Mar 2010)
  and Coto (Seat 2, Mar 16, 2004 - Mar 21, 2006) have no actions for those years, and their 2004, 2006 and 2008
  campaign reports are not online.
- Ask: Town Clerk records request for (a) signed resolutions and ordinances, or commission minutes, 2004-03-16 ..
  2009-12-31; (b) campaign treasurer's reports of Charles Burkett (2006, 2008), Howard Weinberg (2006, 2008) and
  Ruben Coto (2004). Save as surfside/minutes/<yyyy-mm-dd>.pdf and surfside/donors/raw/<name>_<year>_<report>.pdf.
