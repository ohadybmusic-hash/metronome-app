import { PracticeSheetPdfEmbed } from '../PracticeSheetPdfEmbed.jsx'
import { PracticePdfLink } from '../../context/IosPdfReaderContext.jsx'
import { CUSTOM_VALUE } from '../../lib/exerciseProgressUi.js'

/**
 * Add / edit practice log entry (grid form + sheet URL + metronome BPM shortcuts).
 */
export default function LogSessionForm({
  onSubmit,
  editingId,
  onCancelEdit,
  date,
  onDateChange,
  exerciseSelect,
  onExerciseSelectChange,
  exerciseOptions,
  customNameInput,
  onCustomNameInputChange,
  resolvedExerciseName,
  sheetUrlDraft,
  onSheetUrlDraftChange,
  onSaveSheetUrl,
  onClearSavedSheet,
  formPdfSrc,
  showFormPdf,
  onToggleFormPdf,
  lastTempo,
  onLastTempoChange,
  maxTempo,
  onMaxTempoChange,
  sets,
  onSetsChange,
  accuracyRate,
  onAccuracyRateChange,
  notes,
  onNotesChange,
  bpm,
  onCancelCustomExercise,
  onDeleteCustomExerciseFromList,
  onSaveCustomOpensManage,
  onClearCustomNameInput,
  customNameIsOnSavedList,
  logFormHint,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-[var(--text-h)]">
          {editingId ? 'Edit entry' : 'Log session'}
        </div>
        {editingId ? (
          <button type="button" className="metronome__linkBtn" onClick={onCancelEdit}>
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
          onChange={(e) => onDateChange(e.target.value)}
          required
        />
      </label>

      <label className="metronome__label sm:col-span-2">
        Exercise
        <select
          className="metronome__select"
          value={exerciseSelect}
          onChange={(e) => onExerciseSelectChange(e.target.value)}
          aria-label="Exercise preset or custom"
        >
          {exerciseOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          <option value={CUSTOM_VALUE}>＋ Custom exercise (type a name below)</option>
        </select>
      </label>

      {exerciseSelect === CUSTOM_VALUE ? (
        <>
          <label className="metronome__label sm:col-span-2 lg:col-span-3">
            Custom exercise name
            <input
              id="practice-log-custom-exercise-name"
              type="text"
              className="metronome__select w-full"
              value={customNameInput}
              onChange={(e) => onCustomNameInputChange(e.target.value)}
              placeholder="e.g. Chromatic — new variation"
              required
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="metronome__btn metronome__btn--primary !py-1.5 !text-[12px]"
              disabled={!String(customNameInput ?? '').trim()}
              onClick={() => onSaveCustomOpensManage?.()}
            >
              Save
            </button>
            <button
              type="button"
              className="metronome__btn !py-1.5 !text-[12px]"
              onClick={() =>
                customNameIsOnSavedList
                  ? onDeleteCustomExerciseFromList?.()
                  : onClearCustomNameInput?.()
              }
            >
              Delete
            </button>
            <button
              type="button"
              className="metronome__btn !py-1.5 !text-[12px]"
              onClick={() => onCancelCustomExercise?.()}
            >
              Cancel
            </button>
          </div>
          {logFormHint ? (
            <p className="sm:col-span-2 lg:col-span-3 text-xs text-[var(--text)]">{logFormHint}</p>
          ) : null}
        </>
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
            onChange={(e) => onSheetUrlDraftChange(e.target.value)}
            placeholder="https://…/score.pdf or /practice-pdfs/your-file.pdf"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="metronome__btn"
              disabled={!resolvedExerciseName}
              onClick={() => onSaveSheetUrl()}
            >
              Save link
            </button>
            <button
              type="button"
              className="metronome__btn"
              disabled={!resolvedExerciseName}
              onClick={() => onClearSavedSheet()}
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
              <button type="button" className="metronome__btn" onClick={() => onToggleFormPdf()}>
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
          onChange={(e) => onLastTempoChange(e.target.value)}
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
          onChange={(e) => onMaxTempoChange(e.target.value)}
          placeholder="—"
        />
      </label>

      {bpm != null ? (
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-1">
          <button
            type="button"
            className="metronome__btn"
            onClick={() => onLastTempoChange(String(bpm))}
          >
            Metronome → Last
          </button>
          <button
            type="button"
            className="metronome__btn"
            onClick={() => onMaxTempoChange(String(bpm))}
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
          onChange={(e) => onSetsChange(e.target.value)}
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
          onChange={(e) => onAccuracyRateChange(e.target.value)}
          placeholder="—"
        />
      </label>

      <label className="metronome__label sm:col-span-2 lg:col-span-3">
        Notes
        <textarea
          className="metronome__select min-h-[4.5rem] w-full resize-y py-2"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
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
  )
}
