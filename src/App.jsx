import './App.css'
import Metronome from './components/Metronome.jsx'
import { Suspense, lazy } from 'react'
import AuthGate from './components/AuthGate.jsx'
import UserAccountDrawer from './components/UserAccountDrawer.jsx'
import { useAuth } from './context/useAuth'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useMetronome } from './hooks/useMetronome'
import SetlistManager from './components/SetlistManager.jsx'
import ExerciseProgress from './components/ExerciseProgress.jsx'
import AudioSessionPrimer from './components/AudioSessionPrimer.jsx'
import SynthAppBoundary from './components/SynthAppBoundary.jsx'
import SynthApp from '@synth/App.jsx'
import MetronomeFloatingHud from './components/MetronomeFloatingHud.jsx'
import { IosPdfReaderProvider } from './context/IosPdfReaderContext.jsx'

const Tuner = lazy(() => import('./components/Tuner.jsx'))

function App() {
  const { user, authLinkError } = useAuth()
  const openedAccountForLinkErrRef = useRef(false)

  const [stageMode, setStageMode] = useState(false)
  const [tab, setTab] = useState('metronome') // metronome | tuner | setlists | practice | synth
  const exerciseProgressRef = useRef({
    entries: [],
    customExerciseNames: [],
    sheetsByExercise: {},
  })
  const [exerciseRemote, setExerciseRemote] = useState(() => ({ loaded: false, data: null }))

  const onExerciseProgressLoaded = useCallback((data) => {
    setExerciseRemote({ loaded: true, data })
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      setExerciseRemote({ loaded: false, data: null })
    }, 0)
    return () => window.clearTimeout(id)
  }, [user?.id])

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

  const runSynthFromSongRef = useRef(/** @type {(snap: object) => void} */ (() => {}))
  const pendingSongSynthRef = useRef(/** @type {object | null} */ (null))
  const met = useMetronome({
    initialBpm: 120,
    initialTimeSignature: '4/4',
    initialSubdivision: 'quarter',
    getAudioContext: getSharedAudioContext,
    synthApplierRef: runSynthFromSongRef,
    exerciseProgressRef,
    onExerciseProgressLoaded,
  })
  const metRef = useRef(met)
  metRef.current = met
  const onPdfReaderClosed = useCallback(() => {
    metRef.current?.syncAudioAfterInterruption?.()
  }, [])
  const [lastSynthSnapshot, setLastSynthSnapshot] = useState(/** @type {object | null} */ (null))
  const [stagedSynthImport, setStagedSynthImport] = useState(/** @type {object | null} */ (null))
  const synthRef = useRef(/** @type {{ initAudio?: () => Promise<void> | void; getPresetSnapshot?: () => object; applyPresetSnapshot?: (s: object) => void } | null} */ (null))

  useLayoutEffect(() => {
    runSynthFromSongRef.current = (snap) => {
      if (!snap || typeof snap !== 'object') return
      pendingSongSynthRef.current = snap
      const api = synthRef.current
      if (api?.applyPresetSnapshot) {
        try {
          void api.initAudio?.()
          api.applyPresetSnapshot(snap)
          pendingSongSynthRef.current = null
        } catch {
          /* keep pending for tab switch retry */
        }
      }
    }
  })

  useLayoutEffect(() => {
    if (tab !== 'synth') return
    const p = pendingSongSynthRef.current
    const api = synthRef.current
    if (p && api?.applyPresetSnapshot) {
      try {
        void api.initAudio?.()
        api.applyPresetSnapshot(p)
        pendingSongSynthRef.current = null
      } catch {
        /* */
      }
    }
  }, [tab])

  useLayoutEffect(() => {
    if (tab !== 'synth' || !stagedSynthImport) return
    const api = synthRef.current
    if (api?.applyPresetSnapshot) {
      try {
        void api.initAudio?.()
        api.applyPresetSnapshot(stagedSynthImport)
        setStagedSynthImport(null)
      } catch {
        /* */
      }
    }
  }, [tab, stagedSynthImport])

  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false)
  /** Set when user turns play on from the main Metronome tab; cleared when visiting that tab again. */
  const [metronomeFloatHudUnlocked, setMetronomeFloatHudUnlocked] = useState(false)

  useEffect(() => {
    if (tab === 'metronome') setMetronomeFloatHudUnlocked(false)
  }, [tab])

  useEffect(() => {
    if (!user) setMetronomeFloatHudUnlocked(false)
  }, [user])

  useEffect(() => {
    if (!authLinkError) {
      openedAccountForLinkErrRef.current = false
      return
    }
    if (user || openedAccountForLinkErrRef.current) return
    openedAccountForLinkErrRef.current = true
    setAccountDrawerOpen(true)
  }, [authLinkError, user])

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
    <IosPdfReaderProvider onAfterClose={onPdfReaderClosed}>
    <div
      className="min-h-[100dvh] bg-[var(--bg)] text-[var(--text-h)]"
    >
      <div className="appUserBar">
        <button
          type="button"
          className="appUserBar__btn"
          onClick={() => setAccountDrawerOpen(true)}
          aria-label="Account menu"
          title="Account"
        >
          <span className="appUserBar__icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4.5 20.5a7.5 7.5 0 0 1 15 0"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      </div>

      <UserAccountDrawer open={accountDrawerOpen} onClose={() => setAccountDrawerOpen(false)} />

      {user ? (
        <MetronomeFloatingHud
          met={met}
          active={metronomeFloatHudUnlocked && tab !== 'metronome'}
        />
      ) : null}

      <div
        className={`mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden px-3 sm:px-8 flex flex-col items-stretch ${
          user
            ? tab === 'metronome'
              ? 'pt-[calc(env(safe-area-inset-top,0px)+3.5rem+0.75rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+3.5rem+1.25rem)] pb-28'
              : 'pt-[calc(env(safe-area-inset-top,0px)+3.5rem+1.5rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+3.5rem+2rem)] pb-28'
            : 'pt-[calc(env(safe-area-inset-top,0px)+3.5rem+1.5rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+3.5rem+2rem)] pb-28'
        }`}
      >
        {!user ? (
          <AuthGate onOpenEmailPassword={() => setAccountDrawerOpen(true)} />
        ) : (
          <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>Loading…</div>}>
            {tab === 'metronome' ? (
              <Metronome
                met={met}
                onStageModeChange={setStageMode}
                onEngageFromMainPage={() => setMetronomeFloatHudUnlocked(true)}
                minimal
                synthBridge={{
                  synthRef,
                  lastSynthSnapshot,
                  setLastSynthSnapshot,
                  setStagedSynthImport,
                }}
              />
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
            ) : tab === 'practice' ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left sm:p-8">
                <ExerciseProgress
                  met={met}
                  userId={user?.id ?? null}
                  exerciseRemote={exerciseRemote}
                  exerciseProgressRef={exerciseProgressRef}
                />
              </div>
            ) : (
              <div
                className="flex w-full min-w-0 min-h-[50vh] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[#050506] shadow-[var(--shadow)]"
                style={{ height: 'min(calc(100dvh - 7.5rem), 880px)' }}
              >
                <div className="min-h-0 min-w-0 flex-1">
                  <SynthAppBoundary>
                    <SynthApp
                      ref={synthRef}
                      embedded
                      onSnapshotForMetronome={setLastSynthSnapshot}
                    />
                  </SynthAppBoundary>
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
          <button type="button" className={`bottomNav__item ${tab === 'practice' ? 'is-active' : ''}`} onClick={() => setTab('practice')}>
            <span className="bottomNav__icon" aria-hidden="true">📒</span>
            <span className="bottomNav__label">Practice</span>
          </button>
          <button type="button" className={`bottomNav__item ${tab === 'synth' ? 'is-active' : ''}`} onClick={() => setTab('synth')}>
            <span className="bottomNav__icon" aria-hidden="true">🥁</span>
            <span className="bottomNav__label">Synth lab</span>
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
    </IosPdfReaderProvider>
  )
}

export default App
