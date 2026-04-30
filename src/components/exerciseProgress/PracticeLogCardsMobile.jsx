import { PracticePdfLink } from '../../context/IosPdfReaderContext.jsx'

/**
 * Stacked cards for practice log (mobile).
 */
export default function PracticeLogCardsMobile({
  entries,
  resolvePdfUrl,
  formatDisplayDate,
  onEdit,
  onDelete,
}) {
  return (
    <div className="md:hidden flex flex-col gap-3">
      {entries.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text)]">
          No entries yet.
        </div>
      ) : (
        entries.map((e) => {
          const cardPdf = resolvePdfUrl(e.exerciseName)
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
                    onClick={() => onEdit(e)}
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
  )
}
