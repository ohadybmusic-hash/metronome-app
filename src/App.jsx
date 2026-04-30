import './App.css'
import Metronome from './components/Metronome.jsx'
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import AuthGate from './components/AuthGate.jsx'
import UserAccountDrawer from './components/UserAccountDrawer.jsx'
import { useAuth } from './context/useAuth'
import { useMetronome } from './hooks/useMetronome'
import AudioSessionPrimer from './components/AudioSessionPrimer.jsx'
import SynthAppBoundary from './components/SynthAppBoundary.jsx'
import MetronomeFloatingHud from './components/MetronomeFloatingHud.jsx'
import AppShellHeader from './components/AppShellHeader.jsx'
import SynthLabShell from './components/SynthLabShell.jsx'
import { IosPdfReaderProvider } from './context/IosPdfReaderContext.jsx'
import TabPanelFallback from './components/TabPanelFallback.jsx'
import { useSharedAudioContext } from './hooks/useSharedAudioContext'
import { useSynthMetronomeBridge } from './hooks/useSynthMetronomeBridge'
import { useBottomNavInsetCssVar } from './hooks/useBottomNavInsetCssVar'
import { useExerciseProgressRemote } from './hooks/useExerciseProgressRemote'
import { useFirstPointerAudioUnlock } from './hooks/useFirstPointerAudioUnlock'
import { useAuthLinkOpensAccountDrawer } from './hooks/useAuthLinkOpensAccountDrawer'
import { APP_TAB_PATH, getTabFromPathname, isShellForeignPath } from './lib/appRoutes.js'
import { applyDocumentThemeForVisualLayout, readMetronomeVisualLayout } from './lib/metronomeVisualLayout.js'

const Tuner = lazy(() => import('./components/Tuner.jsx'))
const SetlistManager = lazy(() => import('./components/SetlistManager.jsx'))
const ExerciseProgress = lazy(() => import('./components/ExerciseProgress.jsx'))
const SynthApp = lazy(() => import('@synth/App.jsx'))
const AdminDashboard = lazy(() => import('./components/AdminDashboard.jsx'))

function AdminGate() {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <TabPanelFallback />
  if (!user || !isAdmin) return <Navigate to={APP_TAB_PATH.metronome} replace />
  return (
    <Suspense fallback={<TabPanelFallback />}>
      <AdminDashboard />
    </Suspense>
  )
}

function MetronomeAppShell() {
  const { user, authLinkError } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { getSharedAudioContext } = useSharedAudioContext()
  const { exerciseProgressRef, exerciseRemote, onExerciseProgressLoaded } = useExerciseProgressRemote(user?.id)

  const [stageMode, setStageMode] = useState(false)
  const [floatHud, setFloatHud] = useState(() => ({ userId: null, engaged: false }))

  const tab = getTabFromPathname(location.pathname) ?? 'metronome'

  useEffect(() => {
    if (!user) return
    const p = location.pathname.replace(/\/+$/, '') || '/'
    if (p === '/') navigate(APP_TAB_PATH.metronome, { replace: true })
  }, [user, location.pathname, navigate])

  const {
    synthRef,
    runSynthFromSongRef,
    lastSynthSnapshot,
    setLastSynthSnapshot,
    setStagedSynthImport,
  } = useSynthMetronomeBridge(tab)

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
  useLayoutEffect(() => {
    metRef.current = met
  }, [met])
  const onPdfReaderClosed = useCallback(() => {
    metRef.current?.syncAudioAfterInterruption?.()
  }, [])

  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false)
  useAuthLinkOpensAccountDrawer(authLinkError, user, setAccountDrawerOpen)

  const [visualLayout, setVisualLayout] = useState(() => readMetronomeVisualLayout())
  const [synthRecording, setSynthRecording] = useState(false)
  const metronomeRef = useRef(null)
  const [pendingOpenMetronomeSettings, setPendingOpenMetronomeSettings] = useState(false)

  useLayoutEffect(() => {
    if (!user) {
      document.documentElement.dataset.theme = 'dark'
      return
    }
    applyDocumentThemeForVisualLayout(visualLayout)
  }, [user, visualLayout])

  useEffect(() => {
    if (tab !== 'metronome' || !pendingOpenMetronomeSettings) return
    const id = requestAnimationFrame(() => {
      metronomeRef.current?.openSettings?.()
      setPendingOpenMetronomeSettings(false)
    })
    return () => cancelAnimationFrame(id)
  }, [tab, pendingOpenMetronomeSettings])

  const openMetronomeSettingsFromShell = useCallback(() => {
    if (tab === 'metronome') {
      metronomeRef.current?.openSettings?.()
      return
    }
    navigate(APP_TAB_PATH.metronome)
    setPendingOpenMetronomeSettings(true)
  }, [tab, navigate])

  const floatHudActive =
    Boolean(user) && floatHud.engaged && floatHud.userId === user?.id && tab !== 'metronome'

  const ensureAudio = met.audio?.ensure
  useFirstPointerAudioUnlock(ensureAudio)

  const showBottomNav = Boolean(user)
  const bottomNavRef = useRef(null)
  useBottomNavInsetCssVar({ showBottomNav, bottomNavRef, tab, user })

  const stitchNavCls = ({ isActive }) =>
    `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 transition-transform duration-75 active:scale-90 outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-[#4f98a3]/40 ${
      isActive ? 'text-[#4f98a3] drop-shadow-[0_0_6px_rgba(79,152,163,0.8)]' : 'text-neutral-600 opacity-60 hover:opacity-100'
    }`

  if (user) {
    const tabCheck = getTabFromPathname(location.pathname)
    if (tabCheck === null && !isShellForeignPath(location.pathname)) {
      return <Navigate to={APP_TAB_PATH.metronome} replace />
    }
  }

  return (
    <IosPdfReaderProvider onAfterClose={onPdfReaderClosed}>
      <div className="min-h-[100dvh] bg-[var(--bg)] text-[var(--text-h)]">
        {user ? (
          <AppShellHeader
            tab={tab}
            met={met}
            onOpenAccount={() => setAccountDrawerOpen(true)}
            onOpenMetronomeSettings={openMetronomeSettingsFromShell}
          />
        ) : null}

        <UserAccountDrawer open={accountDrawerOpen} onClose={() => setAccountDrawerOpen(false)} />

        {user ? <MetronomeFloatingHud met={met} active={floatHudActive} /> : null}

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
            <>
              {tab === 'metronome' ? (
                <Metronome
                  ref={metronomeRef}
                  met={met}
                  visualLayout={visualLayout}
                  setVisualLayout={setVisualLayout}
                  onStageModeChange={setStageMode}
                  onEngageFromMainPage={() => setFloatHud({ userId: user?.id ?? null, engaged: true })}
                  synthBridge={{
                    synthRef,
                    lastSynthSnapshot,
                    setLastSynthSnapshot,
                    setStagedSynthImport,
                  }}
                />
              ) : null}

              {tab === 'tuner' ? (
                <Suspense fallback={<TabPanelFallback />}>
                  <Tuner getAudioContext={getSharedAudioContext} />
                </Suspense>
              ) : null}

              {tab === 'setlists' ? (
                <Suspense fallback={<TabPanelFallback />}>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-left">
                    <div className="mb-6 flex items-center justify-between gap-6">
                      <div>
                        <div className="text-xl font-semibold tracking-tight">Setlists</div>
                        <div className="mt-1 text-sm text-[var(--text)]">
                          Save songs and organize performance setlists.
                        </div>
                      </div>
                    </div>
                    <SetlistManager met={met} stageMode={stageMode} setStageMode={setStageMode} />
                  </div>
                </Suspense>
              ) : null}

              {tab === 'practice' ? (
                <Suspense fallback={<TabPanelFallback />}>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left sm:p-8">
                    <ExerciseProgress
                      met={met}
                      userId={user?.id ?? null}
                      exerciseRemote={exerciseRemote}
                      exerciseProgressRef={exerciseProgressRef}
                    />
                  </div>
                </Suspense>
              ) : null}

              {tab === 'synth' ? (
                <Suspense fallback={<TabPanelFallback />}>
                  <div
                    className="flex w-full min-w-0 min-h-[min(calc(100dvh-7.5rem),880px)] flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-[#121315] shadow-[var(--shadow)]"
                  >
                    <SynthLabShell met={met} synthRef={synthRef} recordingActive={synthRecording}>
                      <SynthAppBoundary>
                        <SynthApp
                          ref={synthRef}
                          embedded
                          hideTopBar
                          onRecordingChange={setSynthRecording}
                          onSnapshotForMetronome={setLastSynthSnapshot}
                        />
                      </SynthAppBoundary>
                    </SynthLabShell>
                  </div>
                </Suspense>
              ) : null}
            </>
          )}
        </div>

        {showBottomNav ? (
          <nav
            ref={bottomNavRef}
            className="fixed bottom-0 left-0 right-0 z-[60] flex h-16 items-stretch justify-around border-t border-neutral-800 bg-[#16181c] px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.6)]"
            role="navigation"
            aria-label="Bottom navigation"
          >
            <NavLink
              to={APP_TAB_PATH.metronome}
              end
              className={stitchNavCls}
              onClick={() => setFloatHud((g) => ({ ...g, engaged: false }))}
            >
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                timer
              </span>
              <span className="font-inter text-[10px] font-semibold uppercase tracking-tighter">Metronome</span>
            </NavLink>
            <NavLink to={APP_TAB_PATH.tuner} className={stitchNavCls}>
              <span className="material-symbols-outlined text-[22px]">graphic_eq</span>
              <span className="font-inter text-[10px] font-semibold uppercase tracking-tighter">Tuner</span>
            </NavLink>
            <NavLink to={APP_TAB_PATH.setlists} className={stitchNavCls}>
              <span className="material-symbols-outlined text-[22px]">library_music</span>
              <span className="font-inter text-[10px] font-semibold uppercase tracking-tighter">Setlists</span>
            </NavLink>
            <NavLink to={APP_TAB_PATH.practice} className={stitchNavCls}>
              <span className="material-symbols-outlined text-[22px]">menu_book</span>
              <span className="font-inter text-[10px] font-semibold uppercase tracking-tighter">Practice</span>
            </NavLink>
            <NavLink to={APP_TAB_PATH.synth} className={stitchNavCls}>
              <span className="material-symbols-outlined text-[22px]">piano</span>
              <span className="font-inter text-[10px] font-semibold uppercase tracking-tighter">Synth lab</span>
            </NavLink>
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

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminGate />} />
      <Route path="/*" element={<MetronomeAppShell />} />
    </Routes>
  )
}
