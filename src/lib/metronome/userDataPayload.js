function normName(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * @param {unknown} raw
 * @returns {Record<string, { libId: string, sectionTitle: string }>}
 */
export function normalizeCustomExercisePlacements(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (raw))) {
    const name = normName(k)
    if (!name) continue
    if (!v || typeof v !== 'object') continue
    const rec = /** @type {Record<string, unknown>} */ (v)
    const libId = typeof rec.libId === 'string' ? rec.libId.trim() : ''
    const sectionTitle =
      typeof rec.sectionTitle === 'string' ? normName(rec.sectionTitle) : ''
    if (!libId || !sectionTitle) continue
    out[name] = { libId, sectionTitle }
  }
  return out
}

/**
 * Normalizes `user_data.data.exerciseProgress` from server or local ref shape.
 * @param {unknown} ep
 */
export function normalizeExerciseProgressPayload(ep) {
  if (!ep || typeof ep !== 'object') {
    return {
      entries: [],
      customExerciseNames: [],
      sheetsByExercise: {},
      customExercisePlacements: {},
    }
  }
  const o = /** @type {Record<string, unknown>} */ (ep)
  return {
    entries: Array.isArray(o.entries) ? o.entries : [],
    customExerciseNames: Array.isArray(o.customExerciseNames) ? o.customExerciseNames : [],
    sheetsByExercise:
      o.sheetsByExercise && typeof o.sheetsByExercise === 'object'
        ? /** @type {Record<string, unknown>} */ (o.sheetsByExercise)
        : {},
    customExercisePlacements: normalizeCustomExercisePlacements(o.customExercisePlacements),
  }
}

/**
 * Builds the `data` JSON for `user_data` upsert (not including `user_id` wrapper).
 * @param {{
 *   songs: unknown[],
 *   setlists: unknown[],
 *   activeSongId: string,
 *   activeSetlistId: string,
 *   streakCount: number,
 *   lastPracticeDate: string | null,
 *   practiceTotals: { totalSeconds: number, bpmSecondsSum: number },
 *   exerciseProgressSnapshot: unknown,
 * }} args
 */
export function buildUserDataDocument(args) {
  const {
    songs,
    setlists,
    activeSongId,
    activeSetlistId,
    streakCount,
    lastPracticeDate,
    practiceTotals,
    exerciseProgressSnapshot,
  } = args

  const exerciseProgress = normalizeExerciseProgressPayload(exerciseProgressSnapshot)

  return {
    songs,
    setlists,
    prefs: {
      activeSongId,
      activeSetlistId,
    },
    streak: {
      streak_count: Math.max(0, Math.floor(Number(streakCount) || 0)),
      last_practice_date: lastPracticeDate || null,
    },
    practice: {
      total_minutes: practiceTotals.totalSeconds / 60,
      average_bpm:
        practiceTotals.totalSeconds > 0
          ? practiceTotals.bpmSecondsSum / practiceTotals.totalSeconds
          : 0,
    },
    exerciseProgress,
    updated_at: new Date().toISOString(),
  }
}
