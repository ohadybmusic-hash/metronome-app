# Lighthouse: baseline vs after (same URL, simulated mobile)

**URL:** https://metronome-app-rho.vercel.app  
**Artifacts:** [lighthouse-baseline.json](./lighthouse-baseline.json) (pre-change capture), [lighthouse-after.json](./lighthouse-after.json) (post-change).

Single-run Lighthouse has variance; treat ±10–15% as noise. Re-run with `npm run perf:baseline` / `npm run perf:after` after major edits.

## Summary (numeric)

| Metric | Baseline | After | Delta |
|--------|----------|-------|-------|
| Performance score | 0.69 | 0.73 | +0.04 |
| FCP | 4.87 s | 4.35 s | **−0.51 s** |
| LCP | 5.17 s | 4.58 s | **−0.59 s** |
| TTI | 5.17 s | 4.58 s | **−0.59 s** |
| Speed Index | 4.87 s | 4.35 s | **−0.51 s** |
| TBT | 0 ms | 0 ms | — |
| CLS | 0.012 | 0.002 | improved |
| Total byte weight (audit) | ~895 KiB | ~843 KiB | **~−52 KiB** |

## Implemented changes reflected here

1. **Fonts:** `@fontsource-variable/inter` and `@fontsource-variable/space-grotesk` in [main.jsx](../src/main.jsx); removed unused Google text stack (including Space Mono, which was not referenced in CSS). Material Symbols stay one blocking Google stylesheet (a short-lived `preload`+`onload` variant worsened LCP and was reverted).
2. **Deps:** Removed unused `framer-motion`.
3. **Synth drum illustration:** AVIF (~67 KiB) + WebP (~138 KiB) + PNG fallback in [DrumKitIllustration.jsx](../synth-app/src/components/DrumKitIllustration.jsx); `loading="lazy"`. Regenerate with `npm run assets:drum-kit-encode`.
4. **Metronome layouts:** Lazy chunks per skin ([Metronome.jsx](../src/components/Metronome.jsx)) — see `MetronomeLayout*.js` in build output.

## Synth tab image weight (build output)

| Format | Approx. size |
|--------|----------------|
| PNG (fallback) | ~725 KiB |
| WebP | ~138 KiB |
| AVIF | ~67 KiB |

Modern browsers fetch AVIF or WebP instead of the full PNG when supported.
