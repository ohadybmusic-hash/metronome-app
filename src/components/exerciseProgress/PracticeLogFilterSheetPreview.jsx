import { PracticeSheetPdfEmbed } from '../PracticeSheetPdfEmbed.jsx'
import { PracticePdfLink } from '../../context/IosPdfReaderContext.jsx'
import { practiceOb, practiceObsidianChrome } from '../../lib/practiceObsidianUi.js'

/**
 * When a filter exercise is selected and a sheet URL exists: open + inline preview.
 */
export default function PracticeLogFilterSheetPreview({
  visualLayout,
  filterExercise,
  filterPdfSrc,
  showFilterPdf,
  onToggleFilterPdf,
}) {
  const ob = practiceObsidianChrome(visualLayout)
  if (!filterExercise || !filterPdfSrc) return null

  return (
    <div
      className={
        ob
          ? practiceOb.sheetPreview
          : 'mb-6 rounded-2xl border border-hairline bg-surface-container-low p-3'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={`text-sm font-medium ${ob ? 'text-chrome' : 'text-on-surface'}`}>
          Sheet: {filterExercise}
        </div>
        <div className="flex flex-wrap gap-2">
          <PracticePdfLink
            className={
              ob
                ? `${practiceOb.btnPrimary} !no-underline`
                : 'metronome__btn metronome__btn--primary !no-underline'
            }
            href={filterPdfSrc}
            title={filterExercise || 'Sheet'}
          >
            Open PDF
          </PracticePdfLink>
          <button
            type="button"
            className={ob ? practiceOb.btnGhost : 'metronome__btn'}
            onClick={() => onToggleFilterPdf()}
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
            iframeClassName="h-[min(55vh,420px)] w-full border-0 bg-surface-dim"
          />
        </div>
      ) : null}
    </div>
  )
}
