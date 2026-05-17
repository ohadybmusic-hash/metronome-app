/**
 * Downloads HTML + PNG for Precision Tempo Metronome — Synthwave (Final) screens.
 *
 * Key resolution matches `stitch-export-precision-tempo-light.mjs`.
 *
 * Usage: npm run stitch:export-synthwave
 *
 * @see https://github.com/google-labs-code/stitch-sdk#configuration
 */
import { readFileSync, existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stitch } from '@google/stitch-sdk'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = join(__dirname, '..')
const OUT_DIR = join(APP_ROOT, 'design-refs', 'stitch-precision-tempo-synthwave')

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

/** Stitch “Synthwave (Final)” screen IDs — Precision Tempo Metronome project. */
/** @type {{ id: string, slug: string }[]} */
const SCREENS = [
  { id: '42e4e2d897294cf087fbd75cca005397', slug: '01-sign-in-synthwave' },
  { id: '0373ac2eee34412eb39fd2e1b25ebb89', slug: '02-synth-lab-drums-synthwave' },
  { id: 'e112d581fa664776bd10fbaced5a31f4', slug: '03-synth-lab-synth-synthwave' },
  { id: '39bb839ec3844b85bab10be51719483e', slug: '04-account-synthwave' },
  { id: '918d021d34524097a63e754aa89fd8b4', slug: '05-metronome-wheel-synthwave' },
  { id: '0aa8773c889147c5b4b5daa5c557fc1f', slug: '06-metronome-grid-synthwave' },
  { id: '1fb054e20b5044f7b403fbdf432ce50e', slug: '07-tuner-synthwave' },
  { id: '7f0f57caa5da47d592d97c7e28c91992', slug: '08-setlists-synthwave' },
  { id: 'b66bc16b197a4042b76b0610bd8241fb', slug: '09-practice-synthwave' },
]

const PROJECT_ID = '16960535556257825035'

if (!process.env[SDK_ENV]?.trim()) {
  console.error(
    [
      `Missing Stitch API key (set ${KEY_SOURCE_NAMES.join(' or ')}).`,
      '',
      'Same setup as: npm run stitch:export-light',
      'Then run: npm run stitch:export-synthwave',
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
