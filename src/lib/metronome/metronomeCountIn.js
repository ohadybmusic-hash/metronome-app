/** Clear scheduled count-in timeouts without changing `active` / React state. */
export function clearCountInTimeoutsOnly(countInRef) {
  for (const id of countInRef.current.timeouts) window.clearTimeout(id)
  countInRef.current.timeouts.clear()
}

/** Cancel an in-progress count-in (e.g. user hit stop). */
export function cancelMetronomeCountIn({ countInRef, setCountInActive, setCountInBeatsRemaining }) {
  if (!countInRef.current.active) return
  clearCountInTimeoutsOnly(countInRef)
  countInRef.current.active = false
  setCountInActive(false)
  setCountInBeatsRemaining(0)
}
