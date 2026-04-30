/**
 * Exercise filter dropdown + entry count.
 */
export default function PracticeLogFilterBar({
  filterExercise,
  onFilterExerciseChange,
  exerciseOptions,
  entryCount,
}) {
  return (
    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="metronome__label mb-0 max-w-md">
        Filter by exercise
        <select
          className="metronome__select"
          value={filterExercise}
          onChange={(e) => onFilterExerciseChange(e.target.value)}
        >
          <option value="">All</option>
          {exerciseOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <div className="text-xs text-[var(--text)]">{entryCount} entries</div>
    </div>
  )
}
