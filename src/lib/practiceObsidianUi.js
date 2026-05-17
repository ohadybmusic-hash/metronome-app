/**
 * Practice log UI on Tempo Trainer Obsidian — stitch fields/cards (not Metronome.css control deck).
 * @param {string | undefined} visualLayout
 */
export function practiceObsidianChrome(visualLayout) {
  return visualLayout === 'obsidian'
}

/** Class bundles when {@link practiceObsidianChrome} is true */
export const practiceOb = {
  form: 'mb-8 grid gap-4 rounded-ds-lg border border-hairline bg-surface-container-low p-4 shadow-[var(--ds-shadow)] sm:grid-cols-2 lg:grid-cols-3',
  fieldGrid: 'grid gap-1.5',
  fieldCaption: 'text-[10px] font-medium uppercase tracking-widest text-chrome/75',
  control:
    'w-full min-h-[2.25rem] rounded-ds border border-hairline bg-surface-container-lowest px-3 py-2 text-sm font-medium text-on-background',
  textarea:
    'w-full min-h-[4.5rem] resize-y rounded-ds border border-hairline bg-surface-container-lowest px-3 py-2 text-sm text-on-background',
  btnPrimary:
    'rounded-ds border border-chrome/45 bg-chrome/14 px-3 py-2 text-xs font-semibold text-chrome transition-colors hover:bg-chrome/20 disabled:cursor-not-allowed disabled:opacity-45',
  btnGhost:
    'rounded-ds border border-hairline bg-surface-container-lowest px-3 py-2 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-45',
  linkBtn:
    'border-0 bg-transparent px-2 py-1 text-left text-xs font-medium text-chrome underline-offset-2 hover:bg-chrome/10 hover:underline',
  panel: 'mb-6 rounded-ds-lg border border-hairline bg-surface-container-high p-4 shadow-[var(--ds-shadow)]',
  sheetPreview: 'mb-6 rounded-ds-lg border border-hairline bg-surface-container-low p-3 shadow-[var(--ds-shadow)]',
  filterBar: 'mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
  filterLabel: 'mb-0 max-w-md grid gap-1.5',
  tableWrap: 'hidden md:block overflow-x-auto rounded-ds-lg border border-hairline shadow-[var(--ds-shadow)]',
  mobileCard: 'rounded-ds-lg border border-hairline bg-surface-container-low p-4 shadow-[var(--ds-shadow)]',
  mobileEmpty:
    'rounded-ds-lg border border-hairline bg-surface-container-low py-8 text-center text-sm text-on-surface-variant shadow-[var(--ds-shadow)]',
}
