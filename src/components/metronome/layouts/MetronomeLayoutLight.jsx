import { clamp } from '../../../lib/clamp.js'
import { cycleSubdivision, cycleTimeSignature } from '../../../lib/metronome/meterCycle.js'
import { useLiveBeatIndex } from '../../../hooks/useLiveBeatIndex.js'

const SUB_ICON = ['music_note', 'notes', 'grid_view', 'reorder']

/**
 * Stitch “Light rack” layout (hardware-style panels).
 */
export function MetronomeLayoutLight({
  met,
  bpm,
  handleTap,
  handlePlayFabClick,
  handlePlayFabPointerUp,
  handlePlayFabTouchEnd,
}) {
  const liveBeat = useLiveBeatIndex(met)
  const subIndex = Math.max(
    0,
    ['quarter', 'eighth', 'triplet', 'sixteenth'].indexOf(met.subdivision),
  )
  const beats = Math.max(1, met.pulsesPerMeasure || 1)
  const pulsePct = met.isPlaying ? Math.max(8, ((liveBeat + 1) / beats) * 100) : 8

  const cycleSub = (delta) => {
    met.setSubdivision(cycleSubdivision(met.subdivision, delta))
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-2 bg-[#f8f9fb] p-6 font-inter text-[#191c1e] wide:grid wide:grid-cols-12">
      <section className="rack-panel-light col-span-12 flex flex-col gap-2 rounded border border-[#D1D9E0] bg-[#edeef0] p-3 wide:col-span-8">
        <header className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase leading-4 tracking-[0.08em] text-[#44474d]">
            Tempo Engine / Phase 1
          </span>
          <div className="flex gap-2">
            <span className="h-2 w-2 rounded-full bg-[#395f94] shadow-[0_0_4px_#395f94]" />
            <span className="h-2 w-2 rounded-full bg-[#c4c6cd]" />
          </div>
        </header>
        <div className="well-inset-light relative flex min-h-[200px] flex-1 flex-col items-center justify-center overflow-hidden rounded p-8">
          <div
            className="absolute left-0 top-0 flex h-1 w-full bg-[#f2f4f6]"
            role="progressbar"
            aria-valuenow={Math.round(pulsePct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Beat phase"
          >
            <div
              className="h-full bg-[#395f94] transition-all duration-75"
              style={{ width: `${Math.min(100, pulsePct)}%` }}
            />
          </div>
          <div className="text-center">
            <div className="font-inter text-[120px] font-black leading-none tracking-tighter text-[#172a40]">
              {Math.round(bpm)}
            </div>
            <div className="mt-4 inline-block rounded-full bg-[#2e4057] px-3 py-1 text-[11px] font-bold uppercase leading-4 tracking-[0.08em] text-[#9ec2fe]">
              BPM / QUARTER NOTE
            </div>
          </div>
          <div className="mt-8 flex gap-4">
            <button
              type="button"
              className="rack-panel-light flex h-10 w-20 items-center justify-center rounded border border-[#D1D9E0] bg-white text-[11px] font-bold uppercase tracking-[0.08em] shadow-sm transition-all hover:bg-[#f8f9fb] active:translate-y-px"
              onClick={handleTap}
            >
              TAP
            </button>
            <button
              type="button"
              className="rack-panel-light flex h-10 w-20 items-center justify-center rounded border border-[#D1D9E0] bg-white text-[11px] font-bold uppercase tracking-[0.08em] shadow-sm transition-all hover:bg-[#f8f9fb] active:translate-y-px"
              onClick={() => met.setBpm(clamp(Math.round(bpm) - 5, 1, 400))}
            >
              − 5
            </button>
            <button
              type="button"
              className="rack-panel-light flex h-10 w-20 items-center justify-center rounded border border-[#D1D9E0] bg-white text-[11px] font-bold uppercase tracking-[0.08em] shadow-sm transition-all hover:bg-[#f8f9fb] active:translate-y-px"
              onClick={() => met.setBpm(clamp(Math.round(bpm) + 5, 1, 400))}
            >
              + 5
            </button>
          </div>
        </div>
      </section>

      <section className="rack-panel-light col-span-12 flex flex-col gap-4 rounded border border-[#D1D9E0] bg-[#edeef0] p-3 wide:col-span-4">
        <div>
          <span className="mb-2 block text-[11px] font-bold uppercase leading-4 tracking-[0.08em] text-[#44474d]">
            Time Signature
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div className="well-inset-light rounded p-3 text-center">
              <span className="block font-inter text-lg font-semibold leading-tight tracking-tight text-[#172a40]">
                {met.timeSignature.split('/')[0] || '4'}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#74777d]">Numerator</span>
            </div>
            <div className="well-inset-light rounded p-3 text-center">
              <span className="block font-inter text-lg font-semibold leading-tight tracking-tight text-[#172a40]">
                {met.timeSignature.split('/')[1] || '4'}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#74777d]">Denominator</span>
            </div>
          </div>
          <div className="mt-2 flex justify-center gap-2">
            <button
              type="button"
              className="rounded border border-[#D1D9E0] px-3 py-1 text-xs font-semibold hover:bg-white"
              onClick={() => met.setTimeSignature(cycleTimeSignature(met.timeSignature, -1))}
            >
              Prev meter
            </button>
            <button
              type="button"
              className="rounded border border-[#D1D9E0] px-3 py-1 text-xs font-semibold hover:bg-white"
              onClick={() => met.setTimeSignature(cycleTimeSignature(met.timeSignature, 1))}
            >
              Next meter
            </button>
          </div>
        </div>

        <div>
          <span className="mb-2 block text-[11px] font-bold uppercase leading-4 tracking-[0.08em] text-[#44474d]">
            Subdivision
          </span>
          <div className="flex items-center justify-between rounded bg-[#d9dadc] p-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
            <button
              type="button"
              className="rounded p-2 text-[#172a40] hover:bg-[#e1e2e4]"
              aria-label="Previous subdivision"
              onClick={() => cycleSub(-1)}
            >
              <span className="material-symbols-outlined text-[22px]">chevron_left</span>
            </button>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  type="button"
                  className={`rounded p-2 transition-colors ${i === subIndex ? 'bg-[#e1e2e4] text-[#172a40]' : 'text-[#74777d] hover:bg-[#e1e2e4]/70'}`}
                  aria-label={`Subdivision ${['Quarter', 'Eighth', 'Triplet', 'Sixteenth'][i]}`}
                  onClick={() => met.setSubdivision(['quarter', 'eighth', 'triplet', 'sixteenth'][i])}
                >
                  <span className="material-symbols-outlined text-[22px]">{SUB_ICON[i]}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="rounded p-2 text-[#172a40] hover:bg-[#e1e2e4]"
              aria-label="Next subdivision"
              onClick={() => cycleSub(1)}
            >
              <span className="material-symbols-outlined text-[22px]">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="mt-auto">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded bg-[#395f94] py-6 text-lg font-bold uppercase tracking-tight text-white shadow-lg transition-all hover:bg-[#284f83] active:scale-95"
            onTouchStart={() => {
              try {
                met.audio?.ensure?.()
              } catch {
                /* */
              }
            }}
            onPointerUp={handlePlayFabPointerUp}
            onTouchEnd={handlePlayFabTouchEnd}
            onClick={handlePlayFabClick}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              play_arrow
            </span>
            {met.countIn?.active ? 'CANCEL' : met.isPlaying ? 'PAUSE ENGINE' : 'START ENGINE'}
          </button>
        </div>
      </section>

      <section className="rack-panel-light col-span-12 grid grid-cols-1 gap-4 rounded border border-[#D1D9E0] bg-[#edeef0] p-3 wide:grid-cols-4">
        <div className="flex flex-col items-center">
          <span className="mb-4 text-[10px] font-bold uppercase text-[#44474d]">Click volume</span>
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#D1D9E0] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div
              className="absolute top-1 h-4 w-1 origin-bottom rounded-full bg-[#395f94]"
              style={{ transform: 'rotate(45deg)' }}
            />
            <div className="h-10 w-10 rounded-full border border-[#c4c6cd]/30 bg-[#f8f9fb]" />
          </div>
          <div className="mt-3 rounded px-2 py-0.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
            <span className="text-xs font-medium tracking-wide text-[#172a40]">
              {Number(met.pan).toFixed(2)} pan
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="mb-4 text-[10px] font-bold uppercase text-[#44474d]">Sound</span>
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#D1D9E0] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div
              className="absolute top-1 h-4 w-1 origin-bottom rounded-full bg-[#395f94]"
              style={{
                transform: `rotate(${met.sound === 'beep' ? -20 : met.sound === 'voiceNumbers' ? 10 : 40}deg)`,
              }}
            />
            <div className="h-10 w-10 rounded-full border border-[#c4c6cd]/30 bg-[#f8f9fb]" />
          </div>
          <select
            className="mt-3 max-w-[8rem] rounded border border-[#c4c6cd] bg-white px-1 py-0.5 text-xs"
            value={met.sound}
            onChange={(e) => met.setSound(e.target.value)}
            aria-label="Click sound"
          >
            <option value="beep">Beep</option>
            <option value="voiceNumbers">Voice</option>
            <option value="voiceCount">Count</option>
          </select>
        </div>
        <div className="flex flex-col gap-2 wide:col-span-2">
          <span className="mb-1 text-[10px] font-bold uppercase text-[#44474d]">Master output peak</span>
          <div className="flex flex-col gap-1.5 rounded bg-[#d9dadc] p-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
            {['L', 'R'].map((ch) => (
              <div key={ch} className="flex items-center gap-2">
                <span className="w-3 text-[8px] font-bold">{ch}</span>
                <div className="flex h-2 flex-1 gap-0.5">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm ${i < 4 ? 'bg-[#395f94]' : i === 4 ? 'bg-[#a7c8ff]' : 'bg-[#e1e2e4]'}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
