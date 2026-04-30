import { useLayoutEffect } from 'react'

/**
 * Sets `--bottom-nav-h` on `:root` from the real bottom nav height (safe area, font load, viewport).
 */
export function useBottomNavInsetCssVar({ showBottomNav, bottomNavRef, tab, user }) {
  useLayoutEffect(() => {
    const root = document.documentElement
    if (!showBottomNav) {
      root.style.setProperty('--bottom-nav-h', '0px')
      return () => {
        root.style.removeProperty('--bottom-nav-h')
      }
    }

    const isIOS = typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent)

    const setVar = () => {
      const nav = bottomNavRef.current
      if (!nav) {
        root.style.setProperty('--bottom-nav-h', isIOS ? '112px' : '96px')
        return
      }
      const hPx = Math.ceil(nav.getBoundingClientRect().height)
      const h = Math.max(hPx + 4 + (isIOS ? 16 : 0), isIOS ? 100 : 88)
      root.style.setProperty('--bottom-nav-h', `${h}px`)
    }

    setVar()
    requestAnimationFrame(() => {
      setVar()
      requestAnimationFrame(setVar)
    })
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        setVar()
      })
    }
    const nav = bottomNavRef.current
    const ro = typeof ResizeObserver !== 'undefined' && nav ? new ResizeObserver(setVar) : null
    if (ro && nav) ro.observe(nav)
    window.addEventListener('resize', setVar)
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (vv) {
      vv.addEventListener('resize', setVar)
      vv.addEventListener('scroll', setVar)
    }
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', setVar)
      if (vv) {
        vv.removeEventListener('resize', setVar)
        vv.removeEventListener('scroll', setVar)
      }
      root.style.removeProperty('--bottom-nav-h')
    }
  }, [showBottomNav, bottomNavRef, tab, user])
}
