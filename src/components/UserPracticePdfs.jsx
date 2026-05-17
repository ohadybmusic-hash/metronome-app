import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/useAuth.js'
import { PracticePdfLink } from '../context/IosPdfReaderContext.jsx'
import {
  deleteUserPracticePdf,
  listUserPracticePdfs,
  resolvePracticePdfUrl,
  uploadUserPracticePdf,
} from '../lib/practicePdfPrivateStorage.js'

const MAX_FILE_BYTES = 5 * 1024 * 1024

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * "My sheets" — lists, uploads, and deletes the signed-in user's PDFs from
 * the private practice-pdfs-private bucket under their own folder.
 */
export function UserPracticePdfs() {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const [items, setItems] = useState(/** @type {Array<{name: string, key: string, size: number, updatedAt: string}>} */ ([]))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const refresh = useCallback(async () => {
    if (!user) return
    const list = await listUserPracticePdfs(user)
    setItems(list)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!user) return null

  const onUploadClick = () => fileInputRef.current?.click?.()

  const onFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)

    if (file.type && file.type !== 'application/pdf') {
      setError('Only PDF files are allowed.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`File is ${formatSize(file.size)} — please keep it under ${formatSize(MAX_FILE_BYTES)}.`)
      return
    }

    setBusy(true)
    const { error: upErr } = await uploadUserPracticePdf(user, file)
    setBusy(false)
    if (upErr) {
      setError(upErr)
      return
    }
    await refresh()
  }

  const onDelete = async (key) => {
    if (!window.confirm('Delete this sheet?')) return
    setBusy(true)
    const { error: delErr } = await deleteUserPracticePdf(user, key)
    setBusy(false)
    if (delErr) {
      setError(delErr)
      return
    }
    await refresh()
  }

  return (
    <div className="practicePdfLib__userSheets">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          My sheets
        </p>
        <button
          type="button"
          className="metronome__btn metronome__btn--primary !py-1.5 !text-[11px]"
          onClick={onUploadClick}
          disabled={busy}
        >
          {busy ? 'Working…' : 'Upload PDF'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={onFileChange}
        />
      </div>

      {error ? (
        <p className="mt-2 rounded-md border border-error/40 bg-error/10 px-2 py-1 text-[11px] text-error">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-2 text-xs text-on-surface-variant">
          No uploads yet. Tap <strong>Upload PDF</strong> to add a sheet — only you can see it.
        </p>
      ) : (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <li
              key={it.key}
              className="flex flex-col gap-1.5 rounded-xl border border-hairline bg-surface-container-high p-2.5 text-sm"
            >
              <span className="leading-snug text-on-surface">{it.name}</span>
              <span className="text-[10px] text-on-surface-variant">{formatSize(it.size)}</span>
              <div className="flex flex-wrap gap-2">
                <PracticePdfLink
                  className="metronome__btn metronome__btn--primary !no-underline !py-1.5 !text-[11px]"
                  href={`/practice-pdfs/${it.key}`}
                  resolveHref={() => resolvePracticePdfUrl(it.key)}
                  title={it.name}
                  onClick={(e) => e.stopPropagation()}
                >
                  Open PDF
                </PracticePdfLink>
                <button
                  type="button"
                  className="metronome__btn !py-1.5 !text-[11px]"
                  onClick={() => onDelete(it.key)}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
