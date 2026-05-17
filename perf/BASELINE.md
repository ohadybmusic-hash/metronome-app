# Lighthouse baseline (pre font / image / layout-split changes)

- **URL:** https://metronome-app-rho.vercel.app
- **Config:** mobile form factor, simulated throttling (Lighthouse default)
- **Artifact:** [lighthouse-baseline.json](./lighthouse-baseline.json)
- **Post-change comparison:** [COMPARISON.md](./COMPARISON.md) and [lighthouse-after.json](./lighthouse-after.json)

| Metric | Value |
|--------|-------|
| Performance score | 0.69 |
| FCP | 4.9 s |
| LCP | 5.2 s |
| TTI | 5.2 s |
| Speed Index | 4.9 s |
| TBT | 0 ms |
| CLS | 0.012 |
| Total byte weight (network summary) | ~895 KiB |

Regenerate: `npm run perf:baseline`

## 2026-05-13 follow-up (no new Lighthouse run committed)

- Header brand image: `/favicon.svg` instead of missing `/tempo-trainer-logo.png` (small SVG, `fetchPriority="low"`).
- `scheduleIdleTask` helper: [`src/lib/scheduleIdle.js`](../src/lib/scheduleIdle.js).
- Auth: fast-path `profiles` fetch deferred with idle callback ([`AuthProvider.jsx`](../src/context/AuthProvider.jsx)).
- `user_data` network revalidate: idle when local cache exists, else `setTimeout(0)` ([`useMetronome.js`](../src/hooks/useMetronome.js)).
- System status poll: first fetch deferred with idle ([`useMetronomeSystemStatus.js`](../src/hooks/useMetronomeSystemStatus.js)).
- Shell: idle prefetch of lazy tab chunks; `startTransition` on programmatic `navigate` ([`App.jsx`](../src/App.jsx)).

