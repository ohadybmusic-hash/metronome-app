import { useSyncExternalStore } from 'react'

/** @typedef {'obsidian' | 'light' | 'synthwave'} MetronomeVisualLayout */

function subscribe(onStoreChange) {
  const el = document.documentElement
  const obs = new MutationObserver(onStoreChange)
  obs.observe(el, { attributes: true, attributeFilter: ['data-visual-layout'] })
  return () => obs.disconnect()
}

/** @returns {MetronomeVisualLayout} */
function getSnapshot() {
  const v = document.documentElement.dataset.visualLayout
  if (v === 'light' || v === 'obsidian' || v === 'synthwave') return v
  return 'obsidian'
}

/** @returns {MetronomeVisualLayout} */
function getServerSnapshot() {
  return 'obsidian'
}

/**
 * Tracks `document.documentElement.dataset.visualLayout` so Obsidian / Light / Synthwave
 * layouts update React trees without prop-drilling from App shell.
 */
export function useDocumentVisualLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
