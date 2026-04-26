import { useEffect, useRef } from 'react'

export function WaveformCanvas({ analyserRef }) {
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

      ctx2d.fillStyle = '#08080a'
      ctx2d.fillRect(0, 0, w, h)
      ctx2d.strokeStyle = 'rgba(57, 255, 20, 0.45)'
      ctx2d.lineWidth = 1.5
      ctx2d.beginPath()
      ctx2d.moveTo(0, h * 0.5)
      ctx2d.lineTo(w, h * 0.5)
      ctx2d.stroke()

      if (analyser) {
        analyser.getByteTimeDomainData(buffer)
        ctx2d.strokeStyle = '#39ff14'
        ctx2d.lineWidth = 2
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
  }, [analyserRef])

  return (
    <div className="h-full w-full overflow-hidden rounded-b-2xl border border-zinc-800/80 bg-[#08080a] shadow-inner">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        aria-hidden
      />
    </div>
  )
}
