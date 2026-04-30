import { useCallback, useEffect, useRef, useState } from 'react'
import { clamp } from '../lib/clamp.js'

const STORAGE_KEY = 'metronome-float-hud-pos-v1'
const DRAG_TOGGLE_PX = 8

/**
 * Draggable position for the floating metronome HUD: persisted in localStorage, clamped on resize.
 * @param {object} options
 * @param {{ current: HTMLElement | null }} options.rootRef
 * @param {() => void} options.onHandleTap  When the handle is released without a drag (toggle expanded).
 */
export function useMetronomeFloatingHudDrag({ rootRef, onHandleTap }) {
  const dragRef = useRef({
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    startLeft: 0,
    startTop: 0,
    didDrag: false,
  })

  /** null = use default bottom-right anchor */
  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const p = JSON.parse(raw)
      if (typeof p?.left === 'number' && typeof p?.top === 'number') return p
    } catch {
      /* */
    }
    return null
  })

  const persistPos = useCallback((next) => {
    setPos(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* */
    }
  }, [])

  const onHandlePointerDown = useCallback(
    (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      const el = rootRef.current
      if (!el) return
      e.preventDefault()
      e.stopPropagation()
      const rect = el.getBoundingClientRect()
      const d = dragRef.current
      d.pointerId = e.pointerId
      d.startClientX = e.clientX
      d.startClientY = e.clientY
      d.startLeft = pos ? pos.left : rect.left
      d.startTop = pos ? pos.top : rect.top
      d.didDrag = false
      if (!pos) {
        persistPos({ left: rect.left, top: rect.top })
      }
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* */
      }
    },
    [pos, persistPos, rootRef],
  )

  const onHandlePointerMove = useCallback((e) => {
    const d = dragRef.current
    if (d.pointerId !== e.pointerId) return
    const el = rootRef.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const dx = e.clientX - d.startClientX
    const dy = e.clientY - d.startClientY
    if (dx * dx + dy * dy > DRAG_TOGGLE_PX * DRAG_TOGGLE_PX) {
      d.didDrag = true
    }
    const nextLeft = clamp(d.startLeft + dx, 8, window.innerWidth - w - 8)
    const nextTop = clamp(d.startTop + dy, 8, window.innerHeight - h - 8)
    setPos({ left: nextLeft, top: nextTop })
  }, [rootRef])

  const flushPosFromDom = useCallback(() => {
    const el = rootRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    persistPos({ left: rect.left, top: rect.top })
  }, [persistPos, rootRef])

  const onHandlePointerUp = useCallback(
    (e) => {
      const d = dragRef.current
      if (d.pointerId !== e.pointerId) return
      const pid = d.pointerId
      d.pointerId = null
      try {
        e.currentTarget.releasePointerCapture(pid)
      } catch {
        /* */
      }
      if (!d.didDrag) {
        onHandleTap()
      }
      flushPosFromDom()
    },
    [flushPosFromDom, onHandleTap],
  )

  const onHandleKeyDown = useCallback(
    (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      onHandleTap()
    },
    [onHandleTap],
  )

  useEffect(() => {
    const onWin = () => {
      const el = rootRef.current
      if (!el || !pos) return
      const w = el.offsetWidth
      const h = el.offsetHeight
      const nextLeft = clamp(pos.left, 8, window.innerWidth - w - 8)
      const nextTop = clamp(pos.top, 8, window.innerHeight - h - 8)
      if (nextLeft !== pos.left || nextTop !== pos.top) {
        persistPos({ left: nextLeft, top: nextTop })
      }
    }
    window.addEventListener('resize', onWin)
    return () => window.removeEventListener('resize', onWin)
  }, [pos, persistPos, rootRef])

  return {
    pos,
    onHandlePointerDown,
    onHandlePointerMove,
    onHandlePointerUp,
    onHandleKeyDown,
  }
}
