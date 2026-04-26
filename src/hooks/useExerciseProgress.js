import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_EXERCISE_NAMES,
  exerciseStorageKey,
} from '../lib/exerciseProgressDefaults.js'

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

function loadState(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      return { entries: [], customExerciseNames: [], sheetsByExercise: {} }
    }
    const parsed = JSON.parse(raw)
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      customExerciseNames: Array.isArray(parsed.customExerciseNames)
        ? parsed.customExerciseNames
        : [],
      sheetsByExercise: normalizeSheetsByExercise(parsed.sheetsByExercise),
    }
  } catch {
    return { entries: [], customExerciseNames: [], sheetsByExercise: {} }
  }
}

function normalizeRemote(data) {
  if (!data || typeof data !== 'object') {
    return { entries: [], customExerciseNames: [], sheetsByExercise: {} }
  }
  return {
    entries: Array.isArray(data.entries) ? data.entries : [],
    customExerciseNames: Array.isArray(data.customExerciseNames) ? data.customExerciseNames : [],
    sheetsByExercise: normalizeSheetsByExercise(data.sheetsByExercise),
  }
}

function serverHasLogContent(s) {
  return (s.entries?.length ?? 0) > 0 || (s.customExerciseNames?.length ?? 0) > 0
}

/**
 * @param {object} opts
 * @param {string | null} opts.userId
 * @param {{ loaded: boolean, data: object | null }} opts.exerciseRemote — from user_data load
 * @param {import('react').MutableRefObject<{ entries: unknown[], customExerciseNames: string[], sheetsByExercise: Record<string, { pdfUrl: string }> }> | null} [opts.exerciseProgressRef]
 * @param {() => void} [opts.scheduleUserDataSync] — persists user_data (incl. exercise snapshot)
 */
export function useExerciseProgress({
  userId,
  exerciseRemote,
  exerciseProgressRef,
  scheduleUserDataSync,
}) {
  const storageKey = useMemo(() => exerciseStorageKey(userId), [userId])

  const remoteSig = exerciseRemote.loaded
    ? JSON.stringify(exerciseRemote.data ?? null)
    : ''

  const [entries, setEntries] = useState([])
  const [customExerciseNames, setCustomExerciseNames] = useState([])
  const [sheetsByExercise, setSheetsByExercise] = useState({})

  useEffect(() => {
    const id = window.setTimeout(() => {
      const local = loadState(storageKey)
      if (!userId) {
        setEntries(local.entries)
        setCustomExerciseNames(local.customExerciseNames)
        setSheetsByExercise(local.sheetsByExercise)
        return
      }
      if (!exerciseRemote.loaded) {
        setEntries(local.entries)
        setCustomExerciseNames(local.customExerciseNames)
        setSheetsByExercise(local.sheetsByExercise)
        return
      }
      const server = normalizeRemote(exerciseRemote.data)
      if (serverHasLogContent(server)) {
        setEntries(server.entries)
        setCustomExerciseNames(server.customExerciseNames)
      } else {
        setEntries(local.entries)
        setCustomExerciseNames(local.customExerciseNames)
      }
      const localSheets = local.sheetsByExercise
      const serverSheets = server.sheetsByExercise
      setSheetsByExercise({ ...localSheets, ...serverSheets })
    }, 0)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed by remoteSig
  }, [userId, storageKey, exerciseRemote.loaded, remoteSig])

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ entries, customExerciseNames, sheetsByExercise }),
      )
    } catch {
      // ignore
    }
  }, [storageKey, entries, customExerciseNames, sheetsByExercise])

  useEffect(() => {
    if (!exerciseProgressRef) return
    exerciseProgressRef.current = { entries, customExerciseNames, sheetsByExercise }
  }, [entries, customExerciseNames, sheetsByExercise, exerciseProgressRef])

  useEffect(() => {
    if (!scheduleUserDataSync || !userId) return
    const t = window.setTimeout(() => scheduleUserDataSync(), 450)
    return () => window.clearTimeout(t)
  }, [entries, customExerciseNames, sheetsByExercise, userId, scheduleUserDataSync])

  const exerciseOptions = useMemo(() => {
    const set = new Set()
    for (const n of DEFAULT_EXERCISE_NAMES) {
      const t = normalizeName(n)
      if (t) set.add(t)
    }
    for (const n of customExerciseNames) {
      const t = normalizeName(n)
      if (t) set.add(t)
    }
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [customExerciseNames])

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

  const addCustomExerciseName = useCallback((name) => {
    const t = normalizeName(name)
    if (!t) return false
    setCustomExerciseNames((prev) => {
      if (prev.some((x) => normalizeName(x) === t)) return prev
      return [...prev, t]
    })
    return true
  }, [])

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
    sheetsByExercise,
    setSheetPdfUrl,
    addCustomExerciseName,
    removeCustomExerciseName,
    addEntry,
    updateEntry,
    deleteEntry,
  }
}
