# Prior offices slice prior-cities-south (started 2026-10-25)
People: Luis Gonzalez (Hialeah), Ivan Pacheco (Medley), Lucia Baez-Geller (MDCPS School Board D3), David M. Singer (Palmetto Bay),
Ana Maria Rodriguez (Doral), Mary Ann Mixon (Cutler Bay), Luis F. de la Cruz (Key Biscayne), Scott Singer (Boca Raton).
Resume notes: one line per finished batch. Work files (downloads, OCR) in the session scratchpad; sources kept in src/ here.

## Access notes
- Hialeah: AgendaCenter (City Council catID=9) has minutes only from 2018. DocumentCenter has signed resolutions 2007-2017 and
  ordinances 2008-2017 with the clerk's vote line at the foot ("adopted by a 5-0-2 vote with ... voting Yes"). Works via curl:
  folder tree POST /DocumentCenter/Home/_AjaxLoadingReact?type=0 {"value":<folder>,"loadSource":7};
  documents POST /DocumentCenter/Home/Document_AjaxBinding?renderMode=0&loadSource=7 {"folderId":..,"getDocuments":1,"rowsPerPage":2000,...}.
  Folders: Resolutions 2007..2017 = 154..164; Ordinances 2007..2017 = 139,138,137,136,135,134,133,132,131,130,127. 2005-2006: none online.

## Log
- 2026-10-25: Gonzalez current Group II seat (appointed Jan 27, 2026) already fully covered by scripts/data/city/hialeah (cities-c). Nothing to add.
- 2026-10-26T00:12Z Hialeah Group V: resolutions 2013-2017 built (decisions-2013/2014/2015/2016-2017.txt, land-use rows auto from P&Z resolutions; vote parser tools/hlvote2.py + roll-overrides). Ordinances 2013-2017 waiting on date OCR. School Board: schoolboard/actions.json 383 actions, all rolls unknown (excerpts only); donors 2020 CSV saved.
- 2026-10-26T00:23Z Cutler Bay (Mixon): Town Clerk's Resolutions/Ordinances Registers carry each member's vote; parsed (src/cutlerbay/parse_register.py -> register.json); 239 actions 2010-11-17..2018-11-05, owners from PA. eSCRIBE files are behind a browser check (needs-browser).
- 2026-10-26T00:46Z Hialeah Group V: 2008-2012 added (parsed.json re-parsed after OCR; seats per clerk lines: Bovo to R2008-154/O2008-75, Cue-Fuente after; Yedra to R2011-122/O2011-78, Lozano after). Ordinance rolls read by hand at 300 dpi (roll-overrides.txt). 2007 waiting on OCR.
- 2026-10-26T00:47Z Doral 2010-11..2015-12: decisions-2010-2015.txt (hand, to Jan 2012) + decisions-2010-2015-auto.txt (pattern-extracted from minutes captions, junk removed); owners from PA. 990 actions total 2010-2018.
- 2026-10-26T00:52Z Key Biscayne (de la Cruz): 105 Granicus minutes PDFs (scans) OCR'd; 277 titled items parsed with named rolls; 98 qualifying actions (src/keybiscayne). Donors not online.
- 2026-10-26T01:05Z Hialeah: 2007 added; ~140 missing vote lines recovered by 300 dpi OCR (roll-overrides.txt); 1028 actions, 2007-01..2017-11.
