import { PracticePdfLink } from '../../context/IosPdfReaderContext.jsx'

/**
 * Desktop table of practice log entries.
 */
export default function PracticeLogTableDesktop({
  entries,
  resolvePdfUrl,
  formatDisplayDate,
  onEdit,
  onDelete,
}) {
  return (
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
          {entries.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center text-[var(--text)]">
                No entries yet. Log a session above.
              </td>
            </tr>
          ) : (
            entries.map((e) => {
              const rowPdf = resolvePdfUrl(e.exerciseName)
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
