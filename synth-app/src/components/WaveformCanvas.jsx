import { useEffect, useRef } from 'react'

/** @param {{ analyserRef: import('react').RefObject<AnalyserNode | null | undefined>, tone?: 'default' | 'synthwave' }} props */
export function WaveformCanvas({ analyserRef, tone = 'default' }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx2d = canvas.getContext('2d')
    const buffer = new Uint8Array(2048)

    const draw = () => {
      const analyser = analyserRef?.current
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w < 2 || h < 2) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h

      const neon = tone === 'synthwave'
      ctx2d.fillStyle = neon ? '#0a0a14' : '#08080a'
      ctx2d.fillRect(0, 0, w, h)
      ctx2d.strokeStyle = neon ? 'rgb(0 251 251 / 0.12)' : 'rgba(57, 255, 20, 0.45)'
      ctx2d.lineWidth = 1.25
      ctx2d.beginPath()
      ctx2d.moveTo(0, h * 0.5)
      ctx2d.lineTo(w, h * 0.5)
      ctx2d.stroke()

      if (analyser) {
        analyser.getByteTimeDomainData(buffer)
        ctx2d.strokeStyle = neon ? 'rgb(0 251 251 / 0.95)' : '#39ff14'
        ctx2d.lineWidth = neon ? 1.85 : 2
        ctx2d.beginPath()
        const slice = w / buffer.length
        for (let i = 0; i < buffer.length; i++) {
          const v = buffer[i] / 128 - 1
          const y = (v * 0.45 + 0.5) * h
          const x = i * slice
          if (i === 0) ctx2d.moveTo(x, y)
          else ctx2d.lineTo(x, y)
        }
        ctx2d.stroke()
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [analyserRef, tone])

  return (
    <div
      className={
        tone === 'synthwave'
          ? 'h-full w-full overflow-hidden rounded-none border-none bg-transparent'
          : 'h-full w-full overflow-hidden rounded-b-2xl border border-zinc-800/80 bg-[#08080a] shadow-inner'
      }
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        aria-hidden
      />
    </div>
  )
}
