import './App.css'
import Metronome from './components/Metronome.jsx'
import { Suspense, lazy } from 'react'
import AuthBar from './components/AuthBar.jsx'
import AuthGate from './components/AuthGate.jsx'
import { useAuth } from './context/useAuth'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useMetronome } from './hooks/useMetronome'
import SetlistManager from './components/SetlistManager.jsx'
import AudioSessionPrimer from './components/AudioSessionPrimer.jsx'

const Tuner = lazy(() => import('./components/Tuner.jsx'))

function App() {
  const { user } = useAuth()

  // One AudioContext for metronome + tuner. iOS was silencing a separate metronome context
  // while the Tuner’s context (getUserMedia + direct-to-destination) worked.
  const sharedAudioContextRef = useRef(null)
  const getSharedAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null
    const C = window.AudioContext || window.webkitAudioContext
    // If useMetronome or anything ever closed the shared context, create a new one; otherwise
    // the ref holds a dead AudioContext and playback is silent until a full reload.
    if (sharedAudioContextRef.current?.state === 'closed') {
      sharedAudioContextRef.current = null
    }
    if (!sharedAudioContextRef.current) {
      try {
        sharedAudioContextRef.current = new C({ latencyHint: 'interactive' })
      } catch {
        sharedAudioContextRef.current = new C()
      }
    }
    return sharedAudioContextRef.current
  }, [])

  const met = useMetronome({
    initialBpm: 120,
    initialTimeSignature: '4/4',
    initialSubdivision: 'quarter',
    getAudioContext: getSharedAudioContext,
  })
  const [stageMode, setStageMode] = useState(false)
  const [tab, setTab] = useState('metronome') // metronome | tuner | setlists | settings

  const ensureAudio = met.audio?.ensure

  // Safari / iOS / Add to Home Screen: unlock Web Audio on the first real touch anywhere so a
  // later tap on PLAY is not the only gesture that can reach the audio graph.
  useEffect(() => {
    if (!ensureAudio) return
    let didUnlock = false
    const onFirstPointer = () => {
      if (didUnlock) return
      didUnlock = true
      try {
        ensureAudio()
      } catch {
        // ignore
      }
    }
    document.addEventListener('touchstart', onFirstPointer, { capture: true, passive: true })
    document.addEventListener('pointerdown', onFirstPointer, { capture: true, passive: true })
    return () => {
      document.removeEventListener('touchstart', onFirstPointer, { capture: true })
      document.removeEventListener('pointerdown', onFirstPointer, { capture: true })
    }
  }, [ensureAudio])

  // Default to dark dashboard theme.
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark'
  }, [])

  const showBottomNav = Boolean(user)
  const bottomNavRef = useRef(null)

  // Measure real `.bottomNav` height (safe area, labels, font size). Hardcoding 96px made the
  // metronome sticky bar overlap the tab bar (z-60 over z-50) or leave a wrong gap. Match tuner: same
  // outer `pb-28` on the main column as other tabs.
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
      // getBoundingClientRect + margin avoids under-counting vs offsetHeight; extra px prevents
      // the play bar (lower z-index) from sitting under the nav and stealing/ blocking taps.
      // iOS (esp. PWA, dynamic toolbar): add margin — mis-measure makes PLAY taps hit the tab bar.
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
  }, [showBottomNav, tab, user])

  return (
    <div
      className="min-h-[100dvh] bg-[var(--bg)] text-[var(--text-h)]"
    >
      <div
        className={`mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden px-3 sm:px-8 flex flex-col items-stretch ${
          user
            ? tab === 'metronome'
              ? 'py-3 sm:py-5 pb-28'
              : 'py-6 sm:py-8 pb-28'
            : 'py-6 sm:py-8 pb-28'
        }`}
      >
        {!user ? (
          <AuthGate />
        ) : (
          <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>Loading…</div>}>
            {tab === 'metronome' ? (
              <Metronome met={met} onStageModeChange={setStageMode} minimal />
            ) : tab === 'tuner' ? (
              <Tuner getAudioContext={getSharedAudioContext} />
            ) : tab === 'setlists' ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-left">
                <div className="mb-6 flex items-center justify-between gap-6">
                  <div>
                    <div className="text-xl font-semibold tracking-tight">Setlists</div>
                    <div className="mt-1 text-sm text-[var(--text)]">Save songs and organize performance setlists.</div>
                  </div>
                </div>
                <SetlistManager met={met} stageMode={stageMode} setStageMode={setStageMode} />
              </div>
            ) : (
              <div className="mx-auto w-full min-w-0 max-w-md px-4 text-left">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
                  <div className="text-xl font-semibold tracking-tight">Settings</div>
                  <div className="mt-1 text-sm text-[var(--text)]">Account and global settings.</div>
                  <div className="mt-8 w-full min-w-0">
                    <AuthBar />
                  </div>
                </div>
              </div>
            )}
          </Suspense>
        )}
      </div>

      {showBottomNav ? (
        <nav ref={bottomNavRef} className="bottomNav" role="navigation" aria-label="Bottom navigation">
          <button type="button" className={`bottomNav__item ${tab === 'metronome' ? 'is-active' : ''}`} onClick={() => setTab('metronome')}>
            <span className="bottomNav__icon" aria-hidden="true">⏱</span>
            <span className="bottomNav__label">Metronome</span>
          </button>
          <button type="button" className={`bottomNav__item ${tab === 'tuner' ? 'is-active' : ''}`} onClick={() => setTab('tuner')}>
            <span className="bottomNav__icon" aria-hidden="true">🎛</span>
            <span className="bottomNav__label">Tuner</span>
          </button>
          <button type="button" className={`bottomNav__item ${tab === 'setlists' ? 'is-active' : ''}`} onClick={() => setTab('setlists')}>
            <span className="bottomNav__icon" aria-hidden="true">🎼</span>
            <span className="bottomNav__label">Setlists</span>
          </button>
          <button type="button" className={`bottomNav__item ${tab === 'settings' ? 'is-active' : ''}`} onClick={() => setTab('settings')}>
            <span className="bottomNav__icon" aria-hidden="true">👤</span>
            <span className="bottomNav__label">Account</span>
          </button>
        </nav>
      ) : null}

      {user ? (
        <AudioSessionPrimer
          getAudioContext={getSharedAudioContext}
          onEnsureWebAudio={ensureAudio}
          bottomOffsetPx={showBottomNav ? 88 : 0}
        />
      ) : null}
    </div>
  )
}

export default App
