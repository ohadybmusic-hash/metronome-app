import { PracticePdfLink } from '../../context/IosPdfReaderContext.jsx'
import { practiceOb, practiceObsidianChrome } from '../../lib/practiceObsidianUi.js'

/**
 * Desktop table of practice log entries.
 */
export default function PracticeLogTableDesktop({
  visualLayout,
  entries,
  resolvePdfUrl,
  formatDisplayDate,
  onEdit,
  onDelete,
}) {
  const ob = practiceObsidianChrome(visualLayout)
  const wrap = ob ? practiceOb.tableWrap : 'hidden md:block overflow-x-auto rounded-2xl border border-hairline'
  const linkC = ob ? practiceOb.linkBtn : 'metronome__linkBtn !text-[11px]'

  return (
    <div className={wrap}>
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-hairline bg-surface-container-high font-mono text-[11px] uppercase tracking-wide text-on-surface-variant">
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
          {entries.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center text-on-surface-variant">
                No entries yet. Log a session above.
              </td>
            </tr>
          ) : (
            entries.map((e) => {
              const rowPdf = resolvePdfUrl(e.exerciseName)
              return (
                <tr key={e.id} className="border-b border-hairline last:border-b-0">
                  <td className="px-3 py-2 whitespace-nowrap text-on-surface">
                    {formatDisplayDate(e.date)}
                  </td>
                  <td className="px-3 py-2 text-on-surface">{e.exerciseName}</td>
                  <td className="px-3 py-2">
                    {rowPdf ? (
                      <PracticePdfLink
                        href={rowPdf}
                        className={`${linkC} !text-[11px]`}
                        title={e.exerciseName || 'Sheet'}
                      >
                        PDF
                      </PracticePdfLink>
                    ) : (
                      <span className="text-on-surface-variant">—</span>
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
                  <td className="px-3 py-2 max-w-[220px] truncate text-on-surface-variant" title={e.notes}>
                    {e.notes || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1 justify-end">
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
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
