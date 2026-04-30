import { useEffect, useState } from 'react'
import { normalizeExerciseLabel } from '../../lib/exerciseProgressUi.js'

/**
 * @param {object} props
 * @param {string[]} props.customExerciseNames
 * @param {{ libId: string, sectionTitle: string, label: string, value: string }[]} props.sectionChoices
 * @param {{ id: string, label: string }[]} props.visibleLibraries
 * @param {(name: string, placement: { libId: string, sectionTitle: string }) => boolean} props.onAddName
 * @param {(name: string) => void} props.onRemoveName
 * @param {number} [props.draftSyncKey] — when positive and changes, copy `draftInitialFromForm` into the name field
 * @param {string} [props.draftInitialFromForm]
 * @param {() => void} [props.onSuccessfulAddToList]
 */
export default function CustomExerciseNamesPanel({
  customExerciseNames,
  sectionChoices,
  visibleLibraries,
  onAddName,
  onRemoveName,
  draftSyncKey = 0,
  draftInitialFromForm = '',
  onSuccessfulAddToList,
}) {
  const [draft, setDraft] = useState('')
  const [addHint, setAddHint] = useState(/** @type {string | null} */ (null))
  /** Set after a successful "Add to list"; offers Cancel (dismiss) or Delete (undo add). */
  const [lastAdded, setLastAdded] = useState(/** @type {string | null} */ (null))
  const [folderMode, setFolderMode] = useState(/** @type {'existing' | 'new'} */ ('existing'))
  const [selectedExistingValue, setSelectedExistingValue] = useState('')
  const [newFolderTitle, setNewFolderTitle] = useState('')
  const [newFolderLibId, setNewFolderLibId] = useState('')

  useEffect(() => {
    if (!lastAdded) return
    const stillThere = customExerciseNames.some(
      (n) => normalizeExerciseLabel(n) === normalizeExerciseLabel(lastAdded),
    )
    if (!stillThere) setLastAdded(null)
  }, [customExerciseNames, lastAdded])

  useEffect(() => {
    const first = sectionChoices[0]?.value ?? ''
    setSelectedExistingValue((prev) => (prev && sectionChoices.some((c) => c.value === prev) ? prev : first))
  }, [sectionChoices])

  useEffect(() => {
    if (!visibleLibraries.length) return
    setNewFolderLibId((prev) =>
      prev && visibleLibraries.some((l) => l.id === prev) ? prev : visibleLibraries[0].id,
    )
  }, [visibleLibraries])

  useEffect(() => {
    if (draftSyncKey < 1) return
    setDraft(draftInitialFromForm)
    setAddHint(null)
  }, [draftSyncKey, draftInitialFromForm])

  const submitAdd = (ev) => {
    ev.preventDefault()
    const t = draft.trim()
    if (!t) return

    /** @type {{ libId: string, sectionTitle: string } | null} */
    let placement = null
    if (folderMode === 'existing') {
      const v = selectedExistingValue
      const sep = v.indexOf(':::')
      if (sep < 0 || !sectionChoices.length) {
        setAddHint('Choose an existing folder.')
        return
      }
      placement = {
        libId: v.slice(0, sep),
        sectionTitle: v.slice(sep + 3),
      }
    } else {
      const title = normalizeExerciseLabel(newFolderTitle)
      if (!title) {
        setAddHint('Enter a name for the new folder.')
        return
      }
      const libId = newFolderLibId || visibleLibraries[0]?.id
      if (!libId) {
        setAddHint('No sheet library is available.')
        return
      }
      placement = { libId, sectionTitle: title }
    }

    const ok = onAddName(t, placement)
    if (ok) {
      const normalized = normalizeExerciseLabel(t)
      setDraft('')
      setAddHint(null)
      setNewFolderTitle('')
      setLastAdded(normalized)
      onSuccessfulAddToList?.()
    } else {
      setAddHint('That name is already in your list or matches a sheet library exercise.')
    }
  }

  return (
    <div
      id="custom-exercise-manage-panel"
      className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2,var(--surface))] p-4"
    >
      <div className="text-sm font-medium text-[var(--text-h)]">Custom exercise names</div>
      <p className="mt-1 text-xs text-[var(--text)]">
        Pick a folder, enter the exercise name, then press Add to list. From the log form, use Save next
        to the custom name to open this panel with the name filled in.
      </p>

      <fieldset className="mt-4 space-y-3 border-0 p-0">
        <legend className="mb-1 text-xs font-medium text-[var(--text-h)]">
          In the sheet library, put this exercise…
        </legend>
        <label className="flex cursor-pointer items-start gap-2 text-xs text-[var(--text)]">
          <input
            type="radio"
            className="mt-0.5"
            name="customExerciseFolderMode"
            checked={folderMode === 'existing'}
            onChange={() => setFolderMode('existing')}
          />
          <span>
            <span className="font-medium text-[var(--text-h)]">In an existing folder</span>
            {folderMode === 'existing' && sectionChoices.length > 0 ? (
              <select
                className="metronome__select mt-2 block w-full max-w-lg"
                value={selectedExistingValue}
                onChange={(e) => setSelectedExistingValue(e.target.value)}
                aria-label="Existing sheet library folder"
              >
                {sectionChoices.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : null}
            {folderMode === 'existing' && sectionChoices.length === 0 ? (
              <span className="mt-1 block text-[var(--text)]">No folders available.</span>
            ) : null}
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-xs text-[var(--text)]">
          <input
            type="radio"
            className="mt-0.5"
            name="customExerciseFolderMode"
            checked={folderMode === 'new'}
            onChange={() => setFolderMode('new')}
          />
          <span className="min-w-0 flex-1">
            <span className="font-medium text-[var(--text-h)]">In a new library folder</span>
            {folderMode === 'new' ? (
              <div className="mt-2 flex flex-col gap-2 sm:max-w-lg">
                {visibleLibraries.length > 1 ? (
                  <label className="metronome__label !text-xs">
                    Course / bundle
                    <select
                      className="metronome__select w-full"
                      value={newFolderLibId}
                      onChange={(e) => setNewFolderLibId(e.target.value)}
                    >
                      {visibleLibraries.map((lib) => (
                        <option key={lib.id} value={lib.id}>
                          {lib.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="metronome__label !text-xs">
                  New folder name
                  <input
                    type="text"
                    className="metronome__select w-full"
                    value={newFolderTitle}
                    onChange={(e) => {
                      setNewFolderTitle(e.target.value)
                      if (addHint) setAddHint(null)
                    }}
                    placeholder="e.g. Warm-ups"
                    autoComplete="off"
                  />
                </label>
              </div>
            ) : null}
          </span>
        </label>
      </fieldset>

      <form
        onSubmit={submitAdd}
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <label className="metronome__label min-w-0 flex-1 sm:max-w-md">
          New custom exercise
          <input
            type="text"
            className="metronome__select w-full"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (addHint) setAddHint(null)
            }}
            placeholder="e.g. Warm-up pattern"
            autoComplete="off"
          />
        </label>
        <button type="submit" className="metronome__btn metronome__btn--primary self-start sm:self-auto">
          Add to list
        </button>
      </form>
      {addHint ? <p className="mt-2 text-xs text-[var(--text)]">{addHint}</p> : null}

      {lastAdded ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]">
          <span>
            Added <span className="font-medium text-[var(--text-h)]">“{lastAdded}”</span> to your list.
          </span>
          <button
            type="button"
            className="metronome__btn !py-1 !text-[11px]"
            onClick={() => {
              onRemoveName(lastAdded)
              setLastAdded(null)
            }}
          >
            Delete
          </button>
          <button
            type="button"
            className="metronome__linkBtn !text-[11px]"
            onClick={() => setLastAdded(null)}
          >
            Cancel
          </button>
        </div>
      ) : null}

      {customExerciseNames.length === 0 ? (
        <div className="mt-3 text-xs text-[var(--text)]">No custom names yet.</div>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {customExerciseNames.map((n) => (
            <li
              key={n}
              className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text-h)]"
            >
              <span>{n}</span>
              <button
                type="button"
                className="metronome__linkBtn !p-0 !text-[10px]"
                onClick={() => onRemoveName(n)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
