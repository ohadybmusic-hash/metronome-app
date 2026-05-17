import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { clamp } from '../lib/clamp.js'
import {
  centsBetween,
  freqToNoteName,
  parabolicInterpolation,
} from '../lib/tuner/pitch.js'
import { TUNING_LIBRARY } from '../lib/tuner/tuningLibrary.js'
import { buildTuningTargets } from '../lib/tuner/tuningTargets.js'
import Stepper from './Stepper.jsx'
import { useScreenWakeLock } from '../hooks/useScreenWakeLock.js'
import { useDocumentVisualLayout } from '../hooks/useDocumentVisualLayout.js'

/** @type {Record<'obsidian' | 'light' | 'synthwave', { canvasHintPx: number }>} */
const LAYOUT_TUNER = {
  obsidian: { canvasHintPx: 140 },
  light: { canvasHintPx: 132 },
  synthwave: { canvasHintPx: 176 },
}

/** Canvas fills resolve from live `--ds-*` so strobes track the active Stitch skin. */
function readCanvasStrobePalette() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      lcdBg: '#0d0e10',
      accent: '#8ad2de',
      ringMuted: 'rgba(138, 210, 222, 0.18)',
      wedgeBright: 'rgba(226, 236, 239, 0.88)',
      wedgeDim: 'rgba(138, 210, 222, 0.14)',
      inTune: '#76d5e0',
    }
  }
  const cs = getComputedStyle(document.documentElement)
  const rgbNums = (token) => {
    const raw = cs.getPropertyValue(token).trim().split(/\s+/)
    const n = raw.map(Number)
    return n.length >= 3 && n.every((x) => !Number.isNaN(x)) ? n : null
  }
  const lcdBg =
    cs.getPropertyValue('--ds-surface-container-lowest').trim() ||
    cs.getPropertyValue('--ds-surface-container-low').trim() ||
    '#121315'
  const accent = cs.getPropertyValue('--ds-primary-fixed-dim').trim() || '#8ad2de'
  const inTune = cs.getPropertyValue('--ds-tertiary-fixed-dim').trim() || '#76d5e0'
  const p = rgbNums('--ds-primary-rgb') ?? [138, 210, 222]
  const c = rgbNums('--ds-chrome-rgb') ?? p
  const [pr, pg, pb] = p
  const [cr, cg, cb] = c
  return {
    lcdBg,
    accent,
    ringMuted: `rgba(${pr}, ${pg}, ${pb}, 0.22)`,
    wedgeBright: `rgba(${cr}, ${cg}, ${cb}, 0.88)`,
    wedgeDim: `rgba(${pr}, ${pg}, ${pb}, 0.15)`,
    inTune,
  }
}

/** Chromatic ruler ticks (Stitch tuner HTML mock). */
const TICK_MARKS = /** @type {const} */ ([
  'edge',
  'half',
  'half',
  'half',
  'half',
  'mid',
  'half',
  'half',
  'half',
  'half',
  'center',
  'half',
  'half',
  'half',
  'half',
  'mid',
  'half',
  'half',
  'half',
  'half',
  'edge',
])

function tickMarkClass(kind) {
  switch (kind) {
    case 'edge':
      return 'h-4 w-[2px] shrink-0 rounded-[1px] bg-outline-variant'
    case 'half':
      return 'h-2 w-px shrink-0 bg-outline-variant/50'
    case 'mid':
      return 'h-6 w-[2px] shrink-0 rounded-[1px] bg-outline'
    case 'center':
      return 'h-8 w-[3px] shrink-0 rounded-[2px] bg-primary shadow-[0_0_8px_rgb(var(--ds-chrome-rgb)_/_0.85)]'
    default:
      return 'h-2 w-px shrink-0 bg-outline-variant/50'
  }
}

/** Stitch tuner screen — centered column + DS tokens (matches Stitch HTML reference). */
function stitchTunerSkin(layout) {
  const roots = {
    obsidian:
      'relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center gap-6 overflow-x-hidden px-4 py-4 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1rem))] font-body-md text-on-surface sm:max-w-md',
    light:
      'relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center gap-6 overflow-x-hidden px-4 py-4 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1rem))] font-body-md text-on-surface sm:max-w-md sm:px-6',
    synthwave:
      'relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center gap-6 overflow-x-hidden px-4 py-5 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1rem))] font-space-grotesk text-on-surface sm:max-w-md',
  }

  const noteDisplay =
    layout === 'synthwave'
      ? 'font-display-numeral text-center text-[clamp(56px,18vw,84px)] leading-none text-primary sw-lcd-flicker'
      : layout === 'light'
        ? 'font-display-numeral text-center text-[clamp(56px,18vw,72px)] leading-none font-black tracking-tighter text-primary drop-shadow-sm'
        : 'font-display-numeral text-center text-[clamp(56px,18vw,84px)] leading-none text-primary ds-lcd-glow'

  const lcdOuter =
    layout === 'synthwave'
      ? 'w-full max-w-sm rounded-ds-lg border border-chrome/40 bg-surface-container-low p-1 tuner-lcd-chassis shadow-[inset_0_0_22px_rgb(0_251_251/_0.09)]'
      : layout === 'light'
        ? 'w-full max-w-sm rounded-lg border border-outline-variant bg-surface-container-low p-3 shadow-sm'
        : 'w-full max-w-sm rounded-ds-lg border border-hairline bg-surface-container-low p-1 tuner-lcd-chassis'

  const lcdInner =
    layout === 'synthwave'
      ? 'relative flex min-h-[288px] flex-col overflow-hidden rounded-ds-lg border border-black/35 bg-surface-container-lowest px-5 pb-3 pt-4 shadow-[inset_0_0_26px_rgb(0_251_251/_0.07)]'
      : layout === 'light'
        ? 'relative flex min-h-[300px] flex-col overflow-hidden'
        : 'relative flex min-h-[288px] flex-col overflow-hidden rounded-ds-lg border border-black/40 bg-surface-container-lowest px-5 pb-3 pt-4'

  return {
    root: roots[layout] ?? roots.obsidian,
    btnPri:
      'flex min-h-[44px] min-w-0 flex-1 items-center justify-center rounded-ds-lg border border-transparent bg-primary px-3 py-2.5 text-center font-mono text-sm font-semibold text-on-primary shadow-md outline-none transition-all hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] [-webkit-tap-highlight-color:transparent]',
    btnSec:
      'flex min-h-[44px] min-w-0 flex-1 items-center justify-center rounded-ds-lg border border-outline-variant bg-surface-container-high px-3 py-2.5 text-center font-mono text-sm text-on-surface outline-none transition-all hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/35 active:scale-[0.98] [-webkit-tap-highlight-color:transparent]',
    err: 'w-full max-w-sm rounded-ds-lg border border-outline-variant bg-error-container px-3 py-2.5 text-sm text-on-error-container',
    lcdOuter,
    lcdInner,
    presetShell:
      layout === 'light'
        ? 'relative w-full max-w-sm min-h-[44px] rounded-lg border border-outline-variant bg-surface-container-low shadow-sm'
        : 'relative w-full max-w-sm min-h-[44px]',
    presetDecoy:
      layout === 'light'
        ? 'pointer-events-none flex h-full min-h-[44px] w-full items-center justify-between px-3 py-3'
        : 'pointer-events-none flex h-full min-h-[44px] w-full items-center justify-between px-1',
    presetLabel:
      layout === 'synthwave'
        ? 'font-label-caps text-[11px] uppercase tracking-[0.18em] text-chrome/60'
        : layout === 'light'
          ? 'font-label-caps text-[11px] uppercase tracking-[0.08em] text-on-surface-variant'
          : 'font-label-caps text-[11px] uppercase text-outline-variant',
    selectGhost:
      'absolute inset-0 z-[2] h-full w-full cursor-pointer opacity-0 [&>option]:text-on-surface',
    stringGrid: 'grid w-full max-w-sm gap-2',
    stringBtn:
      layout === 'light'
        ? 'flex h-12 flex-col items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low shadow-sm transition-all active:scale-95 [-webkit-tap-highlight-color:transparent]'
        : 'flex h-12 flex-col items-center justify-center rounded-ds-lg border border-hairline bg-surface-container-low transition-all active:scale-95 [-webkit-tap-highlight-color:transparent]',
    stringBtnIdle:
      'text-on-surface-variant hover:border-primary/50 [&_.idx]:opacity-40 [&_.idx]:group-hover:opacity-100',
    stringBtnHot:
      'border-primary text-primary shadow-[0_0_10px_rgb(var(--ds-primary-rgb)_/_0.28)] [&_.idx]:opacity-100',
    audioCard:
      layout === 'synthwave'
        ? 'flex w-full max-w-sm items-center justify-between rounded-ds-xl border border-chrome/25 bg-surface-container p-4 shadow-[inset_0_0_12px_rgb(0_251_251/_0.04)]'
        : layout === 'light'
          ? 'flex w-full max-w-sm items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-4 shadow-sm'
          : 'flex w-full max-w-sm items-center justify-between rounded-ds-lg border border-hairline bg-surface-container p-4',
    micOrb:
      layout === 'light'
        ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-white text-primary knob-shadow-tuner'
        : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-background text-primary knob-shadow-tuner',
    refSliderWrap:
      layout === 'light'
        ? 'w-full max-w-sm rounded-lg border border-outline-variant bg-surface-container-low px-3 py-3 shadow-sm'
        : 'w-full max-w-sm rounded-ds-lg border border-hairline bg-surface-container-low px-3 py-3',
    noteDisplay,
    centsMono: 'font-mono text-sm text-on-surface-variant',
    secondaryBadge: 'text-secondary text-xs font-bold uppercase tracking-widest',
    tinyCaps:
      layout === 'synthwave'
        ? 'text-[9px] font-bold uppercase tracking-tighter text-chrome/55'
        : layout === 'light'
          ? 'text-[9px] font-bold uppercase tracking-wide text-on-surface-variant'
          : 'text-[9px] font-bold uppercase tracking-tighter text-outline-variant',
    canvasWrap: 'relative w-full px-2 pt-2',
    lightPanelHeader: 'mb-4 flex items-center justify-between gap-2',
    lightPanelTitle: 'font-label-caps text-[11px] uppercase tracking-[0.08em] text-on-surface-variant',
    lightPanelBadge:
      'font-label-caps text-[11px] uppercase tracking-[0.08em] text-on-surface-variant rounded-full border border-outline-variant bg-surface-container-high px-2 py-0.5',
    lightNeedleShell: 'relative w-full py-4',
    lightNeedleWell:
      'relative h-24 w-full overflow-hidden rounded border border-outline-variant bg-surface-container-highest shadow-[inset_0_2px_4px_rgb(0_0_0/_0.06)] tuner-needle-mask-well',
    lightMeterGrid: 'mt-auto grid w-full grid-cols-2 gap-4 pt-1',
    freqPill:
      'inline-flex items-center rounded border border-outline-variant bg-surface-container-high px-3 py-1',
    freqPillMono: 'font-mono text-sm font-semibold tracking-wide text-primary',
    freqPillSuffix: 'font-label-caps ml-1 text-[11px] uppercase tracking-[0.08em] text-on-surface-variant',
  }
}

export default function Tuner({ getAudioContext, onReportReferencePitch } = {}) {
  const visualLayout = useDocumentVisualLayout()

  const [refToneOn, setRefToneOn] = useState(false)
  const [listening, setListening] = useState(false)
  const [frequency, setFrequency] = useState(null)
  const [confidence, setConfidence] = useState(0)
  const [error, setError] = useState(null)
  const [referencePitch, setReferencePitch] = useState(440)
  const [tuningId, setTuningId] = useState('gtr-standard')
  const [strobeMode, setStrobeMode] = useState(false)

  useEffect(() => {
    onReportReferencePitch?.(referencePitch)
  }, [referencePitch, onReportReferencePitch])

  useScreenWakeLock(listening || refToneOn)

  const audioRef = useRef({
    ctx: null,
    refOsc: null,
    refGain: null,
    micStream: null,
    analyser: null,
    source: null,
    rafId: null,
  })

  const tuning = useMemo(
    () => TUNING_LIBRARY.find((t) => t.id === tuningId) || TUNING_LIBRARY[0],
    [tuningId],
  )
  const isChromatic = tuning?.id === 'chromatic'
  const targets = useMemo(() => buildTuningTargets(tuning, referencePitch), [referencePitch, tuning])
  const note = useMemo(() => freqToNoteName(frequency, referencePitch), [frequency, referencePitch])

  const guidance = useMemo(() => {
    if (!frequency) return null
    if (isChromatic) {
      if (!note) return null
      return { index: 0, note: note.name, midi: note.midi, freq: note.targetFreq, cents: note.cents, abs: Math.abs(note.cents) }
    }
    if (!targets.length) return null
    let best = null
    for (let i = 0; i < targets.length; i += 1) {
      const t = targets[i]
      const cents = centsBetween(frequency, t.freq)
      const abs = Math.abs(cents)
      if (!best || abs < best.abs) best = { index: i, ...t, cents, abs }
    }
    return best
  }, [frequency, isChromatic, note, targets])

  const ensureCtx = async () => {
    if (!audioRef.current.ctx) {
      if (typeof getAudioContext === 'function') {
        audioRef.current.ctx = getAudioContext()
      } else {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext
        audioRef.current.ctx = new AudioContextCtor()
      }
    }
    if (audioRef.current.ctx.state === 'suspended') {
      await audioRef.current.ctx.resume()
    }
    return audioRef.current.ctx
  }

  const stopReferenceTone = () => {
    const a = audioRef.current
    if (a.refOsc) {
      try {
        a.refOsc.stop()
      } catch {
        // ignore
      }
      a.refOsc.disconnect()
      a.refOsc = null
    }
    if (a.refGain) {
      a.refGain.disconnect()
      a.refGain = null
    }
    setRefToneOn(false)
  }

  const startReferenceTone = async () => {
    const ctx = await ensureCtx()
    stopReferenceTone()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.value = referencePitch
    gain.gain.value = 0.0

    osc.connect(gain)
    gain.connect(ctx.destination)

    const now = ctx.currentTime
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02)

    osc.start(now)

    audioRef.current.refOsc = osc
    audioRef.current.refGain = gain
    setRefToneOn(true)
  }

  const toggleReferenceTone = async () => {
    if (refToneOn) stopReferenceTone()
    else await startReferenceTone()
  }

  useEffect(() => {
    const a = audioRef.current
    if (a.refOsc) a.refOsc.frequency.setValueAtTime(referencePitch, a.ctx?.currentTime ?? 0)
  }, [referencePitch])

  const stopTuner = () => {
    const a = audioRef.current
    if (a.rafId) cancelAnimationFrame(a.rafId)
    a.rafId = null

    if (a.source) {
      a.source.disconnect()
      a.source = null
    }
    if (a.analyser) {
      a.analyser.disconnect()
      a.analyser = null
    }
    if (a.micStream) {
      for (const t of a.micStream.getTracks()) t.stop()
      a.micStream = null
    }
    setListening(false)
    setConfidence(0)
  }

  const startTuner = async () => {
    setError(null)
    const ctx = await ensureCtx()
    stopTuner()

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 8192
    analyser.smoothingTimeConstant = 0.3

    const source = ctx.createMediaStreamSource(stream)
    source.connect(analyser)

    audioRef.current.micStream = stream
    audioRef.current.analyser = analyser
    audioRef.current.source = source
    setListening(true)

    const binCount = analyser.frequencyBinCount
    const freqData = new Float32Array(binCount)

    const tick = () => {
      const a = audioRef.current
      if (!a.analyser) return

      a.analyser.getFloatFrequencyData(freqData)

      const sr = ctx.sampleRate
      const nyquist = sr / 2
      const minHz = 50
      const maxHz = 2000
      const minBin = Math.max(1, Math.floor((minHz / nyquist) * binCount))
      const maxBin = Math.min(binCount - 2, Math.ceil((maxHz / nyquist) * binCount))

      let bestBin = -1
      let bestDb = -Infinity
      let sumPower = 0
      let sumBestWindowPower = 0

      for (let i = minBin; i <= maxBin; i += 1) {
        const db = freqData[i]
        const power = Math.pow(10, db / 10)
        sumPower += power
        if (db > bestDb) {
          bestDb = db
          bestBin = i
        }
      }

      if (bestBin >= 1) {
        const m1 = freqData[bestBin - 1]
        const m2 = freqData[bestBin]
        const m3 = freqData[bestBin + 1]
        const delta = parabolicInterpolation(m1, m2, m3)
        const refinedBin = bestBin + delta
        const hz = (refinedBin / binCount) * nyquist

        const winDb = [m1, m2, m3]
        for (const db of winDb) sumBestWindowPower += Math.pow(10, db / 10)
        const conf = sumPower > 0 ? clamp(sumBestWindowPower / sumPower, 0, 1) : 0

        setFrequency(hz)
        setConfidence(conf)
      }

      a.rafId = requestAnimationFrame(tick)
    }

    audioRef.current.rafId = requestAnimationFrame(tick)
  }

  const toggleTuner = async () => {
    try {
      if (listening) stopTuner()
      else await startTuner()
    } catch (e) {
      stopTuner()
      setError(e?.message || 'Unable to start tuner')
    }
  }

  useEffect(() => {
    const a = audioRef.current
    const isShared = typeof getAudioContext === 'function'
    return () => {
      stopReferenceTone()
      stopTuner()
      if (isShared) {
        a.ctx = null
        return
      }
      const ctx = a.ctx
      a.ctx = null
      if (ctx && typeof ctx.close === 'function') ctx.close()
    }
  }, [getAudioContext])

  const strobeCanvasRef = useRef(null)
  const strobeRafRef = useRef(null)
  const strobePhaseRef = useRef(0)
  const strobePaletteRef = useRef(readCanvasStrobePalette())

  useLayoutEffect(() => {
    strobePaletteRef.current = readCanvasStrobePalette()
  }, [visualLayout])

  useEffect(() => {
    const canvas = strobeCanvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return

    strobePaletteRef.current = readCanvasStrobePalette()

    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    let last = performance.now()
    const draw = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      const palette = strobePaletteRef.current

      ctx2d.clearRect(0, 0, w, h)
      ctx2d.fillStyle = palette.lcdBg
      ctx2d.fillRect(0, 0, w, h)

      const cents = guidance ? guidance.cents : note ? note.cents : 0
      const conf = confidence
      const effective = strobeMode && listening && conf > 0.08

      const centsNorm = clamp(cents / 50, -1, 1)
      const curved = Math.sign(centsNorm) * Math.pow(Math.abs(centsNorm), 0.7)
      const speed = effective ? clamp(curved * 7.5, -10, 10) : 0
      strobePhaseRef.current += speed * dt

      const cx = w / 2
      const cy = h / 2
      const outerR = Math.min(w, h) * 0.42
      const innerR = outerR * 0.62
      const segments = 28

      ctx2d.save()
      ctx2d.translate(cx, cy)
      ctx2d.rotate(strobePhaseRef.current)
      ctx2d.globalAlpha = effective ? 1 : 0.32
      for (let i = 0; i < segments; i += 1) {
        const a0 = (i / segments) * Math.PI * 2
        const a1 = ((i + 1) / segments) * Math.PI * 2
        const bright = i % 2 === 0
        ctx2d.fillStyle = bright ? palette.wedgeBright : palette.wedgeDim

        ctx2d.beginPath()
        ctx2d.arc(0, 0, outerR, a0, a1)
        ctx2d.arc(0, 0, innerR, a1, a0, true)
        ctx2d.closePath()
        ctx2d.fill()
      }
      ctx2d.restore()

      const inTune = listening && conf > 0.08 ? Math.abs(cents) < 3 : false
      ctx2d.lineWidth = 4
      ctx2d.strokeStyle = palette.ringMuted
      ctx2d.beginPath()
      ctx2d.arc(cx, cy, outerR + 6, 0, Math.PI * 2)
      ctx2d.stroke()

      ctx2d.fillStyle = inTune ? palette.inTune : palette.accent
      ctx2d.beginPath()
      ctx2d.arc(cx, cy - (outerR + 6), 6.5, 0, Math.PI * 2)
      ctx2d.fill()

      if (!effective) {
        const needle = clamp(cents / 50, -1, 1)
        const maxSwing = (Math.PI / 2.8) * 0.95
        const theta = needle * maxSwing
        const r = outerR + 2
        const nx = cx + Math.sin(theta) * r
        const ny = cy - Math.cos(theta) * r

        ctx2d.lineWidth = 3
        ctx2d.lineCap = 'round'
        ctx2d.strokeStyle = palette.accent
        ctx2d.beginPath()
        ctx2d.moveTo(cx, cy)
        ctx2d.lineTo(nx, ny)
        ctx2d.stroke()

        ctx2d.fillStyle = palette.accent
        ctx2d.beginPath()
        ctx2d.arc(cx, cy, 4.5, 0, Math.PI * 2)
        ctx2d.fill()
      }

      strobeRafRef.current = requestAnimationFrame(draw)
    }

    strobeRafRef.current = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('resize', resize)
      if (strobeRafRef.current) cancelAnimationFrame(strobeRafRef.current)
      strobeRafRef.current = null
    }
  }, [confidence, guidance, listening, note, strobeMode, visualLayout])

  const canvasPx = LAYOUT_TUNER[visualLayout].canvasHintPx

  const U = useMemo(() => stitchTunerSkin(visualLayout), [visualLayout])

  const presetShortLabel = useMemo(() => {
    const L = tuning.label
    const idx = L.indexOf('(')
    return idx === -1 ? L : L.slice(0, idx).trim()
  }, [tuning.label])

  const displayLetter = useMemo(() => {
    const raw = note?.name
    if (!raw) return '—'
    return raw.replace(/\d+$/, '').replace(/[^A-G#a-z]/g, '') || raw.charAt(0)
  }, [note])

  const centsLive = guidance?.cents ?? note?.cents ?? 0
  const needleDeg = clamp((centsLive / 50) * 18, -18, 18)
  const inTune = Boolean(listening && confidence > 0.08 && note && Math.abs(centsLive) < 3)
  const filledBars = clamp(Math.round(confidence * 5), 0, 5)

  const tuningSelect = (
    <select className={U.selectGhost} value={tuningId} onChange={(e) => setTuningId(e.target.value)} aria-label="Tuning preset">
      {Array.from(new Set(TUNING_LIBRARY.map((t) => t.category))).map((cat) => (
        <optgroup key={cat} label={cat}>
          {TUNING_LIBRARY.filter((t) => t.category === cat).map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )

  const refPitchBlock = (
    <div className="grid min-w-0 gap-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,160px)] md:items-center">
      <input
        className="accent-primary h-10 w-full min-w-0"
        type="range"
        min={415}
        max={466}
        value={referencePitch}
        onChange={(e) => setReferencePitch(Number(e.target.value))}
      />
      <div className="min-w-0 max-w-full md:max-w-[160px] md:justify-self-end">
        <Stepper
          value={referencePitch}
          min={415}
          max={466}
          step={1}
          format={(v) => `${Math.round(v)} Hz`}
          onChange={(v) => setReferencePitch(Number(v))}
        />
      </div>
    </div>
  )

  const modeLabel = isChromatic ? 'Chromatic' : presetShortLabel.toUpperCase()

  const stringGridCols = targets.length > 0 ? Math.min(targets.length, 8) : 6

  return (
    <main className={`${U.root} relative`}>
      {visualLayout === 'synthwave' ? (
        <div className="scanline-overlay-sw pointer-events-none absolute inset-0 z-0 opacity-[0.65]" aria-hidden />
      ) : null}

      <div className={`${U.lcdOuter} relative z-[1]`}>
        <div className={U.lcdInner}>
          {visualLayout === 'light' ? (
            <div className={U.lightPanelHeader}>
              <span className={U.lightPanelTitle}>Precision Tuner Mode</span>
              <span className={U.lightPanelBadge}>
                {inTune ? 'Crystal Lock' : listening ? 'Listening' : 'Standby'}
              </span>
            </div>
          ) : null}

          {strobeMode ? (
            <div className={U.canvasWrap}>
              <div
                className={
                  visualLayout === 'light'
                    ? 'overflow-hidden rounded-lg border border-outline-variant bg-surface-container-high/75'
                    : 'overflow-hidden rounded-ds-lg border border-hairline bg-surface-container-high/75'
                }
              >
                <canvas ref={strobeCanvasRef} className="block w-full" style={{ height: canvasPx }} height={canvasPx} />
              </div>
            </div>
          ) : visualLayout === 'light' ? (
            <div className={U.lightNeedleShell}>
              <div className={U.lightNeedleWell}>
                <div className="pointer-events-none absolute inset-0 flex justify-center" aria-hidden>
                  <div className="h-full w-px bg-primary/20" />
                </div>
                <div className="pointer-events-none absolute bottom-2 left-0 flex w-full justify-between px-3" aria-hidden>
                  {(['-50', '-25', '0', '+25', '+50']).map((label) => (
                    <span
                      key={label}
                      className={`font-label-caps text-[8px] uppercase tracking-[0.08em] ${label === '0' ? 'font-semibold text-primary' : 'text-on-surface-variant'}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <div
                  className="pointer-events-none absolute bottom-0 left-1/2 z-10 h-20 w-0.5 -translate-x-1/2 bg-primary transition-transform duration-100 ease-out"
                  style={{
                    transformOrigin: 'bottom center',
                    transform: `translateX(-50%) rotate(${needleDeg}deg)`,
                  }}
                  aria-hidden
                >
                  <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-md" aria-hidden />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="relative flex h-12 w-full items-end justify-between px-2 pt-1">
                {TICK_MARKS.map((kind, i) => (
                  <div key={i} className={`flex flex-col items-center justify-end ${tickMarkClass(kind)}`} aria-hidden />
                ))}
              </div>
              <div
                className={`tuner-needle-transition pointer-events-none absolute bottom-[38%] left-1/2 z-10 h-28 w-0.5 -translate-x-1/2 bg-primary ${
                  visualLayout === 'synthwave' ? 'sw-needle-glow' : 'drop-shadow-[0_0_10px_rgb(var(--ds-chrome-rgb)_/_0.85)]'
                }`}
                style={{
                  transformOrigin: 'bottom center',
                  transform: `translateX(-50%) rotate(${needleDeg}deg)`,
                }}
                aria-hidden
              />
            </>
          )}

          <div className="flex flex-1 flex-col items-center justify-center pb-2 pt-2">
            <div className={U.noteDisplay}>{displayLetter}</div>
            {visualLayout === 'light' ? (
              <div className="mt-2 flex flex-col items-center gap-2">
                <div className={U.freqPill}>
                  <span className={U.freqPillMono}>{frequency != null ? frequency.toFixed(2) : '—'}</span>
                  <span className={U.freqPillSuffix}>Hz</span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {inTune ? <span className={U.secondaryBadge}>In tune</span> : null}
                  <span className={U.centsMono}>
                    {note ? `${centsLive >= 0 ? '+' : ''}${centsLive.toFixed(0)} cents` : '—'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                {inTune ? <span className={U.secondaryBadge}>In tune</span> : null}
                <span className={U.centsMono}>
                  {note ? `${centsLive >= 0 ? '+' : ''}${centsLive.toFixed(0)} cents` : '—'}
                </span>
              </div>
            )}
          </div>

          {visualLayout === 'light' ? (
            <div className={U.lightMeterGrid}>
              <div className="space-y-2">
                <span className={U.tinyCaps}>Signal Strength</span>
                <div className="flex h-1.5 w-full gap-0.5 rounded-full bg-surface-dim p-px" aria-hidden>
                  {[0, 1, 2, 3].map((i) => {
                    const segFilled = clamp(Math.round((filledBars / 5) * 4), 0, 4)
                    return (
                      <div
                        key={i}
                        className={`h-full min-w-0 flex-1 rounded-full ${i < segFilled ? 'bg-primary-container' : 'bg-surface-dim'}`}
                      />
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <span className={U.tinyCaps}>Gate Threshold</span>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-dim">
                  <div
                    className="h-full rounded-full bg-on-secondary-fixed-variant transition-[width] duration-150"
                    style={{ width: `${clamp(Math.round(confidence * 100), 4, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-auto flex w-full items-end justify-between px-2 pb-1 pt-2">
              <div className="flex flex-col gap-1">
                <span className={U.tinyCaps}>Signal</span>
                <div className="flex gap-px" aria-hidden>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-1 w-3 rounded-[1px] ${i < filledBars ? 'bg-primary' : 'bg-outline-variant/25'}`} />
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 text-right">
                <span className={U.tinyCaps}>Mode</span>
                <span className="max-w-[10rem] truncate text-[10px] font-bold uppercase leading-tight text-primary">{modeLabel}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`${U.presetShell} relative z-[1]`}>
        <div className={U.presetDecoy}>
          <span className={U.presetLabel}>{presetShortLabel}</span>
          <span className="material-symbols-outlined text-outline text-sm" aria-hidden>
            unfold_more
          </span>
        </div>
        {tuningSelect}
      </div>

      {!isChromatic && targets.length ? (
        <div
          className={`${U.stringGrid} relative z-[1]`}
          style={{ gridTemplateColumns: `repeat(${stringGridCols}, minmax(0, 1fr))` }}
          role="list"
          aria-label="Strings"
        >
          {targets.map((t, idx) => {
            const cents = frequency ? centsBetween(frequency, t.freq) : null
            const active = guidance ? guidance.index === idx : false
            const hot = active || (cents != null && Math.abs(cents) < 5)
            const stringNum = targets.length - idx
            const letter = String(t.note).replace(/\d+$/, '')
            return (
              <button
                key={`${t.note}-${idx}`}
                type="button"
                role="listitem"
                className={`group ${U.stringBtn} ${hot ? U.stringBtnHot : U.stringBtnIdle}`}
              >
                <span className="idx text-[10px] font-bold">{stringNum}</span>
                <span className="text-lg font-bold leading-none">{letter}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      <div className={`${U.audioCard} relative z-[1]`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className={U.micOrb}>
            <span className="material-symbols-outlined text-[22px]" aria-hidden>
              mic
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-tight text-on-surface">Input source</h3>
            <p className="truncate text-[10px] text-outline">{listening ? 'Internal microphone' : 'Microphone idle'}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-outline">Gain</span>
          <div className="h-1 w-16 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${filledBars * 20}%` }} />
          </div>
        </div>
      </div>

      <div className="relative z-[1] flex w-full max-w-sm flex-wrap items-stretch gap-2">
        <button type="button" className={U.btnPri} onClick={toggleTuner}>
          {listening ? 'Stop tuner' : 'Start tuner'}
        </button>
        <button type="button" className={U.btnSec} onClick={toggleReferenceTone}>
          {refToneOn ? `Stop A4` : `A4 tone`}
        </button>
      </div>

      <label
        className={`relative z-[1] flex w-full max-w-sm cursor-pointer items-center gap-3 px-3 py-2.5 ${
          visualLayout === 'light'
            ? 'rounded-lg border border-outline-variant bg-surface-container-low shadow-sm'
            : 'rounded-ds-lg border border-hairline bg-surface-container-low'
        }`}
      >
        <input className="size-[18px] accent-primary" type="checkbox" checked={strobeMode} onChange={(e) => setStrobeMode(e.target.checked)} />
        <span className="text-sm text-on-surface">Strobe display</span>
      </label>

      <div className={`${U.refSliderWrap} relative z-[1]`}>
        <span className="mb-2 block font-label-caps text-[10px] uppercase tracking-wide text-outline-variant">Reference A4</span>
        {refPitchBlock}
      </div>

      {error ? <div className={`${U.err} relative z-[1]`}>{error}</div> : null}
    </main>
  )
}
