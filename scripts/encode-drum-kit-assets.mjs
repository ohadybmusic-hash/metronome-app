/**
 * One-shot encode: synth-app drum kit hero PNG → WebP + AVIF for faster Synth tab loads.
 * Run from repo root: node scripts/encode-drum-kit-assets.mjs
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..', 'synth-app', 'src', 'assets')
const input = path.join(root, 'drum-kit-illustration.png')
const outWebp = path.join(root, 'drum-kit-illustration.webp')
const outAvif = path.join(root, 'drum-kit-illustration.avif')

const img = sharp(input)
const meta = await img.metadata()
await img.clone().webp({ quality: 82, effort: 4 }).toFile(outWebp)
await img.clone().avif({ quality: 55, effort: 4 }).toFile(outAvif)

console.log('Wrote', outWebp, outAvif, 'from', input, meta.width, 'x', meta.height)
