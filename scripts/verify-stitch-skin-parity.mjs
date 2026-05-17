/**
 * Compares Material-style color tokens embedded in Stitch design-ref HTML
 * against --ds-* declarations in src/index.css per skin (obsidian / light / synthwave).
 *
 * Usage: node scripts/verify-stitch-skin-parity.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CSS = readFileSync(join(ROOT, 'src', 'index.css'), 'utf8')

const REFS = [
  {
    skin: 'obsidian',
    file: join(ROOT, 'design-refs', 'stitch-precision-tempo-obsidian-final', '08-metronome.html'),
  },
  {
    skin: 'light',
    file: join(ROOT, 'design-refs', 'stitch-precision-tempo-light', '08-metronome-light-main.html'),
  },
  {
    skin: 'synthwave',
    file: join(ROOT, 'design-refs', 'stitch-precision-tempo-synthwave', '06-metronome-grid-synthwave.html'),
  },
]

function extractTailwindColorsFromHtml(html) {
  const m = html.match(/"colors"\s*:\s*\{([\s\S]*?)\}\s*,\s*"(?:borderRadius|spacing)"/)
  if (!m) throw new Error('Could not find colors block in HTML')
  const block = m[1]
  const out = {}
  const re = /"([^"]+)"\s*:\s*"([^"]+)"/g
  let x
  while ((x = re.exec(block))) {
    const k = x[1]
    const v = x[2]
    if (/^#[0-9a-fA-F]{6}$/.test(v)) out[k] = v.toLowerCase()
  }
  return out
}

function cssVarMapForLayout(layoutSelector) {
  const needle =
    layoutSelector === 'obsidian'
      ? ':root {\n  color-scheme: dark;'
      : layoutSelector.includes('light')
        ? ":root[data-visual-layout='light'] {\n  color-scheme: light;"
        : ":root[data-visual-layout='synthwave'] {\n  color-scheme: dark;"
  const i = CSS.indexOf(needle)
  if (i < 0) throw new Error(`CSS block not found for ${layoutSelector}`)
  const rest = CSS.slice(i)
  const end = rest.indexOf('\n}\n')
  const block = rest.slice(0, end + 1)
  const vars = {}
  for (const line of block.split('\n')) {
    const mm = /^\s*--ds-([a-z0-9-]+)\s*:\s*([^;]+);/.exec(line)
    if (mm) vars[mm[1]] = mm[2].trim().toLowerCase()
  }
  return vars
}

const hex = (s) =>
  String(s || '')
    .trim()
    .replace(/^#/, '')
    .toLowerCase()

const keys = [
  'background',
  'surface',
  'on-background',
  'on-surface',
  'on-surface-variant',
  'primary-fixed-dim',
  'surface-container',
  'surface-container-low',
  'outline-variant',
]

let failed = false
for (const ref of REFS) {
  const html = readFileSync(ref.file, 'utf8')
  const stitch = extractTailwindColorsFromHtml(html)
  const layoutKey =
    ref.skin === 'obsidian'
      ? 'obsidian'
      : ref.skin === 'light'
        ? ":root[data-visual-layout='light']"
        : 'synthwave'
  const cssVars = cssVarMapForLayout(layoutKey)

  console.log(`\n=== ${ref.skin} (${ref.skin === 'obsidian' ? 'base :root canvas vs Stitch body/header' : ''}) ===`)

  for (const k of keys) {
    if (ref.skin === 'obsidian' && k === 'background') {
      /* Stitch JSON `background` is panel token #121315; app canvas matches HTML `body` #0b0c0e — see body check below. */
      continue
    }
    const st = hex(stitch[k] || '')
    const cv = cssVars[k]?.replace(/\s/g, '') || ''

    const cssHex = cv.startsWith('#') ? hex(cv) : cv
    if (st && cssHex && st !== cssHex.replace('#', '')) {
      console.error(`  MISMATCH ${k}: stitch=#${st} css=--ds-${k}=${cv}`)
      failed = true
    } else if (st) {
      console.log(`  OK ${k} #${st}`)
    }
  }

  if (ref.skin === 'obsidian') {
    const bodyMatch = html.match(/<body class="([^"]+)"/)
    const bodyHex = bodyMatch ? bodyMatch[1].match(/bg-\[#([0-9a-fA-F]{6})\]/) : null
    if (bodyHex) {
      const want = bodyHex[1].toLowerCase()
      const got = hex(cssVars.background || '')
      if (want !== got.replace(/^#/, '')) {
        console.error(`  MISMATCH body canvas: stitch=#${want} css --ds-background=${cssVars.background}`)
        failed = true
      } else console.log(`  OK body canvas #${want}`)
    }
  }
}

if (failed) {
  console.error('\nverify-stitch-skin-parity: FAILED')
  process.exit(1)
}
console.log('\nverify-stitch-skin-parity: key tokens aligned')
