import { useEffect, useState } from 'react'
import { normalizeExerciseLabel } from '../../lib/exerciseProgressUi.js'
import { practiceOb, practiceObsidianChrome } from '../../lib/practiceObsidianUi.js'

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
  visualLayout,
  customExerciseNames,
  sectionChoices,
  visibleLibraries,
  onAddName,
  onRemoveName,
  draftSyncKey = 0,
  draftInitialFromForm = '',
  onSuccessfulAddToList,
}) {
  const ob = practiceObsidianChrome(visualLayout)
  const p = practiceOb
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
      className={
        ob
          ? p.panel
          : 'mb-6 rounded-2xl border border-hairline bg-surface-container-high p-4'
      }
    >
      <div className={`text-sm font-medium ${ob ? 'text-chrome' : 'text-on-surface'}`}>
        Custom exercise names
      </div>
      <p className="mt-1 text-xs text-on-surface-variant">
        Pick a folder, enter the exercise name, then press Add to list. From the log form, use Save next
        to the custom name to open this panel with the name filled in.
      </p>

      <fieldset className="mt-4 space-y-3 border-0 p-0">
        <legend className="mb-1 text-xs font-medium text-on-surface">
          In the sheet library, put this exercise…
        </legend>
        <label className="flex cursor-pointer items-start gap-2 text-xs text-on-surface-variant">
          <input
            type="radio"
            className="mt-0.5"
            name="customExerciseFolderMode"
            checked={folderMode === 'existing'}
            onChange={() => setFolderMode('existing')}
          />
          <span>
            <span className="font-medium text-on-surface">In an existing folder</span>
            {folderMode === 'existing' && sectionChoices.length > 0 ? (
              <select
                className={
                  ob
                    ? `${p.control} mt-2 block w-full max-w-lg`
                    : 'metronome__select mt-2 block w-full max-w-lg'
                }
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
              <span className="mt-1 block text-on-surface-variant">No folders available.</span>
            ) : null}
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-xs text-on-surface-variant">
          <input
            type="radio"
            className="mt-0.5"
            name="customExerciseFolderMode"
            checked={folderMode === 'new'}
            onChange={() => setFolderMode('new')}
          />
          <span className="min-w-0 flex-1">
            <span className="font-medium text-on-surface">In a new library folder</span>
            {folderMode === 'new' ? (
              <div className="mt-2 flex flex-col gap-2 sm:max-w-lg">
                {visibleLibraries.length > 1 ? (
                  <label className={ob ? `${p.fieldGrid} !text-xs` : 'metronome__label !text-xs'}>
                    {ob ? <span className={p.fieldCaption}>Course / bundle</span> : 'Course / bundle'}
                    <select
                      className={ob ? `${p.control} w-full` : 'metronome__select w-full'}
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
                <label className={ob ? `${p.fieldGrid} !text-xs` : 'metronome__label !text-xs'}>
                  {ob ? <span className={p.fieldCaption}>New folder name</span> : 'New folder name'}
                  <input
                    type="text"
                    className={ob ? `${p.control} w-full` : 'metronome__select w-full'}
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
        <label className={ob ? `${p.fieldGrid} min-w-0 flex-1 sm:max-w-md` : 'metronome__label min-w-0 flex-1 sm:max-w-md'}>
          {ob ? <span className={p.fieldCaption}>New custom exercise</span> : 'New custom exercise'}
          <input
            type="text"
            className={ob ? `${p.control} w-full` : 'metronome__select w-full'}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (addHint) setAddHint(null)
            }}
            placeholder="e.g. Warm-up pattern"
            autoComplete="off"
          />
        </label>
        <button
          type="submit"
          className={
            ob
              ? `${p.btnPrimary} self-start sm:self-auto`
              : 'metronome__btn metronome__btn--primary self-start sm:self-auto'
          }
        >
          Add to list
        </button>
      </form>
      {addHint ? <p className="mt-2 text-xs text-on-surface-variant">{addHint}</p> : null}

      {lastAdded ? (
        <div
          className={
            ob
              ? 'mt-3 flex flex-wrap items-center gap-2 rounded-ds border border-hairline bg-surface-container-lowest px-3 py-2 text-xs text-on-surface-variant'
              : 'mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant'
          }
        >
          <span>
            Added <span className="font-medium text-on-surface">“{lastAdded}”</span> to your list.
          </span>
          <button
            type="button"
            className={ob ? `${p.btnGhost} !py-1 !text-[11px]` : 'metronome__btn !py-1 !text-[11px]'}
            onClick={() => {
              onRemoveName(lastAdded)
              setLastAdded(null)
            }}
          >
            Delete
          </button>
          <button
            type="button"
            className={ob ? `${p.linkBtn} !text-[11px]` : 'metronome__linkBtn !text-[11px]'}
            onClick={() => setLastAdded(null)}
          >
            Cancel
          </button>
        </div>
      ) : null}

      {customExerciseNames.length === 0 ? (
        <div className="mt-3 text-xs text-on-surface-variant">No custom names yet.</div>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {customExerciseNames.map((n) => (
            <li
              key={n}
              className={
                ob
                  ? 'flex items-center gap-1 rounded-ds border border-hairline bg-surface-container-lowest px-2 py-1 text-xs text-chrome'
                  : 'flex items-center gap-1 rounded-full border border-hairline bg-surface-container-low px-2 py-1 text-xs text-on-surface'
              }
            >
              <span>{n}</span>
              <button
                type="button"
                className={ob ? `${p.linkBtn} !p-0 !text-[10px]` : 'metronome__linkBtn !p-0 !text-[10px]'}
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
