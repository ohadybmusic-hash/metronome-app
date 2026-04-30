import { getMetronomeOutputNode } from './engine.js'

/**
 * Get or create the shared/owned `AudioContext` and a stereo panner to `destination`.
 * @param {() => any | null | void} [getAudioContext] App `getAudioContext` option, if any
 */
export function ensureMetronomeAudioContext(getAudioContext, ctxRef, pannerRef, audioPrimedForCtxRef) {
  if (typeof getAudioContext === 'function') {
    const ext = getAudioContext()
    if (ext) {
      if (ctxRef.current && ctxRef.current !== ext) {
        pannerRef.current = null
        audioPrimedForCtxRef.current = null
      }
      ctxRef.current = ext
    } else if (!ctxRef.current) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext
      ctxRef.current = new AudioContextCtor()
      audioPrimedForCtxRef.current = null
    }
  } else if (!ctxRef.current) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext
    ctxRef.current = new AudioContextCtor()
    audioPrimedForCtxRef.current = null
  }

  if (ctxRef.current && !pannerRef.current) {
    const c = ctxRef.current
    const p = c.createStereoPanner()
    p.pan.setValueAtTime(0, c.currentTime)
    p.connect(c.destination)
    pannerRef.current = p
  }

  if (ctxRef.current && ctxRef.current.state === 'suspended') {
    try {
      ctxRef.current.resume?.().catch?.(() => {})
    } catch {
      // ignore
    }
  }

  return ctxRef.current
}

// Inaudible buffer through the *same* mix bus as clicks — iOS / Safari (incl. “Add to Home
// Screen”) often require a BufferSource to start(0) in the *same* synchronous turn as
// resume/touch, or the graph stays inaudible. connect() to `destination` only was flaky next to
// a StereoPanner path. True 0 gain is sometimes elided; other platforms use one prime per ctx.
export function primeMetronomeInaudibleBuffer(ctx, pannerRef, audioPrimedForCtxRef) {
  if (!ctx) return
  if (audioPrimedForCtxRef.current === ctx) return
  audioPrimedForCtxRef.current = ctx
  try {
    const out = getMetronomeOutputNode(ctx, pannerRef.current)
    const n = Math.max(128, Math.floor((ctx.sampleRate || 48000) * 0.002))
    const buffer = ctx.createBuffer(1, n, ctx.sampleRate)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const g = ctx.createGain()
    g.gain.value = 0.0001
    src.connect(g)
    g.connect(out)
    src.start(0)
  } catch {
    // ignore
  }
}

// Every call: iOS can drop output if the system never saw a non-zero node this gesture.
export function iosInaudibleOscKickMetronome(ctx, pannerRef) {
  if (!ctx) return
  try {
    const out = getMetronomeOutputNode(ctx, pannerRef.current)
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    const t0 = ctx.currentTime
    osc.frequency.setValueAtTime(440, t0)
    g.gain.setValueAtTime(0.0001, t0)
    osc.connect(g)
    g.connect(out)
    osc.start(t0)
    osc.stop(t0 + 0.03)
  } catch {
    // ignore
  }
}

const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA='

export function playSilentHtml5ForAudioUnlock(html5SilentAudioRef) {
  try {
    let a = html5SilentAudioRef.current
    if (!a) {
      a = new Audio()
      a.preload = 'auto'
      a.setAttribute('playsinline', 'true')
      a.setAttribute('webkit-playsinline', 'true')
      a.src = SILENT_WAV
      html5SilentAudioRef.current = a
    }
    a.volume = 0.0001
    const p = a.play()
    if (p && typeof p.then === 'function') void p.catch(() => {})
  } catch {
    // ignore
  }
}

/**
 * Call on pointerup / from start() — must run sync (do not await) inside user gesture.
 * `ensureContext` must be the same function used to obtain ctx for count/voice sample decode.
 */
export function runEnsureMetronomeUserGestureAudio(
  ensureContext,
  {
    pannerRef,
    audioPrimedForCtxRef,
    html5SilentAudioRef,
  },
) {
  const ctx = ensureContext()
  if (!ctx) return null

  // iOS: HTMLAudio is critical. Desktop (Chrome/Edge/Saf): pairing silent HTMLAudio + a tiny
  // graph tick matches what “fixes” the engine after the tuner; do both everywhere.
  playSilentHtml5ForAudioUnlock(html5SilentAudioRef)

  try {
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') void ctx.resume()
  } catch {
    // ignore
  }

  primeMetronomeInaudibleBuffer(ctx, pannerRef, audioPrimedForCtxRef)
  iosInaudibleOscKickMetronome(ctx, pannerRef)

  try {
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') void ctx.resume()
  } catch {
    // ignore
  }

  return ctx
}
