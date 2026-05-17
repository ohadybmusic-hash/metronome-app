/**
 * Run work after the browser has a chance to paint (or during idle time).
 * @param {() => void} fn
 * @param {{ timeout?: number, delayMs?: number }} [opts]
 * @returns {() => void} cancel
 */
export function scheduleIdleTask(fn, opts = {}) {
  const timeout = opts.timeout ?? 2000
  if (typeof requestIdleCallback !== 'undefined') {
    const id = requestIdleCallback(fn, { timeout })
    return () => {
      cancelIdleCallback(id)
    }
  }
  const id = window.setTimeout(fn, opts.delayMs ?? 0)
  return () => window.clearTimeout(id)
}
