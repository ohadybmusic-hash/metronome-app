import { PracticeSheetPdfEmbed } from '../PracticeSheetPdfEmbed.jsx'
import { PracticePdfLink } from '../../context/IosPdfReaderContext.jsx'
import { CUSTOM_VALUE } from '../../lib/exerciseProgressUi.js'
import { practiceOb, practiceObsidianChrome } from '../../lib/practiceObsidianUi.js'

/**
 * Add / edit practice log entry (grid form + sheet URL + metronome BPM shortcuts).
 */
export default function LogSessionForm({
  visualLayout,
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
  const ob = practiceObsidianChrome(visualLayout)
  const formClass = ob
    ? practiceOb.form
    : 'mb-8 grid w-full min-w-0 max-w-full gap-4 overflow-hidden rounded-2xl border border-hairline bg-surface-container-low p-4 sm:grid-cols-2 lg:grid-cols-3'

  const lbl = (extra = '') => (ob ? `${practiceOb.fieldGrid} ${extra}` : `metronome__label ${extra}`)

  const cap = (text) =>
    ob ? <span className={practiceOb.fieldCaption}>{text}</span> : text

  const inp = () => (ob ? practiceOb.control : 'metronome__select w-full')
  const btnP = () => (ob ? practiceOb.btnPrimary : 'metronome__btn metronome__btn--primary')
  const btnG = () => (ob ? practiceOb.btnGhost : 'metronome__btn')
  const link = () => (ob ? practiceOb.linkBtn : 'metronome__linkBtn')
  const btnSmall = (base) => `${base} !py-1.5 !text-[12px]`

  return (
    <form onSubmit={onSubmit} className={formClass}>
      <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-2">
        <div className={`text-sm font-medium ${ob ? 'text-chrome' : 'text-on-surface'}`}>
          {editingId ? 'Edit entry' : 'Log session'}
        </div>
        {editingId ? (
          <button type="button" className={link()} onClick={onCancelEdit}>
            Cancel edit
          </button>
        ) : null}
      </div>

      <label className={lbl()}>
        {cap('Date')}
        <input
          type="date"
          className={inp()}
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          required
        />
      </label>

      <label className={lbl('sm:col-span-2')}>
        {cap('Exercise')}
        <select
          className={ob ? `${practiceOb.control} w-full` : 'metronome__select w-full'}
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
          <label className={lbl('sm:col-span-2 lg:col-span-3')}>
            {cap('Custom exercise name')}
            <input
              id="practice-log-custom-exercise-name"
              type="text"
              className={inp()}
              value={customNameInput}
              onChange={(e) => onCustomNameInputChange(e.target.value)}
              placeholder="e.g. Chromatic — new variation"
              required
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={btnSmall(btnP())}
              disabled={!String(customNameInput ?? '').trim()}
              onClick={() => onSaveCustomOpensManage?.()}
            >
              Save
            </button>
            <button
              type="button"
              className={btnSmall(btnG())}
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
              className={btnSmall(btnG())}
              onClick={() => onCancelCustomExercise?.()}
            >
              Cancel
            </button>
          </div>
          {logFormHint ? (
            <p className="sm:col-span-2 lg:col-span-3 text-xs text-on-surface-variant">{logFormHint}</p>
          ) : null}
        </>
      ) : null}

      <div
        className={
          ob
            ? `${practiceOb.fieldGrid} sm:col-span-2 lg:col-span-3 space-y-2 rounded-ds border border-hairline bg-surface-container-lowest/80 p-3`
            : 'metronome__label sm:col-span-2 lg:col-span-3 space-y-2'
        }
      >
        <span className={`block ${ob ? practiceOb.fieldCaption : ''}`}>
          Sheet music (PDF)
          {resolvedExerciseName ? (
            <span className={ob ? ' font-normal text-on-surface-variant' : ' text-on-surface-variant'}>
              {' '}
              · {resolvedExerciseName}
            </span>
          ) : null}
        </span>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="text"
            inputMode="url"
            autoComplete="off"
            className={ob ? `${practiceOb.control} min-w-0 flex-1 sm:max-w-xl` : 'metronome__select min-w-0 flex-1 sm:max-w-xl'}
            value={sheetUrlDraft}
            onChange={(e) => onSheetUrlDraftChange(e.target.value)}
            placeholder="https://…/score.pdf or /practice-pdfs/your-file.pdf"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnG()}
              disabled={!resolvedExerciseName}
              onClick={() => onSaveSheetUrl()}
            >
              Save link
            </button>
            <button
              type="button"
              className={btnG()}
              disabled={!resolvedExerciseName}
              onClick={() => onClearSavedSheet()}
            >
              Clear saved
            </button>
            {formPdfSrc ? (
              <PracticePdfLink
                className={ob ? `${practiceOb.btnPrimary} !no-underline` : 'metronome__btn metronome__btn--primary !no-underline'}
                href={formPdfSrc}
                title={resolvedExerciseName || 'Sheet'}
              >
                Open PDF
              </PracticePdfLink>
            ) : null}
            {formPdfSrc ? (
              <button type="button" className={btnG()} onClick={() => onToggleFormPdf()}>
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
              iframeClassName="h-[min(70vh,520px)] w-full border-0 bg-surface-dim"
            />
          </div>
        ) : null}
      </div>

      <label className={lbl()}>
        {cap('Last tempo (BPM)')}
        <input
          type="number"
          min="1"
          max="400"
          step="1"
          className={inp()}
          value={lastTempo}
          onChange={(e) => onLastTempoChange(e.target.value)}
          placeholder="—"
        />
      </label>

      <label className={lbl()}>
        {cap('Max tempo (BPM)')}
        <input
          type="number"
          min="1"
          max="400"
          step="1"
          className={inp()}
          value={maxTempo}
          onChange={(e) => onMaxTempoChange(e.target.value)}
          placeholder="—"
        />
      </label>

      {bpm != null ? (
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-1">
          <button type="button" className={btnG()} onClick={() => onLastTempoChange(String(bpm))}>
            Metronome → Last
          </button>
          <button type="button" className={btnG()} onClick={() => onMaxTempoChange(String(bpm))}>
            Metronome → Max
          </button>
        </div>
      ) : null}

      <label className={lbl()}>
        {cap('Sets')}
        <input
          type="number"
          min="0"
          step="1"
          className={inp()}
          value={sets}
          onChange={(e) => onSetsChange(e.target.value)}
          placeholder="—"
        />
      </label>

      <label className={lbl()}>
        {cap('Accuracy (%)')}
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          className={inp()}
          value={accuracyRate}
          onChange={(e) => onAccuracyRateChange(e.target.value)}
          placeholder="—"
        />
      </label>

      <label className={lbl('sm:col-span-2 lg:col-span-3')}>
        {cap('Notes')}
        <textarea
          className={ob ? practiceOb.textarea : 'metronome__select min-h-[4.5rem] w-full resize-y py-2'}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Session notes…"
          rows={3}
        />
      </label>

      <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-2">
        <button type="submit" className={btnP()}>
          {editingId ? 'Save changes' : 'Add entry'}
        </button>
      </div>
    </form>
  )
}
