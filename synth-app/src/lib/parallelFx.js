import { createReverbBuffer } from './impulseResponse.js'

const MAX_D = 2.2
const MAX_PRE = 0.2

/**
 * @param {AudioContext} ctx
 */
export function createParallelFx(ctx) {
  const inG = ctx.createGain()
  inG.gain.value = 1
  const outG = ctx.createGain()
  outG.gain.value = 1
  const dryG = ctx.createGain()
  const dWet = ctx.createGain()
  const rWet = ctx.createGain()
  const sum = ctx.createGain()
  const revPre = ctx.createDelay(MAX_PRE)
  const conv = ctx.createConvolver()
  /* IR peak is set in createReverbBuffer; browser normalize skews long tails. */
  conv.normalize = false
  conv.buffer = createReverbBuffer(ctx, 'hall', {
    length: 1,
    damping: 0.5,
    diffusion: 0.5,
    reverbSize: 'normal',
  })

  const d1 = ctx.createDelay(MAX_D)
  const d2 = ctx.createDelay(MAX_D)
  const fb1 = ctx.createGain()
  const fb2 = ctx.createGain()
  const brIn = ctx.createGain()
  const gA = ctx.createGain()
  const gB = ctx.createGain()
  gA.gain.value = 0.55
  gB.gain.value = 0.55
  const x1 = ctx.createGain()
  const x2 = ctx.createGain()
  x1.gain.value = 0.12
  x2.gain.value = 0.12
  const pL = ctx.createStereoPanner()
  const pR = ctx.createStereoPanner()
  const sPp = ctx.createGain()

  inG.connect(dryG)
  inG.connect(brIn)
  inG.connect(revPre)
  revPre.connect(conv)
  dryG.connect(sum)
  dWet.connect(sum)
  rWet.connect(sum)
  sum.connect(outG)
  conv.connect(rWet)

  let delayMode = 'off'

  function connectDelay(mode) {
    const disc = (n) => {
      try {
        n.disconnect()
      } catch {
        /* */
      }
    }
    ;[brIn, d1, d2, fb1, fb2, gA, gB, x1, x2, pL, pR, sPp].forEach(disc)

    dWet.gain.value = 0
    delayMode = mode
    if (mode === 'off') {
      return
    }

    if (mode === 'delay') {
      brIn.connect(d1)
      d1.connect(fb1)
      fb1.connect(d1)
      d1.connect(dWet)
      return
    }
    if (mode === 'double') {
      brIn.connect(gA)
      brIn.connect(gB)
      gA.connect(d1)
      gB.connect(d2)
      d1.connect(fb1)
      d2.connect(fb2)
      fb1.connect(d1)
      fb2.connect(d2)
      d1.connect(dWet)
      d2.connect(dWet)
      return
    }
    if (mode === 'stereo' || mode === 'pingpong') {
      brIn.connect(d1)
      brIn.connect(d2)
      d1.connect(fb1)
      d2.connect(fb2)
      fb1.connect(d1)
      fb2.connect(d2)
      if (mode === 'pingpong') {
        d1.connect(x1)
        d2.connect(x2)
        x1.connect(d2)
        x2.connect(d1)
      }
      d1.connect(pL)
      d2.connect(pR)
      pL.pan.value = -0.85
      pR.pan.value = 0.85
      pL.connect(sPp)
      pR.connect(sPp)
      sPp.connect(dWet)
    }
  }

  connectDelay('off')

  return {
    in: inG,
    out: outG,
    conv,
    revPre,
    d1,
    d2,
    getDelayMode: () => delayMode,
    setDelayMode: (m) => {
      if (m === delayMode) return
      connectDelay(m)
    },
    setReverbBuffer: (type, opts) => {
      if (type && type !== 'off') {
        conv.buffer = createReverbBuffer(ctx, type, {
          length: opts?.length ?? opts?.decay,
          damping: opts?.damping,
          diffusion: opts?.diffusion,
          decay: opts?.decay,
          reverbSize: opts?.reverbSize,
        })
      }
    },
    setReverbPreDelayMs: (ms) => {
      const t = Math.max(0, Math.min(MAX_PRE, ms / 1000))
      revPre.delayTime.setTargetAtTime(t, ctx.currentTime, 0.03)
    },
    setReverbWet: (g) => {
      rWet.gain.setTargetAtTime(g, ctx.currentTime, 0.04)
    },
    setDelayWet: (g) => {
      /* Always set: when delay is off, g is 0 so reverb (and dry) are not held hostage to old wet. */
      dWet.gain.setTargetAtTime(g, ctx.currentTime, 0.04)
    },
    setDry: (g) => {
      dryG.gain.setTargetAtTime(g, ctx.currentTime, 0.04)
    },
    setDelayTimeAndFeedback: (timeSec, feedback) => {
      if (delayMode === 'off') return
      const t = Math.max(0.01, Math.min(2.2, timeSec))
      const f = Math.max(0, Math.min(0.9, Number(feedback) || 0))
      const fbG = 0.1 + f * 0.6
      d1.delayTime.setTargetAtTime(t, ctx.currentTime, 0.03)
      d2.delayTime.setTargetAtTime(
        Math.min(2.2, t * 0.56 + 0.08),
        ctx.currentTime,
        0.03,
      )
      fb1.gain.setTargetAtTime(fbG, ctx.currentTime, 0.03)
      fb2.gain.setTargetAtTime(fbG, ctx.currentTime, 0.03)
    },
  }
}
