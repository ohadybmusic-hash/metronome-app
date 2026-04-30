/** Lightweight placeholder while a lazy-loaded tab chunk downloads. */
export default function TabPanelFallback() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text)]"
      role="status"
      aria-live="polite"
    >
      Loading…
    </div>
  )
}
