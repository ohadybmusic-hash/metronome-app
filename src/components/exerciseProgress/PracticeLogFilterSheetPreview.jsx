import { PracticeSheetPdfEmbed } from '../PracticeSheetPdfEmbed.jsx'
import { PracticePdfLink } from '../../context/IosPdfReaderContext.jsx'

/**
 * When a filter exercise is selected and a sheet URL exists: open + inline preview.
 */
export default function PracticeLogFilterSheetPreview({
  filterExercise,
  filterPdfSrc,
  showFilterPdf,
  onToggleFilterPdf,
}) {
  if (!filterExercise || !filterPdfSrc) return null

  return (
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
          <button type="button" className="metronome__btn" onClick={() => onToggleFilterPdf()}>
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
  )
}
