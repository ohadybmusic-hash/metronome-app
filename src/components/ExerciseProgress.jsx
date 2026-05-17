import './Metronome.css'
import { useExerciseProgress } from '../hooks/useExerciseProgress.js'
import { useAuth } from '../context/useAuth.js'
import {
  DEFAULT_SHEET_PDF_BY_EXERCISE,
  DEFAULT_EXERCISE_NAMES,
  IMPLICIT_CUSTOM_LIBRARY_SECTION,
} from '../lib/exerciseProgressDefaults.js'
import {
  getVisiblePracticePdfLibraries,
  libraryExerciseTitleToPdfPath,
  listLibraryExerciseTitlesInOrder,
  listLibrarySectionChoices,
  userHasVisiblePracticeSheetLibrary,
  PRACTICE_PDF_LIBRARIES,
} from '../lib/practicePdfCategories.js'
import {
  CUSTOM_VALUE,
  formatDisplayDate,
  normalizeExerciseLabel,
  pdfUrlForPreview,
  parseOptNumber,
  resolveExercisePdfUrl,
} from '../lib/exerciseProgressUi.js'
import { practiceOb, practiceObsidianChrome } from '../lib/practiceObsidianUi.js'
import PracticePdfLibrary from './PracticePdfLibrary.jsx'
import CustomExerciseNamesPanel from './exerciseProgress/CustomExerciseNamesPanel.jsx'
import LogSessionForm from './exerciseProgress/LogSessionForm.jsx'
import PracticeLogCardsMobile from './exerciseProgress/PracticeLogCardsMobile.jsx'
import PracticeLogFilterBar from './exerciseProgress/PracticeLogFilterBar.jsx'
import PracticeLogFilterSheetPreview from './exerciseProgress/PracticeLogFilterSheetPreview.jsx'
import PracticeLogTableDesktop from './exerciseProgress/PracticeLogTableDesktop.jsx'
import { useCallback, useEffect, useMemo, useState } from 'react'

export default function ExerciseProgress({ met, userId, exerciseRemote, exerciseProgressRef, visualLayout }) {
  const { user } = useAuth()
  const ob = visualLayout === 'obsidian'
  const sw = visualLayout === 'synthwave'
  const pOb = practiceObsidianChrome(visualLayout)
  const isLocalhostPreview =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  const practiceLogEnabled = isLocalhostPreview || userHasVisiblePracticeSheetLibrary(user?.email)
  const visibleLibs = useMemo(() => {
    if (isLocalhostPreview) return PRACTICE_PDF_LIBRARIES
    return getVisiblePracticePdfLibraries(user?.email)
  }, [isLocalhostPreview, user?.email])
  const presetExerciseNames = useMemo(
    () => (practiceLogEnabled ? listLibraryExerciseTitlesInOrder(visibleLibs) : null),
    [practiceLogEnabled, visibleLibs],
  )
  const sheetDefaults = useMemo(() => {
    const fromLib = libraryExerciseTitleToPdfPath(visibleLibs)
    return { ...DEFAULT_SHEET_PDF_BY_EXERCISE, ...fromLib }
  }, [visibleLibs])

  const sectionChoices = useMemo(() => listLibrarySectionChoices(visibleLibs), [visibleLibs])

  const implicitCustomPlacement = useMemo(() => {
    const lib = visibleLibs[0]
    if (!lib) return null
    return { libId: lib.id, sectionTitle: IMPLICIT_CUSTOM_LIBRARY_SECTION }
  }, [visibleLibs])

  const scheduleUserDataSync = met?.scheduleUserDataSync
  const {
    entries,
    exerciseOptions,
    customExerciseNames,
    customExercisePlacements,
    addCustomExerciseName,
    removeCustomExerciseName,
    sheetsByExercise,
    setSheetPdfUrl,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useExerciseProgress({
    userId,
    exerciseRemote,
    exerciseProgressRef,
    scheduleUserDataSync,
    practiceLogEnabled,
    presetExerciseNames,
    implicitCustomPlacement,
  })

  const thisWeekCount = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000
    return entries.filter((e) => {
      const t = e.date ? new Date(e.date).getTime() : NaN
      return !Number.isNaN(t) && t >= cutoff
    }).length
  }, [entries])

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const [date, setDate] = useState(today)
  const [exerciseSelect, setExerciseSelect] = useState(
    () => DEFAULT_EXERCISE_NAMES[0] ?? '',
  )
  const [customNameInput, setCustomNameInput] = useState('')
  const [lastTempo, setLastTempo] = useState('')
  const [maxTempo, setMaxTempo] = useState('')
  const [sets, setSets] = useState('')
  const [accuracyRate, setAccuracyRate] = useState('')
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [filterExercise, setFilterExercise] = useState('')
  const [manageOpen, setManageOpen] = useState(false)
  /** Bump with Manage panel open + `manageDraftInitial` to copy log-form name into the panel. */
  const [manageDraftSyncKey, setManageDraftSyncKey] = useState(0)
  const [manageDraftInitial, setManageDraftInitial] = useState('')
  const [logFormHint, setLogFormHint] = useState(/** @type {string | null} */ (null))
  const [sheetUrlDraft, setSheetUrlDraft] = useState('')
  const [showFormPdf, setShowFormPdf] = useState(false)
  const [showFilterPdf, setShowFilterPdf] = useState(false)

  const bpm = met?.bpm != null ? Math.round(met.bpm) : null

  const openManageWithDraft = useCallback((initialDraft) => {
    setManageOpen(true)
    setManageDraftInitial(initialDraft)
    setManageDraftSyncKey((k) => k + 1)
    setLogFormHint(null)
  }, [])

  useEffect(() => {
    if (!manageOpen || manageDraftSyncKey < 1) return
    const id = requestAnimationFrame(() => {
      document.getElementById('custom-exercise-manage-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
    return () => cancelAnimationFrame(id)
  }, [manageOpen, manageDraftSyncKey])

  useEffect(() => {
    setLogFormHint(null)
  }, [customNameInput, exerciseSelect])

  useEffect(() => {
    if (!practiceLogEnabled || !presetExerciseNames?.length) return
    setExerciseSelect((prev) => {
      if (prev === CUSTOM_VALUE) return prev
      if (presetExerciseNames.includes(prev)) return prev
      return presetExerciseNames[0]
    })
  }, [practiceLogEnabled, presetExerciseNames])

  const resolvedExerciseName =
    exerciseSelect === CUSTOM_VALUE ? customNameInput.trim() : exerciseSelect.trim()

  useEffect(() => {
    if (!resolvedExerciseName) {
      setSheetUrlDraft('')
      return
    }
    const saved = sheetsByExercise[resolvedExerciseName]?.pdfUrl?.trim()
    const def = sheetDefaults[resolvedExerciseName]
    const d = def && String(def).trim() ? String(def).trim() : ''
    setSheetUrlDraft(saved || d || '')
  }, [resolvedExerciseName, sheetsByExercise, sheetDefaults])

  const formPdfSrc = pdfUrlForPreview(
    sheetUrlDraft,
    resolvedExerciseName,
    sheetsByExercise,
    sheetDefaults,
  )
  const filterPdfSrc = filterExercise
    ? resolveExercisePdfUrl(filterExercise, sheetsByExercise, sheetDefaults)
    : ''

  const filteredEntries = useMemo(() => {
    if (!filterExercise) return entries
    return entries.filter((e) => e.exerciseName === filterExercise)
  }, [entries, filterExercise])

  const customNameIsOnSavedList = useMemo(() => {
    if (exerciseSelect !== CUSTOM_VALUE) return false
    const r = normalizeExerciseLabel(customNameInput)
    if (!r) return false
    return customExerciseNames.some((n) => normalizeExerciseLabel(n) === r)
  }, [exerciseSelect, customNameInput, customExerciseNames])

  const cancelCustomExerciseMode = () => {
    setExerciseSelect(
      presetExerciseNames?.[0] ?? DEFAULT_EXERCISE_NAMES[0] ?? exerciseOptions[0] ?? '',
    )
    setCustomNameInput('')
  }

  const deleteCurrentCustomFromList = () => {
    const r = normalizeExerciseLabel(customNameInput)
    if (!r) return
    removeCustomExerciseName(r)
    cancelCustomExerciseMode()
  }

  const resetForm = () => {
    setDate(today)
    setExerciseSelect(
      presetExerciseNames?.[0] ?? DEFAULT_EXERCISE_NAMES[0] ?? exerciseOptions[0] ?? '',
    )
    setCustomNameInput('')
    setLastTempo('')
    setMaxTempo('')
    setSets('')
    setAccuracyRate('')
    setNotes('')
    setEditingId(null)
  }

  const loadEntryForEdit = (e) => {
    setEditingId(e.id)
    setDate(e.date || today)
    const inList = exerciseOptions.includes(e.exerciseName)
    if (inList) {
      setExerciseSelect(e.exerciseName)
      setCustomNameInput('')
    } else {
      setExerciseSelect(CUSTOM_VALUE)
      setCustomNameInput(e.exerciseName)
    }
    setLastTempo(e.lastTempo != null ? String(e.lastTempo) : '')
    setMaxTempo(e.maxTempo != null ? String(e.maxTempo) : '')
    setSets(e.sets != null ? String(e.sets) : '')
    setAccuracyRate(e.accuracyRate != null ? String(e.accuracyRate) : '')
    setNotes(e.notes ?? '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = (ev) => {
    ev.preventDefault()
    setLogFormHint(null)
    let name = resolvedExerciseName
    if (!name) return

    if (exerciseSelect === CUSTOM_VALUE) {
      const r = normalizeExerciseLabel(customNameInput)
      const onSavedList = customExerciseNames.some((n) => normalizeExerciseLabel(n) === r)
      if (editingId) {
        const prevEntry = entries.find((e) => e.id === editingId)
        const prevName = prevEntry ? normalizeExerciseLabel(prevEntry.exerciseName) : ''
        const nameUnchanged = prevName === r
        if (!nameUnchanged && !onSavedList) {
          setLogFormHint(
            'Save the new name first: press Save below to open Manage list, pick a folder, and Add to list.',
          )
          return
        }
      } else if (!onSavedList) {
        setLogFormHint(
          'Save this exercise first: press Save below to open Manage list, pick a folder, and Add to list. Then add your log entry.',
        )
        return
      }
    }

    const row = {
      date,
      exerciseName: name,
      lastTempo: parseOptNumber(lastTempo),
      maxTempo: parseOptNumber(maxTempo),
      sets: parseOptNumber(sets),
      accuracyRate: parseOptNumber(accuracyRate),
      notes,
    }

    if (editingId) {
      updateEntry(editingId, row)
    } else {
      addEntry(row)
    }
    resetForm()
  }

  const onDelete = (id) => {
    if (!window.confirm('Remove this log entry?')) return
    deleteEntry(id)
    if (editingId === id) resetForm()
  }

  const resolveRowPdf = (exerciseName) =>
    resolveExercisePdfUrl(exerciseName, sheetsByExercise, sheetDefaults)

  if (!practiceLogEnabled) {
    return (
      <div
        className={`exerciseProgress ${
          ob
            ? 'rounded-ds-lg border border-hairline bg-surface-container-low p-6 shadow-[var(--ds-shadow)]'
            : sw
              ? 'rounded-ds-lg border border-cyan-400/20 bg-surface-container-low/60 p-6 font-space-grotesk'
              : ''
        }`}
      >
        <div className="text-xl font-semibold tracking-tight">Practice log</div>
        <p className="mt-3 max-w-lg text-sm text-on-surface-variant">
          Session logs are tied to your sheet library. Sign in with the account that has course
          access to log practice against those PDFs. Without library access, no log entries are
          stored or shown.
        </p>
      </div>
    )
  }

  return (
    <div className="exerciseProgress">
      {ob ? (
        <section className="mb-4 rounded-ds-lg border-t border-hairline bg-surface-container-low p-4 shadow-[var(--ds-shadow)]">
          <p className="font-label-caps text-[10px] tracking-[0.2em] text-chrome/85">Practice log</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-ds border border-hairline bg-surface-container-lowest p-3">
              <div className="text-[9px] font-bold uppercase tracking-widest text-chrome/70">Total sessions</div>
              <div className="mt-1 font-mono text-2xl tabular-nums text-chrome">{entries.length}</div>
            </div>
            <div className="rounded-ds border border-hairline bg-surface-container-lowest p-3">
              <div className="text-[9px] font-bold uppercase tracking-widest text-chrome/70">Last 7 days</div>
              <div className="mt-1 font-mono text-2xl tabular-nums text-chrome">{thisWeekCount}</div>
            </div>
          </div>
        </section>
      ) : null}
      {sw ? (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-ds border border-cyan-400/25 bg-surface-container-low/40 p-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-cyan-400/75">Sessions</div>
            <div className="mt-1 font-mono text-2xl tabular-nums text-cyan-200/90">{entries.length}</div>
          </div>
          <div className="rounded-ds border border-cyan-400/25 bg-surface-container-low/40 p-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-cyan-400/75">7-day</div>
            <div className="mt-1 font-mono text-2xl tabular-nums text-cyan-200/90">{thisWeekCount}</div>
          </div>
        </div>
      ) : null}

      <div
        className={
          ob || sw
            ? 'rounded-ds-lg border border-hairline bg-surface-container-lowest p-4 sm:p-5 shadow-[var(--ds-shadow)]'
            : 'contents'
        }
      >
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {ob || sw ? (
              <div className="text-sm text-on-surface-variant">
                Custom exercises: save via <strong>Manage list</strong>, then log sessions and attach PDFs.
                {userId ? ' Synced with your account.' : null}
              </div>
            ) : (
              <>
                <div className="text-xl font-semibold tracking-tight">Practice log</div>
                <div className="mt-1 text-sm text-on-surface-variant">
                  Custom exercises must be saved via Manage list (Add custom exercise or Save in the form).
                  Then log sessions and attach PDF links as needed.
                  {userId ? ' Saved to your account (syncs with this device’s offline copy).' : null}
                </div>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            <button
              type="button"
              className={
                pOb
                  ? practiceOb.btnPrimary
                  : 'metronome__btn metronome__btn--primary'
              }
              onClick={() => {
                setEditingId(null)
                openManageWithDraft('')
              }}
            >
              Add custom exercise
            </button>
            <button
              type="button"
              className={pOb ? practiceOb.btnGhost : 'metronome__btn'}
              onClick={() => {
                if (manageOpen) {
                  setManageOpen(false)
                  setManageDraftSyncKey(0)
                  setManageDraftInitial('')
                } else {
                  setManageOpen(true)
                }
              }}
            >
              {manageOpen ? 'Close' : 'Manage'} list
            </button>
          </div>
        </div>

        <PracticePdfLibrary
          visibleLibraries={visibleLibs}
          customExerciseNames={customExerciseNames}
          customExercisePlacements={customExercisePlacements}
          sheetsByExercise={sheetsByExercise}
          visualLayout={visualLayout}
        />

        {manageOpen ? (
          <CustomExerciseNamesPanel
            visualLayout={visualLayout}
            customExerciseNames={customExerciseNames}
            sectionChoices={sectionChoices}
            visibleLibraries={visibleLibs}
            draftSyncKey={manageDraftSyncKey}
            draftInitialFromForm={manageDraftInitial}
            onSuccessfulAddToList={() => setLogFormHint(null)}
            onAddName={addCustomExerciseName}
            onRemoveName={removeCustomExerciseName}
          />
        ) : null}

        <LogSessionForm
          visualLayout={visualLayout}
          onSubmit={submit}
          editingId={editingId}
          onCancelEdit={resetForm}
          date={date}
          onDateChange={setDate}
          exerciseSelect={exerciseSelect}
          onExerciseSelectChange={setExerciseSelect}
          exerciseOptions={exerciseOptions}
          customNameInput={customNameInput}
          onCustomNameInputChange={setCustomNameInput}
          resolvedExerciseName={resolvedExerciseName}
          sheetUrlDraft={sheetUrlDraft}
          onSheetUrlDraftChange={setSheetUrlDraft}
          onSaveSheetUrl={() => setSheetPdfUrl(resolvedExerciseName, sheetUrlDraft)}
          onClearSavedSheet={() => {
            setSheetPdfUrl(resolvedExerciseName, '')
            const d = sheetDefaults[resolvedExerciseName]
            setSheetUrlDraft(d && String(d).trim() ? String(d).trim() : '')
          }}
          formPdfSrc={formPdfSrc}
          showFormPdf={showFormPdf}
          onToggleFormPdf={() => setShowFormPdf((v) => !v)}
          lastTempo={lastTempo}
          onLastTempoChange={setLastTempo}
          maxTempo={maxTempo}
          onMaxTempoChange={setMaxTempo}
          sets={sets}
          onSetsChange={setSets}
          accuracyRate={accuracyRate}
          onAccuracyRateChange={setAccuracyRate}
          notes={notes}
          onNotesChange={setNotes}
          bpm={bpm}
          onCancelCustomExercise={cancelCustomExerciseMode}
          onDeleteCustomExerciseFromList={deleteCurrentCustomFromList}
          onSaveCustomOpensManage={() => {
            const n = normalizeExerciseLabel(customNameInput)
            if (!n) return
            openManageWithDraft(n)
          }}
          onClearCustomNameInput={() => setCustomNameInput('')}
          customNameIsOnSavedList={customNameIsOnSavedList}
          logFormHint={logFormHint}
        />

        <PracticeLogFilterBar
          visualLayout={visualLayout}
          filterExercise={filterExercise}
          onFilterExerciseChange={setFilterExercise}
          exerciseOptions={exerciseOptions}
          entryCount={filteredEntries.length}
        />

        <PracticeLogFilterSheetPreview
          visualLayout={visualLayout}
          filterExercise={filterExercise}
          filterPdfSrc={filterPdfSrc}
          showFilterPdf={showFilterPdf}
          onToggleFilterPdf={() => setShowFilterPdf((v) => !v)}
        />

        <PracticeLogTableDesktop
          visualLayout={visualLayout}
          entries={filteredEntries}
          resolvePdfUrl={resolveRowPdf}
          formatDisplayDate={formatDisplayDate}
          onEdit={loadEntryForEdit}
          onDelete={onDelete}
        />

        <PracticeLogCardsMobile
          visualLayout={visualLayout}
          entries={filteredEntries}
          resolvePdfUrl={resolveRowPdf}
          formatDisplayDate={formatDisplayDate}
          onEdit={loadEntryForEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}
