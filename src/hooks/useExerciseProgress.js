import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_EXERCISE_NAMES,
  exerciseStorageKey,
} from '../lib/exerciseProgressDefaults.js'
import {
  normalizeCustomExercisePlacements,
  normalizeExerciseProgressPayload,
} from '../lib/metronome/userDataPayload.js'

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeName(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeSheetsByExercise(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(raw)) {
    const name = normalizeName(k)
    if (!name) continue
    const url =
      v && typeof v === 'object' && typeof v.pdfUrl === 'string' ? v.pdfUrl.trim() : ''
    if (url) out[name] = { pdfUrl: url }
  }
  return out
}

/**
 * @param {string[]} names
 * @param {Record<string, { libId: string, sectionTitle: string }>} placements
 * @param {{ libId: string, sectionTitle: string } | null | undefined} implicit
 */
function fillMissingPlacements(names, placements, implicit) {
  if (!implicit?.libId || !implicit?.sectionTitle) return { ...placements }
  const out = { ...placements }
  for (const n of names) {
    const t = normalizeName(n)
    if (t && !out[t]) out[t] = { libId: implicit.libId, sectionTitle: implicit.sectionTitle }
  }
  return out
}

function loadState(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      return {
        entries: [],
        customExerciseNames: [],
        sheetsByExercise: {},
        customExercisePlacements: {},
      }
    }
    const parsed = JSON.parse(raw)
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      customExerciseNames: Array.isArray(parsed.customExerciseNames)
        ? parsed.customExerciseNames
        : [],
      sheetsByExercise: normalizeSheetsByExercise(parsed.sheetsByExercise),
      customExercisePlacements: normalizeCustomExercisePlacements(parsed.customExercisePlacements),
    }
  } catch {
    return {
      entries: [],
      customExerciseNames: [],
      sheetsByExercise: {},
      customExercisePlacements: {},
    }
  }
}

function serverHasLogContent(s) {
  return (s.entries?.length ?? 0) > 0 || (s.customExerciseNames?.length ?? 0) > 0
}

/**
 * @param {object} opts
 * @param {string | null} opts.userId
 * @param {{ loaded: boolean, data: object | null }} opts.exerciseRemote — from user_data load
 * @param {import('react').MutableRefObject<object> | null} [opts.exerciseProgressRef]
 * @param {() => void} [opts.scheduleUserDataSync] — persists user_data (incl. exercise snapshot)
 * @param {boolean} [opts.practiceLogEnabled] — when false, no entries, no sync, storage cleared (sheet library access)
 * @param {string[] | null} [opts.presetExerciseNames] — when set, preset list for the log (library order); else defaults
 * @param {{ libId: string, sectionTitle: string } | null} [opts.implicitCustomPlacement] — folder for log-form-only custom adds
 */
export function useExerciseProgress({
  userId,
  exerciseRemote,
  exerciseProgressRef,
  scheduleUserDataSync,
  practiceLogEnabled = true,
  presetExerciseNames = null,
  implicitCustomPlacement = null,
}) {
  const storageKey = useMemo(() => exerciseStorageKey(userId), [userId])

  const remoteSig = exerciseRemote.loaded
    ? JSON.stringify(exerciseRemote.data ?? null)
    : ''

  const [entries, setEntries] = useState([])
  const [customExerciseNames, setCustomExerciseNames] = useState([])
  const [sheetsByExercise, setSheetsByExercise] = useState({})
  const [customExercisePlacements, setCustomExercisePlacements] = useState({})

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!practiceLogEnabled) {
        setEntries([])
        setCustomExerciseNames([])
        setSheetsByExercise({})
        setCustomExercisePlacements({})
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              entries: [],
              customExerciseNames: [],
              sheetsByExercise: {},
              customExercisePlacements: {},
            }),
          )
        } catch {
          // ignore
        }
        return
      }
      const local = loadState(storageKey)
      if (!userId) {
        setEntries(local.entries)
        setCustomExerciseNames(local.customExerciseNames)
        setSheetsByExercise(local.sheetsByExercise)
        setCustomExercisePlacements(
          fillMissingPlacements(
            local.customExerciseNames,
            local.customExercisePlacements,
            implicitCustomPlacement,
          ),
        )
        return
      }
      if (!exerciseRemote.loaded) {
        setEntries(local.entries)
        setCustomExerciseNames(local.customExerciseNames)
        setSheetsByExercise(local.sheetsByExercise)
        setCustomExercisePlacements(
          fillMissingPlacements(
            local.customExerciseNames,
            local.customExercisePlacements,
            implicitCustomPlacement,
          ),
        )
        return
      }
      const server = normalizeExerciseProgressPayload(exerciseRemote.data)
      const mergedPlacementsBase = {
        ...local.customExercisePlacements,
        ...server.customExercisePlacements,
      }
      if (serverHasLogContent(server)) {
        setEntries(server.entries)
        setCustomExerciseNames(server.customExerciseNames)
        setCustomExercisePlacements(
          fillMissingPlacements(
            server.customExerciseNames,
            mergedPlacementsBase,
            implicitCustomPlacement,
          ),
        )
      } else {
        setEntries(local.entries)
        setCustomExerciseNames(local.customExerciseNames)
        setCustomExercisePlacements(
          fillMissingPlacements(
            local.customExerciseNames,
            mergedPlacementsBase,
            implicitCustomPlacement,
          ),
        )
      }
      const localSheets = local.sheetsByExercise
      const serverSheets = server.sheetsByExercise
      setSheetsByExercise({ ...localSheets, ...serverSheets })
    }, 0)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed by remoteSig
  }, [userId, storageKey, exerciseRemote.loaded, remoteSig, practiceLogEnabled, implicitCustomPlacement])

  useEffect(() => {
    if (!practiceLogEnabled) return
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          entries,
          customExerciseNames,
          sheetsByExercise,
          customExercisePlacements,
        }),
      )
    } catch {
      // ignore
    }
  }, [
    storageKey,
    entries,
    customExerciseNames,
    sheetsByExercise,
    customExercisePlacements,
    practiceLogEnabled,
  ])

  useEffect(() => {
    if (!exerciseProgressRef) return
    if (!practiceLogEnabled) {
      exerciseProgressRef.current = {
        entries: [],
        customExerciseNames: [],
        sheetsByExercise: {},
        customExercisePlacements: {},
      }
      return
    }
    exerciseProgressRef.current = {
      entries,
      customExerciseNames,
      sheetsByExercise,
      customExercisePlacements,
    }
  }, [
    entries,
    customExerciseNames,
    sheetsByExercise,
    customExercisePlacements,
    exerciseProgressRef,
    practiceLogEnabled,
  ])

  useEffect(() => {
    if (!practiceLogEnabled || !scheduleUserDataSync || !userId) return
    const t = window.setTimeout(() => scheduleUserDataSync(), 450)
    return () => window.clearTimeout(t)
  }, [
    entries,
    customExerciseNames,
    sheetsByExercise,
    customExercisePlacements,
    userId,
    scheduleUserDataSync,
    practiceLogEnabled,
  ])

  const exerciseOptions = useMemo(() => {
    if (!practiceLogEnabled) return []
    const baseList = presetExerciseNames?.length ? presetExerciseNames : DEFAULT_EXERCISE_NAMES
    const set = new Set()
    for (const n of baseList) {
      const t = normalizeName(n)
      if (t) set.add(t)
    }
    for (const n of customExerciseNames) {
      const t = normalizeName(n)
      if (t) set.add(t)
    }
    const order = new Map()
    baseList.forEach((n, i) => {
      const t = normalizeName(n)
      if (t && !order.has(t)) order.set(t, i)
    })
    return [...set].sort((a, b) => {
      const ia = order.has(a) ? /** @type {number} */ (order.get(a)) : 9999
      const ib = order.has(b) ? /** @type {number} */ (order.get(b)) : 9999
      if (ia !== ib) return ia - ib
      return a.localeCompare(b, undefined, { sensitivity: 'base' })
    })
  }, [customExerciseNames, practiceLogEnabled, presetExerciseNames])

  const setSheetPdfUrl = useCallback((name, pdfUrl) => {
    const t = normalizeName(name)
    if (!t) return
    const url = String(pdfUrl ?? '').trim()
    setSheetsByExercise((prev) => {
      const next = { ...prev }
      if (!url) {
        delete next[t]
        return next
      }
      next[t] = { pdfUrl: url }
      return next
    })
  }, [])

  const addCustomExerciseName = useCallback(
    (name, placement) => {
      const t = normalizeName(name)
      if (!t) return false
      if (
        presetExerciseNames?.length &&
        presetExerciseNames.some((x) => normalizeName(x) === t)
      ) {
        return false
      }
      const place =
        placement && placement.libId && placement.sectionTitle
          ? {
              libId: String(placement.libId).trim(),
              sectionTitle: normalizeName(placement.sectionTitle),
            }
          : implicitCustomPlacement
      if (!place?.libId || !place?.sectionTitle) return false
      let added = false
      setCustomExerciseNames((prev) => {
        if (prev.some((x) => normalizeName(x) === t)) return prev
        added = true
        return [...prev, t]
      })
      if (added) {
        setCustomExercisePlacements((prev) => ({ ...prev, [t]: { ...place } }))
      }
      return added
    },
    [presetExerciseNames, implicitCustomPlacement],
  )

  const removeCustomExerciseName = useCallback((name) => {
    const t = normalizeName(name)
    if (!t) return
    setCustomExerciseNames((prev) => prev.filter((x) => normalizeName(x) !== t))
    setSheetsByExercise((prev) => {
      if (!prev[t]) return prev
      const next = { ...prev }
      delete next[t]
      return next
    })
    setCustomExercisePlacements((prev) => {
      if (!prev[t]) return prev
      const next = { ...prev }
      delete next[t]
      return next
    })
  }, [])

  const addEntry = useCallback((row) => {
    const exerciseName = normalizeName(row.exerciseName)
    if (!exerciseName) return null
    const entry = {
      id: newId(),
      date: row.date || new Date().toISOString().slice(0, 10),
      exerciseName,
      lastTempo: row.lastTempo,
      maxTempo: row.maxTempo,
      sets: row.sets,
      accuracyRate: row.accuracyRate,
      notes: row.notes != null ? String(row.notes) : '',
    }
    setEntries((prev) => [entry, ...prev])
    return entry
  }, [])

  const updateEntry = useCallback((id, row) => {
    const exerciseName = normalizeName(row.exerciseName)
    if (!exerciseName) return false
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              date: row.date || e.date,
              exerciseName,
              lastTempo: row.lastTempo,
              maxTempo: row.maxTempo,
              sets: row.sets,
              accuracyRate: row.accuracyRate,
              notes: row.notes != null ? String(row.notes) : '',
            }
          : e,
      ),
    )
    return true
  }, [])

  const deleteEntry = useCallback((id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return {
    entries,
    exerciseOptions,
    customExerciseNames,
    customExercisePlacements,
    sheetsByExercise,
    setSheetPdfUrl,
    addCustomExerciseName,
    removeCustomExerciseName,
    addEntry,
    updateEntry,
    deleteEntry,
  }
}
