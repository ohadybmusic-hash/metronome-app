/**
 * @param {number} n
 * @param {number} min
 * @param {number} max
 */
export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

/**
 * Like {@link clamp}, but coerces with `Number(n)`; non-finite values become `min`.
 * Used for stepper controls so invalid input does not propagate.
 * @param {unknown} n
 * @param {number} min
 * @param {number} max
 */
export function clampNumber(n, min, max) {
  const v = Number(n)
  if (!Number.isFinite(v)) return min
  return clamp(v, min, max)
}
