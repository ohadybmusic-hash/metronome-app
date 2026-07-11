import { describe, it, expect } from 'vitest'
import {
  BPM_MIN,
  BPM_MAX,
  clampBpm,
  clampBpmFloat,
  secondsPerQuarter,
  getMeter,
  getSubdivisionFactor,
  normalizeBeatAccents,
  getAccentMultiplier,
  defaultBeatAccents,
} from './engine.js'

describe('clampBpm', () => {
  it('clamps to the supported range', () => {
    expect(clampBpm(0)).toBe(BPM_MIN)
    expect(clampBpm(9999)).toBe(BPM_MAX)
    expect(clampBpm(120)).toBe(120)
  })
  it('rounds and falls back to 120 for non-finite input', () => {
    expect(clampBpm(119.6)).toBe(120)
    expect(clampBpm('abc')).toBe(120)
    expect(clampBpm(NaN)).toBe(120)
  })
  it('clampBpmFloat keeps fractional values (for smooth trainer ramps)', () => {
    expect(clampBpmFloat(120.4)).toBeCloseTo(120.4)
    expect(clampBpmFloat(500)).toBe(BPM_MAX)
  })
})

describe('secondsPerQuarter', () => {
  it('is 60 / bpm', () => {
    expect(secondsPerQuarter(60)).toBeCloseTo(1)
    expect(secondsPerQuarter(120)).toBeCloseTo(0.5)
  })
})

describe('getMeter', () => {
  it('returns known compound/simple meters with accents', () => {
    expect(getMeter('4/4')).toMatchObject({ numerator: 4, denominator: 4 })
    expect(getMeter('6/8').accentPulses.has(0)).toBe(true)
    expect(getMeter('6/8').accentPulses.has(3)).toBe(true)
    expect(getMeter('7/8')).toMatchObject({ numerator: 7, denominator: 8 })
  })
  it('parses arbitrary valid signatures', () => {
    expect(getMeter('11/16')).toMatchObject({ numerator: 11, denominator: 16 })
  })
  it('falls back to 4/4 for garbage and clamps a wild numerator', () => {
    expect(getMeter('nonsense')).toMatchObject({ numerator: 4, denominator: 4 })
    expect(getMeter('99/4').numerator).toBe(32) // clamped to 32
    expect(getMeter('5/7').denominator).toBe(4) // invalid denom → 4
  })

  it('secondsPerPulse scales with the denominator (8th-note meters are twice as fast)', () => {
    // secondsPerPulse = secondsPerQuarter * (4 / denominator)
    const bpm = 120
    const spq = secondsPerQuarter(bpm)
    const spp44 = spq * (4 / getMeter('4/4').denominator)
    const spp68 = spq * (4 / getMeter('6/8').denominator)
    expect(spp44).toBeCloseTo(0.5)
    expect(spp68).toBeCloseTo(0.25)
  })
})

describe('getSubdivisionFactor', () => {
  it('maps subdivisions to counts', () => {
    expect(getSubdivisionFactor('quarter')).toBe(1)
    expect(getSubdivisionFactor('eighth')).toBe(2)
    expect(getSubdivisionFactor('triplet')).toBe(3)
    expect(getSubdivisionFactor('sixteenth')).toBe(4)
    expect(getSubdivisionFactor('???')).toBe(1)
  })
})

describe('normalizeBeatAccents', () => {
  const meter = getMeter('4/4')
  it('fits the array to the meter length', () => {
    expect(normalizeBeatAccents(meter, ['ACCENT3'])).toHaveLength(4)
    expect(normalizeBeatAccents(meter, ['ACCENT3', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL'])).toHaveLength(4)
  })
  it('maps legacy tokens', () => {
    expect(normalizeBeatAccents(meter, ['ACCENT', 'SOFT', 'NORMAL', 'NORMAL'])).toEqual([
      'ACCENT3',
      'ACCENT1',
      'NORMAL',
      'NORMAL',
    ])
  })
  it('keeps beat 1 accented when nothing else is set', () => {
    expect(normalizeBeatAccents(meter, ['NORMAL', 'NORMAL', 'NORMAL', 'NORMAL'])[0]).toBe('ACCENT3')
  })
  it('leaves beat 1 alone if another beat carries an accent', () => {
    const out = normalizeBeatAccents(meter, ['NORMAL', 'ACCENT3', 'NORMAL', 'NORMAL'])
    expect(out[0]).toBe('NORMAL')
    expect(out[1]).toBe('ACCENT3')
  })
})

describe('getAccentMultiplier', () => {
  it('mutes on MUTE and scales by level', () => {
    expect(getAccentMultiplier('MUTE')).toBe(0)
    expect(getAccentMultiplier('NORMAL')).toBe(1)
    expect(getAccentMultiplier('ACCENT3')).toBeGreaterThan(getAccentMultiplier('NORMAL'))
    expect(getAccentMultiplier('unknown')).toBe(1)
  })
})

describe('defaultBeatAccents', () => {
  it('accents only the downbeat', () => {
    const out = defaultBeatAccents(getMeter('3/4'))
    expect(out).toEqual(['ACCENT3', 'NORMAL', 'NORMAL'])
  })
})
