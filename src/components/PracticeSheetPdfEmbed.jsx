import { isIOSOrIPadOS } from '../lib/device.js'
import { useIosPdfReader } from '../context/IosPdfReaderContext.jsx'

export function PracticeSheetPdfEmbed({ title, src, iframeClassName }) {
  const { openPdf } = useIosPdfReader()

  if (isIOSOrIPadOS()) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left">
        <p className="mb-3 text-sm text-[var(--text)]">
          View the score full screen. Tap <strong>Done</strong> at the top to return to Practice and the
          metronome.
        </p>
        <button
          type="button"
          className="metronome__btn metronome__btn--primary"
          onClick={() => openPdf({ url: src, title: title || 'Sheet' })}
        >
          View sheet
        </button>
      </div>
    )
  }
  return (
    <div className="exercise-pdf-embed overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
      <iframe title={title} src={src} className={iframeClassName} />
      <p className="px-2 py-1.5 text-[10px] text-[var(--text)]">
        If the frame is blank, use Open PDF — some hosts block embedding.
      </p>
    </div>
  )
}
