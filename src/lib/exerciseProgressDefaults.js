/**
 * Bundled sheet music: add PDFs under `public/practice-pdfs/` using the filenames in README.txt
 * there. Until a file exists, its link will 404 until you add it. Per-user URLs in the app override these.
 * @type {Record<string, string>}
 */
export const DEFAULT_SHEET_PDF_BY_EXERCISE = {
  Ascend: '/practice-pdfs/ascend.pdf',
  Descend: '/practice-pdfs/descend.pdf',
  'Back+Forth': '/practice-pdfs/back-forth.pdf',
  '2 strings 5 notes': '/practice-pdfs/2-strings-5-notes.pdf',
  '2 strings full': '/practice-pdfs/2-strings-full.pdf',
  '2 strings up+down': '/practice-pdfs/2-strings-up-down.pdf',
  'Chromatic Endurance cycles': '/practice-pdfs/chromatic-endurance-cycles.pdf',
  'Pinky exercise': '/practice-pdfs/pinky-exercise.pdf',
  'Finger Independence': '/practice-pdfs/finger-independence.pdf',
  'Cross String Picking': '/practice-pdfs/cross-string-picking.pdf',
}

/** Preset exercise names taken from the ROY ZIV GSB spreadsheet pattern. */
export const DEFAULT_EXERCISE_NAMES = [
  'Ascend',
  'Descend',
  'Back+Forth',
  '2 strings 5 notes',
  '2 strings full',
  '2 strings up+down',
  'Chromatic Endurance cycles',
  'Pinky exercise',
  'Finger Independence',
  'Cross String Picking',
]

export const EXERCISE_PROGRESS_STORAGE_KEY = 'metronome-app:exercise-progress:v1'

/** Guest: global key. Signed-in: per-user so device data does not leak across accounts. */
export function exerciseStorageKey(userId) {
  if (!userId) return EXERCISE_PROGRESS_STORAGE_KEY
  return `${EXERCISE_PROGRESS_STORAGE_KEY}:uid:${userId}`
}
