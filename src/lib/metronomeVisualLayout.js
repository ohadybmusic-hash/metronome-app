/** @typedef {'obsidian' | 'light' | 'synthwave'} MetronomeVisualLayout */

export const METRONOME_VISUAL_LAYOUT_STORAGE_KEY = 'metronome.visualLayout'

/** @type {MetronomeVisualLayout[]} */
export const METRONOME_VISUAL_LAYOUTS = ['obsidian', 'light', 'synthwave']

/**
 * @returns {MetronomeVisualLayout}
 */
export function readMetronomeVisualLayout() {
  try {
    const v = localStorage.getItem(METRONOME_VISUAL_LAYOUT_STORAGE_KEY)
    if (v === 'light' || v === 'obsidian' || v === 'synthwave') return v
  } catch {
    /* ignore */
  }
  return 'obsidian'
}

/**
 * @param {MetronomeVisualLayout} layout
 */
export function writeMetronomeVisualLayout(layout) {
  try {
    localStorage.setItem(METRONOME_VISUAL_LAYOUT_STORAGE_KEY, layout)
  } catch {
    /* ignore */
  }
}

/**
 * Syncs global tokens: `data-visual-layout` drives Tailwind semantic vars; `data-theme` is legacy (`light` vs `dark`).
 * Light layout uses Stitch studio palette; Obsidian + Synthwave share dark chrome.
 * @param {MetronomeVisualLayout} layout
 */
export function applyDocumentThemeForVisualLayout(layout) {
  document.documentElement.dataset.visualLayout = layout
  document.documentElement.dataset.theme = layout === 'light' ? 'light' : 'dark'
}
