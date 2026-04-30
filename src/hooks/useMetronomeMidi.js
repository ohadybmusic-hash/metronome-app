import { useEffect } from 'react'

/**
 * Web MIDI: allow external transport toggle (CC64 or Note C3) on the metronome.
 * @param {object} met
 */
export function useMetronomeMidi(met) {
  useEffect(() => {
    let cancelled = false
    const subs = new Set()

    const NOTE_C3 = 48
    const CC_SUSTAIN = 64

    const onMidiMessage = (e) => {
      if (cancelled) return
      const d = e?.data
      if (!d || d.length < 2) return

      const status = d[0] & 0xf0
      const a = d[1]
      const b = d[2] ?? 0

      // Note On: 0x90, note C3, velocity > 0
      if (status === 0x90 && a === NOTE_C3 && b > 0) {
        try {
          met.audio?.ensure?.()
        } catch {
          // ignore
        }
        met.toggle()
        return
      }

      // CC: 0xB0, CC #64, value > 0
      if (status === 0xb0 && a === CC_SUSTAIN && b > 0) {
        try {
          met.audio?.ensure?.()
        } catch {
          // ignore
        }
        met.toggle()
      }
    }

    async function init() {
      if (typeof navigator === 'undefined') return
      if (!('requestMIDIAccess' in navigator)) return
      try {
        const access = await navigator.requestMIDIAccess({ sysex: false })
        if (cancelled) return

        const attach = (input) => {
          if (!input) return
          input.addEventListener('midimessage', onMidiMessage)
          subs.add(() => input.removeEventListener('midimessage', onMidiMessage))
        }

        for (const input of access.inputs.values()) attach(input)

        // Hot-plug support.
        const onState = (evt) => {
          const port = evt?.port
          if (port?.type === 'input' && port?.state === 'connected') attach(port)
        }
        access.addEventListener('statechange', onState)
        subs.add(() => access.removeEventListener('statechange', onState))
      } catch {
        // ignore (permission denied / unsupported)
      }
    }

    init()
    return () => {
      cancelled = true
      for (const unsub of subs) unsub()
      subs.clear()
    }
  }, [met])
}
