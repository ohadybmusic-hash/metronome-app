/**
 * Downloads HTML + PNG for Precision Tempo Metronome (Stitch) light-mode screens.
 *
 * Resolves the Stitch key into `STITCH_API_KEY` (what `@google/stitch-sdk` reads) from
 * the first non-empty value among **STITCH_API_KEY** or **STITCH_GOOG_API_KEY**, using:
 * 1. Current process environment
 * 2. Windows **User** / **Machine** persisted variables (when on `win32`)
 * 3. `.env.local` / `.env` in the app root (first matching line wins)
 *
 * @see https://github.com/google-labs-code/stitch-sdk#configuration
 *
 * Usage: npm run stitch:export-light
 */
import { readFileSync, existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stitch } from '@google/stitch-sdk'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = join(__dirname, '..')
const OUT_DIR = join(APP_ROOT, 'design-refs', 'stitch-precision-tempo-light')

/** Preferred by SDK; `STITCH_GOOG_API_KEY` is a common Windows / local alias. */
const SDK_ENV = 'STITCH_API_KEY'
/** @type {readonly string[]} */
const KEY_SOURCE_NAMES = ['STITCH_API_KEY', 'STITCH_GOOG_API_KEY']

/**
 * Windows registry-backed User/Machine vars (not always present on `process.env` until a new logon).
 * @param {string} name
 * @returns {string}
 */
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

/** @type {{ id: string, slug: string }[]} */
const SCREENS = [
  { id: 'dfd11c4dd27f49f580e60decf83132f8', slug: '01-metronome-light-wheel' },
  { id: '19b59a77b4a44ebca9be84d8257ef8ce', slug: '02-setlists-light' },
  { id: '0bbdb4e0d252440fa932b08f84e627d4', slug: '03-synth-lab-light' },
  { id: '853b34a07333409593cc05b7f8a4a448', slug: '04-practice-light' },
  { id: '12e5f510fe96489099718aa9abafcf8d', slug: '05-account-light' },
  { id: '5d932a52561b4a1c9588a26f60863420', slug: '06-settings-light' },
  { id: 'e0a0d6eb5a4c4bbb9365b25f5d2c1222', slug: '07-sign-in-light' },
  { id: 'b0db28963d0d43aa91a76ccfea33a867', slug: '08-metronome-light-main' },
  { id: '9d41c7d7ce2b4e718badf0ded80182ba', slug: '09-tuner-light' },
]

const PROJECT_ID = '16960535556257825035'

if (!process.env[SDK_ENV]?.trim()) {
  console.error(
    [
      `Missing Stitch API key (set ${KEY_SOURCE_NAMES.join(' or ')}).`,
      '',
      'Windows (recommended): System Properties → Environment Variables → User or System',
      `  → New → ${KEY_SOURCE_NAMES[1]} or ${KEY_SOURCE_NAMES[0]}`,
      '',
      `Or:  setx ${KEY_SOURCE_NAMES[1]} "your-key"`,
      '',
      'The script copies the value into STITCH_API_KEY for the SDK. Also checks .env / .env.local.',
      'Then run: npm run stitch:export-light',
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
