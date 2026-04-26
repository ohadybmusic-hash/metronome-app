import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { isIOSOrIPadOS } from '../lib/device.js'
import './IosPdfReaderOverlay.css'

const IosPdfJsView = lazy(() =>
  import('../components/IosPdfJsView.jsx').then((m) => ({ default: m.IosPdfJsView })),
)

const IosPdfReaderContext = createContext(null)

function getModalRoot() {
  if (typeof document === 'undefined') return null
  return document.getElementById('modal-root')
}

const ZOOM_MIN = 0.5
const ZOOM_MAX = 5
const ZOOM_STEP = 0.25
/**
 * >1: pinch in/out has a stronger effect than 1:1 with finger spread (feels more responsive on phone).
 * sqrt(1.1^2) not used — we use a single exponent for stretch in both directions.
 */
const PINCH_ZOOM_EXPONENT = 1.75

function touchDistance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

function toAbsoluteUrl(u) {
  if (typeof window === 'undefined') return u
  try {
    return new URL(u, window.location.href).href
  } catch {
    return u
  }
}

function IosPdfReaderOverlay({ url, title, onClose }) {
  const [scale, setScale] = useState(1)
  const [vSize, setVSize] = useState(/** @type {{ w: number, h: number } } */ ({ w: 0, h: 0 }))

  const scrollerRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const scaleRef = useRef(1)
  const pinchRef = useRef(/** @type {{ startDistance: number, startScale: number } | null} */ (null))
  const pinchRafRef = useRef(/** @type {number | null} */ (null))
  const target = getModalRoot()

  useEffect(() => {
    setScale(1)
    const id = requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo(0, 0)
    })
    return () => cancelAnimationFrame(id)
  }, [url])

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w > 0 && h > 0) setVSize({ w, h })
    }
    measure()
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [url])

  /** 2-finger pinch only. One-finger pan = native scroll on the scroller (Photos-style). */
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const onTouchStart = (e) => {
      if (e.touches.length >= 2) {
        const d = touchDistance(e.touches[0], e.touches[1])
        if (d < 8) return
        pinchRef.current = { startDistance: d, startScale: scaleRef.current }
        e.preventDefault()
      }
    }

    const onTouchMove = (e) => {
      if (e.touches.length >= 2 && pinchRef.current) {
        const d = touchDistance(e.touches[0], e.touches[1])
        if (d < 1) return
        const { startDistance, startScale } = pinchRef.current
        const stretch = Math.max(d, 0.5) / startDistance
        const next = Math.max(
          ZOOM_MIN,
          Math.min(ZOOM_MAX, startScale * stretch ** PINCH_ZOOM_EXPONENT),
        )
        if (pinchRafRef.current != null) cancelAnimationFrame(pinchRafRef.current)
        pinchRafRef.current = requestAnimationFrame(() => {
          pinchRafRef.current = null
          setScale(next)
        })
        e.preventDefault()
      }
    }

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) pinchRef.current = null
    }

    const cap = { capture: true, passive: false }
    const capPass = { capture: true, passive: true }
    el.addEventListener('touchstart', onTouchStart, cap)
    el.addEventListener('touchmove', onTouchMove, cap)
    el.addEventListener('touchend', onTouchEnd, capPass)
    el.addEventListener('touchcancel', onTouchEnd, capPass)
    return () => {
      if (pinchRafRef.current != null) {
        cancelAnimationFrame(pinchRafRef.current)
        pinchRafRef.current = null
      }
      el.removeEventListener('touchstart', onTouchStart, cap)
      el.removeEventListener('touchmove', onTouchMove, cap)
      el.removeEventListener('touchend', onTouchEnd, capPass)
      el.removeEventListener('touchcancel', onTouchEnd, capPass)
    }
  }, [url])

  if (!target) return null

  return createPortal(
    <div className="iosPdfReader" role="dialog" aria-modal="true" aria-label="PDF">
      <header className="iosPdfReader__bar">
        <button type="button" className="iosPdfReader__done" onClick={onClose}>
          Done
        </button>
        <button
          type="button"
          className="iosPdfReader__openExternal"
          aria-label="Open PDF in browser for links and selection"
          title="Open in browser (tap links, select text)"
          onClick={() => window.open(toAbsoluteUrl(url), '_blank', 'noopener,noreferrer')}
        >
          Open in browser
        </button>
        <span className="iosPdfReader__title">{title || 'Sheet'}</span>
        <div className="iosPdfReader__zoom" role="toolbar" aria-label="Zoom">
          <button
            type="button"
            className="iosPdfReader__zoomBtn"
            aria-label="Zoom out"
            disabled={scale <= ZOOM_MIN + 0.01}
            onClick={() => setScale((s) => Math.max(ZOOM_MIN, s - ZOOM_STEP))}
          >
            −
          </button>
          <span className="iosPdfReader__zoomPct" aria-live="polite">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            className="iosPdfReader__zoomBtn"
            aria-label="Zoom in"
            disabled={scale >= ZOOM_MAX - 0.01}
            onClick={() => setScale((s) => Math.min(ZOOM_MAX, s + ZOOM_STEP))}
          >
            +
          </button>
          <button
            type="button"
            className="iosPdfReader__zoomReset"
            onClick={() => {
              setScale(1)
              requestAnimationFrame(() => scrollerRef.current?.scrollTo(0, 0))
            }}
          >
            100%
          </button>
        </div>
      </header>
      <div className="iosPdfReader__frame">
        <div
          ref={scrollerRef}
          className="iosPdfReader__scroller"
          role="region"
          aria-label="Sheet preview. At 100% the whole page is visible. Pinch or use + to zoom; drag with one finger to move around like Photos. Header has zoom controls."
        >
          <Suspense
            fallback={<div className="iosPdfReader__pdfStatus">Loading viewer…</div>}
          >
            <IosPdfJsView url={toAbsoluteUrl(url)} vSize={vSize} scale={scale} />
          </Suspense>
        </div>
      </div>
    </div>,
    target,
  )
}

export function IosPdfReaderProvider({ children, onAfterClose, onReaderOpenChange }) {
  const [sheet, setSheet] = useState(/** @type {{ url: string, title: string } | null} */ (null))

  const openPdf = useCallback((opts) => {
    const u = String(opts?.url || '').trim()
    if (!u) return
    setSheet({ url: u, title: String(opts?.title || 'Sheet').trim() || 'Sheet' })
  }, [])

  const closePdf = useCallback(() => {
    setSheet(null)
    onAfterClose?.()
  }, [onAfterClose])

  useEffect(() => {
    onReaderOpenChange?.(Boolean(sheet))
  }, [sheet, onReaderOpenChange])

  useEffect(() => {
    const el = getModalRoot()
    if (!el) return
    if (sheet) el.setAttribute('data-pdf-reader', '1')
    else el.removeAttribute('data-pdf-reader')
    return () => el.removeAttribute('data-pdf-reader')
  }, [sheet])

  return (
    <IosPdfReaderContext.Provider value={{ openPdf, closePdf, isReaderOpen: Boolean(sheet) }}>
      {children}
      {sheet ? <IosPdfReaderOverlay url={sheet.url} title={sheet.title} onClose={closePdf} /> : null}
    </IosPdfReaderContext.Provider>
  )
}

export function useIosPdfReader() {
  const c = useContext(IosPdfReaderContext)
  return {
    isReaderOpen: c?.isReaderOpen ?? false,
    openPdf: (o) => {
      if (c) c.openPdf(o)
      else if (o?.url) window.open(String(o.url), '_blank', 'noopener,noreferrer')
    },
    closePdf: () => c?.closePdf(),
  }
}

export function PracticePdfLink({ href, className = '', children, title = 'Sheet', onClick }) {
  const { openPdf } = useIosPdfReader()
  if (!href) return null
  if (isIOSOrIPadOS()) {
    return (
      <button
        type="button"
        className={className}
        onClick={(e) => {
          onClick?.(e)
          if (e.defaultPrevented) return
          openPdf({ url: href, title })
        }}
      >
        {children}
      </button>
    )
  }
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
    >
      {children}
    </a>
  )
}
