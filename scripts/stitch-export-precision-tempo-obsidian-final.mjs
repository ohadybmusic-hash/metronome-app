/**
 * Downloads HTML + PNG for Precision Tempo Metronome — Obsidian (Final) Stitch screens.
 * Key resolution matches `stitch-export-precision-tempo-light.mjs`.
 *
 * Usage: npm run stitch:export-obsidian
 */
import { readFileSync, existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stitch } from '@google/stitch-sdk'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = join(__dirname, '..')
const OUT_DIR = join(APP_ROOT, 'design-refs', 'stitch-precision-tempo-obsidian-final')

const SDK_ENV = 'STITCH_API_KEY'
/** @type {readonly string[]} */
const KEY_SOURCE_NAMES = ['STITCH_API_KEY', 'STITCH_GOOG_API_KEY']

function readWindowsPersistentEnv(name) {
  if (process.platform !== 'win32') return ''
  const safe = name.replace(/'/g, "''")
  const ps = `$u=[Environment]::GetEnvironmentVariable('${safe}','User');$m=[Environment]::GetEnvironmentVariable('${safe}','Machine');if($u){$u}elseif($m){$m}else{''}`
  try {
    const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 12_000,
      maxBuffer: 512 * 1024,
    })
    return String(out ?? '').replace(/^\uFEFF/, '').trim()
  } catch {
    return ''
  }
}

function loadStitchApiKeyFromEnvFiles() {
  for (const f of ['.env.local', '.env']) {
    const p = join(APP_ROOT, f)
    if (!existsSync(p)) continue
    const text = readFileSync(p, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      for (const name of KEY_SOURCE_NAMES) {
        const m = new RegExp(`^${name}\\s*=\\s*(.*)$`).exec(t)
        if (!m) continue
        let v = m[1].trim()
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
        if (v) return v
      }
    }
  }
  return ''
}

function resolveStitchApiKey() {
  for (const name of KEY_SOURCE_NAMES) {
    const fromSession = process.env[name]?.trim()
    if (fromSession) return fromSession
  }
  if (process.platform === 'win32') {
    for (const name of KEY_SOURCE_NAMES) {
      const fromWindows = readWindowsPersistentEnv(name).trim()
      if (fromWindows) return fromWindows
    }
  }
  return loadStitchApiKeyFromEnvFiles()
}

process.env[SDK_ENV] = resolveStitchApiKey()

/** @type {readonly { id: string; slug: string }[]} */
const SCREENS = [
  { id: 'c7f7812f4ada4acfa559f9f9d6561205', slug: '01-metronome-wheel' },
  { id: '6c441500ec7545fe95509b62028f5da8', slug: '02-sign-in' },
  { id: 'd0cc3b22cfa34b128ea796b49f4dd19a', slug: '03-account' },
  { id: '687783ffab524e4e8b24745f99aad161', slug: '04-settings' },
  { id: '26c8bca3d3b14198a0574f6b0a22c395', slug: '05-setlists' },
  { id: 'd3bd844215a24044afd8907f9abbe510', slug: '06-practice' },
  { id: '7667e68c9c1b41918ae549cf8f3f2bfe', slug: '07-synth-lab' },
  { id: 'c7b975a2f00a48e69572fee4d2c9070d', slug: '08-metronome' },
  { id: 'fe816b44a12344e093949c49535ba2bd', slug: '09-tuner' },
]

const PROJECT_ID = '16960535556257825035'

if (!process.env[SDK_ENV]?.trim()) {
  console.error(
    [
      `Missing Stitch API key (set ${KEY_SOURCE_NAMES.join(' or ')}).`,
      '',
      'Then run: npm run stitch:export-obsidian',
      '',
      'Docs: https://github.com/google-labs-code/stitch-sdk#configuration',
    ].join('\n'),
  )
  process.exit(1)
}

await mkdir(OUT_DIR, { recursive: true })

const project = stitch.project(PROJECT_ID)

for (const { id, slug } of SCREENS) {
  process.stderr.write(`Fetching ${slug} …\n`)
  const screen = await project.getScreen(id)
  const htmlUrl = await screen.getHtml()
  const imageUrl = await screen.getImage()

  await writeFile(
    join(OUT_DIR, `${slug}.urls.json`),
    JSON.stringify({ projectId: PROJECT_ID, screenId: id, slug, htmlUrl, imageUrl }, null, 2),
    'utf8',
  )

  if (htmlUrl) {
    const res = await fetch(htmlUrl)
    if (!res.ok) throw new Error(`${slug} HTML: ${res.status} ${res.statusText}`)
    await writeFile(join(OUT_DIR, `${slug}.html`), await res.text(), 'utf8')
  }

  if (imageUrl) {
    const res = await fetch(imageUrl)
    if (!res.ok) throw new Error(`${slug} image: ${res.status} ${res.statusText}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(join(OUT_DIR, `${slug}.png`), buf)
  }
}

process.stderr.write(`\nWrote ${SCREENS.length} screens to:\n  ${OUT_DIR}\n`)
