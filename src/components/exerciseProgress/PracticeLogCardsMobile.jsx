import { PracticePdfLink } from '../../context/IosPdfReaderContext.jsx'
import { practiceOb, practiceObsidianChrome } from '../../lib/practiceObsidianUi.js'

/**
 * Stacked cards for practice log (mobile).
 */
export default function PracticeLogCardsMobile({
  visualLayout,
  entries,
  resolvePdfUrl,
  formatDisplayDate,
  onEdit,
  onDelete,
}) {
  const ob = practiceObsidianChrome(visualLayout)
  const linkC = ob ? practiceOb.linkBtn : 'metronome__linkBtn !text-[11px]'
  const emptyCls = ob
    ? practiceOb.mobileEmpty
    : 'rounded-2xl border border-hairline bg-surface-container-low text-center text-sm text-on-surface-variant'
  const cardCls = ob ? practiceOb.mobileCard : 'rounded-2xl border border-hairline bg-surface-container-low p-4'

  return (
    <div className="md:hidden flex flex-col gap-3">
      {entries.length === 0 ? (
        <div className={emptyCls}>No entries yet.</div>
      ) : (
        entries.map((e) => {
          const cardPdf = resolvePdfUrl(e.exerciseName)
          return (
            <div key={e.id} className={cardCls}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className={`font-medium ${ob ? 'text-chrome' : 'text-on-surface'}`}>{e.exerciseName}</div>
                  <div className="mt-0.5 text-xs text-on-surface-variant">{formatDisplayDate(e.date)}</div>
                  {cardPdf ? (
                    <PracticePdfLink
                      href={cardPdf}
                      className={`mt-1 inline-block ${linkC} !p-0 !text-xs`}
                      title={e.exerciseName || 'Sheet'}
                    >
                      Sheet PDF
                    </PracticePdfLink>
                  ) : null}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    className={`${linkC} !text-[11px]`}
                    onClick={() => onEdit(e)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${linkC} !text-[11px]`}
                    onClick={() => onDelete(e.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                  <dt className="text-on-surface-variant">Last tempo</dt>
                  <dd className="tabular-nums text-on-surface">
                    {e.lastTempo != null ? e.lastTempo : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Max tempo</dt>
                  <dd className="tabular-nums text-on-surface">
                    {e.maxTempo != null ? e.maxTempo : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Sets</dt>
                  <dd className="tabular-nums text-on-surface">
                    {e.sets != null ? e.sets : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Accuracy</dt>
                  <dd className="tabular-nums text-on-surface">
                    {e.accuracyRate != null ? `${e.accuracyRate}%` : '—'}
                  </dd>
                </div>
              </dl>
              {e.notes ? (
                <p className="mt-3 border-t border-hairline pt-3 text-xs text-on-surface-variant">
                  {e.notes}
                </p>
              ) : null}
            </div>
          )
        })
      )}
    </div>
  )
}
