import { practiceOb, practiceObsidianChrome } from '../../lib/practiceObsidianUi.js'

/**
 * Exercise filter dropdown + entry count.
 */
export default function PracticeLogFilterBar({
  visualLayout,
  filterExercise,
  onFilterExerciseChange,
  exerciseOptions,
  entryCount,
}) {
  const ob = practiceObsidianChrome(visualLayout)
  return (
    <div className={ob ? practiceOb.filterBar : 'mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'}>
      <label
        className={
          ob
            ? practiceOb.filterLabel
            : 'metronome__label mb-0 max-w-md'
        }
      >
        {ob ? (
          <span className={practiceOb.fieldCaption}>Filter by exercise</span>
        ) : (
          'Filter by exercise'
        )}
        <select
          className={ob ? `${practiceOb.control} w-full max-w-md` : 'metronome__select'}
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
      <div className="text-xs text-on-surface-variant">{entryCount} entries</div>
    </div>
  )
}
