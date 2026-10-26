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
