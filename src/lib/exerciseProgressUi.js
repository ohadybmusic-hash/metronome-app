import { DEFAULT_SHEET_PDF_BY_EXERCISE } from './exerciseProgressDefaults.js'

export const CUSTOM_VALUE = '__custom__'

/** Same normalization as practice log storage (matches hook). */
export function normalizeExerciseLabel(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

export function parseOptNumber(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function resolveExercisePdfUrl(
  exerciseName,
  sheetsByExercise,
  defaultPdfByExercise = DEFAULT_SHEET_PDF_BY_EXERCISE,
) {
  const n = String(exerciseName ?? '').trim()
  if (!n) return ''
  const saved = sheetsByExercise[n]?.pdfUrl
  if (saved && String(saved).trim()) return String(saved).trim()
  const def = defaultPdfByExercise[n]
  return def && String(def).trim() ? String(def).trim() : ''
}

export function pdfUrlForPreview(
  draftUrl,
  exerciseName,
  sheetsByExercise,
  defaultPdfByExercise = DEFAULT_SHEET_PDF_BY_EXERCISE,
) {
  const d = String(draftUrl ?? '').trim()
  if (d.startsWith('/') || /^https?:\/\//i.test(d)) return d
  return resolveExercisePdfUrl(exerciseName, sheetsByExercise, defaultPdfByExercise)
}

export function formatDisplayDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  try {
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}
