/**
 * Procedurally fill `countBuffersRef` (voice-count "one"…"four" tones) on the current context.
 */
export async function ensureMetronomeCountSamples(ctx, countBuffersRef) {
  if (countBuffersRef.current.status === 'ready') return
  if (countBuffersRef.current.status === 'loading') return
  countBuffersRef.current.status = 'loading'

  try {
    const sr = ctx.sampleRate || 48000
    const dur = 0.22
    const len = Math.max(1, Math.floor(sr * dur))

    const make = (seed) => {
      const buf = ctx.createBuffer(1, len, sr)
      const ch = buf.getChannelData(0)
      for (let i = 0; i < len; i += 1) {
        const t = i / sr
        const env = Math.exp(-t * 18) // short decay
        const f0 = 190 + seed * 40
        const a =
          Math.sin(2 * Math.PI * f0 * t) * 0.55 +
          Math.sin(2 * Math.PI * (f0 * 2.1) * t) * 0.25 +
          Math.sin(2 * Math.PI * (f0 * 3.2) * t) * 0.12
        // Add a little transient noise for consonant feel.
        const n = (Math.random() * 2 - 1) * Math.exp(-t * 70) * 0.08
        ch[i] = (a + n) * env
      }
      return buf
    }

    countBuffersRef.current = {
      status: 'ready',
      buffers: {
        1: make(1), // "One"
        2: make(2), // "Two"
        3: make(3), // "Three"
        4: make(4), // "Four"
      },
    }
  } catch {
    countBuffersRef.current = { status: 'error', buffers: {} }
  }
}

/**
 * Fetch `/voice/1.wav`…`/voice/16.wav` into `voiceBuffersRef` for "voice numbers" mode.
 */
export async function loadMetronomeVoiceNumberWavs(ctx, voiceBuffersRef) {
  if (voiceBuffersRef.current.status === 'loading') return
  if (voiceBuffersRef.current.status === 'ready') return

  voiceBuffersRef.current.status = 'loading'
  const buffers = {}
  const max = 16
  try {
    for (let i = 1; i <= max; i += 1) {
      const res = await fetch(`/voice/${i}.wav`)
      if (!res.ok) continue
      const arr = await res.arrayBuffer()
      // Safari needs a copy sometimes; decoding handles it.
      const buf = await ctx.decodeAudioData(arr)
      buffers[i] = buf
    }
    voiceBuffersRef.current = { status: 'ready', buffers }
  } catch {
    voiceBuffersRef.current = { status: 'error', buffers: {} }
  }
}
