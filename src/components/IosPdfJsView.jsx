import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

const MAX_SHEET_PAGES = 12

/**
 * Renders the PDF to canvases (no &lt;iframe&gt;), so iOS WebKit’s PDF-in-iframe black screen is avoided.
 * Pan/scroll: parent provides overflow: auto. Zoom: parent scale state re-renders at new resolution.
 */
export function IosPdfJsView({ url, vSize, scale }) {
  const [status, setStatus] = useState(/** @type {'idle' | 'loading' | 'ready' | 'error'} */ ('idle'))
  const [errorMsg, setErrorMsg] = useState('')
  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const loadingTaskRef = useRef(null)

  useEffect(() => {
    if (!url || !vSize?.w || !vSize?.h) {
      return
    }

    let cancelled = false
    setStatus('loading')
    setErrorMsg('')

    const run = async () => {
      const el = containerRef.current
      if (el) el.replaceChildren()

      const loadingTask = pdfjsLib.getDocument({ url, withCredentials: false })
      loadingTaskRef.current = loadingTask
      let pdf
      try {
        pdf = await loadingTask.promise
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setErrorMsg(
          e && typeof e === 'object' && 'message' in e ? String(e.message) : 'Could not open this PDF',
        )
        return
      }
      if (cancelled) {
        void loadingTask.destroy?.()
        return
      }

      const w = vSize.w
      const userScale = scale
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const num = Math.min(pdf.numPages, MAX_SHEET_PAGES)
      const frag = document.createDocumentFragment()

      for (let p = 1; p <= num; p += 1) {
        if (cancelled) return
        const page = await pdf.getPage(p)
        if (cancelled) return
        const pageOne = page.getViewport({ scale: 1 })
        const fit = w / pageOne.width
        const vp = page.getViewport({ scale: fit * userScale })
        const transform = dpr === 1 ? undefined : (/** @type {number[]} */ ([dpr, 0, 0, dpr, 0, 0]))
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) continue
        canvas.width = Math.floor(vp.width * dpr)
        canvas.height = Math.floor(vp.height * dpr)
        canvas.style.display = 'block'
        canvas.style.width = `${Math.floor(vp.width)}px`
        canvas.style.height = `${Math.floor(vp.height)}px`
        await page
          .render(
            transform
              ? { canvasContext: ctx, viewport: vp, transform }
              : { canvasContext: ctx, viewport: vp },
          )
          .promise
        if (cancelled) return
        const row = document.createElement('div')
        row.className = 'iosPdfReader__pdfPage'
        row.appendChild(canvas)
        frag.appendChild(row)
      }

      if (cancelled) return
      if (el) {
        el.replaceChildren(frag)
      }
      setStatus('ready')
    }

    void run()

    return () => {
      cancelled = true
      const t = loadingTaskRef.current
      loadingTaskRef.current = null
      if (t) {
        void t.destroy?.()
      }
    }
  }, [url, vSize.w, vSize.h, scale])

  if (!vSize?.w) return null

  return (
    <div className="iosPdfReader__pdfRoot">
      {status === 'loading' && <div className="iosPdfReader__pdfStatus">Loading sheet…</div>}
      {status === 'error' && (
        <div className="iosPdfReader__pdfStatus iosPdfReader__pdfStatus--error">
          <p>{errorMsg}</p>
          <p className="iosPdfReader__pdfHint">Use &quot;Open in browser&quot; in the bar.</p>
        </div>
      )}
      <div ref={containerRef} className="iosPdfReader__pdfPages" aria-busy={status === 'loading'} />
    </div>
  )
}
