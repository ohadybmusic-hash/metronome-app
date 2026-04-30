/**
 * Races a promise against a wall-clock timeout. Clears the timer when the promise settles.
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} [timeoutMessage]  `Error` message on timeout. Default `'timeout'` (auth session race).
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, timeoutMessage = 'timeout') {
  let t
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      t = window.setTimeout(() => reject(new Error(timeoutMessage)), ms)
    }),
  ]).finally(() => {
    if (t) window.clearTimeout(t)
  })
}
