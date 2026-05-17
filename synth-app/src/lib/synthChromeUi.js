/**
 * Class bundles: legacy standalone synth (zinc + neon) vs Tempo Trainer Obsidian (DS chrome).
 * @param {boolean | 'obsidian' | 'synthwave' | 'legacy'} tone
 */
export function synthChromeUi(tone) {
  const t = tone === true ? 'obsidian' : tone === false || tone == null ? 'legacy' : tone
  const isObs = t === 'obsidian'
  const isSw = t === 'synthwave'

  const pillOn = isObs
    ? 'bg-chrome/14 text-chrome ring-1 ring-chrome/45'
    : isSw
      ? 'bg-pink-500/12 text-pink-500 ring-1 ring-pink-500/40 shadow-[0_0_12px_rgb(236_72_153_/_0.12)]'
      : 'bg-[#39ff14]/20 text-[#39ff14] ring-1 ring-[#39ff14]/50'
  const pillOff = isObs
    ? 'bg-surface-container-lowest/90 text-on-surface ring-1 ring-hairline'
    : isSw
      ? 'bg-surface-container-lowest/70 text-cyan-200/80 ring-1 ring-cyan-400/20'
      : 'bg-zinc-900/80 text-zinc-300 ring-1 ring-zinc-800'

  return {
    panel:
      isObs || isSw
        ? 'rounded-ds-lg border border-hairline bg-surface-container-low p-3'
        : 'rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-3',
    panelMuted:
      isObs || isSw
        ? 'rounded-ds-lg border border-hairline bg-surface-container-low/90 p-3'
        : 'rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3',
    h3: isObs || isSw ? 'mb-2 text-sm font-semibold text-chrome' : 'mb-2 text-sm font-semibold text-zinc-200',
    labelCaps: isObs || isSw
      ? 'mb-1.5 text-[10px] font-medium uppercase tracking-widest text-chrome/75'
      : 'mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500',
    labelCapsTight: isObs || isSw
      ? 'mb-1 text-[10px] font-medium uppercase tracking-widest text-chrome/75'
      : 'mb-1 text-[10px] font-medium uppercase tracking-widest text-zinc-500',
    body: isObs || isSw ? 'mb-2 text-[11px] text-on-surface-variant' : 'mb-2 text-[11px] text-zinc-500',
    bodySmall: isObs || isSw ? 'text-[11px] text-on-surface-variant' : 'text-[11px] text-zinc-500',
    bodyDim: isObs || isSw ? 'text-[10px] text-on-surface-variant' : 'text-[10px] text-zinc-600',
    muted: isObs || isSw ? 'text-on-surface-variant' : 'text-zinc-500',
    strong: isObs || isSw ? 'text-chrome' : 'text-zinc-300',
    strongAlt: isObs || isSw ? 'font-medium text-chrome' : 'font-medium text-zinc-400',
    pillOn,
    pillOff,
    pill: (active) => `rounded-md px-2.5 py-1.5 text-xs font-medium ${active ? pillOn : pillOff}`,
    ghostBtn: isObs || isSw
      ? 'w-full touch-manipulation rounded-ds border border-hairline bg-surface-container-lowest px-2 py-1.5 text-left text-[10px] font-medium text-on-surface-variant active:bg-surface-container'
      : 'w-full touch-manipulation rounded-md border border-zinc-800/60 bg-zinc-950/40 px-2 py-1.5 text-left text-[10px] font-medium text-zinc-400 active:bg-zinc-900/80',
    inset: isObs || isSw
      ? 'mt-1.5 rounded-ds border border-hairline bg-surface-container-lowest px-2 py-1.5'
      : 'mt-1.5 rounded-md border border-zinc-800/50 bg-zinc-950/50 px-2 py-1.5',
    list: isObs || isSw ? 'list-none space-y-1.5 text-[10px] leading-snug text-on-surface-variant' : 'list-none space-y-1.5 text-[10px] leading-snug text-zinc-500',
    listItemActive: isObs || isSw ? 'text-chrome' : 'text-zinc-200',
    listStrong: isObs || isSw ? 'font-semibold text-chrome' : 'font-semibold text-zinc-300',
    divider: isObs || isSw ? 'mt-3 border-t border-hairline pt-3' : 'mt-3 border-t border-zinc-800/60 pt-3',
    select: isObs || isSw
      ? 'w-full rounded-ds border border-hairline bg-surface-container-lowest py-2 pl-2 pr-8 text-sm text-on-background'
      : 'w-full rounded-lg border border-zinc-800 bg-zinc-950/90 py-2 pl-2 pr-8 text-sm text-zinc-200',
    wireOn: isObs
      ? 'border-chrome/40 bg-chrome/10 text-chrome'
      : isSw
        ? 'border-pink-500/40 bg-pink-500/10 text-cyan-100/90'
        : 'border-[#39ff14]/40 bg-[#39ff14]/8 text-zinc-200',
    wireOff: isObs || isSw
      ? 'border-hairline bg-surface-container-lowest text-on-surface-variant'
      : 'border-zinc-800 bg-zinc-950/80 text-zinc-500',
    wireLabel: isObs || isSw ? 'text-[10px] font-medium text-chrome' : 'text-[10px] font-medium text-zinc-300',
    wireTagOn: isObs
      ? 'text-[9px] font-mono uppercase tracking-wide text-chrome'
      : isSw
        ? 'text-[9px] font-mono uppercase tracking-wide text-pink-400'
        : 'text-[9px] font-mono uppercase tracking-wide text-[#39ff14]/90',
    wireTagOff: isObs || isSw ? 'text-[9px] font-mono uppercase tracking-wide text-on-surface-variant' : 'text-[9px] font-mono uppercase tracking-wide text-zinc-600',
    outlineBtn: isObs || isSw
      ? 'mt-4 w-full rounded-ds-lg border border-hairline py-2 text-sm text-on-surface-variant'
      : 'mt-4 w-full rounded-lg border border-zinc-800 py-2 text-sm text-zinc-400',
    outlineBtnTight: isObs || isSw
      ? 'mt-2 w-full rounded-ds-lg border border-hairline py-2 text-sm text-on-surface-variant'
      : 'mt-2 w-full rounded-lg border border-zinc-800 py-2 text-sm text-zinc-400',
    sectionLabelDim: isObs || isSw
      ? 'text-[10px] font-medium uppercase tracking-widest text-chrome/65'
      : 'text-[10px] font-medium uppercase tracking-widest text-zinc-600',
    fileBtn: isObs || isSw
      ? 'rounded-ds border border-hairline bg-surface-container-low px-3 py-2 text-xs text-chrome'
      : 'rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200',
    truncateHint: isObs || isSw ? 'truncate text-[11px] text-on-surface-variant' : 'truncate text-[11px] text-zinc-500',
    duoTabWrap: isObs || isSw ? 'mb-3 flex rounded-ds-lg border border-hairline p-0.5' : 'mb-3 flex rounded-lg border border-zinc-800 p-0.5',
    duoTabOn: isObs
      ? 'min-h-[2.25rem] flex-1 rounded-ds bg-chrome/12 px-2 py-1.5 text-xs font-semibold text-chrome ring-1 ring-chrome/35'
      : isSw
        ? 'min-h-[2.25rem] flex-1 rounded-ds bg-pink-500/12 px-2 py-1.5 text-xs font-semibold text-pink-400 ring-1 ring-pink-500/30'
        : 'min-h-[2.25rem] flex-1 rounded-md px-2 py-1.5 text-xs font-semibold bg-[#39ff14]/20 text-[#39ff14] ring-1 ring-[#39ff14]/40',
    duoTabOff: isObs || isSw
      ? 'min-h-[2.25rem] flex-1 rounded-ds px-2 py-1.5 text-xs font-semibold text-on-surface-variant'
      : 'min-h-[2.25rem] flex-1 rounded-md px-2 py-1.5 text-xs font-semibold text-zinc-500',
    textInput: isObs || isSw
      ? 'min-w-0 flex-1 rounded-ds border border-hairline bg-surface-container-lowest px-2.5 py-2 text-sm text-on-background placeholder:text-on-surface-variant'
      : 'min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950/90 px-2.5 py-2 text-sm text-zinc-200 placeholder:text-zinc-600',
    btnPrimary: isObs || isSw
      ? 'shrink-0 rounded-ds border border-hairline bg-surface-container px-3 py-2 text-sm font-medium text-chrome active:bg-surface-container-high'
      : 'shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 active:bg-zinc-800',
    btnGhostSm: isObs || isSw
      ? 'rounded-ds border border-hairline bg-surface-container-low px-2.5 py-1.5 text-xs text-on-surface-variant'
      : 'rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs text-zinc-300',
    starterInset: isObs || isSw
      ? 'mb-3 rounded-ds border border-hairline bg-surface-container-lowest p-2.5'
      : 'mb-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-2.5',
    presetRow: isObs || isSw
      ? 'flex flex-wrap items-center gap-1.5 rounded-ds border border-hairline bg-surface-container-lowest px-2 py-1.5 text-xs'
      : 'flex flex-wrap items-center gap-1.5 rounded-md bg-zinc-950/50 px-2 py-1.5 text-xs',
    presetName: isObs || isSw ? 'min-w-0 flex-1 truncate text-chrome' : 'min-w-0 flex-1 truncate text-zinc-200',
    presetLoadBtn: isObs || isSw
      ? 'shrink-0 rounded border border-chrome/40 bg-chrome/10 px-2 py-0.5 text-chrome'
      : 'shrink-0 rounded border border-[#39ff14]/40 bg-[#39ff14]/10 px-2 py-0.5 text-[#39ff14]',
    presetExportBtn: isObs || isSw
      ? 'shrink-0 rounded border border-hairline px-2 py-0.5 text-on-surface-variant'
      : 'shrink-0 rounded border border-zinc-700 px-2 py-0.5 text-zinc-400',
    presetRemoveBtn: isObs || isSw
      ? 'shrink-0 rounded border border-hairline px-2 py-0.5 text-on-surface-variant'
      : 'shrink-0 rounded border border-zinc-800 px-2 py-0.5 text-zinc-500',
    drawerShell: isObs || isSw
      ? 'fixed inset-x-0 bottom-0 z-50 overflow-y-auto rounded-t-2xl border border-t border-hairline bg-surface-container-low p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgba(0,0,0,0.45)]'
      : 'fixed inset-x-0 bottom-0 z-50 overflow-y-auto rounded-t-2xl border border-t border-zinc-800 bg-[#0c0c10] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgba(0,0,0,0.5)]',
    drawerHandle: isObs || isSw ? 'mx-auto mb-3 h-1 w-10 rounded-full bg-hairline' : 'mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700',
    drawerTitle: isObs || isSw ? 'mb-0.5 text-sm font-semibold text-chrome' : 'mb-0.5 text-sm font-semibold text-zinc-200',
    drawerLead: isObs || isSw ? 'mb-3 text-xs text-on-surface-variant' : 'mb-3 text-xs text-zinc-500',
  }
}
