import { clamp } from '../clamp.js'

export function normalizeAngleRad(rad) {
  let a = rad
  while (a <= -Math.PI) a += Math.PI * 2
  while (a > Math.PI) a -= Math.PI * 2
  return a
}

export function bpmToT(bpm) {
  const min = 1
  const max = 400
  const clamped = clamp(bpm, min, max)
  return (clamped - min) / (max - min)
}

export function tToBpm(t) {
  const min = 1
  const max = 400
  const tt = clamp(t, 0, 1)
  return min + tt * (max - min)
}
