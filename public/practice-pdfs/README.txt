Practice sheet PDFs (bundled with the app)
==========================================

Put one PDF per exercise in this folder using the filenames below. Paths are wired in
src/lib/exerciseProgressDefaults.js (DEFAULT_SHEET_PDF_BY_EXERCISE).

  ascend.pdf                          — Ascend
  descend.pdf                         — Descend
  back-forth.pdf                      — Back+Forth
  2-strings-5-notes.pdf               — 2 strings 5 notes
  2-strings-full.pdf                  — 2 strings full
  2-strings-up-down.pdf               — 2 strings up+down
  chromatic-endurance-cycles.pdf      — Chromatic Endurance cycles
  pinky-exercise.pdf                  — Pinky exercise
  finger-independence.pdf             — Finger Independence
  cross-string-picking.pdf            — Cross String Picking

After adding or renaming files, run `npm run build` (or let Vercel rebuild on deploy).

ROY ZIV GSB (course tabs)
-------------------------
PDFs for the "ROY ZIV GSB" sheet library live in:

  practice-pdfs/royzivgsb/

The Sheet library UI nests this as a main folder "ROYZIVGSB" with section subfolders inside.
Add other top-level bundles as new entries (siblings) in:

  src/lib/practicePdfCategories.js
