# Source text archive

Extracted text of every document the research read in the session working area (OCR of scanned forms and minutes, PDF text), saved Oct 27, 2026 before the area is cleared. `list.txt` lists the files; unpack with `tar -xJf scratch-text.tar.xz`. This is an interim backup until the R2 source library is set up.

## inbox/
Documents researchers saved by hand (scripts/data/sources/inbox/ on main is gitignored). Each batch is a gzip tarball
of the inbox folder split into 90 MB parts: `cat inbox/<batch>.tar.gz.part-* | tar -xz -C scripts/data/sources`.
The Archive sources workflow unpacks every batch, skips ids already archived in the catalog, and uploads the rest to R2.
