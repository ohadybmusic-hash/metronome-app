import './Metronome.css'
import { useExerciseProgress } from '../hooks/useExerciseProgress.js'
import {
  DEFAULT_EXERCISE_NAMES,
  DEFAULT_SHEET_PDF_BY_EXERCISE,
} from '../lib/exerciseProgressDefaults.js'
import PracticePdfLibrary from './PracticePdfLibrary.jsx'
import { PracticeSheetPdfEmbed } from './PracticeSheetPdfEmbed.jsx'
import { PracticePdfLink } from '../context/IosPdfReaderContext.jsx'
import { useEffect, useMemo, useState } from 'react'

const CUSTOM_VALUE = '__custom__'

function parseOptNumber(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function resolveExercisePdfUrl(exerciseName, sheetsByExercise) {
  const n = String(exerciseName ?? '').trim()
  if (!n) return ''
  const saved = sheetsByExercise[n]?.pdfUrl
  if (saved && String(saved).trim()) return String(saved).trim()
  const def = DEFAULT_SHEET_PDF_BY_EXERCISE[n]
  return def && String(def).trim() ? String(def).trim() : ''
}

function pdfUrlForPreview(draftUrl, exerciseName, sheetsByExercise) {
  const d = String(draftUrl ?? '').trim()
  if (d.startsWith('/') || /^https?:\/\//i.test(d)) return d
  return resolveExercisePdfUrl(exerciseName, sheetsByExercise)
}

function formatDisplayDate(iso) {
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

export default function ExerciseProgress({ met, userId, exerciseRemote, exerciseProgressRef }) {
  const scheduleUserDataSync = met?.scheduleUserDataSync
  const {
    entries,
    exerciseOptions,
    customExerciseNames,
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
  })

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
  const [sheetUrlDraft, setSheetUrlDraft] = useState('')
  const [showFormPdf, setShowFormPdf] = useState(false)
  const [showFilterPdf, setShowFilterPdf] = useState(false)

  const bpm = met?.bpm != null ? Math.round(met.bpm) : null

  const resolvedExerciseName =
    exerciseSelect === CUSTOM_VALUE ? customNameInput.trim() : exerciseSelect.trim()

  useEffect(() => {
    if (!resolvedExerciseName) {
      setSheetUrlDraft('')
      return
    }
    const saved = sheetsByExercise[resolvedExerciseName]?.pdfUrl?.trim()
    const def = DEFAULT_SHEET_PDF_BY_EXERCISE[resolvedExerciseName]
    const d = def && String(def).trim() ? String(def).trim() : ''
    setSheetUrlDraft(saved || d || '')
  }, [resolvedExerciseName, sheetsByExercise])

  const formPdfSrc = pdfUrlForPreview(sheetUrlDraft, resolvedExerciseName, sheetsByExercise)
  const filterPdfSrc = filterExercise
    ? resolveExercisePdfUrl(filterExercise, sheetsByExercise)
    : ''

  const filteredEntries = useMemo(() => {
    if (!filterExercise) return entries
    return entries.filter((e) => e.exerciseName === filterExercise)
  }, [entries, filterExercise])

  const resetForm = () => {
    setDate(today)
    setExerciseSelect(DEFAULT_EXERCISE_NAMES[0] ?? exerciseOptions[0] ?? '')
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
    let name = resolvedExerciseName
    if (!name) return
    if (exerciseSelect === CUSTOM_VALUE) {
      addCustomExerciseName(name)
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

  return (
    <div className="exerciseProgress">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-semibold tracking-tight">Practice log</div>
          <div className="mt-1 text-sm text-[var(--text)]">
            Track sessions like your spreadsheet: date, exercise, tempos, sets, accuracy, notes.
            Attach a PDF URL per exercise (or bundle files under{' '}
            <code className="text-[11px]">public/practice-pdfs/</code> and map names in code).
            {userId ? ' Saved to your account (syncs with this device’s offline copy).' : null}
          </div>
        </div>
        <button
          type="button"
          className="metronome__btn self-start"
          onClick={() => setManageOpen((v) => !v)}
        >
          {manageOpen ? 'Close' : 'Manage'} custom exercises
        </button>
      </div>

      <PracticePdfLibrary />

      {manageOpen ? (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2,var(--surface))] p-4">
          <div className="text-sm font-medium text-[var(--text-h)]">Custom exercise names</div>
          <p className="mt-1 text-xs text-[var(--text)]">
            Presets match your workbook (Ascend, 2 strings, etc.). Names you add here stay in the
            dropdown.
          </p>
          {customExerciseNames.length === 0 ? (
            <div className="mt-3 text-xs text-[var(--text)]">No custom names yet.</div>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {customExerciseNames.map((n) => (
                <li
                  key={n}
                  className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text-h)]"
                >
                  <span>{n}</span>
                  <button
                    type="button"
                    className="metronome__linkBtn !p-0 !text-[10px]"
                    onClick={() => removeCustomExerciseName(n)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <form
        onSubmit={submit}
        className="mb-8 grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium text-[var(--text-h)]">
            {editingId ? 'Edit entry' : 'Log session'}
          </div>
          {editingId ? (
            <button type="button" className="metronome__linkBtn" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>

        <label className="metronome__label">
          Date
          <input
            type="date"
            className="metronome__select w-full"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>

        <label className="metronome__label sm:col-span-2">
          Exercise
          <select
            className="metronome__select"
            value={exerciseSelect}
            onChange={(e) => setExerciseSelect(e.target.value)}
          >
            {exerciseOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            <option value={CUSTOM_VALUE}>＋ Custom / new name…</option>
          </select>
        </label>

        {exerciseSelect === CUSTOM_VALUE ? (
          <label className="metronome__label sm:col-span-2 lg:col-span-3">
            Custom name
            <input
              type="text"
              className="metronome__select w-full"
              value={customNameInput}
              onChange={(e) => setCustomNameInput(e.target.value)}
              placeholder="e.g. Chromatic — new variation"
              required
            />
          </label>
        ) : null}

        <div className="metronome__label sm:col-span-2 lg:col-span-3 space-y-2">
          <span className="block">
            Sheet music (PDF){' '}
            {resolvedExerciseName ? (
              <span className="text-[var(--text)]">· {resolvedExerciseName}</span>
            ) : null}
          </span>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <input
              type="text"
              inputMode="url"
              autoComplete="off"
              className="metronome__select min-w-0 flex-1 sm:max-w-xl"
              value={sheetUrlDraft}
              onChange={(e) => setSheetUrlDraft(e.target.value)}
              placeholder="https://…/score.pdf or /practice-pdfs/your-file.pdf"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="metronome__btn"
                disabled={!resolvedExerciseName}
                onClick={() => setSheetPdfUrl(resolvedExerciseName, sheetUrlDraft)}
              >
                Save link
              </button>
              <button
                type="button"
                className="metronome__btn"
                disabled={!resolvedExerciseName}
                onClick={() => {
                  setSheetPdfUrl(resolvedExerciseName, '')
                  const d = DEFAULT_SHEET_PDF_BY_EXERCISE[resolvedExerciseName]
                  setSheetUrlDraft(d && String(d).trim() ? String(d).trim() : '')
                }}
              >
                Clear saved
              </button>
              {formPdfSrc ? (
                <PracticePdfLink
                  className="metronome__btn metronome__btn--primary !no-underline"
                  href={formPdfSrc}
                  title={resolvedExerciseName || 'Sheet'}
                >
                  Open PDF
                </PracticePdfLink>
              ) : null}
              {formPdfSrc ? (
                <button
                  type="button"
                  className="metronome__btn"
                  onClick={() => setShowFormPdf((v) => !v)}
                >
                  {showFormPdf ? 'Hide' : 'Show'} preview
                </button>
              ) : null}
            </div>
          </div>
          {showFormPdf && formPdfSrc ? (
            <div className="mt-2">
              <PracticeSheetPdfEmbed
                title={`Sheet preview: ${resolvedExerciseName}`}
                src={formPdfSrc}
                iframeClassName="h-[min(70vh,520px)] w-full border-0 bg-[#2a2a2e]"
              />
            </div>
          ) : null}
        </div>

        <label className="metronome__label">
          Last tempo (BPM)
          <input
            type="number"
            min="1"
            max="400"
            step="1"
            className="metronome__select w-full"
            value={lastTempo}
            onChange={(e) => setLastTempo(e.target.value)}
            placeholder="—"
          />
        </label>

        <label className="metronome__label">
          Max tempo (BPM)
          <input
            type="number"
            min="1"
            max="400"
            step="1"
            className="metronome__select w-full"
            value={maxTempo}
            onChange={(e) => setMaxTempo(e.target.value)}
            placeholder="—"
          />
        </label>

        {bpm != null ? (
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-1">
            <button
              type="button"
              className="metronome__btn"
              onClick={() => setLastTempo(String(bpm))}
            >
              Metronome → Last
            </button>
            <button
              type="button"
              className="metronome__btn"
              onClick={() => setMaxTempo(String(bpm))}
            >
              Metronome → Max
            </button>
          </div>
        ) : null}

        <label className="metronome__label">
          Sets
          <input
            type="number"
            min="0"
            step="1"
            className="metronome__select w-full"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            placeholder="—"
          />
        </label>

        <label className="metronome__label">
          Accuracy (%)
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            className="metronome__select w-full"
            value={accuracyRate}
            onChange={(e) => setAccuracyRate(e.target.value)}
            placeholder="—"
          />
        </label>

        <label className="metronome__label sm:col-span-2 lg:col-span-3">
          Notes
          <textarea
            className="metronome__select min-h-[4.5rem] w-full resize-y py-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Session notes…"
            rows={3}
          />
        </label>

        <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-2">
          <button type="submit" className="metronome__btn metronome__btn--primary">
            {editingId ? 'Save changes' : 'Add entry'}
          </button>
        </div>
      </form>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="metronome__label mb-0 max-w-md">
          Filter by exercise
          <select
            className="metronome__select"
            value={filterExercise}
            onChange={(e) => setFilterExercise(e.target.value)}
          >
            <option value="">All</option>
            {exerciseOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="text-xs text-[var(--text)]">{filteredEntries.length} entries</div>
      </div>

      {filterExercise && filterPdfSrc ? (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium text-[var(--text-h)]">Sheet: {filterExercise}</div>
            <div className="flex flex-wrap gap-2">
              <PracticePdfLink
                className="metronome__btn metronome__btn--primary !no-underline"
                href={filterPdfSrc}
                title={filterExercise || 'Sheet'}
              >
                Open PDF
              </PracticePdfLink>
              <button
                type="button"
                className="metronome__btn"
                onClick={() => setShowFilterPdf((v) => !v)}
              >
                {showFilterPdf ? 'Hide' : 'Show'} preview
              </button>
            </div>
          </div>
          {showFilterPdf ? (
            <div className="mt-2">
              <PracticeSheetPdfEmbed
                title={`Sheet: ${filterExercise}`}
                src={filterPdfSrc}
                iframeClassName="h-[min(55vh,420px)] w-full border-0 bg-[#2a2a2e]"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2,var(--surface))] font-mono text-[11px] uppercase tracking-wide text-[var(--text)]">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Exercise</th>
              <th className="px-3 py-2 w-14">Sheet</th>
              <th className="px-3 py-2 text-right">Last</th>
              <th className="px-3 py-2 text-right">Max</th>
              <th className="px-3 py-2 text-right">Sets</th>
              <th className="px-3 py-2 text-right">Acc %</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2 w-28"> </th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-[var(--text)]">
                  No entries yet. Log a session above.
                </td>
              </tr>
            ) : (
              filteredEntries.map((e) => {
                const rowPdf = resolveExercisePdfUrl(e.exerciseName, sheetsByExercise)
                return (
                <tr key={e.id} className="border-b border-[var(--border)] last:border-b-0">
                  <td className="px-3 py-2 whitespace-nowrap text-[var(--text-h)]">
                    {formatDisplayDate(e.date)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-h)]">{e.exerciseName}</td>
                  <td className="px-3 py-2">
                    {rowPdf ? (
                      <PracticePdfLink
                        href={rowPdf}
                        className="metronome__linkBtn !text-[11px]"
                        title={e.exerciseName || 'Sheet'}
                      >
                        PDF
                      </PracticePdfLink>
                    ) : (
                      <span className="text-[var(--text)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {e.lastTempo != null ? e.lastTempo : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {e.maxTempo != null ? e.maxTempo : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {e.sets != null ? e.sets : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {e.accuracyRate != null ? e.accuracyRate : '—'}
                  </td>
                  <td className="px-3 py-2 max-w-[220px] truncate text-[var(--text)]" title={e.notes}>
                    {e.notes || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1 justify-end">
                      <button
                        type="button"
                        className="metronome__linkBtn !text-[11px]"
                        onClick={() => loadEntryForEdit(e)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="metronome__linkBtn !text-[11px]"
                        onClick={() => onDelete(e.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {filteredEntries.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text)]">
            No entries yet.
          </div>
        ) : (
          filteredEntries.map((e) => {
            const cardPdf = resolveExercisePdfUrl(e.exerciseName, sheetsByExercise)
            return (
            <div
              key={e.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-[var(--text-h)]">{e.exerciseName}</div>
                  <div className="mt-0.5 text-xs text-[var(--text)]">{formatDisplayDate(e.date)}</div>
                  {cardPdf ? (
                    <PracticePdfLink
                      href={cardPdf}
                      className="mt-1 inline-block text-xs metronome__linkBtn !p-0"
                      title={e.exerciseName || 'Sheet'}
                    >
                      Sheet PDF
                    </PracticePdfLink>
                  ) : null}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    className="metronome__linkBtn !text-[11px]"
                    onClick={() => loadEntryForEdit(e)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="metronome__linkBtn !text-[11px]"
                    onClick={() => onDelete(e.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                  <dt className="text-[var(--text)]">Last tempo</dt>
                  <dd className="tabular-nums text-[var(--text-h)]">
                    {e.lastTempo != null ? e.lastTempo : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text)]">Max tempo</dt>
                  <dd className="tabular-nums text-[var(--text-h)]">
                    {e.maxTempo != null ? e.maxTempo : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text)]">Sets</dt>
                  <dd className="tabular-nums text-[var(--text-h)]">
                    {e.sets != null ? e.sets : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text)]">Accuracy</dt>
                  <dd className="tabular-nums text-[var(--text-h)]">
                    {e.accuracyRate != null ? `${e.accuracyRate}%` : '—'}
                  </dd>
                </div>
              </dl>
              {e.notes ? (
                <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--text)]">
                  {e.notes}
                </p>
              ) : null}
            </div>
            )
          })
        )}
      </div>
    </div>
  )
}
